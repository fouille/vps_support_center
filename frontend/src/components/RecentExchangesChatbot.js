import React, { useState } from 'react';
import api from '../api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const RecentExchangesChatbot = ({ isDarkMode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [exchanges, setExchanges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const toggleChatbot = async () => {
    if (!isOpen) {
      // Charger les données à l'ouverture
      await fetchRecentExchanges();
    }
    setIsOpen(!isOpen);
  };

  const fetchRecentExchanges = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/recent-exchanges');
      setExchanges(response.data);
    } catch (err) {
      console.error('Erreur lors du chargement des échanges récents:', err);
      setError('Impossible de charger les échanges récents');
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'ticket':
        return '🎫';
      case 'portabilite':
        return '📞';
      case 'production':
        return '⚙️';
      default:
        return '💬';
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'ticket':
        return 'Ticket';
      case 'portabilite':
        return 'Portabilité';
      case 'production':
        return 'Production';
      default:
        return 'Échange';
    }
  };

  const formatTimestamp = (timestamp) => {
    try {
      return format(new Date(timestamp), 'dd/MM/yyyy HH:mm', { locale: fr });
    } catch (error) {
      return 'Date invalide';
    }
  };

  const truncateText = (text, maxLength = 100) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <>
      {/* Bouton flottant */}
      <button
        onClick={toggleChatbot}
        className={`fixed bottom-4 right-4 z-40 p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-105 ${
          isDarkMode
            ? 'bg-gray-700 hover:bg-gray-600 text-white'
            : 'bg-white hover:bg-blue-50 text-blue-600 border border-gray-200'
        }`}
        title="Échanges récents"
      >
        <svg 
          className="w-6 h-6" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
          />
        </svg>
      </button>

      {/* Panel du chatbot */}
      {isOpen && (
        <div 
          className={`fixed bottom-20 right-4 z-50 w-96 h-80 rounded-lg shadow-xl transition-all duration-300 ${
            isDarkMode
              ? 'bg-dark-surface border border-gray-600'
              : 'bg-white border border-gray-200'
          }`}
          style={{
            animation: 'fadeIn 0.3s ease-out'
          }}
        >
          {/* Header */}
          <div className={`flex items-center justify-between p-4 border-b ${
            isDarkMode ? 'border-gray-600' : 'border-gray-200'
          }`}>
            <div className="flex items-center space-x-2">
              <svg 
                className={`w-5 h-5 ${isDarkMode ? 'text-dark-text' : 'text-gray-600'}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
                />
              </svg>
              <h3 className={`font-semibold ${isDarkMode ? 'text-dark-text' : 'text-gray-900'}`}>
                Échanges récents
              </h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className={`p-1 rounded hover:bg-opacity-10 hover:bg-gray-500 ${
                isDarkMode ? 'text-dark-muted hover:text-dark-text' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 h-64">
            {loading && (
              <div className="flex items-center justify-center h-full">
                <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${
                  isDarkMode ? 'border-primary-400' : 'border-primary-600'
                }`}></div>
              </div>
            )}

            {error && (
              <div className={`text-center py-8 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                <p>{error}</p>
                <button
                  onClick={fetchRecentExchanges}
                  className={`mt-2 px-4 py-2 rounded text-sm ${
                    isDarkMode
                      ? 'bg-primary-600 hover:bg-primary-700 text-white'
                      : 'bg-primary-500 hover:bg-primary-600 text-white'
                  }`}
                >
                  Réessayer
                </button>
              </div>
            )}

            {!loading && !error && exchanges.length === 0 && (
              <div className={`text-center py-8 ${isDarkMode ? 'text-dark-muted' : 'text-gray-500'}`}>
                <p>Aucun échange récent</p>
              </div>
            )}

            {!loading && !error && exchanges.length > 0 && (
              <div className="space-y-3">
                {exchanges.map((exchange, index) => (
                  <div
                    key={`${exchange.type}-${exchange.item_id}-${index}`}
                    className={`p-3 rounded-lg border ${
                      isDarkMode
                        ? 'bg-dark-card border-gray-600 hover:bg-gray-700'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    } transition-colors cursor-pointer`}
                  >
                    {/* Type et numéro */}
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-lg">{getTypeIcon(exchange.type)}</span>
                      <span className={`text-xs font-medium px-2 py-1 rounded ${
                        isDarkMode
                          ? 'bg-primary-900 text-primary-300'
                          : 'bg-primary-100 text-primary-800'
                      }`}>
                        {getTypeLabel(exchange.type)} #{exchange.item_number}
                      </span>
                    </div>

                    {/* Titre */}
                    <h4 className={`font-medium text-sm mb-2 ${
                      isDarkMode ? 'text-dark-text' : 'text-gray-900'
                    }`}>
                      {truncateText(exchange.item_title, 60)}
                    </h4>

                    {/* Dernier commentaire */}
                    <p className={`text-sm mb-2 ${
                      isDarkMode ? 'text-dark-muted' : 'text-gray-600'
                    }`}>
                      {truncateText(exchange.last_comment, 80)}
                    </p>

                    {/* Auteur et date */}
                    <div className={`flex items-center justify-between text-xs ${
                      isDarkMode ? 'text-dark-muted' : 'text-gray-500'
                    }`}>
                      <span>
                        {exchange.auteur_prenom} {exchange.auteur_nom}
                        <span className={`ml-1 px-1 rounded ${
                          exchange.auteur_type === 'agent'
                            ? isDarkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-800'
                            : isDarkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800'
                        }`}>
                          {exchange.auteur_type === 'agent' ? 'Agent' : 'Demandeur'}
                        </span>
                      </span>
                      <span>{formatTimestamp(exchange.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Animation CSS */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
};

export default RecentExchangesChatbot;