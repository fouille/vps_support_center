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
      password: '$2a$10$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYq.9mXR8Xt1n4u' // password123
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
  res.json(mockDB.clients);
});

app.post('/api/clients', verifyToken, (req, res) => {
  const { nom_societe, adresse, nom, prenom } = req.body;
  if (!nom_societe || !adresse || !nom || !prenom) {
    return res.status(400).json({ detail: 'Tous les champs sont requis' });
  }
  
  const client = { id: uuidv4(), ...req.body };
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

// Tickets endpoints
app.get('/api/tickets', (req, res) => {
  // Add some mock tickets for testing
  if (mockDB.tickets.length === 0) {
    const testTicket = {
      id: uuidv4(),
      titre: 'Test Ticket',
      client_id: uuidv4(),
      demandeur_id: uuidv4(),
      agent_id: mockDB.agents[0].id,
      status: 'nouveau',
      date_creation: new Date().toISOString(),
      requete_initiale: 'Test ticket for comment testing'
    };
    mockDB.tickets.push(testTicket);
    
    // Add mock ticket_echanges
    mockDB.ticket_echanges = [
      {
        id: uuidv4(),
        ticket_id: testTicket.id,
        auteur_id: mockDB.agents[0].id,
        auteur_type: 'agent',
        message: 'Initial comment from agent',
        created_at: new Date().toISOString(),
        auteur_nom: 'ADMIN Franck'
      }
    ];
  }
  res.json(mockDB.tickets);
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