#!/usr/bin/env node
// Script pour mettre à jour automatiquement le CHANGELOG.md

const fs = require('fs');
const path = require('path');

const CHANGELOG_PATH = path.join(__dirname, '../CHANGELOG.md');
const VERSION_PATH = path.join(__dirname, '../frontend/src/config/version.js');

// Fonction pour obtenir la version actuelle
function getCurrentVersion() {
  const versionContent = fs.readFileSync(VERSION_PATH, 'utf8');
  const { VERSION_HISTORY } = require(VERSION_PATH);
  
  if (VERSION_HISTORY && VERSION_HISTORY.length > 0) {
    return VERSION_HISTORY[0];
  }
  
  return null;
}

// Fonction pour mettre à jour le changelog
function updateChangelog(versionInfo) {
  if (!versionInfo) {
    console.log('❌ Aucune information de version trouvée');
    return;
  }
  
  const changelogContent = fs.readFileSync(CHANGELOG_PATH, 'utf8');
  
  // Vérifier si cette version existe déjà dans le changelog
  if (changelogContent.includes(`## [${versionInfo.version}]`)) {
    console.log(`ℹ️  La version ${versionInfo.version} existe déjà dans le changelog`);
    return;
  }
  
  // Créer l'entrée de changelog
  const typeEmoji = {
    'MAJOR': '🚀',
    'MINOR': '✨', 
    'PATCH': '🔧'
  };
  
  const newEntry = `## [${versionInfo.version}] - ${versionInfo.date}
### ${versionInfo.type === 'PATCH' ? 'Fixed' : versionInfo.type === 'MINOR' ? 'Added' : 'Changed'}
- ${typeEmoji[versionInfo.type]} ${versionInfo.description}

`;
  
  // Insérer la nouvelle entrée après le header
  const headerEnd = changelogContent.indexOf('\n## [');
  if (headerEnd !== -1) {
    const updatedContent = 
      changelogContent.slice(0, headerEnd + 1) + 
      newEntry + 
      changelogContent.slice(headerEnd + 1);
    
    fs.writeFileSync(CHANGELOG_PATH, updatedContent);
    console.log(`✅ Changelog mis à jour avec la version ${versionInfo.version}`);
  } else {
    console.log('❌ Impossible de trouver l\'emplacement d\'insertion dans le changelog');
  }
}

// Exécution du script
if (require.main === module) {
  const versionInfo = getCurrentVersion();
  updateChangelog(versionInfo);
}

module.exports = { updateChangelog };