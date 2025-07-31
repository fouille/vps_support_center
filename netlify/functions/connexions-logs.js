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

// Fonction pour obtenir l'IP réelle du client
const getClientIP = (event) => {
  let ip = event.headers['x-forwarded-for'] || 
           event.headers['x-real-ip'] || 
           event.requestContext?.identity?.sourceIp ||
           'unknown';
  
  // Si x-forwarded-for contient plusieurs IPs séparées par des virgules,
  // prendre seulement la première (la plus proche du client)
  if (ip && ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }
  
  // Validation basique de l'IP pour éviter les erreurs de type INET
  if (ip && ip !== 'unknown') {
    // Vérifier si c'est une IPv4 ou IPv6 valide (regex simple)
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,7}:$|^([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}$|^([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}$|^([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}$|^([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})$|^:((:[0-9a-fA-F]{1,4}){1,7}|:)$/;
    
    if (!ipv4Regex.test(ip) && !ipv6Regex.test(ip)) {
      console.warn('Invalid IP format detected:', ip);
      return 'unknown';
    }
  }
  
  return ip;
};

exports.handler = async (event, context) => {
  console.log('Connexions-logs function called:', event.httpMethod);
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  // Vérification de l'authentification pour toutes les requêtes
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
    // POST - Créer un log de connexion
    if (event.httpMethod === 'POST') {
      const { user_id, user_type, user_email, user_nom, user_prenom, action_type } = JSON.parse(event.body);
      
      // Validation des données requises
      if (!user_id || !user_type || !user_email || !action_type) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ detail: 'Données manquantes (user_id, user_type, user_email, action_type requis)' })
        };
      }

      if (!['agent', 'demandeur'].includes(user_type)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ detail: 'user_type doit être "agent" ou "demandeur"' })
        };
      }

      if (!['login', 'logout'].includes(action_type)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ detail: 'action_type doit être "login" ou "logout"' })
        };
      }

      // Obtenir des informations sur la requête
      const ip_address = getClientIP(event);
      const user_agent = event.headers['user-agent'] || 'unknown';

      // Insérer le log
      const result = await sql`
        INSERT INTO connexions_logs (
          user_id, user_type, user_email, user_nom, user_prenom, 
          action_type, ip_address, user_agent, created_at
        )
        VALUES (
          ${user_id}, ${user_type}, ${user_email}, ${user_nom}, ${user_prenom},
          ${action_type}, ${ip_address}, ${user_agent}, NOW()
        )
        RETURNING id, created_at
      `;

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          success: true,
          log_id: result[0].id,
          created_at: result[0].created_at
        })
      };
    }

    // GET - Récupérer les logs (agents uniquement)
    else if (event.httpMethod === 'GET') {
      // Vérification que l'utilisateur est un agent
      if (decoded.type_utilisateur !== 'agent') {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ detail: 'Accès réservé aux agents' })
        };
      }

      // Paramètres de pagination
      const urlParams = new URLSearchParams(event.queryStringParameters || {});
      const limit = parseInt(urlParams.get('limit')) || 10;
      const offset = parseInt(urlParams.get('offset')) || 0;

      // Récupérer les logs avec pagination
      const logs = await sql`
        SELECT 
          id,
          user_id,
          user_type,
          user_email,
          user_nom,
          user_prenom,
          action_type,
          ip_address,
          created_at,
          EXTRACT(EPOCH FROM created_at) * 1000 as timestamp_ms
        FROM connexions_logs
        ORDER BY created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      // Compter le total pour la pagination
      const totalCount = await sql`
        SELECT COUNT(*) as total FROM connexions_logs
      `;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          logs: logs,
          total: parseInt(totalCount[0].total),
          limit: limit,
          offset: offset,
          has_more: totalCount[0].total > (offset + limit)
        })
      };
    }

    else {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

  } catch (error) {
    console.error('Connexions-logs error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ detail: 'Erreur serveur: ' + error.message })
    };
  }
};