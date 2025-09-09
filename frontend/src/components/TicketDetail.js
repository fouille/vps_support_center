import React, { useState, useEffect } from 'react';
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
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const TicketDetail = () => {
  const { ticket_uuid } = useParams();
  const navigate = useNavigate();
  const { isAgent, api, user } = useAuth();
  
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

  useEffect(() => {
    fetchTicketDetails();
  }, [ticket_uuid]);

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
      
      // Charger les échanges et les fichiers en parallèle
      await Promise.all([
        fetchExchanges(ticketData.id),
        fetchFiles(ticketData.id)
      ]);
      
      // Si c'est un agent qui ouvre le ticket et que le statut est "nouveau", le passer en "en_cours"
      if (isAgent && ticketData.status === 'nouveau') {
        await handleStatusChange(ticketData.id, 'en_cours');
      }
      
    } catch (error) {
      console.error('Erreur lors du chargement du ticket:', error);
      if (error.response?.status === 404) {
        setError('Ticket non trouvé');
      } else {
        setError('Erreur lors du chargement du ticket');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchExchanges = async (ticketId) => {
    try {
      setLoadingExchanges(true);
      const response = await api.get(`/api/ticket-echanges?ticketId=${ticketId}`);
      setExchanges(response.data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des échanges:', error);
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
      console.error('Erreur lors du chargement des fichiers:', error);
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      await api.put(`/api/tickets/${ticketId}`, {
        ...ticket,
        status: newStatus
      });
      
      setTicket(prev => ({ ...prev, status: newStatus }));
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
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
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce fichier ?')) return;

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
                {ticket.titre}
              </h1>
              <div className="flex items-center space-x-3 mt-1">
                <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                  #{ticket.numero_ticket}
                </span>
                {getStatusBadge(ticket.status)}
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
                {ticket.client_nom || 'Non spécifié'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center">
            <User className="h-5 w-5 text-gray-400 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Demandeur</p>
              <p className="text-gray-900 dark:text-dark-text">
                {ticket.demandeur_prenom} {ticket.demandeur_nom}
              </p>
            </div>
          </div>

          <div className="flex items-center">
            <Calendar className="h-5 w-5 text-gray-400 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Créé le</p>
              <p className="text-gray-900 dark:text-dark-text">
                {format(new Date(ticket.date_creation), 'dd MMM yyyy à HH:mm', { locale: fr })}
              </p>
            </div>
          </div>
        </div>

        {ticket.date_fin_prevue && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-orange-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Échéance</p>
                <p className="text-orange-600 dark:text-orange-400">
                  {format(new Date(ticket.date_fin_prevue), 'dd MMM yyyy', { locale: fr })}
                </p>
              </div>
            </div>
          </div>
        )}

        {ticket.requete_initiale && (
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
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {loadingExchanges ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                  <span className="ml-3 text-gray-600 dark:text-gray-400">Chargement...</span>
                </div>
              ) : exchanges.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  Aucun échange pour le moment
                </p>
              ) : (
                exchanges.map((exchange, index) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {exchange.auteur_prenom?.[0] || '?'}{exchange.auteur_nom?.[0] || ''}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-dark-text">
                            {exchange.auteur_prenom} {exchange.auteur_nom}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {exchange.auteur_type === 'agent' ? 'Agent' : 'Demandeur'}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {format(new Date(exchange.date_creation), 'dd MMM à HH:mm', { locale: fr })}
                      </p>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {exchange.message}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Formulaire d'ajout de commentaire */}
            <form onSubmit={handleAddComment} className="mt-6">
              <div className="flex space-x-3">
                <div className="flex-1">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Ajouter un commentaire..."
                    className="input resize-none"
                    rows={3}
                    disabled={sendingComment}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!newComment.trim() || sendingComment}
                  className="btn-primary flex items-center self-end"
                >
                  {sendingComment ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Envoyer
                </button>
              </div>
            </form>
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
                  disabled={uploadingFile}
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
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  Aucun fichier
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