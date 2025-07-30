-- Script de correction CIBLÉ pour le trigger clients uniquement
-- À exécuter dans votre base de données Neon

-- 1. Supprimer seulement le trigger sur la table clients
DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;

-- 2. Créer une fonction spécifique pour les clients (pour éviter les conflits)
CREATE OR REPLACE FUNCTION update_clients_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 3. Recréer le trigger clients avec la fonction spécifique
CREATE TRIGGER update_clients_updated_at 
    BEFORE UPDATE ON clients 
    FOR EACH ROW 
    EXECUTE FUNCTION update_clients_updated_at_column();

-- Alternative si vous préférez corriger la fonction globale :
-- Décommentez les lignes suivantes SEULEMENT si vous êtes sûr que 
-- la fonction globale fait référence à 'date_modification' au lieu de 'updated_at'

-- CREATE OR REPLACE FUNCTION update_updated_at_column()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     NEW.updated_at = CURRENT_TIMESTAMP;
--     RETURN NEW;
-- END;
-- $$ language 'plpgsql';

-- Note: Ce script crée une fonction spécifique pour éviter d'affecter 
-- les autres tables qui utilisent update_updated_at_column()