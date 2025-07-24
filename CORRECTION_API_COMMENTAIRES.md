# Correction de l'API ticket-echanges - INSTRUCTIONS

## 🚨 **1. PREMIÈRE ÉTAPE : Exécuter le script SQL dans Neon**

Copiez et exécutez ce script dans votre interface Neon :

```sql
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
```

## ✅ **2. Corrections apportées au code**

### **API Backend (`/app/netlify/functions/ticket-echanges.js`)**
- **Avant** : Utilisait des paramètres de chemin `/api/ticket-echanges/{ticketId}`
- **Maintenant** : Utilise des paramètres de requête `/api/ticket-echanges?ticketId={ticketId}`
- **Raison** : Plus compatible avec la structure Netlify Functions

### **Frontend (`/app/frontend/src/components/TicketsPage.js`)**
- **Avant** : `api.get(/api/ticket-echanges/${ticketId})`
- **Maintenant** : `api.get(/api/ticket-echanges?ticketId=${ticketId})`
- **Même chose pour POST** : `api.post(/api/ticket-echanges?ticketId=${ticketId})`

## 🔧 **3. Structure de l'API finale**

### **GET** `/api/ticket-echanges?ticketId={ticketId}`
- Récupère tous les commentaires d'un ticket
- Retourne : Array d'objets avec `id`, `message`, `auteur_nom`, `auteur_type`, `created_at`

### **POST** `/api/ticket-echanges?ticketId={ticketId}`
- Ajoute un nouveau commentaire
- Body : `{ "message": "Texte du commentaire" }`
- Retourne : L'objet commentaire créé avec `auteur_nom`

## 🎯 **4. Sécurité et permissions**

### **Agents**
- Peuvent voir et commenter tous les tickets
- Pas de restriction d'accès

### **Demandeurs** 
- Peuvent voir et commenter uniquement les tickets de leur société
- Vérification automatique côté serveur

## 🚀 **5. Test de fonctionnement**

Une fois le script SQL exécuté et le code déployé :

1. **Connectez-vous** en tant qu'agent ou demandeur
2. **Ouvrez un ticket** (bouton "œil" dans la liste)
3. **Vérifiez** que la section commentaires s'affiche à droite
4. **Ajoutez un commentaire** dans le textarea en bas
5. **Vérifiez** que le commentaire apparaît avec votre nom et badge

L'erreur 500 devrait disparaître une fois la table créée dans Neon !