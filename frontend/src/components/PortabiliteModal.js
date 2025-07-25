import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const PortabiliteModal = ({ portabiliteId, onClose, onEdit }) => {
  const { user, api } = useContext(AuthContext);
  const [portabilite, setPortabilite] = useState(null);
  const [commentaires, setCommentaires] = useState([]);
  const [fichiers, setFichiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [error, setError] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  
  const commentsEndRef = useRef(null);

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

  // Fonction pour récupérer les détails de la portabilité
  const fetchPortabilite = async () => {
    try {
      const response = await api.get(`/api/portabilites/${portabiliteId}`);
      console.log('Portabilité data received:', response.data);
      
      // L'API retourne un tableau avec un objet, prendre le premier élément
      const portabiliteData = Array.isArray(response.data) ? response.data[0] : response.data;
      console.log('Portabilité object:', portabiliteData);
      
      setPortabilite(portabiliteData);
    } catch (err) {
      setError('Erreur lors du chargement de la portabilité');
      console.error('Erreur:', err);
    }
  };

  // Fonction pour récupérer les commentaires
  const fetchCommentaires = async () => {
    try {
      const response = await api.get(`/api/portabilite-echanges?portabiliteId=${portabiliteId}`);
      setCommentaires(response.data);
    } catch (err) {
      console.error('Erreur lors du chargement des commentaires:', err);
    }
  };

  // Fonction pour envoyer un commentaire
  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setCommentLoading(true);
    try {
      const response = await api.post(`/api/portabilite-echanges`, {
        portabiliteId: portabiliteId,
        message: newComment.trim()
      });

      setCommentaires([...commentaires, response.data]);
      setNewComment('');
      
      // Scroll vers le bas
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      setError('Erreur lors de l\'envoi du commentaire');
      console.error('Erreur:', err);
    } finally {
      setCommentLoading(false);
    }
  };

  // Fonction pour annulation (demandeurs uniquement)
  const handleAnnulation = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir demander l\'annulation de cette portabilité ?')) return;

    setCommentLoading(true);
    try {
      const response = await api.post(`/api/portabilite-echanges`, {
        portabiliteId: portabiliteId,
        message: "Demande d'annulation sans réserves"
      });

      setCommentaires([...commentaires, response.data]);
      
      // Scroll vers le bas
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      setError('Erreur lors de l\'envoi de la demande d\'annulation');
      console.error('Erreur:', err);
    } finally {
      setCommentLoading(false);
    }
  };

  // Fonction pour changer le statut
  const handleStatusChange = async () => {
    if (!newStatus) return;

    setStatusLoading(true);
    try {
      const response = await api.put(`/api/portabilites/${portabiliteId}`, {
        status: newStatus
      });

      setPortabilite(response.data);
      setShowEditModal(false);
      setNewStatus('');
    } catch (err) {
      setError('Erreur lors du changement de statut');
      console.error('Erreur:', err);
    } finally {
      setStatusLoading(false);
    }
  };

  // Fonction pour supprimer la portabilité
  const handleDelete = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette portabilité ?')) return;

    try {
      await api.delete(`/api/portabilites/${portabiliteId}`);
      onClose();
      window.location.reload(); // Rafraîchir la liste
    } catch (err) {
      setError('Erreur lors de la suppression');
      console.error('Erreur:', err);
    }
  };

  // Fonction pour formater la date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Fonction pour vérifier si la date est aujourd'hui
  const isToday = (dateString) => {
    if (!dateString) return false;
    const today = new Date();
    const date = new Date(dateString);
    return date.toDateString() === today.toDateString();
  };

  // Scroll automatique vers le bas quand de nouveaux commentaires arrivent
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [commentaires]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchPortabilite(), fetchCommentaires()]);
      setLoading(false);
    };
    
    loadData();
  }, [portabiliteId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-dark-surface rounded-lg p-6">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!portabilite) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-dark-surface rounded-lg p-6 max-w-md w-full mx-4">
          <p className="text-red-600 text-center">Portabilité non trouvée</p>
          <button
            onClick={onClose}
            className="mt-4 w-full text-purple-600 hover:text-purple-800"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-surface rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Portabilité #{portabilite.numero_portabilite}
              </h2>
              <div className="flex items-center space-x-4">
                <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${statusColors[portabilite.status] || 'bg-gray-100 text-gray-800'}`}>
                  {statusLabels[portabilite.status] || portabilite.status}
                </span>
                {isToday(portabilite.date_portabilite_effective) && (
                  <span className="text-red-500 font-semibold">🚨 Portabilité effective aujourd'hui</span>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {user.type_utilisateur === 'agent' && (
                <>
                  <button
                    onClick={() => {
                      onClose();
                      onEdit(portabiliteId);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => {
                      setNewStatus(portabilite.status);
                      setShowEditModal(true);
                    }}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Changer statut
                  </button>
                  <button
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Supprimer
                  </button>
                </>
              )}
              {user.type_utilisateur === 'demandeur' && (
                <button
                  onClick={handleAnnulation}
                  disabled={commentLoading}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {commentLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Envoi...</span>
                    </>
                  ) : (
                    <>
                      <span>Annulation</span>
                      <span>⚠️</span>
                    </>
                  )}
                </button>
              )}
              
              {/* Séparateur visuel */}
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-4"></div>
              
              {/* Bouton de fermeture espacé */}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Informations de la portabilité */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Informations générales
              </h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Client</p>
                  <p className="text-gray-900 dark:text-white">{portabilite.client_display || portabilite.nom_societe}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Demandeur</p>
                  <p className="text-gray-900 dark:text-white">
                    {portabilite.demandeur_prenom} {portabilite.demandeur_nom}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Date de création</p>
                  <p className="text-gray-900 dark:text-white">{formatDate(portabilite.date_creation)}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Date souhaitée</p>
                  <p className="text-gray-900 dark:text-white">
                    {portabilite.date_portabilite_demandee ? 
                      new Date(portabilite.date_portabilite_demandee).toLocaleDateString('fr-FR') : 
                      '-'
                    }
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Date effective</p>
                  <p className="text-gray-900 dark:text-white">
                    {portabilite.date_portabilite_effective ? 
                      new Date(portabilite.date_portabilite_effective).toLocaleDateString('fr-FR') : 
                      '-'
                    }
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Numéros à porter</p>
                  <div className="bg-white dark:bg-gray-700 p-3 rounded-md">
                    <pre className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                      {portabilite.numeros_portes}
                    </pre>
                  </div>
                </div>
                
                {portabilite.adresse && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Adresse</p>
                    <p className="text-gray-900 dark:text-white">
                      {portabilite.adresse}
                      {portabilite.code_postal && `, ${portabilite.code_postal}`}
                      {portabilite.ville && ` ${portabilite.ville}`}
                    </p>
                  </div>
                )}
                
                <div className="flex space-x-6">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Fiabilisation</p>
                    <p className="text-gray-900 dark:text-white">
                      {portabilite.fiabilisation_demandee ? '✅ Oui' : '❌ Non'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Demande signée</p>
                    <p className="text-gray-900 dark:text-white">
                      {portabilite.demande_signee ? '✅ Oui' : '❌ Non'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Système de commentaires - Style moderne des tickets */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Échanges et commentaires
                </h3>
                <div className="flex items-center space-x-3">
                  {commentaires.length > 0 && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {commentaires.length} commentaire{commentaires.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Liste des commentaires avec scroll amélioré */}
              <div className="border border-gray-200 dark:border-gray-600 rounded-lg mb-4 bg-gray-50 dark:bg-gray-700 relative">
                {/* Container de messagerie avec scroll et padding bottom */}
                <div className="h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent p-4 pb-8 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
                  {commentaires.length > 0 ? (
                    <div className="space-y-3">
                      {commentaires.map((commentaire, index) => {
                        // Déterminer si c'est MON message (utilisateur connecté)
                        const isMyMessage = user && (
                          (user.type_utilisateur === 'agent' && commentaire.auteur_type === 'agent') ||
                          (user.type_utilisateur === 'demandeur' && commentaire.auteur_type === 'demandeur')
                        );
                        
                        const isAgentAuthor = commentaire.auteur_type === 'agent';
                        
                        return (
                          <div 
                            key={commentaire.id} 
                            className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'} ${
                              index === commentaires.length - 1 ? 'animate-fade-in' : ''
                            }`}
                          >
                            <div className={`max-w-xs lg:max-w-md ${isMyMessage ? 'order-2' : 'order-1'}`}>
                              {/* Message bubble */}
                              <div className={`rounded-2xl px-4 py-3 shadow-sm ${
                                isMyMessage 
                                  ? 'bg-purple-500 text-white rounded-br-md' 
                                  : 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white rounded-bl-md border border-gray-200 dark:border-gray-500'
                              }`}>
                                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                  {commentaire.message}
                                </p>
                              </div>
                              
                              {/* Metadata */}
                              <div className={`flex items-center mt-1 text-xs text-gray-500 dark:text-gray-400 ${
                                isMyMessage ? 'justify-end' : 'justify-start'
                              }`}>
                                <div className={`flex items-center space-x-2 ${isMyMessage ? 'flex-row-reverse space-x-reverse' : ''}`}>
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white ${
                                    isAgentAuthor ? 'bg-purple-600' : 'bg-green-500'
                                  }`}>
                                    {commentaire.auteur_nom ? commentaire.auteur_nom.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'A'}
                                  </div>
                                  <span className="font-medium">
                                    {isMyMessage ? 'Moi' : (commentaire.auteur_nom || 'Utilisateur')}
                                  </span>
                                  <span>•</span>
                                  <span>
                                    {format(new Date(commentaire.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-16 h-16 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <p className="text-gray-500 dark:text-gray-400">
                        Aucune conversation pour cette portabilité
                      </p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                        Commencez la discussion en envoyant le premier message
                      </p>
                    </div>
                  )}
                  <div ref={commentsEndRef} />
                </div>
                
                {/* Indicateur de scroll si nécessaire */}
                {commentaires.length > 3 && (
                  <div className="absolute bottom-2 right-2 text-xs text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-600 px-2 py-1 rounded shadow">
                    Faire défiler pour voir plus
                  </div>
                )}
              </div>

              {/* Formulaire de commentaire amélioré */}
              <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                <form onSubmit={handleSubmitComment} className="space-y-3">
                  <div className="relative">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Tapez votre message..."
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-600 dark:text-white h-20 resize-none pr-12"
                      required
                      maxLength={1000}
                      disabled={commentLoading}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && !commentLoading) {
                          e.preventDefault();
                          handleSubmitComment(e);
                        }
                      }}
                    />
                    <div className={`absolute bottom-2 right-2 text-xs ${
                      newComment.length > 900 ? 'text-red-500' : 
                      newComment.length > 800 ? 'text-yellow-500' : 
                      'text-gray-400 dark:text-gray-500'
                    }`}>
                      {newComment.length}/1000
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      💡 Appuyez sur Entrée pour envoyer • Shift+Entrée pour saut de ligne
                    </span>
                    <button
                      type="submit"
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                      disabled={!newComment.trim() || commentLoading}
                    >
                      {commentLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Envoi...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                          <span>Envoyer</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Modal de changement de statut */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-dark-surface rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Changer le statut
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nouveau statut
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-dark-surface dark:border-gray-600 dark:text-white"
                  >
                    {Object.entries(statusLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleStatusChange}
                    disabled={statusLoading}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md disabled:opacity-50 transition-colors"
                  >
                    {statusLoading ? 'Sauvegarde...' : 'Confirmer'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mx-6 mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default PortabiliteModal;