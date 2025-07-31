-- Création de la table pour les logs de connexion
-- À exécuter dans Neon Database

-- Table pour stocker les logs de connexions/déconnexions
CREATE TABLE IF NOT EXISTS connexions_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('agent', 'demandeur')),
    user_email VARCHAR(255) NOT NULL,
    user_nom VARCHAR(100),
    user_prenom VARCHAR(100),
    action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('login', 'logout')),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_connexions_logs_created_at ON connexions_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_connexions_logs_user_id ON connexions_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_connexions_logs_user_type ON connexions_logs(user_type);
CREATE INDEX IF NOT EXISTS idx_connexions_logs_action_type ON connexions_logs(action_type);

-- Commentaires pour documentation
COMMENT ON TABLE connexions_logs IS 'Table pour stocker les logs de connexions et déconnexions des utilisateurs';
COMMENT ON COLUMN connexions_logs.id IS 'Identifiant unique du log';
COMMENT ON COLUMN connexions_logs.user_id IS 'ID de l''utilisateur (agent ou demandeur)';
COMMENT ON COLUMN connexions_logs.user_type IS 'Type d''utilisateur : agent ou demandeur';
COMMENT ON COLUMN connexions_logs.user_email IS 'Email de l''utilisateur';
COMMENT ON COLUMN connexions_logs.user_nom IS 'Nom de l''utilisateur';
COMMENT ON COLUMN connexions_logs.user_prenom IS 'Prénom de l''utilisateur';
COMMENT ON COLUMN connexions_logs.action_type IS 'Type d''action : login ou logout';
COMMENT ON COLUMN connexions_logs.ip_address IS 'Adresse IP de l''utilisateur (optionnel)';
COMMENT ON COLUMN connexions_logs.user_agent IS 'User-Agent du navigateur (optionnel)';
COMMENT ON COLUMN connexions_logs.created_at IS 'Date et heure de création du log';