-- Structure de base de données pour le système de gestion de tickets
-- À copier-coller dans Neon

-- Table des clients finaux
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom_societe VARCHAR(255) NOT NULL,
    adresse TEXT NOT NULL,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des demandeurs (créateurs de tickets)
CREATE TABLE IF NOT EXISTS demandeurs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    societe VARCHAR(255) NOT NULL,
    telephone VARCHAR(20),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des agents (gestionnaires de tickets)
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    societe VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des tickets
CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titre VARCHAR(255) NOT NULL,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    demandeur_id UUID NOT NULL REFERENCES demandeurs(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'nouveau' CHECK (status IN ('nouveau', 'en_cours', 'en_attente', 'resolu', 'ferme')),
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_fin_prevue TIMESTAMP,
    date_cloture TIMESTAMP,
    requete_initiale TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des fichiers liés aux tickets
CREATE TABLE IF NOT EXISTS ticket_fichiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    nom_fichier VARCHAR(255) NOT NULL,
    type_fichier VARCHAR(100),
    taille_fichier INTEGER,
    contenu_base64 TEXT NOT NULL,
    uploaded_by UUID NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des échanges/commentaires sur les tickets
CREATE TABLE IF NOT EXISTS ticket_echanges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    auteur_id UUID NOT NULL,
    auteur_type VARCHAR(20) NOT NULL CHECK (auteur_type IN ('demandeur', 'agent')),
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des échanges/commentaires sur les tickets
CREATE TABLE IF NOT EXISTS ticket_echanges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    auteur_id UUID NOT NULL,
    auteur_type VARCHAR(20) NOT NULL CHECK (auteur_type IN ('demandeur', 'agent')),
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_tickets_client_id ON tickets(client_id);
CREATE INDEX IF NOT EXISTS idx_tickets_demandeur_id ON tickets(demandeur_id);
CREATE INDEX IF NOT EXISTS idx_tickets_agent_id ON tickets(agent_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_ticket_fichiers_ticket_id ON ticket_fichiers(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_echanges_ticket_id ON ticket_echanges(ticket_id);
CREATE INDEX IF NOT EXISTS idx_demandeurs_email ON demandeurs(email);
CREATE INDEX IF NOT EXISTS idx_agents_email ON agents(email);
CREATE INDEX IF NOT EXISTS idx_demandeurs_societe ON demandeurs(societe);

-- Trigger pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_demandeurs_updated_at BEFORE UPDATE ON demandeurs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Données de test et utilisateur admin par défaut
-- Insertion d'un client de test
INSERT INTO clients (nom_societe, adresse, nom, prenom) 
VALUES ('TechCorp SARL', '123 Avenue des Champs, 75008 Paris', 'Dupont', 'Jean')
ON CONFLICT DO NOTHING;

-- Insertion d'un demandeur de test
INSERT INTO demandeurs (nom, prenom, societe, telephone, email, password)
VALUES ('Martin', 'Sophie', 'TechCorp SARL', '0123456789', 'sophie.martin@techcorp.fr', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYq.9mXR8Xt1n4u')
ON CONFLICT DO NOTHING;

-- Insertion de l'utilisateur admin par défaut
-- Mot de passe : admin1234! (hashé avec bcrypt, coût 10)
INSERT INTO agents (nom, prenom, email, password, societe)
VALUES ('ADMIN', 'Franck', 'admin@voipservices.fr', '$2a$10$dmRNBo8wCcE3.5HCGMf3Le/tTIUcwdLDaSLtugn/JZFq9GwHcF/We', 'VoIP Services')
ON CONFLICT (email) DO NOTHING;