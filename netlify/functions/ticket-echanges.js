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
  console.log('Ticket-echanges function called:', event.httpMethod, event.queryStringParameters);
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  try {
    // Verify authentication
    const authHeader = event.headers.authorization || event.headers.Authorization;
    const decoded = verifyToken(authHeader);

    // Get ticketId from query parameters
    const ticketId = event.queryStringParameters?.ticketId;
    
    if (!ticketId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ detail: 'Paramètre ticketId manquant' })
      };
    }

    switch (event.httpMethod) {
      case 'GET':
        // Get all exchanges for a ticket
        console.log('Getting exchanges for ticket:', ticketId);
        const echanges = await sql`
          SELECT te.*, 
                 CASE 
                   WHEN te.auteur_type = 'demandeur' THEN d.nom || ' ' || d.prenom
                   WHEN te.auteur_type = 'agent' THEN a.nom || ' ' || a.prenom
                 END as auteur_nom
          FROM ticket_echanges te
          LEFT JOIN demandeurs d ON te.auteur_id = d.id AND te.auteur_type = 'demandeur'
          LEFT JOIN agents a ON te.auteur_id = a.id AND te.auteur_type = 'agent'
          WHERE te.ticket_id = ${ticketId}
          ORDER BY te.created_at ASC
        `;
        
        console.log('Exchanges found:', echanges.length);
        return { statusCode: 200, headers, body: JSON.stringify(echanges) };

      case 'POST':
        // Add new exchange/comment
        console.log('Adding exchange to ticket:', ticketId);
        const newEchange = JSON.parse(event.body);
        const { message } = newEchange;
        
        if (!message || !message.trim()) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ detail: 'Le message ne peut pas être vide' })
          };
        }

        // Get user info based on token
        let auteurId, auteurType;
        
        if (decoded.type === 'agent') {
          const agent = await sql`SELECT id FROM agents WHERE email = ${decoded.sub}`;
          if (agent.length === 0) {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ detail: 'Agent non trouvé' })
            };
          }
          auteurId = agent[0].id;
          auteurType = 'agent';
        } else if (decoded.type === 'demandeur') {
          const demandeur = await sql`SELECT id FROM demandeurs WHERE email = ${decoded.sub}`;
          if (demandeur.length === 0) {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ detail: 'Demandeur non trouvé' })
            };
          }
          auteurId = demandeur[0].id;
          auteurType = 'demandeur';
        } else {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ detail: 'Type d\'utilisateur non autorisé' })
          };
        }

        // Check if user has access to this ticket
        if (decoded.type === 'demandeur') {
          const ticketAccess = await sql`
            SELECT t.id FROM tickets t
            JOIN demandeurs d ON t.demandeur_id = d.id
            WHERE t.id = ${ticketId} AND d.societe = (
              SELECT societe FROM demandeurs WHERE id = ${auteurId}
            )
          `;
          
          if (ticketAccess.length === 0) {
            return {
              statusCode: 403,
              headers,
              body: JSON.stringify({ detail: 'Accès non autorisé à ce ticket' })
            };
          }
        }

        const createdEchange = await sql`
          INSERT INTO ticket_echanges (id, ticket_id, auteur_id, auteur_type, message)
          VALUES (${uuidv4()}, ${ticketId}, ${auteurId}, ${auteurType}, ${message.trim()})
          RETURNING *
        `;
        
        // Get the exchange with author name
        const echangeWithAuthor = await sql`
          SELECT te.*, 
                 CASE 
                   WHEN te.auteur_type = 'demandeur' THEN d.nom || ' ' || d.prenom
                   WHEN te.auteur_type = 'agent' THEN a.nom || ' ' || a.prenom
                 END as auteur_nom
          FROM ticket_echanges te
          LEFT JOIN demandeurs d ON te.auteur_id = d.id AND te.auteur_type = 'demandeur'
          LEFT JOIN agents a ON te.auteur_id = a.id AND te.auteur_type = 'agent'
          WHERE te.id = ${createdEchange[0].id}
        `;
        
        console.log('Exchange created:', echangeWithAuthor[0]);
        return { statusCode: 201, headers, body: JSON.stringify(echangeWithAuthor[0]) };

      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
  } catch (error) {
    console.error('Ticket-echanges API error:', error);
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