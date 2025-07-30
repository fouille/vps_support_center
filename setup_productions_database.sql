-- SCRIPT COMPLET POUR SETUP DES PRODUCTIONS
-- À exécuter sur Neon Database
-- Ce script crée les tables ET corrige les contraintes

-- 1. Fonction pour update_updated_at_column si elle n'existe pas
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.date_modification = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Structure de base de données pour les Productions
-- Table principale des demandes de production
CREATE TABLE IF NOT EXISTS productions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_production VARCHAR(8) UNIQUE NOT NULL,
    demandeur_id UUID NOT NULL REFERENCES demandeurs(id),
    client_id UUID NOT NULL REFERENCES clients(id),
    societe_id UUID NOT NULL REFERENCES demandeurs_societe(id),
    titre VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'en_attente' CHECK (status IN ('en_attente', 'en_cours', 'bloque', 'termine', 'annule')),
    priorite VARCHAR(20) DEFAULT 'normale' CHECK (priorite IN ('basse', 'normale', 'haute', 'urgente')),
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_livraison_prevue DATE,
    created_by UUID,  -- Peut être soit un agent soit un demandeur, pas de FK contrainte
    assigned_to UUID REFERENCES demandeurs(id)
);

-- Table des tâches de production (avec les 12 tâches prédéfinies)
CREATE TABLE IF NOT EXISTS production_taches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    production_id UUID NOT NULL REFERENCES productions(id) ON DELETE CASCADE,
    nom_tache VARCHAR(100) NOT NULL,
    ordre_tache INTEGER NOT NULL,
    descriptif TEXT,
    status VARCHAR(50) DEFAULT 'a_faire' CHECK (status IN ('a_faire', 'en_cours', 'hors_scope', 'bloque', 'attente_installation', 'termine')),
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_livraison DATE,
    commentaire_interne TEXT
);

-- Table des commentaires sur les tâches de production
CREATE TABLE IF NOT EXISTS production_tache_commentaires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    production_tache_id UUID NOT NULL REFERENCES production_taches(id) ON DELETE CASCADE,
    auteur_id UUID NOT NULL,  -- Peut être soit un agent soit un demandeur, pas de FK contrainte
    contenu TEXT NOT NULL,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    type_commentaire VARCHAR(50) DEFAULT 'commentaire' CHECK (type_commentaire IN ('commentaire', 'status_change', 'file_upload', 'file_delete'))
);

-- Table des fichiers attachés aux tâches de production
CREATE TABLE IF NOT EXISTS production_tache_fichiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    production_tache_id UUID NOT NULL REFERENCES production_taches(id) ON DELETE CASCADE,
    nom_fichier VARCHAR(255) NOT NULL,
    type_fichier VARCHAR(100),
    taille_fichier INTEGER,
    contenu_base64 TEXT NOT NULL,
    uploaded_by UUID NOT NULL,  -- Peut être soit un agent soit un demandeur, pas de FK contrainte
    date_upload TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_productions_demandeur ON productions(demandeur_id);
CREATE INDEX IF NOT EXISTS idx_productions_client ON productions(client_id);
CREATE INDEX IF NOT EXISTS idx_productions_societe ON productions(societe_id);
CREATE INDEX IF NOT EXISTS idx_productions_status ON productions(status);
CREATE INDEX IF NOT EXISTS idx_productions_numero_production ON productions(numero_production);
CREATE INDEX IF NOT EXISTS idx_production_taches_production ON production_taches(production_id);
CREATE INDEX IF NOT EXISTS idx_production_tache_commentaires_tache ON production_tache_commentaires(production_tache_id);
CREATE INDEX IF NOT EXISTS idx_production_tache_fichiers_tache ON production_tache_fichiers(production_tache_id);

-- 4. Fonction pour générer un numéro de production aléatoire (8 chiffres)
CREATE OR REPLACE FUNCTION generate_production_number()
RETURNS VARCHAR(8) AS $$
DECLARE
    production_num VARCHAR(8);
    num_exists BOOLEAN;
BEGIN
    LOOP
        -- Générer un nombre aléatoire de 8 chiffres (10000000 à 99999999)
        production_num := LPAD((FLOOR(RANDOM() * 90000000) + 10000000)::TEXT, 8, '0');
        
        -- Vérifier si ce numéro existe déjà
        SELECT EXISTS(SELECT 1 FROM productions WHERE numero_production = production_num) INTO num_exists;
        
        -- Si le numéro n'existe pas, on peut l'utiliser
        IF NOT num_exists THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN production_num;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger pour générer automatiquement le numéro lors de l'insertion
CREATE OR REPLACE FUNCTION set_production_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.numero_production IS NULL OR NEW.numero_production = '' THEN
        NEW.numero_production := generate_production_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_production_number
    BEFORE INSERT ON productions
    FOR EACH ROW
    EXECUTE FUNCTION set_production_number();

-- 6. Trigger pour mettre à jour automatiquement date_modification
-- Note: Les triggers sont supprimés car les APIs gèrent manuellement date_modification
-- CREATE TRIGGER update_productions_updated_at 
--     BEFORE UPDATE ON productions 
--     FOR EACH ROW 
--     EXECUTE FUNCTION update_updated_at_column();

-- CREATE TRIGGER update_production_taches_updated_at 
--     BEFORE UPDATE ON production_taches 
--     FOR EACH ROW 
--     EXECUTE FUNCTION update_updated_at_column();

-- Les triggers automatiques sont désactivés pour éviter les conflits avec les mises à jour manuelles dans les APIs

-- 7. Fonction pour créer automatiquement les 12 taches prédéfinies
CREATE OR REPLACE FUNCTION create_default_production_tasks(production_id_param UUID)
RETURNS VOID AS $$
DECLARE
    task_names TEXT[] := ARRAY[
        'Portabilité',
        'Fichier de collecte', 
        'Poste fixe',
        'Lien internet',
        'Netgate (reception)',
        'Netgate (configuration)',
        'Netgate (retour)',
        'Déploiement Siprouter',
        'Déploiement SIP2 ou SIP3 ou SIP4',
        'Routages',
        'Trunk Only',
        'Facturation'
    ];
    i INTEGER;
BEGIN
    FOR i IN 1..array_length(task_names, 1) LOOP
        INSERT INTO production_taches (production_id, nom_tache, ordre_tache, descriptif)
        VALUES (
            production_id_param,
            task_names[i],
            i,
            'Tâche ' || task_names[i] || ' - À configurer selon les besoins du client'
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 8. Trigger pour créer automatiquement les tâches lors de la création d'une production
CREATE OR REPLACE FUNCTION trigger_create_production_tasks()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM create_default_production_tasks(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_default_tasks
    AFTER INSERT ON productions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_create_production_tasks();

-- 9. Supprimer les contraintes problématiques si elles existent
ALTER TABLE productions DROP CONSTRAINT IF EXISTS productions_created_by_fkey;
ALTER TABLE production_tache_commentaires DROP CONSTRAINT IF EXISTS production_tache_commentaires_auteur_id_fkey;
ALTER TABLE production_tache_fichiers DROP CONSTRAINT IF EXISTS production_tache_fichiers_uploaded_by_fkey;

-- 10. Commentaires pour clarifier les champs sans contrainte FK
COMMENT ON COLUMN productions.created_by IS 'ID de l''utilisateur qui a créé la production (peut être un agent ou un demandeur)';
COMMENT ON COLUMN production_tache_commentaires.auteur_id IS 'ID de l''utilisateur qui a écrit le commentaire (peut être un agent ou un demandeur)';
COMMENT ON COLUMN production_tache_fichiers.uploaded_by IS 'ID de l''utilisateur qui a uploadé le fichier (peut être un agent ou un demandeur)';

-- 11. Créer une production de test UNIQUEMENT si les tables requises existent
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name IN ('demandeurs', 'clients', 'demandeurs_societe')
    ) THEN
        INSERT INTO productions (
            demandeur_id, 
            client_id, 
            societe_id,
            titre,
            description,
            date_livraison_prevue
        ) 
        SELECT 
            d.id, 
            c.id, 
            d.societe_id,
            'Production Test - ' || c.nom_societe,
            'Production de test pour démonstration des fonctionnalités',
            CURRENT_DATE + INTERVAL '30 days'
        FROM demandeurs d, clients c 
        WHERE d.email = 'sophie.martin@techcorp.fr' 
        AND c.nom_societe = 'TechCorp SARL'
        AND d.societe_id IS NOT NULL
        LIMIT 1
        ON CONFLICT DO NOTHING;
    END IF;
END$$;

COMMIT;