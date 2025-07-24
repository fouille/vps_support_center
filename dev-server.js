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
  demandeurs: [
    {
      id: uuidv4(),
      nom: 'Martin',
      prenom: 'Sophie',
      societe: 'TechCorp SARL',
      telephone: '0123456789',
      email: 'sophie.martin@techcorp.fr',
      password: '$2a$10$GdyKzfgy3bdkrOsi6weev.8V3msbHhiuRrKM4m3PUwMCf7ShDYv6G' // password123
    }
  ],
  clients: [],
  tickets: []
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
      { sub: user.email, type: userType },
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

// Demandeurs endpoints
app.get('/api/demandeurs', verifyToken, (req, res) => {
  const demandeurs = mockDB.demandeurs.map(d => ({
    ...d,
    type_utilisateur: 'demandeur',
    password: undefined
  }));
  res.json(demandeurs);
});

app.post('/api/demandeurs', verifyToken, async (req, res) => {
  const { nom, prenom, societe, telephone, email, password } = req.body;
  
  if (!nom || !prenom || !societe || !email || !password) {
    return res.status(400).json({ detail: 'Tous les champs obligatoires doivent être remplis' });
  }

  // Check if email exists
  const existingUser = [...mockDB.demandeurs, ...mockDB.agents].find(u => u.email === email);
  if (existingUser) {
    return res.status(400).json({ detail: 'Cet email est déjà utilisé' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const demandeur = {
    id: uuidv4(),
    nom,
    prenom,
    societe,
    telephone,
    email,
    password: hashedPassword
  };
  
  mockDB.demandeurs.push(demandeur);
  
  const { password: _, ...response } = demandeur;
  response.type_utilisateur = 'demandeur';
  
  res.status(201).json(response);
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

app.listen(PORT, () => {
  console.log(`Dev server running on http://localhost:${PORT}`);
});