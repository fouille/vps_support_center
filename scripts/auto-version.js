#!/usr/bin/env node
// Script d'auto-versioning intelligent basé sur les mots-clés de commit

const { incrementVersion, updateVersionFile } = require('./increment-version');

// Fonction pour déterminer le type de version basé sur une description
function determineVersionType(description) {
  const desc = description.toLowerCase();
  
  // Mots-clés pour version majeure (breaking changes)
  const majorKeywords = [
    'breaking', 'major', 'incompatible', 'migration', 'restructure',
    'refactor major', 'architecture', 'breaking change'
  ];
  
  // Mots-clés pour version mineure (nouvelles fonctionnalités)
  const minorKeywords = [
    'add', 'new', 'feature', 'implement', 'ajout', 'nouveau', 'nouvelle',
    'intégration', 'section', 'module', 'fonctionnalité', 'enhancement'
  ];
  
  // Si c'est une version majeure
  if (majorKeywords.some(keyword => desc.includes(keyword))) {
    return 'major';
  }
  
  // Si c'est une version mineure
  if (minorKeywords.some(keyword => desc.includes(keyword))) {
    return 'minor';
  }
  
  // Sinon c'est un patch (correction, amélioration)
  return 'patch';
}

// Auto-incrémentation basée sur la description
function autoIncrement(description) {
  const type = determineVersionType(description);
  const newVersion = incrementVersion(type);
  
  console.log(`🤖 Auto-versioning détecté: ${type.toUpperCase()}`);
  updateVersionFile(newVersion, type, description);
  
  return {
    version: `${newVersion.major}.${newVersion.minor}.${newVersion.patch}`,
    type: type.toUpperCase()
  };
}

// Exécution du script
if (require.main === module) {
  const args = process.argv.slice(2);
  const description = args.join(' ');
  
  if (!description) {
    console.log('❌ Veuillez fournir une description');
    console.log('Usage: node scripts/auto-version.js "Description du changement"');
    process.exit(1);
  }
  
  autoIncrement(description);
}

module.exports = {
  determineVersionType,
  autoIncrement
};