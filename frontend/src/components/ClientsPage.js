import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit, Trash2, Building, AlertCircle, Check, Search, ChevronLeft, ChevronRight } from 'lucide-react';

const ClientsPage = () => {
  const { api } = useAuth();
  const [clients, setClients] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true); // Chargement initial
  const [searchLoading, setSearchLoading] = useState(false); // Chargement lors des recherches
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
    numero: ''
  });

  useEffect(() => {
    fetchClients(true); // Chargement initial
  }, [currentPage, searchTerm]);

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

  const fetchClients = async (isInitial = false) => {
    try {
      if (isInitial) {
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
      if (isInitial) {
        setInitialLoading(false);
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
      numero: client.numero || ''
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
      numero: ''
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

      {/* Zone de recherche */}
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

      {error && (
        <div className="mb-4 flex items-center p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-3" />
          <span className="text-red-700 dark:text-red-300">{error}</span>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>Société</th>
              <th>Contact</th>
              <th>Téléphone</th>
              <th>Adresse</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id}>
                <td>
                  <div className="flex items-center">
                    <Building className="h-5 w-5 text-primary-600 mr-2" />
                    <span className="font-medium">{client.nom_societe}</span>
                  </div>
                </td>
                <td>
                  {client.prenom || client.nom ? `${client.prenom || ''} ${client.nom || ''}`.trim() : '-'}
                </td>
                <td>
                  {client.numero || '-'}
                </td>
                <td className="max-w-xs truncate">
                  {client.adresse}
                </td>
                <td>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(client)}
                      className="p-2 text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(client.id)}
                      className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {clients.length === 0 && !loading && (
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
  );
};

export default ClientsPage;