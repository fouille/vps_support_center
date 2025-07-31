import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export { AuthContext };

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Fonction utilitaire pour décoder le JWT sans vérification (côté client)
const decodeJWT = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
};

// Fonction pour vérifier si le token est expiré
const isTokenExpired = (token) => {
  if (!token) return true;
  
  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) return true;
  
  const currentTime = Math.floor(Date.now() / 1000);
  return decoded.exp < currentTime;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || '';

  // Fonction pour gérer la déconnexion pour expiration de token
  const handleTokenExpiration = (showNotification = true) => {
    console.log('Token expired, logging out user');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    
    if (showNotification) {
      // Afficher la notification temporairement avec du CSS inline
      const notification = document.createElement('div');
      notification.innerHTML = `
        <div style="
          position: fixed;
          top: 20px;
          right: 20px;
          background: #f44336;
          color: white;
          padding: 16px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.2);
          z-index: 10000;
          font-family: Arial, sans-serif;
          font-size: 14px;
          max-width: 300px;
        ">
          <strong>Session expirée</strong><br>
          Votre session a expiré. Redirection vers la connexion...
        </div>
      `;
      document.body.appendChild(notification);
      
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 3000);
    }
    
    // Redirection vers la page de connexion après un court délai
    setTimeout(() => {
      window.location.href = '/';
    }, 1000);
  };

  // Create axios instance
  const api = axios.create({
    baseURL: API_BASE_URL
  });

  // Add request interceptor to ensure token is always sent and check expiration
  api.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        // Vérifier si le token est expiré côté client
        if (isTokenExpired(token)) {
          console.log('Token expired on client side, logging out');
          handleTokenExpiration();
          return Promise.reject(new Error('Token expired'));
        }
        
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Add response interceptor to handle token expiration
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      const isTokenExpired = 
        error.response?.status === 401 || 
        (error.response?.status === 500 && 
         (error.response?.data?.detail?.includes('jwt expired') || 
          error.response?.data?.detail?.includes('Token expiré') ||
          error.response?.data?.detail?.includes('Invalid token')));
      
      if (isTokenExpired) {
        handleTokenExpiration();
      }
      return Promise.reject(error);
    }
  );

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      // Vérifier immédiatement si le token est expiré
      if (isTokenExpired(token)) {
        console.log('Token expired on app load, clearing storage');
        handleTokenExpiration(false); // Pas de notification au chargement
      } else {
        try {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
        } catch (error) {
          console.error('Error parsing user data:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
    }
    setLoading(false);
    
    // Vérification périodique du token (toutes les 5 minutes)
    const tokenCheckInterval = setInterval(() => {
      const currentToken = localStorage.getItem('token');
      if (currentToken && isTokenExpired(currentToken)) {
        console.log('Token expired during session, logging out');
        handleTokenExpiration();
      }
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(tokenCheckInterval);
  }, []);

  // Fonction pour enregistrer un log de connexion
  const logConnectionAction = async (userData, actionType) => {
    try {
      await api.post('/api/connexions-logs', {
        user_id: userData.id,
        user_type: userData.type_utilisateur,
        user_email: userData.email,
        user_nom: userData.nom,
        user_prenom: userData.prenom,
        action_type: actionType
      });
      console.log(`${actionType} logged for user:`, userData.email);
    } catch (error) {
      console.error(`Error logging ${actionType}:`, error);
      // Ne pas bloquer le processus de connexion/déconnexion si le log échoue
    }
  };

  const login = async (email, password) => {
    try {
      const response = await api.post('/api/auth', { email, password });
      const { access_token, user: userData } = response.data;
      
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(userData));
      
      setUser(userData);
      
      // Enregistrer le log de connexion (en arrière-plan)
      logConnectionAction(userData, 'login');
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Erreur de connexion' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user,
    isAgent: user?.type_utilisateur === 'agent',
    isDemandeur: user?.type_utilisateur === 'demandeur',
    api
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};