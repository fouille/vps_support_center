// Système de versioning automatique - Semantic Versioning (semver)
// Format: MAJOR.MINOR.PATCH
// MAJOR: Changements incompatibles avec versions précédentes
// MINOR: Nouvelles fonctionnalités compatibles
// PATCH: Corrections de bugs compatibles

export const VERSION_CONFIG = {
  major: 1,      // Version majeure - changements breaking
  minor: 4,      // Version mineure - nouvelles fonctionnalités
  patch: 4,      // Version patch - corrections de bugs
  buildDate: "2025-07-26", // Date de build automatique
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