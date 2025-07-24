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
    const demandeurId = pathParts[pathParts.length - 1];

    switch (req.method) {
      case 'GET':
        const demandeurs = await sql`
          SELECT id, email, nom, prenom, societe, telephone, 'demandeur' as type_utilisateur 
          FROM demandeurs 
          ORDER BY nom, prenom
        `;
        return new Response(JSON.stringify(demandeurs), { status: 200, headers });

      case 'POST':
        const newDemandeur = await req.json();
        const { nom, prenom, societe, telephone, email, password } = newDemandeur;
        
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
        
        const createdDemandeur = await sql`
          INSERT INTO demandeurs (id, nom, prenom, societe, telephone, email, password)
          VALUES (${uuidv4()}, ${nom}, ${prenom}, ${societe}, ${telephone}, ${email}, ${hashedPassword})
          RETURNING id, email, nom, prenom, societe, telephone, 'demandeur' as type_utilisateur
        `;
        return new Response(JSON.stringify(createdDemandeur[0]), { status: 201, headers });

      case 'PUT':
        const updateData = await req.json();
        const { nom: upd_nom, prenom: upd_prenom, societe: upd_societe, telephone: upd_telephone, email: upd_email, password: upd_password } = updateData;
        
        const hashedNewPassword = await bcrypt.hash(upd_password, 10);
        
        const updatedDemandeur = await sql`
          UPDATE demandeurs 
          SET nom = ${upd_nom}, prenom = ${upd_prenom}, societe = ${upd_societe}, 
              telephone = ${upd_telephone}, email = ${upd_email}, password = ${hashedNewPassword}
          WHERE id = ${demandeurId}
          RETURNING id, email, nom, prenom, societe, telephone, 'demandeur' as type_utilisateur
        `;
        
        if (updatedDemandeur.length === 0) {
          return new Response(JSON.stringify({ detail: 'Demandeur non trouvé' }), {
            status: 404,
            headers,
          });
        }
        return new Response(JSON.stringify(updatedDemandeur[0]), { status: 200, headers });

      case 'DELETE':
        const deletedDemandeur = await sql`
          DELETE FROM demandeurs WHERE id = ${demandeurId} RETURNING id
        `;
        
        if (deletedDemandeur.length === 0) {
          return new Response(JSON.stringify({ detail: 'Demandeur non trouvé' }), {
            status: 404,
            headers,
          });
        }
        return new Response(JSON.stringify({ message: 'Demandeur supprimé avec succès' }), {
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
    console.error('Demandeurs API error:', error);
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