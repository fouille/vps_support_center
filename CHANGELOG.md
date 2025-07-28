# Changelog - VOIPServices Support Center

Toutes les modifications notables de ce projet sont documentées dans ce fichier.
Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Versioning Sémantique](https://semver.org/lang/fr/).

## [1.17.0] - 2025-07-28
### Added
- ✨ Ajout page Dashboard avec graphiques et statistiques pour agents et demandeurs

## [1.16.0] - 2025-07-28
### Added
- ✨ Correction envoi d'emails lors d'ajout/suppression de pièces jointes dans portabilités

## [1.15.1] - 2025-07-28
### Fixed
- 🔧 Solution définitive aux erreurs de build Netlify - suppression de netlify-cli des dépendances

## [1.15.0] - 2025-07-28
### Added
- ✨ Correction erreur de build Netlify - ajout dépendance read-package-up

## [1.14.2] - 2025-07-28
### Fixed
- 🔧 Fix build Netlify - ajout dépendance uri-js et downgrade netlify-cli

## [1.14.1] - 2025-07-28
### Fixed
- 🔧 Correction hauteur sidebar avec footer sticky

## [1.14.0] - 2025-07-28
### Added
- ✨ Système de gestion double demandeurs/sociétés avec permissions avancées

## [1.13.0] - 2025-07-28
### Added
- ✨ Ajout documentation complète gestion expiration token

## [1.12.0] - 2025-07-28
### Added
- ✨ Ajout gestion expiration token JWT avec notifications et redirections automatiques

## [1.11.0] - 2025-07-27
### Added
- ✨ Ajout documentation validation formulaire portabilité

## [1.10.0] - 2025-07-27
### Added
- ✨ Ajout validation étapes formulaire portabilité avec messages erreur et indicateurs visuels

## [1.9.0] - 2025-07-27
### Added
- ✨ Ajout documentation corrections JWT token

## [1.8.1] - 2025-07-27
### Fixed
- 🔧 Correction compatibilité JWT token dans toutes les APIs et champs obligatoires formulaire portabilité

## [1.8.0] - 2025-07-27
### Added
- ✨ Ajout documentation complète intégration API INSEE

## [1.7.0] - 2025-07-27
### Added
- ✨ Ajout intégration API INSEE pour validation SIRET et auto-completion adresse

## [1.6.0] - 2025-07-26
### Added
- ✨ Ajout documentation complète du système de versioning automatique

## [1.5.0] - 2025-07-26
### Added
- ✨ Ajout système de versioning automatique avec scripts rapides

## [1.4.7] - 2025-07-26
### Fixed
- 🔧 Correction erreurs pièces jointes portabilité - suppression par demandeur et notifications commentaires

## [1.4.6] - 2025-07-26
### Fixed
- 🔧 Finalisation système versioning automatique intelligent avec détection de type

## [1.4.5] - 2025-07-26
### Fixed
- 🔧 Amélioration système versioning avec changelog automatique et scripts optimisés

## [1.4.4] - 2025-07-26
### Added
- 🎯 Système de versioning automatique semver
- 📝 Footer avec informations de version et copyright
- 🔧 Scripts de gestion de version automatique
- 📋 Changelog automatique

### Technical
- Configuration de version centralisée dans `/frontend/src/config/version.js`
- Scripts d'incrémentation automatique avec `yarn version:patch/minor/major`
- Footer responsive avec dark mode

## [1.4.3] - 2025-07-26
### Fixed
- 🐛 Correction erreur 500 API GET `/api/portabilite-fichiers`
- 🔧 Migration correcte vers syntaxe neon() au lieu de client.query()
- ✅ Correction champs JWT `decoded.type_utilisateur`
- 📊 Ajout métadonnées complètes fichiers (nom utilisateur, type)

### Improved
- 🎨 Amélioration layout modal portabilités
- 📱 Informations à gauche, commentaires à droite, fichiers dessous
- 🎯 Interface pièces jointes identique aux tickets

## [1.4.2] - 2025-01-25
### Fixed
- 🔧 Correction API portabilite-fichiers (erreur 500 GET)
- 🎨 Amélioration layout modal portabilités

## [1.4.1] - 2025-01-24
### Fixed
- ✅ Correction validation automatique formulaire portabilité
- 🆘 Ajout bouton annulation pour demandeurs

## [1.4.0] - 2025-01-23
### Added
- ✨ Section Portabilités complète
- 📱 CRUD portabilités avec interface dédiée
- 💬 Système de commentaires pour portabilités
- 📎 Gestion pièces jointes pour portabilités
- 🔐 Contrôles d'accès selon type utilisateur

## [1.3.0] - 2025-01-20
### Added
- 📧 Intégration Mailjet pour notifications email
- ✉️ Notifications automatiques création tickets, commentaires, changements statut
- 🎨 Améliorations UX interface tickets

## [1.2.0] - 2025-01-15
### Added
- 💬 Système de commentaires pour tickets
- 📎 Upload et gestion fichiers joints
- 🔢 Numérotation automatique tickets (6 chiffres)
- 🔍 Recherche par numéro de ticket

## [1.1.0] - 2025-01-10
### Added
- 👥 Gestion clients avancée
- 🔍 Système de filtres et recherche
- 📄 Pagination des listes
- 🌙 Mode sombre

## [1.0.0] - 2025-01-05
### Added
- 🎟️ Système de gestion tickets de support
- 🔐 Authentification utilisateurs (agents/demandeurs)
- ➕ CRUD de base (Create, Read, Update, Delete)
- 📊 Interface d'administration

---

## Types de changements
- `Added` pour les nouvelles fonctionnalités
- `Changed` pour les changements dans les fonctionnalités existantes
- `Deprecated` pour les fonctionnalités qui seront supprimées
- `Removed` pour les fonctionnalités supprimées
- `Fixed` pour les corrections de bugs
- `Security` pour les corrections de vulnérabilités