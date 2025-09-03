import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit, Trash2, UserCheck, AlertCircle, Check, Mail, Phone, Building, Upload, Search } from 'lucide-react';
import SearchableSelect from './SearchableSelect';

const DemandeursPage = () => {
  const { api, user } = useAuth();
  const [activeTab, setActiveTab] = useState('demandeurs'); // 'demandeurs' ou 'societes'
  const [demandeurs, setDemandeurs] = useState([]);
  const [societes, setSocietes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showSocieteModal, setShowSocieteModal] = useState(false);
  const [showMySocieteModal, setShowMySocieteModal] = useState(false); // Nouveau modal pour "Ma Société"
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [editingDemandeur, setEditingDemandeur] = useState(null);
  const [editingSociete, setEditingSociete] = useState(null);
  const [deletingDemandeur, setDeletingDemandeur] = useState(null);
  const [transferData, setTransferData] = useState(null);
  const [selectedTransferTarget, setSelectedTransferTarget] = useState('');
  const [siretLoading, setSiretLoading] = useState(false);
  const [siretError, setSiretError] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [demandeurFormLoading, setDemandeurFormLoading] = useState(false);
  const [societeFormLoading, setSocieteFormLoading] = useState(false);
  const [mySocieteFormLoading, setMySocieteFormLoading] = useState(false);

  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    societe: '',
    societe_id: '',
    telephone: '',
    email: '',
    password: ''
  });

  const [societeFormData, setSocieteFormData] = useState({
    nom_societe: '',
    siret: '',
    adresse: '',
    adresse_complement: '',
    code_postal: '',
    ville: '',
    numero_tel: '',
    email: '',
    logo_base64: '',
    domaine: '',
    favicon_base64: '',
    nom_application: ''
  });

  // Données pour "Ma Société" (champs limités pour les demandeurs)
  const [mySocieteFormData, setMySocieteFormData] = useState({
    email: '',
    logo_base64: '',
    domaine: '',
    favicon_base64: '',
    nom_application: ''
  });

  const isAgent = user?.type_utilisateur === 'agent';

  useEffect(() => {
    fetchDemandeurs();
    if (isAgent) {
      fetchSocietes();
    }
  }, []);

  const fetchDemandeurs = async () => {
    try {
      const response = await api.get('/api/demandeurs');
      setDemandeurs(response.data);
    } catch (error) {
      setError('Erreur lors du chargement des demandeurs');
    } finally {
      setLoading(false);
    }
  };

  const fetchSocietes = async () => {
    try {
      const response = await api.get('/api/demandeurs-societe');
      setSocietes(response.data.data || response.data);
    } catch (error) {
      setError('Erreur lors du chargement des sociétés');
    }
  };

  // Fonction pour gérer l'autocomplete SIRET via API INSEE
  const handleSiretLookup = async (siret) => {
    if (!siret || siret.length !== 14) return;
    
    setSiretLoading(true);
    setSiretError('');
    
    try {
      const response = await api.get(`/api/insee-api?siret=${siret}`);
      const data = response.data;
      
      if (data && data.siret) {
        // Utiliser la structure de réponse réelle de l'API INSEE
        setSocieteFormData(prev => ({
          ...prev,
          nom_societe: data.denomination || prev.nom_societe,
          adresse: data.adresse?.adresseComplete || prev.adresse,
          code_postal: data.adresse?.codePostal || prev.code_postal,
          ville: data.adresse?.commune || prev.ville
        }));
        
        // Clear any previous error
        setSiretError('');
      } else {
        setSiretError('Aucune information trouvée pour ce SIRET');
      }
    } catch (error) {
      console.error('Erreur SIRET lookup:', error);
      setSiretError('Erreur lors de la recherche SIRET. Vérifiez le numéro.');
    } finally {
      setSiretLoading(false);
    }
  };

  // Fonction pour gérer l'upload d'image
  const handleLogoUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      setError('Logo trop volumineux (limite: 2MB)');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Format d\'image non autorisé. Utilisez JPG, PNG, GIF ou WebP.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setSocieteFormData(prev => ({
        ...prev,
        logo_base64: e.target.result.split(',')[1]
      }));
    };
    reader.readAsDataURL(file);
  };

  // Fonction pour gérer l'upload du favicon (.ico uniquement)
  const handleFaviconUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const maxSize = 1 * 1024 * 1024; // 1MB
    if (file.size > maxSize) {
      setError('Favicon trop volumineux (limite: 1MB)');
      return;
    }

    // Vérifier que c'est bien un fichier .ico
    if (file.type !== 'image/x-icon' && file.type !== 'image/vnd.microsoft.icon' && !file.name.toLowerCase().endsWith('.ico')) {
      setError('Le favicon doit être un fichier .ico');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setSocieteFormData(prev => ({
        ...prev,
        favicon_base64: e.target.result
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setDemandeurFormLoading(true);
    setError('');
    
    try {
      let submitData = { ...formData };
      
      // Pour l'édition, ne pas inclure le mot de passe vide
      if (editingDemandeur) {
        delete submitData.password;
      }
      
      if (editingDemandeur) {
        await api.put(`/api/demandeurs/${editingDemandeur.id}`, submitData);
      } else {
        await api.post('/api/demandeurs', submitData);
      }
      fetchDemandeurs();
      handleCloseModal();
    } catch (error) {
      setError(error.response?.data?.detail || 'Erreur lors de la sauvegarde');
    } finally {
      setDemandeurFormLoading(false);
    }
  };

  const handleSocieteSubmit = async (e) => {
    e.preventDefault();
    setSocieteFormLoading(true);
    setError('');
    
    try {
      if (editingSociete) {
        await api.put(`/api/demandeurs-societe/${editingSociete.id}`, societeFormData);
      } else {
        await api.post('/api/demandeurs-societe', societeFormData);
      }
      fetchSocietes();
      handleCloseSocieteModal();
    } catch (error) {
      setError(error.response?.data?.detail || 'Erreur lors de la sauvegarde');
    } finally {
      setSocieteFormLoading(false);
    }
  };

  const handleDelete = async (demandeurId) => {
    try {
      // First attempt - check if transfer is needed
      const response = await api.delete(`/api/demandeurs/${demandeurId}`);
      
      // If deletion was successful without transfer
      if (response.data.transferred === false) {
        fetchDemandeurs();
        return;
      }
    } catch (error) {
      if (error.response?.status === 409) {
        // Transfer is required
        const transferInfo = error.response.data;
        setDeletingDemandeur(demandeurId);
        setTransferData(transferInfo);
        setSelectedTransferTarget('');
        setShowTransferModal(true);
      } else {
        setError(error.response?.data?.detail || 'Erreur lors de la suppression');
      }
    }
  };

  const handleTransferAndDelete = async () => {
    if (!selectedTransferTarget || !deletingDemandeur) return;

    setTransferLoading(true);
    try {
      await api.delete(`/api/demandeurs/${deletingDemandeur}`, {
        data: { transferTo: selectedTransferTarget }
      });
      
      setShowTransferModal(false);
      setDeletingDemandeur(null);
      setTransferData(null);
      setSelectedTransferTarget('');
      fetchDemandeurs();
    } catch (error) {
      setError(error.response?.data?.detail || 'Erreur lors du transfert et suppression');
    } finally {
      setTransferLoading(false);
    }
  };

  const handleForceDelete = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce demandeur sans transférer ses données ? Tous ses tickets et portabilités seront perdus définitivement.')) {
      return;
    }

    setTransferLoading(true);
    try {
      // This would require backend modification to force delete
      // For now, we don't allow force delete
      setError('La suppression sans transfert n\'est pas autorisée quand des données sont liées.');
    } catch (error) {
      setError(error.response?.data?.detail || 'Erreur lors de la suppression forcée');
    } finally {
      setTransferLoading(false);
    }
  };

  const handleSocieteDelete = async (societeId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette société ?')) {
      try {
        await api.delete(`/api/demandeurs-societe/${societeId}`);
        fetchSocietes();
      } catch (error) {
        setError(error.response?.data?.detail || 'Erreur lors de la suppression');
      }
    }
  };

  const handleEdit = (demandeur) => {
    setEditingDemandeur(demandeur);
    setFormData({
      nom: demandeur.nom,
      prenom: demandeur.prenom,
      societe: demandeur.societe,
      societe_id: demandeur.societe_id || '',
      telephone: demandeur.telephone || '',
      email: demandeur.email,
      password: ''
    });
    setShowModal(true);
  };

  const handleSocieteEdit = (societe) => {
    setEditingSociete(societe);
    setSocieteFormData({
      nom_societe: societe.nom_societe,
      siret: societe.siret || '',
      adresse: societe.adresse,
      adresse_complement: societe.adresse_complement || '',
      code_postal: societe.code_postal,
      ville: societe.ville,
      numero_tel: societe.numero_tel || '',
      email: societe.email,
      logo_base64: societe.logo_base64 || '',
      domaine: societe.domaine || '',
      favicon_base64: societe.favicon_base64 || '',
      nom_application: societe.nom_application || ''
    });
    setShowSocieteModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingDemandeur(null);
    setDemandeurFormLoading(false);
    
    // Si l'utilisateur est demandeur, pré-remplir sa société
    const initialFormData = {
      nom: '',
      prenom: '',
      societe: '',
      societe_id: '',
      telephone: '',
      email: '',
      password: ''
    };
    
    // Pour les demandeurs, utiliser leur propre société
    if (!isAgent && demandeurs.length > 0) {
      const userDemandeur = demandeurs.find(d => d.email === user.email);
      if (userDemandeur) {
        initialFormData.societe = userDemandeur.societe_nom || userDemandeur.societe;
        initialFormData.societe_id = userDemandeur.societe_id;
      }
    }
    
    setFormData(initialFormData);
    setError('');
  };

  const handleCloseSocieteModal = () => {
    setShowSocieteModal(false);
    setEditingSociete(null);
    setSocieteFormLoading(false);
    setSocieteFormData({
      nom_societe: '',
      siret: '',
      adresse: '',
      adresse_complement: '',
      code_postal: '',
      ville: '',
      numero_tel: '',
      email: '',
      logo_base64: '',
      domaine: '',
      favicon_base64: '',
      nom_application: ''
    });
    setSiretError('');
    setError('');
  };

  // Options pour le SearchableSelect des sociétés
  const societeOptions = societes.map(societe => ({
    value: societe.id,
    label: societe.nom_societe,
    subtitle: `${societe.ville} - ${societe.siret || 'Pas de SIRET'}`
  }));

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
          {isAgent ? 'Gestion des Demandeurs' : 'Mes Collaborateurs'}
        </h1>
        <div className="flex space-x-3">
          {isAgent && (
            <button
              onClick={() => setShowSocieteModal(true)}
              className="btn-secondary flex items-center"
            >
              <Building className="h-5 w-5 mr-2" />
              Nouvelle Société
            </button>
          )}
          <button
            onClick={() => {
              // Pré-remplir la société pour les demandeurs
              if (!isAgent && demandeurs.length > 0) {
                const userDemandeur = demandeurs.find(d => d.email === user.email);
                if (userDemandeur) {
                  setFormData({
                    nom: '',
                    prenom: '',
                    societe: userDemandeur.societe_nom || userDemandeur.societe,
                    societe_id: userDemandeur.societe_id || '',
                    telephone: '',
                    email: '',
                    password: ''
                  });
                }
              }
              setShowModal(true);
            }}
            className="btn-primary flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nouveau Demandeur
          </button>
        </div>
      </div>

      {/* Tabs pour agents uniquement */}
      {isAgent && (
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('demandeurs')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'demandeurs'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Demandeurs ({demandeurs.length})
              </button>
              <button
                onClick={() => setActiveTab('societes')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'societes'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Sociétés ({societes.length})
              </button>
            </nav>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-center p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-3" />
          <span className="text-red-700 dark:text-red-300">{error}</span>
        </div>
      )}

      {/* Tableau des demandeurs */}
      {(!isAgent || activeTab === 'demandeurs') && (
        <div className="card overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>Société</th>
                <th>Téléphone</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {demandeurs.map((demandeur) => (
                <tr key={demandeur.id}>
                  <td>
                    <div className="flex items-center">
                      <UserCheck className="h-5 w-5 text-primary-600 mr-2" />
                      <span className="font-medium">{demandeur.prenom} {demandeur.nom}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 text-gray-400 mr-2" />
                      {demandeur.email}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center">
                      <Building className="h-4 w-4 text-gray-400 mr-2" />
                      {demandeur.societe_nom || demandeur.societe}
                    </div>
                  </td>
                  <td>
                    {demandeur.telephone && (
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 text-gray-400 mr-2" />
                        {demandeur.telephone}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(demandeur)}
                        className="p-2 text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(demandeur.id)}
                        className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {demandeurs.length === 0 && (
            <div className="p-8 text-center text-gray-500 dark:text-dark-muted">
              {isAgent ? 'Aucun demandeur enregistré' : 'Aucun collaborateur dans votre société'}
            </div>
          )}
        </div>
      )}

      {/* Tableau des sociétés (agents uniquement) */}
      {isAgent && activeTab === 'societes' && (
        <div className="card overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <th>Logo</th>
                <th>Société</th>
                <th>SIRET</th>
                <th>Ville</th>
                <th>Email</th>
                <th>Téléphone</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {societes.map((societe) => (
                <tr key={societe.id}>
                  <td>
                    <div className="flex items-center">
                      {societe.logo_base64 ? (
                        <img 
                          src={`data:image/jpeg;base64,${societe.logo_base64}`}
                          alt="Logo"
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <Building className="h-5 w-5 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="font-medium">{societe.nom_societe}</div>
                    <div className="text-sm text-gray-500">{societe.adresse}</div>
                  </td>
                  <td>{societe.siret || '-'}</td>
                  <td>{societe.ville}</td>
                  <td>
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 text-gray-400 mr-2" />
                      {societe.email}
                    </div>
                  </td>
                  <td>
                    {societe.numero_tel && (
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 text-gray-400 mr-2" />
                        {societe.numero_tel}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleSocieteEdit(societe)}
                        className="p-2 text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleSocieteDelete(societe.id)}
                        className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {societes.length === 0 && (
            <div className="p-8 text-center text-gray-500 dark:text-dark-muted">
              Aucune société enregistrée
            </div>
          )}
        </div>
      )}

      {/* Modal Demandeur */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal-overlay">
          <div className="bg-white dark:bg-dark-surface rounded-lg p-6 w-full max-w-md modal-content">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-dark-text">
              {editingDemandeur ? 'Modifier le Demandeur' : 'Nouveau Demandeur'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                    Nom *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                    Prénom *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.prenom}
                    onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                    className="input"
                  />
                </div>
              </div>

              {/* Société - Selection ou saisie manuelle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                  Société *
                </label>
                {isAgent && societes.length > 0 ? (
                  <SearchableSelect
                    options={societeOptions}
                    value={formData.societe_id}
                    onChange={(value) => {
                      const selectedSociete = societes.find(s => s.id === value);
                      setFormData({ 
                        ...formData, 
                        societe_id: value,
                        societe: selectedSociete ? selectedSociete.nom_societe : ''
                      });
                    }}
                    placeholder="Sélectionner une société..."
                    className="w-full"
                  />
                ) : (
                  <input
                    type="text"
                    required
                    value={formData.societe}
                    onChange={(e) => setFormData({ ...formData, societe: e.target.value })}
                    className="input"
                    placeholder="Nom de la société"
                    readOnly={!isAgent}
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={formData.telephone}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input"
                />
              </div>

              {/* Mot de passe seulement lors de la création */}
              {!editingDemandeur && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                    Mot de passe *
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="input"
                    placeholder="Mot de passe"
                  />
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn-secondary"
                  disabled={demandeurFormLoading}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={demandeurFormLoading}
                >
                  {demandeurFormLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      {editingDemandeur ? 'Modification...' : 'Création...'}
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      {editingDemandeur ? 'Modifier' : 'Créer'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Société */}
      {showSocieteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal-overlay">
          <div className="bg-white dark:bg-dark-surface rounded-lg p-6 w-full max-w-2xl modal-content max-h-90vh overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-dark-text">
              {editingSociete ? 'Modifier la Société' : 'Nouvelle Société'}
            </h2>

            <form onSubmit={handleSocieteSubmit} className="space-y-4">
              {/* SIRET avec autocomplete */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                  SIRET
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={societeFormData.siret}
                    onChange={(e) => {
                      const siret = e.target.value.replace(/\D/g, '');
                      setSocieteFormData({ ...societeFormData, siret });
                      if (siret.length === 14) {
                        handleSiretLookup(siret);
                      }
                    }}
                    className="input pr-10"
                    placeholder="Ex: 12345678901234"
                    maxLength="14"
                  />
                  {siretLoading && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                    </div>
                  )}
                </div>
                {siretError && (
                  <p className="text-red-500 text-sm mt-1">{siretError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                  Nom de la société *
                </label>
                <input
                  type="text"
                  required
                  value={societeFormData.nom_societe}
                  onChange={(e) => setSocieteFormData({ ...societeFormData, nom_societe: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                  Adresse *
                </label>
                <input
                  type="text"
                  required
                  value={societeFormData.adresse}
                  onChange={(e) => setSocieteFormData({ ...societeFormData, adresse: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                  Complément d'adresse
                </label>
                <input
                  type="text"
                  value={societeFormData.adresse_complement}
                  onChange={(e) => setSocieteFormData({ ...societeFormData, adresse_complement: e.target.value })}
                  className="input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                    Code postal *
                  </label>
                  <input
                    type="text"
                    required
                    value={societeFormData.code_postal}
                    onChange={(e) => setSocieteFormData({ ...societeFormData, code_postal: e.target.value })}
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                    Ville *
                  </label>
                  <input
                    type="text"
                    required
                    value={societeFormData.ville}
                    onChange={(e) => setSocieteFormData({ ...societeFormData, ville: e.target.value })}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                  Numéro de téléphone
                </label>
                <input
                  type="tel"
                  value={societeFormData.numero_tel}
                  onChange={(e) => setSocieteFormData({ ...societeFormData, numero_tel: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={societeFormData.email}
                  onChange={(e) => setSocieteFormData({ ...societeFormData, email: e.target.value })}
                  className="input"
                />
              </div>

              {/* Upload de logo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                  Logo de la société
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    id="logo-upload"
                  />
                  <label
                    htmlFor="logo-upload"
                    className="flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choisir un logo
                  </label>
                  {societeFormData.logo_base64 && (
                    <div className="flex items-center space-x-2">
                      <img 
                        src={`data:image/jpeg;base64,${societeFormData.logo_base64}`}
                        alt="Logo"
                        className="h-8 w-8 rounded object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setSocieteFormData({ ...societeFormData, logo_base64: '' })}
                        className="text-red-500 hover:text-red-700"
                      >
                        Supprimer
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Formats acceptés: JPG, PNG, GIF, WebP • Taille max: 2MB
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                  Domaine
                </label>
                <input
                  type="text"
                  value={societeFormData.domaine}
                  onChange={(e) => setSocieteFormData({ ...societeFormData, domaine: e.target.value })}
                  className="input"
                  placeholder="exemple.com"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Domaine pour personnaliser la page de connexion (format: exemple.com, sans http/https)
                </p>
              </div>

              {/* Champ Favicon */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                  Favicon <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept=".ico"
                  onChange={handleFaviconUpload}
                  className="input"
                />
                <div className="mt-2">
                  {societeFormData.favicon_base64 && (
                    <div className="flex items-center space-x-2">
                      <img 
                        src={societeFormData.favicon_base64} 
                        alt="Favicon preview" 
                        className="w-4 h-4 object-contain"
                      />
                      <span className="text-sm text-green-600">Favicon chargé</span>
                      <button
                        type="button"
                        onClick={() => setSocieteFormData({ ...societeFormData, favicon_base64: '' })}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Supprimer
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Format requis: .ico • Taille max: 1MB • Utilisé comme favicon sur la page de connexion
                </p>
              </div>

              {/* Champ Nom d'application */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                  Nom de l'application
                </label>
                <input
                  type="text"
                  value={societeFormData.nom_application}
                  onChange={(e) => setSocieteFormData({ ...societeFormData, nom_application: e.target.value })}
                  className="input"
                  placeholder="Support & Production"
                  maxLength={100}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Nom personnalisé affiché dans l'application (laissez vide pour utiliser le nom par défaut)
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseSocieteModal}
                  className="btn-secondary"
                  disabled={societeFormLoading}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={siretLoading || societeFormLoading}
                >
                  {societeFormLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      {editingSociete ? 'Modification...' : 'Création...'}
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      {editingSociete ? 'Modifier' : 'Créer'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Transfert */}
      {showTransferModal && transferData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal-overlay">
          <div className="bg-white dark:bg-dark-surface rounded-lg p-6 w-full max-w-2xl modal-content">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-dark-text">
              Transfert de données requis
            </h2>

            <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Attention
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                    <p>
                      Le demandeur <strong>{transferData.demandeur.prenom} {transferData.demandeur.nom}</strong> ({transferData.demandeur.email}) 
                      a des données liées qui doivent être transférées avant la suppression :
                    </p>
                    <ul className="mt-2 list-disc list-inside">
                      {transferData.linkedData.tickets > 0 && (
                        <li>{transferData.linkedData.tickets} ticket{transferData.linkedData.tickets > 1 ? 's' : ''}</li>
                      )}
                      {transferData.linkedData.portabilites > 0 && (
                        <li>{transferData.linkedData.portabilites} portabilité{transferData.linkedData.portabilites > 1 ? 's' : ''}</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {transferData.canDelete ? (
              <div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
                    Transférer vers le demandeur :
                  </label>
                  <select
                    value={selectedTransferTarget}
                    onChange={(e) => setSelectedTransferTarget(e.target.value)}
                    className="input w-full"
                    required
                  >
                    <option value="">Sélectionner un demandeur...</option>
                    {transferData.otherDemandeurs.map((demandeur) => (
                      <option key={demandeur.id} value={demandeur.id}>
                        {demandeur.prenom} {demandeur.nom} ({demandeur.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowTransferModal(false);
                      setDeletingDemandeur(null);
                      setTransferData(null);
                      setSelectedTransferTarget('');
                    }}
                    className="btn-secondary"
                    disabled={transferLoading}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleTransferAndDelete}
                    disabled={!selectedTransferTarget || transferLoading}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {transferLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                        Transfert en cours...
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        Transférer et Supprimer
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                        Suppression impossible
                      </h3>
                      <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                        <p>
                          Ce demandeur ne peut pas être supprimé car il n'y a aucun autre demandeur dans sa société 
                          pour récupérer ses tickets et portabilités.
                        </p>
                        <p className="mt-2">
                          <strong>Solutions :</strong>
                        </p>
                        <ul className="mt-1 list-disc list-inside">
                          <li>Créer un autre demandeur dans la même société</li>
                          <li>Ou transférer le demandeur vers une autre société</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setShowTransferModal(false);
                      setDeletingDemandeur(null);
                      setTransferData(null);
                    }}
                    className="btn-primary"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DemandeursPage;