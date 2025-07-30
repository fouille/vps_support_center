import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ProductionModal from './ProductionModal';
import ProductionForm from './ProductionForm';
import ProductionTacheModal from './ProductionTacheModal';
import { formatClientDisplay } from '../utils/clientUtils';

const ProductionsPage = () => {
  const { api, user } = useAuth();
  const [productions, setProductions] = useState([]);
  const [clients, setClients] = useState([]);
  const [demandeurs, setDemandeurs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduction, setSelectedProduction] = useState(null);
  const [selectedTache, setSelectedTache] = useState(null);
  const [showProductionModal, setShowProductionModal] = useState(false);
  const [showProductionForm, setShowProductionForm] = useState(false);
  const [showTacheModal, setShowTacheModal] = useState(false);
  const [editingProduction, setEditingProduction] = useState(null);
  const [expandedProduction, setExpandedProduction] = useState(null);

  // États pour les filtres
  const [filters, setFilters] = useState({
    status: '',
    client: '',
    search: ''
  });

  useEffect(() => {
    fetchProductions();
    fetchClients();
    if (user?.type_utilisateur === 'agent') {
      fetchDemandeurs();
    }
  }, []);

  const fetchProductions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.client) params.append('client', filters.client);
      if (filters.search) params.append('search', filters.search);

      const response = await api.get(`/api/productions?${params.toString()}`);
      setProductions(response.data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des productions:', error);
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

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    fetchProductions();
  };

  const clearFilters = () => {
    setFilters({ status: '', client: '', search: '' });
    setTimeout(fetchProductions, 100);
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

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'en_attente': return 'bg-yellow-100 text-yellow-800';
      case 'en_cours': return 'bg-blue-100 text-blue-800';
      case 'termine': return 'bg-green-100 text-green-800';
      case 'bloque': return 'bg-red-100 text-red-800';
      case 'annule': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPrioriteBadgeClass = (priorite) => {
    switch (priorite) {
      case 'urgente': return 'bg-red-100 text-red-800';
      case 'haute': return 'bg-orange-100 text-orange-800';
      case 'normale': return 'bg-blue-100 text-blue-800';
      case 'basse': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTacheStatusBadgeClass = (status) => {
    switch (status) {
      case 'a_faire': return 'bg-gray-100 text-gray-800';
      case 'en_cours': return 'bg-blue-100 text-blue-800';
      case 'termine': return 'bg-green-100 text-green-800';
      case 'bloque': return 'bg-red-100 text-red-800';
      case 'hors_scope': return 'bg-yellow-100 text-yellow-800';
      case 'attente_installation': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      'en_attente': 'En attente',
      'en_cours': 'En cours',
      'termine': 'Terminé',
      'bloque': 'Bloqué',
      'annule': 'Annulé'
    };
    return labels[status] || status;
  };

  const getPrioriteLabel = (priorite) => {
    const labels = {
      'urgente': 'Urgente',
      'haute': 'Haute',
      'normale': 'Normale',
      'basse': 'Basse'
    };
    return labels[priorite] || priorite;
  };

  const getTacheStatusLabel = (status) => {
    const labels = {
      'a_faire': 'À faire',
      'en_cours': 'En cours',
      'termine': 'Terminé',
      'bloque': 'Bloqué',
      'hors_scope': 'Hors scope',
      'attente_installation': 'Attente installation'
    };
    return labels[status] || status;
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white shadow-lg rounded-lg">
        {/* En-tête */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6 rounded-t-lg">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">🏭 Gestion des Productions</h1>
              <p className="opacity-90">Suivi et gestion des demandes de production</p>
            </div>
            <button
              onClick={openNewProductionForm}
              className="bg-white text-red-600 px-4 py-2 rounded-lg font-medium hover:bg-red-50 transition-colors"
            >
              ➕ Nouvelle Production
            </button>
          </div>
        </div>

        {/* Filtres */}
        <div className="p-6 bg-gray-50 border-b">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Statut
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="">Tous les statuts</option>
                <option value="en_attente">En attente</option>
                <option value="en_cours">En cours</option>
                <option value="termine">Terminé</option>
                <option value="bloque">Bloqué</option>
                <option value="annule">Annulé</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client
              </label>
              <select
                value={filters.client}
                onChange={(e) => handleFilterChange('client', e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="">Tous les clients</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {formatClientDisplay(client)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Numéro de production
              </label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Rechercher..."
                className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={applyFilters}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Filtrer
              </button>
              <button
                onClick={clearFilters}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        </div>

        {/* Liste des productions */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Chargement...</p>
            </div>
          ) : productions.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🏭</div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">Aucune production trouvée</h3>
              <p className="text-gray-600 mb-4">Créez votre première demande de production</p>
              <button
                onClick={openNewProductionForm}
                className="bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                ➕ Nouvelle Production
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {productions.map(production => (
                <div key={production.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <button
                            onClick={() => toggleExpandProduction(production.id)}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            {expandedProduction === production.id ? '📋' : '📄'}
                          </button>
                          <h3 className="font-semibold text-lg text-gray-900">
                            #{production.numero_production} - {production.titre}
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(production.status)}`}>
                            {getStatusLabel(production.status)}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPrioriteBadgeClass(production.priorite)}`}>
                            {getPrioriteLabel(production.priorite)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Client:</span> {production.client_display}
                          </div>
                          <div>
                            <span className="font-medium">Demandeur:</span> {production.demandeur_prenom} {production.demandeur_nom}
                          </div>
                          <div>
                            <span className="font-medium">Créé le:</span> {new Date(production.date_creation).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                        
                        {production.date_livraison_prevue && (
                          <div className="mt-2 text-sm text-gray-600">
                            <span className="font-medium">Livraison prévue:</span> {new Date(production.date_livraison_prevue).toLocaleDateString('fr-FR')}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => openProductionDetails(production)}
                          className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors"
                        >
                          👁️ Voir détails
                        </button>
                        
                        {user?.type_utilisateur === 'agent' && (
                          <>
                            <button
                              onClick={() => openEditProductionForm(production)}
                              className="bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-yellow-200 transition-colors"
                            >
                              ✏️ Modifier
                            </button>
                            <button
                              onClick={() => handleDeleteProduction(production.id)}
                              className="bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
                            >
                              🗑️ Supprimer
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Tâches expandables */}
                    {expandedProduction === production.id && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="font-medium text-gray-900 mb-3">📋 Tâches de production</h4>
                        {production.taches && production.taches.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {production.taches.map(tache => (
                              <div
                                key={tache.id}
                                className="bg-gray-50 border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow cursor-pointer"
                                onClick={() => openTacheDetails({ ...tache, production })}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <h5 className="font-medium text-sm text-gray-900 truncate">{tache.nom_tache}</h5>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTacheStatusBadgeClass(tache.status)}`}>
                                    {getTacheStatusLabel(tache.status)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-gray-500">
                                  <span>Ordre: {tache.ordre_tache}</span>
                                  {tache.nb_commentaires > 0 && <span>💬 {tache.nb_commentaires}</span>}
                                  {tache.nb_fichiers > 0 && <span>📎 {tache.nb_fichiers}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm">Aucune tâche disponible</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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