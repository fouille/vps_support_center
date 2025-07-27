# Intégration API INSEE pour validation SIRET

## Fonctionnalités ajoutées

### 1. **Validation automatique du SIRET**
- **Nettoyage automatique** : Suppression des espaces, points et caractères non numériques
- **Limitation à 14 chiffres** : Validation du format SIRET standard
- **Vérification en temps réel** : Appel API dès que 14 chiffres sont saisis

### 2. **Auto-completion des données entreprise**
- **Adresse complète** : Numéro + type de voie + libellé de voie
- **Code postal** : Récupération automatique
- **Ville** : Nom de la commune

### 3. **Interface utilisateur améliorée**
- **SIRET en premier** : Repositionné en haut du formulaire étape 2
- **Indicateurs visuels** : Loading, succès, erreur
- **Messages informatifs** : Indication des champs pré-remplis
- **Modification possible** : Les champs restent éditables après auto-completion

## Configuration requise

### Variable d'environnement Netlify
```bash
INSEE_API_KEY=your_insee_api_key_here
```

### Endpoint API créé
- **URL** : `/api/insee-api`
- **Méthode** : GET
- **Paramètre** : `siret` (14 chiffres)

## Exemple d'utilisation

### Requête API
```bash
curl -X 'GET' \
  'https://api.insee.fr/api-sirene/3.11/siret/38846770600015' \
  -H 'accept: application/json' \
  -H 'X-INSEE-Api-Key-Integration: INSEE_API_KEY'
```

### Réponse traitée
```json
{
  "siret": "38846770600015",
  "denomination": "APODIS VOYAGES",
  "adresse": {
    "numeroVoie": "31",
    "typeVoie": "AVENUE",
    "libelleVoie": "JEAN JAURES",
    "codePostal": "69007",
    "commune": "LYON",
    "adresseComplete": "31 AVENUE JEAN JAURES"
  },
  "etatAdministratif": "A",
  "activitePrincipale": "79.11Z"
}
```

## Gestion des erreurs

### Erreurs gérées
- **SIRET introuvable** : Message "SIRET not found"
- **Format invalide** : Message "SIRET must be exactly 14 digits"
- **Clé API manquante** : Message "INSEE API key not configured"
- **Erreur réseau** : Message générique avec détails

### Comportement non bloquant
- Les erreurs n'empêchent pas la saisie manuelle
- Les champs restent éditables en cas d'échec
- L'utilisateur peut continuer sans validation SIRET

## Amélioration UX

### États visuels
- **Loading** : Spinner avec message "Vérification..."
- **Succès** : Icône verte avec "Données récupérées"
- **Erreur** : Icône rouge avec message d'erreur

### Indications contextuelles
- **Placeholders** : "Adresse sera remplie automatiquement"
- **Labels enrichis** : "(remplie automatiquement)" en cas de succès
- **Aide utilisateur** : "14 chiffres (espaces et points supprimés automatiquement)"

## Fichiers modifiés

### 1. **`/app/netlify/functions/insee-api.js`** (nouveau)
- Endpoint pour interroger l'API INSEE
- Validation et nettoyage du SIRET
- Gestion des erreurs et formatage des réponses

### 2. **`/app/frontend/src/components/PortabiliteForm.js`**
- Réorganisation des champs (SIRET en premier)
- Ajout de la logique de validation SIRET
- Intégration de l'auto-completion
- Amélioration de l'interface utilisateur

## Bénéfices utilisateur

1. **Gain de temps** : Saisie automatique des données d'adresse
2. **Réduction d'erreurs** : Validation automatique du SIRET
3. **Expérience fluide** : Interface responsive avec feedback visuel
4. **Flexibilité** : Possibilité de modification manuelle des données
5. **Fiabilité** : Données officielles INSEE

## Version
- **Version actuelle** : 1.7.0
- **Type de changement** : MINOR (nouvelle fonctionnalité)
- **Date** : 2025-07-27