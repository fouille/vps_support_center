import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  Ticket, 
  AlertCircle, 
  Calendar,
  User,
  Building,
  Clock,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const TicketsPage = () => {
  const { isAgent, api, user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [clients, setClients] = useState([]);
  const [demandeurs, setDemandeurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [viewingTicket, setViewingTicket] = useState(null);
  const [viewingTicketEchanges, setViewingTicketEchanges] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [commentsRefreshInterval, setCommentsRefreshInterval] = useState(null);
  const [ticketFiles, setTicketFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  
  // Filtres pour la supervision (agents seulement)
  const [statusFilter, setStatusFilter] = useState('active'); // 'active' ou 'all'
  const [clientFilter, setClientFilter] = useState('');
  
  const [formData, setFormData] = useState({
    titre: '',
    client_id: '',
    demandeur_id: '',
    status: 'nouveau',
    date_fin_prevue: '',
    requete_initiale: ''
  });

  useEffect(() => {
    fetchTickets();
    fetchClients(); // Les clients sont nécessaires pour tous les utilisateurs qui créent des tickets
    if (isAgent) {
      fetchDemandeurs(); // Les agents ont besoin de voir la liste des demandeurs
    }
    
    // Nettoyage à la fermeture du composant
    return () => {
      if (commentsRefreshInterval) {
        clearInterval(commentsRefreshInterval);
      }
    };
  }, [isAgent, statusFilter, clientFilter, commentsRefreshInterval]); // Refetch when filters change

  const fetchTickets = async () => {
    try {
      // Construire les paramètres de filtrage pour les agents
      let params = {};
      if (isAgent) {
        if (statusFilter === 'active') {
          params.status_filter = 'nouveau,en_cours,en_attente';
        }
        if (clientFilter) {
          params.client_id = clientFilter;
        }
      }
      
      const queryString = Object.keys(params).length > 0 
        ? '?' + new URLSearchParams(params).toString() 
        : '';
      
      const response = await api.get(`/api/tickets${queryString}`);
      setTickets(response.data);
    } catch (error) {
      setError('Erreur lors du chargement des tickets');
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await api.get('/api/clients');
      setClients(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des clients:', error);
    }
  };

  const fetchDemandeurs = async () => {
    try {
      const response = await api.get('/api/demandeurs');
      setDemandeurs(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des demandeurs:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTicket) {
        await api.put(`/api/tickets/${editingTicket.id}`, formData);
      } else {
        await api.post('/api/tickets', formData);
      }
      fetchTickets();
      handleCloseModal();
    } catch (error) {
      setError(error.response?.data?.detail || 'Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (ticketId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce ticket ?')) {
      try {
        await api.delete(`/api/tickets/${ticketId}`);
        fetchTickets();
      } catch (error) {
        setError(error.response?.data?.detail || 'Erreur lors de la suppression');
      }
    }
  };

  const handleView = (ticket) => {
    setViewingTicket(ticket);
    setShowViewModal(true);
    fetchTicketEchanges(ticket.id);
    
    // Démarrer l'actualisation automatique des commentaires toutes les 30 secondes
    const interval = setInterval(() => {
      fetchTicketEchanges(ticket.id);
    }, 30000);
    setCommentsRefreshInterval(interval);
  };

  // Émojis populaires pour les commentaires
  const popularEmojis = [
    '😊', '👍', '👎', '❤️', '😢', '😂', '🔥', '💡', 
    '✅', '❌', '⚠️', '🤔', '👌', '🙏', '💪', '🎉'
  ];

  const insertEmoji = (emoji) => {
    setNewComment(newComment + emoji);
    setShowEmojiPicker(false);
  };

  const fetchTicketEchanges = async (ticketId) => {
    setLoadingComments(true);
    try {
      const response = await api.get(`/api/ticket-echanges?ticketId=${ticketId}`);
      setViewingTicketEchanges(response.data);
      
      // Auto-scroll vers le bas après chargement des commentaires
      setTimeout(() => {
        const commentsContainer = document.querySelector('.comments-scroll-container');
        if (commentsContainer) {
          commentsContainer.scrollTo({
            top: commentsContainer.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 100);
      
    } catch (error) {
      console.error('Erreur lors du chargement des échanges:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const response = await api.post(`/api/ticket-echanges?ticketId=${viewingTicket.id}`, {
        message: newComment
      });
      
      // Add the new comment to the list
      const updatedComments = [...viewingTicketEchanges, response.data];
      setViewingTicketEchanges(updatedComments);
      setNewComment('');
      
      // Si c'est un agent qui répond, mettre le ticket en "répondu"
      if (isAgent && viewingTicket.status !== 'repondu') {
        await handleStatusChange(viewingTicket.id, 'repondu');
      }
      
      // Auto-scroll to the latest comment after a short delay
      setTimeout(() => {
        const commentsContainer = document.querySelector('.comments-scroll-container');
        if (commentsContainer) {
          commentsContainer.scrollTo({
            top: commentsContainer.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 100);
      
    } catch (error) {
      setError(error.response?.data?.detail || 'Erreur lors de l\'ajout du commentaire');
    }
  };

  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      await api.put(`/api/tickets/${ticketId}`, {
        ...viewingTicket,
        status: newStatus
      });
      
      // Mettre à jour le ticket dans la modal
      setViewingTicket({
        ...viewingTicket,
        status: newStatus
      });
      
      // Actualiser la liste des tickets
      fetchTickets();
      
    } catch (error) {
      setError(error.response?.data?.detail || 'Erreur lors de la mise à jour du statut');
    }
  };

  const handleEdit = (ticket) => {
    setEditingTicket(ticket);
    setFormData({
      titre: ticket.titre,
      client_id: ticket.client_id,
      demandeur_id: ticket.demandeur_id || '',
      status: ticket.status,
      date_fin_prevue: ticket.date_fin_prevue ? ticket.date_fin_prevue.split('T')[0] : '',
      requete_initiale: ticket.requete_initiale
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTicket(null);
    setFormData({
      titre: '',
      client_id: '',
      demandeur_id: '',
      status: 'nouveau',
      date_fin_prevue: '',
      requete_initiale: ''
    });
    setError('');
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setViewingTicket(null);
    setViewingTicketEchanges([]);
    setNewComment('');
    setShowEmojiPicker(false);
    
    // Arrêter l'actualisation automatique
    if (commentsRefreshInterval) {
      clearInterval(commentsRefreshInterval);
      setCommentsRefreshInterval(null);
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      'nouveau': 'status-nouveau',
      'en_cours': 'status-en-cours',
      'en_attente': 'status-en-attente',
      'repondu': 'status-repondu',
      'resolu': 'status-resolu',
      'ferme': 'status-ferme'
    };

    const statusLabels = {
      'nouveau': 'Nouveau',
      'en_cours': 'En cours',
      'en_attente': 'En attente',
      'repondu': 'Répondu',
      'resolu': 'Résolu',
      'ferme': 'Fermé'
    };

    return (
      <span className={`status-badge ${statusClasses[status]}`}>
        {statusLabels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">
          {isAgent ? 'Supervision des Tickets' : 'Mes Tickets'}
        </h1>
        <div className="flex space-x-3">
          <button
            onClick={fetchTickets}
            className="btn-secondary flex items-center"
            title="Actualiser la liste"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Actualiser
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nouveau Ticket
          </button>
        </div>
      </div>

      {/* Filtres pour les agents */}
      {isAgent && (
        <div className="mb-6 flex space-x-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
              Statut des tickets
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input w-48"
            >
              <option value="active">Actifs (Nouveau, En cours, En attente)</option>
              <option value="all">Tous les tickets</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
              Filtrer par client
            </label>
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="input w-64"
            >
              <option value="">Tous les clients</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.nom_societe} - {client.prenom} {client.nom}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-center p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-3" />
          <span className="text-red-700 dark:text-red-300">{error}</span>
        </div>
      )}

      <div className="grid gap-4">
        {tickets.map((ticket) => (
          <div key={ticket.id} className="card p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <Ticket className="h-5 w-5 text-primary-600" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text">
                    {ticket.titre}
                  </h3>
                  {getStatusBadge(ticket.status)}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div className="flex items-center text-sm text-gray-600 dark:text-dark-muted">
                    <Building className="h-4 w-4 mr-2" />
                    <span>Client: {ticket.client_nom}</span>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600 dark:text-dark-muted">
                    <User className="h-4 w-4 mr-2" />
                    <span>Demandeur: {ticket.demandeur_prenom} {ticket.demandeur_nom}</span>
                  </div>

                  <div className="flex items-center text-sm text-gray-600 dark:text-dark-muted">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>
                      Créé le: {format(new Date(ticket.date_creation), 'dd MMM yyyy', { locale: fr })}
                    </span>
                  </div>
                </div>

                {ticket.date_fin_prevue && (
                  <div className="flex items-center text-sm text-orange-600 dark:text-orange-400 mt-2">
                    <Clock className="h-4 w-4 mr-2" />
                    <span>
                      Échéance: {format(new Date(ticket.date_fin_prevue), 'dd MMM yyyy', { locale: fr })}
                    </span>
                  </div>
                )}

                <p className="text-gray-700 dark:text-dark-text mt-3 line-clamp-2">
                  {ticket.requete_initiale}
                </p>
              </div>

              <div className="flex space-x-2 ml-4">
                <button
                  onClick={() => handleView(ticket)}
                  className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  title="Voir le détail"
                >
                  <Eye className="h-4 w-4" />
                </button>
                
                {isAgent && (
                  <button
                    onClick={() => handleEdit(ticket)}
                    className="p-2 text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
                    title="Modifier"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                )}
                
                {isAgent && (
                  <button
                    onClick={() => handleDelete(ticket.id)}
                    className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {tickets.length === 0 && (
          <div className="card p-12 text-center">
            <Ticket className="h-16 w-16 text-gray-300 dark:text-dark-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text mb-2">
              Aucun ticket
            </h3>
            <p className="text-gray-500 dark:text-dark-muted">
              {isAgent ? 'Aucun ticket n\'a été créé pour le moment.' : 'Vous n\'avez aucun ticket. Créez-en un nouveau !'}
            </p>
          </div>
        )}
      </div>

      {/* Modal de création/édition */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal-overlay">
          <div className="bg-white dark:bg-dark-surface rounded-lg p-6 w-full max-w-2xl modal-content max-h-90vh overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-dark-text">
              {editingTicket ? 'Modifier le Ticket' : 'Nouveau Ticket'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                  Titre *
                </label>
                <input
                  type="text"
                  required
                  value={formData.titre}
                  onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                  Client *
                </label>
                <select
                  required
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                  className="input"
                >
                  <option value="">Sélectionner un client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.nom_societe} - {client.prenom} {client.nom}
                    </option>
                  ))}
                </select>
              </div>

              {isAgent && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                    Demandeur *
                  </label>
                  <select
                    required
                    value={formData.demandeur_id}
                    onChange={(e) => setFormData({ ...formData, demandeur_id: e.target.value })}
                    className="input"
                  >
                    <option value="">Sélectionner un demandeur</option>
                    {demandeurs.map((demandeur) => (
                      <option key={demandeur.id} value={demandeur.id}>
                        {demandeur.prenom} {demandeur.nom} - {demandeur.societe}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                    Statut
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="input"
                  >
                    <option value="nouveau">Nouveau</option>
                    <option value="en_cours">En cours</option>
                    <option value="en_attente">En attente</option>
                    <option value="repondu">Répondu</option>
                    <option value="resolu">Résolu</option>
                    <option value="ferme">Fermé</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                    Date de fin prévue
                  </label>
                  <input
                    type="date"
                    value={formData.date_fin_prevue}
                    onChange={(e) => setFormData({ ...formData, date_fin_prevue: e.target.value })}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                  Requête initiale *
                </label>
                <textarea
                  required
                  value={formData.requete_initiale}
                  onChange={(e) => setFormData({ ...formData, requete_initiale: e.target.value })}
                  className="input h-32 resize-none"
                  placeholder="Décrivez la demande ou le problème..."
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
                  className="btn-primary"
                >
                  {editingTicket ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de visualisation */}
      {showViewModal && viewingTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal-overlay">
          <div className="bg-white dark:bg-dark-surface rounded-lg p-6 w-full max-w-4xl modal-content max-h-90vh overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text">
                Détail du Ticket
              </h2>
              <button
                onClick={handleCloseViewModal}
                className="text-gray-500 hover:text-gray-700 dark:text-dark-muted dark:hover:text-dark-text"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Informations du ticket */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text mb-2">
                    {viewingTicket.titre}
                  </h3>
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(viewingTicket.status)}
                    {isAgent && (
                      <select
                        value={viewingTicket.status}
                        onChange={(e) => handleStatusChange(viewingTicket.id, e.target.value)}
                        className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-surface text-gray-700 dark:text-dark-text focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="nouveau">Nouveau</option>
                        <option value="en_cours">En cours</option>
                        <option value="en_attente">En attente</option>
                        <option value="repondu">Répondu</option>
                        <option value="resolu">Résolu</option>
                        <option value="ferme">Fermé</option>
                      </select>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                      Client
                    </label>
                    <p className="text-gray-900 dark:text-dark-text">
                      {viewingTicket.client_nom}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                      Demandeur
                    </label>
                    <p className="text-gray-900 dark:text-dark-text">
                      {viewingTicket.demandeur_prenom} {viewingTicket.demandeur_nom}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                      Date de création
                    </label>
                    <p className="text-gray-900 dark:text-dark-text">
                      {format(new Date(viewingTicket.date_creation), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                    </p>
                  </div>

                  {viewingTicket.date_fin_prevue && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                        Date de fin prévue
                      </label>
                      <p className="text-gray-900 dark:text-dark-text">
                        {format(new Date(viewingTicket.date_fin_prevue), 'dd MMMM yyyy', { locale: fr })}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                    Requête initiale
                  </label>
                  <div className="bg-gray-50 dark:bg-dark-card p-4 rounded-lg">
                    <p className="text-gray-900 dark:text-dark-text whitespace-pre-wrap">
                      {viewingTicket.requete_initiale}
                    </p>
                  </div>
                </div>
              </div>

              {/* Section commentaires/échanges */}
              <div className="flex flex-col h-full min-h-[500px]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text">
                    Échanges et commentaires
                  </h3>
                  <div className="flex items-center space-x-3">
                    {viewingTicketEchanges.length > 0 && (
                      <span className="text-sm text-gray-500 dark:text-dark-muted">
                        {viewingTicketEchanges.length} commentaire{viewingTicketEchanges.length > 1 ? 's' : ''}
                      </span>
                    )}
                    <button
                      onClick={() => fetchTicketEchanges(viewingTicket.id)}
                      className="flex items-center space-x-1 text-sm text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                      title="Actualiser les commentaires"
                      disabled={loadingComments}
                    >
                      <RefreshCw className={`h-4 w-4 ${loadingComments ? 'animate-spin' : ''}`} />
                      <span>Actualiser</span>
                    </button>
                  </div>
                </div>
                
                {/* Liste des commentaires avec scroll amélioré */}
                <div className="flex-1 border border-gray-200 dark:border-dark-border rounded-lg mb-4 bg-gray-50 dark:bg-dark-card relative">
                  {/* Container de messagerie avec scroll et padding bottom */}
                  <div className="h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent p-4 pb-8 comments-scroll-container bg-gradient-to-b from-gray-50 to-gray-100 dark:from-dark-card dark:to-dark-surface">
                    {loadingComments ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                      </div>
                    ) : viewingTicketEchanges.length > 0 ? (
                      <div className="space-y-3">
                        {viewingTicketEchanges.map((echange, index) => {
                          // Déterminer si c'est MON message (utilisateur connecté)
                          const isMyMessage = user && (
                            (isAgent && echange.auteur_type === 'agent') ||
                            (!isAgent && echange.auteur_type === 'demandeur')
                          );
                          
                          const isAgentAuthor = echange.auteur_type === 'agent';
                          
                          return (
                            <div 
                              key={echange.id} 
                              className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'} ${
                                index === viewingTicketEchanges.length - 1 ? 'animate-fade-in' : ''
                              }`}
                            >
                              <div className={`max-w-xs lg:max-w-md ${isMyMessage ? 'order-2' : 'order-1'}`}>
                                {/* Message bubble */}
                                <div className={`rounded-2xl px-4 py-3 shadow-sm ${
                                  isMyMessage 
                                    ? 'bg-primary-500 text-white rounded-br-md' 
                                    : 'bg-white dark:bg-dark-surface text-gray-900 dark:text-dark-text rounded-bl-md border border-gray-200 dark:border-dark-border'
                                }`}>
                                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                    {echange.message}
                                  </p>
                                </div>
                                
                                {/* Metadata */}
                                <div className={`flex items-center mt-1 text-xs text-gray-500 dark:text-dark-muted ${
                                  isMyMessage ? 'justify-end' : 'justify-start'
                                }`}>
                                  <div className={`flex items-center space-x-2 ${isMyMessage ? 'flex-row-reverse space-x-reverse' : ''}`}>
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white comment-avatar ${
                                      isAgentAuthor ? 'bg-primary-600' : 'bg-green-500'
                                    }`}>
                                      {echange.auteur_nom.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                    </div>
                                    <span className="font-medium">
                                      {isMyMessage ? 'Moi' : echange.auteur_nom}
                                    </span>
                                    <span>•</span>
                                    <span>
                                      {format(new Date(echange.created_at), 'HH:mm', { locale: fr })}
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
                        <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                          <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                        <p className="text-gray-500 dark:text-dark-muted">
                          Aucune conversation pour ce ticket
                        </p>
                        <p className="text-sm text-gray-400 dark:text-gray-600 mt-1">
                          Commencez la discussion en envoyant le premier message
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Indicateur de scroll si nécessaire */}
                  {viewingTicketEchanges.length > 3 && (
                    <div className="absolute bottom-2 right-2 text-xs text-gray-400 dark:text-gray-500 bg-white dark:bg-dark-surface px-2 py-1 rounded shadow">
                      Faire défiler pour voir plus
                    </div>
                  )}
                </div>

                {/* Formulaire d'ajout de commentaire amélioré avec émojis */}
                <div className="border-t border-gray-200 dark:border-dark-border pt-4">
                  <form onSubmit={handleAddComment} className="space-y-3">
                    {/* Barre d'émojis */}
                    <div className="relative">
                      <div className="flex items-center justify-between mb-2">
                        <button
                          type="button"
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className="text-sm text-gray-500 hover:text-gray-700 dark:text-dark-muted dark:hover:text-dark-text flex items-center space-x-1"
                        >
                          <span className="text-lg">😊</span>
                          <span>Émojis</span>
                        </button>
                      </div>
                      
                      {/* Sélecteur d'émojis */}
                      {showEmojiPicker && (
                        <div className="absolute bottom-full left-0 mb-2 emoji-picker border border-gray-200 dark:border-dark-border rounded-lg p-3 shadow-xl z-10 w-full max-w-xs">
                          <div className="grid grid-cols-8 gap-1">
                            {popularEmojis.map((emoji, index) => (
                              <button
                                key={index}
                                type="button"
                                onClick={() => insertEmoji(emoji)}
                                className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-dark-card rounded text-lg emoji-button"
                                title={`Ajouter ${emoji}`}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-dark-border">
                            <button
                              type="button"
                              onClick={() => setShowEmojiPicker(false)}
                              className="text-xs text-gray-500 hover:text-gray-700 dark:text-dark-muted dark:hover:text-dark-text w-full text-center py-1"
                            >
                              Fermer
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="relative">
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Tapez votre message..."
                        className="input h-20 resize-none pr-12 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        required
                        maxLength={1000}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAddComment(e);
                          }
                        }}
                      />
                      <div className={`absolute bottom-2 right-2 text-xs ${
                        newComment.length > 900 ? 'text-red-500' : 
                        newComment.length > 800 ? 'text-yellow-500' : 
                        'text-gray-400 dark:text-gray-500'
                      } character-counter ${
                        newComment.length > 900 ? 'danger' : 
                        newComment.length > 800 ? 'warning' : ''
                      }`}>
                        {newComment.length}/1000
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-dark-muted">
                        💡 Appuyez sur Entrée pour envoyer • Shift+Entrée pour saut de ligne
                      </span>
                      <div className="flex space-x-2">
                        {showEmojiPicker && (
                          <button
                            type="button"
                            onClick={() => setShowEmojiPicker(false)}
                            className="text-xs text-gray-500 hover:text-gray-700 dark:text-dark-muted dark:hover:text-dark-text px-2 py-1"
                          >
                            Fermer
                          </button>
                        )}
                        <button
                          type="submit"
                          className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={!newComment.trim()}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                          <span>Envoyer</span>
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketsPage;