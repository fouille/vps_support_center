#!/usr/bin/env node
// Script rapide pour versioner automatiquement à chaque modification
// Usage: node version-and-commit.js [type] "Description du changement"

const { autoCommitVersion } = require('./scripts/auto-commit-version');

// Fonction principale
function quickVersion(versionType, description) {
  // Si un seul argument est fourni, c'est la description (comportement legacy)
  if (!description && versionType) {
    description = versionType;
    versionType = null; // Auto-détection
  }

  if (!description) {
    console.log('❌ Veuillez fournir une description');
    console.log('Usage: node version-and-commit.js [type] "Description du changement"');
    console.log('');
    console.log('Types de version disponibles:');
    console.log('  majeure | major     - Incrémente X.y.z → (X+1).0.0');
    console.log('  mineure | minor     - Incrémente x.Y.z → x.(Y+1).z');
    console.log('  patch               - Incrémente x.y.Z → x.y.(Z+1)');
    console.log('  (aucun)             - Auto-détection basée sur la description');
    console.log('');
    console.log('Exemples:');
    console.log('  node version-and-commit.js patch "Correction bug suppression fichiers"');
    console.log('  node version-and-commit.js mineure "Ajout nouvelle fonctionnalité notifications"');
    console.log('  node version-and-commit.js majeure "Refactoring architecture base de données"');
    console.log('  node version-and-commit.js "Correction bug" (auto-détection)');
    process.exit(1);
  }

  console.log('🚀 Versioning automatique en cours...\n');
  
  const result = autoCommitVersion(description, versionType);
  
  if (result) {
    console.log('\n✅ Versioning terminé avec succès!');
    console.log(`📦 Nouvelle version: ${result.version}`);
    console.log(`🏷️  Type: ${result.type}`);
  }
}

// Exécution du script
if (require.main === module) {
  const args = process.argv.slice(2);
  
  // Vérifier si le premier argument est un type de version
  const validTypes = ['majeure', 'major', 'mineure', 'minor', 'patch'];
  const firstArg = args[0]?.toLowerCase();
  
  if (args.length >= 2 && validTypes.includes(firstArg)) {
    // Format: node version-and-commit.js [type] "description"
    const versionType = firstArg;
    const description = args.slice(1).join(' ');
    quickVersion(versionType, description);
  } else {
    // Format legacy: node version-and-commit.js "description"
    const description = args.join(' ');
    quickVersion(null, description);
  }
}

module.exports = { quickVersion };