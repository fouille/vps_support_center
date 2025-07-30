import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const ProductionTacheModal = ({ tache, onClose, onRefresh }) => {
  const { api, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingCommentaires, setLoadingCommentaires] = useState(true);
  const [commentaires, setCommentaires] = useState([]);
  const [fichiers, setFichiers] = useState([]);
  const [nouveauCommentaire, setNouveauCommentaire] = useState('');
  const [editingTache, setEditingTache] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [message, setMessage] = useState({ type: '', content: '' }); // Pour les messages d'erreur/succès
  const fileInputRef = useRef(null);
  const commentsEndRef = useRef(null);

  const [tacheData, setTacheData] = useState({
    status: tache.status,
    descriptif: tache.descriptif || '',
    date_livraison: tache.date_livraison ? tache.date_livraison.split('T')[0] : '',
    commentaire_interne: tache.commentaire_interne || ''
  });

  useEffect(() => {
    fetchCommentaires();
    fetchFichiers();
  }, [tache]);

  useEffect(() => {
    scrollToBottom();
  }, [commentaires]);

  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchCommentaires = async () => {
    setLoadingCommentaires(true);
    try {
      const response = await api.get(`/api/production-tache-commentaires?production_tache_id=${tache.id}`);
      // S'assurer que la réponse est un tableau
      const commentairesData = response.data || response;
      setCommentaires(Array.isArray(commentairesData) ? commentairesData : []);
    } catch (error) {
      console.error('Erreur lors du chargement des commentaires:', error);
      setCommentaires([]);
    } finally {
      setLoadingCommentaires(false);
    }
  };

  const fetchFichiers = async () => {
    try {
      const response = await api.get(`/api/production-tache-fichiers?production_tache_id=${tache.id}`);
      // S'assurer que la réponse est un tableau
      const fichiersData = response.data || response;
      setFichiers(Array.isArray(fichiersData) ? fichiersData : []);
    } catch (error) {
      console.error('Erreur lors du chargement des fichiers:', error);
      setFichiers([]);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!nouveauCommentaire.trim()) return;

    setLoading(true);
    try {
      const response = await api.post('/api/production-tache-commentaires', {
        production_tache_id: tache.id,
        contenu: nouveauCommentaire.trim(),
        type_commentaire: 'commentaire'
      });
      
      // S'assurer que commentaires est un tableau et ajouter le nouveau commentaire
      const currentCommentaires = Array.isArray(commentaires) ? commentaires : [];
      const newComment = response.data || response;
      setCommentaires([...currentCommentaires, newComment]);
      setNouveauCommentaire('');
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Erreur lors de l\'ajout du commentaire:', error);
      setMessage({ type: 'error', content: 'Erreur lors de l\'ajout du commentaire' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTache = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', content: '' }); // Réinitialiser les messages
    try {
      const response = await api.put(`/api/production-taches/${tache.id}`, tacheData);
      
      // Mettre à jour l'objet tache local avec les nouvelles données
      const updatedTache = response.data || response;
      tache.status = updatedTache.status || tacheData.status;
      tache.descriptif = updatedTache.descriptif || tacheData.descriptif;
      tache.date_livraison = updatedTache.date_livraison || tacheData.date_livraison;
      tache.commentaire_interne = updatedTache.commentaire_interne || tacheData.commentaire_interne;
      
      setEditingTache(false);
      setMessage({ type: 'success', content: 'Tâche mise à jour avec succès' });
      if (onRefresh) onRefresh();
      
      // Masquer le message de succès après 3 secondes
      setTimeout(() => setMessage({ type: '', content: '' }), 3000);
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      setMessage({ type: 'error', content: 'Erreur lors de la mise à jour de la tâche' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Vérification de la taille (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setMessage({ type: 'error', content: 'Le fichier est trop volumineux (max 10MB)' });
      return;
    }

    setUploadingFile(true);
    try {
      // Convertir en base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Content = e.target.result.split(',')[1];
        
        try {
          const response = await api.post('/api/production-tache-fichiers', {
            production_tache_id: tache.id,
            nom_fichier: file.name,
            type_fichier: file.type,
            contenu_base64: base64Content
          });
          
          // S'assurer que fichiers est un tableau et ajouter le nouveau fichier
          const currentFichiers = Array.isArray(fichiers) ? fichiers : [];
          const newFile = response.data || response;
          setFichiers([...currentFichiers, newFile]);
          fetchCommentaires(); // Rafraîchir pour voir le commentaire auto
          setMessage({ type: 'success', content: 'Fichier uploadé avec succès' });
          setTimeout(() => setMessage({ type: '', content: '' }), 3000);
        } catch (error) {
          console.error('Erreur lors de l\'upload:', error);
          setMessage({ type: 'error', content: 'Erreur lors de l\'upload du fichier' });
        } finally {
          setUploadingFile(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Erreur lors de la lecture du fichier:', error);
      setMessage({ type: 'error', content: 'Erreur lors de la lecture du fichier' });
      setUploadingFile(false);
    }
  };

  const handleDeleteFile = async (fileId, fileName) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le fichier "${fileName}" ?`)) return;

    try {
      await api.delete(`/api/production-tache-fichiers/${fileId}`);
      setFichiers(fichiers.filter(f => f.id !== fileId));
      fetchCommentaires(); // Rafraîchir pour voir le commentaire auto
      setMessage({ type: 'success', content: 'Fichier supprimé avec succès' });
      setTimeout(() => setMessage({ type: '', content: '' }), 3000);
    } catch (error) {
      console.error('Erreur lors de la suppression du fichier:', error);
      setMessage({ type: 'error', content: 'Erreur lors de la suppression du fichier' });
    }
  };

  const downloadFile = (fichier) => {
    try {
      const link = document.createElement('a');
      link.href = `data:${fichier.type_fichier || 'application/octet-stream'};base64,${fichier.contenu_base64}`;
      link.download = fichier.nom_fichier;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Erreur lors du téléchargement du fichier:', error);
      setMessage({ type: 'error', content: 'Erreur lors du téléchargement du fichier' });
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

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Taille inconnue';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${Math.round(size * 100) / 100} ${units[unitIndex]}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* En-tête */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600 p-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text">
                📋 Tâche #{tache.ordre_tache} - {tache.nom_tache}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Production #{tache.production?.numero_production} - {tache.production?.titre}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getTacheStatusBadgeClass(tacheData.status)}`}>
                {getTacheStatusLabel(tacheData.status)}
              </span>
              <button
                onClick={() => setEditingTache(!editingTache)}
                className="bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              >
                {editingTache ? 'Annuler' : '✏️ Modifier'}
              </button>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                <span className="text-2xl">×</span>
              </button>
            </div>
          </div>
        </div>

        {/* Zone d'affichage des messages */}
        {message.content && (
          <div className={`px-4 py-3 border-l-4 ${
            message.type === 'success' 
              ? 'bg-green-50 dark:bg-green-900/20 border-green-400 text-green-700 dark:text-green-300' 
              : 'bg-red-50 dark:bg-red-900/20 border-red-400 text-red-700 dark:text-red-300'
          }`}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {message.type === 'success' ? (
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{message.content}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-hidden flex">
          {/* Panneau principal */}
          <div className="flex-1 flex flex-col">
            {/* Informations de la tâche */}
            {editingTache ? (
              <form onSubmit={handleUpdateTache} className="p-4 border-b bg-gray-50 dark:bg-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Statut</label>
                    <select
                      value={tacheData.status}
                      onChange={(e) => setTacheData({...tacheData, status: e.target.value})}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-600 text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="a_faire">À faire</option>
                      <option value="en_cours">En cours</option>
                      <option value="termine">Terminé</option>
                      <option value="bloque">Bloqué</option>
                      <option value="hors_scope">Hors scope</option>
                      <option value="attente_installation">Attente installation</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date de livraison</label>
                    <input
                      type="date"
                      value={tacheData.date_livraison}
                      onChange={(e) => setTacheData({...tacheData, date_livraison: e.target.value})}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-600 text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
                
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descriptif</label>
                  <textarea
                    value={tacheData.descriptif}
                    onChange={(e) => setTacheData({...tacheData, descriptif: e.target.value})}
                    rows={3}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-600 text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Décrivez les spécificités de cette tâche..."
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Commentaire interne</label>
                  <textarea
                    value={tacheData.commentaire_interne}
                    onChange={(e) => setTacheData({...tacheData, commentaire_interne: e.target.value})}
                    rows={2}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-600 text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Notes internes sur cette tâche..."
                  />
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Sauvegarde...' : 'Sauvegarder'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingTache(false)}
                    className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-4 border-b bg-gray-50 dark:bg-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-300">Descriptif:</span>
                    <p className="text-gray-900 dark:text-dark-text mt-1">{tache.descriptif || 'Aucun descriptif'}</p>
                  </div>
                  {tache.date_livraison && (
                    <div>
                      <span className="font-medium text-gray-600 dark:text-gray-300">Date de livraison:</span>
                      <p className="text-gray-900 dark:text-dark-text mt-1">{new Date(tache.date_livraison).toLocaleDateString('fr-FR')}</p>
                    </div>
                  )}
                </div>
                {tache.commentaire_interne && (
                  <div className="mt-3 pt-3 border-t">
                    <span className="font-medium text-gray-600 dark:text-gray-300 text-sm">Commentaire interne:</span>
                    <p className="text-gray-700 dark:text-gray-400 text-sm mt-1">{tache.commentaire_interne}</p>
                  </div>
                )}
              </div>
            )}

            {/* Zone de commentaires */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="px-4 py-2 border-b bg-gray-100 dark:bg-gray-600">
                <h3 className="font-medium text-gray-900 dark:text-dark-text">💬 Commentaires ({commentaires.length})</h3>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loadingCommentaires ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">Chargement des commentaires...</p>
                  </div>
                ) : commentaires.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">💭</div>
                    <p className="text-gray-600 dark:text-gray-400">Aucun commentaire pour l'instant</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">Soyez le premier à commenter cette tâche</p>
                  </div>
                ) : (
                  (Array.isArray(commentaires) ? commentaires : []).map(commentaire => (
                    <div key={commentaire.id} className="flex space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                        commentaire.auteur_type_real === 'agent' ? 'bg-blue-500' : 'bg-green-500'
                      }`}>
                        {commentaire.auteur_nom ? commentaire.auteur_nom.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="flex-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium text-sm text-gray-900 dark:text-dark-text">
                            {commentaire.auteur_nom} {commentaire.auteur_prenom}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(commentaire.date_creation).toLocaleDateString('fr-FR', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {commentaire.contenu}
                        </div>
                        {commentaire.type_commentaire !== 'commentaire' && (
                          <div className="mt-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300">
                              {commentaire.type_commentaire === 'status_change' && '📊 Changement de statut'}
                              {commentaire.type_commentaire === 'file_upload' && '📎 Fichier ajouté'}
                              {commentaire.type_commentaire === 'file_delete' && '🗑️ Fichier supprimé'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                <div ref={commentsEndRef} />
              </div>

              {/* Zone d'ajout de commentaire */}
              <form onSubmit={handleAddComment} className="p-4 border-t bg-gray-50 dark:bg-gray-700">
                <div className="flex space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                    user?.type_utilisateur === 'agent' ? 'bg-blue-500' : 'bg-green-500'
                  }`}>
                    {user?.nom ? user.nom.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="flex-1">
                    <textarea
                      value={nouveauCommentaire}
                      onChange={(e) => setNouveauCommentaire(e.target.value)}
                      placeholder="Ajouter un commentaire..."
                      rows={2}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-600 text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                    />
                    <div className="flex justify-between items-center mt-2">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {nouveauCommentaire.length}/1000 caractères
                      </div>
                      <button
                        type="submit"
                        disabled={!nouveauCommentaire.trim() || loading}
                        className="bg-primary-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
                      >
                        {loading ? '⏳' : '📤'} Envoyer
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Panneau des fichiers */}
          <div className="w-80 border-l bg-gray-50 dark:bg-gray-700 flex flex-col">
            <div className="p-4 border-b bg-white dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900 dark:text-dark-text">📎 Fichiers ({fichiers.length})</h3>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                  className="bg-primary-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {uploadingFile ? '⏳' : '➕'} Ajouter
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                accept="*/*"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {fichiers.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">📎</div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Aucun fichier</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">Ajoutez des fichiers à cette tâche</p>
                </div>
              ) : (
                (Array.isArray(fichiers) ? fichiers : []).map(fichier => (
                  <div key={fichier.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm text-gray-900 dark:text-dark-text truncate" title={fichier.nom_fichier}>
                          {fichier.nom_fichier}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {formatFileSize(fichier.taille_fichier)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(fichier.date_upload).toLocaleDateString('fr-FR')}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          Par: {fichier.uploader_nom} {fichier.uploader_prenom}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1 ml-2">
                        <button
                          onClick={() => downloadFile(fichier)}
                          className="bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded text-xs hover:bg-blue-200 dark:hover:bg-blue-900/40 transition-colors"
                        >
                          ⬇️
                        </button>
                        <button
                          onClick={() => handleDeleteFile(fichier.id, fichier.nom_fichier)}
                          className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-2 py-1 rounded text-xs hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductionTacheModal;