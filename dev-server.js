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
  demandeurs: [],
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
  res.json(mockDB.tickets);
});

app.listen(PORT, () => {
  console.log(`Dev server running on http://localhost:${PORT}`);
});