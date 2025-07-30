-- Correction des contraintes de la table productions
-- À exécuter sur Neon Database

-- Supprimer la contrainte foreign key sur created_by si elle existe
ALTER TABLE productions DROP CONSTRAINT IF EXISTS productions_created_by_fkey;

-- Supprimer la contrainte foreign key sur auteur_id dans production_tache_commentaires
ALTER TABLE production_tache_commentaires DROP CONSTRAINT IF EXISTS production_tache_commentaires_auteur_id_fkey;

-- Les champs created_by et auteur_id peuvent maintenant contenir l'ID d'un agent ou d'un demandeur
-- sans contrainte de foreign key car ils peuvent référencer deux tables différentes

-- Optionnel: Ajouter des commentaires pour clarifier
COMMENT ON COLUMN productions.created_by IS 'ID de l''utilisateur qui a créé la production (peut être un agent ou un demandeur)';
COMMENT ON COLUMN production_tache_commentaires.auteur_id IS 'ID de l''utilisateur qui a écrit le commentaire (peut être un agent ou un demandeur)';

COMMIT;