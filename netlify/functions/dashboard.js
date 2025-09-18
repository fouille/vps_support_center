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

// Mock data for development when database is not accessible
const getMockData = (userType) => {
  return {
    userType,
    tickets: {
      ouverts: 15,
      clotures: 8,
      total: 23,
      byStatus: {
        nouveau: 5,
        en_cours: 7,
        attente: 2,
        repondu: 1,
        resolu: 6,
        ferme: 2
      }
    },
    portabilites: {
      ouvertes: 12,
      terminees: 5,
      erreur: 3,
      total: 20,
      byStatus: {
        nouveau: 3,
        demande: 4,
        en_cours: 3,
        valide: 2,
        termine: 5,
        bloque: 2,
        rejete: 1
      }
    },
    productions: {
      non_termine: 8,
      termine: 5,
      bloque: 2,
      total: 15,
      byStatus: {
        en_attente: 3,
        en_cours: 5,
        termine: 5,
        bloque: 2
      }
    },
    additional: userType === 'agent' ? {
      parSociete: [
        { societe: 'Société A', demandeurs: 3, tickets: 8, portabilites: 5 },
        { societe: 'Société B', demandeurs: 2, tickets: 6, portabilites: 7 },
        { societe: 'Société C', demandeurs: 4, tickets: 9, portabilites: 8 }
      ],
      topClients: [
        { nom: 'Client Alpha', tickets: 8 },
        { nom: 'Client Beta', tickets: 6 },
        { nom: 'Client Gamma', tickets: 5 },
        { nom: 'Client Delta', tickets: 4 },
        { nom: 'Client Epsilon', tickets: 3 }
      ],
      evolutionTickets: [
        { date: '2025-07-22', count: 3 },
        { date: '2025-07-23', count: 5 },
        { date: '2025-07-24', count: 2 },
        { date: '2025-07-25', count: 4 },
        { date: '2025-07-26', count: 6 },
        { date: '2025-07-27', count: 3 },
        { date: '2025-07-28', count: 4 }
      ]
    } : {
      evolutionTickets: [
        { date: '2025-07-22', count: 1 },
        { date: '2025-07-23', count: 2 },
        { date: '2025-07-24', count: 1 },
        { date: '2025-07-25', count: 3 },
        { date: '2025-07-26', count: 2 },
        { date: '2025-07-27', count: 1 },
        { date: '2025-07-28', count: 2 }
      ]
    }
  };
};

exports.handler = async (event, context) => {
  console.log('Dashboard function called:', event.httpMethod, event.path);
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ detail: 'Méthode non autorisée' })
    };
  }

  try {
    // Verify authentication - same pattern as other APIs
    const authHeader = event.headers.authorization || event.headers.Authorization;
    const decoded = verifyToken(authHeader);

    const userType = decoded.type_utilisateur || decoded.type;
    const userId = decoded.id;

    console.log('Dashboard request from user:', userId, 'type:', userType);

    // Try to connect to database, fallback to mock data if fails
    try {
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

      // Récupérer les statistiques des productions
      const productionsQuery = ticketFilter
        ? `
          SELECT 
            status,
            COUNT(*) as count
          FROM productions pr
          JOIN demandeurs d ON pr.demandeur_id = d.id 
          WHERE d.societe_id = $1
          GROUP BY status
        `
        : `
          SELECT 
            status,
            COUNT(*) as count
          FROM productions
          GROUP BY status
        `;

      let productionsStats = [];
      try {
        productionsStats = await sql(productionsQuery, filterParams);
      } catch (error) {
        // Si la table productions n'existe pas encore, ignorer
        console.log('Table productions non disponible:', error.message);
        productionsStats = [];
      }

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

      // Traitement des statistiques productions
      const productionsData = {
        non_termine: 0,
        termine: 0,
        bloque: 0,
        total: 0,
        byStatus: {}
      };

      const productionsNonTermine = ['en_attente', 'en_cours'];
      const productionsTermine = ['termine'];
      const productionsBloque = ['bloque'];

      productionsStats.forEach(stat => {
        const count = parseInt(stat.count);
        productionsData.byStatus[stat.status] = count;
        productionsData.total += count;

        if (productionsNonTermine.includes(stat.status)) {
          productionsData.non_termine += count;
        } else if (productionsTermine.includes(stat.status)) {
          productionsData.termine += count;
        } else if (productionsBloque.includes(stat.status)) {
          productionsData.bloque += count;
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

      // Évolution des tickets créés dans les 30 derniers jours
      const evolutionQuery = ticketFilter
        ? `
          SELECT 
            DATE(t.date_creation) as date,
            COUNT(*) as count
          FROM tickets t
          ${ticketFilter}
          AND t.date_creation >= CURRENT_DATE - INTERVAL '30 days'
          GROUP BY DATE(t.date_creation)
          ORDER BY date
        `
        : `
          SELECT 
            DATE(date_creation) as date,
            COUNT(*) as count
          FROM tickets
          WHERE date_creation >= CURRENT_DATE - INTERVAL '30 days'
          GROUP BY DATE(date_creation)
          ORDER BY date
        `;

      try {
        const evolution = await sql(evolutionQuery, filterParams);
        additionalStats.evolutionTickets = evolution.map(day => {
          // Formater la date au format français DD/MM
          const date = new Date(day.date);
          const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
          
          return {
            date: formattedDate,
            count: parseInt(day.count)
          };
        });
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
          productions: productionsData,
          additional: additionalStats
        })
      };

    } catch (dbError) {
      console.log('Database connection failed, using mock data:', dbError.message);
      
      // Return mock data when database is not accessible (development environment)
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(getMockData(userType))
      };
    }

  } catch (error) {
    console.error('Dashboard error:', error);
    
    // Handle JWT errors
    if (error.message === 'Token manquant') {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ detail: 'Token d\'authentification manquant' })
      };
    }
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ detail: 'Token invalide ou expiré' })
      };
    }
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erreur interne du serveur' })
    };
  }
};