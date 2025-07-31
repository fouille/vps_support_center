import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, Mail, Lock, AlertCircle, X } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');
  const [logo, setLogo] = useState(null);
  const [companyName, setCompanyName] = useState('');
  
  // États pour le modal de récupération de mot de passe
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');
  const [recaptchaLoaded, setRecaptchaLoaded] = useState(false);

  useEffect(() => {
    const initializePage = async () => {
      // Détecter le domaine depuis l'URL
      const currentDomain = window.location.hostname;
      console.log('Domaine détecté:', currentDomain);
      console.log('reCAPTCHA Site Key:', process.env.REACT_APP_RECAPTCHA_SITE_KEY);
      
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

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError('');
    setResetMessage('');

    try {
      // Récupérer le token reCAPTCHA si disponible
      let recaptchaToken = null;
      if (recaptchaRef.current) {
        try {
          recaptchaToken = recaptchaRef.current.getValue();
        } catch (error) {
          console.warn('Erreur récupération token reCAPTCHA:', error);
          // Continuer sans token reCAPTCHA
        }
      }

      const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
      const response = await fetch(`${backendUrl}/api/password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: resetEmail,
          recaptchaToken
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResetMessage(data.message);
        setResetEmail('');
        if (recaptchaRef.current) {
          recaptchaRef.current.reset();
        }
        // Fermer le modal après 3 secondes
        setTimeout(() => {
          setShowResetModal(false);
          setResetMessage('');
        }, 3000);
      } else {
        setResetError(data.error || 'Erreur lors de la réinitialisation');
      }
    } catch (error) {
      setResetError('Erreur de connexion');
      console.error('Erreur reset password:', error);
    } finally {
      setResetLoading(false);
    }
  };

  const openResetModal = () => {
    setShowResetModal(true);
    setResetEmail('');
    setResetError('');
    setResetMessage('');
  };

  const closeResetModal = () => {
    setShowResetModal(false);
    setResetEmail('');
    setResetError('');
    setResetMessage('');
    if (recaptchaRef.current) {
      recaptchaRef.current.reset();
    }
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

            {/* Lien mot de passe oublié */}
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={openResetModal}
                className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300 transition-colors"
              >
                Mot de passe oublié ?
              </button>
            </div>
          </form>

          {/* Modal de récupération de mot de passe */}
          {showResetModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-dark-surface rounded-lg p-6 w-full max-w-md mx-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text">
                    Réinitialiser le mot de passe
                  </h2>
                  <button
                    onClick={closeResetModal}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {resetMessage && (
                  <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-green-700 dark:text-green-300">{resetMessage}</p>
                      </div>
                    </div>
                  </div>
                )}

                {resetError && (
                  <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-center">
                      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-3" />
                      <span className="text-red-700 dark:text-red-300 text-sm">{resetError}</span>
                    </div>
                  </div>
                )}

                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <div>
                    <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                      Adresse email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-dark-muted" />
                      <input
                        id="reset-email"
                        type="email"
                        required
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="input pl-10"
                        placeholder="votre@email.fr"
                        disabled={resetLoading}
                      />
                    </div>
                  </div>

                  {/* reCAPTCHA - seulement si la clé publique est configurée */}
                  {process.env.REACT_APP_RECAPTCHA_SITE_KEY && process.env.REACT_APP_RECAPTCHA_SITE_KEY !== 'your_site_key_here' ? (
                    <div className="flex justify-center">
                      <ReCAPTCHA
                        ref={recaptchaRef}
                        sitekey={process.env.REACT_APP_RECAPTCHA_SITE_KEY}
                        theme="light"
                        onErrored={(error) => {
                          console.error('reCAPTCHA error:', error);
                          setResetError('Erreur reCAPTCHA - Vous pouvez continuer sans validation captcha');
                        }}
                        onExpired={() => {
                          console.log('reCAPTCHA expired');
                          if (recaptchaRef.current) {
                            recaptchaRef.current.reset();
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                      ℹ️ reCAPTCHA non configuré - protection basique active
                    </div>
                  )}

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={closeResetModal}
                      className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      disabled={resetLoading}
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      disabled={resetLoading}
                    >
                      {resetLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        'Réinitialiser'
                      )}
                    </button>
                  </div>
                </form>

                <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
                  Un nouveau mot de passe sera généré et envoyé par email si l'adresse est valide.
                </div>
              </div>
            </div>
          )}


        </div>
      </div>
    </div>
  );
};

export default Login;