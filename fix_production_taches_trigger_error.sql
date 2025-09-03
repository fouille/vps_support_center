-- Fix pour l'erreur : record "new" has no field "updated_at"
-- Le trigger essaie d'assigner NEW.updated_at mais la table production_taches utilise date_modification

-- Supprimer le trigger problématique
DROP TRIGGER IF EXISTS update_production_taches_updated_at ON production_taches;

-- Alternative: créer une fonction spécifique pour production_taches si on veut garder le trigger
-- CREATE OR REPLACE FUNCTION update_production_taches_timestamp()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     NEW.date_modification = CURRENT_TIMESTAMP;
--     RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- CREATE TRIGGER update_production_taches_timestamp_trigger
--     BEFORE UPDATE ON production_taches
--     FOR EACH ROW
--     EXECUTE FUNCTION update_production_taches_timestamp();

-- Mais comme l'API gère déjà date_modification manuellement, on supprime juste le trigger

COMMIT;