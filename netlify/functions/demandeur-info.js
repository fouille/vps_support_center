const { neon } = require('@netlify/neon');
const jwt = require('jsonwebtoken');

const sql = neon();

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json',
};

// Fonction pour vérifier et décoder le JWT
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key');
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
};

exports.handler = async (event, context) => {
  console.log('Demandeur-info function called:', event.httpMethod);
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Vérification de l'authentification
  const authHeader = event.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ detail: 'Token manquant' })
    };
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ detail: 'Token invalide' })
    };
  }

  try {
    // Extraire l'ID du demandeur de l'URL
    const urlParts = event.path.split('/');
    const demandeurId = urlParts[urlParts.length - 1];

    if (!demandeurId || demandeurId === 'demandeur-info') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ detail: 'ID du demandeur manquant' })
      };
    }

    // Vérifier les permissions : agents peuvent accéder à tout, demandeurs seulement à leurs propres infos ou leur société
    const userType = decoded.type_utilisateur;
    
    if (userType === 'demandeur') {
      // Pour les demandeurs, vérifier qu'ils accèdent soit à leurs propres infos soit à un demandeur de leur société
      const userSociety = await sql`
        SELECT societe_id FROM demandeurs WHERE id = ${decoded.id}
      `;
      
      const targetDemandeur = await sql`
        SELECT societe_id FROM demandeurs WHERE id = ${demandeurId}
      `;
      
      if (targetDemandeur.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ detail: 'Demandeur non trouvé' })
        };
      }
      
      // Vérifier que le demandeur cible appartient à la même société
      if (userSociety[0]?.societe_id !== targetDemandeur[0]?.societe_id) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ detail: 'Accès non autorisé' })
        };
      }
    }

    // Récupérer les informations complètes du demandeur avec sa société
    const demandeurInfo = await sql`
      SELECT 
        d.id,
        d.nom,
        d.prenom,
        d.email,
        d.telephone,
        d.societe_id,
        ds.nom_societe,
        ds.siret,
        ds.adresse as societe_adresse,
        ds.code_postal as societe_code_postal,
        ds.ville as societe_ville,
        ds.telephone as societe_telephone,
        ds.email as societe_email,
        ds.site_web as societe_site_web
      FROM demandeurs d
      LEFT JOIN demandeurs_societe ds ON d.societe_id = ds.id
      WHERE d.id = ${demandeurId}
    `;

    if (demandeurInfo.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ detail: 'Demandeur non trouvé' })
      };
    }

    const demandeur = demandeurInfo[0];
    
    // Restructurer les données pour correspondre au format attendu
    const result = {
      id: demandeur.id,
      nom: demandeur.nom,
      prenom: demandeur.prenom,
      email: demandeur.email,
      telephone: demandeur.telephone,
      societe_id: demandeur.societe_id,
      societe: demandeur.societe_id ? {
        id: demandeur.societe_id,
        nom_societe: demandeur.nom_societe,
        siret: demandeur.siret,
        adresse: demandeur.societe_adresse,
        code_postal: demandeur.societe_code_postal,
        ville: demandeur.societe_ville,
        telephone: demandeur.societe_telephone,
        email: demandeur.societe_email,
        site_web: demandeur.societe_site_web
      } : null
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('Demandeur-info error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ detail: 'Erreur serveur: ' + error.message })
    };
  }
};