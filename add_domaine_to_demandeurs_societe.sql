-- Ajouter le champ domaine à la table demandeurs_societe
-- Ce script ajoute un champ domaine unique et optionnel

-- Ajouter la colonne domaine
ALTER TABLE demandeurs_societe 
ADD COLUMN domaine VARCHAR(255);

-- Ajouter un index unique sur le domaine (en excluant les valeurs NULL)
CREATE UNIQUE INDEX idx_demandeurs_societe_domaine_unique 
ON demandeurs_societe (domaine) 
WHERE domaine IS NOT NULL;

-- Ajouter une contrainte de validation pour le format du domaine
ALTER TABLE demandeurs_societe 
ADD CONSTRAINT chk_domaine_format 
CHECK (
    domaine IS NULL OR 
    (domaine ~ '^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}(\.[a-zA-Z]{2,})*$' 
     AND domaine NOT LIKE 'http%' 
     AND domaine NOT LIKE 'https%')
);

-- Ajouter un commentaire pour documenter le champ
COMMENT ON COLUMN demandeurs_societe.domaine IS 'Domaine de l''entreprise pour personnalisation du login (format: example.com)';