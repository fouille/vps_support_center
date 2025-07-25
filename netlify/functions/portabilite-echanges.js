const { neon } = require('@netlify/neon');
const jwt = require('jsonwebtoken');
const emailService = require('./email-service');

// Configuration JWT
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

// Fonction pour vérifier le token JWT
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

exports.handler = async (event, context) => {
  // Configuration CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
  };

  // Gestion des requêtes OPTIONS (pré-vol CORS)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers
    };
  }

  try {
    // Vérification du token JWT
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Token manquant' })
      };
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Token invalide' })
      };
    }

    // Initialisation du client Neon
    const client = neon(process.env.NEON_DB_URL || process.env.DATABASE_URL);

    const method = event.httpMethod;
    const { queryStringParameters } = event;

    if (method === 'GET') {
      // Récupération des commentaires d'une portabilité
      const portabiliteId = queryStringParameters?.portabiliteId;
      
      if (!portabiliteId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'ID de portabilité requis' })
        };
      }

      // Vérification que l'utilisateur peut accéder à cette portabilité
      const accessQuery = `
        SELECT 1 FROM portabilites 
        WHERE id = $1 AND (
          demandeur_id = $2 OR 
          agent_id = $2 OR 
          $3 = 'agent'
        )
      `;
      
      const accessResult = await client(accessQuery, [
        portabiliteId, 
        decoded.id, 
        decoded.type
      ]);

      if (accessResult.length === 0) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Accès interdit à cette portabilité' })
        };
      }

      // Récupération des commentaires
      const commentsQuery = `
        SELECT 
          pe.*,
          CASE 
            WHEN pe.auteur_type = 'agent' THEN a.nom || ' ' || a.prenom
            WHEN pe.auteur_type = 'demandeur' THEN d.nom || ' ' || d.prenom
            ELSE 'Utilisateur inconnu'
          END as auteur_nom
        FROM portabilite_echanges pe
        LEFT JOIN agents a ON pe.auteur_id = a.id AND pe.auteur_type = 'agent'
        LEFT JOIN demandeurs d ON pe.auteur_id = d.id AND pe.auteur_type = 'demandeur'
        WHERE pe.portabilite_id = $1
        ORDER BY pe.created_at ASC
      `;

      const result = await client(commentsQuery, [portabiliteId]);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result)
      };

    } else if (method === 'POST') {
      // Ajout d'un nouveau commentaire
      const body = JSON.parse(event.body);
      const { portabiliteId, message } = body;

      if (!portabiliteId || !message || message.trim() === '') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'ID de portabilité et message requis' })
        };
      }

      // Vérification que l'utilisateur peut commenter cette portabilité
      const accessQuery = `
        SELECT 
          p.*,
          c.nom_societe,
          c.nom as client_nom,
          c.prenom as client_prenom,
          d.nom as demandeur_nom,
          d.prenom as demandeur_prenom,
          d.email as demandeur_email,
          a.nom as agent_nom,
          a.prenom as agent_prenom,
          a.email as agent_email
        FROM portabilites p
        LEFT JOIN clients c ON p.client_id = c.id
        LEFT JOIN demandeurs d ON p.demandeur_id = d.id
        LEFT JOIN agents a ON p.agent_id = a.id
        WHERE p.id = $1 AND (
          p.demandeur_id = $2 OR 
          p.agent_id = $2 OR 
          $3 = 'agent'
        )
      `;

      const accessResult = await client(accessQuery, [
        portabiliteId, 
        decoded.id, 
        decoded.type
      ]);

      if (accessResult.length === 0) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Accès interdit à cette portabilité' })
        };
      }

      const portabiliteInfo = accessResult[0];

      // Insertion du commentaire
      const insertQuery = `
        INSERT INTO portabilite_echanges (portabilite_id, auteur_id, auteur_type, message)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;

      const result = await client(insertQuery, [
        portabiliteId,
        decoded.id,
        decoded.type,
        message.trim()
      ]);

      const newComment = result[0];

      // Récupération des informations complètes du commentaire
      const commentDetailQuery = `
        SELECT 
          pe.*,
          CASE 
            WHEN pe.auteur_type = 'agent' THEN a.nom || ' ' || a.prenom
            WHEN pe.auteur_type = 'demandeur' THEN d.nom || ' ' || d.prenom
            ELSE 'Utilisateur inconnu'
          END as auteur_nom
        FROM portabilite_echanges pe
        LEFT JOIN agents a ON pe.auteur_id = a.id AND pe.auteur_type = 'agent'
        LEFT JOIN demandeurs d ON pe.auteur_id = d.id AND pe.auteur_type = 'demandeur'
        WHERE pe.id = $1
      `;

      const commentDetailResult = await client(commentDetailQuery, [newComment.id]);
      const commentDetail = commentDetailResult[0];

      // Envoi d'email de notification
      try {
        await emailService.sendPortabiliteCommentEmail(
          portabiliteInfo,
          commentDetail,
          decoded.type
        );
      } catch (emailError) {
        console.error('Erreur envoi email commentaire:', emailError);
        // Ne pas faire échouer l'ajout du commentaire pour un problème d'email
      }

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(commentDetail)
      };

    } else if (method === 'DELETE') {
      // Suppression d'un commentaire (agents uniquement)
      if (decoded.type !== 'agent') {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Accès interdit' })
        };
      }

      const body = JSON.parse(event.body);
      const { commentId } = body;

      if (!commentId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'ID du commentaire requis' })
        };
      }

      const deleteQuery = `
        DELETE FROM portabilite_echanges 
        WHERE id = $1 
        RETURNING *
      `;

      const result = await client(deleteQuery, [commentId]);

      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Commentaire non trouvé' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Commentaire supprimé avec succès' })
      };

    } else {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Méthode non autorisée' })
      };
    }

  } catch (error) {
    console.error('Erreur:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erreur interne du serveur' })
    };
  }
};