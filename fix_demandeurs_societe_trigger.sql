-- Script pour corriger le trigger défaillant sur la table demandeurs_societe
-- À exécuter dans Neon Database

-- Vérifier les triggers existants sur la table demandeurs_societe
-- (pour information seulement)
-- SELECT t.tgname AS trigger_name, c.relname AS table_name
-- FROM pg_trigger t 
-- JOIN pg_class c ON t.tgrelid = c.oid
-- WHERE c.relname = 'demandeurs_societe';

-- Option 1: Supprimer le trigger défaillant sur demandeurs_societe uniquement
DROP TRIGGER IF EXISTS update_demandeurs_societe_updated_at ON demandeurs_societe;

-- Option 2: Si le trigger s'appelle différemment, essayer ces variantes :
DROP TRIGGER IF EXISTS update_updated_at_trigger ON demandeurs_societe;
DROP TRIGGER IF EXISTS trg_update_updated_at ON demandeurs_societe;
DROP TRIGGER IF EXISTS updated_at_trigger ON demandeurs_societe;

-- Recréer un trigger correct qui utilise le bon nom de colonne (updated_at)
CREATE OR REPLACE FUNCTION update_demandeurs_societe_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Créer le nouveau trigger correct pour demandeurs_societe
CREATE TRIGGER update_demandeurs_societe_updated_at
    BEFORE UPDATE ON demandeurs_societe
    FOR EACH ROW
    EXECUTE FUNCTION update_demandeurs_societe_timestamp();

-- Note: Cette solution crée un trigger spécifique pour demandeurs_societe 
-- qui utilise le bon nom de colonne (updated_at) au lieu de date_modification