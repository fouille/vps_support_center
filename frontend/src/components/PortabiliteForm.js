import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import SearchableSelect from './SearchableSelect';

const PortabiliteForm = ({ onNavigate, portabiliteId }) => {
  const isEdit = Boolean(portabiliteId);
  const { user, api } = useContext(AuthContext);
  
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [demandeurs, setDemandeurs] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    client_id: '',
    demandeur_id: '',
    numeros_portes: '',
    nom_client: '',
    prenom_client: '',
    email_client: '',
    siret_client: '',
    adresse: '',
    code_postal: '',
    ville: '',
    date_portabilite_demandee: '',
    date_portabilite_effective: '',
    fiabilisation_demandee: false,
    demande_signee: false,
    fichier_pdf_nom: '',
    fichier_pdf_contenu: ''
  });

  const backendUrl = '';

  // Fonction pour récupérer les clients
  const fetchClients = async () => {
    try {
      const response = await api.get(`/api/clients?limit=100`);
      
      let clientsData = response.data;
      if (response.data.data && Array.isArray(response.data.data)) {
        clientsData = response.data.data;
      }
      
      setClients(Array.isArray(clientsData) ? clientsData : []);
    } catch (err) {
      console.error('Erreur lors du chargement des clients:', err);
    }
  };

  // Fonction pour récupérer les demandeurs (agents seulement)
  const fetchDemandeurs = async () => {
    if (user.type !== 'agent') return;
    
    try {
      const response = await api.get(`/api/demandeurs`);
      
      setDemandeurs(Array.isArray(response.data) ? response.data : []);
      console.log('Demandeurs chargés:', response.data); // Debug
    } catch (err) {
      console.error('Erreur lors du chargement des demandeurs:', err);
    }
  };

  // Fonction pour récupérer les données de la portabilité (mode édition)
  const fetchPortabilite = async () => {
    if (!isEdit) return;
    
    try {
      setLoading(true);
      const response = await api.get(`/api/portabilites/${portabiliteId}`);
      
      const portabilite = response.data;
      setFormData({
        client_id: portabilite.client_id || '',
        demandeur_id: portabilite.demandeur_id || '',
        numeros_portes: portabilite.numeros_portes || '',
        nom_client: portabilite.nom_client || '',
        prenom_client: portabilite.prenom_client || '',
        email_client: portabilite.email_client || '',
        siret_client: portabilite.siret_client || '',
        adresse: portabilite.adresse || '',
        code_postal: portabilite.code_postal || '',
        ville: portabilite.ville || '',
        date_portabilite_demandee: portabilite.date_portabilite_demandee ? 
          portabilite.date_portabilite_demandee.split('T')[0] : '',
        date_portabilite_effective: portabilite.date_portabilite_effective ? 
          portabilite.date_portabilite_effective.split('T')[0] : '',
        fiabilisation_demandee: portabilite.fiabilisation_demandee || false,
        demande_signee: portabilite.demande_signee || false,
        fichier_pdf_nom: portabilite.fichier_pdf_nom || '',
        fichier_pdf_contenu: portabilite.fichier_pdf_contenu || ''
      });
    } catch (err) {
      setError('Erreur lors du chargement de la portabilité');
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour formater l'affichage client
  const formatClientDisplay = (client) => {
    if (!client.nom_societe) return 'Client sans nom';
    
    let display = client.nom_societe;
    
    if (client.nom && client.prenom) {
      display += ` (${client.nom} ${client.prenom})`;
    } else if (client.nom) {
      display += ` (${client.nom})`;
    } else if (client.prenom) {
      display += ` (${client.prenom})`;
    }
    
    return display;
  };

  // Options pour les selects
  const clientOptions = Array.isArray(clients) ? clients.map(client => ({
    value: client.id,
    label: formatClientDisplay(client)
  })) : [];

  const demandeurOptions = Array.isArray(demandeurs) ? demandeurs.map(demandeur => ({
    value: demandeur.id,
    label: `${demandeur.prenom} ${demandeur.nom} (${demandeur.email})`
  })) : [];

  // Fonction pour gérer les changements de formulaire
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Fonction pour gérer l'upload de fichier
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Seuls les fichiers PDF sont autorisés');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64String = event.target.result;
        setFormData(prev => ({
          ...prev,
          fichier_pdf_nom: file.name,
          fichier_pdf_contenu: base64String
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Fonction pour soumettre le formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const url = isEdit ? 
        `/api/portabilites/${portabiliteId}` : 
        `/api/portabilites`;
      
      const method = isEdit ? 'PUT' : 'POST';
      
      const response = isEdit ? 
        await api.put(`/api/portabilites/${portabiliteId}`, formData) :
        await api.post(`/api/portabilites`, formData);
      
      setSuccess(true);
      setTimeout(() => {
        onNavigate('portabilites');
      }, 1500);
      
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la sauvegarde');
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
    fetchDemandeurs();
    fetchPortabilite();
  }, []);

  if (loading && isEdit) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 dark:bg-dark-bg min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-dark-surface rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isEdit ? 'Modifier la portabilité' : 'Nouvelle portabilité'}
            </h1>
            <button
              onClick={() => onNavigate('portabilites')}
              className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ← Retour
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-md">
              Portabilité {isEdit ? 'modifiée' : 'créée'} avec succès ! Redirection en cours...
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section Client */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Client *
                </label>
                <SearchableSelect
                  options={clientOptions}
                  value={formData.client_id}
                  onChange={(value) => setFormData(prev => ({ ...prev, client_id: value }))}
                  placeholder="Sélectionner un client..."
                  required
                />
              </div>

              {user.type === 'agent' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Demandeur
                  </label>
                  <SearchableSelect
                    options={demandeurOptions}
                    value={formData.demandeur_id}
                    onChange={(value) => setFormData(prev => ({ ...prev, demandeur_id: value }))}
                    placeholder="Sélectionner un demandeur..."
                  />
                </div>
              )}
            </div>

            {/* Section Numéros */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Numéros à porter *
              </label>
              <textarea
                name="numeros_portes"
                value={formData.numeros_portes}
                onChange={handleInputChange}
                required
                rows="4"
                placeholder="Saisir les numéros à porter (un par ligne ou séparés par des virgules)"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-dark-surface dark:border-gray-600 dark:text-white"
              />
            </div>

            {/* Section Informations client */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nom client
                </label>
                <input
                  type="text"
                  name="nom_client"
                  value={formData.nom_client}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-dark-surface dark:border-gray-600 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Prénom client
                </label>
                <input
                  type="text"
                  name="prenom_client"
                  value={formData.prenom_client}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-dark-surface dark:border-gray-600 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email client
                </label>
                <input
                  type="email"
                  name="email_client"
                  value={formData.email_client}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-dark-surface dark:border-gray-600 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  SIRET client
                </label>
                <input
                  type="text"
                  name="siret_client"
                  value={formData.siret_client}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-dark-surface dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>

            {/* Section Adresse */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Adresse
              </label>
              <input
                type="text"
                name="adresse"
                value={formData.adresse}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-dark-surface dark:border-gray-600 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Code postal
                </label>
                <input
                  type="text"
                  name="code_postal"
                  value={formData.code_postal}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-dark-surface dark:border-gray-600 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ville
                </label>
                <input
                  type="text"
                  name="ville"
                  value={formData.ville}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-dark-surface dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>

            {/* Section Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date de portabilité demandée
                </label>
                <input
                  type="date"
                  name="date_portabilite_demandee"
                  value={formData.date_portabilite_demandee}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-dark-surface dark:border-gray-600 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date de portabilité effective
                </label>
                <input
                  type="date"
                  name="date_portabilite_effective"
                  value={formData.date_portabilite_effective}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-dark-surface dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>

            {/* Section Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="fiabilisation_demandee"
                  checked={formData.fiabilisation_demandee}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Fiabilisation demandée
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="demande_signee"
                  checked={formData.demande_signee}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Demande de portabilité signée
                </label>
              </div>
            </div>

            {/* Section Fichier PDF */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fichier PDF
              </label>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-dark-surface dark:border-gray-600 dark:text-white"
              />
              {formData.fichier_pdf_nom && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Fichier sélectionné: {formData.fichier_pdf_nom}
                </p>
              )}
            </div>

            {/* Boutons */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => onNavigate('portabilites')}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Sauvegarde...' : (isEdit ? 'Modifier' : 'Créer')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PortabiliteForm;