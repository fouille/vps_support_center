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
  const { isAgent, api } = useAuth();
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
  }, [isAgent, statusFilter, clientFilter]); // Refetch when filters change

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
  };

  const fetchTicketEchanges = async (ticketId) => {
    setLoadingComments(true);
    try {
      const response = await api.get(`/api/ticket-echanges/${ticketId}`);
      setViewingTicketEchanges(response.data);
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
      const response = await api.post(`/api/ticket-echanges/${viewingTicket.id}`, {
        message: newComment
      });
      
      // Add the new comment to the list
      setViewingTicketEchanges([...viewingTicketEchanges, response.data]);
      setNewComment('');
    } catch (error) {
      setError(error.response?.data?.detail || 'Erreur lors de l\'ajout du commentaire');
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
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      'nouveau': 'status-nouveau',
      'en_cours': 'status-en-cours',
      'en_attente': 'status-en-attente',
      'resolu': 'status-resolu',
      'ferme': 'status-ferme'
    };

    const statusLabels = {
      'nouveau': 'Nouveau',
      'en_cours': 'En cours',
      'en_attente': 'En attente',
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
          <div className="bg-white dark:bg-dark-surface rounded-lg p-6 w-full max-w-3xl modal-content max-h-90vh overflow-y-auto">
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

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text mb-2">
                  {viewingTicket.titre}
                </h3>
                {getStatusBadge(viewingTicket.status)}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                </div>

                <div className="space-y-4">
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
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketsPage;