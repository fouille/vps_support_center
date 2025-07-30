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
  console.log('Production-tache-commentaires function called:', event.httpMethod, event.path);
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  try {
    // Vérification du token JWT
    const authHeader = event.headers.authorization || event.headers.Authorization;
    const decoded = verifyToken(authHeader);

    const method = event.httpMethod;

    if (method === 'GET') {
      // Récupération des commentaires par production_tache_id
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

      // Récupération des commentaires avec informations des auteurs
      const commentairesQuery = `
        SELECT 
          ptc.*,
          COALESCE(d.nom, a.nom) as auteur_nom,
          COALESCE(d.prenom, a.prenom) as auteur_prenom,
          CASE 
            WHEN d.id IS NOT NULL THEN 'demandeur'
            WHEN a.id IS NOT NULL THEN 'agent'
            ELSE 'inconnu'
          END as auteur_type_real
        FROM production_tache_commentaires ptc
        LEFT JOIN demandeurs d ON ptc.auteur_id = d.id
        LEFT JOIN agents a ON ptc.auteur_id = a.id
        WHERE ptc.production_tache_id = $1
        ORDER BY ptc.date_creation ASC
      `;

      const commentaires = await sql(commentairesQuery, [tacheId]);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(commentaires)
      };

    } else if (method === 'POST') {
      // Création d'un nouveau commentaire
      const body = JSON.parse(event.body);
      const {
        production_tache_id,
        contenu,
        type_commentaire = 'commentaire'
      } = body;

      if (!production_tache_id || !contenu) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'production_tache_id et contenu requis' })
        };
      }

      // Vérifier que l'utilisateur peut commenter cette tâche
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
      let canComment = false;
      let userType = 'demandeur';
      
      if ((decoded.type_utilisateur || decoded.type) === 'agent') {
        canComment = true;
        userType = 'agent';
      } else if ((decoded.type_utilisateur || decoded.type) === 'demandeur') {
        const demandeur = await sql`
          SELECT societe_id FROM demandeurs WHERE id = ${decoded.id}
        `;
        
        if (demandeur.length > 0) {
          if (demandeur[0].societe_id && tache[0].societe_id === demandeur[0].societe_id) {
            canComment = true;
          } else if (!demandeur[0].societe_id && tache[0].demandeur_id === decoded.id) {
            canComment = true;
          }
        }
      }

      if (!canComment) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Accès interdit' })
        };
      }

      // Insertion du commentaire
      const insertQuery = `
        INSERT INTO production_tache_commentaires (production_tache_id, auteur_id, contenu, type_commentaire)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;

      const result = await sql(insertQuery, [
        production_tache_id,
        decoded.id,
        contenu,
        type_commentaire
      ]);

      const newCommentaire = result[0];

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
          ds.nom as societe_nom,
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
            await emailService.sendProductionCommentEmail(
              productionInfo[0],
              tache[0],
              newCommentaire,
              decoded
            );
          }
        } catch (emailError) {
          console.error('Erreur envoi email:', emailError);
          // Ne pas faire échouer la création du commentaire
        }
      }

      // Récupération du commentaire avec infos auteur
      const commentaireAvecAuteur = await sql(`
        SELECT 
          ptc.*,
          COALESCE(d.nom, a.nom) as auteur_nom,
          COALESCE(d.prenom, a.prenom) as auteur_prenom,
          CASE 
            WHEN d.id IS NOT NULL THEN 'demandeur'
            WHEN a.id IS NOT NULL THEN 'agent'
            ELSE 'inconnu'
          END as auteur_type_real
        FROM production_tache_commentaires ptc
        LEFT JOIN demandeurs d ON ptc.auteur_id = d.id
        LEFT JOIN agents a ON ptc.auteur_id = a.id
        WHERE ptc.id = $1
      `, [newCommentaire.id]);

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(commentaireAvecAuteur[0])
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