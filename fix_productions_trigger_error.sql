-- Fix pour l'erreur : record "new" has no field "updated_at" sur la table productions
-- Le trigger essaie d'assigner NEW.updated_at mais la table productions utilise date_modification

-- Supprimer le trigger problématique
DROP TRIGGER IF EXISTS update_productions_updated_at ON productions;

-- Alternative: créer une fonction spécifique pour productions si on veut garder le trigger
-- CREATE OR REPLACE FUNCTION update_productions_timestamp()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     NEW.date_modification = CURRENT_TIMESTAMP;
--     RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- CREATE TRIGGER update_productions_timestamp_trigger
--     BEFORE UPDATE ON productions
--     FOR EACH ROW
--     EXECUTE FUNCTION update_productions_timestamp();

-- Mais comme l'API gère déjà date_modification manuellement (ligne 455), on supprime juste le trigger

COMMIT;