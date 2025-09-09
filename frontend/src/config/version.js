// Système de versioning automatique - Semantic Versioning (semver)
// Format: MAJOR.MINOR.PATCH
// MAJOR: Changements incompatibles avec versions précédentes
// MINOR: Nouvelles fonctionnalités compatibles
// PATCH: Corrections de bugs compatibles

export const VERSION_CONFIG = {
  major: 2,      // Version majeure - changements breaking
  minor: 11,      // Version mineure - nouvelles fonctionnalités
  patch: 0,      // Version patch - corrections de bugs
  buildDate: "2025-09-09", // Date de build automatique
};

// Génération automatique du numéro de version
export const getVersion = () => {
  const { major, minor, patch } = VERSION_CONFIG;
  return `${major}.${minor}.${patch}`;
};

// Génération de l'année courante
export const getCurrentYear = () => {
  return new Date().getFullYear();
};

// Information complète de version
export const getVersionInfo = () => {
  return {
    version: getVersion(),
    buildDate: VERSION_CONFIG.buildDate,
    year: getCurrentYear()
  };
};

// Historique des versions (à des fins de documentation)
export const VERSION_HISTORY = [
  {
    version: "2.11.0",
    date: "2025-09-09",
    type: "MINOR",
    description: "Implémentation système de routing avec React Router - URLs dynamiques pour tickets, portabilités et productions"
  },
  {
    version: "2.10.7",
    date: "2025-09-09",
    type: "PATCH",
    description: "mineur Implémentation système de routing avec React Router - URLs dynamiques pour tickets, portabilités et productions"
  },
{
    version: "2.10.6",
    date: "2025-09-09",
    type: "PATCH",
    description: "patch"
  },
{
    version: "2.10.5",
    date: "2025-09-09",
    type: "PATCH",
    description: "patch"
  },
{
    version: "2.10.4",
    date: "2025-09-09",
    type: "PATCH",
    description: "patch"
  },
{
    version: "2.10.3",
    date: "2025-09-09",
    type: "PATCH",
    description: "patch"
  },
{
    version: "2.10.2",
    date: "2025-09-09",
    type: "PATCH",
    description: "patch"
  },
{
    version: "2.10.1",
    date: "2025-09-09",
    type: "PATCH",
    description: "patch"
  },
{
    version: "2.10.0",
    date: "2025-09-09",
    type: "MINOR",
    description: "--force"
  },
{
    version: "2.9.15",
    date: "2025-09-09",
    type: "PATCH",
    description: "mineure"
  },
{
    version: "2.9.14",
    date: "2025-09-08",
    type: "PATCH",
    description: "patch"
  },
{
    version: "2.9.13",
    date: "2025-09-08",
    type: "PATCH",
    description: "patch"
  },
{
    version: "2.9.12",
    date: "2025-09-08",
    type: "PATCH",
    description: "patch"
  },
{
    version: "2.9.11",
    date: "2025-09-08",
    type: "PATCH",
    description: "patch"
  },
{
    version: "2.9.10",
    date: "2025-09-08",
    type: "PATCH",
    description: "patch"
  },
{
    version: "2.9.9",
    date: "2025-09-08",
    type: "PATCH",
    description: "Correction format destinataires sendStatusChangeEmail dans tickets.js"
  },
{
    version: "2.9.8",
    date: "2025-09-08",
    type: "PATCH",
    description: "Correction noms champs template commentaires - message et created_at"
  },
{
    version: "2.9.7",
    date: "2025-09-08",
    type: "PATCH",
    description: "Ajout type_utilisateur et logs debugging pour données email commentaires"
  },
{
    version: "2.9.6",
    date: "2025-09-08",
    type: "PATCH",
    description: "Correction template commentAdded - comment.contenu undefined"
  },
{
    version: "2.9.5",
    date: "2025-09-08",
    type: "PATCH",
    description: "Ajout debugging email-service et gestion erreurs import Brevo"
  },
{
    version: "2.9.4",
    date: "2025-09-08",
    type: "PATCH",
    description: "Ajout logs debugging pour password-reset Brevo format destinataires"
  },
{
    version: "2.9.3",
    date: "2025-09-08",
    type: "PATCH",
    description: "Correction format destinataires email Brevo - erreur invalid_parameter"
  },
{
    version: "2.9.2",
    date: "2025-09-08",
    type: "PATCH",
    description: "Correction export email-service et migration password-reset vers Brevo"
  },
{
    version: "2.9.1",
    date: "2025-09-08",
    type: "PATCH",
    description: "Correction variable fileId et migration Brevo vers nouvelle API @getbrevo/brevo"
  },
{
    version: "2.9.0",
    date: "2025-09-08",
    type: "MINOR",
    description: "Correction téléchargement fichiers tickets et migration vers Brevo"
  },
{
    version: "2.8.5",
    date: "2025-09-05",
    type: "PATCH",
    description: "Correction login agents - societe_id inexistant et encodage base64 mot de passe"
  },
{
    version: "2.8.4",
    date: "2025-09-04",
    type: "PATCH",
    description: "Correction trigger productions - erreur updated_at inexistant"
  },
{
    version: "2.8.3",
    date: "2025-09-04",
    type: "PATCH",
    description: "Ajout loader sur bouton ajout PDF pièce jointe pour améliorer UX"
  },
{
    version: "2.8.2",
    date: "2025-09-04",
    type: "PATCH",
    description: "Ajout rafraîchissement automatique tâche après ajout PDF en pièce jointe"
  },
{
    version: "2.8.1",
    date: "2025-09-04",
    type: "PATCH",
    description: "Correction format envoi PDF pour ajout pièce jointe - conversion blob vers base64"
  },
{
    version: "2.8.0",
    date: "2025-09-04",
    type: "MINOR",
    description: "Ajout fonctionnalité ajout automatique PDF en pièce jointe et corrections Template Trunk"
  },
{
    version: "2.7.2",
    date: "2025-09-04",
    type: "PATCH",
    description: "Correction récupération nom société dans PDF Template Trunk Only"
  },
{
    version: "2.7.1",
    date: "2025-09-04",
    type: "PATCH",
    description: "--help"
  },
{
    version: "2.7.0",
    date: "2025-09-04",
    type: "MINOR",
    description: "Ajout dialogue confirmation PDF Template Trunk et correction nom client"
  },
{
    version: "2.6.0",
    date: "2025-09-04",
    type: "MINOR",
    description: "Ajout bouton Template pour tâche Trunk Only avec génération PDF"
  },
{
    version: "2.5.0",
    date: "2025-09-04",
    type: "MINOR",
    description: "Ajout affichage logo société dans header à côté du nom d'application"
  },
{
    version: "2.4.2",
    date: "2025-09-03",
    type: "PATCH",
    description: "Support recherche société par nom si societe_id absent - compatibilité migration incomplète"
  },
{
    version: "2.4.1",
    date: "2025-09-03",
    type: "PATCH",
    description: "Corrections nom application header + récupération données 'Ma Société' - ajout societe_id dans auth.js"
  },
{
    version: "2.4.0",
    date: "2025-09-03",
    type: "MINOR",
    description: "Ajout fonction 'Ma Société' pour demandeurs - édition des champs Email, Logo, Domaine, Favicon et Nom application"
  },
{
    version: "2.3.0",
    date: "2025-09-03",
    type: "MINOR",
    description: "Ajout upload favicon .ico et nom d'application personnalisé pour les sociétés + intégration dans login et layout"
  },
{
    version: "2.2.0",
    date: "2025-09-03",
    type: "MINOR",
    description: "Filtrage tâches hors scope dans résumé productions + menu Outils avec G711.org dans Support"
  },
{
    version: "2.1.0",
    date: "2025-08-29",
    type: "MINOR",
    description: "Optimisation filtres tickets - suppression requêtes doubles + recherche par numéro avec debouncing et loader"
  },
{
    version: "2.0.10",
    date: "2025-08-29",
    type: "PATCH",
    description: "patch"
  },
{
    version: "2.0.9",
    date: "2025-08-29",
    type: "PATCH",
    description: "patch"
  },
{
    version: "2.0.8",
    date: "2025-08-29",
    type: "PATCH",
    description: "patch"
  },
{
    version: "2.0.7",
    date: "2025-08-29",
    type: "PATCH",
    description: "Fix recherche clients - séparation états filtres/formulaire + correction appels API continus"
  },
{
    version: "2.0.6",
    date: "2025-08-29",
    type: "PATCH",
    description: "Sécurité: suppression logs sensibles authentification - domaine, clés reCAPTCHA, emails utilisateurs"
  },
{
    version: "2.0.5",
    date: "2025-08-29",
    type: "PATCH",
    description: "Fix recherche clients tickets + changement libellés Support - recherche serveur avec permissions + UI améliorée"
  },
{
    version: "2.0.4",
    date: "2025-08-01",
    type: "PATCH",
    description: "Fix structure footer et sidebar - App h-screen + Layout h-full pour footer fixe sans casser sidebar"
  },
{
    version: "2.0.3",
    date: "2025-08-01",
    type: "PATCH",
    description: "Fix double footer - suppression du footer Layout + restructuration pour footer global visible"
  },
{
    version: "2.0.2",
    date: "2025-08-01",
    type: "PATCH",
    description: "Fix erreur build footer - utilisation du composant Footer.js existant"
  },
{
    version: "2.0.1",
    date: "2025-08-01",
    type: "PATCH",
    description: "Amélioration UX - renforcement reCAPTCHA + scroll listes + footer fixe + recherche clients"
  },
{
    version: "2.0.0",
    date: "2025-07-31",
    type: "MAJOR",
    description: "Migration reCAPTCHA v2 → v3 - implémentation native invisible avec score de confiance"
  },
{
    version: "1.27.3",
    date: "2025-07-31",
    type: "PATCH",
    description: "Fix final variables Mailjet - correction MJ_APIKEY_PUBLIC/MJ_APIKEY_PRIVATE"
  },
{
    version: "1.27.2",
    date: "2025-07-31",
    type: "PATCH",
    description: "Fix variables Mailjet - correction MJ_API_KEY/MJ_SECRET_KEY + amélioration gestion erreurs reCAPTCHA"
  },
{
    version: "1.27.1",
    date: "2025-07-31",
    type: "PATCH",
    description: "Fix password reset - correction trigger PostgreSQL + amélioration affichage reCAPTCHA"
  },
{
    version: "1.27.0",
    date: "2025-07-31",
    type: "MINOR",
    description: "Ajout fonctionnalité récupération mot de passe - modal + API + email + reCAPTCHA optionnel"
  },
{
    version: "1.26.2",
    date: "2025-07-31",
    type: "PATCH",
    description: "Amélioration UX login - loader global pendant chargement logo + API"
  },
{
    version: "1.26.1",
    date: "2025-07-31",
    type: "PATCH",
    description: "Fix erreur récupération logo login - correction référence REACT_APP_BACKEND_URL"
  },
{
    version: "1.26.0",
    date: "2025-07-31",
    type: "MINOR",
    description: "Correction validation domaine + ajout loaders UX - regex simplifiée pour accepter tous domaines valides"
  },
{
    version: "1.25.0",
    date: "2025-07-31",
    type: "MINOR",
    description: "Ajout personnalisation login par domaine - nouveau champ domaine société + API publique + détection automatique logo"
  },
{
    version: "1.24.3",
    date: "2025-07-31",
    type: "PATCH",
    description: "Fix: Suppression cadre signature PDF mandat portabilité"
  },
{
    version: "1.24.2",
    date: "2025-07-31",
    type: "PATCH",
    description: "Fix: Réorganisation partie basse PDF - Fait à/le vertical + signature côte à côte, suppression pied de page"
  },
{
    version: "1.24.1",
    date: "2025-07-31",
    type: "PATCH",
    description: "Fix: Optimisation logo PDF max 15mm + compactage mise en page pour préserver signature"
  },
{
    version: "1.24.0",
    date: "2025-07-31",
    type: "MINOR",
    description: "Feature: Loader génération PDF + message séparé + logo société dans mandat PDF"
  },
{
    version: "1.23.1",
    date: "2025-07-31",
    type: "PATCH",
    description: "Fix: Suppression site_web inexistant dans demandeur-info + script trigger demandeurs_societe"
  },
{
    version: "1.23.0",
    date: "2025-07-31",
    type: "MINOR",
    description: "Fix: Correction erreur demandeur-info telephone + ajout champ telephone_client formulaire portabilité"
  },
{
    version: "1.22.1",
    date: "2025-07-31",
    type: "PATCH",
    description: "Fix: Correction erreur 500 date_modification dans API demandeurs-societe PUT"
  },
{
    version: "1.22.0",
    date: "2025-07-31",
    type: "MINOR",
    description: "Feature: Génération PDF mandat de portabilité prérempli avec données société"
  },
{
    version: "1.21.3",
    date: "2025-07-31",
    type: "PATCH",
    description: "Fix: Correction ordre déconnexion - enregistrement log avant suppression token"
  },
{
    version: "1.21.2",
    date: "2025-07-31",
    type: "PATCH",
    description: "Fix: Correction de l'erreur PostgreSQL INET avec adresses IP multiples dans connexions-logs"
  },
{
    version: "1.21.1",
    date: "2025-07-31",
    type: "PATCH",
    description: "Fix: Correction de l'erreur React Hooks rules-of-hooks dans AuditPage"
  },
{
    version: "1.21.0",
    date: "2025-07-31",
    type: "MINOR",
    description: "Ajout de la fonctionnalité d'audit des connexions pour les agents"
  },
{
    version: "1.20.0",
    date: "2025-07-30",
    type: "MINOR",
    description: "Correction navigation: ajout menu 'Mes Clients' pour les demandeurs"
  },
{
    version: "1.19.8",
    date: "2025-07-30",
    type: "PATCH",
    description: "Finalisation correction clients: maintien solution NOW() stable et fonctionnelle"
  },
{
    version: "1.19.7",
    date: "2025-07-30",
    type: "PATCH",
    description: "Scripts SQL améliorés: correction ciblée trigger clients, diagnostic fonction globale"
  },
{
    version: "1.19.6",
    date: "2025-07-30",
    type: "PATCH",
    description: "Correction trigger clients: fix erreur date_modification dans update_updated_at_column"
  },
{
    version: "1.19.5",
    date: "2025-07-30",
    type: "PATCH",
    description: "Corrections clients: erreur API date_modification, pagination fonctionnelle, layout pleine page"
  },
{
    version: "1.19.4",
    date: "2025-07-30",
    type: "PATCH",
    description: "Modernisation gestion clients: affectation sociétés demandeurs, filtrage par société, correction pagination, champ société dans formulaires"
  },
{
    version: "1.19.3",
    date: "2025-07-30",
    type: "PATCH",
    description: "Amélioration avancement productions: calcul côté serveur pour affichage immédiat sans expansion"
  },
{
    version: "1.19.2",
    date: "2025-07-30",
    type: "PATCH",
    description: "Améliorations UX Productions et Portabilités: affichage avancement dans vue globale, auto-date hors scope, contrainte +11 jours ouvrés portabilités"
  },
{
    version: "1.19.1",
    date: "2025-07-30",
    type: "PATCH",
    description: "Corrections UX Productions: suppression gradient modal production, calcul avancement sans hors scope, filtre productions terminées, édition limitée agents, commentaires conversation gauche/droite"
  },
{
    version: "1.19.0",
    date: "2025-07-30",
    type: "MINOR",
    description: "Améliorations UX Portabilités, Productions et Dashboard - Dates dépassées, suppression infos test login, style modal productions, édition statut production agents, nouvelles statistiques productions"
  },
{
    version: "1.18.4",
    date: "2025-07-30",
    type: "PATCH",
    description: "Amélioration UX recherche productions: validation sur Entrée et actualisation tableau uniquement"
  },
{
    version: "1.18.3",
    date: "2025-07-30",
    type: "PATCH",
    description: "Corrections productions: compteurs fichiers, actualisation menus, recherche automatique et gestion messages UI"
  },
{
    version: "1.18.2",
    date: "2025-07-28",
    type: "PATCH",
    description: "Corrections visuelles Dashboard: suppression mention Vue Agent/Demandeur et correction tooltips undefined"
  },
{
    version: "1.18.1",
    date: "2025-07-28",
    type: "PATCH",
    description: "Bug fix: Correction authentification API Dashboard - harmonisation avec les autres APIs"
  },
{
    version: "1.18.0",
    date: "2025-07-28",
    type: "MINOR",
    description: "Bug fix: Correction appels API Dashboard et ajout données mockées pour développement"
  },
{
    version: "1.17.0",
    date: "2025-07-28",
    type: "MINOR",
    description: "Ajout page Dashboard avec graphiques et statistiques pour agents et demandeurs"
  },
{
    version: "1.16.0",
    date: "2025-07-28",
    type: "MINOR",
    description: "Correction envoi d'emails lors d'ajout/suppression de pièces jointes dans portabilités"
  },
{
    version: "1.15.1",
    date: "2025-07-28",
    type: "PATCH",
    description: "Solution définitive aux erreurs de build Netlify - suppression de netlify-cli des dépendances"
  },
{
    version: "1.15.0",
    date: "2025-07-28",
    type: "MINOR",
    description: "Correction erreur de build Netlify - ajout dépendance read-package-up"
  },
{
    version: "1.14.2",
    date: "2025-07-28",
    type: "PATCH",
    description: "Fix build Netlify - ajout dépendance uri-js et downgrade netlify-cli"
  },
{
    version: "1.14.1",
    date: "2025-07-28",
    type: "PATCH",
    description: "Correction hauteur sidebar avec footer sticky"
  },
{
    version: "1.14.0",
    date: "2025-07-28",
    type: "MINOR",
    description: "Système de gestion double demandeurs/sociétés avec permissions avancées"
  },
{
    version: "1.13.0",
    date: "2025-07-28",
    type: "MINOR",
    description: "Ajout documentation complète gestion expiration token"
  },
{
    version: "1.12.0",
    date: "2025-07-28",
    type: "MINOR",
    description: "Ajout gestion expiration token JWT avec notifications et redirections automatiques"
  },
{
    version: "1.11.0",
    date: "2025-07-27",
    type: "MINOR",
    description: "Ajout documentation validation formulaire portabilité"
  },
{
    version: "1.10.0",
    date: "2025-07-27",
    type: "MINOR",
    description: "Ajout validation étapes formulaire portabilité avec messages erreur et indicateurs visuels"
  },
{
    version: "1.9.0",
    date: "2025-07-27",
    type: "MINOR",
    description: "Ajout documentation corrections JWT token"
  },
{
    version: "1.8.1",
    date: "2025-07-27",
    type: "PATCH",
    description: "Correction compatibilité JWT token dans toutes les APIs et champs obligatoires formulaire portabilité"
  },
{
    version: "1.8.0",
    date: "2025-07-27",
    type: "MINOR",
    description: "Ajout documentation complète intégration API INSEE"
  },
{
    version: "1.7.0",
    date: "2025-07-27",
    type: "MINOR",
    description: "Ajout intégration API INSEE pour validation SIRET et auto-completion adresse"
  },
{
    version: "1.6.0",
    date: "2025-07-26",
    type: "MINOR",
    description: "Ajout documentation complète du système de versioning automatique"
  },
{
    version: "1.5.0",
    date: "2025-07-26",
    type: "MINOR",
    description: "Ajout système de versioning automatique avec scripts rapides"
  },
{
    version: "1.4.7",
    date: "2025-07-26",
    type: "PATCH",
    description: "Correction erreurs pièces jointes portabilité - suppression par demandeur et notifications commentaires"
  },
{
    version: "1.4.6",
    date: "2025-07-26",
    type: "PATCH",
    description: "Finalisation système versioning automatique intelligent avec détection de type"
  },
{
    version: "1.4.5",
    date: "2025-07-26",
    type: "PATCH",
    description: "Amélioration système versioning avec changelog automatique et scripts optimisés"
  },
{
    version: "1.4.4",
    date: "2025-07-26",
    type: "PATCH",
    description: "Implémentation système versioning automatique semver avec footer"
  },
{
    version: "1.4.3",
    date: "2025-07-26",
    type: "PATCH",
    description: "Correction API portabilite-fichiers (erreur 500 GET), amélioration layout modal portabilités"
  },
{
    version: "1.4.2",
    date: "2025-01-25",
    type: "PATCH",
    description: "Correction API portabilite-fichiers (erreur 500 GET), amélioration layout modal portabilités"
  },
  {
    version: "1.4.1", 
    date: "2025-01-24",
    type: "PATCH",
    description: "Correction validation automatique formulaire portabilité, ajout bouton annulation demandeurs"
  },
  {
    version: "1.4.0",
    date: "2025-01-23", 
    type: "MINOR",
    description: "Ajout section Portabilités complète avec CRUD, commentaires, pièces jointes"
  },
  {
    version: "1.3.0",
    date: "2025-01-20",
    type: "MINOR", 
    description: "Intégration Mailjet, notifications email, amélioration UX tickets"
  },
  {
    version: "1.2.0",
    date: "2025-01-15",
    type: "MINOR",
    description: "Système de commentaires tickets, upload fichiers, numérotation automatique"
  },
  {
    version: "1.1.0",
    date: "2025-01-10",
    type: "MINOR", 
    description: "Gestion clients avancée, filtres, pagination, dark mode"
  },
  {
    version: "1.0.0",
    date: "2025-01-05",
    type: "MAJOR",
    description: "Version initiale - Gestion tickets de support, authentification, CRUD de base"
  }
];