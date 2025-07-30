const { neon } = require('@netlify/neon');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const sql = neon(); // automatically uses env NETLIFY_DATABASE_URL

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json',
};

const verifyToken = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Token manquant');
  }
  
  const token = authHeader.substring(7);
  return jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key');
};

exports.handler = async (event, context) => {
  console.log('Clients function called:', event.httpMethod, event.path);
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  try {
    // Verify authentication
    const authHeader = event.headers.authorization || event.headers.Authorization;
    const decoded = verifyToken(authHeader);

    const pathParts = event.path.split('/');
    const clientId = pathParts[pathParts.length - 1];
    const userType = decoded.type_utilisateur || decoded.type;
    const userId = decoded.id;

    switch (event.httpMethod) {
      case 'GET':
        console.log('Getting clients...');
        
        // Paramètres de pagination et recherche
        const queryParams = event.queryStringParameters || {};
        const page = parseInt(queryParams.page) || 1;
        const limit = parseInt(queryParams.limit) || 10;
        const search = queryParams.search || '';
        const societeFilter = queryParams.societe || ''; // Nouveau filtre pour les agents
        const offset = (page - 1) * limit;

        // Construire la requête de base avec jointure sur demandeurs_societe
        let baseQuery = `
          SELECT 
            c.*,
            ds.nom_societe as societe_nom
          FROM clients c
          LEFT JOIN demandeurs_societe ds ON c.societe_id = ds.id
        `;
        let countQuery = `
          SELECT COUNT(*) as total 
          FROM clients c
          LEFT JOIN demandeurs_societe ds ON c.societe_id = ds.id
        `;

        let whereConditions = [];
        let queryParameters = [];
        let paramCount = 0;

        // Filtrage par société selon le type d'utilisateur
        if (userType === 'demandeur') {
          // Pour les demandeurs, récupérer leur societe_id et filtrer
          const demandeur = await sql`
            SELECT societe_id FROM demandeurs WHERE id = ${userId}
          `;
          
          if (demandeur.length === 0) {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ error: 'Utilisateur non trouvé' })
            };
          }

          if (demandeur[0].societe_id) {
            paramCount++;
            whereConditions.push(`c.societe_id = $${paramCount}`);
            queryParameters.push(demandeur[0].societe_id);
          }
        } else if (userType === 'agent' && societeFilter) {
          // Filtre société pour les agents
          paramCount++;
          whereConditions.push(`c.societe_id = $${paramCount}`);
          queryParameters.push(societeFilter);
        }

        // Ajouter la recherche si présente
        if (search) {
          paramCount++;
          const searchPattern = `%${search}%`;
          whereConditions.push(`(
            c.nom_societe ILIKE $${paramCount} OR 
            COALESCE(c.nom, '') ILIKE $${paramCount} OR 
            COALESCE(c.prenom, '') ILIKE $${paramCount} OR 
            COALESCE(c.numero, '') ILIKE $${paramCount} OR
            COALESCE(ds.nom_societe, '') ILIKE $${paramCount}
          )`);
          queryParameters.push(searchPattern);
        }

        // Construire la clause WHERE
        let whereClause = '';
        if (whereConditions.length > 0) {
          whereClause = ' WHERE ' + whereConditions.join(' AND ');
        }

        let orderClause = ' ORDER BY c.nom_societe, c.nom, c.prenom';
        let paginationClause = ` LIMIT ${limit} OFFSET ${offset}`;

        // Construire les requêtes finales
        const finalQuery = baseQuery + whereClause + orderClause + paginationClause;
        const finalCountQuery = countQuery + whereClause;

        console.log('Final query:', finalQuery);
        console.log('Query parameters:', queryParameters);

        // Exécuter les requêtes
        const [clients, countResult] = await Promise.all([
          sql(finalQuery, queryParameters),
          sql(finalCountQuery, queryParameters)
        ]);

        const total = parseInt(countResult[0].total);
        const totalPages = Math.ceil(total / limit);

        console.log(`Clients found: ${clients.length} of ${total} total, page ${page}/${totalPages}`);
        
        return { 
          statusCode: 200, 
          headers, 
          body: JSON.stringify({
            data: clients,
            pagination: {
              page,
              limit,
              total,
              totalPages,
              hasNext: page < totalPages,
              hasPrev: page > 1
            }
          })
        };

      case 'POST':
        console.log('Creating client...');
        const newClient = JSON.parse(event.body);
        const { nom_societe, adresse, nom, prenom, numero, societe_id } = newClient;
        
        if (!nom_societe || !adresse) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ detail: 'Le nom de société et l\'adresse sont requis' })
          };
        }

        // Déterminer le societe_id selon le type d'utilisateur
        let finalSocieteId = societe_id;
        
        if (userType === 'demandeur') {
          // Pour les demandeurs, forcer leur propre société
          const demandeur = await sql`
            SELECT societe_id FROM demandeurs WHERE id = ${userId}
          `;
          
          if (demandeur.length > 0 && demandeur[0].societe_id) {
            finalSocieteId = demandeur[0].societe_id;
          }
        }

        const createdClient = await sql`
          INSERT INTO clients (id, nom_societe, adresse, nom, prenom, numero, societe_id)
          VALUES (${uuidv4()}, ${nom_societe}, ${adresse}, ${nom || null}, ${prenom || null}, ${numero || null}, ${finalSocieteId || null})
          RETURNING *
        `;
        console.log('Client created:', createdClient[0]);
        return { statusCode: 201, headers, body: JSON.stringify(createdClient[0]) };

      case 'PUT':
        const updateData = JSON.parse(event.body);
        const { nom_societe: upd_societe, adresse: upd_adresse, nom: upd_nom, prenom: upd_prenom, numero: upd_numero, societe_id: upd_societe_id } = updateData;
        
        // Déterminer le societe_id selon le type d'utilisateur
        let finalUpdateSocieteId = upd_societe_id;
        
        if (userType === 'demandeur') {
          // Pour les demandeurs, forcer leur propre société
          const demandeur = await sql`
            SELECT societe_id FROM demandeurs WHERE id = ${userId}
          `;
          
          if (demandeur.length > 0 && demandeur[0].societe_id) {
            finalUpdateSocieteId = demandeur[0].societe_id;
          }
        }

        const updatedClient = await sql`
          UPDATE clients 
          SET nom_societe = ${upd_societe}, 
              adresse = ${upd_adresse}, 
              nom = ${upd_nom || null}, 
              prenom = ${upd_prenom || null}, 
              numero = ${upd_numero || null}, 
              societe_id = ${finalUpdateSocieteId || null},
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ${clientId}
          RETURNING *
        `;
        
        if (updatedClient.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ detail: 'Client non trouvé' })
          };
        }
        return { statusCode: 200, headers, body: JSON.stringify(updatedClient[0]) };

      case 'DELETE':
        const deletedClient = await sql`DELETE FROM clients WHERE id = ${clientId} RETURNING id`;
        
        if (deletedClient.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ detail: 'Client non trouvé' })
          };
        }
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: 'Client supprimé avec succès' })
        };

      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
  } catch (error) {
    console.error('Clients API error:', error);
    if (error.name === 'JsonWebTokenError') {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ detail: 'Token invalide' })
      };
    }
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ detail: 'Erreur serveur: ' + error.message })
    };
  }
};