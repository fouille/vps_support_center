const { neon } = require('@netlify/neon');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const sql = neon(); // automatically uses env NETLIFY_DATABASE_URL

// Import conditionnel du service email
const loadEmailService = () => {
  try {
    return require('./email-service');
  } catch (error) {
    console.error('Failed to load email service:', error);
    return null;
  }
};

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
  console.log('Production-tache-fichiers function called:', event.httpMethod, event.path);
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  try {
    // Vérification du token JWT
    const authHeader = event.headers.authorization || event.headers.Authorization;
    const decoded = verifyToken(authHeader);

    const method = event.httpMethod;
    const pathParts = event.path.split('/');
    const fichierId = pathParts[pathParts.length - 1];

    if (method === 'GET') {
      // Récupération des fichiers par production_tache_id
      const { queryStringParameters } = event;
      const tacheId = queryStringParameters?.production_tache_id;

      if (!tacheId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'production_tache_id requis' })
        };
      }

      // Vérifier que l'utilisateur peut accéder à cette tâche
      const tacheQuery = `
        SELECT pt.*, p.societe_id, p.demandeur_id 
        FROM production_taches pt
        JOIN productions p ON pt.production_id = p.id
        WHERE pt.id = $1
      `;

      const tache = await sql(tacheQuery, [tacheId]);
      
      if (tache.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Tâche non trouvée' })
        };
      }

      // Vérification des permissions
      let canAccess = false;
      if ((decoded.type_utilisateur || decoded.type) === 'agent') {
        canAccess = true;
      } else if ((decoded.type_utilisateur || decoded.type) === 'demandeur') {
        const demandeur = await sql`
          SELECT societe_id FROM demandeurs WHERE id = ${decoded.id}
        `;
        
        if (demandeur.length > 0) {
          if (demandeur[0].societe_id && tache[0].societe_id === demandeur[0].societe_id) {
            canAccess = true;
          } else if (!demandeur[0].societe_id && tache[0].demandeur_id === decoded.id) {
            canAccess = true;
          }
        }
      }

      if (!canAccess) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Accès interdit' })
        };
      }

      // Récupération des fichiers avec informations des uploader
      const fichiersQuery = `
        SELECT 
          ptf.*,
          COALESCE(d.nom, a.nom) as uploader_nom,
          COALESCE(d.prenom, a.prenom) as uploader_prenom,
          CASE 
            WHEN d.id IS NOT NULL THEN 'demandeur'
            WHEN a.id IS NOT NULL THEN 'agent'
            ELSE 'inconnu'
          END as uploader_type
        FROM production_tache_fichiers ptf
        LEFT JOIN demandeurs d ON ptf.uploaded_by = d.id
        LEFT JOIN agents a ON ptf.uploaded_by = a.id
        WHERE ptf.production_tache_id = $1
        ORDER BY ptf.date_upload DESC
      `;

      const fichiers = await sql(fichiersQuery, [tacheId]);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(fichiers)
      };

    } else if (method === 'POST') {
      // Upload d'un nouveau fichier
      const body = JSON.parse(event.body);
      const {
        production_tache_id,
        nom_fichier,
        type_fichier,
        contenu_base64
      } = body;

      if (!production_tache_id || !nom_fichier || !contenu_base64) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'production_tache_id, nom_fichier et contenu_base64 requis' })
        };
      }

      // Vérifier que l'utilisateur peut uploader sur cette tâche
      const tacheQuery = `
        SELECT pt.*, p.societe_id, p.demandeur_id, p.numero_production, pt.nom_tache
        FROM production_taches pt
        JOIN productions p ON pt.production_id = p.id
        WHERE pt.id = $1
      `;

      const tache = await sql(tacheQuery, [production_tache_id]);
      
      if (tache.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Tâche non trouvée' })
        };
      }

      // Vérification des permissions
      let canUpload = false;
      if ((decoded.type_utilisateur || decoded.type) === 'agent') {
        canUpload = true;
      } else if ((decoded.type_utilisateur || decoded.type) === 'demandeur') {
        const demandeur = await sql`
          SELECT societe_id FROM demandeurs WHERE id = ${decoded.id}
        `;
        
        if (demandeur.length > 0) {
          if (demandeur[0].societe_id && tache[0].societe_id === demandeur[0].societe_id) {
            canUpload = true;
          } else if (!demandeur[0].societe_id && tache[0].demandeur_id === decoded.id) {
            canUpload = true;
          }
        }
      }

      if (!canUpload) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Accès interdit' })
        };
      }

      // Calcul de la taille du fichier
      const taille_fichier = Math.round(contenu_base64.length * 0.75); // Approximation Base64

      // Insertion du fichier
      const insertQuery = `
        INSERT INTO production_tache_fichiers 
        (production_tache_id, nom_fichier, type_fichier, taille_fichier, contenu_base64, uploaded_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const result = await sql(insertQuery, [
        production_tache_id,
        nom_fichier,
        type_fichier,
        taille_fichier,
        contenu_base64,
        decoded.id
      ]);

      const newFichier = result[0];

      // Ajouter un commentaire automatique
      try {
        const commentQuery = `
          INSERT INTO production_tache_commentaires (production_tache_id, auteur_id, contenu, type_commentaire)
          VALUES ($1, $2, $3, $4)
        `;

        await sql(commentQuery, [
          production_tache_id,
          decoded.id,
          `📎 Fichier ajouté: ${nom_fichier}`,
          'file_upload'
        ]);
      } catch (commentError) {
        console.error('Erreur ajout commentaire fichier:', commentError);
      }

      // Récupération des informations complètes pour l'email
      const detailQuery = `
        SELECT 
          p.*,
          c.nom_societe,
          c.nom as client_nom,
          c.prenom as client_prenom,
          d.nom as demandeur_nom,
          d.prenom as demandeur_prenom,
          d.email as demandeur_email,
          ds.nom_societe as societe_nom,
          pt.nom_tache
        FROM productions p
        LEFT JOIN clients c ON p.client_id = c.id
        LEFT JOIN demandeurs d ON p.demandeur_id = d.id
        LEFT JOIN demandeurs_societe ds ON p.societe_id = ds.id
        LEFT JOIN production_taches pt ON p.id = pt.production_id
        WHERE p.id = (SELECT production_id FROM production_taches WHERE id = $1)
        AND pt.id = $1
      `;

      const productionInfo = await sql(detailQuery, [production_tache_id]);

      // Envoi d'email de notification
      if (productionInfo.length > 0) {
        try {
          const emailService = loadEmailService();
          if (emailService) {
            await emailService.sendProductionFileUploadEmail(
              productionInfo[0],
              tache[0],
              newFichier,
              decoded
            );
          }
        } catch (emailError) {
          console.error('Erreur envoi email:', emailError);
          // Ne pas faire échouer l'upload
        }
      }

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(newFichier)
      };

    } else if (method === 'DELETE') {
      // Suppression d'un fichier
      if (!fichierId || fichierId === 'production-tache-fichiers') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'ID du fichier requis' })
        };
      }

      // Récupération des informations du fichier
      const fichierQuery = `
        SELECT 
          ptf.*,
          pt.nom_tache,
          p.societe_id,
          p.demandeur_id,
          p.numero_production
        FROM production_tache_fichiers ptf
        JOIN production_taches pt ON ptf.production_tache_id = pt.id
        JOIN productions p ON pt.production_id = p.id
        WHERE ptf.id = $1
      `;

      const fichier = await sql(fichierQuery, [fichierId]);
      
      if (fichier.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Fichier non trouvé' })
        };
      }

      // Vérification des permissions
      let canDelete = false;
      if ((decoded.type_utilisateur || decoded.type) === 'agent') {
        canDelete = true;
      } else if ((decoded.type_utilisateur || decoded.type) === 'demandeur') {
        const demandeur = await sql`
          SELECT societe_id FROM demandeurs WHERE id = ${decoded.id}
        `;
        
        if (demandeur.length > 0) {
          // Peut supprimer ses propres fichiers ou ceux de sa société
          if (fichier[0].uploaded_by === decoded.id) {
            canDelete = true;
          } else if (demandeur[0].societe_id && fichier[0].societe_id === demandeur[0].societe_id) {
            canDelete = true;
          }
        }
      }

      if (!canDelete) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Accès interdit' })
        };
      }

      // Suppression du fichier
      const deleteQuery = `DELETE FROM production_tache_fichiers WHERE id = $1 RETURNING *`;
      const deletedFichier = await sql(deleteQuery, [fichierId]);

      // Ajouter un commentaire automatique
      try {
        const commentQuery = `
          INSERT INTO production_tache_commentaires (production_tache_id, auteur_id, contenu, type_commentaire)
          VALUES ($1, $2, $3, $4)
        `;

        await sql(commentQuery, [
          fichier[0].production_tache_id,
          decoded.id,
          `🗑️ Fichier supprimé: ${fichier[0].nom_fichier}`,
          'file_delete'
        ]);
      } catch (commentError) {
        console.error('Erreur ajout commentaire suppression:', commentError);
      }

      // Récupération des informations pour l'email
      const detailQuery = `
        SELECT 
          p.*,
          c.nom_societe,
          c.nom as client_nom,
          c.prenom as client_prenom,
          d.nom as demandeur_nom,
          d.prenom as demandeur_prenom,
          d.email as demandeur_email,
          ds.nom as societe_nom,
          pt.nom_tache
        FROM productions p
        LEFT JOIN clients c ON p.client_id = c.id
        LEFT JOIN demandeurs d ON p.demandeur_id = d.id
        LEFT JOIN demandeurs_societe ds ON p.societe_id = ds.id
        LEFT JOIN production_taches pt ON p.id = pt.production_id
        WHERE pt.id = $1
      `;

      const productionInfo = await sql(detailQuery, [fichier[0].production_tache_id]);

      // Envoi d'email de notification
      if (productionInfo.length > 0) {
        try {
          const emailService = loadEmailService();
          if (emailService) {
            await emailService.sendProductionFileDeleteEmail(
              productionInfo[0],
              fichier[0],
              decoded
            );
          }
        } catch (emailError) {
          console.error('Erreur envoi email:', emailError);
          // Ne pas faire échouer la suppression
        }
      }

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
      body: JSON.stringify({ error: 'Erreur interne du serveur: ' + error.message })
    };
  }
};