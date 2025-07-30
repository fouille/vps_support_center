import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import SearchableSelect from './SearchableSelect';
import { formatClientDisplay } from '../utils/clientUtils';

const ProductionForm = ({ production, clients, demandeurs, onClose, onSave }) => {
  const { api, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    client_id: '',
    demandeur_id: '',
    titre: '',
    description: '',
    priorite: 'normale',
    date_livraison_prevue: ''
  });

  useEffect(() => {
    if (production) {
      setFormData({
        client_id: production.client_id || '',
        demandeur_id: production.demandeur_id || '',
        titre: production.titre || '',
        description: production.description || '',
        priorite: production.priorite || 'normale',
        date_livraison_prevue: production.date_livraison_prevue || ''
      });
    }
  }, [production]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.client_id || !formData.titre) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);
    try {
      const dataToSend = { ...formData };
      
      // Pour les demandeurs, ne pas envoyer demandeur_id (sera automatiquement défini côté serveur)
      if (user?.type_utilisateur === 'demandeur') {
        delete dataToSend.demandeur_id;
      }

      if (production) {
        await api.put(`/api/productions/${production.id}`, dataToSend);
      } else {
        await api.post('/api/productions', dataToSend);
      }
      
      onSave();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde de la production');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const clientOptions = clients.map(client => ({
    value: client.id,
    label: formatClientDisplay(client),
    searchText: `${client.nom_societe} ${client.nom} ${client.prenom}`.toLowerCase()
  }));

  const demandeurOptions = demandeurs.map(demandeur => ({
    value: demandeur.id,
    label: `${demandeur.prenom} ${demandeur.nom} (${demandeur.societe})`,
    searchText: `${demandeur.prenom} ${demandeur.nom} ${demandeur.societe}`.toLowerCase()
  }));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          {/* En-tête */}
          <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  {production ? '✏️ Modifier la Production' : '➕ Nouvelle Production'}
                </h2>
                <p className="opacity-90">
                  {production ? 'Modifier les informations de la production' : 'Créer une nouvelle demande de production'}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-white hover:text-red-200 transition-colors"
              >
                <span className="text-2xl">×</span>
              </button>
            </div>
          </div>

          {/* Corps du formulaire */}
          <div className="p-6 space-y-6">
            {/* Sélection du client */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client *
              </label>
              <SearchableSelect
                options={clientOptions}
                value={formData.client_id}
                onChange={(value) => handleChange('client_id', value)}
                placeholder="Rechercher un client..."
                className="w-full"
              />
            </div>

            {/* Sélection du demandeur (agents uniquement) */}
            {user?.type_utilisateur === 'agent' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Demandeur *
                </label>
                <SearchableSelect
                  options={demandeurOptions}
                  value={formData.demandeur_id}
                  onChange={(value) => handleChange('demandeur_id', value)}
                  placeholder="Rechercher un demandeur..."
                  className="w-full"
                />
              </div>
            )}

            {/* Titre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Titre *
              </label>
              <input
                type="text"
                value={formData.titre}
                onChange={(e) => handleChange('titre', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Ex: Installation télécom complète"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Décrivez les besoins et spécificités de cette production..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Priorité */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priorité
                </label>
                <select
                  value={formData.priorite}
                  onChange={(e) => handleChange('priorite', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="basse">Basse</option>
                  <option value="normale">Normale</option>
                  <option value="haute">Haute</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>

              {/* Date de livraison prévue */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de livraison prévue
                </label>
                <input
                  type="date"
                  value={formData.date_livraison_prevue}
                  onChange={(e) => handleChange('date_livraison_prevue', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
            </div>

            {/* Informations sur les tâches automatiques */}
            {!production && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="text-blue-400 mr-3">
                    <span className="text-xl">ℹ️</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-900 mb-2">Tâches automatiques</h4>
                    <p className="text-sm text-blue-700 mb-2">
                      Les 12 tâches suivantes seront automatiquement créées pour cette production :
                    </p>
                    <ul className="text-xs text-blue-600 grid grid-cols-2 gap-1">
                      <li>1. Portabilité</li>
                      <li>2. Fichier de collecte</li>
                      <li>3. Poste fixe</li>
                      <li>4. Lien internet</li>
                      <li>5. Netgate (reception)</li>
                      <li>6. Netgate (configuration)</li>
                      <li>7. Netgate (retour)</li>
                      <li>8. Déploiement Siprouter</li>
                      <li>9. Déploiement SIP2/SIP3/SIP4</li>
                      <li>10. Routages</li>
                      <li>11. Trunk Only</li>
                      <li>12. Facturation</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Pied de page */}
          <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sauvegarde...
                </div>
              ) : (
                production ? 'Modifier' : 'Créer'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductionForm;