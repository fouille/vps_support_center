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

exports.handler = async (event, context) => {
  console.log('Tickets function called:', event.httpMethod, event.path);
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  try {
    // Verify authentication
    const authHeader = event.headers.authorization || event.headers.Authorization;
    const decoded = verifyToken(authHeader);

    const pathParts = event.path.split('/');
    const ticketId = pathParts[pathParts.length - 1];

    switch (event.httpMethod) {
      case 'GET':
        console.log('Getting tickets...');
        let ticketsQuery;
        
        // Parse query parameters for filtering
        const queryParams = new URLSearchParams(event.rawUrl?.split('?')[1] || '');
        const statusFilter = queryParams.get('status_filter');
        const clientIdFilter = queryParams.get('client_id');
        const searchFilter = queryParams.get('search'); // Nouveau paramètre pour recherche par numéro
        
        console.log('Query filters:', { statusFilter, clientIdFilter, searchFilter });
        
        if ((decoded.type_utilisateur || decoded.type) === 'agent') {
          // Base query for agents (can see all tickets)
          let whereConditions = [];
          let params = [];
          
          // Filter by status if specified
          if (statusFilter) {
            const statuses = statusFilter.split(',');
            whereConditions.push(`t.status = ANY($${params.length + 1})`);
            params.push(statuses);
          }
          
          // Filter by client if specified
          if (clientIdFilter) {
            whereConditions.push(`t.client_id = $${params.length + 1}`);
            params.push(clientIdFilter);
          }
          
          // Filter by ticket number search if specified
          if (searchFilter) {
            whereConditions.push(`t.numero_ticket ILIKE $${params.length + 1}`);
            params.push(`%${searchFilter}%`);
          }
          
          // Build the WHERE clause
          const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
          
          console.log('SQL WHERE clause:', whereClause, 'Params:', params);
          
          // Execute the unified query
          const baseQuery = `
            SELECT t.*, c.nom_societe as client_nom, c.nom as client_nom_personne, c.prenom as client_prenom,
                   d.nom as demandeur_nom, d.prenom as demandeur_prenom, d.societe as demandeur_societe,
                   a.nom as agent_nom, a.prenom as agent_prenom
            FROM tickets t 
            JOIN clients c ON t.client_id = c.id 
            JOIN demandeurs d ON t.demandeur_id = d.id 
            LEFT JOIN agents a ON t.agent_id = a.id 
            ${whereClause}
            ORDER BY t.date_creation DESC
          `;
          
          if (params.length === 0) {
            ticketsQuery = await sql`
              SELECT t.*, c.nom_societe as client_nom, c.nom as client_nom_personne, c.prenom as client_prenom,
                     d.nom as demandeur_nom, d.prenom as demandeur_prenom, d.societe as demandeur_societe,
                     a.nom as agent_nom, a.prenom as agent_prenom
              FROM tickets t 
              JOIN clients c ON t.client_id = c.id 
              JOIN demandeurs d ON t.demandeur_id = d.id 
              LEFT JOIN agents a ON t.agent_id = a.id 
              ORDER BY t.date_creation DESC
            `;
          } else if (params.length === 1) {
            ticketsQuery = await sql`
              SELECT t.*, c.nom_societe as client_nom, c.nom as client_nom_personne, c.prenom as client_prenom,
                     d.nom as demandeur_nom, d.prenom as demandeur_prenom, d.societe as demandeur_societe,
                     a.nom as agent_nom, a.prenom as agent_prenom
              FROM tickets t 
              JOIN clients c ON t.client_id = c.id 
              JOIN demandeurs d ON t.demandeur_id = d.id 
              LEFT JOIN agents a ON t.agent_id = a.id 
            `.append(sql.unsafe(whereClause)).append(sql`
              ORDER BY t.date_creation DESC
            `);
          } else if (params.length === 2) {
            if (statusFilter && clientIdFilter) {
              const statuses = statusFilter.split(',');
              ticketsQuery = await sql`
                SELECT t.*, c.nom_societe as client_nom, c.nom as client_nom_personne, c.prenom as client_prenom,
                       d.nom as demandeur_nom, d.prenom as demandeur_prenom, d.societe as demandeur_societe,
                       a.nom as agent_nom, a.prenom as agent_prenom
                FROM tickets t 
                JOIN clients c ON t.client_id = c.id 
                JOIN demandeurs d ON t.demandeur_id = d.id 
                LEFT JOIN agents a ON t.agent_id = a.id 
                WHERE t.status = ANY(${statuses}) AND t.client_id = ${clientIdFilter}
                ORDER BY t.date_creation DESC
              `;
            } else if (statusFilter && searchFilter) {
              const statuses = statusFilter.split(',');
              ticketsQuery = await sql`
                SELECT t.*, c.nom_societe as client_nom, c.nom as client_nom_personne, c.prenom as client_prenom,
                       d.nom as demandeur_nom, d.prenom as demandeur_prenom, d.societe as demandeur_societe,
                       a.nom as agent_nom, a.prenom as agent_prenom
                FROM tickets t 
                JOIN clients c ON t.client_id = c.id 
                JOIN demandeurs d ON t.demandeur_id = d.id 
                LEFT JOIN agents a ON t.agent_id = a.id 
                WHERE t.status = ANY(${statuses}) AND t.numero_ticket ILIKE ${`%${searchFilter}%`}
                ORDER BY t.date_creation DESC
              `;
            } else if (clientIdFilter && searchFilter) {
              ticketsQuery = await sql`
                SELECT t.*, c.nom_societe as client_nom, c.nom as client_nom_personne, c.prenom as client_prenom,
                       d.nom as demandeur_nom, d.prenom as demandeur_prenom, d.societe as demandeur_societe,
                       a.nom as agent_nom, a.prenom as agent_prenom
                FROM tickets t 
                JOIN clients c ON t.client_id = c.id 
                JOIN demandeurs d ON t.demandeur_id = d.id 
                LEFT JOIN agents a ON t.agent_id = a.id 
                WHERE t.client_id = ${clientIdFilter} AND t.numero_ticket ILIKE ${`%${searchFilter}%`}
                ORDER BY t.date_creation DESC
              `;
            }
          } else if (params.length === 3) {
            const statuses = statusFilter.split(',');
            ticketsQuery = await sql`
              SELECT t.*, c.nom_societe as client_nom, c.nom as client_nom_personne, c.prenom as client_prenom,
                     d.nom as demandeur_nom, d.prenom as demandeur_prenom, d.societe as demandeur_societe,
                     a.nom as agent_nom, a.prenom as agent_prenom
              FROM tickets t 
              JOIN clients c ON t.client_id = c.id 
              JOIN demandeurs d ON t.demandeur_id = d.id 
              LEFT JOIN agents a ON t.agent_id = a.id 
              WHERE t.status = ANY(${statuses}) AND t.client_id = ${clientIdFilter} AND t.numero_ticket ILIKE ${`%${searchFilter}%`}
              ORDER BY t.date_creation DESC
            `;
          } else {
            // Fallback: status filter only if it exists  
            if (statusFilter) {
              const statuses = statusFilter.split(',');
              ticketsQuery = await sql`
                SELECT t.*, c.nom_societe as client_nom, c.nom as client_nom_personne, c.prenom as client_prenom,
                       d.nom as demandeur_nom, d.prenom as demandeur_prenom, d.societe as demandeur_societe,
                       a.nom as agent_nom, a.prenom as agent_prenom
                FROM tickets t 
                JOIN clients c ON t.client_id = c.id 
                JOIN demandeurs d ON t.demandeur_id = d.id 
                LEFT JOIN agents a ON t.agent_id = a.id 
                WHERE t.status = ANY(${statuses})
                ORDER BY t.date_creation DESC
              `;
            } else if (clientIdFilter) {
              ticketsQuery = await sql`
                SELECT t.*, c.nom_societe as client_nom, c.nom as client_nom_personne, c.prenom as client_prenom,
                       d.nom as demandeur_nom, d.prenom as demandeur_prenom, d.societe as demandeur_societe,
                       a.nom as agent_nom, a.prenom as agent_prenom
                FROM tickets t 
                JOIN clients c ON t.client_id = c.id 
                JOIN demandeurs d ON t.demandeur_id = d.id 
                LEFT JOIN agents a ON t.agent_id = a.id 
                WHERE t.client_id = ${clientIdFilter}
                ORDER BY t.date_creation DESC
              `;
            } else if (searchFilter) {
              ticketsQuery = await sql`
                SELECT t.*, c.nom_societe as client_nom, c.nom as client_nom_personne, c.prenom as client_prenom,
                       d.nom as demandeur_nom, d.prenom as demandeur_prenom, d.societe as demandeur_societe,
                       a.nom as agent_nom, a.prenom as agent_prenom
                FROM tickets t 
                JOIN clients c ON t.client_id = c.id 
                JOIN demandeurs d ON t.demandeur_id = d.id 
                LEFT JOIN agents a ON t.agent_id = a.id 
                WHERE t.numero_ticket ILIKE ${`%${searchFilter}%`}
                ORDER BY t.date_creation DESC
              `;
            } else {
              ticketsQuery = await sql`
                SELECT t.*, c.nom_societe as client_nom, c.nom as client_nom_personne, c.prenom as client_prenom,
                       d.nom as demandeur_nom, d.prenom as demandeur_prenom, d.societe as demandeur_societe,
                       a.nom as agent_nom, a.prenom as agent_prenom
                FROM tickets t 
                JOIN clients c ON t.client_id = c.id 
                JOIN demandeurs d ON t.demandeur_id = d.id 
                LEFT JOIN agents a ON t.agent_id = a.id 
                ORDER BY t.date_creation DESC
              `;
            }
          }
        } else {
          // Demandeurs can only see tickets from their company (using societe_id)
          const demandeur = await sql`
            SELECT societe_id FROM demandeurs WHERE id = ${decoded.id}
          `;
          
          if (demandeur.length === 0) {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ detail: 'Utilisateur non trouvé' })
            };
          }

          // If demandeur has no societe_id, show only their own tickets
          if (!demandeur[0].societe_id) {
            ticketsQuery = await sql`
              SELECT t.*, c.nom_societe as client_nom, c.nom as client_nom_personne, c.prenom as client_prenom,
                     d.nom as demandeur_nom, d.prenom as demandeur_prenom, d.societe as demandeur_societe,
                     a.nom as agent_nom, a.prenom as agent_prenom
              FROM tickets t 
              JOIN clients c ON t.client_id = c.id 
              JOIN demandeurs d ON t.demandeur_id = d.id 
              LEFT JOIN agents a ON t.agent_id = a.id 
              WHERE t.demandeur_id = ${decoded.id}
              ORDER BY t.date_creation DESC
            `;
          } else {
            // Show tickets from all demandeurs with the same societe_id
            ticketsQuery = await sql`
              SELECT t.*, c.nom_societe as client_nom, c.nom as client_nom_personne, c.prenom as client_prenom,
                     d.nom as demandeur_nom, d.prenom as demandeur_prenom, d.societe as demandeur_societe,
                     a.nom as agent_nom, a.prenom as agent_prenom
              FROM tickets t 
              JOIN clients c ON t.client_id = c.id 
              JOIN demandeurs d ON t.demandeur_id = d.id 
              LEFT JOIN agents a ON t.agent_id = a.id 
              WHERE d.societe_id = ${demandeur[0].societe_id}
              ORDER BY t.date_creation DESC
            `;
          }
        }

        console.log('Tickets found:', ticketsQuery.length);
        return { statusCode: 200, headers, body: JSON.stringify(ticketsQuery) };

      case 'POST':
        console.log('Creating ticket...');
        const newTicket = JSON.parse(event.body);
        const { titre, client_id, status = 'nouveau', date_fin_prevue, requete_initiale, demandeur_id } = newTicket;
        
        if (!titre || !client_id || !requete_initiale) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ detail: 'Titre, client et requête initiale sont requis' })
          };
        }

        let finalDemandeurId;

        if ((decoded.type_utilisateur || decoded.type) === 'demandeur') {
          // For demandeurs, use their own ID
          const demandeur = await sql`
            SELECT id FROM demandeurs WHERE email = ${decoded.sub}
          `;

          if (demandeur.length === 0) {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ detail: 'Demandeur non trouvé' })
            };
          }
          finalDemandeurId = demandeur[0].id;
        } else if ((decoded.type_utilisateur || decoded.type) === 'agent') {
          // For agents, they must specify a demandeur_id
          if (!demandeur_id) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ detail: 'Un agent doit spécifier un demandeur pour le ticket' })
            };
          }
          finalDemandeurId = demandeur_id;
        } else {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ detail: 'Type d\'utilisateur non autorisé' })
          };
        }

        const createdTicket = await sql`
          INSERT INTO tickets (id, titre, client_id, demandeur_id, status, date_fin_prevue, requete_initiale)
          VALUES (${uuidv4()}, ${titre}, ${client_id}, ${finalDemandeurId}, ${status}, ${date_fin_prevue || null}, ${requete_initiale})
          RETURNING *
        `;
        
        console.log('Ticket created:', createdTicket[0]);

        // Récupérer les informations du client et du demandeur pour l'email
        try {
          const emailService = loadEmailService();
          if (emailService) {
            const [clientInfo, demandeurInfo] = await Promise.all([
              sql`SELECT * FROM clients WHERE id = ${client_id}`,
              sql`SELECT * FROM demandeurs WHERE id = ${finalDemandeurId}`
            ]);

            if (clientInfo.length > 0 && demandeurInfo.length > 0) {
              // Envoyer l'email de création de ticket
              await emailService.sendTicketCreatedEmail(
                createdTicket[0], 
                clientInfo[0], 
                demandeurInfo[0]
              );
              console.log('Ticket creation email sent successfully');
            }
          }
        } catch (emailError) {
          console.error('Error sending ticket creation email:', emailError);
          // Ne pas faire échouer la création du ticket si l'email échoue
        }

        return { statusCode: 201, headers, body: JSON.stringify(createdTicket[0]) };

      case 'PUT':
        const updateData = JSON.parse(event.body);
        const { titre: upd_titre, status: upd_status, agent_id, date_fin_prevue: upd_date_fin, date_cloture } = updateData;
        
        // Récupérer l'ancien statut avant mise à jour
        const currentTicket = await sql`SELECT * FROM tickets WHERE id = ${ticketId}`;
        
        if (currentTicket.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ detail: 'Ticket non trouvé' })
          };
        }

        const oldStatus = currentTicket[0].status;
        
        const updatedTicket = await sql`
          UPDATE tickets 
          SET titre = ${upd_titre}, status = ${upd_status}, agent_id = ${agent_id || null}, 
              date_fin_prevue = ${upd_date_fin || null}, date_cloture = ${date_cloture || null}
          WHERE id = ${ticketId}
          RETURNING *
        `;
        
        if (updatedTicket.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ detail: 'Ticket non trouvé' })
          };
        }

        // Envoyer un email si le statut a changé
        if (oldStatus !== upd_status) {
          try {
            const emailService = loadEmailService();
            if (emailService) {
              const [clientInfo, demandeurInfo] = await Promise.all([
                sql`SELECT * FROM clients WHERE id = ${updatedTicket[0].client_id}`,
                sql`SELECT * FROM demandeurs WHERE id = ${updatedTicket[0].demandeur_id}`
              ]);

              if (clientInfo.length > 0 && demandeurInfo.length > 0) {
                await emailService.sendStatusChangeEmail(
                  updatedTicket[0],
                  oldStatus,
                  upd_status,
                  clientInfo[0],
                  demandeurInfo[0]
                );
                console.log('Status change email sent successfully');
              }
            }
          } catch (emailError) {
            console.error('Error sending status change email:', emailError);
            // Ne pas faire échouer la mise à jour si l'email échoue
          }
        }

        return { statusCode: 200, headers, body: JSON.stringify(updatedTicket[0]) };

      case 'DELETE':
        const deletedTicket = await sql`DELETE FROM tickets WHERE id = ${ticketId} RETURNING id`;
        
        if (deletedTicket.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ detail: 'Ticket non trouvé' })
          };
        }
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: 'Ticket supprimé avec succès' })
        };

      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
  } catch (error) {
    console.error('Tickets API error:', error);
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