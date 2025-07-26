#!/usr/bin/env node
// Script pour incrémenter automatiquement la version selon semver
// Usage: node scripts/increment-version.js [patch|minor|major]

const fs = require('fs');
const path = require('path');

const VERSION_FILE_PATH = path.join(__dirname, '../frontend/src/config/version.js');

// Fonction pour lire le fichier de version actuel
function getCurrentVersion() {
  const content = fs.readFileSync(VERSION_FILE_PATH, 'utf8');
  const majorMatch = content.match(/major:\s*(\d+)/);
  const minorMatch = content.match(/minor:\s*(\d+)/);
  const patchMatch = content.match(/patch:\s*(\d+)/);
  
  return {
    major: parseInt(majorMatch[1]),
    minor: parseInt(minorMatch[1]),
    patch: parseInt(patchMatch[1])
  };
}

// Fonction pour incrémenter la version
function incrementVersion(type = 'patch') {
  const current = getCurrentVersion();
  const newVersion = { ...current };
  
  switch (type.toLowerCase()) {
    case 'major':
      newVersion.major += 1;
      newVersion.minor = 0;
      newVersion.patch = 0;
      break;
    case 'minor':
      newVersion.minor += 1;
      newVersion.patch = 0;
      break;
    case 'patch':
    default:
      newVersion.patch += 1;
      break;
  }
  
  return newVersion;
}

// Fonction pour mettre à jour le fichier version.js
function updateVersionFile(newVersion, description = '') {
  let content = fs.readFileSync(VERSION_FILE_PATH, 'utf8');
  const today = new Date().toISOString().split('T')[0];
  
  // Mettre à jour les valeurs de version
  content = content.replace(/major:\s*\d+/, `major: ${newVersion.major}`);
  content = content.replace(/minor:\s*\d+/, `minor: ${newVersion.minor}`);
  content = content.replace(/patch:\s*\d+/, `patch: ${newVersion.patch}`);
  
  // Mettre à jour la date de build
  content = content.replace(
    /buildDate: new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\]/,
    `buildDate: "${today}"`
  );
  
  // Ajouter l'entrée dans l'historique si une description est fournie
  if (description) {
    const versionStr = `${newVersion.major}.${newVersion.minor}.${newVersion.patch}`;
    const typeStr = newVersion.patch > 0 ? 'PATCH' : newVersion.minor > 0 ? 'MINOR' : 'MAJOR';
    
    const historyEntry = `  {
    version: "${versionStr}",
    date: "${today}",
    type: "${typeStr}",
    description: "${description}"
  },`;
    
    content = content.replace(
      /export const VERSION_HISTORY = \[\s*/,
      `export const VERSION_HISTORY = [\n${historyEntry}\n`
    );
  }
  
  fs.writeFileSync(VERSION_FILE_PATH, content);
  
  console.log(`✅ Version incrémentée: ${newVersion.major}.${newVersion.minor}.${newVersion.patch}`);
  if (description) {
    console.log(`📝 Description: ${description}`);
  }
  console.log(`📅 Date: ${today}`);
}

// Exécution du script
if (require.main === module) {
  const args = process.argv.slice(2);
  const type = args[0] || 'patch';
  const description = args.slice(1).join(' ');
  
  const newVersion = incrementVersion(type);
  updateVersionFile(newVersion, description);
}

module.exports = {
  getCurrentVersion,
  incrementVersion,
  updateVersionFile
};