#!/usr/bin/env node
// Script rapide pour versioner automatiquement à chaque modification
// Usage: node version-and-commit.js "Description du changement"

const { autoCommitVersion } = require('./scripts/auto-commit-version');

// Fonction principale
function quickVersion(description) {
  if (!description) {
    console.log('❌ Veuillez fournir une description');
    console.log('Usage: node version-and-commit.js "Description du changement"');
    console.log('');
    console.log('Exemples:');
    console.log('  node version-and-commit.js "Correction bug suppression fichiers"');
    console.log('  node version-and-commit.js "Ajout nouvelle fonctionnalité notifications"');
    console.log('  node version-and-commit.js "Refactoring architecture base de données"');
    process.exit(1);
  }

  console.log('🚀 Versioning automatique en cours...\n');
  
  const result = autoCommitVersion(description);
  
  if (result) {
    console.log('\n✅ Versioning terminé avec succès!');
    console.log(`📦 Nouvelle version: ${result.version}`);
    console.log(`🏷️  Type: ${result.type}`);
  }
}

// Exécution du script
if (require.main === module) {
  const args = process.argv.slice(2);
  const description = args.join(' ');
  quickVersion(description);
}

module.exports = { quickVersion };