import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { 
  ArrowLeft, 
  Paperclip,
  Download,
  Trash2,
  Send,
  RefreshCw
} from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const PortabiliteDetail = () => {
  const { portabilite_uuid } = useParams();
  const navigate = useNavigate();
  const { user, api } = useContext(AuthContext);
  const [portabilite, setPortabilite] = useState(null);
  const [commentaires, setCommentaires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentLoading, setCommentLoading] = useState(false);
  const [error, setError] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  
  const commentsEndRef = useRef(null);
  const backendUrl = '';

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
  const formatDate = (dateString, formatString = 'dd/MM/yyyy HH:mm') => {
    if (!dateString) return null;
    
    try {
      let date;
      if (typeof dateString === 'string') {
        if (dateString.includes('T')) {
          date = parseISO(dateString);
        } else {
          date = new Date(dateString);
        }
      } else {
        date = new Date(dateString);
      }
      
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
      const response = await api.get(`/api/portabilites/${portabilite_uuid}`);
      setPortabilite(response.data);
    } catch (err) {
      setError('Erreur lors du chargement de la portabilité');
      console.error('Erreur:', err);
    }
  };

  // Fonction pour récupérer les commentaires
  const fetchCommentaires = async () => {
    try {
      const response = await api.get(`/api/portabilite-echanges?portabiliteId=${portabilite_uuid}`);
      setCommentaires(response.data);
      
      // Auto-scroll vers le bas après chargement des commentaires
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error('Erreur lors du chargement des commentaires:', err);
    }
  };

  // Fonction pour récupérer les fichiers
  const fetchFiles = async () => {
    if (!portabilite_uuid) return;
    
    try {
      setLoadingFiles(true);
      const response = await api.get(`/api/portabilite-fichiers?portabiliteId=${portabilite_uuid}`);
      setFiles(response.data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des fichiers:', error);
    } finally {
      setLoadingFiles(false);
    }
  };

  // Fonction pour envoyer un commentaire
  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setCommentLoading(true);
    try {
      const response = await api.post(`/api/portabilite-echanges`, {
        portabiliteId: portabilite_uuid,
        message: newComment.trim()
      });

      setCommentaires([...commentaires, response.data]);
      setNewComment('');
      
      // Auto-scroll vers le bas après ajout d'un commentaire
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

  // Fonction pour changer le statut
  const handleStatusChange = async () => {
    setStatusLoading(true);
    try {
      await api.put(`/api/portabilites/${portabilite_uuid}`, {
        status: newStatus
      });
      
      setPortabilite({ ...portabilite, status: newStatus });
      setShowEditModal(false);
    } catch (err) {
      setError('Erreur lors de la mise à jour du statut');
      console.error('Erreur:', err);
    } finally {
      setStatusLoading(false);
    }
  };

  // Gestion de l'upload de fichiers
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !portabilite) return;

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
        const reader = new FileReader(); // eslint-disable-line no-undef
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const fileData = {
        portabiliteId: portabilite.id,
        nom_fichier: file.name,
        type_fichier: file.type,
        taille_fichier: file.size,
        contenu_base64: base64
      };

      await api.post(`/api/portabilite-fichiers`, fileData);
      
      // Ajouter un commentaire automatique
      try {
        const commentResponse = await api.post(`/api/portabilite-echanges`, {
          portabiliteId: portabilite_uuid,
          message: `A ajouté une pièce jointe ${file.name}`
        });
        
        setCommentaires(prev => [...prev, commentResponse.data]);
        
        // Auto-scroll vers le bas
        setTimeout(() => {
          commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } catch (commentError) {
        console.error('Erreur lors de l\'ajout du commentaire automatique:', commentError);
      }
      
      fetchFiles();
      event.target.value = '';
    } catch (error) {
      setError('Erreur lors de l\'upload du fichier');
    } finally {
      setUploadingFile(false);
    }
  };

  // Téléchargement de fichier
  const downloadFile = async (file) => {
    if (!portabilite) return;
    
    try {
      const response = await api.get(`/api/portabilite-fichiers?portabiliteId=${portabilite_uuid}&fileId=${file.id}`);
      const fileData = response.data;
      
      const byteCharacters = atob(fileData.contenu_base64); // eslint-disable-line no-undef
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: fileData.type_fichier }); // eslint-disable-line no-undef
      
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

  // Suppression de fichier
  const handleFileDelete = async (fileId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce fichier ?') || !portabilite) return;

    try {
      await api.delete(`/api/portabilite-fichiers?portabiliteId=${portabilite_uuid}&fileId=${fileId}`);
      fetchFiles();
    } catch (error) {
      setError('Erreur lors de la suppression du fichier');
    }
  };

  // Utilitaires pour les fichiers
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

  // Fonction pour supprimer la portabilité
  const handleDelete = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette portabilité ?')) return;

    try {
      await api.delete(`/api/portabilites/${portabilite_uuid}`);

      navigate('/portabilites');
    } catch (err) {
      setError('Erreur lors de la suppression');
      console.error('Erreur:', err);
    }
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
      await Promise.all([fetchPortabilite(), fetchCommentaires(), fetchFiles()]);
      setLoading(false);
    };
    
    loadData();
    
    // Fermer le picker d'emojis si ouvert
    return () => {
      setShowEmojiPicker(false);
    };
  }, [portabilite_uuid]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!portabilite) {
    return (
      <div className="p-6 bg-gray-50 dark:bg-dark-bg min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-dark-surface rounded-lg shadow-md p-6">
            <p className="text-red-600">Portabilité non trouvée</p>
            <button
              onClick={() => navigate('/portabilites')}
              className="mt-4 text-purple-600 hover:text-purple-800"
            >
              ← Retour aux portabilités
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 dark:bg-dark-bg min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* En-tête */}
        <div className="bg-white dark:bg-dark-surface rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Portabilité #{portabilite.numero_portabilite}
              </h1>
              <div className="flex items-center space-x-4">
                <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${statusColors[portabilite.status] || 'bg-gray-100 text-gray-800'}`}>
                  {statusLabels[portabilite.status] || portabilite.status}
                </span>
                {isToday(portabilite.date_portabilite_effective) && (
                  <span className="text-red-500 font-semibold">🚨 Portabilité effective aujourd'hui</span>
                )}
              </div>
            </div>
            <div className="flex space-x-2">
              {user.type_utilisateur === 'agent' && (
                <>
                  <button
                    onClick={() => navigate(`/portabilites/${portabilite_uuid}/edit`)}
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
              <button
                onClick={() => navigate('/portabilites')}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                ← Retour
              </button>
            </div>
          </div>
        </div>

        {/* Informations de la portabilité - sur toute la largeur */}
        <div className="bg-white dark:bg-dark-surface rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Informations générales
          </h2>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Informations générales
            </h2>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Client</p>
                <p className="text-gray-900 dark:text-white">{portabilite.nom_societe}</p>
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
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
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
        </div>

        {/* Section échanges et fichiers */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Section des échanges */}
          <div className="lg:col-span-2">
            <div className="card p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Échanges ({commentaires.length})
              </h3>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {commentLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                    <span className="ml-3 text-gray-600 dark:text-gray-400">Chargement...</span>
                  </div>
                ) : commentaires.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">
                      Aucune conversation pour cette portabilité
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-600 mt-1">
                      Commencez la discussion en envoyant le premier message
                    </p>
                  </div>
                ) : (
                  commentaires.map((commentaire, index) => {
                    const isMyMessage = user && (
                      (user.type_utilisateur === 'agent' && commentaire.auteur_type === 'agent') ||
                      (user.type_utilisateur === 'demandeur' && commentaire.auteur_type === 'demandeur')
                    );
                    
                    const isAgentAuthor = commentaire.auteur_type === 'agent';
                    const formattedDate = formatDate(commentaire?.created_at, 'dd/MM/yyyy HH:mm');
                    
                    return (
                      <div 
                        key={commentaire.id || index} 
                        className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'} ${
                          index === commentaires.length - 1 ? 'animate-fade-in' : ''
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
                              {commentaire?.message || 'Message non disponible'}
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
                                {((commentaire?.auteur_nom || '')).trim().split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '??'}
                              </div>
                              <span className="font-medium">
                                {isMyMessage ? 'Moi' : `${commentaire?.auteur_nom || 'Utilisateur'}`.trim()}
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
                <div ref={commentsEndRef} />
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
                      disabled={commentLoading || !portabilite}
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

                <form onSubmit={handleSubmitComment}>
                  <div className="space-y-3">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Tapez votre message..."
                      className="input h-20 resize-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      required
                      maxLength={1000}
                      disabled={commentLoading || !portabilite}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && !commentLoading) {
                          e.preventDefault();
                          handleSubmitComment(e);
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
                          disabled={!newComment.trim() || commentLoading || !portabilite}
                          className="btn-primary flex items-center"
                        >
                          {commentLoading ? (
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
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Fichiers ({files.length})
                </h3>
                <div className="relative">
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload-portabilite"
                    disabled={uploadingFile || !portabilite}
                  />
                  <label
                    htmlFor="file-upload-portabilite"
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
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
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
                        {user?.type_utilisateur === 'agent' && (
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
          <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default PortabiliteDetail;