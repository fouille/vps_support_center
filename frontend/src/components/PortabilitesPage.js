import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import SearchableSelect from './SearchableSelect';
import { useNavigate } from 'react-router-dom';

const PortabilitesPage = () => {
  const [portabilites, setPortabilites] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    status: '',
    client: '',
    search: ''
  });
  const [searchDebounce, setSearchDebounce] = useState(null);
  
  const { user, api } = useContext(AuthContext);
  const navigate = useNavigate();

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

  const backendUrl = import.meta.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_BACKEND_URL;

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

      const response = await axios.get(`${backendUrl}/api/portabilites?${params}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.data) {
        setPortabilites(response.data.data);
        setTotalPages(response.data.pagination.pages);
      } else {
        setPortabilites(response.data);
      }
    } catch (err) {
      setError('Erreur lors du chargement des portabilités');
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
      setSearchLoading(false);
      setIsFirstLoad(false);
    }
  };

  // Fonction pour récupérer les clients
  const fetchClients = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/clients?limit=100`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      let clientsData = response.data;
      if (response.data.data && Array.isArray(response.data.data)) {
        clientsData = response.data.data;
      }
      
      setClients(Array.isArray(clientsData) ? clientsData : []);
    } catch (err) {
      console.error('Erreur lors du chargement des clients:', err);
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

  // Fonction pour aller à la page de détail
  const goToDetail = (portabiliteId) => {
    navigate(`/portabilites/${portabiliteId}`);
  };

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
    <div className="p-6 bg-gray-50 dark:bg-dark-bg min-h-screen">
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
                        isToday(portabilite.date_portabilite_effective) ? 'bg-red-50 dark:bg-red-900/20' : ''
                      }`}
                      onClick={() => goToDetail(portabilite.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-900 dark:text-dark-text">
                            #{portabilite.numero_portabilite}
                          </span>
                          {isToday(portabilite.date_portabilite_effective) && (
                            <span className="ml-2 text-red-500">🚨</span>
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
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            goToDetail(portabilite.id);
                          }}
                          className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300"
                        >
                          Voir détails
                        </button>
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
          <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default PortabilitesPage;