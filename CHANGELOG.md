# Changelog - VOIPServices Support Center

Toutes les modifications notables de ce projet sont documentées dans ce fichier.
Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Versioning Sémantique](https://semver.org/lang/fr/).

## [2.15.3] - 2025-10-07
### Fixed
- 🔧 Ajout du support des fichiers tableurs CSV, XLS et XLSX dans les pièces jointes des tickets

## [2.15.2] - 2025-10-02
### Fixed
- 🔧 Ajout du support des fichiers XML dans les pièces jointes des tickets

## [2.15.1] - 2025-09-18
### Fixed
- 🔧 Ajout du nom de la société client dans la liste des tickets (vue messagerie) pour une meilleure identification

## [2.15.0] - 2025-09-18
### Added
- ✨ Améliorations du Dashboard : extension de l'évolution des tickets à 30 jours avec dates formatées au format français, et correction du Top 5 Clients pour afficher correctement les statistiques de tickets par client

## [2.14.0] - 2025-09-18
### Added
- ✨ Amélioration des portabilités : gestion conditionnelle des alertes selon le statut, filtre par défaut excluant les terminées, et largeur pleine page pour un meilleur affichage

## [2.13.0] - 2025-09-12
### Added
- ✨ Interface utilisateur améliorée : ajout d'un loader au chatbot lors du chargement des échanges et refonte de la page tickets en style messagerie avec vue split-screen (liste à gauche, détails à droite)

## [2.12.1] - 2025-09-12
### Fixed
- 🔧 Correction des emails de production : affichage correct du nom du client et de l'auteur dans les changements de statut et commentaires

## [2.12.0] - 2025-09-12
### Added
- ✨ Amélioration des emails : ajout du nom du client dans l'objet et le corps des emails de commentaires et changements de statut pour tickets, portabilités et productions

## [2.10.7] - 2025-09-09
### Fixed
- 🔧 mineur Implémentation système de routing avec React Router - URLs dynamiques pour tickets, portabilités et productions

## [2.10.6] - 2025-09-09
### Fixed
- 🔧 patch

## [2.10.5] - 2025-09-09
### Fixed
- 🔧 patch

## [2.10.4] - 2025-09-09
### Fixed
- 🔧 patch

## [2.10.3] - 2025-09-09
### Fixed
- 🔧 patch

## [2.10.2] - 2025-09-09
### Fixed
- 🔧 patch

## [2.10.1] - 2025-09-09
### Fixed
- 🔧 patch

## [2.10.0] - 2025-09-09
### Added
- ✨ --force

## [2.9.15] - 2025-09-09
### Fixed
- 🔧 mineure

## [2.9.14] - 2025-09-08
### Fixed
- 🔧 patch

## [2.9.13] - 2025-09-08
### Fixed
- 🔧 patch

## [2.9.12] - 2025-09-08
### Fixed
- 🔧 patch

## [2.9.11] - 2025-09-08
### Fixed
- 🔧 patch

## [2.9.10] - 2025-09-08
### Fixed
- 🔧 patch

## [2.9.9] - 2025-09-08
### Fixed
- 🔧 Correction format destinataires sendStatusChangeEmail dans tickets.js

## [2.9.8] - 2025-09-08
### Fixed
- 🔧 Correction noms champs template commentaires - message et created_at

## [2.9.7] - 2025-09-08
### Fixed
- 🔧 Ajout type_utilisateur et logs debugging pour données email commentaires

## [2.9.6] - 2025-09-08
### Fixed
- 🔧 Correction template commentAdded - comment.contenu undefined

## [2.9.5] - 2025-09-08
### Fixed
- 🔧 Ajout debugging email-service et gestion erreurs import Brevo

## [2.9.4] - 2025-09-08
### Fixed
- 🔧 Ajout logs debugging pour password-reset Brevo format destinataires

## [2.9.3] - 2025-09-08
### Fixed
- 🔧 Correction format destinataires email Brevo - erreur invalid_parameter

## [2.9.2] - 2025-09-08
### Fixed
- 🔧 Correction export email-service et migration password-reset vers Brevo

## [2.9.1] - 2025-09-08
### Fixed
- 🔧 Correction variable fileId et migration Brevo vers nouvelle API @getbrevo/brevo

## [2.9.0] - 2025-09-08
### Added
- ✨ Correction téléchargement fichiers tickets et migration vers Brevo

## [2.8.5] - 2025-09-05
### Fixed
- 🔧 Correction login agents - societe_id inexistant et encodage base64 mot de passe

## [2.8.4] - 2025-09-04
### Fixed
- 🔧 Correction trigger productions - erreur updated_at inexistant

## [2.8.3] - 2025-09-04
### Fixed
- 🔧 Ajout loader sur bouton ajout PDF pièce jointe pour améliorer UX

## [2.8.2] - 2025-09-04
### Fixed
- 🔧 Ajout rafraîchissement automatique tâche après ajout PDF en pièce jointe

## [2.8.1] - 2025-09-04
### Fixed
- 🔧 Correction format envoi PDF pour ajout pièce jointe - conversion blob vers base64

## [2.8.0] - 2025-09-04
### Added
- ✨ Ajout fonctionnalité ajout automatique PDF en pièce jointe et corrections Template Trunk

## [2.7.2] - 2025-09-04
### Fixed
- 🔧 Correction récupération nom société dans PDF Template Trunk Only

## [2.7.1] - 2025-09-04
### Fixed
- 🔧 --help

## [2.7.0] - 2025-09-04
### Added
- ✨ Ajout dialogue confirmation PDF Template Trunk et correction nom client

## [2.6.0] - 2025-09-04
### Added
- ✨ Ajout bouton Template pour tâche Trunk Only avec génération PDF

## [2.5.0] - 2025-09-04
### Added
- ✨ Ajout affichage logo société dans header à côté du nom d'application

## [2.4.2] - 2025-09-03
### Fixed
- 🔧 patch

## [2.4.1] - 2025-09-03
### Fixed
- 🔧 patch

## [2.3.1] - 2025-09-03
### Fixed
- 🔧 minor

## [2.2.1] - 2025-09-03
### Fixed
- 🔧 minor

## [2.1.1] - 2025-09-03
### Fixed
- 🔧 minor

## [2.0.11] - 2025-08-29
### Fixed
- 🔧 minor

## [2.0.10] - 2025-08-29
### Fixed
- 🔧 patch

## [2.0.9] - 2025-08-29
### Fixed
- 🔧 patch

## [2.0.8] - 2025-08-29
### Fixed
- 🔧 patch

## [2.0.7] - 2025-08-29
### Fixed
- 🔧 Fix recherche clients - séparation états filtres/formulaire + correction appels API continus

## [2.0.6] - 2025-08-29
### Fixed
- 🔧 Sécurité: suppression logs sensibles authentification - domaine, clés reCAPTCHA, emails utilisateurs

## [2.0.5] - 2025-08-29
### Fixed
- 🔧 Fix recherche clients tickets + changement libellés Support - recherche serveur avec permissions + UI améliorée

## [2.0.4] - 2025-08-01
### Fixed
- 🔧 Fix structure footer et sidebar - App h-screen + Layout h-full pour footer fixe sans casser sidebar

## [2.0.3] - 2025-08-01
### Fixed
- 🔧 Fix double footer - suppression du footer Layout + restructuration pour footer global visible

## [2.0.2] - 2025-08-01
### Fixed
- 🔧 Fix erreur build footer - utilisation du composant Footer.js existant

## [2.0.1] - 2025-08-01
### Fixed
- 🔧 Amélioration UX - renforcement reCAPTCHA + scroll listes + footer fixe + recherche clients

## [2.0.0] - 2025-07-31
### Changed
- 🚀 Migration reCAPTCHA v2 → v3 - implémentation native invisible avec score de confiance

## [1.27.3] - 2025-07-31
### Fixed
- 🔧 Fix final variables Mailjet - correction MJ_APIKEY_PUBLIC/MJ_APIKEY_PRIVATE

## [1.27.2] - 2025-07-31
### Fixed
- 🔧 Fix variables Mailjet - correction MJ_API_KEY/MJ_SECRET_KEY + amélioration gestion erreurs reCAPTCHA

## [1.27.1] - 2025-07-31
### Fixed
- 🔧 Fix password reset - correction trigger PostgreSQL + amélioration affichage reCAPTCHA

## [1.27.0] - 2025-07-31
### Added
- ✨ Ajout fonctionnalité récupération mot de passe - modal + API + email + reCAPTCHA optionnel

## [1.26.2] - 2025-07-31
### Fixed
- 🔧 Amélioration UX login - loader global pendant chargement logo + API

## [1.26.1] - 2025-07-31
### Fixed
- 🔧 Fix erreur récupération logo login - correction référence REACT_APP_BACKEND_URL

## [1.26.0] - 2025-07-31
### Added
- ✨ Correction validation domaine + ajout loaders UX - regex simplifiée pour accepter tous domaines valides

## [1.25.0] - 2025-07-31
### Added
- ✨ Ajout personnalisation login par domaine - nouveau champ domaine société + API publique + détection automatique logo

## [1.24.3] - 2025-07-31
### Fixed
- 🔧 Fix: Suppression cadre signature PDF mandat portabilité

## [1.24.2] - 2025-07-31
### Fixed
- 🔧 Fix: Réorganisation partie basse PDF - Fait à/le vertical + signature côte à côte, suppression pied de page

## [1.24.1] - 2025-07-31
### Fixed
- 🔧 Fix: Optimisation logo PDF max 15mm + compactage mise en page pour préserver signature

## [1.24.0] - 2025-07-31
### Added
- ✨ Feature: Loader génération PDF + message séparé + logo société dans mandat PDF

## [1.23.1] - 2025-07-31
### Fixed
- 🔧 Fix: Suppression site_web inexistant dans demandeur-info + script trigger demandeurs_societe

## [1.23.0] - 2025-07-31
### Added
- ✨ Fix: Correction erreur demandeur-info telephone + ajout champ telephone_client formulaire portabilité

## [1.22.1] - 2025-07-31
### Fixed
- 🔧 Fix: Correction erreur 500 date_modification dans API demandeurs-societe PUT

## [1.22.0] - 2025-07-31
### Added
- ✨ Feature: Génération PDF mandat de portabilité prérempli avec données société

## [1.21.3] - 2025-07-31
### Fixed
- 🔧 Fix: Correction ordre déconnexion - enregistrement log avant suppression token

## [1.21.2] - 2025-07-31
### Fixed
- 🔧 Fix: Correction de l'erreur PostgreSQL INET avec adresses IP multiples dans connexions-logs

## [1.21.1] - 2025-07-31
### Fixed
- 🔧 Fix: Correction de l'erreur React Hooks rules-of-hooks dans AuditPage

## [1.21.0] - 2025-07-31
### Added
- ✨ Ajout de la fonctionnalité d'audit des connexions pour les agents

## [1.20.0] - 2025-07-30
### Added
- ✨ Correction navigation: ajout menu 'Mes Clients' pour les demandeurs

## [1.19.8] - 2025-07-30
### Fixed
- 🔧 Finalisation correction clients: maintien solution NOW() stable et fonctionnelle

## [1.19.7] - 2025-07-30
### Fixed
- 🔧 Scripts SQL améliorés: correction ciblée trigger clients, diagnostic fonction globale

## [1.19.6] - 2025-07-30
### Fixed
- 🔧 Correction trigger clients: fix erreur date_modification dans update_updated_at_column

## [1.19.5] - 2025-07-30
### Fixed
- 🔧 Corrections clients: erreur API date_modification, pagination fonctionnelle, layout pleine page

## [1.19.4] - 2025-07-30
### Fixed
- 🔧 Modernisation gestion clients: affectation sociétés demandeurs, filtrage par société, correction pagination, champ société dans formulaires

## [1.19.3] - 2025-07-30
### Fixed
- 🔧 Amélioration avancement productions: calcul côté serveur pour affichage immédiat sans expansion

## [1.19.2] - 2025-07-30
### Fixed
- 🔧 Améliorations UX Productions et Portabilités: affichage avancement dans vue globale, auto-date hors scope, contrainte +11 jours ouvrés portabilités

## [1.19.1] - 2025-07-30
### Fixed
- 🔧 Corrections UX Productions: suppression gradient modal production, calcul avancement sans hors scope, filtre productions terminées, édition limitée agents, commentaires conversation gauche/droite

## [1.19.0] - 2025-07-30
### Added
- ✨ Améliorations UX Portabilités, Productions et Dashboard - Dates dépassées, suppression infos test login, style modal productions, édition statut production agents, nouvelles statistiques productions

## [1.18.4] - 2025-07-30
### Fixed
- 🔧 Amélioration UX recherche productions: validation sur Entrée et actualisation tableau uniquement

## [1.18.3] - 2025-07-30
### Fixed
- 🔧 Corrections productions: compteurs fichiers, actualisation menus, recherche automatique et gestion messages UI

## [1.18.2] - 2025-07-28
### Fixed
- 🔧 Corrections visuelles Dashboard: suppression mention Vue Agent/Demandeur et correction tooltips undefined

## [1.18.1] - 2025-07-28
### Fixed
- 🔧 Bug fix: Correction authentification API Dashboard - harmonisation avec les autres APIs

## [1.18.0] - 2025-07-28
### Added
- ✨ Bug fix: Correction appels API Dashboard et ajout données mockées pour développement

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