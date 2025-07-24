import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit, Trash2, Building, AlertCircle, Check } from 'lucide-react';

const ClientsPage = () => {
  const { api } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState({
    nom_societe: '',
    adresse: '',
    nom: '',
    prenom: '',
    numero: ''
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await api.get('/api/clients');
      setClients(response.data);
    } catch (error) {
      setError('Erreur lors du chargement des clients');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingClient) {
        await api.put(`/api/clients/${editingClient.id}`, formData);
      } else {
        await api.post('/api/clients', formData);
      }
      fetchClients();
      handleCloseModal();
    } catch (error) {
      setError(error.response?.data?.detail || 'Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (clientId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) {
      try {
        await api.delete(`/api/clients/${clientId}`);
        fetchClients();
      } catch (error) {
        setError(error.response?.data?.detail || 'Erreur lors de la suppression');
      }
    }
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setFormData({
      nom_societe: client.nom_societe,
      adresse: client.adresse,
      nom: client.nom || '',
      prenom: client.prenom || '',
      numero: client.numero || ''
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingClient(null);
    setFormData({
      nom_societe: '',
      adresse: '',
      nom: '',
      prenom: '',
      numero: ''
    });
    setError('');
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
          Gestion des Clients
        </h1>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nouveau Client
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-center p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-3" />
          <span className="text-red-700 dark:text-red-300">{error}</span>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>Société</th>
              <th>Contact</th>
              <th>Téléphone</th>
              <th>Adresse</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id}>
                <td>
                  <div className="flex items-center">
                    <Building className="h-5 w-5 text-primary-600 mr-2" />
                    <span className="font-medium">{client.nom_societe}</span>
                  </div>
                </td>
                <td>
                  {client.prenom || client.nom ? `${client.prenom || ''} ${client.nom || ''}`.trim() : '-'}
                </td>
                <td>
                  {client.numero || '-'}
                </td>
                <td className="max-w-xs truncate">
                  {client.adresse}
                </td>
                <td>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(client)}
                      className="p-2 text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(client.id)}
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

        {clients.length === 0 && (
          <div className="p-8 text-center text-gray-500 dark:text-dark-muted">
            Aucun client enregistré
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal-overlay">
          <div className="bg-white dark:bg-dark-surface rounded-lg p-6 w-full max-w-md modal-content">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-dark-text">
              {editingClient ? 'Modifier le Client' : 'Nouveau Client'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                  Nom de la société *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nom_societe}
                  onChange={(e) => setFormData({ ...formData, nom_societe: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                  Adresse *
                </label>
                <textarea
                  required
                  value={formData.adresse}
                  onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                  className="input h-20 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                    Nom
                  </label>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-1">
                    Prénom
                  </label>
                  <input
                    type="text"
                    value={formData.prenom}
                    onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
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
                  value={formData.numero}
                  onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                  className="input"
                  placeholder="Ex: 01 23 45 67 89"
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
                  className="btn-primary flex items-center"
                >
                  <Check className="h-4 w-4 mr-2" />
                  {editingClient ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientsPage;