import { neon } from '@netlify/neon';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const sql = neon();

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json',
};

export default async (req, context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers,
    });
  }

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ detail: 'Email et mot de passe requis' }), {
        status: 400,
        headers,
      });
    }

    // Check in demandeurs table first
    let user = await sql`
      SELECT id, email, password, nom, prenom, societe, telephone, 'demandeur' as type_utilisateur 
      FROM demandeurs 
      WHERE email = ${email}
    `;

    // If not found in demandeurs, check in agents table
    if (user.length === 0) {
      user = await sql`
        SELECT id, email, password, nom, prenom, societe, NULL as telephone, 'agent' as type_utilisateur 
        FROM agents 
        WHERE email = ${email}
      `;
    }

    if (user.length === 0) {
      return new Response(JSON.stringify({ detail: 'Email ou mot de passe incorrect' }), {
        status: 401,
        headers,
      });
    }

    const userData = user[0];
    const isValidPassword = await bcrypt.compare(password, userData.password);

    if (!isValidPassword) {
      return new Response(JSON.stringify({ detail: 'Email ou mot de passe incorrect' }), {
        status: 401,
        headers,
      });
    }

    // Create JWT token
    const token = jwt.sign(
      { sub: userData.email, type: userData.type_utilisateur },
      process.env.JWT_SECRET || 'your-secret-key-here',
      { expiresIn: '24h' }
    );

    // Remove password from response
    const { password: _, ...userResponse } = userData;

    return new Response(JSON.stringify({
      access_token: token,
      token_type: 'bearer',
      user: userResponse
    }), {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error('Auth error:', error);
    return new Response(JSON.stringify({ detail: 'Erreur serveur' }), {
      status: 500,
      headers,
    });
  }
};