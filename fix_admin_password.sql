-- Script à exécuter dans Neon pour corriger le mot de passe admin
-- Supprime l'ancien utilisateur admin et recrée avec le bon hash

DELETE FROM agents WHERE email = 'admin@voipservices.fr';

-- Insertion de l'utilisateur admin avec le bon hash
-- Mot de passe : admin1234! (hashé avec bcrypt, coût 10)
INSERT INTO agents (nom, prenom, email, password, societe)
VALUES ('ADMIN', 'Franck', 'admin@voipservices.fr', '$2a$10$dmRNBo8wCcE3.5HCGMf3Le/tTIUcwdLDaSLtugn/JZFq9GwHcF/We', 'VoIP Services');