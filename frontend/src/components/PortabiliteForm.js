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
  const [currentStep, setCurrentStep] = useState(1);
  
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
    demande_signee: false
  });



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
    if (user.type_utilisateur !== 'agent') return;
    
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
        demande_signee: portabilite.demande_signee || false
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

  // Fonction pour soumettre le formulaire
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    
    // Validation côté client
    if (!formData.client_id || !formData.numeros_portes.trim()) {
      setError('Veuillez sélectionner un client et saisir les numéros à porter');
      setLoading(false);
      return;
    }
    
    if (user.type_utilisateur === 'agent' && !formData.demandeur_id) {
      setError('Veuillez sélectionner un demandeur');
      setLoading(false);
      return;
    }
    
    try {
      // Préparer les données à envoyer (ne pas envoyer la date effective si elle n'est pas saisie en mode création)
      const dataToSend = { ...formData };
      if (!isEdit && !dataToSend.date_portabilite_effective) {
        delete dataToSend.date_portabilite_effective;
      }
      
      if (isEdit) {
        await api.put(`/api/portabilites/${portabiliteId}`, dataToSend);
      } else {
        await api.post(`/api/portabilites`, dataToSend);
      }
      
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
    const loadData = async () => {
      await fetchClients();
      await fetchDemandeurs();
      await fetchPortabilite();
      
      // Si l'utilisateur est un demandeur, l'ajouter par défaut dans le formulaire
      if (user && user.type_utilisateur === 'demandeur' && !isEdit) {
        setFormData(prev => ({
          ...prev,
          demandeur_id: user.id
        }));
      }
    };
    
    loadData();
  }, [user, isEdit, portabiliteId]);

  // Fonctions pour la navigation des steps
  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (step) => {
    setCurrentStep(step);
  };

  if (loading && isEdit) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 dark:bg-dark-bg min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white dark:bg-dark-surface rounded-lg shadow-md p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {isEdit ? 'Modifier la portabilité' : 'Nouvelle portabilité'}
            </h1>
            <button
              onClick={() => onNavigate('portabilites')}
              className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 flex items-center space-x-2"
            >
              <span>←</span>
              <span>Retour</span>
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-md">
              Portabilité {isEdit ? 'modifiée' : 'créée'} avec succès ! Redirection en cours...
            </div>
          )}

          {/* Indicateur de progression */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold cursor-pointer transition-colors ${
                      step === currentStep 
                        ? 'bg-purple-600 text-white' 
                        : step < currentStep 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}
                    onClick={() => goToStep(step)}
                  >
                    {step < currentStep ? '✓' : step}
                  </div>
                  {step < 3 && (
                    <div className={`w-20 h-1 mx-4 ${
                      step < currentStep ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                    }`}></div>
                  )}
                </div>
              ))}
            </div>
            <div className="text-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Étape {currentStep} sur 3
              </span>
            </div>
          </div>

          <form className="space-y-8">
            {/* Step 1: Choix du client */}
            {currentStep === 1 && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <span className="bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3">1</span>
                  Choix du client
                </h2>
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

                  {user.type_utilisateur === 'agent' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Demandeur *
                      </label>
                      <SearchableSelect
                        options={demandeurOptions}
                        value={formData.demandeur_id}
                        onChange={(value) => setFormData(prev => ({ ...prev, demandeur_id: value }))}
                        placeholder="Sélectionner un demandeur..."
                        required
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Données du client */}
            {currentStep === 2 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <span className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3">2</span>
                  Données du client
                </h2>
                
                {/* Informations client */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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

                {/* Adresse */}
                <div className="space-y-4">
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
                </div>
              </div>
            )}

            {/* Step 3: Portabilité */}
            {currentStep === 3 && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <span className="bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3">3</span>
                  Informations de portabilité
                </h2>
                
                {/* Numéros portés */}
                <div className="mb-6">
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

                {/* Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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

                  {/* Date effective - uniquement visible en mode édition pour les agents */}
                  {isEdit && user.type_utilisateur === 'agent' && (
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
                  )}
                </div>

                {/* Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      name="fiabilisation_demandee"
                      checked={formData.fiabilisation_demandee}
                      onChange={handleInputChange}
                      className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Fiabilisation demandée
                    </label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      name="demande_signee"
                      checked={formData.demande_signee}
                      onChange={handleInputChange}
                      className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Demande de portabilité signée
                    </label>
                  </div>
                </div>

                {/* Note importante sur les fichiers */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <span className="text-blue-500 text-lg">💡</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300">
                        Ajout de fichiers
                      </h4>
                      <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                        Les fichiers peuvent être ajoutés après la création de la portabilité dans la section "Détails".
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Boutons de navigation */}
            <div className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => onNavigate('portabilites')}
                  className="px-6 py-3 border border-gray-300 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  Annuler
                </button>
                
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="px-6 py-3 border border-purple-300 text-purple-600 rounded-md hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors font-medium"
                  >
                    Précédent
                  </button>
                )}
              </div>

              <div className="flex space-x-4">
                {currentStep < 3 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors font-medium"
                  >
                    Suivant
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 transition-colors font-medium flex items-center space-x-2"
                  >
                    {loading && (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    )}
                    <span>{loading ? 'Sauvegarde...' : (isEdit ? 'Modifier' : 'Créer')}</span>
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PortabiliteForm;