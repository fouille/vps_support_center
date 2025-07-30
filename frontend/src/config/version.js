// Système de versioning automatique - Semantic Versioning (semver)
// Format: MAJOR.MINOR.PATCH
// MAJOR: Changements incompatibles avec versions précédentes
// MINOR: Nouvelles fonctionnalités compatibles
// PATCH: Corrections de bugs compatibles

export const VERSION_CONFIG = {
  major: 1,      // Version majeure - changements breaking
  minor: 18,      // Version mineure - nouvelles fonctionnalités
  patch: 3,      // Version patch - corrections de bugs
  buildDate: "2025-07-30", // Date de build automatique
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