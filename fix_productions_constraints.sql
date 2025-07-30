-- Correction des contraintes de la table productions
-- À exécuter sur Neon Database

-- Supprimer la contrainte foreign key sur created_by si elle existe
ALTER TABLE productions DROP CONSTRAINT IF EXISTS productions_created_by_fkey;

-- Le champ created_by peut maintenant contenir l'ID d'un agent ou d'un demandeur
-- sans contrainte de foreign key car il peut référencer deux tables différentes

-- Optionnel: Ajouter un commentaire pour clarifier
COMMENT ON COLUMN productions.created_by IS 'ID de l''utilisateur qui a créé la production (peut être un agent ou un demandeur)';

COMMIT;