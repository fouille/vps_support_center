const { neon } = require('@netlify/neon');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const sql = neon(); // automatically uses env NETLIFY_DATABASE_URL

// Import conditionnel du service email
const loadEmailService = () => {
  try {
    console.log('Loading email service...');
    const service = require('./email-service');
    console.log('Email service loaded successfully, functions available:', Object.keys(service));
    return service;
  } catch (error) {
    console.error('Failed to load email service:', error);
    console.error('Error stack:', error.stack);
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
        
        if ((decoded.type_utilisateur || decoded.type) === 'agent') {
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
        } else if ((decoded.type_utilisateur || decoded.type) === 'demandeur') {
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
        if ((decoded.type_utilisateur || decoded.type) === 'demandeur') {
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
          VALUES (${uuidv4()}, ${ticketId}, ${auteurType}, ${auteurId}, ${message.trim()})
          RETURNING *
        `;

        // Si c'est un demandeur qui commente, changer le statut du ticket à "en_attente" sauf si c'est "nouveau"
        if (auteurType === 'demandeur') {
          await sql`
            UPDATE tickets 
            SET status = 'en_attente', updated_at = NOW()
            WHERE id = ${ticketId} AND status != 'nouveau'
          `;
        }
        
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

        // Envoyer un email de notification pour le commentaire
        try {
          const emailService = loadEmailService();
          if (emailService) {
            // Récupérer les informations du ticket et des utilisateurs
            const ticketInfo = await sql`
              SELECT t.*, c.nom_societe as client_nom,
                     d.nom as demandeur_nom, d.prenom as demandeur_prenom, d.email as demandeur_email,
                     a.nom as agent_nom, a.prenom as agent_prenom, a.email as agent_email
              FROM tickets t
              JOIN clients c ON t.client_id = c.id
              JOIN demandeurs d ON t.demandeur_id = d.id
              LEFT JOIN agents a ON t.agent_id = a.id
              WHERE t.id = ${ticketId}
            `;

            if (ticketInfo.length > 0) {
              const ticket = ticketInfo[0];
              let recipientEmail, recipientName, authorInfo;

              // Récupérer les informations de l'auteur du commentaire
              if (auteurType === 'agent') {
                const agentInfo = await sql`SELECT nom, prenom, email FROM agents WHERE id = ${auteurId}`;
                authorInfo = { ...agentInfo[0], type_utilisateur: 'agent' };
                // Si c'est un agent qui commente, notifier le demandeur
                recipientEmail = ticket.demandeur_email;
                recipientName = `${ticket.demandeur_prenom} ${ticket.demandeur_nom}`;
              } else {
                const demandeurInfo = await sql`SELECT nom, prenom, email FROM demandeurs WHERE id = ${auteurId}`;
                authorInfo = { ...demandeurInfo[0], type_utilisateur: 'demandeur' };
                // Si c'est un demandeur qui commente, notifier l'agent (ou contact@voipservices.fr si pas d'agent assigné)
                if (ticket.agent_email) {
                  recipientEmail = ticket.agent_email;
                  recipientName = `${ticket.agent_prenom} ${ticket.agent_nom}`;
                } else {
                  recipientEmail = 'contact@voipservices.fr';
                  recipientName = 'Support VoIP Services';
                }
              }

              if (recipientEmail && authorInfo) {
                console.log('Email data debug:');
                console.log('- ticket:', { id: ticket.id, numero_ticket: ticket.numero_ticket, titre: ticket.titre });
                console.log('- comment (echangeWithAuthor[0]):', echangeWithAuthor[0]);
                console.log('- authorInfo:', authorInfo);
                console.log('- recipientEmail:', recipientEmail);
                
                await emailService.sendCommentEmail(
                  ticket,
                  echangeWithAuthor[0],
                  authorInfo,
                  recipientEmail,
                  recipientName
                );
                console.log('Comment notification email sent successfully');
              }
            }
          }
        } catch (emailError) {
          console.error('Error sending comment notification email:', emailError);
          // Ne pas faire échouer la création du commentaire si l'email échoue
        }

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