# Fonctionnalité de Récupération de Mot de Passe

## Vue d'ensemble
Cette fonctionnalité permet aux utilisateurs (agents et demandeurs) de réinitialiser leur mot de passe depuis la page de connexion.

## Fonctionnement

### Frontend (Login.js)
1. **Lien "Mot de passe oublié ?"** sur la page de connexion
2. **Modal de saisie** avec :
   - Champ email obligatoire
   - reCAPTCHA v3 invisible (si configuré)
   - Boutons Annuler/Réinitialiser
3. **Gestion des états** : loading, succès, erreur
4. **UX améliorée** : fermeture automatique après succès
5. **reCAPTCHA v3** : Protection invisible avec score de confiance

### Backend (password-reset.js)
1. **Validation** : email format, reCAPTCHA v3 (optionnel)
2. **Recherche utilisateur** dans `agents` et `demandeurs`
3. **Génération mot de passe sécurisé** : 12 caractères avec majuscules, minuscules, chiffres, symboles
4. **Hachage bcrypt** et mise à jour base de données
5. **Envoi email** via Mailjet avec template HTML professionnel
6. **Sécurité** : même message de succès que l'email existe ou non
7. **reCAPTCHA v3** : Vérification du score et de l'action

## Configuration requise

### Variables d'environnement Frontend (.env)
```bash
# Obligatoire
REACT_APP_BACKEND_URL=your_backend_url

# Optionnel - pour activer reCAPTCHA v3
REACT_APP_RECAPTCHA_SITE_KEY=your_google_recaptcha_v3_site_key
```

### Variables d'environnement Backend (Netlify)
```bash
# Obligatoire pour l'envoi d'emails
MJ_APIKEY_PUBLIC=your_mailjet_public_key
MJ_APIKEY_PRIVATE=your_mailjet_private_key

# Optionnel - pour activer reCAPTCHA v3
RECAPTCHA_SECRET_KEY=your_google_recaptcha_v3_secret_key

# Déjà configurées
JWT_SECRET=your_jwt_secret
NETLIFY_DATABASE_URL=your_neon_database_url
```

## Troubleshooting

### reCAPTCHA ne fonctionne pas
1. **Vérifier le type de clé** : Doit être une clé **reCAPTCHA v3** (pas v2)
2. **Vérifier la variable d'environnement** : `REACT_APP_RECAPTCHA_SITE_KEY` dans `/frontend/.env`
3. **Vérifier le domaine** : La clé doit être configurée pour votre domaine sur Google reCAPTCHA
4. **Redémarrer le serveur frontend** après modification des variables
5. **Vérifier les logs console** pour voir le chargement du script et la génération du token
6. **Alternative** : L'application fonctionne sans reCAPTCHA si non configuré

### Erreur "record new has no field date_modification"
1. **Exécuter le script de correction** : `/app/fix_password_reset_triggers.sql` sur Neon
2. **Cause** : Triggers PostgreSQL utilisant l'ancien nom de colonne
3. **Solution** : Le script corrige les triggers pour utiliser `updated_at`

### Email non reçu
1. **Vérifier les variables Mailjet** dans Netlify : `MJ_APIKEY_PUBLIC` et `MJ_APIKEY_PRIVATE`
2. **Consulter les logs Netlify** pour les erreurs d'envoi
3. **Vérifier les dossiers spam/indésirables**
4. **Tester les clés** avec l'API Mailjet directement

## Sécurité

### Mesures de protection
- **Anti-énumération** : même message de succès que l'email existe ou non
- **Délai simulé** : 1-2 secondes pour masquer la différence de traitement
- **reCAPTCHA v3** : Protection invisible contre les bots avec score de confiance
- **Mot de passe sécurisé** : génération aléatoire avec critères stricts
- **Hachage bcrypt** : stockage sécurisé des mots de passe

### Email de notification
- **Template professionnel** avec logo et couleurs
- **Mot de passe visible** dans un encadré sécurisé
- **Conseils de sécurité** intégrés
- **Lien de connexion** direct
- **Footer professionnel** avec copyright

## Utilisation

### Pour l'utilisateur
1. Cliquer sur "Mot de passe oublié ?" sur la page de connexion
2. Saisir son adresse email
3. La protection reCAPTCHA v3 fonctionne automatiquement en arrière-plan (si activée)
4. Cliquer "Réinitialiser"
5. Vérifier sa boîte email pour le nouveau mot de passe
6. Se connecter avec le nouveau mot de passe
7. (Recommandé) Changer le mot de passe après première connexion

### Pour l'administrateur
1. Configurer les variables d'environnement Mailjet
2. (Optionnel) Configurer reCAPTCHA
3. (Si erreur) Exécuter `/app/fix_password_reset_triggers.sql`
4. La fonctionnalité est automatiquement disponible

## Dépendances ajoutées
- **Frontend** : `react-google-recaptcha@3.1.0`
- **Backend** : `crypto@1.0.1` (pour génération mot de passe)

## API Endpoint
- **URL** : `/api/password-reset`
- **Méthode** : POST
- **Payload** : `{ email: string, recaptchaToken?: string }`
- **Réponse** : `{ success: boolean, message: string }`