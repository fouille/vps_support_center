import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ProductionTacheModal from './ProductionTacheModal';

const ProductionModal = ({ production, onClose, onRefresh }) => {
  const { api, user } = useAuth();
  const [taches, setTaches] = useState([]);
  const [selectedTache, setSelectedTache] = useState(null);
  const [showTacheModal, setShowTacheModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Debug: vérifier la structure des données reçues
  console.log('ProductionModal - production:', production);

  // Guard: vérifier que production existe
  if (!production) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
          <p className="text-gray-900 dark:text-dark-text">Aucune donnée de production disponible</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg">
            Fermer
          </button>
        </div>
      </div>
    );
  }

  useEffect(() => {
    // Si les tâches sont déjà présentes dans l'objet production, les utiliser
    if (production && production.taches && Array.isArray(production.taches)) {
      setTaches(production.taches);
      setLoading(false);
    } else {
      // Sinon, les charger via API
      fetchTaches();
    }
  }, [production]);

  const fetchTaches = async () => {
    if (!production || !production.id) return;
    
    setLoading(true);
    try {
      const response = await api.get(`/api/production-taches?production_id=${production.id}`);
      const taches = Array.isArray(response) ? response : response.data || [];
      setTaches(taches);
    } catch (error) {
      console.error('Erreur lors du chargement des tâches:', error);
      // Mock data pour le développement local
      setTaches([
        { id: '1', nom_tache: 'Portabilité', status: 'a_faire', ordre_tache: 1, nb_commentaires: 0, nb_fichiers: 0 },
        { id: '2', nom_tache: 'Fichier de collecte', status: 'en_cours', ordre_tache: 2, nb_commentaires: 2, nb_fichiers: 1 }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const openTacheDetails = (tache) => {
    setSelectedTache({ ...tache, production });
    setShowTacheModal(true);
  };

  const handleTacheModalClose = () => {
    setShowTacheModal(false);
    setSelectedTache(null);
    fetchTaches(); // Rafraîchir les tâches
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

  const calculateProgress = () => {
    if (taches.length === 0) return 0;
    const terminatedTasks = taches.filter(t => t.status === 'termine').length;
    return Math.round((terminatedTasks / taches.length) * 100);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[95vh] overflow-y-auto">
        {/* En-tête */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-6 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">
                🏭 Production #{production.numero_production}
              </h2>
              <p className="opacity-90">{production.titre}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-primary-200 transition-colors"
            >
              <span className="text-2xl">×</span>
            </button>
          </div>
        </div>

        {/* Corps du modal */}
        <div className="p-6">
          {/* Informations générales */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Client</span>
                <p className="font-semibold text-gray-900 dark:text-dark-text">{production.client_display}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Demandeur</span>
                <p className="font-semibold text-gray-900 dark:text-dark-text">{production.demandeur_prenom} {production.demandeur_nom}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Statut</span>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(production.status)}`}>
                    {getStatusLabel(production.status)}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Priorité</span>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPrioriteBadgeClass(production.priorite)}`}>
                    {getPrioriteLabel(production.priorite)}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
              <div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Date de création</span>
                <p className="font-semibold text-gray-900 dark:text-dark-text">
                  {new Date(production.date_creation).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              {production.date_livraison_prevue && (
                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Livraison prévue</span>
                  <p className="font-semibold text-gray-900 dark:text-dark-text">
                    {new Date(production.date_livraison_prevue).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              )}
            </div>

            {production.description && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Description</span>
                <p className="text-gray-900 dark:text-dark-text mt-1">{production.description}</p>
              </div>
            )}
          </div>

          {/* Barre de progression */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text">📊 Avancement des tâches</h3>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{calculateProgress()}% terminé</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${calculateProgress()}%` }}
              ></div>
            </div>
          </div>

          {/* Liste des tâches */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text mb-4">📋 Tâches de production</h3>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                <p className="text-gray-600 dark:text-gray-400 mt-2">Chargement des tâches...</p>
              </div>
            ) : taches.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">📋</div>
                <p className="text-gray-600 dark:text-gray-400">Aucune tâche disponible</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {taches.map(tache => (
                  <div
                    key={tache.id}
                    className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => openTacheDetails(tache)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300 mr-2">
                          #{tache.ordre_tache}
                        </span>
                        <h4 className="font-medium text-gray-900 dark:text-dark-text text-sm">
                          {tache.nom_tache}
                        </h4>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTacheStatusBadgeClass(tache.status)}`}>
                        {getTacheStatusLabel(tache.status)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex items-center space-x-3">
                        {tache.nb_commentaires > 0 && (
                          <span className="flex items-center">
                            💬 {tache.nb_commentaires}
                          </span>
                        )}
                        {tache.nb_fichiers > 0 && (
                          <span className="flex items-center">
                            📎 {tache.nb_fichiers}
                          </span>
                        )}
                      </div>
                      <span className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium">
                        Voir détails →
                      </span>
                    </div>
                    
                    {tache.descriptif && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                        {tache.descriptif}
                      </p>
                    )}
                    
                    {tache.date_livraison && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        📅 Livraison: {new Date(tache.date_livraison).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pied de page */}
        <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 rounded-b-lg flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>

      {/* Modal des tâches */}
      {showTacheModal && selectedTache && (
        <ProductionTacheModal
          tache={selectedTache}
          onClose={handleTacheModalClose}
          onRefresh={() => {
            fetchTaches();
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </div>
  );
};

export default ProductionModal;