# Corrections des erreurs de pièces jointes - Portabilités

## Problèmes identifiés et résolus

### 1. Erreur "Seuls les agents peuvent supprimer des fichiers"
**Cause :** Incohérence entre le format du JWT token et la vérification du type d'utilisateur
- Le JWT token contenait le champ `type` au lieu de `type_utilisateur`
- L'API `portabilite-fichiers.js` vérifiait `decoded.type_utilisateur` uniquement

**Solution :** Ajout d'une logique de fallback dans toutes les vérifications
```javascript
const userType = decoded.type_utilisateur || decoded.type;
```

### 2. Erreur "Données de fichier requises" lors de l'upload
**Cause :** Mauvaise transmission du `portabiliteId` dans la requête
- Le frontend envoyait `portabiliteId` en query parameter
- L'API `portabilite-fichiers.js` attendait `portabiliteId` dans le body

**Solution :** Modification du frontend pour envoyer `portabiliteId` dans le body
```javascript
// Avant
await api.post(`/api/portabilite-fichiers?portabiliteId=${portabiliteId}`, fileData);

// Après
const fileData = {
    portabiliteId: portabiliteId,
    nom_fichier: file.name,
    type_fichier: file.type,
    taille_fichier: file.size,
    contenu_base64: base64
};
await api.post(`/api/portabilite-fichiers`, fileData);
```

## Fichiers modifiés

### 1. `/app/frontend/src/components/PortabiliteModal.js`
- Correction de l'envoi du `portabiliteId` dans le body de la requête POST

### 2. `/app/netlify/functions/portabilite-fichiers.js`
- Ajout de la logique de fallback pour `type_utilisateur || type`
- Correction dans toutes les vérifications d'accès et de permissions

### 3. `/app/netlify/functions/auth.js`
- Correction du JWT token pour utiliser `type_utilisateur` au lieu de `type`

### 4. `/app/netlify/functions/migrate-db.js`
- Nouveau fichier pour migrer la structure de base de données
- Ajout de la logique de fallback pour la compatibilité des tokens

## Tests effectués

### Test de validation logique
- ✅ Vérification de la compatibilité avec les anciens et nouveaux formats de token
- ✅ Validation des permissions de suppression pour les agents
- ✅ Validation des champs requis pour l'upload de fichiers
- ✅ Test des cas d'usage pour agents et demandeurs

### Test de l'interface utilisateur
- ✅ Page de connexion fonctionnelle
- ✅ Frontend accessible via l'URL de preview

## Prochaines étapes recommandées

1. **Tester en production** : Vérifier que les corrections fonctionnent avec une session utilisateur réelle
2. **Exécuter la migration** : Utiliser l'endpoint `/api/migrate-db` pour finaliser la structure de la base de données
3. **Validation utilisateur** : Confirmer que les opérations de suppression et d'upload fonctionnent correctement

## Compatibilité

Ces corrections maintiennent la compatibilité avec :
- Les anciens tokens JWT (champ `type`)
- Les nouveaux tokens JWT (champ `type_utilisateur`)
- Les permissions existantes pour agents et demandeurs
- Toutes les fonctionnalités existantes de l'application

## Résumé technique

Les corrections apportées résolvent les problèmes signalés tout en maintenant la compatibilité ascendante et descendante. La logique de fallback garantit que l'application fonctionne indépendamment du format du token JWT utilisé.