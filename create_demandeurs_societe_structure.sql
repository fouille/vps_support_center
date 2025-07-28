-- Structure de la table demandeurs_societe
-- À copier-coller dans Neon Database

-- Table des sociétés de demandeurs
CREATE TABLE IF NOT EXISTS demandeurs_societe (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom_societe VARCHAR(255) NOT NULL,
    siret VARCHAR(14) UNIQUE,
    adresse TEXT NOT NULL,
    adresse_complement TEXT,
    code_postal VARCHAR(10) NOT NULL,
    ville VARCHAR(100) NOT NULL,
    numero_tel VARCHAR(20),
    email VARCHAR(255) NOT NULL,
    logo_base64 TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Modification de la table demandeurs pour ajouter la référence à la société
ALTER TABLE demandeurs ADD COLUMN IF NOT EXISTS societe_id UUID REFERENCES demandeurs_societe(id) ON DELETE SET NULL;

-- Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_demandeurs_societe_siret ON demandeurs_societe(siret);
CREATE INDEX IF NOT EXISTS idx_demandeurs_societe_email ON demandeurs_societe(email);
CREATE INDEX IF NOT EXISTS idx_demandeurs_societe_nom ON demandeurs_societe(nom_societe);
CREATE INDEX IF NOT EXISTS idx_demandeurs_societe_id ON demandeurs(societe_id);

-- Trigger pour mettre à jour automatiquement updated_at
CREATE TRIGGER update_demandeurs_societe_updated_at 
    BEFORE UPDATE ON demandeurs_societe 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Exemple de données de test (optionnel)
INSERT INTO demandeurs_societe (nom_societe, siret, adresse, code_postal, ville, numero_tel, email)
VALUES 
    ('TechCorp SARL', '12345678901234', '123 Avenue des Champs-Élysées', '75008', 'Paris', '0123456789', 'contact@techcorp.fr'),
    ('InnoVoice Solutions', '98765432109876', '456 Rue de la Paix', '69002', 'Lyon', '0456789123', 'info@innovoice.com')
ON CONFLICT (siret) DO NOTHING;