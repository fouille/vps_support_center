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
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [editingDemandeur, setEditingDemandeur] = useState(null);
  const [editingSociete, setEditingSociete] = useState(null);
  const [deletingDemandeur, setDeletingDemandeur] = useState(null);
  const [transferData, setTransferData] = useState(null);
  const [selectedTransferTarget, setSelectedTransferTarget] = useState('');
  const [siretLoading, setSiretLoading] = useState(false);
  const [siretError, setSiretError] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);

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
    logo_base64: ''
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

  const handleSubmit = async (e) => {
    e.preventDefault();
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
    }
  };

  const handleSocieteSubmit = async (e) => {
    e.preventDefault();
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
      logo_base64: societe.logo_base64 || ''
    });
    setShowSocieteModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingDemandeur(null);
    
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
    setSocieteFormData({
      nom_societe: '',
      siret: '',
      adresse: '',
      adresse_complement: '',
      code_postal: '',
      ville: '',
      numero_tel: '',
      email: '',
      logo_base64: ''
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
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn-primary flex items-center"
                >
                  <Check className="h-4 w-4 mr-2" />
                  {editingDemandeur ? 'Modifier' : 'Créer'}
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

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseSocieteModal}
                  className="btn-secondary"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn-primary flex items-center"
                  disabled={siretLoading}
                >
                  <Check className="h-4 w-4 mr-2" />
                  {editingSociete ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DemandeursPage;