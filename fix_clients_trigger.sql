-- Script de correction pour le trigger update_updated_at_column
-- À exécuter dans votre base de données Neon

-- Supprimer le trigger existant sur la table clients (au cas où il serait corrompu)
DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;

-- Supprimer la fonction existante si elle est corrompue
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Recréer la fonction correctement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Recréer le trigger pour la table clients
CREATE TRIGGER update_clients_updated_at 
    BEFORE UPDATE ON clients 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Note: Ce script corrige le problème du trigger qui référençait 'date_modification' 
-- au lieu de 'updated_at' dans la table clients