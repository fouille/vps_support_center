# Gestion de l'expiration des tokens JWT

## Problème résolu

Avant cette implémentation, lorsqu'un token JWT expirait après 24h, les utilisateurs continuaient à voir l'interface mais toutes les requêtes API échouaient avec des erreurs 500 "jwt expired". L'utilisateur restait bloqué sans comprendre pourquoi.

## Solution implémentée

### 1. **Détection multi-niveaux de l'expiration**

#### **Vérification côté client**
- Décodage du JWT et vérification de la date d'expiration
- Contrôle avant chaque requête API
- Vérification périodique toutes les 5 minutes

#### **Interception des réponses serveur**
- Détection des erreurs 401 (Unauthorized)
- Détection des erreurs 500 avec messages "jwt expired"
- Gestion des différents formats de messages d'erreur

### 2. **Actions automatiques lors de l'expiration**

#### **Nettoyage de la session**
```javascript
localStorage.removeItem('token');
localStorage.removeItem('user');
setUser(null);
```

#### **Notification utilisateur**
- Affichage d'un message "Session expirée"
- Notification visible pendant 3 secondes
- Style d'erreur avec icône et couleur rouge

#### **Redirection automatique**
- Redirection vers la page de connexion après 1 seconde
- Transition fluide avec délai pour laisser le temps de lire la notification

### 3. **Points de contrôle multiples**

#### **Au chargement de l'application**
```javascript
useEffect(() => {
  const token = localStorage.getItem('token');
  if (token && isTokenExpired(token)) {
    handleTokenExpiration(false); // Pas de notification au chargement
  }
}, []);
```

#### **Avant chaque requête API**
```javascript
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && isTokenExpired(token)) {
    handleTokenExpiration();
    return Promise.reject(new Error('Token expired'));
  }
  return config;
});
```

#### **Après chaque réponse API**
```javascript
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isTokenExpired = 
      error.response?.status === 401 || 
      (error.response?.status === 500 && 
       error.response?.data?.detail?.includes('jwt expired'));
    
    if (isTokenExpired) {
      handleTokenExpiration();
    }
    return Promise.reject(error);
  }
);
```

#### **Vérification périodique**
```javascript
const tokenCheckInterval = setInterval(() => {
  const currentToken = localStorage.getItem('token');
  if (currentToken && isTokenExpired(currentToken)) {
    handleTokenExpiration();
  }
}, 5 * 60 * 1000); // 5 minutes
```

## Fonctionnalités techniques

### **Décodage JWT côté client**
```javascript
const decodeJWT = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
};
```

### **Vérification d'expiration**
```javascript
const isTokenExpired = (token) => {
  if (!token) return true;
  
  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) return true;
  
  const currentTime = Math.floor(Date.now() / 1000);
  return decoded.exp < currentTime;
};
```

### **Notification utilisateur**
```javascript
const handleTokenExpiration = (showNotification = true) => {
  // Nettoyage de la session
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  setUser(null);
  
  if (showNotification) {
    // Affichage de la notification
    const notification = document.createElement('div');
    notification.innerHTML = `
      <div style="position: fixed; top: 20px; right: 20px; 
                  background: #f44336; color: white; padding: 16px; 
                  border-radius: 8px; z-index: 10000;">
        <strong>Session expirée</strong><br>
        Votre session a expiré. Redirection vers la connexion...
      </div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 3000);
  }
  
  // Redirection après délai
  setTimeout(() => {
    window.location.href = '/';
  }, 1000);
};
```

## Composants créés

### **Toast.js**
- Composant de notification réutilisable
- Support de différents types (success, error, warning, info)
- Animation d'apparition/disparition
- Fermeture automatique ou manuelle

### **ToastManager.js**
- Gestionnaire global de notifications
- Context Provider pour accès depuis toute l'application
- Gestion de la pile de notifications multiples

### **Script de test**
- **`test-token-expiration.js`** : Génère des tokens expirés pour tester
- Instructions pour simuler l'expiration
- Tokens expirés et tokens qui expirent dans 5 secondes

## Scénarios gérés

### **1. Token expiré au chargement**
- Détection silencieuse
- Nettoyage automatique
- Pas de notification (évite la confusion)

### **2. Token qui expire pendant la session**
- Notification "Session expirée"
- Redirection automatique
- Nettoyage de la session

### **3. Token expiré lors d'une requête API**
- Interception de l'erreur
- Notification utilisateur
- Redirection immédiate

### **4. Erreurs serveur liées au token**
- Détection des messages "jwt expired"
- Même traitement que les erreurs 401
- Gestion robuste des différents formats

## Bénéfices

### ✅ **Expérience utilisateur améliorée**
- Plus de blocage silencieux
- Notification claire de l'expiration
- Redirection automatique vers la connexion

### ✅ **Sécurité renforcée**
- Nettoyage automatique des tokens expirés
- Vérification multi-niveaux
- Pas de persistance de sessions invalides

### ✅ **Robustesse**
- Gestion des cas d'erreur multiples
- Fallback sur différents types de détection
- Vérification périodique préventive

### ✅ **Maintenance simplifiée**
- Code centralisé dans le contexte d'authentification
- Gestion automatique sans intervention manuelle
- Logs détaillés pour le debugging

## Test et validation

### **Pour tester l'expiration :**
1. Exécuter `node test-token-expiration.js`
2. Copier un token expiré généré
3. Remplacer le token dans le localStorage
4. Recharger la page ou effectuer une action
5. Observer la notification et la redirection

### **Scénarios de test :**
- [x] Token expiré au chargement
- [x] Token qui expire pendant la session
- [x] Erreur 401 en réponse API
- [x] Erreur 500 "jwt expired" en réponse API
- [x] Vérification périodique (5 minutes)
- [x] Notification et redirection automatique

---

**Version** : 1.12.0 | **Type** : MINOR | **Date** : 2025-07-28