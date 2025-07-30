-- Script de mise à jour pour ajouter la relation clients -> sociétés de demandeurs
-- À exécuter dans votre base de données Neon

-- Ajouter la colonne societe_id à la table clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS societe_id UUID REFERENCES demandeurs_societe(id) ON DELETE SET NULL;

-- Créer un index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_clients_societe_id ON clients(societe_id);

-- Mettre à jour les clients existants (optionnel - peut rester NULL temporairement)
-- Uncomment if you want to assign existing clients to the first available society
-- UPDATE clients SET societe_id = (SELECT id FROM demandeurs_societe LIMIT 1) WHERE societe_id IS NULL;

-- Note: Les nouveaux clients devront être assignés à une société lors de leur création