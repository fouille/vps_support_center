import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import SearchableSelect from './SearchableSelect';
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
  RefreshCw,
  Search
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const TicketsPage = () => {
  const { isAgent, api, user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [clients, setClients] = useState([]); // Clients pour les filtres - maintenant avec recherche serveur aussi
  const [formClients, setFormClients] = useState([]); // Clients pour le formulaire de création
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
  const [ticketFiles, setTicketFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);
  const [refreshingTickets, setRefreshingTickets] = useState(false);
  
  const [loadingFormClients, setLoadingFormClients] = useState(false);
  const [loadingFilterClients, setLoadingFilterClients] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false); // Nouveau loader pour la recherche par numéro
  const filterClientsLoadedRef = useRef(false); // Utiliser useRef au lieu de useState
  const currentModalRef = useRef(null); // Pour éviter les re-chargements du formulaire
  const searchTimeoutRef = useRef(null); // Pour le debouncing de la recherche par numéro
  
  // Filtres pour la supervision (agents seulement)
  const [statusFilter, setStatusFilter] = useState('active'); // 'active' ou 'all'
  const [clientFilter, setClientFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState(''); // Nouveau filtre pour recherche par numéro

  // Fonction de recherche de clients pour les filtres (identique au formulaire)
  const handleFilterClientSearch = React.useCallback(async (searchTerm) => {
    setLoadingFilterClients(true);
    
    try {
      // Construire les paramètres pour la requête
      const params = new URLSearchParams();
      
      if (searchTerm && searchTerm.length >= 3) {
        params.append('search', searchTerm);
        params.append('limit', '100'); // Plus de résultats avec recherche
      } else if (!searchTerm) {
        params.append('limit', '10'); // 10 premiers clients par défaut
      } else {
        // Moins de 3 caractères : ne pas faire d'appel
        setLoadingFilterClients(false);
        return;
      }
      
      // Pour les demandeurs, limiter aux clients de leur société
      if (!isAgent && user?.societe_id) {
        params.append('societe', user.societe_id);
      }
      
      const response = await api.get(`/api/clients?${params}`);
      
      // Check if response has pagination structure (new API) or is just array (old API)
      if (response.data.data && response.data.pagination) {
        setClients(response.data.data);
      } else {
        // Fallback for old API format
        setClients(response.data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des clients pour filtres:', error);
    } finally {
      setLoadingFilterClients(false);
    }
  }, [isAgent, user?.societe_id, api]);

  // Fonction de recherche de clients pour le formulaire (sans debouncing, géré par SearchableSelect)
  const handleFormClientSearch = React.useCallback(async (searchTerm) => {
    setLoadingFormClients(true);
    
    try {
      // Construire les paramètres pour la requête
      const params = new URLSearchParams();
      
      if (searchTerm && searchTerm.length >= 3) {
        params.append('search', searchTerm);
        params.append('limit', '100'); // Plus de résultats avec recherche
      } else if (!searchTerm) {
        params.append('limit', '10'); // 10 premiers clients par défaut
      } else {
        // Moins de 3 caractères : ne pas faire d'appel
        setLoadingFormClients(false);
        return;
      }
      
      // Pour les demandeurs, limiter aux clients de leur société
      if (!isAgent && user?.societe_id) {
        params.append('societe', user.societe_id);
      }
      
      const response = await api.get(`/api/clients?${params}`);
      
      // Check if response has pagination structure (new API) or is just array (old API)
      if (response.data.data && response.data.pagination) {
        setFormClients(response.data.data);
      } else {
        // Fallback for old API format
        setFormClients(response.data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des clients pour formulaire:', error);
    } finally {
      setLoadingFormClients(false);
    }
  }, [isAgent, user?.societe_id, api]);
  
  const [formData, setFormData] = useState({
    titre: '',
    client_id: '',
    demandeur_id: '',
    status: 'nouveau',
    date_fin_prevue: '',
    requete_initiale: ''
  });

  // Formater l'affichage des clients
  const formatClientDisplay = (client) => {
    const contact = client.prenom || client.nom ? `${client.prenom || ''} ${client.nom || ''}`.trim() : '';
    return contact ? `${client.nom_societe} - ${contact}` : client.nom_societe;
  };

  // Préparer les options pour le select de clients avec recherche
  const clientOptions = [
    { value: '', label: 'Tous les clients', subtitle: '' },
    ...(Array.isArray(clients) ? clients.map(client => ({
      value: client.id,
      label: client.nom_societe,
      subtitle: client.prenom || client.nom ? `${client.prenom || ''} ${client.nom || ''}`.trim() : '',
      searchText: `${client.nom_societe} ${client.prenom || ''} ${client.nom || ''}`.toLowerCase()
    })) : [])
  ];

  useEffect(() => {
    fetchTickets();
    if (isAgent) {
      fetchDemandeurs(); // Les agents ont besoin de voir la liste des demandeurs
    }
  }, [isAgent, statusFilter, clientFilter, searchFilter]); // Refetch when filters change

  // Charger les clients pour les filtres au montage initial (une seule fois)
  useEffect(() => {
    if (filterClientsLoadedRef.current) {
      return; // Éviter les re-appels si déjà chargé
    }
    
    // Éviter les appels si on a déjà des clients
    if (clients.length > 0) {
      filterClientsLoadedRef.current = true;
      return;
    }

    const loadInitialFilterClients = async () => {
      setLoadingFilterClients(true);
      filterClientsLoadedRef.current = true; // Marquer tout de suite pour éviter les doubles appels
      
      try {
        const params = new URLSearchParams();
        params.append('limit', '10'); // 10 premiers clients par défaut
        
        // Pour les demandeurs, limiter aux clients de leur société
        if (!isAgent && user?.societe_id) {
          params.append('societe', user.societe_id);
        }
        
        const response = await api.get(`/api/clients?${params}`);
        
        // Check if response has pagination structure (new API) or is just array (old API)
        if (response.data.data && response.data.pagination) {
          setClients(response.data.data);
        } else {
          // Fallback for old API format
          setClients(response.data);
        }
      } catch (error) {
        console.error('Erreur lors du chargement initial des clients pour filtres:', error);
        filterClientsLoadedRef.current = false; // Permettre de réessayer en cas d'erreur
      } finally {
        setLoadingFilterClients(false);
      }
    };

    loadInitialFilterClients();
  }, []); // Dépendances vides pour un chargement unique

  // Charger les clients pour le formulaire lors de l'ouverture du modal (une seule fois par ouverture)
  useEffect(() => {
    if (showModal && currentModalRef.current !== showModal) {
      currentModalRef.current = showModal; // Marquer cette ouverture de modal

      const loadInitialFormClients = async () => {
        setLoadingFormClients(true);
        
        try {
          const params = new URLSearchParams();
          params.append('limit', '10'); // 10 premiers clients par défaut
          
          // Pour les demandeurs, limiter aux clients de leur société
          if (!isAgent && user?.societe_id) {
            params.append('societe', user.societe_id);
          }
          
          const response = await api.get(`/api/clients?${params}`);
          
          // Check if response has pagination structure (new API) or is just array (old API)
          if (response.data.data && response.data.pagination) {
            setFormClients(response.data.data);
          } else {
            // Fallback for old API format
            setFormClients(response.data);
          }
        } catch (error) {
          console.error('Erreur lors du chargement initial des clients pour formulaire:', error);
        } finally {
          setLoadingFormClients(false);
        }
      };

      loadInitialFormClients();
    } else if (!showModal) {
      currentModalRef.current = null; // Reset when modal is closed
    }
  }, [showModal]); // Seulement showModal comme dépendance

  const fetchTickets = async (showLoader = false) => {
    if (showLoader) {
      setRefreshingTickets(true);
    }
    
    try {
      // Construire les paramètres de filtrage pour les agents
      let params = {};
      if (isAgent) {
        if (statusFilter === 'active') {
          params.status_filter = 'nouveau,en_cours,en_attente,repondu';
        }
        if (clientFilter) {
          params.client_id = clientFilter;
        }
        
        // Ajout du filtre de recherche par numéro de ticket
        if (searchFilter) {
          params.search = searchFilter;
        }
      } else {
        // Filtres pour les demandeurs
        if (statusFilter === 'active') {
          params.status_filter = 'nouveau,en_cours,en_attente,repondu';
        }
        if (clientFilter) {
          params.client_id = clientFilter;
        }
        
        // Ajout du filtre de recherche par numéro de ticket
        if (searchFilter) {
          params.search = searchFilter;
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
      if (showLoader) {
        setRefreshingTickets(false);
      }
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

  const fetchTicketFiles = async (ticketId) => {
    setLoadingFiles(true);
    try {
      const response = await api.get(`/api/ticket-fichiers?ticketId=${ticketId}`);
      setTicketFiles(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des fichiers:', error);
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Vérifications côté client
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError('Fichier trop volumineux (limite: 10MB)');
      return;
    }

    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'audio/wav', 'audio/wave', 'audio/x-wav',
      'text/plain', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(file.type)) {
      setError('Type de fichier non autorisé. Formats acceptés: Images, PDF, WAV, TXT, DOC');
      return;
    }

    setUploadingFile(true);
    try {
      // Convertir le fichier en base64
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const fileData = {
        nom_fichier: file.name,
        type_fichier: file.type,
        taille_fichier: file.size,
        contenu_base64: base64
      };

      await api.post(`/api/ticket-fichiers?ticketId=${viewingTicket.id}`, fileData);
      
      // Ajouter un commentaire automatique
      try {
        const commentResponse = await api.post(`/api/ticket-echanges?ticketId=${viewingTicket.id}`, {
          message: `A ajouté une pièce jointe ${file.name}`
        });
        
        // Ajouter le commentaire à la liste
        setViewingTicketEchanges([...viewingTicketEchanges, commentResponse.data]);
        
        // Si c'est un agent qui ajoute le fichier, mettre le ticket en "répondu"
        if (isAgent && viewingTicket.status !== 'repondu') {
          await handleStatusChange(viewingTicket.id, 'repondu');
        }
      } catch (commentError) {
        console.error('Erreur lors de l\'ajout du commentaire automatique:', commentError);
        // On continue même si le commentaire échoue
      }
      
      fetchTicketFiles(viewingTicket.id);
      event.target.value = ''; // Reset input
    } catch (error) {
      setError(error.response?.data?.detail || 'Erreur lors de l\'upload du fichier');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleFileDelete = async (fileId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce fichier ?')) return;

    try {
      await api.delete(`/api/ticket-fichiers?ticketId=${viewingTicket.id}&fileId=${fileId}`);
      fetchTicketFiles(viewingTicket.id);
    } catch (error) {
      setError(error.response?.data?.detail || 'Erreur lors de la suppression du fichier');
    }
  };

  const downloadFile = (file) => {
    try {
      const byteCharacters = atob(file.contenu_base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: file.type_fichier });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.nom_fichier;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setError('Erreur lors du téléchargement du fichier');
    }
  };

  const getFileIcon = (mimeType) => {
    if (mimeType?.startsWith('image/')) return '🖼️';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType?.startsWith('audio/')) return '🎵';
    if (mimeType?.includes('word')) return '📝';
    return '📎';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleView = (ticket) => {
    setViewingTicket(ticket);
    setShowViewModal(true);
    fetchTicketEchanges(ticket.id);
    fetchTicketFiles(ticket.id);
    
    // Si c'est un agent qui ouvre le ticket et que le statut est "nouveau", le passer en "en_cours"
    if (isAgent && ticket.status === 'nouveau') {
      handleStatusChange(ticket.id, 'en_cours', ticket);
    }
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
    if (!newComment.trim() || sendingComment) return;

    setSendingComment(true);
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
    } finally {
      setSendingComment(false);
    }
  };

  const handleStatusChange = async (ticketId, newStatus, ticketData = null) => {
    try {
      // Utiliser ticketData si fourni, sinon viewingTicket
      const currentTicket = ticketData || viewingTicket;
      
      await api.put(`/api/tickets/${ticketId}`, {
        ...currentTicket,
        status: newStatus
      });
      
      // Mettre à jour le ticket dans la modal avec le nouveau statut
      const updatedTicket = {
        ...(ticketData || viewingTicket),
        status: newStatus
      };
      
      setViewingTicket(updatedTicket);
      
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
          {isAgent ? 'Support' : 'Mes Tickets'}
        </h1>
        <div className="flex space-x-3">
          <button
            onClick={() => fetchTickets(true)}
            className="btn-secondary flex items-center"
            title="Actualiser la liste"
            disabled={refreshingTickets}
          >
            <RefreshCw className={`h-5 w-5 mr-2 ${refreshingTickets ? 'animate-spin' : ''}`} />
            {refreshingTickets ? 'Actualisation...' : 'Actualiser'}
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

      {/* Filtres pour les agents ET demandeurs */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
            Statut des tickets
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input w-full"
          >
            <option value="active">Actifs (Nouveau, En cours, En attente, Répondu)</option>
            <option value="all">Tous les tickets</option>
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
            onSearch={handleFilterClientSearch}
            loading={loadingFilterClients}
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
              placeholder="Ex: 123456"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="input w-full pr-10"
              maxLength={6}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          {searchFilter && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Recherche par numéro de ticket
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-3" />
          <span className="text-red-700 dark:text-red-300">{error}</span>
        </div>
      )}

      <div className="overflow-y-auto max-h-[70vh] scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
        <div className="grid gap-4 pr-2">
          {tickets.map((ticket) => (
          <div key={ticket.id} className="card p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <Ticket className="h-5 w-5 text-primary-600" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text">
                    {ticket.titre}
                  </h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                    #{ticket.numero_ticket}
                  </span>
                  {getStatusBadge(ticket.status)}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div className="flex items-center text-sm text-gray-600 dark:text-dark-muted">
                    <Building className="h-4 w-4 mr-2" />
                    <span>Client: {formatClientDisplay({ nom_societe: ticket.client_nom, prenom: ticket.client_prenom, nom: ticket.client_nom_personne })}</span>
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
                
                <SearchableSelect
                  options={Array.isArray(formClients) ? formClients.map(client => ({
                    value: client.id,
                    label: client.nom_societe,
                    subtitle: client.prenom || client.nom ? `${client.prenom || ''} ${client.nom || ''}`.trim() : ''
                  })) : []}
                  value={formData.client_id}
                  onSearch={handleFormClientSearch}
                  loading={loadingFormClients}
                  placeholder="Sélectionner un client"
                  onChange={(value) => setFormData({ ...formData, client_id: value })}
                  placeholder="Sélectionner un client"
                  displayKey="label"
                  valueKey="value"
                  searchKeys={["label", "subtitle"]}
                  emptyMessage="Aucun client trouvé"
                />
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
                  <div className="flex items-center space-x-3 mb-4">
                    <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                      Ticket #{viewingTicket.numero_ticket}
                    </span>
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
                      {formatClientDisplay({ nom_societe: viewingTicket.client_nom, prenom: viewingTicket.client_prenom, nom: viewingTicket.client_nom_personne })}
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

                {/* Section fichiers joints */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text">
                      Fichiers joints
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="file"
                        id="fileUpload"
                        className="hidden"
                        accept=".jpg,.jpeg,.png,.gif,.pdf,.wav,.txt,.doc,.docx"
                        onChange={handleFileUpload}
                        disabled={uploadingFile}
                      />
                      <label
                        htmlFor="fileUpload"
                        className={`text-sm px-3 py-1 rounded border transition-colors cursor-pointer ${
                          uploadingFile
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-primary-500 text-white hover:bg-primary-600 border-primary-500'
                        }`}
                      >
                        {uploadingFile ? 'Upload...' : '+ Ajouter un fichier'}
                      </label>
                    </div>
                  </div>
                  
                  {loadingFiles ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                    </div>
                  ) : ticketFiles.length > 0 ? (
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {ticketFiles.map((file) => (
                        <div key={file.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-dark-card rounded border">
                          <div className="flex items-center space-x-3 flex-1">
                            <span className="text-lg">{getFileIcon(file.type_fichier)}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-dark-text truncate">
                                {file.nom_fichier}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-dark-muted">
                                {formatFileSize(file.taille_fichier)} • {file.uploaded_by_name} • {format(new Date(file.uploaded_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => downloadFile(file)}
                              className="p-1 text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
                              title="Télécharger"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </button>
                            {(isAgent || file.uploaded_by_type === 'demandeur') && (
                              <button
                                onClick={() => handleFileDelete(file.id)}
                                className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                title="Supprimer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-dark-muted italic py-2">
                      Aucun fichier joint pour le moment
                    </p>
                  )}
                  
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    Formats acceptés: Images (JPG, PNG, GIF), PDF, Audio (WAV), Documents (TXT, DOC) • Taille max: 10MB
                  </p>
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
                                      {format(new Date(echange.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
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
                          className="text-sm text-gray-500 hover:text-gray-700 dark:text-dark-muted dark:hover:text-dark-text flex items-center space-x-1 disabled:opacity-50"
                          disabled={sendingComment}
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
                        disabled={sendingComment}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey && !sendingComment) {
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
                          disabled={!newComment.trim() || sendingComment}
                        >
                          {sendingComment ? (
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