# Guide d'utilisation - Validation SIRET avec API INSEE

## Comment utiliser la nouvelle fonctionnalité

### 1. **Accéder au formulaire**
- Aller dans "Portabilités" → "Nouvelle portabilité"
- Passer à l'étape 2 "Données du client"

### 2. **Saisir le SIRET**
- Le champ SIRET est maintenant **en premier** dans le formulaire
- Saisir les 14 chiffres du SIRET (espaces et points supprimés automatiquement)
- La validation se déclenche automatiquement à 14 chiffres

### 3. **Vérification automatique**
- **Indicateur de chargement** : "Vérification..." avec spinner
- **Succès** : Icône verte "Données récupérées"
- **Erreur** : Icône rouge avec message d'erreur

### 4. **Auto-completion**
En cas de succès, les champs suivants sont automatiquement remplis :
- **Adresse** : Numéro + type de voie + nom de voie
- **Code postal** : Code postal de l'établissement
- **Ville** : Nom de la commune

### 5. **Modification possible**
- Tous les champs restent éditables même après auto-completion
- Possibilité de corriger ou compléter les informations
- Le formulaire fonctionne normalement même en cas d'erreur

## Messages d'erreur possibles

| Message | Signification | Action |
|---------|---------------|---------|
| "SIRET not found" | SIRET inexistant dans la base INSEE | Vérifier le numéro ou saisir manuellement |
| "SIRET must be exactly 14 digits" | Format invalide | Saisir exactement 14 chiffres |
| "INSEE API key not configured" | Problème de configuration | Contacter l'administrateur |
| "Erreur lors de la récupération..." | Problème réseau/API | Réessayer ou saisir manuellement |

## Avantages

### ✅ **Gain de temps**
- Plus besoin de saisir manuellement l'adresse
- Validation automatique du SIRET

### ✅ **Réduction d'erreurs**
- Données officielles INSEE
- Format SIRET validé automatiquement

### ✅ **Flexibilité**
- Fonctionnement non bloquant
- Modification manuelle possible

### ✅ **Feedback visuel**
- Indicateurs clairs de statut
- Messages d'aide contextuels

## Exemple d'utilisation

### Cas d'usage typique :
1. **Saisir** : `388 467 706 00015` (avec espaces)
2. **Nettoyage automatique** : `38846770600015`
3. **Validation** : Appel API INSEE
4. **Résultat** : 
   - Adresse : `31 AVENUE JEAN JAURES`
   - Code postal : `69007`
   - Ville : `LYON`

### En cas d'erreur :
1. **Message affiché** : "SIRET not found"
2. **Action** : Saisir manuellement les champs adresse
3. **Continuer** : Le formulaire reste fonctionnel

## Configuration pour administrateur

### Variable d'environnement requise :
```bash
INSEE_API_KEY=your_insee_api_key_here
```

### Obtenir une clé API INSEE :
1. Créer un compte sur [api.insee.fr](https://api.insee.fr)
2. Demander l'accès à l'API Sirene
3. Configurer la clé dans les variables d'environnement Netlify

## Support

En cas de problème :
1. Vérifier que la clé API INSEE est configurée
2. Tester avec un SIRET connu valide
3. Vérifier les logs de l'API pour plus de détails
4. Utiliser la saisie manuelle en cas de panne temporaire

---

**Version** : 1.7.0 | **Mise à jour** : 2025-07-27