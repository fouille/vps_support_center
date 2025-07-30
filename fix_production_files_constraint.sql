-- Correction de la contrainte foreign key sur uploaded_by
-- Le champ uploaded_by peut contenir l'ID d'un agent ou d'un demandeur

-- Supprimer la contrainte foreign key sur uploaded_by si elle existe
ALTER TABLE production_tache_fichiers DROP CONSTRAINT IF EXISTS production_tache_fichiers_uploaded_by_fkey;

-- Ajouter un commentaire pour clarifier
COMMENT ON COLUMN production_tache_fichiers.uploaded_by IS 'ID de l''utilisateur qui a uploadé le fichier (peut être un agent ou un demandeur)';

COMMIT;