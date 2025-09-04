#!/usr/bin/env node
// Script pour automatiquement versioner et commiter les changements
// Usage: node scripts/auto-commit-version.js "Description du changement"

const { autoIncrement } = require('./auto-version');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Fonction pour vérifier s'il y a des modifications
function hasChanges() {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    return status.trim().length > 0;
  } catch (error) {
    console.log('⚠️  Impossible de vérifier le statut Git:', error.message);
    return false;
  }
}

// Fonction pour obtenir la liste des fichiers modifiés
function getModifiedFiles() {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    const lines = status.trim().split('\n').filter(line => line.length > 0);
    return lines.map(line => line.substring(3)).join(', ');
  } catch (error) {
    return 'Fichiers modifiés';
  }
}

// Fonction principale
function autoCommitVersion(description, explicitVersionType = null) {
  if (!description) {
    console.log('❌ Veuillez fournir une description');
    console.log('Usage: node scripts/auto-commit-version.js "Description du changement"');
    process.exit(1);
  }

  // Vérifier s'il y a des changements
  if (!hasChanges()) {
    console.log('✅ Aucun changement détecté');
    return;
  }

  // Incrémenter la version avec le type explicite ou auto-détection
  const result = autoIncrement(description, explicitVersionType);
  
  // Obtenir la liste des fichiers modifiés
  const modifiedFiles = getModifiedFiles();
  
  console.log(`\n📋 Résumé des changements:`);
  console.log(`- Version: ${result.version} (${result.type})`);
  console.log(`- Fichiers: ${modifiedFiles}`);
  console.log(`- Description: ${description}`);
  
  // Optionnel: Commiter automatiquement (décommenté si souhaité)
  /*
  try {
    execSync('git add .');
    execSync(`git commit -m "v${result.version}: ${description}"`);
    console.log(`✅ Changements commités avec la version ${result.version}`);
  } catch (error) {
    console.log('⚠️  Impossible de commiter automatiquement:', error.message);
  }
  */
  
  return result;
}

// Exécution du script
if (require.main === module) {
  const args = process.argv.slice(2);
  const description = args.join(' ');
  autoCommitVersion(description);
}

module.exports = {
  autoCommitVersion,
  hasChanges,
  getModifiedFiles
};