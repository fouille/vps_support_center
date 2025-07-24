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
    verifyToken(authHeader);

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const clientId = pathParts[pathParts.length - 1];

    switch (req.method) {
      case 'GET':
        const clients = await sql`
          SELECT * FROM clients 
          ORDER BY nom_societe, nom, prenom
        `;
        return new Response(JSON.stringify(clients), { status: 200, headers });

      case 'POST':
        const newClient = await req.json();
        const { nom_societe, adresse, nom, prenom } = newClient;
        
        if (!nom_societe || !adresse || !nom || !prenom) {
          return new Response(JSON.stringify({ detail: 'Tous les champs sont requis' }), {
            status: 400,
            headers,
          });
        }

        const createdClient = await sql`
          INSERT INTO clients (id, nom_societe, adresse, nom, prenom)
          VALUES (${uuidv4()}, ${nom_societe}, ${adresse}, ${nom}, ${prenom})
          RETURNING *
        `;
        return new Response(JSON.stringify(createdClient[0]), { status: 201, headers });

      case 'PUT':
        const updateData = await req.json();
        const { nom_societe: upd_societe, adresse: upd_adresse, nom: upd_nom, prenom: upd_prenom } = updateData;
        
        const updatedClient = await sql`
          UPDATE clients 
          SET nom_societe = ${upd_societe}, adresse = ${upd_adresse}, nom = ${upd_nom}, prenom = ${upd_prenom}
          WHERE id = ${clientId}
          RETURNING *
        `;
        
        if (updatedClient.length === 0) {
          return new Response(JSON.stringify({ detail: 'Client non trouvé' }), {
            status: 404,
            headers,
          });
        }
        return new Response(JSON.stringify(updatedClient[0]), { status: 200, headers });

      case 'DELETE':
        const deletedClient = await sql`
          DELETE FROM clients WHERE id = ${clientId} RETURNING id
        `;
        
        if (deletedClient.length === 0) {
          return new Response(JSON.stringify({ detail: 'Client non trouvé' }), {
            status: 404,
            headers,
          });
        }
        return new Response(JSON.stringify({ message: 'Client supprimé avec succès' }), {
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
    console.error('Clients API error:', error);
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