-- Script de correction de la structure des portabilités
-- Supprime les colonnes fichier_pdf_nom et fichier_pdf_contenu de la table portabilites

-- 1. Migrer les données existantes des colonnes vers la table portabilite_fichiers
INSERT INTO portabilite_fichiers (portabilite_id, nom_fichier, type_fichier, taille_fichier, contenu_base64, uploaded_by, uploaded_at)
SELECT 
    p.id as portabilite_id,
    p.fichier_pdf_nom as nom_fichier,
    'application/pdf' as type_fichier,
    LENGTH(p.fichier_pdf_contenu) as taille_fichier,
    p.fichier_pdf_contenu as contenu_base64,
    p.demandeur_id as uploaded_by,
    p.created_at as uploaded_at
FROM portabilites p
WHERE p.fichier_pdf_nom IS NOT NULL 
  AND p.fichier_pdf_nom != ''
  AND p.fichier_pdf_contenu IS NOT NULL 
  AND p.fichier_pdf_contenu != ''
  AND NOT EXISTS (
    SELECT 1 FROM portabilite_fichiers pf 
    WHERE pf.portabilite_id = p.id 
    AND pf.nom_fichier = p.fichier_pdf_nom
  );

-- 2. Supprimer les colonnes inutiles de la table portabilites
ALTER TABLE portabilites DROP COLUMN IF EXISTS fichier_pdf_nom;
ALTER TABLE portabilites DROP COLUMN IF EXISTS fichier_pdf_contenu;

-- 3. Vérifier que la table portabilite_fichiers a la bonne structure
-- (Les colonnes devraient déjà exister mais on s'assure)
DO $$
BEGIN
    -- Vérifier et ajouter la colonne type_fichier si elle n'existe pas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'portabilite_fichiers' AND column_name = 'type_fichier') THEN
        ALTER TABLE portabilite_fichiers ADD COLUMN type_fichier VARCHAR(100);
    END IF;
    
    -- Vérifier et ajouter la colonne taille_fichier si elle n'existe pas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'portabilite_fichiers' AND column_name = 'taille_fichier') THEN
        ALTER TABLE portabilite_fichiers ADD COLUMN taille_fichier INTEGER;
    END IF;
END $$;

-- 4. Mettre à jour les types de fichiers existants si nécessaire
UPDATE portabilite_fichiers 
SET type_fichier = 'application/pdf' 
WHERE type_fichier IS NULL AND nom_fichier ILIKE '%.pdf';

UPDATE portabilite_fichiers 
SET type_fichier = 'image/jpeg' 
WHERE type_fichier IS NULL AND (nom_fichier ILIKE '%.jpg' OR nom_fichier ILIKE '%.jpeg');

UPDATE portabilite_fichiers 
SET type_fichier = 'image/png' 
WHERE type_fichier IS NULL AND nom_fichier ILIKE '%.png';

-- 5. Ajouter un commentaire automatique pour les fichiers migrés
INSERT INTO portabilite_echanges (portabilite_id, auteur_id, auteur_type, message, created_at)
SELECT 
    pf.portabilite_id,
    pf.uploaded_by,
    'demandeur' as auteur_type,
    '📄 Fichier migré: ' || pf.nom_fichier as message,
    pf.uploaded_at
FROM portabilite_fichiers pf
WHERE pf.uploaded_at < NOW() - INTERVAL '1 hour'  -- Fichiers migrés (plus anciens)
  AND NOT EXISTS (
    SELECT 1 FROM portabilite_echanges pe 
    WHERE pe.portabilite_id = pf.portabilite_id 
    AND pe.message LIKE '%Fichier migré: ' || pf.nom_fichier || '%'
  );

COMMIT;