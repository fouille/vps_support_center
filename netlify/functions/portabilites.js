const { neon } = require('@netlify/neon');
const jwt = require('jsonwebtoken');
const emailService = require('./email-service');

const sql = neon(); // automatically uses env NETLIFY_DATABASE_URL

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

// Fonction pour obtenir le nom du client formaté
function formatClientDisplay(client) {
  if (!client.nom_societe) return 'Client sans nom';
  
  let display = client.nom_societe;
  
  if (client.nom && client.prenom) {
    display += ` (${client.nom} ${client.prenom})`;
  } else if (client.nom) {
    display += ` (${client.nom})`;
  } else if (client.prenom) {
    display += ` (${client.prenom})`;
  }
  
  return display;
}

exports.handler = async (event, context) => {
  console.log('Portabilites function called:', event.httpMethod, event.path);
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  try {
    // Vérification du token JWT
    const authHeader = event.headers.authorization || event.headers.Authorization;
    const decoded = verifyToken(authHeader);

    const method = event.httpMethod;
    const pathParts = event.path.split('/');
    const portabiliteId = pathParts[pathParts.length - 1];

    if (method === 'GET') {
      // Vérifier si c'est une demande pour une portabilité spécifique
      const isSpecificPortabilite = portabiliteId && 
        portabiliteId !== 'portabilites' && 
        portabiliteId.length > 10; // UUID plus long que 10 caractères

      if (isSpecificPortabilite) {
        // Requête pour une portabilité spécifique
        let specificQuery = `
          SELECT 
            p.*,
            c.nom_societe,
            c.nom as client_nom,
            c.prenom as client_prenom,
            d.nom as demandeur_nom,
            d.prenom as demandeur_prenom,
            a.nom as agent_nom,
            a.prenom as agent_prenom
          FROM portabilites p
          LEFT JOIN clients c ON p.client_id = c.id
          LEFT JOIN demandeurs d ON p.demandeur_id = d.id
          LEFT JOIN agents a ON p.agent_id = a.id
          WHERE p.id = $1
        `;

        let queryParams = [portabiliteId];

        // Vérification des permissions pour les demandeurs
        if ((decoded.type_utilisateur || decoded.type) === 'demandeur') {
          // Pour les demandeurs, vérifier qu'ils peuvent accéder à cette portabilité via leur société
          const demandeur = await sql`
            SELECT societe_id FROM demandeurs WHERE id = ${decoded.id}
          `;
          
          if (demandeur.length === 0) {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ error: 'Utilisateur non trouvé' })
            };
          }

          if (demandeur[0].societe_id) {
            // Vérifier via la société
            specificQuery += ` AND d.societe_id = $2`;
            queryParams.push(demandeur[0].societe_id);
          } else {
            // Si pas de société, voir seulement ses propres portabilités
            specificQuery += ` AND p.demandeur_id = $2`;
            queryParams.push(decoded.id);
          }
        }

        const result = await sql(specificQuery, queryParams);

        if (result.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Portabilité non trouvée' })
          };
        }

        // Formatage du résultat unique
        const portabilite = {
          ...result[0],
          client_display: formatClientDisplay({
            nom_societe: result[0].nom_societe,
            nom: result[0].client_nom,
            prenom: result[0].client_prenom
          })
        };

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(portabilite) // Retourner l'objet directement, pas dans un tableau
        };

      } else {
        // Récupération de la liste des portabilités (logique existante)
        const { queryStringParameters } = event;
        const page = parseInt(queryStringParameters?.page) || 1;
        const limit = parseInt(queryStringParameters?.limit) || 10;
        const offset = (page - 1) * limit;
        const status = queryStringParameters?.status;
        const clientId = queryStringParameters?.client;
        const search = queryStringParameters?.search;

        let baseQuery = `
          SELECT 
            p.*,
            c.nom_societe,
            c.nom as client_nom,
            c.prenom as client_prenom,
            d.nom as demandeur_nom,
            d.prenom as demandeur_prenom,
            a.nom as agent_nom,
            a.prenom as agent_prenom
          FROM portabilites p
          LEFT JOIN clients c ON p.client_id = c.id
          LEFT JOIN demandeurs d ON p.demandeur_id = d.id
          LEFT JOIN agents a ON p.agent_id = a.id
          WHERE 1=1
        `;

        let queryParams = [];
        let paramCount = 0;

        // Filtrage par utilisateur selon le type
        if ((decoded.type_utilisateur || decoded.type) === 'demandeur') {
          // Pour les demandeurs, utiliser societe_id pour voir toutes les portabilités de la société
          const demandeur = await sql`
            SELECT societe_id FROM demandeurs WHERE id = ${decoded.id}
          `;
          
          if (demandeur.length === 0) {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ error: 'Utilisateur non trouvé' })
            };
          }

          if (demandeur[0].societe_id) {
            // Filtrer par société (tous les demandeurs de la même société)
            paramCount++;
            baseQuery += ` AND d.societe_id = $${paramCount}`;
            queryParams.push(demandeur[0].societe_id);
          } else {
            // Si pas de société, voir seulement ses propres portabilités
            paramCount++;
            baseQuery += ` AND p.demandeur_id = $${paramCount}`;
            queryParams.push(decoded.id);
          }
        }

        // Filtrage par statut
        if (status) {
          paramCount++;
          if (status.startsWith('!')) {
            // Exclusion d'un statut (ex: !termine pour exclure les terminés)
            const excludedStatus = status.substring(1);
            baseQuery += ` AND p.status != $${paramCount}`;
            queryParams.push(excludedStatus);
          } else {
            // Inclusion d'un statut spécifique
            baseQuery += ` AND p.status = $${paramCount}`;
            queryParams.push(status);
          }
        }

        // Filtrage par client
        if (clientId) {
          paramCount++;
          baseQuery += ` AND p.client_id = $${paramCount}`;
          queryParams.push(clientId);
        }

        // Recherche par numéro de portabilité
        if (search) {
          paramCount++;
          baseQuery += ` AND p.numero_portabilite ILIKE $${paramCount}`;
          queryParams.push(`%${search}%`);
        }

        // Récupération du total
        const countQuery = `SELECT COUNT(*) as total FROM (${baseQuery}) as subquery`;
        const totalResult = await sql(countQuery, queryParams);
        const total = parseInt(totalResult[0].total);

        // Récupération des données paginées
        baseQuery += ` ORDER BY p.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        queryParams.push(limit, offset);

        const result = await sql(baseQuery, queryParams);
        
        // Formatage des résultats
        const portabilites = result.map(row => ({
          ...row,
          client_display: formatClientDisplay({
            nom_societe: row.nom_societe,
            nom: row.client_nom,
            prenom: row.client_prenom
          })
        }));

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            data: portabilites,
            pagination: {
              page,
              limit,
              total,
              pages: Math.ceil(total / limit),
              hasNext: page < Math.ceil(total / limit),
              hasPrev: page > 1
            }
          })
        };
      }

    } else if (method === 'POST') {
      // Création d'une nouvelle portabilité
      const body = JSON.parse(event.body);
      const {
        client_id,
        demandeur_id,
        numeros_portes,
        nom_client,
        prenom_client,
        email_client,
        siret_client,
        adresse,
        code_postal,
        ville,
        date_portabilite_demandee,
        date_portabilite_effective,
        fiabilisation_demandee,
        demande_signee,
        fichier_pdf_nom,
        fichier_pdf_contenu
      } = body;

      // Validation des champs requis
      if (!client_id || !numeros_portes) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Client et numéros portés requis' })
        };
      }

      // Détermination du demandeur
      let finalDemandeurId = demandeur_id;
      if (decoded.type_utilisateur === 'demandeur') {
        finalDemandeurId = decoded.id;
      } else if (decoded.type_utilisateur === 'agent') {
        // Pour les agents, si demandeur_id est vide, utiliser null
        finalDemandeurId = demandeur_id && demandeur_id.trim() !== '' ? demandeur_id : null;
      }

      // Validation : un demandeur doit être spécifié
      if (!finalDemandeurId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Un demandeur doit être sélectionné' })
        };
      }

      // Insertion de la portabilité (SANS les colonnes fichier_pdf)
      const insertQuery = `
        INSERT INTO portabilites (
          client_id, demandeur_id, agent_id, numeros_portes, nom_client, prenom_client,
          email_client, siret_client, adresse, code_postal, ville, date_portabilite_demandee,
          date_portabilite_effective, fiabilisation_demandee, demande_signee
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
      `;

      const result = await sql(insertQuery, [
        client_id,
        finalDemandeurId,
        decoded.type_utilisateur === 'agent' ? decoded.id : null,
        numeros_portes,
        nom_client,
        prenom_client,
        email_client,
        siret_client,
        adresse,
        code_postal,
        ville,
        date_portabilite_demandee,
        date_portabilite_effective,
        fiabilisation_demandee || false,
        demande_signee || false
      ]);

      const newPortabilite = result[0];

      // Si un fichier PDF est fourni, l'insérer dans la table portabilite_fichiers
      if (fichier_pdf_nom && fichier_pdf_contenu) {
        try {
          const fileInsertQuery = `
            INSERT INTO portabilite_fichiers (portabilite_id, nom_fichier, type_fichier, taille_fichier, contenu_base64, uploaded_by)
            VALUES ($1, $2, $3, $4, $5, $6)
          `;

          await sql(fileInsertQuery, [
            newPortabilite.id,
            fichier_pdf_nom,
            'application/pdf',
            fichier_pdf_contenu.length,
            fichier_pdf_contenu,
            decoded.id
          ]);

          // Ajouter un commentaire automatique
          const commentQuery = `
            INSERT INTO portabilite_echanges (portabilite_id, auteur_id, auteur_type, message)
            VALUES ($1, $2, $3, $4)
          `;

          await sql(commentQuery, [
            newPortabilite.id,
            decoded.id,
            decoded.type_utilisateur,
            `📎 Fichier joint lors de la création: ${fichier_pdf_nom}`
          ]);
        } catch (fileError) {
          console.error('Erreur lors de l\'insertion du fichier:', fileError);
          // Ne pas faire échouer la création pour un problème de fichier
        }
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
          d.email as demandeur_email
        FROM portabilites p
        LEFT JOIN clients c ON p.client_id = c.id
        LEFT JOIN demandeurs d ON p.demandeur_id = d.id
        WHERE p.id = $1
      `;

      const detailResult = await sql(detailQuery, [newPortabilite.id]);
      const portabiliteDetail = detailResult[0];

      // Envoi d'email de notification
      try {
        await emailService.sendPortabiliteCreationEmail(portabiliteDetail);
      } catch (emailError) {
        console.error('Erreur envoi email:', emailError);
        // Ne pas faire échouer la création pour un problème d'email
      }

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(newPortabilite)
      };

    } else if (method === 'PUT') {
      // Mise à jour d'une portabilité
      const body = JSON.parse(event.body);
      const {
        client_id,
        status,
        numeros_portes,
        nom_client,
        prenom_client,
        email_client,
        siret_client,
        adresse,
        code_postal,
        ville,
        date_portabilite_demandee,
        date_portabilite_effective,
        fiabilisation_demandee,
        demande_signee,
        fichier_pdf_nom,
        fichier_pdf_contenu
      } = body;

      // Récupération du statut actuel
      const currentQuery = `SELECT status FROM portabilites WHERE id = $1`;
      const currentResult = await sql(currentQuery, [portabiliteId]);
      
      if (currentResult.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Portabilité non trouvée' })
        };
      }

      const currentStatus = currentResult[0].status;

      // Mise à jour (SANS les colonnes fichier_pdf)
      const updateQuery = `
        UPDATE portabilites SET
          client_id = COALESCE($1, client_id),
          status = COALESCE($2, status),
          numeros_portes = COALESCE($3, numeros_portes),
          nom_client = COALESCE($4, nom_client),
          prenom_client = COALESCE($5, prenom_client),
          email_client = COALESCE($6, email_client),
          siret_client = COALESCE($7, siret_client),
          adresse = COALESCE($8, adresse),
          code_postal = COALESCE($9, code_postal),
          ville = COALESCE($10, ville),
          date_portabilite_demandee = COALESCE($11, date_portabilite_demandee),
          date_portabilite_effective = COALESCE($12, date_portabilite_effective),
          fiabilisation_demandee = COALESCE($13, fiabilisation_demandee),
          demande_signee = COALESCE($14, demande_signee),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $15
        RETURNING *
      `;

      const result = await sql(updateQuery, [
        client_id,
        status,
        numeros_portes,
        nom_client,
        prenom_client,
        email_client,
        siret_client,
        adresse,
        code_postal,
        ville,
        date_portabilite_demandee,
        date_portabilite_effective,
        fiabilisation_demandee,
        demande_signee,
        portabiliteId
      ]);

      const updatedPortabilite = result[0];

      // Si un fichier PDF est fourni, l'insérer/mettre à jour dans la table portabilite_fichiers
      if (fichier_pdf_nom && fichier_pdf_contenu) {
        try {
          // Supprimer l'ancien fichier PDF s'il existe
          await sql(
            `DELETE FROM portabilite_fichiers WHERE portabilite_id = $1 AND nom_fichier LIKE '%.pdf'`,
            [portabiliteId]
          );

          // Insérer le nouveau fichier
          const fileInsertQuery = `
            INSERT INTO portabilite_fichiers (portabilite_id, nom_fichier, type_fichier, taille_fichier, contenu_base64, uploaded_by)
            VALUES ($1, $2, $3, $4, $5, $6)
          `;

          await sql(fileInsertQuery, [
            portabiliteId,
            fichier_pdf_nom,
            'application/pdf',
            fichier_pdf_contenu.length,
            fichier_pdf_contenu,
            decoded.id
          ]);

          // Ajouter un commentaire automatique
          const commentQuery = `
            INSERT INTO portabilite_echanges (portabilite_id, auteur_id, auteur_type, message)
            VALUES ($1, $2, $3, $4)
          `;

          await sql(commentQuery, [
            portabiliteId,
            decoded.id,
            decoded.type_utilisateur,
            `📎 Fichier mis à jour: ${fichier_pdf_nom}`
          ]);
        } catch (fileError) {
          console.error('Erreur lors de la mise à jour du fichier:', fileError);
          // Ne pas faire échouer la mise à jour pour un problème de fichier
        }
      }

      // Si le statut a changé, envoyer un email
      if (status && status !== currentStatus) {
        try {
          const detailQuery = `
            SELECT 
              p.*,
              c.nom_societe,
              c.nom as client_nom,
              c.prenom as client_prenom,
              d.nom as demandeur_nom,
              d.prenom as demandeur_prenom,
              d.email as demandeur_email
            FROM portabilites p
            LEFT JOIN clients c ON p.client_id = c.id
            LEFT JOIN demandeurs d ON p.demandeur_id = d.id
            WHERE p.id = $1
          `;

          const detailResult = await sql(detailQuery, [portabiliteId]);
          const portabiliteDetail = detailResult[0];

          await emailService.sendPortabiliteStatusChangeEmail(portabiliteDetail, currentStatus, status);
        } catch (emailError) {
          console.error('Erreur envoi email:', emailError);
          // Ne pas faire échouer la mise à jour pour un problème d'email
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(updatedPortabilite)
      };

    } else if (method === 'DELETE') {
      // Suppression d'une portabilité (agents uniquement)
      if ((decoded.type_utilisateur || decoded.type) !== 'agent') {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Accès interdit' })
        };
      }

      const deleteQuery = `DELETE FROM portabilites WHERE id = $1 RETURNING *`;
      const result = await sql(deleteQuery, [portabiliteId]);

      if (result.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Portabilité non trouvée' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Portabilité supprimée avec succès' })
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