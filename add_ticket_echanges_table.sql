-- Script SQL à exécuter dans Neon pour ajouter la table des échanges/commentaires
-- Copiez-collez ce script dans votre interface Neon

-- Table des échanges/commentaires sur les tickets
CREATE TABLE IF NOT EXISTS ticket_echanges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    auteur_id UUID NOT NULL,
    auteur_type VARCHAR(20) NOT NULL CHECK (auteur_type IN ('demandeur', 'agent')),
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_ticket_echanges_ticket_id ON ticket_echanges(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_echanges_created_at ON ticket_echanges(created_at);

-- Insertion de données de test (optionnel)
-- Ceci ajoutera quelques commentaires de test si vous avez des tickets existants

-- Pour tester, vous pouvez décommenter les lignes suivantes après avoir des tickets:
/*
-- Exemple d'échange de l'admin sur un ticket (remplacez les IDs par les vrais)
INSERT INTO ticket_echanges (ticket_id, auteur_id, auteur_type, message) 
SELECT 
    (SELECT id FROM tickets LIMIT 1),
    (SELECT id FROM agents WHERE email = 'admin@voipservices.fr'),
    'agent',
    'Ticket pris en charge. Nous analysons votre demande.'
WHERE EXISTS (SELECT 1 FROM tickets) AND EXISTS (SELECT 1 FROM agents WHERE email = 'admin@voipservices.fr');
*/