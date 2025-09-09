import React, { useContext } from 'react';
import { getVersionInfo } from '../config/version';
import { AuthContext } from '../context/AuthContext';
import RecentExchangesChatbot from './RecentExchangesChatbot';

const Footer = () => {
  const { version, year } = getVersionInfo();
  const { isDarkMode, user } = useContext(AuthContext);

  return (
    <>
      <footer className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-4 px-6 mt-auto">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
            {/* Informations principales */}
            <div className="text-sm text-gray-600 dark:text-gray-400 text-center sm:text-left">
              <span className="font-medium text-gray-800 dark:text-gray-200">
                VOIPServices
              </span>
              <span className="mx-2">©</span>
              <span>Tous droits réservés</span>
              <span className="mx-2">•</span>
              <span>{year}</span>
            </div>

            {/* Version */}
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-gray-500 dark:text-gray-500">Version</span>
              <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs font-mono font-medium">
                v{version}
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* Chatbot des échanges récents - Uniquement si utilisateur connecté */}
      {user && <RecentExchangesChatbot />}
    </>
  );
};

export default Footer;