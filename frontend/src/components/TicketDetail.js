import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, 
  Ticket, 
  User, 
  Building, 
  Calendar, 
  Clock, 
  Send,
  Paperclip,
  Download,
  Trash2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const TicketDetail = () => {
  const { ticket_uuid } = useParams();
  const navigate = useNavigate();
  const { isAgent, api, user } = useAuth();

  // Émojis populaires pour les commentaires
  const popularEmojis = [
    '😊', '👍', '👎', '❤️', '😢', '😂', '🔥', '💡', 
    '✅', '❌', '⚠️', '🤔', '👌', '🙏', '💪', '🎉'
  ];

  const insertEmoji = (emoji) => {
    setNewComment(newComment + emoji);
    setShowEmojiPicker(false);
  };

  // Fonction utilitaire pour formater les dates de façon sécurisée
  const formatDate = (dateString, formatString) => {
    if (!dateString) return null; // Retourner null au lieu d'un message
    
    try {
      // Essayer de parser la date
      let date;
      if (typeof dateString === 'string') {
        // Essayer différents formats
        if (dateString.includes('T')) {
          date = parseISO(dateString);
        } else {
          date = new Date(dateString);
        }
      } else {
        date = new Date(dateString);
      }
      
      // Vérifier si la date est valide
      if (!isValid(date)) {
        console.warn('Date invalide:', dateString);
        return null;
      }
      
      return format(date, formatString, { locale: fr });
    } catch (error) {
      console.error('Erreur de formatage de date:', error, dateString);
      return null;
    }
  };
  
  const [ticket, setTicket] = useState(null);
  const [exchanges, setExchanges] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingExchanges, setLoadingExchanges] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [error, setError] = useState('');
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // Ref pour l'auto-scroll
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (ticket_uuid) {
      console.log('TicketDetail: Loading ticket with UUID:', ticket_uuid);
      fetchTicketDetails();
    }
    
    // Fermer le picker d'emojis si ouvert
    return () => {
      setShowEmojiPicker(false);
    };
  }, [ticket_uuid]);

  // Scroll automatique vers le bas quand de nouveaux échanges arrivent
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [exchanges]);

  const fetchTicketDetails = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Récupérer les détails du ticket
      const ticketResponse = await api.get(`/api/tickets/${ticket_uuid}`);
      const ticketData = ticketResponse.data;
      
      if (!ticketData) {
        setError('Ticket non trouvé');
        return;
      }
      
      setTicket(ticketData);
      
      // Charger seulement les fichiers en parallèle avec le ticket
      await fetchFiles(ticketData.id);
      
      // Si c'est un agent qui ouvre le ticket et que le statut est "nouveau", le passer en "en_cours"
      if (isAgent && ticketData.status === 'nouveau') {
        await handleStatusChange(ticketData.id, 'en_cours', ticketData);
      }
      
    } catch (error) {
      if (error.response?.status === 404) {
        setError('Ticket non trouvé');
      } else {
        setError('Erreur lors du chargement du ticket');
      }
    } finally {
      setLoading(false);
      
      // Charger les échanges après que la page soit affichée
      if (ticket_uuid) {
        setTimeout(() => {
          fetchExchangesAfterPageLoad();
        }, 100);
      }
    }
  };

  const fetchExchangesAfterPageLoad = async () => {
    if (!ticket) return;
    
    try {
      setLoadingExchanges(true);
      const response = await api.get(`/api/ticket-echanges?ticketId=${ticket.id}`);
      setExchanges(response.data || []);
      
      // Auto-scroll vers le bas après chargement des échanges
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 200);
    } catch (error) {
      // Pas de log console ici
    } finally {
      setLoadingExchanges(false);
    }
  };

  const fetchExchanges = async (ticketId) => {
    try {
      setLoadingExchanges(true);
      const response = await api.get(`/api/ticket-echanges?ticketId=${ticketId}`);
      setExchanges(response.data || []);
    } catch (error) {
      // Pas de log console ici
    } finally {
      setLoadingExchanges(false);
    }
  };

  const fetchFiles = async (ticketId) => {
    try {
      setLoadingFiles(true);
      const response = await api.get(`/api/ticket-fichiers?ticketId=${ticketId}`);
      setFiles(response.data || []);
    } catch (error) {
      // Pas de log console ici
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleStatusChange = async (ticketId, newStatus, ticketData = null) => {
    try {
      // Utiliser ticketData si fourni, sinon ticket
      const currentTicket = ticketData || ticket;
      
      await api.put(`/api/tickets/${ticketId}`, {
        ...currentTicket,
        status: newStatus
      });
      
      setTicket(prev => ({ ...prev, status: newStatus }));
    } catch (error) {
      setError('Erreur lors de la mise à jour du statut');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || sendingComment || !ticket) return;

    setSendingComment(true);
    try {
      const response = await api.post(`/api/ticket-echanges?ticketId=${ticket.id}`, {
        message: newComment
      });

      setExchanges(prev => [...prev, response.data]);
      setNewComment('');

      // Auto-scroll vers le bas après ajout d'un commentaire
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

      // Si c'est un agent qui répond, mettre le ticket en "répondu"
      if (isAgent && ticket.status !== 'repondu') {
        await handleStatusChange(ticket.id, 'repondu');
      }
    } catch (error) {
      setError('Erreur lors de l\'ajout du commentaire');
    } finally {
      setSendingComment(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !ticket) return;

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
      setError('Type de fichier non autorisé. Formats acceptés: Images (JPG, PNG, GIF), PDF, Audio (WAV), Documents (TXT, DOC)');
      return;
    }

    setUploadingFile(true);
    try {
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

      await api.post(`/api/ticket-fichiers?ticketId=${ticket.id}`, fileData);
      
      // Ajouter un commentaire automatique
      try {
        const commentResponse = await api.post(`/api/ticket-echanges?ticketId=${ticket.id}`, {
          message: `A ajouté une pièce jointe ${file.name}`
        });
        
        setExchanges(prev => [...prev, commentResponse.data]);
        
        // Si c'est un agent qui ajoute le fichier, mettre le ticket en "répondu"
        if (isAgent && ticket.status !== 'repondu') {
          await handleStatusChange(ticket.id, 'repondu');
        }
      } catch (commentError) {
        console.error('Erreur lors de l\'ajout du commentaire automatique:', commentError);
      }
      
      fetchFiles(ticket.id);
      event.target.value = '';
    } catch (error) {
      setError('Erreur lors de l\'upload du fichier');
    } finally {
      setUploadingFile(false);
    }
  };

  const downloadFile = async (file) => {
    if (!ticket) return;
    
    try {
      const response = await api.get(`/api/ticket-fichiers?ticketId=${ticket.id}&fileId=${file.id}`);
      const fileData = response.data;
      
      const byteCharacters = atob(fileData.contenu_base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: fileData.type_fichier });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileData.nom_fichier;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      setError('Erreur lors du téléchargement du fichier');
    }
  };

  const handleFileDelete = async (fileId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce fichier ?') || !ticket) return;

    try {
      await api.delete(`/api/ticket-fichiers?ticketId=${ticket.id}&fileId=${fileId}`);
      fetchFiles(ticket.id);
    } catch (error) {
      setError('Erreur lors de la suppression du fichier');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error && !ticket) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text mb-2">
          {error}
        </h2>
        <button
          onClick={() => navigate('/tickets')}
          className="btn-secondary flex items-center"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour aux tickets
        </button>
      </div>
    );
  }

  if (!ticket) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/tickets')}
            className="btn-secondary flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </button>
          <div className="flex items-center space-x-3">
            <Ticket className="h-6 w-6 text-primary-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">
                {ticket?.titre || 'Titre non disponible'}
              </h1>
              <div className="flex items-center space-x-3 mt-1">
                <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                  #{ticket?.numero_ticket || 'N/A'}
                </span>
                {ticket?.status && !isAgent && getStatusBadge(ticket.status)}
                {isAgent && ticket?.status && (
                  <select
                    value={ticket.status}
                    onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                    className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-primary-500"
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
          </div>
        </div>
        
        <button
          onClick={fetchTicketDetails}
          className="btn-secondary flex items-center"
          title="Actualiser"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </button>
      </div>

      {/* Informations du ticket */}
      <div className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center">
            <Building className="h-5 w-5 text-gray-400 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Client</p>
              <p className="text-gray-900 dark:text-dark-text">
                {ticket?.client_nom || 'Non spécifié'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center">
            <User className="h-5 w-5 text-gray-400 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Demandeur</p>
              <p className="text-gray-900 dark:text-dark-text">
                {ticket?.demandeur_prenom || ''} {ticket?.demandeur_nom || 'Non spécifié'}
              </p>
            </div>
          </div>

          <div className="flex items-center">
            <Calendar className="h-5 w-5 text-gray-400 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Créé le</p>
              <p className="text-gray-900 dark:text-dark-text">
                {formatDate(ticket?.date_creation, 'dd/MM/yyyy HH:mm') || 'Date non disponible'}
              </p>
            </div>
          </div>
        </div>

        {ticket?.date_fin_prevue && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-orange-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Échéance</p>
                <p className="text-orange-600 dark:text-orange-400">
                  {formatDate(ticket.date_fin_prevue, 'dd MMM yyyy') || 'Date non définie'}
                </p>
              </div>
            </div>
          </div>
        )}

        {ticket?.requete_initiale && (
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text mb-3">
              Demande initiale
            </h3>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {ticket.requete_initiale}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Section des échanges et fichiers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Échanges */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text mb-4">
              Échanges ({exchanges.length})
            </h3>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {loadingExchanges ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                  <span className="ml-3 text-gray-600 dark:text-gray-400">Chargement...</span>
                </div>
              ) : exchanges.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400">
                    Aucune conversation pour ce ticket
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-600 mt-1">
                    Commencez la discussion en envoyant le premier message
                  </p>
                </div>
              ) : (
                exchanges.map((exchange, index) => {
                  const isMyMessage = user && (
                    (isAgent && exchange.auteur_type === 'agent') ||
                    (!isAgent && exchange.auteur_type === 'demandeur')
                  );
                  
                  const isAgentAuthor = exchange.auteur_type === 'agent';
                  const formattedDate = formatDate(exchange?.created_at, 'dd/MM/yyyy HH:mm');
                  
                  return (
                    <div 
                      key={exchange.id || index} 
                      className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'} ${
                        index === exchanges.length - 1 ? 'animate-fade-in' : ''
                      }`}
                    >
                      <div className={`max-w-xs lg:max-w-md ${isMyMessage ? 'order-2' : 'order-1'}`}>
                        {/* Message bubble */}
                        <div className={`rounded-2xl px-4 py-3 shadow-sm ${
                          isMyMessage 
                            ? 'bg-primary-500 text-white rounded-br-md' 
                            : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-md border border-gray-200 dark:border-gray-600'
                        }`}>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                            {exchange?.message || 'Message non disponible'}
                          </p>
                        </div>
                        
                        {/* Metadata */}
                        <div className={`flex items-center mt-1 text-xs text-gray-500 dark:text-gray-400 ${
                          isMyMessage ? 'justify-end' : 'justify-start'
                        }`}>
                          <div className={`flex items-center space-x-2 ${isMyMessage ? 'flex-row-reverse space-x-reverse' : ''}`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white ${
                              isAgentAuthor ? 'bg-primary-600' : 'bg-green-500'
                            }`}>
                              {((exchange?.auteur_prenom || '') + ' ' + (exchange?.auteur_nom || '')).trim().split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '??'}
                            </div>
                            <span className="font-medium">
                              {isMyMessage ? 'Moi' : `${exchange?.auteur_prenom || 'Utilisateur'} ${exchange?.auteur_nom || ''}`.trim()}
                            </span>
                            <span className="text-gray-400 dark:text-gray-500">
                              {formattedDate || 'Date inconnue'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              {/* Élément pour l'auto-scroll */}
              <div ref={messagesEndRef} />
            </div>

            {/* Formulaire d'ajout de commentaire */}
            <div className="mt-6">
              {/* Barre d'émojis */}
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 flex items-center space-x-1 disabled:opacity-50"
                    disabled={sendingComment || !ticket}
                  >
                    <span className="text-lg">😊</span>
                    <span>Émojis</span>
                  </button>
                </div>
                
                {/* Sélecteur d'émojis */}
                {showEmojiPicker && (
                  <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 shadow-xl z-10 w-full max-w-xs">
                    <div className="grid grid-cols-8 gap-1">
                      {popularEmojis.map((emoji, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => insertEmoji(emoji)}
                          className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-600 rounded text-lg"
                          title={`Ajouter ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker(false)}
                        className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 w-full text-center py-1"
                      >
                        Fermer
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleAddComment}>
                <div className="space-y-3">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Tapez votre message..."
                    className="input h-20 resize-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                    maxLength={1000}
                    disabled={sendingComment || !ticket}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && !sendingComment) {
                        e.preventDefault();
                        handleAddComment(e);
                      }
                    }}
                  />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      💡 Appuyez sur Entrée pour envoyer • Shift+Entrée pour saut de ligne
                    </span>
                    <div className="flex space-x-2">
                      {showEmojiPicker && (
                        <button
                          type="button"
                          onClick={() => setShowEmojiPicker(false)}
                          className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 px-2 py-1"
                        >
                          Fermer
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={!newComment.trim() || sendingComment || !ticket}
                        className="btn-primary flex items-center"
                      >
                        {sendingComment ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        Envoyer
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Fichiers */}
        <div>
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text">
                Fichiers ({files.length})
              </h3>
              <div className="relative">
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                  disabled={uploadingFile || !ticket}
                />
                <label
                  htmlFor="file-upload"
                  className={`btn-secondary flex items-center cursor-pointer ${uploadingFile ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {uploadingFile ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mr-2"></div>
                  ) : (
                    <Paperclip className="h-4 w-4 mr-2" />
                  )}
                  Ajouter
                </label>
              </div>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {loadingFiles ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                  <span className="ml-3 text-gray-600 dark:text-gray-400">Chargement...</span>
                </div>
              ) : files.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic py-2">
                  Aucun fichier joint pour le moment
                </p>
              ) : (
                files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <span className="text-lg">{getFileIcon(file.type_fichier)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-dark-text truncate">
                          {file.nom_fichier}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatFileSize(file.taille_fichier)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => downloadFile(file)}
                        className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        title="Télécharger"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      {isAgent && (
                        <button
                          onClick={() => handleFileDelete(file.id)}
                          className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
              
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                Formats acceptés: Images (JPG, PNG, GIF), PDF, Audio (WAV), Documents (TXT, DOC) • Taille max: 10MB
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Erreurs */}
      {error && (
        <div className="flex items-center p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-3" />
          <span className="text-red-700 dark:text-red-300">{error}</span>
        </div>
      )}
    </div>
  );
};

export default TicketDetail;