-- Script de migration pour modifier la structure de la table clients
-- Ajout du champ "numero" (téléphone) et rendre nom/prenom optionnels

-- Ajouter le champ numero (téléphone)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS numero VARCHAR(20);

-- Rendre les champs nom et prenom optionnels (supprimer la contrainte NOT NULL)
ALTER TABLE clients ALTER COLUMN nom DROP NOT NULL;
ALTER TABLE clients ALTER COLUMN prenom DROP NOT NULL;

-- Optionnel: Mettre à jour les données existantes si nécessaire
-- UPDATE clients SET numero = '' WHERE numero IS NULL;

-- Vérifier la structure mise à jour
-- SELECT column_name, is_nullable, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'clients' 
-- ORDER BY ordinal_position;