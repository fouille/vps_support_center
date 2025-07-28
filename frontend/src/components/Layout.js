import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
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
  BarChart3
} from 'lucide-react';

const Layout = ({ children, currentPage, onNavigate }) => {
  const { user, logout, isAgent } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  const navigation = [
    { name: 'Dashboard', icon: BarChart3, key: 'dashboard' },
    ...(isAgent ? [
      { name: 'Supervision Tickets', icon: Ticket, key: 'tickets' },
      { name: 'Portabilités', icon: Phone, key: 'portabilites' },
      { name: 'Clients', icon: Users, key: 'clients' },
      { name: 'Demandeurs', icon: UserCheck, key: 'demandeurs' },
      { name: 'Agents', icon: Shield, key: 'agents' },
    ] : [
      { name: 'Mes Tickets', icon: Ticket, key: 'tickets' },
      { name: 'Mes Portabilités', icon: Phone, key: 'portabilites' },
      { name: 'Mes Collaborateurs', icon: UserCheck, key: 'demandeurs' },
    ])
  ];

  const handleNavigate = (key) => {
    onNavigate(key);
    setSidebarOpen(false);
  };

  const isCurrentPage = (key) => {
    return currentPage === key || currentPage.startsWith(key + '-');
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-dark-bg">
      {/* Sidebar mobile backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-dark-surface shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-0 lg:shadow-none ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-dark-border">
          <h1 className="text-xl font-bold text-primary-600 dark:text-primary-400">
            Support & Portabilités
          </h1>
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
                key={item.key}
                onClick={() => handleNavigate(item.key)}
                className={`flex items-center w-full px-4 py-2 text-left text-gray-700 dark:text-dark-text hover:bg-primary-50 dark:hover:bg-dark-card rounded-lg transition-colors duration-200 ${
                  isCurrentPage(item.key) ? 'bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-300' : ''
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
              onClick={logout}
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