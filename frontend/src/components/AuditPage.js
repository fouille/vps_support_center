import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FileText, RefreshCw, Eye, Calendar, User, Mail, Activity } from 'lucide-react';

const AuditPage = () => {
  const { api, isAgent } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Redirection si l'utilisateur n'est pas un agent
  if (!isAgent) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 text-red-500">
            <Eye className="w-full h-full" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text mb-2">
            Accès restreint
          </h2>
          <p className="text-gray-600 dark:text-dark-muted">
            Cette page est réservée aux agents.
          </p>
        </div>
      </div>
    );
  }

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/api/connexions-logs?limit=10&offset=0');
      
      setLogs(response.data.logs);
      setTotal(response.data.total);
      setHasMore(response.data.has_more);
    } catch (err) {
      console.error('Error fetching logs:', err);
      setError(err.response?.data?.detail || 'Erreur lors du chargement des logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getActionBadgeColor = (action) => {
    switch (action) {
      case 'login':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'logout':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getUserTypeBadgeColor = (userType) => {
    switch (userType) {
      case 'agent':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'demandeur':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm border border-gray-200 dark:border-dark-border mb-6">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FileText className="h-6 w-6 text-primary-600 dark:text-primary-400 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">
                  Audit des Connexions
                </h1>
                <p className="text-sm text-gray-600 dark:text-dark-muted mt-1">
                  Historique des connexions et déconnexions - {total} enregistrements au total
                </p>
              </div>
            </div>
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="bg-white dark:bg-dark-surface rounded-lg shadow-sm border border-gray-200 dark:border-dark-border">
        {error ? (
          <div className="p-6">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-300">{error}</p>
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-6 text-center">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text mb-2">
              Aucun log trouvé
            </h3>
            <p className="text-gray-600 dark:text-dark-muted">
              Aucune connexion n'a été enregistrée pour le moment.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-border">
              <thead className="bg-gray-50 dark:bg-dark-card">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-1" />
                      Utilisateur
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-1" />
                      Email
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                    IP
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      Date/Heure
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-dark-surface divide-y divide-gray-200 dark:divide-dark-border">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-dark-card transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-dark-text">
                        {log.user_prenom} {log.user_nom}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getUserTypeBadgeColor(log.user_type)}`}>
                        {log.user_type === 'agent' ? 'Agent' : 'Demandeur'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-dark-muted">
                        {log.user_email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionBadgeColor(log.action_type)}`}>
                        {log.action_type === 'login' ? 'Connexion' : 'Déconnexion'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-dark-muted font-mono">
                        {log.ip_address || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-dark-muted">
                        {formatDate(log.created_at)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer avec info de pagination */}
        {logs.length > 0 && (
          <div className="px-6 py-3 bg-gray-50 dark:bg-dark-card border-t border-gray-200 dark:border-dark-border">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700 dark:text-dark-muted">
                Affichage des 10 dernières connexions
              </div>
              <div className="text-sm text-gray-700 dark:text-dark-muted">
                Total: {total} enregistrements
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditPage;