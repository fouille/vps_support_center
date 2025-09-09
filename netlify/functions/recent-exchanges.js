const { neon } = require('@netlify/neon');
const jwt = require('jsonwebtoken');

const sql = neon(); // automatically uses env NETLIFY_DATABASE_URL

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
  console.log('Recent exchanges function called:', event.httpMethod);
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Méthode non autorisée' })
    };
  }

  try {
    // Vérification du token JWT
    const authHeader = event.headers.authorization || event.headers.Authorization;
    const decoded = verifyToken(authHeader);

    let exchanges = [];

    // Pour les demandeurs, filtrer par société
    if ((decoded.type_utilisateur || decoded.type) === 'demandeur') {
      // Récupérer la société du demandeur
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

      const societeId = demandeur[0].societe_id;

      // Requête pour les échanges de tickets
      let ticketExchanges;
      if (societeId) {
        ticketExchanges = await sql`
          SELECT 
            'ticket' as type,
            t.id as item_id,
            t.numero_ticket as item_number,
            t.titre as item_title,
            te.message as last_comment,
            te.created_at,
            COALESCE(a.nom, d.nom) as auteur_nom,
            COALESCE(a.prenom, d.prenom) as auteur_prenom,
            te.auteur_type
          FROM ticket_echanges te
          JOIN tickets t ON te.ticket_id = t.id
          LEFT JOIN agents a ON te.auteur_id = a.id AND te.auteur_type = 'agent'
          LEFT JOIN demandeurs d ON te.auteur_id = d.id AND te.auteur_type = 'demandeur'
          WHERE t.demandeur_id IN (SELECT id FROM demandeurs WHERE societe_id = ${societeId})
          ORDER BY te.created_at DESC
          LIMIT 10
        `;
      } else {
        ticketExchanges = await sql`
          SELECT 
            'ticket' as type,
            t.id as item_id,
            t.numero_ticket as item_number,
            t.titre as item_title,
            te.message as last_comment,
            te.created_at,
            COALESCE(a.nom, d.nom) as auteur_nom,
            COALESCE(a.prenom, d.prenom) as auteur_prenom,
            te.auteur_type
          FROM ticket_echanges te
          JOIN tickets t ON te.ticket_id = t.id
          LEFT JOIN agents a ON te.auteur_id = a.id AND te.auteur_type = 'agent'
          LEFT JOIN demandeurs d ON te.auteur_id = d.id AND te.auteur_type = 'demandeur'
          WHERE t.demandeur_id = ${decoded.id}
          ORDER BY te.created_at DESC
          LIMIT 10
        `;
      }

      // Requête pour les échanges de portabilités
      let portabiliteExchanges;
      if (societeId) {
        portabiliteExchanges = await sql`
          SELECT 
            'portabilite' as type,
            p.id as item_id,
            p.numero_portabilite as item_number,
            ('Portabilité ' || p.numeros_portes) as item_title,
            pe.message as last_comment,
            pe.created_at,
            COALESCE(a.nom, d.nom) as auteur_nom,
            COALESCE(a.prenom, d.prenom) as auteur_prenom,
            pe.auteur_type
          FROM portabilite_echanges pe
          JOIN portabilites p ON pe.portabilite_id = p.id
          LEFT JOIN agents a ON pe.auteur_id = a.id AND pe.auteur_type = 'agent'
          LEFT JOIN demandeurs d ON pe.auteur_id = d.id AND pe.auteur_type = 'demandeur'
          WHERE p.demandeur_id IN (SELECT id FROM demandeurs WHERE societe_id = ${societeId})
          ORDER BY pe.created_at DESC
          LIMIT 10
        `;
      } else {
        portabiliteExchanges = await sql`
          SELECT 
            'portabilite' as type,
            p.id as item_id,
            p.numero_portabilite as item_number,
            ('Portabilité ' || p.numeros_portes) as item_title,
            pe.message as last_comment,
            pe.created_at,
            COALESCE(a.nom, d.nom) as auteur_nom,
            COALESCE(a.prenom, d.prenom) as auteur_prenom,
            pe.auteur_type
          FROM portabilite_echanges pe
          JOIN portabilites p ON pe.portabilite_id = p.id
          LEFT JOIN agents a ON pe.auteur_id = a.id AND pe.auteur_type = 'agent'
          LEFT JOIN demandeurs d ON pe.auteur_id = d.id AND pe.auteur_type = 'demandeur'
          WHERE p.demandeur_id = ${decoded.id}
          ORDER BY pe.created_at DESC
          LIMIT 10
        `;
      }

      // Requête pour les commentaires de tâches de production
      const productionExchanges = await sql`
        SELECT 
          'production' as type,
          pr.id as item_id,
          pr.numero_production as item_number,
          (pr.titre || ' - ' || pt.nom_tache) as item_title,
          ptc.contenu as last_comment,
          ptc.date_creation as created_at,
          COALESCE(a.nom, d.nom) as auteur_nom,
          COALESCE(a.prenom, d.prenom) as auteur_prenom,
          CASE 
            WHEN a.id IS NOT NULL THEN 'agent'
            WHEN d.id IS NOT NULL THEN 'demandeur'
            ELSE 'inconnu'
          END as auteur_type
        FROM production_tache_commentaires ptc
        JOIN production_taches pt ON ptc.production_tache_id = pt.id
        JOIN productions pr ON pt.production_id = pr.id
        LEFT JOIN agents a ON ptc.auteur_id = a.id
        LEFT JOIN demandeurs d ON ptc.auteur_id = d.id
        WHERE ${societeId ? sql`pr.societe_id = ${societeId}` : sql`pr.demandeur_id = ${decoded.id}`}
        ORDER BY ptc.date_creation DESC
        LIMIT 10
      `;

      exchanges = [...ticketExchanges, ...portabiliteExchanges, ...productionExchanges];

    } else {
      // Pour les agents, récupérer tous les échanges récents
      
      // Requête pour les échanges de tickets
      const ticketExchanges = await sql`
        SELECT 
          'ticket' as type,
          t.id as item_id,
          t.numero_ticket as item_number,
          t.titre as item_title,
          te.message as last_comment,
          te.created_at,
          COALESCE(a.nom, d.nom) as auteur_nom,
          COALESCE(a.prenom, d.prenom) as auteur_prenom,
          te.auteur_type
        FROM ticket_echanges te
        JOIN tickets t ON te.ticket_id = t.id
        LEFT JOIN agents a ON te.auteur_id = a.id AND te.auteur_type = 'agent'
        LEFT JOIN demandeurs d ON te.auteur_id = d.id AND te.auteur_type = 'demandeur'
        ORDER BY te.created_at DESC
        LIMIT 10
      `;

      // Requête pour les échanges de portabilités
      const portabiliteExchanges = await sql`
        SELECT 
          'portabilite' as type,
          p.id as item_id,
          p.numero_portabilite as item_number,
          ('Portabilité ' || p.numeros_portes) as item_title,
          pe.message as last_comment,
          pe.created_at,
          COALESCE(a.nom, d.nom) as auteur_nom,
          COALESCE(a.prenom, d.prenom) as auteur_prenom,
          pe.auteur_type
        FROM portabilite_echanges pe
        JOIN portabilites p ON pe.portabilite_id = p.id
        LEFT JOIN agents a ON pe.auteur_id = a.id AND pe.auteur_type = 'agent'
        LEFT JOIN demandeurs d ON pe.auteur_id = d.id AND pe.auteur_type = 'demandeur'
        ORDER BY pe.created_at DESC
        LIMIT 10
      `;

      // Requête pour les commentaires de tâches de production
      const productionExchanges = await sql`
        SELECT 
          'production' as type,
          pr.id as item_id,
          pr.numero_production as item_number,
          (pr.titre || ' - ' || pt.nom_tache) as item_title,
          ptc.contenu as last_comment,
          ptc.date_creation as created_at,
          COALESCE(a.nom, d.nom) as auteur_nom,
          COALESCE(a.prenom, d.prenom) as auteur_prenom,
          CASE 
            WHEN a.id IS NOT NULL THEN 'agent'
            WHEN d.id IS NOT NULL THEN 'demandeur'
            ELSE 'inconnu'
          END as auteur_type
        FROM production_tache_commentaires ptc
        JOIN production_taches pt ON ptc.production_tache_id = pt.id
        JOIN productions pr ON pt.production_id = pr.id
        LEFT JOIN agents a ON ptc.auteur_id = a.id
        LEFT JOIN demandeurs d ON ptc.auteur_id = d.id
        ORDER BY ptc.date_creation DESC
        LIMIT 10
      `;

      exchanges = [...ticketExchanges, ...portabiliteExchanges, ...productionExchanges];
    }

    // Trier tous les échanges par date décroissante et prendre les 10 plus récents
    exchanges.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    exchanges = exchanges.slice(0, 10);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(exchanges)
    };

  } catch (error) {
    console.error('Erreur:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erreur interne du serveur: ' + error.message })
    };
  }
};