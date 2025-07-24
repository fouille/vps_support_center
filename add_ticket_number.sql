-- Script de migration pour ajouter le numéro de ticket
-- Ajout du champ "numero_ticket" (6 chiffres aléatoires)

-- Ajouter le champ numero_ticket
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS numero_ticket VARCHAR(6) UNIQUE;

-- Créer une fonction pour générer un numéro de ticket aléatoire
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS VARCHAR(6) AS $$
DECLARE
    ticket_num VARCHAR(6);
    num_exists BOOLEAN;
BEGIN
    LOOP
        -- Générer un nombre aléatoire de 6 chiffres (100000 à 999999)
        ticket_num := LPAD((FLOOR(RANDOM() * 900000) + 100000)::TEXT, 6, '0');
        
        -- Vérifier si ce numéro existe déjà
        SELECT EXISTS(SELECT 1 FROM tickets WHERE numero_ticket = ticket_num) INTO num_exists;
        
        -- Si le numéro n'existe pas, on peut l'utiliser
        IF NOT num_exists THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN ticket_num;
END;
$$ LANGUAGE plpgsql;

-- Mettre à jour les tickets existants avec des numéros générés
UPDATE tickets 
SET numero_ticket = generate_ticket_number() 
WHERE numero_ticket IS NULL;

-- Rendre le champ NOT NULL maintenant que tous les tickets ont un numéro
ALTER TABLE tickets ALTER COLUMN numero_ticket SET NOT NULL;

-- Ajouter un index pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS idx_tickets_numero_ticket ON tickets(numero_ticket);

-- Créer un trigger pour générer automatiquement le numéro lors de l'insertion
CREATE OR REPLACE FUNCTION set_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.numero_ticket IS NULL OR NEW.numero_ticket = '' THEN
        NEW.numero_ticket := generate_ticket_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_ticket_number
    BEFORE INSERT ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION set_ticket_number();

-- Vérifier la structure mise à jour
-- SELECT column_name, is_nullable, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'tickets' AND column_name = 'numero_ticket';