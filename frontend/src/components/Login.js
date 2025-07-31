import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');
  const [logo, setLogo] = useState(null);
  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    const initializePage = async () => {
      // Détecter le domaine depuis l'URL
      const currentDomain = window.location.hostname;
      console.log('Domaine détecté:', currentDomain);
      
      if (currentDomain && currentDomain !== 'localhost') {
        await fetchLogoForDomain(currentDomain);
      }
      
      // Page entièrement chargée (avec ou sans logo)
      setPageLoading(false);
    };

    initializePage();
  }, []);

  const fetchLogoForDomain = async (domaine) => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
      const response = await fetch(`${backendUrl}/api/get-logo-by-domain?domaine=${encodeURIComponent(domaine)}`);
      
      if (response.ok) {
        const data = await response.json();
        setLogo(data.logo_base64);
        setCompanyName(data.nom_societe);
        console.log('Logo trouvé pour le domaine:', domaine, 'société:', data.nom_societe);
      } else {
        console.log('Aucun logo trouvé pour le domaine:', domaine);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du logo:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(email, password);
    
    if (!result.success) {
      setError(result.error);
    }
    
    setLoading(false);
  };

  // Afficher le loader pendant l'initialisation
  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-dark-bg dark:to-dark-surface flex items-center justify-center p-4">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary-600 rounded-full flex items-center justify-center mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
          </div>
          <p className="text-primary-600 dark:text-primary-400 font-medium">
            Chargement...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-dark-bg dark:to-dark-surface flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {logo ? (
            <div className="mx-auto h-16 w-auto flex items-center justify-center mb-2">
              <img 
                src={`data:image/jpeg;base64,${logo}`}
                alt={`Logo ${companyName}`}
                className="max-h-16 w-auto object-contain"
                style={{ maxWidth: '200px' }}
              />
            </div>
          ) : (
            <div className="mx-auto h-16 w-16 bg-primary-600 rounded-full flex items-center justify-center">
              <LogIn className="h-8 w-8 text-white" />
            </div>
          )}
          <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-dark-text">
            Connexion
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-dark-muted">
            {companyName ? `${companyName} - ` : ''}Système de gestion de tickets de support
          </p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-3" />
                <span className="text-red-700 dark:text-red-300 text-sm">{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-dark-muted" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="votre@email.fr"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-dark-muted" />
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <LogIn className="h-5 w-5 mr-2" />
                  Se connecter
                </>
              )}
            </button>
          </form>


        </div>
      </div>
    </div>
  );
};

export default Login;