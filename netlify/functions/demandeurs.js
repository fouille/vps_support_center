const { neon } = require('@netlify/neon');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const sql = neon(process.env.NETLIFY_DATABASE_URL);

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
  console.log('Demandeurs function called:', event.httpMethod, event.path);
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  try {
    // Verify authentication
    const authHeader = event.headers.authorization || event.headers.Authorization;
    verifyToken(authHeader);

    const pathParts = event.path.split('/');
    const demandeurId = pathParts[pathParts.length - 1];

    switch (event.httpMethod) {
      case 'GET':
        console.log('Getting demandeurs...');
        const demandeurs = await sql`
          SELECT id, email, nom, prenom, societe, telephone, 'demandeur' as type_utilisateur 
          FROM demandeurs 
          ORDER BY nom, prenom
        `;
        console.log('Demandeurs found:', demandeurs.length);
        return { statusCode: 200, headers, body: JSON.stringify(demandeurs) };

      case 'POST':
        console.log('Creating demandeur...');
        const newDemandeur = JSON.parse(event.body);
        const { nom, prenom, societe, telephone, email, password } = newDemandeur;
        
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
        
        const createdDemandeur = await sql`
          INSERT INTO demandeurs (id, nom, prenom, societe, telephone, email, password)
          VALUES (${uuidv4()}, ${nom}, ${prenom}, ${societe}, ${telephone}, ${email}, ${hashedPassword})
          RETURNING id, email, nom, prenom, societe, telephone
        `;
        
        const responseDemandeur = {
          ...createdDemandeur[0],
          type_utilisateur: 'demandeur'
        };
        
        console.log('Demandeur created:', responseDemandeur);
        return { statusCode: 201, headers, body: JSON.stringify(responseDemandeur) };

      case 'PUT':
        const updateData = JSON.parse(event.body);
        const { nom: upd_nom, prenom: upd_prenom, societe: upd_societe, telephone: upd_telephone, email: upd_email, password: upd_password } = updateData;
        
        const hashedNewPassword = await bcrypt.hash(upd_password, 10);
        
        const updatedDemandeur = await sql`
          UPDATE demandeurs 
          SET nom = ${upd_nom}, prenom = ${upd_prenom}, societe = ${upd_societe}, 
              telephone = ${upd_telephone}, email = ${upd_email}, password = ${hashedNewPassword}
          WHERE id = ${demandeurId}
          RETURNING id, email, nom, prenom, societe, telephone
        `;
        
        if (updatedDemandeur.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ detail: 'Demandeur non trouvé' })
          };
        }
        
        const responseUpdatedDemandeur = {
          ...updatedDemandeur[0],
          type_utilisateur: 'demandeur'
        };
        
        return { statusCode: 200, headers, body: JSON.stringify(responseUpdatedDemandeur) };

      case 'DELETE':
        const deletedDemandeur = await sql`DELETE FROM demandeurs WHERE id = ${demandeurId} RETURNING id`;
        
        if (deletedDemandeur.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ detail: 'Demandeur non trouvé' })
          };
        }
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: 'Demandeur supprimé avec succès' })
        };

      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
  } catch (error) {
    console.error('Demandeurs API error:', error);
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