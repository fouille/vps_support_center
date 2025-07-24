-- Script pour ajouter le statut "repondu" à la contrainte existante
-- À exécuter dans Neon Database

-- Supprimer l'ancienne contrainte
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;

-- Ajouter la nouvelle contrainte avec "repondu"
ALTER TABLE tickets ADD CONSTRAINT tickets_status_check 
CHECK (status IN ('nouveau', 'en_cours', 'en_attente', 'repondu', 'resolu', 'ferme'));