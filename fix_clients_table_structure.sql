-- Script de correction pour la table clients
-- À exécuter dans votre base de données Neon pour corriger les problèmes de modification

-- Permettre les valeurs NULL pour nom et prenom (optionnels)
ALTER TABLE clients ALTER COLUMN nom DROP NOT NULL;
ALTER TABLE clients ALTER COLUMN prenom DROP NOT NULL;

-- Ajouter la colonne numero si elle n'existe pas (pour les numéros de téléphone)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS numero VARCHAR(20);

-- Vérifier que updated_at existe et a un trigger de mise à jour automatique
-- Si pas de trigger, la colonne sera mise à jour manuellement dans l'API

-- Note: Ce script corrige les problèmes de structure pour permettre 
-- les modifications de clients avec des champs optionnels