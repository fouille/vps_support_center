const { neon } = require('@netlify/neon');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const sql = neon();

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Content-Type': 'application/json',
};

const verifyToken = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Token manquant');
  }
  
  const token = authHeader.substring(7);
  return jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key');
};

// Fonction pour convertir un fichier en base64
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
  });
};

exports.handler = async (event, context) => {
  console.log('Ticket-fichiers function called:', event.httpMethod, event.queryStringParameters);
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  try {
    // Verify authentication
    const authHeader = event.headers.authorization || event.headers.Authorization;
    const decoded = verifyToken(authHeader);

    const ticketId = event.queryStringParameters?.ticketId;
    
    if (!ticketId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ detail: 'Paramètre ticketId manquant' })
      };
    }

    switch (event.httpMethod) {
      case 'GET':
        // Récupérer tous les fichiers d'un ticket
        console.log('Getting files for ticket:', ticketId);
        const fichiers = await sql`
          SELECT tf.*, 
                 CASE 
                   WHEN tf.uploaded_by IN (SELECT id FROM agents) THEN 'agent'
                   WHEN tf.uploaded_by IN (SELECT id FROM demandeurs) THEN 'demandeur'
                   ELSE 'unknown'
                 END as uploaded_by_type,
                 CASE 
                   WHEN tf.uploaded_by IN (SELECT id FROM agents) THEN (SELECT nom || ' ' || prenom FROM agents WHERE id = tf.uploaded_by)
                   WHEN tf.uploaded_by IN (SELECT id FROM demandeurs) THEN (SELECT nom || ' ' || prenom FROM demandeurs WHERE id = tf.uploaded_by)
                   ELSE 'Utilisateur inconnu'
                 END as uploaded_by_name
          FROM ticket_fichiers tf
          WHERE tf.ticket_id = ${ticketId}
          ORDER BY tf.uploaded_at DESC
        `;
        
        // Ne pas retourner le contenu base64 dans la liste pour économiser la bande passante
        const fichiersListe = fichiers.map(f => ({
          ...f,
          contenu_base64: undefined,
          has_content: !!f.contenu_base64
        }));
        
        console.log('Files found:', fichiersListe.length);
        return { statusCode: 200, headers, body: JSON.stringify(fichiersListe) };

      case 'POST':
        // Ajouter un nouveau fichier
        console.log('Adding file to ticket:', ticketId);
        const fileData = JSON.parse(event.body);
        const { nom_fichier, type_fichier, taille_fichier, contenu_base64 } = fileData;
        
        if (!nom_fichier || !contenu_base64) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ detail: 'Nom de fichier et contenu requis' })
          };
        }

        // Validation de la taille (limite à 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (taille_fichier && taille_fichier > maxSize) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ detail: 'Fichier trop volumineux (limite: 10MB)' })
          };
        }

        // Validation des types de fichiers
        const allowedTypes = [
          'image/jpeg', 'image/png', 'image/gif', 'image/webp',
          'application/pdf',
          'audio/wav', 'audio/wave', 'audio/x-wav',
          'text/plain', 'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        
        if (type_fichier && !allowedTypes.includes(type_fichier)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ detail: 'Type de fichier non autorisé' })
          };
        }

        // Get user ID based on token
        let uploadedBy;
        
        if ((decoded.type_utilisateur || decoded.type) === 'agent') {
          const agent = await sql`SELECT id FROM agents WHERE email = ${decoded.sub}`;
          if (agent.length === 0) {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ detail: 'Agent non trouvé' })
            };
          }
          uploadedBy = agent[0].id;
        } else if ((decoded.type_utilisateur || decoded.type) === 'demandeur') {
          const demandeur = await sql`SELECT id FROM demandeurs WHERE email = ${decoded.sub}`;
          if (demandeur.length === 0) {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ detail: 'Demandeur non trouvé' })
            };
          }
          uploadedBy = demandeur[0].id;
        } else {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ detail: 'Type d\'utilisateur non autorisé' })
          };
        }

        const createdFile = await sql`
          INSERT INTO ticket_fichiers (id, ticket_id, nom_fichier, type_fichier, taille_fichier, contenu_base64, uploaded_by)
          VALUES (${uuidv4()}, ${ticketId}, ${nom_fichier}, ${type_fichier}, ${taille_fichier}, ${contenu_base64}, ${uploadedBy})
          RETURNING *
        `;
        
        console.log('File created:', createdFile[0].nom_fichier);
        return { statusCode: 201, headers, body: JSON.stringify(createdFile[0]) };

      case 'DELETE':
        // Supprimer un fichier
        const fileId = event.queryStringParameters?.fileId;
        if (!fileId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ detail: 'Paramètre fileId manquant' })
          };
        }

        // Vérifier que l'utilisateur peut supprimer ce fichier
        let canDelete = false;
        if ((decoded.type_utilisateur || decoded.type) === 'agent') {
          // Les agents peuvent supprimer tous les fichiers
          canDelete = true;
        } else if ((decoded.type_utilisateur || decoded.type) === 'demandeur') {
          // Les demandeurs ne peuvent supprimer que leurs propres fichiers
          const demandeur = await sql`SELECT id FROM demandeurs WHERE email = ${decoded.sub}`;
          if (demandeur.length > 0) {
            const file = await sql`SELECT * FROM ticket_fichiers WHERE id = ${fileId} AND uploaded_by = ${demandeur[0].id}`;
            canDelete = file.length > 0;
          }
        }

        if (!canDelete) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ detail: 'Non autorisé à supprimer ce fichier' })
          };
        }

        await sql`DELETE FROM ticket_fichiers WHERE id = ${fileId}`;
        
        return { statusCode: 200, headers, body: JSON.stringify({ message: 'Fichier supprimé' }) };

      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
  } catch (error) {
    console.error('Ticket-fichiers API error:', error);
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