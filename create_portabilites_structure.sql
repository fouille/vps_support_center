-- Structure de base de données pour les portabilités
-- À copier-coller dans Neon

-- Table des portabilités
CREATE TABLE IF NOT EXISTS portabilites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_portabilite VARCHAR(8) UNIQUE NOT NULL,
    demandeur_id UUID NOT NULL REFERENCES demandeurs(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    
    -- Statuts possibles
    status VARCHAR(50) DEFAULT 'nouveau' CHECK (status IN ('nouveau', 'bloque', 'rejete', 'en_cours', 'demande', 'valide', 'termine')),
    
    -- Dates
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_portabilite_demandee DATE,
    date_portabilite_effective DATE,
    
    -- Informations client
    nom_client VARCHAR(100),
    prenom_client VARCHAR(100),
    email_client VARCHAR(255),
    siret_client VARCHAR(20),
    
    -- Adresse
    adresse TEXT,
    code_postal VARCHAR(10),
    ville VARCHAR(100),
    
    -- Numéros portés
    numeros_portes TEXT NOT NULL,
    
    -- Options
    fiabilisation_demandee BOOLEAN DEFAULT FALSE,
    demande_signee BOOLEAN DEFAULT FALSE,
    
    -- Fichier PDF
    fichier_pdf_nom VARCHAR(255),
    fichier_pdf_contenu TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des échanges/commentaires sur les portabilités
CREATE TABLE IF NOT EXISTS portabilite_echanges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portabilite_id UUID NOT NULL REFERENCES portabilites(id) ON DELETE CASCADE,
    auteur_id UUID NOT NULL,
    auteur_type VARCHAR(20) NOT NULL CHECK (auteur_type IN ('demandeur', 'agent')),
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_portabilites_client_id ON portabilites(client_id);
CREATE INDEX IF NOT EXISTS idx_portabilites_demandeur_id ON portabilites(demandeur_id);
CREATE INDEX IF NOT EXISTS idx_portabilites_agent_id ON portabilites(agent_id);
CREATE INDEX IF NOT EXISTS idx_portabilites_status ON portabilites(status);
CREATE INDEX IF NOT EXISTS idx_portabilites_numero_portabilite ON portabilites(numero_portabilite);
CREATE INDEX IF NOT EXISTS idx_portabilites_date_portabilite_effective ON portabilites(date_portabilite_effective);
CREATE INDEX IF NOT EXISTS idx_portabilite_echanges_portabilite_id ON portabilite_echanges(portabilite_id);
CREATE INDEX IF NOT EXISTS idx_portabilite_echanges_created_at ON portabilite_echanges(created_at);

-- Fonction pour générer un numéro de portabilité aléatoire (8 chiffres)
CREATE OR REPLACE FUNCTION generate_portabilite_number()
RETURNS VARCHAR(8) AS $$
DECLARE
    portabilite_num VARCHAR(8);
    num_exists BOOLEAN;
BEGIN
    LOOP
        -- Générer un nombre aléatoire de 8 chiffres (10000000 à 99999999)
        portabilite_num := LPAD((FLOOR(RANDOM() * 90000000) + 10000000)::TEXT, 8, '0');
        
        -- Vérifier si ce numéro existe déjà
        SELECT EXISTS(SELECT 1 FROM portabilites WHERE numero_portabilite = portabilite_num) INTO num_exists;
        
        -- Si le numéro n'existe pas, on peut l'utiliser
        IF NOT num_exists THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN portabilite_num;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour générer automatiquement le numéro lors de l'insertion
CREATE OR REPLACE FUNCTION set_portabilite_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.numero_portabilite IS NULL OR NEW.numero_portabilite = '' THEN
        NEW.numero_portabilite := generate_portabilite_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_portabilite_number
    BEFORE INSERT ON portabilites
    FOR EACH ROW
    EXECUTE FUNCTION set_portabilite_number();

-- Trigger pour mettre à jour automatiquement updated_at
CREATE TRIGGER update_portabilites_updated_at 
    BEFORE UPDATE ON portabilites 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Données de test (optionnel)
-- Insertion d'une portabilité de test
INSERT INTO portabilites (
    demandeur_id, 
    client_id, 
    numeros_portes, 
    nom_client, 
    prenom_client, 
    email_client,
    adresse,
    code_postal,
    ville,
    date_portabilite_demandee
) 
SELECT 
    d.id, 
    c.id, 
    '0123456789, 0987654321',
    'Dupont',
    'Jean',
    'jean.dupont@example.com',
    '123 Rue de la Portabilité',
    '75001',
    'Paris',
    CURRENT_DATE + INTERVAL '7 days'
FROM demandeurs d, clients c 
WHERE d.email = 'sophie.martin@techcorp.fr' 
AND c.nom_societe = 'TechCorp SARL'
LIMIT 1
ON CONFLICT DO NOTHING;