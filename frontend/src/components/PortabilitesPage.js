import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import SearchableSelect from './SearchableSelect';
import PortabiliteModal from './PortabiliteModal';

const PortabilitesPage = () => {
  const navigate = useNavigate();
  const [portabilites, setPortabilites] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    status: '!termine',
    client: '',
    search: ''
  });
  const [searchDebounce, setSearchDebounce] = useState(null);
  const [selectedPortabiliteId, setSelectedPortabiliteId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  
  const { user, api } = useContext(AuthContext);

  const statusLabels = {
    'nouveau': 'Nouveau',
    'bloque': 'Bloqué',
    'rejete': 'Rejeté',
    'en_cours': 'En cours',
    'demande': 'Demandé',
    'valide': 'Validé',
    'termine': 'Terminé'
  };

  const statusColors = {
    'nouveau': 'bg-blue-100 text-blue-800',
    'bloque': 'bg-red-100 text-red-800',
    'rejete': 'bg-red-100 text-red-800',
    'en_cours': 'bg-yellow-100 text-yellow-800',
    'demande': 'bg-orange-100 text-orange-800',
    'valide': 'bg-green-100 text-green-800',
    'termine': 'bg-gray-100 text-gray-800'
  };

  const backendUrl = '';

  // Fonction pour récupérer les portabilités
  const fetchPortabilites = async (page = 1, newFilters = filters) => {
    try {
      if (isFirstLoad) {
        setLoading(true);
      } else {
        setSearchLoading(true);
      }
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      });

      if (newFilters.status) params.append('status', newFilters.status);
      if (newFilters.client) params.append('client', newFilters.client);
      if (newFilters.search) params.append('search', newFilters.search);

      const response = await api.get(`/api/portabilites?${params}`);

      if (response.data.data) {
        setPortabilites(response.data.data);
        setTotalPages(response.data.pagination.pages);
      } else {
        setPortabilites(response.data);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des portabilités:', err);
      
      // Vérifier si c'est une erreur 401 ou 404 (endpoint non trouvé)
      if (err.response?.status === 401 || err.response?.status === 404) {
        setError('Les tables de portabilités ne sont pas encore créées. Veuillez exécuter le script SQL fourni dans votre base de données Neon.');
      } else {
        setError('Erreur lors du chargement des portabilités');
      }
    } finally {
      setLoading(false);
      setSearchLoading(false);
      setIsFirstLoad(false);
    }
  };

  // Fonction pour récupérer les clients
  const fetchClients = async () => {
    try {
      const response = await api.get(`/api/clients?limit=100`);
      
      let clientsData = response.data;
      if (response.data.data && Array.isArray(response.data.data)) {
        clientsData = response.data.data;
      }
      
      setClients(Array.isArray(clientsData) ? clientsData : []);
    } catch (err) {
      console.error('Erreur lors du chargement des clients:', err);
      // Ne pas bloquer l'interface pour les clients
    }
  };

  // Fonction pour formater l'affichage client
  const formatClientDisplay = (client) => {
    if (!client.nom_societe) return 'Client sans nom';
    
    let display = client.nom_societe;
    
    if (client.nom && client.prenom) {
      display += ` (${client.nom} ${client.prenom})`;
    } else if (client.nom) {
      display += ` (${client.nom})`;
    } else if (client.prenom) {
      display += ` (${client.prenom})`;
    }
    
    return display;
  };

  // Options pour le SearchableSelect des clients
  const clientOptions = Array.isArray(clients) ? clients.map(client => ({
    value: client.id,
    label: formatClientDisplay(client)
  })) : [];

  // Fonction pour gérer les changements de filtres
  const handleFilterChange = (filterType, value) => {
    const newFilters = { ...filters, [filterType]: value };
    setFilters(newFilters);
    setCurrentPage(1);
    
    if (filterType === 'search') {
      // Debounce pour la recherche
      if (searchDebounce) {
        clearTimeout(searchDebounce);
      }
      
      setSearchDebounce(setTimeout(() => {
        fetchPortabilites(1, newFilters);
      }, 1000));
    } else {
      fetchPortabilites(1, newFilters);
    }
  };

  // Fonction pour vérifier si la date est aujourd'hui (alerte)
  const isToday = (dateString) => {
    if (!dateString) return false;
    const today = new Date();
    const date = new Date(dateString);
    return date.toDateString() === today.toDateString();
  };

  // Fonction pour vérifier si la date est dépassée (alerte rouge)
  const isPastDue = (dateString) => {
    if (!dateString) return false;
    const today = new Date();
    const date = new Date(dateString);
    today.setHours(0, 0, 0, 0); // Réinitialiser l'heure pour comparer seulement les dates
    date.setHours(0, 0, 0, 0);
    return date < today;
  };

  // Fonction pour vérifier si on doit appliquer les styles d'alerte
  const shouldShowAlert = (portabilite) => {
    // Ne pas montrer d'alerte si le statut est "terminé"
    if (portabilite.status === 'termine') return false;
    
    return isToday(portabilite.date_portabilite_effective) || isPastDue(portabilite.date_portabilite_effective);
  };

  // Fonction pour ouvrir le modal de détail
  const goToDetail = (portabiliteId) => {
    navigate(`/portabilites/${portabiliteId}`);
  };

  // Fonction pour fermer le modal
  const closeModal = () => {
    setShowModal(false);
    setSelectedPortabiliteId(null);
  };

  // Fonction pour éditer une portabilité
  const editPortabilite = (portabiliteId) => {
    navigate(`/portabilites/${portabiliteId}/edit`);
  };

  // Fonction pour supprimer une portabilité depuis le tableau
  const handleDeleteFromTable = async (portabiliteId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette portabilité ?')) return;

    try {
      await api.delete(`/api/portabilites/${portabiliteId}`);
      // Actualiser le tableau
      fetchPortabilites(currentPage);
    } catch (err) {
      setError('Erreur lors de la suppression');
      console.error('Erreur:', err);
    }
  };

  // Fonction pour actualiser le tableau (appelée depuis le modal)
  const refreshPortabilites = () => {
    fetchPortabilites(currentPage);
  };

  // Exposer la fonction de rafraîchissement pour le modal
  React.useEffect(() => {
    window.refreshPortabilites = refreshPortabilites;
    return () => {
      delete window.refreshPortabilites;
    };
  }, [currentPage]);

  // Fonction pour créer une nouvelle portabilité
  const createPortabilite = () => {
    navigate('/portabilites/nouvelle');
  };

  useEffect(() => {
    fetchPortabilites();
    fetchClients();
  }, []);

  useEffect(() => {
    return () => {
      if (searchDebounce) {
        clearTimeout(searchDebounce);
      }
    };
  }, [searchDebounce]);

  if (loading && isFirstLoad) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Portabilités
            </h1>
            <button
              onClick={createPortabilite}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              📞 Nouvelle Portabilité
            </button>
          </div>
          
          {/* Filtres */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Filtre par statut */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Statut
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-dark-surface dark:border-gray-600 dark:text-white"
              >
                <option value="">Tous les statuts</option>
                <option value="!termine">Exclure les terminés</option>
                {Object.entries(statusLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            {/* Filtre par client */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Client
              </label>
              <SearchableSelect
                options={clientOptions}
                value={filters.client}
                onChange={(value) => handleFilterChange('client', value)}
                placeholder="Rechercher un client..."
                className="w-full"
              />
            </div>

            {/* Recherche par numéro */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Numéro de portabilité
              </label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Rechercher par numéro..."
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-dark-surface dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Tableau des portabilités */}
        <div className="bg-white dark:bg-dark-surface rounded-lg shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Numéro
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Date demandée
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Date effective
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-dark-surface divide-y divide-gray-200 dark:divide-gray-700">
                {searchLoading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                      </div>
                    </td>
                  </tr>
                ) : portabilites.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                      {filters.status || filters.client || filters.search ? 
                        'Aucune portabilité trouvée avec ces filtres' : 
                        'Aucune portabilité trouvée'
                      }
                    </td>
                  </tr>
                ) : (
                  portabilites.map((portabilite) => (
                    <tr 
                      key={portabilite.id} 
                      className={`hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors ${
                        shouldShowAlert(portabilite) && isPastDue(portabilite.date_portabilite_effective) 
                          ? 'bg-red-100 dark:bg-red-900/30' 
                          : shouldShowAlert(portabilite) && isToday(portabilite.date_portabilite_effective) 
                            ? 'bg-red-50 dark:bg-red-900/20' 
                            : ''
                      }`}
                      onClick={() => goToDetail(portabilite.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-900 dark:text-dark-text">
                            #{portabilite.numero_portabilite}
                          </span>
                          {shouldShowAlert(portabilite) && isPastDue(portabilite.date_portabilite_effective) && (
                            <span className="ml-2 text-red-600" title="Date effective dépassée">⚠️</span>
                          )}
                          {shouldShowAlert(portabilite) && isToday(portabilite.date_portabilite_effective) && !isPastDue(portabilite.date_portabilite_effective) && (
                            <span className="ml-2 text-red-500" title="Date effective aujourd'hui">🚨</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-dark-text">
                          {portabilite.client_display || portabilite.nom_societe}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[portabilite.status] || 'bg-gray-100 text-gray-800'}`}>
                          {statusLabels[portabilite.status] || portabilite.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-dark-text">
                        {portabilite.date_portabilite_demandee ? 
                          new Date(portabilite.date_portabilite_demandee).toLocaleDateString('fr-FR') : 
                          '-'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-dark-text">
                        {portabilite.date_portabilite_effective ? 
                          new Date(portabilite.date_portabilite_effective).toLocaleDateString('fr-FR') : 
                          '-'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              goToDetail(portabilite.id);
                            }}
                            className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300"
                          >
                            Voir détails
                          </button>
                          {user.type_utilisateur === 'agent' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteFromTable(portabilite.id);
                              }}
                              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 ml-4"
                              title="Supprimer"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white dark:bg-dark-surface px-4 py-3 border-t border-gray-200 dark:border-gray-700 sm:px-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Page {currentPage} sur {totalPages}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      if (currentPage > 1) {
                        setCurrentPage(currentPage - 1);
                        fetchPortabilites(currentPage - 1);
                      }
                    }}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Précédent
                  </button>
                  <button
                    onClick={() => {
                      if (currentPage < totalPages) {
                        setCurrentPage(currentPage + 1);
                        fetchPortabilites(currentPage + 1);
                      }
                    }}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-md mb-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Configuration requise</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>{error}</p>
                  <p className="mt-2">
                    <strong>Instructions :</strong> Copiez le contenu du fichier 
                    <code className="mx-1 px-2 py-1 bg-yellow-200 rounded text-xs">/app/create_portabilites_structure.sql</code> 
                    et exécutez-le dans votre base de données Neon.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de détails */}
      {showModal && selectedPortabiliteId && (
        <PortabiliteModal 
          portabiliteId={selectedPortabiliteId}
          onClose={closeModal}
          onEdit={editPortabilite}
        />
      )}
    </div>
  );
};

export default PortabilitesPage;