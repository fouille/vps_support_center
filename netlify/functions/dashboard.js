const { neon } = require('@netlify/neon');
const jwt = require('jsonwebtoken');

const sql = neon(); // automatically uses env NETLIFY_DATABASE_URL

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ detail: 'Méthode non autorisée' })
    };
  }

  try {
    // Vérification du token JWT
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ detail: 'Token d\'authentification manquant' })
      };
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ detail: 'Token invalide' })
      };
    }

    const userType = decoded.type_utilisateur || decoded.type;
    const userId = decoded.id;

    // Construire les conditions de filtrage selon le type d'utilisateur
    let ticketFilter = '';
    let portabiliteFilter = '';
    let filterParams = [];

    if (userType === 'demandeur') {
      // Pour les demandeurs, récupérer seulement les données de leur société
      const demandeurInfo = await sql`
        SELECT societe_id FROM demandeurs WHERE id = ${userId}
      `;
      
      if (demandeurInfo.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ detail: 'Utilisateur non trouvé' })
        };
      }

      const societeId = demandeurInfo[0].societe_id;
      ticketFilter = 'JOIN demandeurs d ON t.demandeur_id = d.id WHERE d.societe_id = $1';
      portabiliteFilter = 'JOIN demandeurs d ON p.demandeur_id = d.id WHERE d.societe_id = $1';
      filterParams = [societeId];
    }
    // Pour les agents, pas de filtre (toutes les données)

    // Récupérer les statistiques des tickets
    const ticketsQuery = ticketFilter 
      ? `
        SELECT 
          status,
          COUNT(*) as count
        FROM tickets t
        ${ticketFilter}
        GROUP BY status
      `
      : `
        SELECT 
          status,
          COUNT(*) as count
        FROM tickets
        GROUP BY status
      `;

    const ticketsStats = await sql(ticketsQuery, filterParams);

    // Récupérer les statistiques des portabilités
    const portabilitesQuery = portabiliteFilter
      ? `
        SELECT 
          status,
          COUNT(*) as count
        FROM portabilites p
        ${portabiliteFilter}
        GROUP BY status
      `
      : `
        SELECT 
          status,
          COUNT(*) as count
        FROM portabilites
        GROUP BY status
      `;

    const portabilitesStats = await sql(portabilitesQuery, filterParams);

    // Traitement des statistiques tickets
    const ticketsData = {
      ouverts: 0,
      clotures: 0,
      total: 0,
      byStatus: {}
    };

    const ticketsOuverts = ['nouveau', 'attente', 'en_cours', 'repondu'];
    const ticketsClotures = ['resolu', 'ferme'];

    ticketsStats.forEach(stat => {
      const count = parseInt(stat.count);
      ticketsData.byStatus[stat.status] = count;
      ticketsData.total += count;

      if (ticketsOuverts.includes(stat.status)) {
        ticketsData.ouverts += count;
      } else if (ticketsClotures.includes(stat.status)) {
        ticketsData.clotures += count;
      }
    });

    // Traitement des statistiques portabilités
    const portabilitesData = {
      ouvertes: 0,
      terminees: 0,
      erreur: 0,
      total: 0,
      byStatus: {}
    };

    const portabilitesOuvertes = ['nouveau', 'demande', 'en_cours', 'valide'];
    const portabilitesTerminees = ['termine'];
    const portabilitesErreur = ['bloque', 'rejete'];

    portabilitesStats.forEach(stat => {
      const count = parseInt(stat.count);
      portabilitesData.byStatus[stat.status] = count;
      portabilitesData.total += count;

      if (portabilitesOuvertes.includes(stat.status)) {
        portabilitesData.ouvertes += count;
      } else if (portabilitesTerminees.includes(stat.status)) {
        portabilitesData.terminees += count;
      } else if (portabilitesErreur.includes(stat.status)) {
        portabilitesData.erreur += count;
      }
    });

    // Statistiques additionnelles intéressantes
    const additionalStats = {};

    if (userType === 'agent') {
      // Statistiques par société pour les agents
      const societesQuery = `
        SELECT 
          ds.nom_societe,
          COUNT(DISTINCT d.id) as demandeurs_count,
          COUNT(DISTINCT t.id) as tickets_count,
          COUNT(DISTINCT p.id) as portabilites_count
        FROM demandeurs_societe ds
        LEFT JOIN demandeurs d ON ds.id = d.societe_id
        LEFT JOIN tickets t ON d.id = t.demandeur_id
        LEFT JOIN portabilites p ON d.id = p.demandeur_id
        GROUP BY ds.id, ds.nom_societe
        ORDER BY ds.nom_societe
      `;

      try {
        const societesStats = await sql(societesQuery);
        additionalStats.parSociete = societesStats.map(stat => ({
          societe: stat.nom_societe,
          demandeurs: parseInt(stat.demandeurs_count),
          tickets: parseInt(stat.tickets_count),
          portabilites: parseInt(stat.portabilites_count)
        }));
      } catch (error) {
        // Si la table demandeurs_societe n'existe pas encore, ignorer
        additionalStats.parSociete = [];
      }

      // Top 5 des clients avec le plus de tickets
      const topClientsQuery = `
        SELECT 
          c.nom_societe,
          COUNT(t.id) as tickets_count
        FROM clients c
        LEFT JOIN tickets t ON c.id = t.client_id
        GROUP BY c.id, c.nom_societe
        ORDER BY tickets_count DESC
        LIMIT 5
      `;

      const topClients = await sql(topClientsQuery);
      additionalStats.topClients = topClients.map(client => ({
        nom: client.nom_societe,
        tickets: parseInt(client.tickets_count)
      }));
    }

    // Évolution des tickets créés dans les 7 derniers jours
    const evolutionQuery = ticketFilter
      ? `
        SELECT 
          DATE(t.date_creation) as date,
          COUNT(*) as count
        FROM tickets t
        ${ticketFilter}
        AND t.date_creation >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY DATE(t.date_creation)
        ORDER BY date
      `
      : `
        SELECT 
          DATE(date_creation) as date,
          COUNT(*) as count
        FROM tickets
        WHERE date_creation >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY DATE(date_creation)
        ORDER BY date
      `;

    try {
      const evolution = await sql(evolutionQuery, filterParams);
      additionalStats.evolutionTickets = evolution.map(day => ({
        date: day.date,
        count: parseInt(day.count)
      }));
    } catch (error) {
      additionalStats.evolutionTickets = [];
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        userType,
        tickets: ticketsData,
        portabilites: portabilitesData,
        additional: additionalStats
      })
    };

  } catch (error) {
    console.error('Erreur dashboard:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erreur interne du serveur' })
    };
  }
};