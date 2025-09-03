-- Ajout des champs favicon_base64 et nom_application à la table demandeurs_societe

-- Ajout du champ favicon_base64 (fichier .ico en base64)
ALTER TABLE demandeurs_societe 
ADD COLUMN IF NOT EXISTS favicon_base64 TEXT;

-- Ajout du champ nom_application (nom personnalisé de l'application)
ALTER TABLE demandeurs_societe 
ADD COLUMN IF NOT EXISTS nom_application VARCHAR(100);

-- Commentaires pour documentation
COMMENT ON COLUMN demandeurs_societe.favicon_base64 IS 'Favicon de la société en format base64 (fichier .ico)';
COMMENT ON COLUMN demandeurs_societe.nom_application IS 'Nom personnalisé de l application pour cette société';

COMMIT;