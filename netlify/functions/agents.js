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

const verifyToken = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Token manquant');
  }
  
  const token = authHeader.substring(7);
  return jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key');
};

exports.handler = async (event, context) => {
  console.log('Agents function called:', event.httpMethod, event.path);
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  try {
    // Verify authentication
    const authHeader = event.headers.authorization || event.headers.Authorization;
    verifyToken(authHeader);

    const pathParts = event.path.split('/');
    const agentId = pathParts[pathParts.length - 1];

    switch (event.httpMethod) {
      case 'GET':
        console.log('Getting agents...');
        const agents = await sql`
          SELECT id, email, nom, prenom, societe, NULL as telephone, 'agent' as type_utilisateur 
          FROM agents 
          ORDER BY nom, prenom
        `;
        console.log('Agents found:', agents.length);
        return { statusCode: 200, headers, body: JSON.stringify(agents) };

      case 'POST':
        console.log('Creating agent...');
        const newAgent = JSON.parse(event.body);
        const { nom, prenom, societe, email, password } = newAgent;
        
        if (!nom || !prenom || !societe || !email || !password) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ detail: 'Tous les champs obligatoires doivent être remplis' })
          };
        }

        // Check if email already exists
        const existingUser = await sql`
          SELECT email FROM demandeurs WHERE email = ${email}
          UNION
          SELECT email FROM agents WHERE email = ${email}
        `;
        
        if (existingUser.length > 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ detail: 'Cet email est déjà utilisé' })
          };
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const createdAgent = await sql`
          INSERT INTO agents (id, nom, prenom, societe, email, password)
          VALUES (${uuidv4()}, ${nom}, ${prenom}, ${societe}, ${email}, ${hashedPassword})
          RETURNING id, email, nom, prenom, societe
        `;
        
        const responseAgent = {
          ...createdAgent[0],
          telephone: null,
          type_utilisateur: 'agent'
        };
        
        console.log('Agent created:', responseAgent);
        return { statusCode: 201, headers, body: JSON.stringify(responseAgent) };

      case 'PUT':
        const updateData = JSON.parse(event.body);
        const { nom: upd_nom, prenom: upd_prenom, societe: upd_societe, email: upd_email, password: upd_password } = updateData;
        
        let updatedAgent;
        
        if (upd_password && upd_password.trim()) {
          // Si un mot de passe est fourni, le hasher et mettre à jour tous les champs
          const hashedNewPassword = await bcrypt.hash(upd_password, 10);
          
          updatedAgent = await sql`
            UPDATE agents 
            SET nom = ${upd_nom}, prenom = ${upd_prenom}, societe = ${upd_societe}, 
                email = ${upd_email}, password = ${hashedNewPassword}
            WHERE id = ${agentId}
            RETURNING id, email, nom, prenom, societe
          `;
        } else {
          // Si pas de mot de passe, mettre à jour seulement les autres champs
          updatedAgent = await sql`
            UPDATE agents 
            SET nom = ${upd_nom}, prenom = ${upd_prenom}, societe = ${upd_societe}, 
                email = ${upd_email}
            WHERE id = ${agentId}
            RETURNING id, email, nom, prenom, societe
          `;
        }
        
        if (updatedAgent.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ detail: 'Agent non trouvé' })
          };
        }
        
        const responseUpdatedAgent = {
          ...updatedAgent[0],
          telephone: null,
          type_utilisateur: 'agent'
        };
        
        return { statusCode: 200, headers, body: JSON.stringify(responseUpdatedAgent) };

      case 'DELETE':
        const deletedAgent = await sql`DELETE FROM agents WHERE id = ${agentId} RETURNING id`;
        
        if (deletedAgent.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ detail: 'Agent non trouvé' })
          };
        }
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: 'Agent supprimé avec succès' })
        };

      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
  } catch (error) {
    console.error('Agents API error:', error);
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