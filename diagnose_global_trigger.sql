-- Script de diagnostic et correction de la fonction globale update_updated_at_column
-- À exécuter dans votre base de données Neon SI le script ciblé ne fonctionne pas

-- 1. D'abord, diagnostiquer le problème en regardant le code de la fonction actuelle
SELECT prosrc FROM pg_proc WHERE proname = 'update_updated_at_column';

-- 2. Si la fonction fait référence à 'date_modification', la corriger :
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 3. Lister tous les triggers qui utilisent cette fonction (pour vérification)
SELECT 
    schemaname,
    tablename, 
    triggername
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE p.proname = 'update_updated_at_column';

-- Note: Utilisez ce script SEULEMENT si vous êtes sûr que la fonction globale 
-- référence 'date_modification' au lieu de 'updated_at'