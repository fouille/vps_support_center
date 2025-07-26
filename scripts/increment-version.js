#!/usr/bin/env node
// Script pour incrémenter automatiquement la version selon semver
// Usage: node scripts/increment-version.js [patch|minor|major] [description]

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
function updateVersionFile(newVersion, type, description = '') {
  let content = fs.readFileSync(VERSION_FILE_PATH, 'utf8');
  const today = new Date().toISOString().split('T')[0];
  
  // Mettre à jour les valeurs de version
  content = content.replace(/major:\s*\d+/, `major: ${newVersion.major}`);
  content = content.replace(/minor:\s*\d+/, `minor: ${newVersion.minor}`);
  content = content.replace(/patch:\s*\d+/, `patch: ${newVersion.patch}`);
  
  // Mettre à jour la date de build
  content = content.replace(
    /buildDate: new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\]|buildDate: "[^"]+"/,
    `buildDate: "${today}"`
  );
  
  // Ajouter l'entrée dans l'historique si une description est fournie
  if (description) {
    const versionStr = `${newVersion.major}.${newVersion.minor}.${newVersion.patch}`;
    const typeStr = type.toUpperCase() === 'MAJOR' ? 'MAJOR' : 
                    type.toUpperCase() === 'MINOR' ? 'MINOR' : 'PATCH';
    
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
  
  // Mettre à jour le package.json
  const packageJsonPath = path.join(__dirname, '../package.json');
  let packageContent = fs.readFileSync(packageJsonPath, 'utf8');
  const packageJson = JSON.parse(packageContent);
  packageJson.version = `${newVersion.major}.${newVersion.minor}.${newVersion.patch}`;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  
  console.log(`✅ Version incrémentée: ${newVersion.major}.${newVersion.minor}.${newVersion.patch}`);
  if (description) {
    console.log(`📝 Description: ${description}`);
  }
  console.log(`📅 Date: ${today}`);
  console.log(`📦 package.json mis à jour`);
  
  // Mettre à jour le changelog automatiquement
  try {
    const { updateChangelog } = require('./update-changelog');
    const typeStr = type.toUpperCase() === 'MAJOR' ? 'MAJOR' : 
                    type.toUpperCase() === 'MINOR' ? 'MINOR' : 'PATCH';
    updateChangelog({
      version: `${newVersion.major}.${newVersion.minor}.${newVersion.patch}`,
      date: today,
      type: typeStr,
      description: description || `Mise à jour ${typeStr.toLowerCase()}`
    });
  } catch (error) {
    console.log('⚠️  Impossible de mettre à jour le changelog automatiquement:', error.message);
  }
}

// Exécution du script
if (require.main === module) {
  const args = process.argv.slice(2);
  const type = args[0] || 'patch';
  const description = args.slice(1).join(' ');
  
  if (!description) {
    console.log('⚠️  Veuillez fournir une description pour la version');
    console.log('Usage: node scripts/increment-version.js [patch|minor|major] "Description du changement"');
    process.exit(1);
  }
  
  const newVersion = incrementVersion(type);
  updateVersionFile(newVersion, type, description);
}

module.exports = {
  getCurrentVersion,
  incrementVersion,
  updateVersionFile
};