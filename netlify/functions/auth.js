const { neon } = require('@netlify/neon');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const sql = neon(); // automatically uses env NETLIFY_DATABASE_URL

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json',
};

exports.handler = async (event, context) => {
  console.log('Auth function called:', event.httpMethod);
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { email, password } = JSON.parse(event.body);

    if (!email || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ detail: 'Email et mot de passe requis' })
      };
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
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ detail: 'Email ou mot de passe incorrect' })
      };
    }

    const userData = user[0];
    const isValidPassword = await bcrypt.compare(password, userData.password);

    if (!isValidPassword) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ detail: 'Email ou mot de passe incorrect' })
      };
    }

    // Create JWT token
    const token = jwt.sign(
      { 
        sub: userData.email, 
        id: userData.id,
        type_utilisateur: userData.type_utilisateur 
      },
      process.env.JWT_SECRET || 'dev-secret-key',
      { expiresIn: '24h' }
    );

    // Remove password from response
    const { password: _, ...userResponse } = userData;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        access_token: token,
        token_type: 'bearer',
        user: userResponse
      })
    };

  } catch (error) {
    console.error('Auth error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ detail: 'Erreur serveur: ' + error.message })
    };
  }
};