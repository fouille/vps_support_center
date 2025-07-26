# Guide du système de versioning automatique

## Scripts disponibles

### 1. **Script rapide (recommandé)**
```bash
node version-and-commit.js "Description du changement"
```
ou
```bash
yarn version:quick "Description du changement"
```

### 2. **Script automatique avec détection**
```bash
node scripts/auto-version.js "Description du changement"
```
ou
```bash
yarn version:auto "Description du changement"
```

### 3. **Scripts manuels**
```bash
yarn version:patch "Description du changement"
yarn version:minor "Description du changement"
yarn version:major "Description du changement"
```

## Détection automatique du type de version

Le système détecte automatiquement le type de version basé sur des mots-clés :

### Version MAJEURE (1.x.x → 2.0.0)
- **Mots-clés** : `breaking`, `major`, `incompatible`, `migration`, `restructure`, `refactor major`, `architecture`, `breaking change`
- **Exemple** : `"Migration vers nouvelle architecture base de données"`

### Version MINEURE (1.4.x → 1.5.0)
- **Mots-clés** : `add`, `new`, `feature`, `implement`, `ajout`, `nouveau`, `nouvelle`, `intégration`, `section`, `module`, `fonctionnalité`, `enhancement`
- **Exemple** : `"Ajout nouvelle fonctionnalité notifications"`

### Version PATCH (1.4.6 → 1.4.7)
- **Par défaut** : Toutes les autres modifications (corrections, améliorations)
- **Exemple** : `"Correction bug suppression fichiers"`

## Utilisation recommandée

### À chaque modification importante :
```bash
node version-and-commit.js "Description précise du changement"
```

### Exemples concrets :
```bash
# Correction de bug
node version-and-commit.js "Correction erreur suppression fichiers par demandeur"

# Nouvelle fonctionnalité
node version-and-commit.js "Ajout système de notifications en temps réel"

# Changement majeur
node version-and-commit.js "Migration vers nouvelle architecture de base de données"
```

## Informations sur la version actuelle

### Voir la version actuelle :
```bash
yarn version:info
```

### Voir l'historique :
```bash
yarn version:history
```

## Fichiers mis à jour automatiquement

- **`frontend/src/config/version.js`** : Configuration de version
- **`package.json`** : Version npm
- **`CHANGELOG.md`** : Historique des changements
- **`VERSION_HISTORY`** : Historique intégré à l'application

## Avantages du système

1. **Automatique** : Détection intelligente du type de version
2. **Traçabilité** : Historique complet des modifications
3. **Cohérence** : Mise à jour simultanée de tous les fichiers
4. **Simplicité** : Une seule commande pour tout faire
5. **Visibilité** : Version affichée dans l'interface utilisateur

## Workflow recommandé

1. **Faire les modifications** de code
2. **Tester** les changements
3. **Exécuter** le script de versioning :
   ```bash
   node version-and-commit.js "Description du changement"
   ```
4. **Vérifier** que la version a été mise à jour
5. **Continuer** avec les modifications suivantes

## Intégration dans le footer

La version est automatiquement affichée dans le footer de l'application grâce au composant `Footer.js` qui lit la configuration depuis `version.js`.

## Historique des versions récentes

- **v1.5.0** : Ajout système de versioning automatique avec scripts rapides
- **v1.4.7** : Correction erreurs pièces jointes portabilité - suppression par demandeur et notifications commentaires
- **v1.4.6** : Corrections structure fichiers portabilité et compatibilité JWT tokens