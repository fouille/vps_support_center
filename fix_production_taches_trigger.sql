-- Correction du trigger pour les tâches de production
-- Le trigger automatique interfère avec les mises à jour manuelles dans l'API

-- Supprimer le trigger automatique car nous gérons date_modification manuellement dans l'API
DROP TRIGGER IF EXISTS update_production_taches_updated_at ON production_taches;

-- Optionnel: Garder seulement le trigger pour la table productions principale
-- DROP TRIGGER IF EXISTS update_productions_updated_at ON productions;

-- La fonction update_updated_at_column peut rester pour d'autres usages potentiels

COMMIT;