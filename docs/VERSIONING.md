# 📋 Système de Versioning Automatique - VOIPServices Support Center

## 🎯 Vue d'ensemble

Ce projet utilise un système de versioning automatique basé sur le **Semantic Versioning (semver)** avec incrémentation automatique et documentation générée.

### Format de version : `MAJOR.MINOR.PATCH`

- **MAJOR** : Changements incompatibles avec les versions précédentes
- **MINOR** : Nouvelles fonctionnalités compatibles avec les versions précédentes  
- **PATCH** : Corrections de bugs et améliorations mineures

## 🔧 Scripts Disponibles

### Scripts de versioning manuel
```bash
# Incrément manuel avec description obligatoire
yarn version:patch "Description de la correction"
yarn version:minor "Description de la nouvelle fonctionnalité"  
yarn version:major "Description du changement majeur"
```

### Script de versioning automatique
```bash
# Détection automatique du type basée sur les mots-clés
yarn version:auto "Description du changement"
```

### Scripts d'information
```bash
# Affichage des informations de version
yarn version:info

# Historique des 5 dernières versions
yarn version:history
```

## 🤖 Auto-détection Intelligente

Le script `version:auto` analyse la description pour déterminer automatiquement le type :

### 🚀 MAJOR (Version majeure)
**Mots-clés détectés :**
- `breaking`, `major`, `incompatible`, `migration`, `restructure`
- `refactor major`, `architecture`, `breaking change`

### ✨ MINOR (Nouvelle fonctionnalité)
**Mots-clés détectés :**
- `add`, `new`, `feature`, `implement`, `ajout`, `nouveau`
- `intégration`, `section`, `module`, `fonctionnalité`, `enhancement`

### 🔧 PATCH (Correction/Amélioration)
**Par défaut pour :**
- Corrections de bugs, améliorations UX, optimisations
- Toute description ne contenant pas les mots-clés ci-dessus

## 📁 Structure des Fichiers

```
├── frontend/src/config/version.js     # Configuration centralisée des versions
├── frontend/src/components/Footer.js  # Footer avec affichage version
├── scripts/increment-version.js       # Script d'incrémentation manuelle
├── scripts/auto-version.js           # Script d'auto-détection
├── scripts/update-changelog.js       # Mise à jour automatique changelog
├── CHANGELOG.md                       # Historique détaillé des versions
└── docs/VERSIONING.md                # Cette documentation
```

## 🎨 Affichage Version

### Footer de l'application
La version est automatiquement affichée dans le footer :
```
VOIPServices © • Tous droits réservés • 2025     Version v1.4.6
```

### Informations disponibles
- **Version actuelle** : Format semver (ex: 1.4.6)
- **Date de build** : Date de dernière modification
- **Copyright** : Année courante automatique

## 🔄 Workflow Automatique

1. **Développement** → Modifications du code
2. **Versioning** → `yarn version:auto "Description"`
3. **Auto-détection** → Analyse de la description 
4. **Incrémentation** → MAJOR/MINOR/PATCH automatique
5. **Mise à jour** → version.js, package.json, CHANGELOG.md
6. **Affichage** → Footer automatiquement à jour

## 📊 Exemples d'utilisation

```bash
# Correction d'un bug → PATCH automatique
yarn version:auto "Correction erreur 500 API fichiers"

# Nouvelle fonctionnalité → MINOR automatique  
yarn version:auto "Ajout système de notifications push"

# Changement majeur → MAJOR automatique
yarn version:auto "Breaking change: migration vers nouvelle architecture"
```

## 🛠️ Personnalisation

### Ajouter de nouveaux mots-clés
Modifier le fichier `scripts/auto-version.js` :

```javascript
const majorKeywords = [
  'breaking', 'major', 'incompatible',
  // Ajouter vos mots-clés ici
];
```

### Modifier le format d'affichage
Modifier le fichier `frontend/src/components/Footer.js` :

```javascript
<span className="...">v{version}</span>
```

## 📈 Avantages du Système

- ✅ **Automatisation complète** du versioning
- ✅ **Documentation automatique** (changelog)
- ✅ **Cohérence** des numéros de version
- ✅ **Visibilité** dans l'interface utilisateur
- ✅ **Traçabilité** complète des changements
- ✅ **Intelligence artificielle** de détection
- ✅ **Standards industriels** (semver)

## 🔮 Évolutions Futures

- Integration avec Git hooks pour versioning sur commit
- Génération automatique de release notes
- Badges de version dynamiques
- API de version pour intégrations externes
- Notifications automatiques des nouvelles versions