# Corrections - Suppression de fichiers par demandeur et notifications

## Modifications apportées

### 1. Autorisation de suppression pour les demandeurs

#### Dans l'API (`/app/netlify/functions/portabilite-fichiers.js`)
```javascript
// Avant
if (userType !== 'agent') {
  return {
    statusCode: 403,
    headers,
    body: JSON.stringify({ error: 'Seuls les agents peuvent supprimer des fichiers' })
  };
}

// Après
if (userType !== 'agent' && userType !== 'demandeur') {
  return {
    statusCode: 403,
    headers,
    body: JSON.stringify({ error: 'Accès non autorisé' })
  };
}
```

#### Dans l'interface (`/app/frontend/src/components/PortabiliteModal.js`)
```javascript
// Avant
{(user.type_utilisateur === 'agent' || file.uploaded_by_type === 'demandeur') && (
  <button onClick={() => handleFileDelete(file.id)}>

// Après
{(user.type_utilisateur === 'agent' || user.type_utilisateur === 'demandeur') && (
  <button onClick={() => handleFileDelete(file.id)}>
```

### 2. Correction des notifications de commentaires

#### Problème identifié
Les notifications dans les commentaires fonctionnaient pour les agents mais pas pour les demandeurs à cause d'un double système :
- L'API côté serveur ajoutait automatiquement un commentaire
- Le frontend ajoutait aussi un commentaire côté client
- Cela créait des conflits et des doublons

#### Solution implémentée
```javascript
// Suppression du code de commentaire côté frontend
// Et ajout du rafraîchissement des commentaires après upload/suppression

// Pour l'upload
await api.post(`/api/portabilite-fichiers`, fileData);
// Recharger les fichiers et commentaires (l'API ajoute automatiquement le commentaire)
fetchFichiers();
fetchCommentaires();

// Pour la suppression
await api.delete(`/api/portabilite-fichiers?portabiliteId=${portabiliteId}&fileId=${fileId}`);
// Recharger les fichiers et commentaires (l'API ajoute automatiquement le commentaire)
fetchFichiers();
fetchCommentaires();
```

### 3. Vérification de l'API côté serveur

L'API côté serveur était déjà correcte pour les notifications :
- Upload : `📎 Fichier ajouté: ${nom_fichier}`
- Suppression : `🗑️ Fichier supprimé: ${deletedFile.nom_fichier}`

## Résultat

### ✅ Permissions de suppression
- Les agents peuvent supprimer tous les fichiers
- Les demandeurs peuvent maintenant supprimer tous les fichiers
- Le bouton de suppression est maintenant visible pour les demandeurs

### ✅ Notifications de commentaires
- Les notifications fonctionnent maintenant pour les agents ET les demandeurs
- Pas de doublons de commentaires
- Rafraîchissement automatique de la liste des commentaires après upload/suppression

## Fichiers modifiés

1. **`/app/netlify/functions/portabilite-fichiers.js`** : Modification des permissions de suppression
2. **`/app/frontend/src/components/PortabiliteModal.js`** : 
   - Modification de la condition d'affichage du bouton de suppression
   - Suppression du code de commentaire côté frontend
   - Ajout du rafraîchissement des commentaires après les actions

## Test recommandé

1. Se connecter en tant que demandeur
2. Ajouter une pièce jointe à une portabilité
3. Vérifier que le commentaire apparaît automatiquement
4. Supprimer la pièce jointe
5. Vérifier que le commentaire de suppression apparaît automatiquement