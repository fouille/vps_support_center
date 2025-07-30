# Implémentation de la fonctionnalité Productions

## Structure SQL à exécuter sur Neon

Le fichier `/app/create_productions_structure.sql` contient la structure complète de la base de données pour les productions.

## Structure des tables créées

### 1. `productions`
Table principale pour les demandes de production avec :
- `numero_production` : Numéro auto-généré (8 chiffres)
- Informations client, demandeur, société
- Statuts, priorité, dates
- Auto-création des 12 tâches prédéfinies via trigger

### 2. `production_taches`
Table des tâches avec les 12 tâches automatiques :
1. Portabilité
2. Fichier de collecte
3. Poste fixe
4. Lien internet
5. Netgate (reception)
6. Netgate (configuration)
7. Netgate (retour)
8. Déploiement Siprouter
9. Déploiement SIP2/SIP3/SIP4
10. Routages
11. Trunk Only
12. Facturation

### 3. `production_tache_commentaires`
Commentaires sur les tâches avec notifications email

### 4. `production_tache_fichiers`
Fichiers attachés aux tâches (upload/download)

## API Backend créées

### 1. `/api/productions` - CRUD productions
- GET : Liste paginée avec filtres (statut, client, numéro)
- POST : Création avec auto-génération tâches + email
- PUT : Modification + email si changement statut
- DELETE : Suppression (agents uniquement)

### 2. `/api/production-taches` - Gestion tâches
- GET : Liste des tâches par production
- PUT : Modification tâche + commentaire auto si changement statut

### 3. `/api/production-tache-commentaires` - Commentaires
- GET : Liste des commentaires par tâche
- POST : Ajout commentaire + email notification

### 4. `/api/production-tache-fichiers` - Fichiers
- GET : Liste des fichiers par tâche
- POST : Upload fichier (base64) + email + commentaire auto
- DELETE : Suppression fichier + email + commentaire auto

## Frontend créé

### 1. `ProductionsPage.js` - Page principale
- Liste des productions avec filtres
- Vue expandable des tâches
- Actions CRUD selon les permissions

### 2. `ProductionForm.js` - Formulaire création/édition
- Sélection client/demandeur (SearchableSelect)
- Informations sur les tâches automatiques
- Validation côté client

### 3. `ProductionModal.js` - Détails production
- Vue complète de la production
- Barre de progression des tâches
- Liste des tâches avec compteurs

### 4. `ProductionTacheModal.js` - Détails tâche
- Interface similaire aux tickets
- Système de commentaires temps réel
- Panneau de gestion des fichiers
- Édition des propriétés de la tâche

## Emails configurés

### Templates ajoutés à `email-service.js` :
1. `productionCreated` - Nouvelle production
2. `productionCommentAdded` - Commentaire ajouté
3. `productionFileUploaded` - Fichier ajouté
4. `productionStatusChanged` - Changement statut
5. `productionFileDeleted` - Fichier supprimé

### Fonctions d'envoi :
- `sendProductionCreationEmail()`
- `sendProductionCommentEmail()`
- `sendProductionFileUploadEmail()`
- `sendProductionFileDeleteEmail()`
- `sendProductionStatusChangeEmail()`

## Permissions implémentées

### Agents :
- Création, modification, suppression productions
- Sélection du demandeur lors de la création
- Accès complet aux tâches et commentaires

### Demandeurs :
- Création productions (demandeur auto-sélectionné)
- Détail et suivi uniquement
- Accès aux tâches de leur société
- Commentaires et upload de fichiers

## Menu et Navigation

- Ajouté "Productions" / "Mes Productions" au menu
- Icône Factory (🏭)
- Navigation intégrée dans Layout.js et App.js

## Fonctionnalités avancées

### Auto-génération numéros
- Fonction SQL `generate_production_number()`
- Numéros uniques 8 chiffres (comme tickets/portabilités)

### Notifications email
- Notifications automatiques pour :
  - Nouvelles productions
  - Commentaires sur tâches
  - Upload/suppression fichiers
  - Changements de statut

### Gestion des fichiers
- Upload en base64 (compatible affichage frontend)
- Téléchargement direct
- Commentaires automatiques sur upload/suppression

### Mock data
- Données de test intégrées pour développement local
- Fallback automatique si base non accessible

## Tests à effectuer

1. Exécuter le script SQL sur Neon
2. Tester les API backend (via l'agent de test)
3. Vérifier la navigation frontend
4. Tester les permissions agent/demandeur
5. Valider les notifications email
6. Vérifier la gestion des fichiers

## Notes importantes

- Les API suivent le pattern existant (JWT, permissions, pagination)
- L'UI utilise les mêmes composants et styles que les tickets/portabilités
- Les emails utilisent les templates existants avec des couleurs différentes
- La structure respecte l'architecture sociétés/demandeurs existante
- Compatible avec le système de mock data pour le développement local