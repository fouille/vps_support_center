import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit, Trash2, Building, AlertCircle, Check, Search, ChevronLeft, ChevronRight } from 'lucide-react';

const ClientsPage = () => {
  const { api, user } = useAuth();
  const [clients, setClients] = useState([]);
  const [societes, setSocietes] = useState([]); // Liste des sociétés
  const [selectedSociete, setSelectedSociete] = useState(''); // Filtre société pour agents
  const [initialLoading, setInitialLoading] = useState(true); // Chargement initial
  const [searchLoading, setSearchLoading] = useState(false); // Chargement lors des recherches  
  const [isFirstLoad, setIsFirstLoad] = useState(true); // Flag pour identifier le premier chargement
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [searchInput, setSearchInput] = useState(''); // Valeur de l'input
  const [searchTerm, setSearchTerm] = useState(''); // Terme de recherche réel envoyé à l'API
  const [isSearching, setIsSearching] = useState(false); // Indicateur de recherche en cours
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [formData, setFormData] = useState({
    nom_societe: '',
    adresse: '',
    nom: '',
    prenom: '',
    numero: '',
    societe_id: '' // Nouveau champ
  });

  useEffect(() => {
    fetchClients();
    if (user?.type_utilisateur === 'agent') {
      fetchSocietes();
    }
  }, [currentPage, searchTerm, selectedSociete]);

  // Debounce pour la recherche - se déclenche 1 seconde après l'arrêt de la saisie
  useEffect(() => {
    // Montrer l'indicateur de recherche si on a au moins 3 caractères
    if (searchInput.length >= 3) {
      setIsSearching(true);
    }
    
    const timer = setTimeout(() => {
      // Déclencher la recherche seulement si au moins 3 caractères ou si vide (pour reset)
      if (searchInput.length >= 3 || searchInput.length === 0) {
        setSearchTerm(searchInput);
        // Remettre à la page 1 lors d'une nouvelle recherche
        if (currentPage !== 1) {
          setCurrentPage(1);
        }
      }
      setIsSearching(false);
    }, 1000); // Temporisation de 1 seconde

    return () => {
      clearTimeout(timer);
      setIsSearching(false);
    };
  }, [searchInput, currentPage]);

  useEffect(() => {
    // Reset to page 1 when search term changes
    if (currentPage !== 1 && searchTerm) {
      setCurrentPage(1);
    }
  }, [searchTerm]);

  // Fonctions de récupération des données
  const fetchSocietes = async () => {
    try {
      const response = await api.get('/api/demandeurs-societe?limit=100');
      const societesData = response.data.data || response.data || [];
      setSocietes(societesData);
    } catch (error) {
      console.error('Erreur lors du chargement des sociétés:', error);
    }
  };

  const fetchClients = async () => {
    try {
      // Utiliser initialLoading seulement pour le tout premier chargement
      if (isFirstLoad) {
        setInitialLoading(true);
      } else {
        setSearchLoading(true);
      }
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10'
      });
      
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }

      // Ajouter le filtre société pour les agents
      if (user?.type_utilisateur === 'agent' && selectedSociete) {
        params.append('societe', selectedSociete);
      }

      const response = await api.get(`/api/clients?${params}`);
      
      // Check if response has pagination structure (new API) or is just array (old API)
      if (response.data.data && response.data.pagination) {
        setClients(response.data.data);
        setPagination(response.data.pagination);
      } else {
        // Fallback for old API format
        setClients(response.data);
        setPagination({
          page: 1,
          limit: response.data.length,
          total: response.data.length,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        });
      }
    } catch (error) {
      setError('Erreur lors du chargement des clients');
      console.error('Error fetching clients:', error);
    } finally {
      if (isFirstLoad) {
        setInitialLoading(false);
        setIsFirstLoad(false); // Plus jamais de chargement initial
      } else {
        setSearchLoading(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingClient) {
        await api.put(`/api/clients/${editingClient.id}`, formData);
      } else {
        await api.post('/api/clients', formData);
      }
      await fetchClients();
      handleCloseModal();
    } catch (error) {
      setError(error.response?.data?.detail || 'Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (clientId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) {
      try {
        await api.delete(`/api/clients/${clientId}`);
        await fetchClients();
      } catch (error) {
        setError(error.response?.data?.detail || 'Erreur lors de la suppression');
      }
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleSocieteFilterChange = (societeId) => {
    setSelectedSociete(societeId);
    setCurrentPage(1); // Reset à la page 1 lors du changement de filtre
  };

  const handleSearchChange = (e) => {
    setSearchInput(e.target.value);
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setFormData({
      nom_societe: client.nom_societe,
      adresse: client.adresse,
      nom: client.nom || '',
      prenom: client.prenom || '',
      numero: client.numero || '',
      societe_id: client.societe_id || ''
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingClient(null);
    setFormData({
      nom_societe: '',
      adresse: '',
      nom: '',
      prenom: '',
      numero: '',
      societe_id: ''
    });
    setError('');
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <span className="ml-3 text-lg text-gray-600 dark:text-gray-400">Chargement des clients...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="max-w-7xl mx-auto">
        {/* En-tête - toujours visible */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">
            Gestion des Clients
          </h1>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nouveau Client
          </button>
        </div>

        {/* Zone de recherche - toujours visible */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Rechercher un client (min. 3 caractères)..."
              value={searchInput}
              onChange={handleSearchChange}
              className="input pl-10 pr-10 w-full"
            />
            {isSearching && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
              </div>
            )}
          </div>
          {searchInput && searchInput.length > 0 && searchInput.length < 3 && (
            <p className="text-sm text-orange-500 dark:text-orange-400 mt-2">
              Tapez au moins 3 caractères pour rechercher
            </p>
          )}
          {searchTerm && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {pagination.total} résultat{pagination.total > 1 ? 's' : ''} pour "{searchTerm}"
            </p>
          )}
        </div>

        {/* Messages d'erreur - toujours visibles */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <span className="text-red-700 dark:text-red-400">{error}</span>
            </div>
          </div>
        )}

        {/* Tableau avec loader spécifique */}
        <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm overflow-hidden">
          {searchLoading ? (
            // Loader spécifique au tableau
            <div className="flex justify-center items-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">
                  {searchTerm ? `Recherche en cours pour "${searchTerm}"...` : 'Chargement des clients...'}
                </p>
              </div>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-border">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Société</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Téléphone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Adresse</th>
                  {user?.type_utilisateur === 'agent' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Société Demandeur</th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-dark-surface divide-y divide-gray-200 dark:divide-dark-border">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-dark-card">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Building className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3" />
                        <div className="text-sm font-medium text-gray-900 dark:text-dark-text">
                          {client.nom_societe}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-dark-text">
                      {client.prenom || client.nom ? `${client.prenom || ''} ${client.nom || ''}`.trim() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-dark-text">
                      {client.numero || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-dark-text">
                      {client.adresse}
                    </td>
                    {user?.type_utilisateur === 'agent' && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-dark-text">
                        {client.societe_nom || '-'}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(client)}
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-3"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(client.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!searchLoading && clients.length === 0 && (
            <div className="p-8 text-center text-gray-500 dark:text-dark-muted">
              {searchTerm ? `Aucun client trouvé pour "${searchTerm}"` : 'Aucun client enregistré'}
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <span>
              Affichage de {((pagination.page - 1) * pagination.limit) + 1} à{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} sur{' '}
              {pagination.total} clients
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={!pagination.hasPrev}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border rounded-md hover:bg-gray-50 dark:hover:bg-dark-card disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-dark-surface"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Précédent
            </button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNum;
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.page <= 3) {
                  pageNum = i + 1;
                } else if (pagination.page >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i;
                } else {
                  pageNum = pagination.page - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                      pageNum === pagination.page
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-500 bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-card'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={!pagination.hasNext}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border rounded-md hover:bg-gray-50 dark:hover:bg-dark-card disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-dark-surface"
            >
              Suivant
              <ChevronRight className="h-4 w-4 ml-1" />
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal-overlay">
          <div className="bg-white dark:bg-dark-surface rounded-lg p-6 w-full max-w-md modal-content">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-dark-text">
              {editingClient ? 'Modifier le Client' : 'Nouveau Client'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                  Nom de la société *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nom_societe}
                  onChange={(e) => setFormData({ ...formData, nom_societe: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                  Adresse *
                </label>
                <textarea
                  required
                  value={formData.adresse}
                  onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                  className="input h-20 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                    Nom
                  </label>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                    Prénom
                  </label>
                  <input
                    type="text"
                    value={formData.prenom}
                    onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                  Numéro de téléphone
                </label>
                <input
                  type="tel"
                  value={formData.numero}
                  onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                  className="input"
                  placeholder="Ex: 01 23 45 67 89"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn-secondary"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn-primary flex items-center"
                >
                  <Check className="h-4 w-4 mr-2" />
                  {editingClient ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default ClientsPage;