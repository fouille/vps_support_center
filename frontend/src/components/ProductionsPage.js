import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ProductionModal from './ProductionModal';
import ProductionForm from './ProductionForm';
import ProductionTacheModal from './ProductionTacheModal';
import SearchableSelect from './SearchableSelect';
import { formatClientDisplay } from '../utils/clientUtils';
import { 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  Factory, 
  AlertCircle, 
  Calendar,
  User,
  Building,
  Clock,
  RefreshCw,
  ChevronRight,
  ChevronDown
} from 'lucide-react';

const ProductionsPage = () => {
  const { api, user, isAgent } = useAuth();
  const [productions, setProductions] = useState([]);
  const [clients, setClients] = useState([]);
  const [demandeurs, setDemandeurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProduction, setSelectedProduction] = useState(null);
  const [selectedTache, setSelectedTache] = useState(null);
  const [showProductionModal, setShowProductionModal] = useState(false);
  const [showProductionForm, setShowProductionForm] = useState(false);
  const [showTacheModal, setShowTacheModal] = useState(false);
  const [editingProduction, setEditingProduction] = useState(null);
  const [expandedProduction, setExpandedProduction] = useState(null);
  const [refreshingProductions, setRefreshingProductions] = useState(false);

  // États pour les filtres
  const [statusFilter, setStatusFilter] = useState('active'); // 'active' ou 'all'
  const [clientFilter, setClientFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  useEffect(() => {
    fetchProductions();
    fetchClients();
    if (isAgent) {
      fetchDemandeurs();
    }
  }, []);

  const fetchProductions = async (showRefreshingIndicator = false) => {
    if (showRefreshingIndicator) setRefreshingProductions(true);
    else setLoading(true);
    
    try {
      const params = new URLSearchParams();
      if (statusFilter === 'active') {
        // Filtrer les productions actives (non terminées/annulées)
        params.append('status', 'en_attente,en_cours,bloque');
      }
      if (clientFilter) params.append('client', clientFilter);
      if (searchFilter) params.append('search', searchFilter);

      const response = await api.get(`/api/productions?${params.toString()}`);
      // La réponse a la structure {data: [], pagination: {}}
      const responseData = response.data || response;
      setProductions(responseData.data || responseData || []);
      setError('');
    } catch (error) {
      console.error('Erreur lors du chargement des productions:', error);
      setError('Erreur lors du chargement des productions');
      // Mock data pour le développement local
      setProductions([
        {
          id: 'mock-1',
          numero_production: '12345678',
          titre: 'Production Test Client A',
          status: 'en_attente',
          priorite: 'haute',
          client_display: 'Client A - Test Company',
          demandeur_nom: 'Martin',
          demandeur_prenom: 'Sophie',
          date_creation: new Date().toISOString(),
          date_livraison_prevue: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }
      ]);
    } finally {
      setLoading(false);
      setRefreshingProductions(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await api.get('/api/clients?limit=100');
      setClients(Array.isArray(response.data) ? response.data : response.data?.data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des clients:', error);
      setClients([]);
    }
  };

  const fetchDemandeurs = async () => {
    try {
      const response = await api.get('/api/demandeurs?limit=100');
      setDemandeurs(Array.isArray(response.data) ? response.data : response.data?.data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des demandeurs:', error);
      setDemandeurs([]);
    }
  };

  const clientOptions = [
    { value: '', label: 'Tous les clients', subtitle: '', searchText: '' },
    ...clients.map(client => ({
      value: client.id,
      label: formatClientDisplay(client),
      subtitle: client.email || '',
      searchText: `${client.nom_societe} ${client.nom} ${client.prenom}`.toLowerCase()
    }))
  ];

  const getStatusBadge = (status) => {
    const statusConfig = {
      'en_attente': { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300', label: 'En attente' },
      'en_cours': { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300', label: 'En cours' },
      'termine': { color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300', label: 'Terminé' },
      'bloque': { color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300', label: 'Bloqué' },
      'annule': { color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', label: 'Annulé' }
    };
    
    const config = statusConfig[status] || statusConfig['en_attente'];
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getPrioriteBadge = (priorite) => {
    const prioriteConfig = {
      'urgente': { color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300', label: 'Urgente' },
      'haute': { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300', label: 'Haute' },
      'normale': { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300', label: 'Normale' },
      'basse': { color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', label: 'Basse' }
    };
    
    const config = prioriteConfig[priorite] || prioriteConfig['normale'];
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getTacheStatusBadge = (status) => {
    const statusConfig = {
      'a_faire': { color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', label: 'À faire' },
      'en_cours': { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300', label: 'En cours' },
      'termine': { color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300', label: 'Terminé' },
      'bloque': { color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300', label: 'Bloqué' },
      'hors_scope': { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300', label: 'Hors scope' },
      'attente_installation': { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300', label: 'Attente installation' }
    };
    
    const config = statusConfig[status] || statusConfig['a_faire'];
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const openProductionDetails = async (production) => {
    try {
      const response = await api.get(`/api/productions/${production.id}`);
      setSelectedProduction(response);
      setShowProductionModal(true);
    } catch (error) {
      console.error('Erreur lors du chargement des détails:', error);
      // Mock data pour le développement local
      setSelectedProduction({
        ...production,
        taches: [
          { id: '1', nom_tache: 'Portabilité', status: 'a_faire', ordre_tache: 1 },
          { id: '2', nom_tache: 'Fichier de collecte', status: 'en_cours', ordre_tache: 2 }
        ]
      });
      setShowProductionModal(true);
    }
  };

  const openTacheDetails = (tache) => {
    setSelectedTache(tache);
    setShowTacheModal(true);
  };

  const toggleExpandProduction = async (productionId) => {
    if (expandedProduction === productionId) {
      setExpandedProduction(null);
    } else {
      setExpandedProduction(productionId);
      // Charger les tâches si nécessaire
      const production = productions.find(p => p.id === productionId);
      if (production && !production.taches) {
        try {
          const response = await api.get(`/api/production-taches?production_id=${productionId}`);
          // Mettre à jour la production avec les tâches
          setProductions(prev => prev.map(p => 
            p.id === productionId 
              ? { ...p, taches: response } 
              : p
          ));
        } catch (error) {
          console.error('Erreur lors du chargement des tâches:', error);
        }
      }
    }
  };

  const openNewProductionForm = () => {
    setEditingProduction(null);
    setShowProductionForm(true);
  };

  const openEditProductionForm = (production) => {
    setEditingProduction(production);
    setShowProductionForm(true);
  };

  const handleProductionSaved = () => {
    setShowProductionForm(false);
    setEditingProduction(null);
    fetchProductions();
  };

  const handleDeleteProduction = async (productionId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette production ?')) {
      try {
        await api.delete(`/api/productions/${productionId}`);
        fetchProductions();
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        alert('Erreur lors de la suppression de la production');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Chargement des productions...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Factory className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">
              {isAgent ? 'Gestion des Productions' : 'Mes Productions'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Suivi et gestion des demandes de production
            </p>
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => fetchProductions(true)}
            className="btn-secondary flex items-center"
            title="Actualiser la liste"
            disabled={refreshingProductions}
          >
            <RefreshCw className={`h-5 w-5 mr-2 ${refreshingProductions ? 'animate-spin' : ''}`} />
            {refreshingProductions ? 'Actualisation...' : 'Actualiser'}
          </button>
          <button
            onClick={openNewProductionForm}
            className="btn-primary flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nouvelle Production
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
            Statut des productions
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input w-full"
          >
            <option value="active">Actives (En attente, En cours, Bloqué)</option>
            <option value="all">Toutes les productions</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
            Filtrer par client
          </label>
          <SearchableSelect
            options={clientOptions}
            value={clientFilter}
            onChange={setClientFilter}
            placeholder="Tous les clients"
            className="w-full"
            displayKey="label"
            valueKey="value"
            searchKeys={["label", "subtitle", "searchText"]}
            emptyMessage="Aucun client trouvé"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
            Rechercher par numéro
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Ex: 12345678"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="input w-full pr-10"
              maxLength={8}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          {searchFilter && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Recherche par numéro de production
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-3" />
          <span className="text-red-700 dark:text-red-300">{error}</span>
        </div>
      )}

      {/* Liste des productions */}
      <div className="grid gap-4">
        {productions.length === 0 ? (
          <div className="text-center py-12">
            <Factory className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 dark:text-dark-text mb-2">Aucune production trouvée</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Créez votre première demande de production</p>
            <button
              onClick={openNewProductionForm}
              className="btn-primary"
            >
              <Plus className="h-5 w-5 mr-2" />
              Nouvelle Production
            </button>
          </div>
        ) : (
          productions.map(production => (
            <div key={production.id} className="card p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <Factory className="h-5 w-5 text-primary-600" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text">
                      {production.titre}
                    </h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      #{production.numero_production}
                    </span>
                    {getStatusBadge(production.status)}
                    {getPrioriteBadge(production.priorite)}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <Building className="h-4 w-4 mr-2" />
                      <span className="font-medium">Client:</span>
                      <span className="ml-1">{production.client_display}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <User className="h-4 w-4 mr-2" />
                      <span className="font-medium">Demandeur:</span>
                      <span className="ml-1">{production.demandeur_prenom} {production.demandeur_nom}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span className="font-medium">Créé le:</span>
                      <span className="ml-1">{new Date(production.date_creation).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                  
                  {production.date_livraison_prevue && (
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-4">
                      <Clock className="h-4 w-4 mr-2" />
                      <span className="font-medium">Livraison prévue:</span>
                      <span className="ml-1">{new Date(production.date_livraison_prevue).toLocaleDateString('fr-FR')}</span>
                    </div>
                  )}

                  {/* Tâches expandables */}
                  {expandedProduction === production.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <h4 className="font-medium text-gray-900 dark:text-dark-text mb-3 flex items-center">
                        <ChevronDown className="h-4 w-4 mr-1" />
                        Tâches de production
                      </h4>
                      {production.taches && production.taches.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {production.taches.map(tache => (
                            <div
                              key={tache.id}
                              className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:shadow-sm transition-shadow cursor-pointer"
                              onClick={() => openTacheDetails({ ...tache, production })}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <h5 className="font-medium text-sm text-gray-900 dark:text-dark-text truncate">{tache.nom_tache}</h5>
                                {getTacheStatusBadge(tache.status)}
                              </div>
                              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                <span>Ordre: {tache.ordre_tache}</span>
                                <div className="flex items-center space-x-2">
                                  {tache.nb_commentaires > 0 && <span>💬 {tache.nb_commentaires}</span>}
                                  {tache.nb_fichiers > 0 && <span>📎 {tache.nb_fichiers}</span>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Aucune tâche disponible</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => toggleExpandProduction(production.id)}
                    className="btn-secondary p-2"
                    title={expandedProduction === production.id ? "Réduire les tâches" : "Voir les tâches"}
                  >
                    {expandedProduction === production.id ? 
                      <ChevronDown className="h-4 w-4" /> : 
                      <ChevronRight className="h-4 w-4" />
                    }
                  </button>
                  
                  <button
                    onClick={() => openProductionDetails(production)}
                    className="btn-secondary flex items-center"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Détails
                  </button>
                  
                  {isAgent && (
                    <>
                      <button
                        onClick={() => openEditProductionForm(production)}
                        className="btn-secondary flex items-center"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDeleteProduction(production.id)}
                        className="btn-danger flex items-center"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Supprimer
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modals */}
      {showProductionModal && selectedProduction && (
        <ProductionModal
          production={selectedProduction}
          onClose={() => setShowProductionModal(false)}
          onRefresh={fetchProductions}
        />
      )}

      {showProductionForm && (
        <ProductionForm
          production={editingProduction}
          clients={clients}
          demandeurs={demandeurs}
          onClose={() => setShowProductionForm(false)}
          onSave={handleProductionSaved}
        />
      )}

      {showTacheModal && selectedTache && (
        <ProductionTacheModal
          tache={selectedTache}
          onClose={() => setShowTacheModal(false)}
          onRefresh={() => {
            fetchProductions();
            // Rafraîchir les tâches de la production expandée
            if (expandedProduction) {
              toggleExpandProduction(expandedProduction);
              setTimeout(() => toggleExpandProduction(expandedProduction), 100);
            }
          }}
        />
      )}
    </div>
  );
};

export default ProductionsPage;