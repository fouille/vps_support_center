import { neon } from '@netlify/neon';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const sql = neon();

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
  return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-here');
};

export default async (req, context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('authorization');
    const decoded = verifyToken(authHeader);

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const ticketId = pathParts[pathParts.length - 1];

    switch (req.method) {
      case 'GET':
        let ticketsQuery;
        
        if (decoded.type === 'agent') {
          // Agents can see all tickets
          ticketsQuery = await sql`
            SELECT t.*, c.nom_societe as client_nom, c.nom as client_nom_contact, c.prenom as client_prenom_contact,
                   d.nom as demandeur_nom, d.prenom as demandeur_prenom, d.societe as demandeur_societe,
                   a.nom as agent_nom, a.prenom as agent_prenom
            FROM tickets t 
            JOIN clients c ON t.client_id = c.id 
            JOIN demandeurs d ON t.demandeur_id = d.id 
            LEFT JOIN agents a ON t.agent_id = a.id 
            ORDER BY t.date_creation DESC
          `;
        } else {
          // Demandeurs can only see tickets from their company
          const demandeur = await sql`
            SELECT societe FROM demandeurs WHERE email = ${decoded.sub}
          `;
          
          if (demandeur.length === 0) {
            return new Response(JSON.stringify({ detail: 'Utilisateur non trouvé' }), {
              status: 404,
              headers,
            });
          }

          ticketsQuery = await sql`
            SELECT t.*, c.nom_societe as client_nom, c.nom as client_nom_contact, c.prenom as client_prenom_contact,
                   d.nom as demandeur_nom, d.prenom as demandeur_prenom, d.societe as demandeur_societe,
                   a.nom as agent_nom, a.prenom as agent_prenom
            FROM tickets t 
            JOIN clients c ON t.client_id = c.id 
            JOIN demandeurs d ON t.demandeur_id = d.id 
            LEFT JOIN agents a ON t.agent_id = a.id 
            WHERE d.societe = ${demandeur[0].societe}
            ORDER BY t.date_creation DESC
          `;
        }

        return new Response(JSON.stringify(ticketsQuery), { status: 200, headers });

      case 'POST':
        // Only demandeurs can create tickets
        if (decoded.type !== 'demandeur') {
          return new Response(JSON.stringify({ detail: 'Seuls les demandeurs peuvent créer des tickets' }), {
            status: 403,
            headers,
          });
        }

        const newTicket = await req.json();
        const { titre, client_id, status = 'nouveau', date_fin_prevue, requete_initiale } = newTicket;
        
        if (!titre || !client_id || !requete_initiale) {
          return new Response(JSON.stringify({ detail: 'Titre, client et requête initiale sont requis' }), {
            status: 400,
            headers,
          });
        }

        // Get demandeur ID from email
        const demandeur = await sql`
          SELECT id FROM demandeurs WHERE email = ${decoded.sub}
        `;

        if (demandeur.length === 0) {
          return new Response(JSON.stringify({ detail: 'Demandeur non trouvé' }), {
            status: 404,
            headers,
          });
        }

        const createdTicket = await sql`
          INSERT INTO tickets (id, titre, client_id, demandeur_id, status, date_fin_prevue, requete_initiale)
          VALUES (${uuidv4()}, ${titre}, ${client_id}, ${demandeur[0].id}, ${status}, ${date_fin_prevue}, ${requete_initiale})
          RETURNING *
        `;
        return new Response(JSON.stringify(createdTicket[0]), { status: 201, headers });

      case 'PUT':
        const updateData = await req.json();
        const { titre: upd_titre, status: upd_status, agent_id, date_fin_prevue: upd_date_fin, date_cloture } = updateData;
        
        const updatedTicket = await sql`
          UPDATE tickets 
          SET titre = ${upd_titre}, status = ${upd_status}, agent_id = ${agent_id}, 
              date_fin_prevue = ${upd_date_fin}, date_cloture = ${date_cloture}
          WHERE id = ${ticketId}
          RETURNING *
        `;
        
        if (updatedTicket.length === 0) {
          return new Response(JSON.stringify({ detail: 'Ticket non trouvé' }), {
            status: 404,
            headers,
          });
        }
        return new Response(JSON.stringify(updatedTicket[0]), { status: 200, headers });

      case 'DELETE':
        const deletedTicket = await sql`
          DELETE FROM tickets WHERE id = ${ticketId} RETURNING id
        `;
        
        if (deletedTicket.length === 0) {
          return new Response(JSON.stringify({ detail: 'Ticket non trouvé' }), {
            status: 404,
            headers,
          });
        }
        return new Response(JSON.stringify({ message: 'Ticket supprimé avec succès' }), {
          status: 200,
          headers,
        });

      default:
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          status: 405,
          headers,
        });
    }
  } catch (error) {
    console.error('Tickets API error:', error);
    if (error.name === 'JsonWebTokenError') {
      return new Response(JSON.stringify({ detail: 'Token invalide' }), {
        status: 401,
        headers,
      });
    }
    return new Response(JSON.stringify({ detail: 'Erreur serveur' }), {
      status: 500,
      headers,
    });
  }
};