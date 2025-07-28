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
    const sql = neon(process.env.NEON_DB_URL || process.env.DATABASE_URL);

    const method = event.httpMethod;
    const { queryStringParameters } = event;

    if (method === 'GET') {
      // Récupération des fichiers d'une portabilité
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
      
      const accessResult = await sql(accessQuery, [
        portabiliteId, 
        decoded.id, 
        decoded.type_utilisateur || decoded.type
      ]);

      if (accessResult.length === 0) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Accès interdit à cette portabilité' })
        };
      }

      const portabiliteInfo = accessResult[0];

      // Récupération des fichiers avec les informations de l'utilisateur
      const filesQuery = `
        SELECT 
          pf.id,
          pf.nom_fichier,
          pf.type_fichier,
          pf.taille_fichier,
          pf.uploaded_by,
          pf.uploaded_at,
          COALESCE(a.nom || ' ' || a.prenom, d.nom || ' ' || d.prenom, 'Utilisateur') as uploaded_by_name,
          CASE 
            WHEN a.id IS NOT NULL THEN 'agent'
            WHEN d.id IS NOT NULL THEN 'demandeur'
            ELSE 'unknown'
          END as uploaded_by_type
        FROM portabilite_fichiers pf
        LEFT JOIN agents a ON pf.uploaded_by = a.id
        LEFT JOIN demandeurs d ON pf.uploaded_by = d.id
        WHERE pf.portabilite_id = $1
        ORDER BY pf.uploaded_at DESC
      `;

      const result = await sql(filesQuery, [portabiliteId]);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result)
      };

    } else if (method === 'POST') {
      // Upload d'un nouveau fichier
      const body = JSON.parse(event.body);
      const { portabiliteId, nom_fichier, type_fichier, taille_fichier, contenu_base64 } = body;

      if (!portabiliteId || !nom_fichier || !contenu_base64) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Données de fichier requises' })
        };
      }

      // Vérification que l'utilisateur peut uploader sur cette portabilité
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

      const accessResult = await sql(accessQuery, [
        portabiliteId, 
        decoded.id, 
        decoded.type_utilisateur || decoded.type
      ]);

      if (accessResult.length === 0) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Accès interdit à cette portabilité' })
        };
      }

      const portabiliteInfo = accessResult[0];

      // Insertion du fichier
      const insertQuery = `
        INSERT INTO portabilite_fichiers (portabilite_id, nom_fichier, type_fichier, taille_fichier, contenu_base64, uploaded_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, nom_fichier, type_fichier, taille_fichier, uploaded_by, uploaded_at
      `;

      const result = await sql(insertQuery, [
        portabiliteId,
        nom_fichier,
        type_fichier,
        taille_fichier,
        contenu_base64,
        decoded.id
      ]);

      const newFile = result[0];

      // Ajouter un commentaire automatique pour signaler l'upload
      const commentQuery = `
        INSERT INTO portabilite_echanges (portabilite_id, auteur_id, auteur_type, message)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;

      const commentResult = await sql(commentQuery, [
        portabiliteId,
        decoded.id,
        decoded.type_utilisateur || decoded.type,
        `📎 Fichier ajouté: ${nom_fichier}`
      ]);

      const newComment = commentResult[0];

      // Récupération des informations complètes du commentaire pour l'email
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

      const commentDetailResult = await sql(commentDetailQuery, [newComment.id]);
      const commentDetail = commentDetailResult[0];

      // Envoi d'email de notification pour l'ajout de fichier
      try {
        await emailService.sendPortabiliteCommentEmail(
          portabiliteInfo,
          commentDetail,
          decoded.type_utilisateur || decoded.type
        );
      } catch (emailError) {
        console.error('Erreur envoi email fichier:', emailError);
        // Ne pas faire échouer l'upload pour un problème d'email
      }

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(newFile)
      };

    } else if (method === 'DELETE') {
      // Suppression d'un fichier
      const fileId = queryStringParameters?.fileId;

      if (!fileId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'ID du fichier requis' })
        };
      }

      // Vérification des droits - les agents et demandeurs peuvent supprimer des fichiers
      const userType = decoded.type_utilisateur || decoded.type;
      if (userType !== 'agent' && userType !== 'demandeur') {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Accès non autorisé' })
        };
      }

      const deleteQuery = `
        DELETE FROM portabilite_fichiers 
        WHERE id = $1 
        RETURNING nom_fichier, portabilite_id
      `;

      const result = await sql(deleteQuery, [fileId]);

      if (result.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Fichier non trouvé' })
        };
      }

      const deletedFile = result[0];

      // Ajouter un commentaire automatique pour signaler la suppression
      const commentQuery = `
        INSERT INTO portabilite_echanges (portabilite_id, auteur_id, auteur_type, message)
        VALUES ($1, $2, $3, $4)
      `;

      await sql(commentQuery, [
        deletedFile.portabilite_id,
        decoded.id,
        decoded.type_utilisateur || decoded.type,
        `🗑️ Fichier supprimé: ${deletedFile.nom_fichier}`
      ]);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Fichier supprimé avec succès' })
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