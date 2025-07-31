const { neon } = require('@netlify/neon');

const sql = neon(); // automatically uses env NETLIFY_DATABASE_URL

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

exports.handler = async (event, context) => {
  console.log('Get logo by domain function called:', event.httpMethod, event.path);
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  // Cette API est publique (pas d'authentification requise)
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const queryParams = event.queryStringParameters || {};
    const domaine = queryParams.domaine;

    if (!domaine) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ detail: 'Le paramètre domaine est requis' })
      };
    }

    console.log('Searching logo for domain:', domaine);

    // Chercher le logo pour ce domaine
    const result = await sql`
      SELECT logo_base64, nom_societe 
      FROM demandeurs_societe 
      WHERE domaine = ${domaine} AND logo_base64 IS NOT NULL
    `;

    if (result.length === 0) {
      console.log('No logo found for domain:', domaine);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ detail: 'Aucun logo trouvé pour ce domaine' })
      };
    }

    console.log('Logo found for domain:', domaine, 'company:', result[0].nom_societe);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        logo_base64: result[0].logo_base64,
        nom_societe: result[0].nom_societe
      })
    };

  } catch (error) {
    console.error('Get logo by domain API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ detail: 'Erreur serveur: ' + error.message })
    };
  }
};