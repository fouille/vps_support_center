-- Script de correction pour la contrainte de domaine
-- À exécuter si vous avez déjà appliqué le script initial avec la regex restrictive

-- Supprimer l'ancienne contrainte
ALTER TABLE demandeurs_societe 
DROP CONSTRAINT IF EXISTS chk_domaine_format;

-- Ajouter la nouvelle contrainte corrigée
ALTER TABLE demandeurs_societe 
ADD CONSTRAINT chk_domaine_format 
CHECK (
    domaine IS NULL OR 
    (domaine ~ '^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]$' 
     AND domaine NOT LIKE 'http%' 
     AND domaine NOT LIKE 'https%'
     AND length(domaine) >= 4
     AND domaine LIKE '%.%')
);