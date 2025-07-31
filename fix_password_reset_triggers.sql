-- Script pour corriger les triggers qui utilisent "date_modification" au lieu de "updated_at"
-- Ce script corrige le problème des triggers PostgreSQL pour la fonctionnalité password reset

-- Supprimer les anciens triggers problématiques sur les tables agents et demandeurs
DROP TRIGGER IF EXISTS update_agents_updated_at ON agents;
DROP TRIGGER IF EXISTS update_demandeurs_updated_at ON demandeurs;

-- Créer une nouvelle fonction de trigger corrigée
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Recréer les triggers avec la fonction corrigée
CREATE TRIGGER update_agents_updated_at
    BEFORE UPDATE ON agents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_demandeurs_updated_at
    BEFORE UPDATE ON demandeurs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Vérifier que les colonnes updated_at existent bien
DO $$
BEGIN
    -- Vérifier la table agents
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agents' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE agents ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
    
    -- Vérifier la table demandeurs
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'demandeurs' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE demandeurs ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END
$$;