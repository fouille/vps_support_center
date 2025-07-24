import { neon } from '@netlify/neon';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
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
    const agentId = pathParts[pathParts.length - 1];

    switch (req.method) {
      case 'GET':
        const agents = await sql`
          SELECT id, email, nom, prenom, societe, NULL as telephone, 'agent' as type_utilisateur 
          FROM agents 
          ORDER BY nom, prenom
        `;
        return new Response(JSON.stringify(agents), { status: 200, headers });

      case 'POST':
        const newAgent = await req.json();
        const { nom, prenom, societe, email, password } = newAgent;
        
        if (!nom || !prenom || !societe || !email || !password) {
          return new Response(JSON.stringify({ detail: 'Tous les champs obligatoires doivent être remplis' }), {
            status: 400,
            headers,
          });
        }

        // Check if email already exists
        const existingUser = await sql`
          SELECT email FROM demandeurs WHERE email = ${email}
          UNION
          SELECT email FROM agents WHERE email = ${email}
        `;
        
        if (existingUser.length > 0) {
          return new Response(JSON.stringify({ detail: 'Cet email est déjà utilisé' }), {
            status: 400,
            headers,
          });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const createdAgent = await sql`
          INSERT INTO agents (id, nom, prenom, societe, email, password)
          VALUES (${uuidv4()}, ${nom}, ${prenom}, ${societe}, ${email}, ${hashedPassword})
          RETURNING id, email, nom, prenom, societe, NULL as telephone, 'agent' as type_utilisateur
        `;
        return new Response(JSON.stringify(createdAgent[0]), { status: 201, headers });

      case 'PUT':
        const updateData = await req.json();
        const { nom: upd_nom, prenom: upd_prenom, societe: upd_societe, email: upd_email, password: upd_password } = updateData;
        
        const hashedNewPassword = await bcrypt.hash(upd_password, 10);
        
        const updatedAgent = await sql`
          UPDATE agents 
          SET nom = ${upd_nom}, prenom = ${upd_prenom}, societe = ${upd_societe}, 
              email = ${upd_email}, password = ${hashedNewPassword}
          WHERE id = ${agentId}
          RETURNING id, email, nom, prenom, societe, NULL as telephone, 'agent' as type_utilisateur
        `;
        
        if (updatedAgent.length === 0) {
          return new Response(JSON.stringify({ detail: 'Agent non trouvé' }), {
            status: 404,
            headers,
          });
        }
        return new Response(JSON.stringify(updatedAgent[0]), { status: 200, headers });

      case 'DELETE':
        const deletedAgent = await sql`
          DELETE FROM agents WHERE id = ${agentId} RETURNING id
        `;
        
        if (deletedAgent.length === 0) {
          return new Response(JSON.stringify({ detail: 'Agent non trouvé' }), {
            status: 404,
            headers,
          });
        }
        return new Response(JSON.stringify({ message: 'Agent supprimé avec succès' }), {
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
    console.error('Agents API error:', error);
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