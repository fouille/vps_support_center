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
    res.status(500).json({ detail: 'Erreur serveur' });
  }
});

// Clients endpoints
app.get('/api/clients', (req, res) => {
  res.json(mockDB.clients);
});

app.post('/api/clients', (req, res) => {
  const client = { id: uuidv4(), ...req.body };
  mockDB.clients.push(client);
  res.status(201).json(client);
});

// Demandeurs endpoints
app.get('/api/demandeurs', (req, res) => {
  const demandeurs = mockDB.demandeurs.map(d => ({
    ...d,
    type_utilisateur: 'demandeur',
    password: undefined
  }));
  res.json(demandeurs);
});

// Agents endpoints
app.get('/api/agents', (req, res) => {
  const agents = mockDB.agents.map(a => ({
    ...a,
    type_utilisateur: 'agent',
    password: undefined
  }));
  res.json(agents);
});

// Tickets endpoints
app.get('/api/tickets', (req, res) => {
  res.json(mockDB.tickets);
});

app.listen(PORT, () => {
  console.log(`Dev server running on http://localhost:${PORT}`);
});