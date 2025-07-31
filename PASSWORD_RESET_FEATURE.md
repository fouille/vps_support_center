# Fonctionnalité de Récupération de Mot de Passe

## Vue d'ensemble
Cette fonctionnalité permet aux utilisateurs (agents et demandeurs) de réinitialiser leur mot de passe depuis la page de connexion.

## Fonctionnement

### Frontend (Login.js)
1. **Lien "Mot de passe oublié ?"** sur la page de connexion
2. **Modal de saisie** avec :
   - Champ email obligatoire
   - reCAPTCHA optionnel (si configuré)
   - Boutons Annuler/Réinitialiser
3. **Gestion des états** : loading, succès, erreur
4. **UX améliorée** : fermeture automatique après succès

### Backend (password-reset.js)
1. **Validation** : email format, reCAPTCHA (optionnel)
2. **Recherche utilisateur** dans `agents` et `demandeurs`
3. **Génération mot de passe sécurisé** : 12 caractères avec majuscules, minuscules, chiffres, symboles
4. **Hachage bcrypt** et mise à jour base de données
5. **Envoi email** via Mailjet avec template HTML professionnel
6. **Sécurité** : même message de succès que l'email existe ou non

## Configuration requise

### Variables d'environnement Frontend (.env)
```bash
# Obligatoire
REACT_APP_BACKEND_URL=your_backend_url

# Optionnel - pour activer reCAPTCHA
REACT_APP_RECAPTCHA_SITE_KEY=your_google_recaptcha_site_key
```

### Variables d'environnement Backend (Netlify)
```bash
# Obligatoire pour l'envoi d'emails
MAILJET_API_KEY=your_mailjet_api_key
MAILJET_SECRET_KEY=your_mailjet_secret_key

# Optionnel - pour activer reCAPTCHA
RECAPTCHA_SECRET_KEY=your_google_recaptcha_secret_key

# Déjà configurées
JWT_SECRET=your_jwt_secret
NETLIFY_DATABASE_URL=your_neon_database_url
```

## Troubleshooting

### reCAPTCHA ne s'affiche pas
1. **Vérifier la variable d'environnement** : `REACT_APP_RECAPTCHA_SITE_KEY` dans `/frontend/.env`
2. **Décommenter la ligne** si elle est commentée
3. **Redémarrer le serveur frontend** après modification
4. **Vérifier les logs console** pour voir si la clé est bien lue
5. **Alternative** : Si non configuré, un message informatif s'affiche

### Erreur "record new has no field date_modification"
1. **Exécuter le script de correction** : `/app/fix_password_reset_triggers.sql` sur Neon
2. **Cause** : Triggers PostgreSQL utilisant l'ancien nom de colonne
3. **Solution** : Le script corrige les triggers pour utiliser `updated_at`

### Email non reçu
1. **Vérifier les variables Mailjet** dans Netlify
2. **Consulter les logs Netlify** pour les erreurs d'envoi
3. **Vérifier les dossiers spam/indésirables**

## Sécurité

### Mesures de protection
- **Anti-énumération** : même message de succès que l'email existe ou non
- **Délai simulé** : 1-2 secondes pour masquer la différence de traitement
- **reCAPTCHA optionnel** : protection contre les bots
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
3. Compléter le reCAPTCHA (si activé)
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