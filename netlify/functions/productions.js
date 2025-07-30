const { neon } = require('@netlify/neon');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const sql = neon(); // automatically uses env NETLIFY_DATABASE_URL

// Import conditionnel du service email
const loadEmailService = () => {
  try {
    return require('./email-service');
  } catch (error) {
    console.error('Failed to load email service:', error);
    return null;
  }
};

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

// Fonction pour obtenir le nom du client formaté
function formatClientDisplay(client) {
  if (!client.nom_societe) return 'Client sans nom';
  
  let display = client.nom_societe;
  
  if (client.nom && client.prenom) {
    display += ` (${client.nom} ${client.prenom})`;
  } else if (client.nom) {
    display += ` (${client.nom})`;
  } else if (client.prenom) {
    display += ` (${client.prenom})`;
  }
  
  return display;
}

exports.handler = async (event, context) => {
  console.log('Productions function called:', event.httpMethod, event.path);
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  try {
    // Vérification du token JWT
    const authHeader = event.headers.authorization || event.headers.Authorization;
    const decoded = verifyToken(authHeader);

    const method = event.httpMethod;
    const pathParts = event.path.split('/');
    const productionId = pathParts[pathParts.length - 1];

    if (method === 'GET') {
      // Vérifier si c'est une demande pour une production spécifique
      const isSpecificProduction = productionId && 
        productionId !== 'productions' && 
        productionId.length > 10; // UUID plus long que 10 caractères

      if (isSpecificProduction) {
        // Requête pour une production spécifique
        let specificQuery = `
          SELECT 
            p.*,
            c.nom_societe,
            c.nom as client_nom,
            c.prenom as client_prenom,
            d.nom as demandeur_nom,
            d.prenom as demandeur_prenom,
            ds.nom_societe as societe_nom
          FROM productions p
          LEFT JOIN clients c ON p.client_id = c.id
          LEFT JOIN demandeurs d ON p.demandeur_id = d.id
          LEFT JOIN demandeurs_societe ds ON p.societe_id = ds.id
          WHERE p.id = $1
        `;

        let queryParams = [productionId];

        // Vérification des permissions pour les demandeurs
        if ((decoded.type_utilisateur || decoded.type) === 'demandeur') {
          // Pour les demandeurs, vérifier qu'ils peuvent accéder à cette production via leur société
          const demandeur = await sql`
            SELECT societe_id FROM demandeurs WHERE id = ${decoded.id}
          `;
          
          if (demandeur.length === 0) {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ error: 'Utilisateur non trouvé' })
            };
          }

          if (demandeur[0].societe_id) {
            // Vérifier via la société
            specificQuery += ` AND p.societe_id = $2`;
            queryParams.push(demandeur[0].societe_id);
          } else {
            // Si pas de société, voir seulement ses propres productions
            specificQuery += ` AND p.demandeur_id = $2`;
            queryParams.push(decoded.id);
          }
        }

        const result = await sql(specificQuery, queryParams);

        if (result.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Production non trouvée' })
          };
        }

        // Récupération des tâches associées
        const tachesQuery = `
          SELECT * FROM production_taches 
          WHERE production_id = $1 
          ORDER BY ordre_tache ASC
        `;
        const taches = await sql(tachesQuery, [productionId]);

        // Formatage du résultat unique
        const production = {
          ...result[0],
          client_display: formatClientDisplay({
            nom_societe: result[0].nom_societe,
            nom: result[0].client_nom,
            prenom: result[0].client_prenom
          }),
          taches: taches
        };

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(production)
        };

      } else {
        // Récupération de la liste des productions
        const { queryStringParameters } = event;
        const page = parseInt(queryStringParameters?.page) || 1;
        const limit = parseInt(queryStringParameters?.limit) || 10;
        const offset = (page - 1) * limit;
        const status = queryStringParameters?.status;
        const clientId = queryStringParameters?.client;
        const search = queryStringParameters?.search;

        let baseQuery = `
          SELECT 
            p.*,
            c.nom_societe,
            c.nom as client_nom,
            c.prenom as client_prenom,
            d.nom as demandeur_nom,
            d.prenom as demandeur_prenom,
            ds.nom_societe as societe_nom
          FROM productions p
          LEFT JOIN clients c ON p.client_id = c.id
          LEFT JOIN demandeurs d ON p.demandeur_id = d.id
          LEFT JOIN demandeurs_societe ds ON p.societe_id = ds.id
          WHERE 1=1
        `;

        let queryParams = [];
        let paramCount = 0;

        // Filtrage par utilisateur selon le type
        if ((decoded.type_utilisateur || decoded.type) === 'demandeur') {
          // Pour les demandeurs, utiliser societe_id pour voir toutes les productions de la société
          const demandeur = await sql`
            SELECT societe_id FROM demandeurs WHERE id = ${decoded.id}
          `;
          
          if (demandeur.length === 0) {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ error: 'Utilisateur non trouvé' })
            };
          }

          if (demandeur[0].societe_id) {
            // Filtrer par société
            paramCount++;
            baseQuery += ` AND p.societe_id = $${paramCount}`;
            queryParams.push(demandeur[0].societe_id);
          } else {
            // Si pas de société, voir seulement ses propres productions
            paramCount++;
            baseQuery += ` AND p.demandeur_id = $${paramCount}`;
            queryParams.push(decoded.id);
          }
        }

        // Filtrage par statut
        if (status) {
          paramCount++;
          baseQuery += ` AND p.status = $${paramCount}`;
          queryParams.push(status);
        }

        // Filtrage par client
        if (clientId) {
          paramCount++;
          baseQuery += ` AND p.client_id = $${paramCount}`;
          queryParams.push(clientId);
        }

        // Recherche par numéro de production
        if (search) {
          paramCount++;
          baseQuery += ` AND p.numero_production ILIKE $${paramCount}`;
          queryParams.push(`%${search}%`);
        }

        // Récupération du total
        const countQuery = `SELECT COUNT(*) as total FROM (${baseQuery}) as subquery`;
        const totalResult = await sql(countQuery, queryParams);
        const total = parseInt(totalResult[0].total);

        // Récupération des données paginées
        baseQuery += ` ORDER BY p.date_creation DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        queryParams.push(limit, offset);

        const result = await sql(baseQuery, queryParams);
        
        // Formatage des résultats
        const productions = result.map(row => ({
          ...row,
          client_display: formatClientDisplay({
            nom_societe: row.nom_societe,
            nom: row.client_nom,
            prenom: row.client_prenom
          })
        }));

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            data: productions,
            pagination: {
              page,
              limit,
              total,
              pages: Math.ceil(total / limit),
              hasNext: page < Math.ceil(total / limit),
              hasPrev: page > 1
            }
          })
        };
      }

    } else if (method === 'POST') {
      // Création d'une nouvelle production
      const body = JSON.parse(event.body);
      const {
        client_id,
        demandeur_id,
        titre,
        description,
        priorite = 'normale',
        date_livraison_prevue
      } = body;

      // Validation des champs requis
      if (!client_id || !titre) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Client et titre requis' })
        };
      }

      // Détermination du demandeur et de la société
      let finalDemandeurId = demandeur_id;
      let societeId;
      
      if ((decoded.type_utilisateur || decoded.type) === 'demandeur') {
        // Pour les demandeurs, utiliser leur propre ID et récupérer leur société
        finalDemandeurId = decoded.id;
        const demandeur = await sql`
          SELECT societe_id FROM demandeurs WHERE id = ${decoded.id}
        `;
        
        if (demandeur.length === 0 || !demandeur[0].societe_id) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Demandeur non trouvé ou sans société associée' })
          };
        }
        societeId = demandeur[0].societe_id;
      } else if ((decoded.type_utilisateur || decoded.type) === 'agent') {
        // Pour les agents, ils doivent spécifier un demandeur_id
        if (!demandeur_id) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Un agent doit spécifier un demandeur pour la production' })
          };
        }
        
        // Récupérer la société du demandeur spécifié
        const demandeur = await sql`
          SELECT societe_id FROM demandeurs WHERE id = ${demandeur_id}
        `;
        
        if (demandeur.length === 0 || !demandeur[0].societe_id) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Demandeur spécifié non trouvé ou sans société associée' })
          };
        }
        societeId = demandeur[0].societe_id;
      }

      // Insertion de la production
      const insertQuery = `
        INSERT INTO productions (
          client_id, demandeur_id, societe_id, titre, description, priorite, 
          date_livraison_prevue, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const result = await sql(insertQuery, [
        client_id,
        finalDemandeurId,
        societeId,
        titre,
        description,
        priorite,
        date_livraison_prevue,
        decoded.id
      ]);

      const newProduction = result[0];

      // Récupération des informations complètes pour l'email
      const detailQuery = `
        SELECT 
          p.*,
          c.nom_societe,
          c.nom as client_nom,
          c.prenom as client_prenom,
          d.nom as demandeur_nom,
          d.prenom as demandeur_prenom,
          d.email as demandeur_email,
          ds.nom_societe as societe_nom
        FROM productions p
        LEFT JOIN clients c ON p.client_id = c.id
        LEFT JOIN demandeurs d ON p.demandeur_id = d.id
        LEFT JOIN demandeurs_societe ds ON p.societe_id = ds.id
        WHERE p.id = $1
      `;

      const detailResult = await sql(detailQuery, [newProduction.id]);
      const productionDetail = detailResult[0];

      // Envoi d'email de notification
      try {
        const emailService = loadEmailService();
        if (emailService) {
          // Utiliser une fonction d'email similaire aux portabilités
          await emailService.sendProductionCreationEmail(productionDetail);
        }
      } catch (emailError) {
        console.error('Erreur envoi email:', emailError);
        // Ne pas faire échouer la création pour un problème d'email
      }

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(newProduction)
      };

    } else if (method === 'PUT') {
      // Mise à jour d'une production
      const body = JSON.parse(event.body);
      const {
        client_id,
        status,
        titre,
        description,
        priorite,
        date_livraison_prevue,
        assigned_to
      } = body;

      // Récupération du statut actuel
      const currentQuery = `SELECT * FROM productions WHERE id = $1`;
      const currentResult = await sql(currentQuery, [productionId]);
      
      if (currentResult.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Production non trouvée' })
        };
      }

      const currentProduction = currentResult[0];

      // Mise à jour
      const updateQuery = `
        UPDATE productions SET
          client_id = COALESCE($1, client_id),
          status = COALESCE($2, status),
          titre = COALESCE($3, titre),
          description = COALESCE($4, description),
          priorite = COALESCE($5, priorite),
          date_livraison_prevue = COALESCE($6, date_livraison_prevue),
          assigned_to = COALESCE($7, assigned_to),
          date_modification = CURRENT_TIMESTAMP
        WHERE id = $8
        RETURNING *
      `;

      const result = await sql(updateQuery, [
        client_id,
        status,
        titre,
        description,
        priorite,
        date_livraison_prevue,
        assigned_to,
        productionId
      ]);

      const updatedProduction = result[0];

      // Si le statut a changé, envoyer un email
      if (status && status !== currentProduction.status) {
        try {
          const emailService = loadEmailService();
          if (emailService) {
            const detailQuery = `
              SELECT 
                p.*,
                c.nom_societe,
                c.nom as client_nom,
                c.prenom as client_prenom,
                d.nom as demandeur_nom,
                d.prenom as demandeur_prenom,
                d.email as demandeur_email,
                ds.nom as societe_nom
              FROM productions p
              LEFT JOIN clients c ON p.client_id = c.id
              LEFT JOIN demandeurs d ON p.demandeur_id = d.id
              LEFT JOIN demandeurs_societe ds ON p.societe_id = ds.id
              WHERE p.id = $1
            `;

            const detailResult = await sql(detailQuery, [productionId]);
            const productionDetail = detailResult[0];

            await emailService.sendProductionStatusChangeEmail(
              productionDetail, 
              currentProduction.status, 
              status
            );
          }
        } catch (emailError) {
          console.error('Erreur envoi email:', emailError);
          // Ne pas faire échouer la mise à jour pour un problème d'email
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(updatedProduction)
      };

    } else if (method === 'DELETE') {
      // Suppression d'une production (agents uniquement)
      if ((decoded.type_utilisateur || decoded.type) !== 'agent') {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Accès interdit' })
        };
      }

      const deleteQuery = `DELETE FROM productions WHERE id = $1 RETURNING *`;
      const result = await sql(deleteQuery, [productionId]);

      if (result.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Production non trouvée' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Production supprimée avec succès' })
      };

    } else {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Méthode non autorisée' })
      };
    }

  } catch (error) {
    console.error('Erreur:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erreur interne du serveur: ' + error.message })
    };
  }
};