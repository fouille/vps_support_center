const { neon } = require('@netlify/neon');
const jwt = require('jsonwebtoken');
const emailService = require('./email-service');

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
  console.log('Portabilites function called:', event.httpMethod, event.path);
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  try {
    // Vérification du token JWT
    const authHeader = event.headers.authorization || event.headers.Authorization;
    const decoded = verifyToken(authHeader);

    const method = event.httpMethod;
    const pathParts = event.path.split('/');
    const portabiliteId = pathParts[pathParts.length - 1];

    if (method === 'GET') {
      // Récupération des portabilités
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
          a.nom as agent_nom,
          a.prenom as agent_prenom
        FROM portabilites p
        LEFT JOIN clients c ON p.client_id = c.id
        LEFT JOIN demandeurs d ON p.demandeur_id = d.id
        LEFT JOIN agents a ON p.agent_id = a.id
        WHERE 1=1
      `;

      let queryParams = [];
      let paramCount = 0;

      // Filtrage par utilisateur selon le type
      if (decoded.type === 'demandeur') {
        paramCount++;
        baseQuery += ` AND p.demandeur_id = $${paramCount}`;
        queryParams.push(decoded.id);
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

      // Recherche par numéro de portabilité
      if (search) {
        paramCount++;
        baseQuery += ` AND p.numero_portabilite ILIKE $${paramCount}`;
        queryParams.push(`%${search}%`);
      }

      // Récupération du total
      const countQuery = `SELECT COUNT(*) as total FROM (${baseQuery}) as subquery`;
      const totalResult = await sql(countQuery, queryParams);
      const total = parseInt(totalResult[0].total);

      // Récupération des données paginées
      baseQuery += ` ORDER BY p.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      queryParams.push(limit, offset);

      const result = await sql(baseQuery, queryParams);
      
      // Formatage des résultats
      const portabilites = result.map(row => ({
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
          data: portabilites,
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

    } else {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Méthode non autorisée pour le test' })
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