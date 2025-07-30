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
  console.log('Production-taches function called:', event.httpMethod, event.path);
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  try {
    // Vérification du token JWT
    const authHeader = event.headers.authorization || event.headers.Authorization;
    const decoded = verifyToken(authHeader);

    const method = event.httpMethod;
    const pathParts = event.path.split('/');
    const tacheId = pathParts[pathParts.length - 1];

    if (method === 'GET') {
      // Récupération des tâches par production_id
      const { queryStringParameters } = event;
      const productionId = queryStringParameters?.production_id;

      if (!productionId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'production_id requis' })
        };
      }

      // Vérifier que l'utilisateur peut accéder à cette production
      const productionQuery = `
        SELECT p.* FROM productions p
        LEFT JOIN demandeurs d ON p.demandeur_id = d.id
        WHERE p.id = $1
      `;

      let canAccess = false;
      const production = await sql(productionQuery, [productionId]);
      
      if (production.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Production non trouvée' })
        };
      }

      // Vérification des permissions
      if ((decoded.type_utilisateur || decoded.type) === 'agent') {
        canAccess = true;
      } else if ((decoded.type_utilisateur || decoded.type) === 'demandeur') {
        // Vérifier via la société
        const demandeur = await sql`
          SELECT societe_id FROM demandeurs WHERE id = ${decoded.id}
        `;
        
        if (demandeur.length > 0) {
          if (demandeur[0].societe_id && production[0].societe_id === demandeur[0].societe_id) {
            canAccess = true;
          } else if (!demandeur[0].societe_id && production[0].demandeur_id === decoded.id) {
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

      // Récupération des tâches avec commentaires et fichiers
      const tachesQuery = `
        SELECT 
          pt.*,
          COUNT(ptc.id) as nb_commentaires,
          COUNT(ptf.id) as nb_fichiers
        FROM production_taches pt
        LEFT JOIN production_tache_commentaires ptc ON pt.id = ptc.production_tache_id
        LEFT JOIN production_tache_fichiers ptf ON pt.id = ptf.production_tache_id
        WHERE pt.production_id = $1
        GROUP BY pt.id
        ORDER BY pt.ordre_tache ASC
      `;

      const taches = await sql(tachesQuery, [productionId]);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(taches)
      };

    } else if (method === 'PUT') {
      // Mise à jour d'une tâche
      const body = JSON.parse(event.body);
      const {
        status,
        descriptif,
        date_livraison,
        commentaire_interne
      } = body;

      // Vérifier que la tâche existe et que l'utilisateur peut la modifier
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
      let canModify = false;
      if ((decoded.type_utilisateur || decoded.type) === 'agent') {
        canModify = true;
      } else if ((decoded.type_utilisateur || decoded.type) === 'demandeur') {
        const demandeur = await sql`
          SELECT societe_id FROM demandeurs WHERE id = ${decoded.id}
        `;
        
        if (demandeur.length > 0) {
          if (demandeur[0].societe_id && tache[0].societe_id === demandeur[0].societe_id) {
            canModify = true;
          } else if (!demandeur[0].societe_id && tache[0].demandeur_id === decoded.id) {
            canModify = true;
          }
        }
      }

      if (!canModify) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Accès interdit' })
        };
      }

      const oldStatus = tache[0].status;

      // Mise à jour de la tâche
      const updateQuery = `
        UPDATE production_taches SET
          status = COALESCE($1, status),
          descriptif = COALESCE($2, descriptif),
          date_livraison = COALESCE($3, date_livraison),
          commentaire_interne = COALESCE($4, commentaire_interne),
          date_modification = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING *
      `;

      const result = await sql(updateQuery, [
        status,
        descriptif,
        date_livraison,
        commentaire_interne,
        tacheId
      ]);

      const updatedTache = result[0];

      // Si le statut a changé, ajouter un commentaire automatique
      if (status && status !== oldStatus) {
        try {
          const commentQuery = `
            INSERT INTO production_tache_commentaires (production_tache_id, auteur_id, contenu, type_commentaire)
            VALUES ($1, $2, $3, $4)
            RETURNING *
          `;

          const commentResult = await sql(commentQuery, [
            tacheId,
            decoded.id,
            `📝 Statut changé: ${oldStatus} → ${status}`,
            'status_change'
          ]);

          // Envoyer un email pour le changement de statut
          if (commentResult.length > 0) {
            try {
              // Récupération des informations pour l'email avec les données de l'auteur
              const emailInfoQuery = `
                SELECT 
                  p.*,
                  c.nom_societe,
                  c.nom as client_nom,
                  c.prenom as client_prenom,
                  d.nom as demandeur_nom,
                  d.prenom as demandeur_prenom,
                  d.email as demandeur_email,
                  ds.nom_societe as societe_nom,
                  pt.nom_tache,
                  COALESCE(da.nom, aa.nom) as auteur_nom,
                  COALESCE(da.prenom, aa.prenom) as auteur_prenom
                FROM productions p
                LEFT JOIN clients c ON p.client_id = c.id
                LEFT JOIN demandeurs d ON p.demandeur_id = d.id
                LEFT JOIN demandeurs_societe ds ON p.societe_id = ds.id
                LEFT JOIN production_taches pt ON p.id = pt.production_id
                LEFT JOIN demandeurs da ON da.id = $2
                LEFT JOIN agents aa ON aa.id = $2
                WHERE p.id = (SELECT production_id FROM production_taches WHERE id = $1)
                AND pt.id = $1
              `;

              const productionInfo = await sql(emailInfoQuery, [tacheId, decoded.id]);

              if (productionInfo.length > 0) {
                const emailService = loadEmailService();
                if (emailService) {
                  // Enrichir les données auteur avec les informations complètes
                  const enrichedAuthor = {
                    ...decoded,
                    nom: productionInfo[0].auteur_nom,
                    prenom: productionInfo[0].auteur_prenom
                  };
                  
                  await emailService.sendProductionCommentEmail(
                    productionInfo[0],
                    updatedTache,
                    commentResult[0],
                    enrichedAuthor
                  );
                }
              }
            } catch (emailError) {
              console.error('Erreur envoi email changement statut:', emailError);
              // Ne pas faire échouer la mise à jour de la tâche
            }
          }
        } catch (commentError) {
          console.error('Erreur ajout commentaire status:', commentError);
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(updatedTache)
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