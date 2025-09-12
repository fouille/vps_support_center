import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Users, 
  UserCheck, 
  Shield, 
  Ticket, 
  FileText, 
  LogOut, 
  Menu, 
  X,
  Sun,
  Moon,
  Phone,
  BarChart3,
  Factory,
  Activity
} from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout, isAgent } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const savedCollapsed = localStorage.getItem('sidebarCollapsed');
    return savedCollapsed === 'true';
  });
  
  // Initialiser le thème depuis localStorage ou par défaut dark
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme !== null) {
      return savedTheme === 'dark';
    }
    return true; // Par défaut dark mode
  });
  
  const [appName, setAppName] = useState('Support & Production');
  const [logoBase64, setLogoBase64] = useState(null);

  // Appliquer le thème au chargement du composant
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Récupérer le nom d'application basé sur la société de l'utilisateur
  useEffect(() => {
    const fetchAppName = async () => {
      if (!user) return;

      try {
        const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
        let appName = null;
        let favicon = null;
        
        // Méthode 1: Si l'utilisateur a un societe_id, récupérer via l'API sociétés
        if (user.societe_id || user.societe) {
          try {
            const response = await fetch(`${backendUrl}/api/demandeurs-societe?search=&limit=1000`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            });

            if (response.ok) {
              const data = await response.json();
              let userSociete = null;
              
              // Chercher d'abord par ID si disponible
              if (user.societe_id && data.societes) {
                userSociete = data.societes.find(s => s.id === user.societe_id);
              }
              
              // Si pas trouvé par ID, chercher par nom
              if (!userSociete && user.societe && data.societes) {
                userSociete = data.societes.find(s => s.nom_societe === user.societe);
              }
              
              if (userSociete) {
                appName = userSociete.nom_application;
                favicon = userSociete.favicon_base64;
                setLogoBase64(userSociete.logo_base64);
              }
            }
          } catch (error) {
            console.log('Erreur API sociétés:', error);
          }
        }
        
        // Méthode 2: Si pas de societe_id/societe ou échec, essayer par domaine
        if (!appName) {
          try {
            const currentDomain = window.location.hostname;
            const domainResponse = await fetch(`${backendUrl}/api/get-logo-by-domain?domaine=${encodeURIComponent(currentDomain)}`);
            
            if (domainResponse.ok) {
              const domainData = await domainResponse.json();
              appName = domainData.nom_application;
              favicon = domainData.favicon_base64;
              setLogoBase64(domainData.logo_base64);
            }
          } catch (error) {
            console.log('Erreur API domaine:', error);
          }
        }

        // Appliquer les changements si on a trouvé des données
        if (appName) {
          setAppName(appName);
          document.title = `${appName} - Gestion de Tickets`;
        } else {
          // Garder les valeurs par défaut
          setAppName('Support & Production');
          document.title = 'Support & Production - Gestion de Tickets';
        }

        // Appliquer le favicon si disponible
        if (favicon) {
          updatePageFavicon(favicon);
        }
        
      } catch (error) {
        console.log('Erreur lors de la récupération du nom d\'application:', error);
        // Utiliser les valeurs par défaut en cas d'erreur
        setAppName('Support & Production');
        document.title = 'Support & Production - Gestion de Tickets';
      }
    };

    fetchAppName();
  }, [user]);

  // Fonction pour mettre à jour le favicon
  const updatePageFavicon = (faviconBase64) => {
    try {
      // Supprimer les anciens favicons
      const existingFavicons = document.querySelectorAll('link[rel*="icon"]');
      existingFavicons.forEach(favicon => favicon.remove());

      // Créer le nouveau favicon
      const faviconLink = document.createElement('link');
      faviconLink.rel = 'icon';
      faviconLink.type = 'image/x-icon';
      faviconLink.href = faviconBase64;
      document.head.appendChild(faviconLink);

      // Ajouter aussi une version shortcut icon pour compatibilité
      const shortcutLink = document.createElement('link');
      shortcutLink.rel = 'shortcut icon';
      shortcutLink.type = 'image/x-icon';
      shortcutLink.href = faviconBase64;
      document.head.appendChild(shortcutLink);
    } catch (error) {
      console.log('Erreur mise à jour favicon:', error);
    }
  };

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    
    // Sauvegarder dans localStorage
    localStorage.setItem('theme', newDarkMode ? 'dark' : 'light');
    
    // Appliquer la classe CSS
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const toggleSidebarCollapse = () => {
    const newCollapsed = !sidebarCollapsed;
    setSidebarCollapsed(newCollapsed);
    localStorage.setItem('sidebarCollapsed', newCollapsed.toString());
  };

  const navigation = [
    { name: 'Dashboard', icon: BarChart3, path: '/dashboard' },
    ...(isAgent ? [
      { name: 'Support', icon: Ticket, path: '/tickets' },
      { name: 'Portabilités', icon: Phone, path: '/portabilites' },
      { name: 'Productions', icon: Factory, path: '/productions' },
      { name: 'Clients', icon: Users, path: '/clients' },
      { name: 'Demandeurs', icon: UserCheck, path: '/demandeurs' },
      { name: 'Agents', icon: Shield, path: '/agents' },
      { name: 'Audit', icon: Activity, path: '/audit' },
    ] : [
      { name: 'Mes Tickets', icon: Ticket, path: '/tickets' },
      { name: 'Mes Portabilités', icon: Phone, path: '/portabilites' },
      { name: 'Mes Productions', icon: Factory, path: '/productions' },
      { name: 'Mes Clients', icon: Users, path: '/clients' },
      { name: 'Mes Collaborateurs', icon: UserCheck, path: '/demandeurs' },
    ])
  ];

  const handleNavigate = (path) => {
    navigate(path);
    setSidebarOpen(false);
  };

  const isCurrentPage = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div className="flex h-full bg-gray-50 dark:bg-dark-bg">
      {/* Sidebar mobile backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 bg-white dark:bg-dark-surface shadow-lg transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-0 lg:shadow-none ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'} w-64`}>
        
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-dark-border">
          <div className="flex items-center space-x-3">
            {logoBase64 && (
              <img 
                src={logoBase64.startsWith('data:') ? logoBase64 : `data:image/png;base64,${logoBase64}`} 
                alt="Logo" 
                className="h-8 w-8 object-contain"
              />
            )}
            <h1 className="text-xl font-bold text-primary-600 dark:text-primary-400">
              {appName}
            </h1>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-dark-muted dark:hover:text-dark-text"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 mt-6 px-3 pb-6">
          <div className="space-y-1">
            {navigation.map((item) => (
              <button
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                className={`flex items-center w-full px-4 py-2 text-left text-gray-700 dark:text-dark-text hover:bg-primary-50 dark:hover:bg-dark-card rounded-lg transition-colors duration-200 ${
                  isCurrentPage(item.path) ? 'bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-300' : ''
                }`}
              >
                <item.icon className="h-5 w-5 mr-3" />
                {item.name}
              </button>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-dark-border">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-600 dark:text-dark-muted">Thème</span>
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg bg-gray-100 dark:bg-dark-card hover:bg-gray-200 dark:hover:bg-secondary-700 transition-colors"
            >
              {darkMode ? (
                <Sun className="h-4 w-4 text-yellow-500" />
              ) : (
                <Moon className="h-4 w-4 text-blue-500" />
              )}
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {user?.prenom?.[0]}{user?.nom?.[0]}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900 dark:text-dark-text">
                  {user?.prenom} {user?.nom}
                </p>
                <p className="text-xs text-gray-500 dark:text-dark-muted">
                  {user?.type_utilisateur === 'agent' ? 'Agent' : 'Demandeur'}
                </p>
              </div>
            </div>
            <button
              onClick={async () => {
                try {
                  await logout();
                } catch (error) {
                  console.error('Erreur lors de la déconnexion:', error);
                  // La déconnexion s'est quand même effectuée côté interface
                }
              }}
              className="p-2 text-gray-500 hover:text-red-600 dark:text-dark-muted dark:hover:text-red-400 transition-colors"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="h-16 bg-white dark:bg-dark-surface shadow-sm border-b border-gray-200 dark:border-dark-border flex items-center justify-between px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-dark-muted dark:hover:text-dark-text"
          >
            <Menu className="h-5 w-5" />
          </button>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600 dark:text-dark-muted">
              {user?.societe}
            </span>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;