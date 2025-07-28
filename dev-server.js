const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 8001;

// Middleware
app.use(cors());
app.use(express.json());

// Mock database - In real app, this would be Neon
const mockDB = {
  agents: [
    {
      id: uuidv4(),
      nom: 'ADMIN',
      prenom: 'Franck',
      email: 'admin@voipservices.fr',
      password: '$2a$10$dmRNBo8wCcE3.5HCGMf3Le/tTIUcwdLDaSLtugn/JZFq9GwHcF/We', // admin1234!
      societe: 'VoIP Services'
    }
  ],
  demandeurs_societe: [
    {
      id: 'societe-techcorp-id',
      nom_societe: 'TechCorp SARL',
      siret: '12345678901234',
      adresse: '123 Avenue des Champs-Élysées',
      adresse_complement: null,
      code_postal: '75008',
      ville: 'Paris',
      numero_tel: '0123456789',
      email: 'contact@techcorp.fr',
      logo_base64: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  demandeurs: [
    {
      id: uuidv4(),
      nom: 'Martin',
      prenom: 'Sophie',
      societe: 'TechCorp SARL',
      societe_id: 'societe-techcorp-id', // Link to the société
      telephone: '0123456789',
      email: 'sophie.martin@techcorp.fr',
      password: '$2a$10$GdyKzfgy3bdkrOsi6weev.8V3msbHhiuRrKM4m3PUwMCf7ShDYv6G' // password123
    }
  ],
  clients: [],
  tickets: [],
  ticket_echanges: []
};

// JWT Secret
const JWT_SECRET = 'dev-secret-key';

// Auth endpoint
app.post('/api/auth', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check in demandeurs first
    let user = mockDB.demandeurs.find(u => u.email === email);
    let userType = 'demandeur';

    // If not found, check in agents
    if (!user) {
      user = mockDB.agents.find(u => u.email === email);
      userType = 'agent';
    }

    if (!user) {
      return res.status(401).json({ detail: 'Email ou mot de passe incorrect' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ detail: 'Email ou mot de passe incorrect' });
    }

    // Create JWT token
    const token = jwt.sign(
      { 
        sub: user.email, 
        id: user.id,
        type: userType,
        type_utilisateur: userType
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Remove password from response
    const { password: _, ...userResponse } = user;
    userResponse.type_utilisateur = userType;

    res.json({
      access_token: token,
      token_type: 'bearer',
      user: userResponse
    });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ detail: 'Erreur serveur: ' + error.message });
  }
});

// Middleware to verify token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ detail: 'Token manquant' });
  }
  
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ detail: 'Token invalide' });
  }
};

// Clients endpoints
app.get('/api/clients', verifyToken, (req, res) => {
  // Paramètres de pagination et recherche
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || '';
  const offset = (page - 1) * limit;

  let filteredClients = mockDB.clients;

  // Ajouter la recherche si présente
  if (search) {
    const searchLower = search.toLowerCase();
    filteredClients = mockDB.clients.filter(client => {
      return (
        (client.nom_societe && client.nom_societe.toLowerCase().includes(searchLower)) ||
        (client.nom && client.nom.toLowerCase().includes(searchLower)) ||
        (client.prenom && client.prenom.toLowerCase().includes(searchLower)) ||
        (client.numero && client.numero.toLowerCase().includes(searchLower))
      );
    });
  }

  // Trier les résultats
  filteredClients.sort((a, b) => {
    if (a.nom_societe < b.nom_societe) return -1;
    if (a.nom_societe > b.nom_societe) return 1;
    if ((a.nom || '') < (b.nom || '')) return -1;
    if ((a.nom || '') > (b.nom || '')) return 1;
    if ((a.prenom || '') < (b.prenom || '')) return -1;
    if ((a.prenom || '') > (b.prenom || '')) return 1;
    return 0;
  });

  // Appliquer la pagination
  const total = filteredClients.length;
  const totalPages = Math.ceil(total / limit);
  const paginatedClients = filteredClients.slice(offset, offset + limit);

  // Retourner la structure attendue
  res.json({
    data: paginatedClients,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  });
});

app.post('/api/clients', verifyToken, (req, res) => {
  const { nom_societe, adresse, nom, prenom, numero } = req.body;
  
  // Only nom_societe and adresse are required
  if (!nom_societe || !adresse) {
    return res.status(400).json({ detail: 'Le nom de société et l\'adresse sont requis' });
  }
  
  const client = { 
    id: uuidv4(), 
    nom_societe,
    adresse,
    nom: nom || null,
    prenom: prenom || null,
    numero: numero || null
  };
  mockDB.clients.push(client);
  res.status(201).json(client);
});

app.put('/api/clients/:id', verifyToken, (req, res) => {
  const clientIndex = mockDB.clients.findIndex(c => c.id === req.params.id);
  if (clientIndex === -1) {
    return res.status(404).json({ detail: 'Client non trouvé' });
  }
  
  mockDB.clients[clientIndex] = { ...mockDB.clients[clientIndex], ...req.body };
  res.json(mockDB.clients[clientIndex]);
});

app.delete('/api/clients/:id', verifyToken, (req, res) => {
  const clientIndex = mockDB.clients.findIndex(c => c.id === req.params.id);
  if (clientIndex === -1) {
    return res.status(404).json({ detail: 'Client non trouvé' });
  }
  
  mockDB.clients.splice(clientIndex, 1);
  res.json({ message: 'Client supprimé avec succès' });
});

// Agents endpoints
app.get('/api/agents', verifyToken, (req, res) => {
  const agents = mockDB.agents.map(a => ({
    ...a,
    type_utilisateur: 'agent',
    telephone: null,
    password: undefined
  }));
  res.json(agents);
});

app.post('/api/agents', verifyToken, async (req, res) => {
  const { nom, prenom, societe, email, password } = req.body;
  
  if (!nom || !prenom || !societe || !email || !password) {
    return res.status(400).json({ detail: 'Tous les champs obligatoires doivent être remplis' });
  }

  // Check if email exists
  const existingUser = [...mockDB.demandeurs, ...mockDB.agents].find(u => u.email === email);
  if (existingUser) {
    return res.status(400).json({ detail: 'Cet email est déjà utilisé' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const agent = {
    id: uuidv4(),
    nom,
    prenom,
    societe,
    email,
    password: hashedPassword
  };
  
  mockDB.agents.push(agent);
  
  const { password: _, ...response } = agent;
  response.type_utilisateur = 'agent';
  response.telephone = null;
  
  res.status(201).json(response);
});

// Function to generate unique 6-digit ticket number
const generateTicketNumber = () => {
  let numero;
  let attempts = 0;
  do {
    numero = Math.floor(100000 + Math.random() * 900000).toString();
    attempts++;
    if (attempts > 100) break; // Prevent infinite loop
  } while (mockDB.tickets.some(t => t.numero_ticket === numero));
  return numero;
};

// Tickets endpoints
app.get('/api/tickets', verifyToken, (req, res) => {
  try {
    // Parse query parameters for filtering
    const statusFilter = req.query.status_filter;
    const clientIdFilter = req.query.client_id;
    const searchFilter = req.query.search; // New parameter for ticket number search
    
    let filteredTickets = mockDB.tickets;
    
    // Apply filters
    if (statusFilter) {
      const statuses = statusFilter.split(',');
      filteredTickets = filteredTickets.filter(t => statuses.includes(t.status));
    }
    
    if (clientIdFilter) {
      filteredTickets = filteredTickets.filter(t => t.client_id === clientIdFilter);
    }
    
    if (searchFilter) {
      filteredTickets = filteredTickets.filter(t => 
        t.numero_ticket && t.numero_ticket.includes(searchFilter)
      );
    }
    
    // Add client and demandeur information to tickets
    const enrichedTickets = filteredTickets.map(ticket => {
      const client = mockDB.clients.find(c => c.id === ticket.client_id);
      const demandeur = mockDB.demandeurs.find(d => d.id === ticket.demandeur_id);
      const agent = mockDB.agents.find(a => a.id === ticket.agent_id);
      
      return {
        ...ticket,
        client_nom: client?.nom_societe || 'Unknown Client',
        client_nom_personne: client?.nom || null,
        client_prenom: client?.prenom || null,
        demandeur_nom: demandeur?.nom || 'Unknown',
        demandeur_prenom: demandeur?.prenom || 'Unknown',
        demandeur_societe: demandeur?.societe || 'Unknown',
        agent_nom: agent?.nom || null,
        agent_prenom: agent?.prenom || null
      };
    });
    
    // Sort by creation date (newest first)
    enrichedTickets.sort((a, b) => new Date(b.date_creation) - new Date(a.date_creation));
    
    res.json(enrichedTickets);
  } catch (error) {
    console.error('Tickets GET error:', error);
    res.status(500).json({ detail: 'Erreur serveur: ' + error.message });
  }
});

app.post('/api/tickets', verifyToken, (req, res) => {
  try {
    const { titre, client_id, status = 'nouveau', date_fin_prevue, requete_initiale, demandeur_id } = req.body;
    
    if (!titre || !client_id || !requete_initiale) {
      return res.status(400).json({ detail: 'Titre, client et requête initiale sont requis' });
    }

    let finalDemandeurId;

    if (req.user.type === 'demandeur') {
      // For demandeurs, use their own ID
      const demandeur = mockDB.demandeurs.find(d => d.email === req.user.sub);
      if (!demandeur) {
        return res.status(404).json({ detail: 'Demandeur non trouvé' });
      }
      finalDemandeurId = demandeur.id;
    } else if (req.user.type === 'agent') {
      // For agents, they must specify a demandeur_id
      if (!demandeur_id) {
        return res.status(400).json({ detail: 'Un agent doit spécifier un demandeur pour le ticket' });
      }
      finalDemandeurId = demandeur_id;
    } else {
      return res.status(403).json({ detail: 'Type d\'utilisateur non autorisé' });
    }

    // Generate unique ticket number
    const numero_ticket = generateTicketNumber();

    const newTicket = {
      id: uuidv4(),
      numero_ticket,
      titre,
      client_id,
      demandeur_id: finalDemandeurId,
      status,
      date_fin_prevue: date_fin_prevue || null,
      requete_initiale,
      date_creation: new Date().toISOString(),
      agent_id: null,
      date_cloture: null
    };

    mockDB.tickets.push(newTicket);
    
    console.log('Ticket created:', newTicket);
    res.status(201).json(newTicket);
  } catch (error) {
    console.error('Tickets POST error:', error);
    res.status(500).json({ detail: 'Erreur serveur: ' + error.message });
  }
});

app.put('/api/tickets/:id', verifyToken, (req, res) => {
  try {
    const ticketId = req.params.id;
    const { titre, status, agent_id, date_fin_prevue, date_cloture } = req.body;
    
    const ticketIndex = mockDB.tickets.findIndex(t => t.id === ticketId);
    if (ticketIndex === -1) {
      return res.status(404).json({ detail: 'Ticket non trouvé' });
    }
    
    // Update ticket while preserving numero_ticket
    mockDB.tickets[ticketIndex] = {
      ...mockDB.tickets[ticketIndex],
      titre: titre || mockDB.tickets[ticketIndex].titre,
      status: status || mockDB.tickets[ticketIndex].status,
      agent_id: agent_id !== undefined ? agent_id : mockDB.tickets[ticketIndex].agent_id,
      date_fin_prevue: date_fin_prevue !== undefined ? date_fin_prevue : mockDB.tickets[ticketIndex].date_fin_prevue,
      date_cloture: date_cloture !== undefined ? date_cloture : mockDB.tickets[ticketIndex].date_cloture
    };
    
    res.json(mockDB.tickets[ticketIndex]);
  } catch (error) {
    console.error('Tickets PUT error:', error);
    res.status(500).json({ detail: 'Erreur serveur: ' + error.message });
  }
});

app.delete('/api/tickets/:id', verifyToken, (req, res) => {
  try {
    const ticketId = req.params.id;
    const ticketIndex = mockDB.tickets.findIndex(t => t.id === ticketId);
    
    if (ticketIndex === -1) {
      return res.status(404).json({ detail: 'Ticket non trouvé' });
    }
    
    mockDB.tickets.splice(ticketIndex, 1);
    res.json({ message: 'Ticket supprimé avec succès' });
  } catch (error) {
    console.error('Tickets DELETE error:', error);
    res.status(500).json({ detail: 'Erreur serveur: ' + error.message });
  }
});

// Ticket-echanges endpoints
app.get('/api/ticket-echanges', verifyToken, (req, res) => {
  const ticketId = req.query.ticketId;
  
  if (!ticketId) {
    return res.status(400).json({ detail: 'Paramètre ticketId manquant' });
  }

  // Initialize mock data if not exists
  if (!mockDB.ticket_echanges) {
    mockDB.ticket_echanges = [];
  }

  // Get exchanges for the ticket
  const echanges = mockDB.ticket_echanges
    .filter(e => e.ticket_id === ticketId)
    .map(e => {
      // Add author name based on type
      let auteur_nom = 'Unknown';
      if (e.auteur_type === 'agent') {
        const agent = mockDB.agents.find(a => a.id === e.auteur_id);
        if (agent) auteur_nom = `${agent.nom} ${agent.prenom}`;
      } else if (e.auteur_type === 'demandeur') {
        const demandeur = mockDB.demandeurs.find(d => d.id === e.auteur_id);
        if (demandeur) auteur_nom = `${demandeur.nom} ${demandeur.prenom}`;
      }
      
      return { ...e, auteur_nom };
    })
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  res.json(echanges);
});

app.post('/api/ticket-echanges', verifyToken, (req, res) => {
  const ticketId = req.query.ticketId;
  
  if (!ticketId) {
    return res.status(400).json({ detail: 'Paramètre ticketId manquant' });
  }

  const { message } = req.body;
  
  if (!message || !message.trim()) {
    return res.status(400).json({ detail: 'Le message ne peut pas être vide' });
  }

  // Initialize mock data if not exists
  if (!mockDB.ticket_echanges) {
    mockDB.ticket_echanges = [];
  }

  // Get user info based on token
  let auteurId, auteurType, auteur_nom;
  
  if (req.user.type === 'agent') {
    const agent = mockDB.agents.find(a => a.email === req.user.sub);
    if (!agent) {
      return res.status(404).json({ detail: 'Agent non trouvé' });
    }
    auteurId = agent.id;
    auteurType = 'agent';
    auteur_nom = `${agent.nom} ${agent.prenom}`;
  } else if (req.user.type === 'demandeur') {
    const demandeur = mockDB.demandeurs.find(d => d.email === req.user.sub);
    if (!demandeur) {
      return res.status(404).json({ detail: 'Demandeur non trouvé' });
    }
    auteurId = demandeur.id;
    auteurType = 'demandeur';
    auteur_nom = `${demandeur.nom} ${demandeur.prenom}`;
  } else {
    return res.status(403).json({ detail: 'Type d\'utilisateur non autorisé' });
  }

  // Create new exchange
  const newEchange = {
    id: uuidv4(),
    ticket_id: ticketId,
    auteur_id: auteurId,
    auteur_type: auteurType,
    message: message.trim(),
    created_at: new Date().toISOString(),
    auteur_nom
  };

  mockDB.ticket_echanges.push(newEchange);
  
  res.status(201).json(newEchange);
});

// Email diagnostic endpoints
app.get('/api/email-diagnostic', (req, res) => {
  console.log('Email diagnostic function called');
  
  try {
    const diagnostics = {
      environment: {
        MJ_APIKEY_PUBLIC: process.env.MJ_APIKEY_PUBLIC ? 'SET' : 'NOT SET',
        MJ_APIKEY_PRIVATE: process.env.MJ_APIKEY_PRIVATE ? 'SET' : 'NOT SET',
        NODE_ENV: process.env.NODE_ENV || 'not set',
        NETLIFY: process.env.NETLIFY || 'not set'
      },
      mailjetTest: null,
      emailServiceTest: null
    };

    // Test Mailjet initialization
    try {
      // In dev environment, we don't have node-mailjet, so simulate the test
      if (process.env.MJ_APIKEY_PUBLIC && process.env.MJ_APIKEY_PRIVATE) {
        diagnostics.mailjetTest = {
          status: 'SUCCESS',
          message: 'Mailjet would be initialized successfully (dev mode)',
          hasKeys: true,
          apiTest: {
            status: 'SIMULATED',
            message: 'Mailjet API connection would be tested (dev mode)'
          }
        };
      } else {
        diagnostics.mailjetTest = {
          status: 'WARNING',
          message: 'Mailjet API keys not configured',
          hasKeys: false
        };
      }
    } catch (mailjetError) {
      diagnostics.mailjetTest = {
        status: 'ERROR',
        message: 'Failed to initialize Mailjet',
        error: mailjetError.message
      };
    }

    // Test email service loading (simulate)
    diagnostics.emailServiceTest = {
      status: 'SIMULATED',
      message: 'Email service would be loaded (dev mode)',
      methods: ['sendTicketCreatedEmail', 'sendCommentEmail', 'sendStatusChangeEmail']
    };

    // Test database connection (simulate)
    diagnostics.database = {
      status: 'SIMULATED',
      message: 'Database connection simulated (dev mode using mock data)'
    };

    res.json({
      message: 'Email diagnostic complete (dev mode)',
      timestamp: new Date().toISOString(),
      diagnostics
    });

  } catch (error) {
    console.error('Diagnostic error:', error);
    res.status(500).json({
      error: 'Diagnostic failed',
      message: error.message,
      stack: error.stack
    });
  }
});

app.post('/api/email-test', verifyToken, (req, res) => {
  console.log('Email test function called');
  
  if (req.user.type !== 'agent') {
    return res.status(403).json({ detail: 'Seuls les agents peuvent tester l\'envoi d\'emails' });
  }

  try {
    const { testType, recipient } = req.body;

    console.log('Testing email sending with type:', testType);
    console.log('Recipient:', recipient);

    let result;

    switch (testType) {
      case 'simple':
        // Test simple email sending (simulate)
        try {
          console.log('Attempting to send simple test email...');
          
          if (!process.env.MJ_APIKEY_PUBLIC || !process.env.MJ_APIKEY_PRIVATE) {
            return res.status(400).json({ 
              error: 'Mailjet not configured',
              detail: 'API keys not found in environment variables',
              keys: {
                public: process.env.MJ_APIKEY_PUBLIC ? 'SET' : 'NOT SET',
                private: process.env.MJ_APIKEY_PRIVATE ? 'SET' : 'NOT SET'
              }
            });
          }

          // Simulate email sending in dev mode
          result = {
            status: 'SIMULATED',
            message: 'Email would be sent successfully via Mailjet (dev mode)',
            details: {
              recipient: recipient || 'contact@voipservices.fr',
              subject: 'Test d\'envoi d\'email - Système de tickets',
              timestamp: new Date().toISOString()
            }
          };

        } catch (emailError) {
          console.error('Email sending error:', emailError);
          result = {
            status: 'ERROR',
            message: 'Failed to send email',
            error: emailError.message,
            stack: emailError.stack
          };
        }
        break;

      case 'ticket':
        // Test ticket creation email (simulate)
        try {
          // Check if we have test data
          if (mockDB.clients.length === 0 || mockDB.demandeurs.length === 0) {
            return res.status(400).json({ 
              error: 'Test data not available',
              detail: 'Need at least one client and one demandeur for ticket email test'
            });
          }

          const mockTicket = {
            id: 'test-ticket-id',
            numero_ticket: '123456',
            titre: 'Test Ticket - Email Integration',
            status: 'nouveau',
            date_creation: new Date().toISOString(),
            requete_initiale: 'Ceci est un ticket de test pour vérifier l\'envoi d\'emails.'
          };

          console.log('Testing ticket creation email...');
          result = {
            status: 'SIMULATED',
            message: 'Ticket creation email would be sent successfully (dev mode)',
            details: {
              ticket: mockTicket,
              client: mockDB.clients[0],
              demandeur: mockDB.demandeurs[0]
            }
          };

        } catch (testError) {
          console.error('Ticket email test error:', testError);
          result = {
            status: 'ERROR',
            message: 'Failed to test ticket email',
            error: testError.message
          };
        }
        break;

      default:
        return res.status(400).json({ 
          error: 'Invalid test type',
          validTypes: ['simple', 'ticket']
        });
    }

    res.json({
      message: 'Email test completed (dev mode)',
      testType,
      recipient: recipient || 'contact@voipservices.fr',
      timestamp: new Date().toISOString(),
      result
    });

  } catch (error) {
    console.error('Email test error:', error);
    res.status(500).json({
      error: 'Email test failed',
      message: error.message,
      stack: error.stack
    });
  }
});

// Demandeurs-Société endpoints (agents only)
app.get('/api/demandeurs-societe', verifyToken, (req, res) => {
  // Check if user is agent
  if (req.user.type !== 'agent') {
    return res.status(403).json({ detail: 'Accès non autorisé. Seuls les agents peuvent gérer les sociétés.' });
  }

  // Support for pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || '';
  const offset = (page - 1) * limit;

  let filteredSocietes = mockDB.demandeurs_societe;

  // Add search if present
  if (search) {
    const searchLower = search.toLowerCase();
    filteredSocietes = mockDB.demandeurs_societe.filter(societe => {
      return (
        (societe.nom_societe && societe.nom_societe.toLowerCase().includes(searchLower)) ||
        (societe.siret && societe.siret.toLowerCase().includes(searchLower)) ||
        (societe.email && societe.email.toLowerCase().includes(searchLower)) ||
        (societe.ville && societe.ville.toLowerCase().includes(searchLower))
      );
    });
  }

  // Sort results
  filteredSocietes.sort((a, b) => a.nom_societe.localeCompare(b.nom_societe));

  // Apply pagination
  const total = filteredSocietes.length;
  const totalPages = Math.ceil(total / limit);
  const paginatedSocietes = filteredSocietes.slice(offset, offset + limit);

  res.json({
    data: paginatedSocietes,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  });
});

app.post('/api/demandeurs-societe', verifyToken, (req, res) => {
  // Check if user is agent
  if (req.user.type !== 'agent') {
    return res.status(403).json({ detail: 'Accès non autorisé. Seuls les agents peuvent gérer les sociétés.' });
  }

  const { 
    nom_societe, 
    siret, 
    adresse, 
    adresse_complement, 
    code_postal, 
    ville, 
    numero_tel, 
    email,
    logo_base64
  } = req.body;
  
  if (!nom_societe || !adresse || !code_postal || !ville || !email) {
    return res.status(400).json({ 
      detail: 'Les champs obligatoires doivent être remplis: nom_societe, adresse, code_postal, ville, email' 
    });
  }

  // Check if SIRET already exists (if provided)
  if (siret) {
    const existingSiret = mockDB.demandeurs_societe.find(s => s.siret === siret);
    if (existingSiret) {
      return res.status(400).json({ detail: 'Ce SIRET est déjà utilisé' });
    }
  }

  // Check if email already exists
  const existingEmail = mockDB.demandeurs_societe.find(s => s.email === email);
  if (existingEmail) {
    return res.status(400).json({ detail: 'Cet email est déjà utilisé' });
  }
  
  const newSociete = {
    id: uuidv4(),
    nom_societe,
    siret,
    adresse,
    adresse_complement,
    code_postal,
    ville,
    numero_tel,
    email,
    logo_base64,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  mockDB.demandeurs_societe.push(newSociete);
  res.status(201).json(newSociete);
});

app.put('/api/demandeurs-societe/:id', verifyToken, (req, res) => {
  // Check if user is agent
  if (req.user.type !== 'agent') {
    return res.status(403).json({ detail: 'Accès non autorisé. Seuls les agents peuvent gérer les sociétés.' });
  }

  const societeId = req.params.id;
  const { 
    nom_societe, 
    siret, 
    adresse, 
    adresse_complement,
    code_postal, 
    ville, 
    numero_tel, 
    email,
    logo_base64
  } = req.body;
  
  const societeIndex = mockDB.demandeurs_societe.findIndex(s => s.id === societeId);
  if (societeIndex === -1) {
    return res.status(404).json({ detail: 'Société non trouvée' });
  }

  // Check if SIRET already exists for another company (if provided)
  if (siret) {
    const existingSiret = mockDB.demandeurs_societe.find(s => s.siret === siret && s.id !== societeId);
    if (existingSiret) {
      return res.status(400).json({ detail: 'Ce SIRET est déjà utilisé par une autre société' });
    }
  }

  // Check if email already exists for another company
  const existingEmail = mockDB.demandeurs_societe.find(s => s.email === email && s.id !== societeId);
  if (existingEmail) {
    return res.status(400).json({ detail: 'Cet email est déjà utilisé par une autre société' });
  }
  
  mockDB.demandeurs_societe[societeIndex] = {
    ...mockDB.demandeurs_societe[societeIndex],
    nom_societe,
    siret,
    adresse,
    adresse_complement,
    code_postal,
    ville,
    numero_tel,
    email,
    logo_base64,
    updated_at: new Date().toISOString()
  };
  
  res.json(mockDB.demandeurs_societe[societeIndex]);
});

app.delete('/api/demandeurs-societe/:id', verifyToken, (req, res) => {
  // Check if user is agent
  if (req.user.type !== 'agent') {
    return res.status(403).json({ detail: 'Accès non autorisé. Seuls les agents peuvent gérer les sociétés.' });
  }

  const societeId = req.params.id;
  
  // Check if society has associated demandeurs
  const associatedDemandeurs = mockDB.demandeurs.filter(d => d.societe_id === societeId);
  if (associatedDemandeurs.length > 0) {
    return res.status(400).json({ 
      detail: `Impossible de supprimer cette société. ${associatedDemandeurs.length} demandeur(s) y sont encore associés.` 
    });
  }

  const societeIndex = mockDB.demandeurs_societe.findIndex(s => s.id === societeId);
  if (societeIndex === -1) {
    return res.status(404).json({ detail: 'Société non trouvée' });
  }
  
  mockDB.demandeurs_societe.splice(societeIndex, 1);
  res.json({ message: 'Société supprimée avec succès' });
});

// Modified Demandeurs endpoints with dual management
app.get('/api/demandeurs', verifyToken, (req, res) => {
  let demandeurs;
  
  if (req.user.type === 'demandeur') {
    // If user is demandeur, only show demandeurs from their society
    const currentDemandeur = mockDB.demandeurs.find(d => d.email === req.user.sub);
    
    if (currentDemandeur && currentDemandeur.societe_id) {
      demandeurs = mockDB.demandeurs
        .filter(d => d.societe_id === currentDemandeur.societe_id)
        .map(d => {
          const societe = mockDB.demandeurs_societe.find(s => s.id === d.societe_id);
          return {
            ...d,
            societe_nom: societe ? societe.nom_societe : d.societe,
            type_utilisateur: 'demandeur'
          };
        });
    } else {
      // If demandeur has no society, show only themselves
      demandeurs = mockDB.demandeurs
        .filter(d => d.id === currentDemandeur.id)
        .map(d => ({
          ...d,
          societe_nom: d.societe,
          type_utilisateur: 'demandeur'
        }));
    }
  } else {
    // If user is agent, show all demandeurs
    demandeurs = mockDB.demandeurs.map(d => {
      const societe = mockDB.demandeurs_societe.find(s => s.id === d.societe_id);
      return {
        ...d,
        societe_nom: societe ? societe.nom_societe : d.societe,
        type_utilisateur: 'demandeur'
      };
    });
  }
  
  res.json(demandeurs);
});

app.post('/api/demandeurs', verifyToken, (req, res) => {
  const { nom, prenom, societe, societe_id, telephone, email, password } = req.body;
  
  if (!nom || !prenom || !email || !password) {
    return res.status(400).json({ detail: 'Les champs obligatoires doivent être remplis: nom, prenom, email, password' });
  }
  
  let createSocieteId = societe_id;
  let createSociete = societe;
  
  if (req.user.type === 'demandeur') {
    // If user is demandeur, force the society to be their own
    const currentDemandeur = mockDB.demandeurs.find(d => d.email === req.user.sub);
    if (currentDemandeur) {
      createSocieteId = currentDemandeur.societe_id;
      createSociete = currentDemandeur.societe;
    }
  }

  // If societe_id is provided, get the society name
  if (createSocieteId) {
    const societeInfo = mockDB.demandeurs_societe.find(s => s.id === createSocieteId);
    if (societeInfo) {
      createSociete = societeInfo.nom_societe;
    }
  }

  // Check if email already exists
  const existingUser = mockDB.demandeurs.find(d => d.email === email) || 
                      mockDB.agents.find(a => a.email === email);
  if (existingUser) {
    return res.status(400).json({ detail: 'Cet email est déjà utilisé' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  
  const newDemandeur = {
    id: uuidv4(),
    nom,
    prenom,
    societe: createSociete,
    societe_id: createSocieteId,
    telephone,
    email,
    password: hashedPassword,
    type_utilisateur: 'demandeur'
  };
  
  mockDB.demandeurs.push(newDemandeur);
  
  // Remove password from response
  const { password: _, ...responseDemandeur } = newDemandeur;
  res.status(201).json(responseDemandeur);
});

app.put('/api/demandeurs/:id', verifyToken, (req, res) => {
  const demandeurId = req.params.id;
  const { nom, prenom, societe, societe_id, telephone, email, password } = req.body;
  
  // Check if user can modify this demandeur
  if (req.user.type === 'demandeur') {
    const currentDemandeur = mockDB.demandeurs.find(d => d.email === req.user.sub);
    const targetDemandeur = mockDB.demandeurs.find(d => d.id === demandeurId);
    
    if (currentDemandeur.id !== demandeurId) {
      // Demandeur can only modify someone from their society
      if (!currentDemandeur.societe_id || !targetDemandeur.societe_id || 
          currentDemandeur.societe_id !== targetDemandeur.societe_id) {
        return res.status(403).json({ detail: 'Accès non autorisé' });
      }
    }
  }

  const demandeurIndex = mockDB.demandeurs.findIndex(d => d.id === demandeurId);
  if (demandeurIndex === -1) {
    return res.status(404).json({ detail: 'Demandeur non trouvé' });
  }

  let updateSocieteId = societe_id;
  let updateSociete = societe;
  
  if (req.user.type === 'demandeur') {
    // If user is demandeur, force the society to be their own
    const currentDemandeur = mockDB.demandeurs.find(d => d.email === req.user.sub);
    if (currentDemandeur) {
      updateSocieteId = currentDemandeur.societe_id;
      updateSociete = currentDemandeur.societe;
    }
  }

  // If societe_id is provided, get the society name
  if (updateSocieteId) {
    const societeInfo = mockDB.demandeurs_societe.find(s => s.id === updateSocieteId);
    if (societeInfo) {
      updateSociete = societeInfo.nom_societe;
    }
  }
  
  const hashedPassword = password ? bcrypt.hashSync(password, 10) : mockDB.demandeurs[demandeurIndex].password;
  
  mockDB.demandeurs[demandeurIndex] = {
    ...mockDB.demandeurs[demandeurIndex],
    nom,
    prenom,
    societe: updateSociete,
    societe_id: updateSocieteId,
    telephone,
    email,
    password: hashedPassword
  };
  
  // Remove password from response
  const { password: _, ...responseUpdatedDemandeur } = mockDB.demandeurs[demandeurIndex];
  responseUpdatedDemandeur.type_utilisateur = 'demandeur';
  
  res.json(responseUpdatedDemandeur);
});

app.delete('/api/demandeurs/:id', verifyToken, (req, res) => {
  const demandeurId = req.params.id;
  
  // Check if user can delete this demandeur
  if (req.user.type === 'demandeur') {
    const currentDemandeur = mockDB.demandeurs.find(d => d.email === req.user.sub);
    
    if (currentDemandeur.id === demandeurId) {
      return res.status(400).json({ detail: 'Vous ne pouvez pas supprimer votre propre compte' });
    }
    
    // Demandeur can only delete someone from their society
    const targetDemandeur = mockDB.demandeurs.find(d => d.id === demandeurId);
    if (!currentDemandeur.societe_id || !targetDemandeur.societe_id || 
        currentDemandeur.societe_id !== targetDemandeur.societe_id) {
      return res.status(403).json({ detail: 'Accès non autorisé' });
    }
  }

  const demandeurIndex = mockDB.demandeurs.findIndex(d => d.id === demandeurId);
  if (demandeurIndex === -1) {
    return res.status(404).json({ detail: 'Demandeur non trouvé' });
  }
  
  mockDB.demandeurs.splice(demandeurIndex, 1);
  res.json({ message: 'Demandeur supprimé avec succès' });
});

app.listen(PORT, () => {
  console.log(`Dev server running on http://localhost:${PORT}`);
});