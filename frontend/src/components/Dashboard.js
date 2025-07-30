import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer } from 'recharts';
import { Ticket, CheckCircle, Clock, AlertTriangle, Users, Building, TrendingUp } from 'lucide-react';

const Dashboard = () => {
  const { user, api } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isAgent = user?.type_utilisateur === 'agent' || user?.type === 'agent';

  // Couleurs pour les graphiques
  const COLORS = {
    primary: '#3B82F6',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#6366F1',
    secondary: '#8B5CF6'
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/dashboard');
      setStats(response.data);
    } catch (error) {
      console.error('Erreur:', error);
      setError(error.response?.data?.detail || error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button 
            onClick={fetchDashboardStats}
            className="mt-4 btn-primary"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  // Préparation des données pour les graphiques
  const ticketsChartData = [
    { name: 'Ouverts', value: stats.tickets.ouverts, color: COLORS.warning },
    { name: 'Cloturés', value: stats.tickets.clotures, color: COLORS.success }
  ].filter(item => item.value > 0); // Filtrer les valeurs à 0

  const portabilitesChartData = [
    { name: 'Ouvertes', value: stats.portabilites.ouvertes, color: COLORS.info },
    { name: 'Terminées', value: stats.portabilites.terminees, color: COLORS.success },
    { name: 'En erreur', value: stats.portabilites.erreur, color: COLORS.danger }
  ].filter(item => item.value > 0); // Filtrer les valeurs à 0

  const ticketsDetailData = Object.entries(stats.tickets.byStatus)
    .filter(([status, count]) => status && status !== 'undefined' && count > 0)
    .map(([status, count]) => ({
      status: status.replace('_', ' ').toUpperCase(),
      count
    }));

  const portabilitesDetailData = Object.entries(stats.portabilites.byStatus)
    .filter(([status, count]) => status && status !== 'undefined' && count > 0)
    .map(([status, count]) => ({
      status: status.replace('_', ' ').toUpperCase(),
      count
    }));

  const productionsChartData = stats.productions ? [
    { name: 'Non Terminé', value: stats.productions.non_termine, color: COLORS.warning },
    { name: 'Terminé', value: stats.productions.termine, color: COLORS.success },
    { name: 'Bloqué', value: stats.productions.bloque, color: COLORS.danger }
  ].filter(item => item.value > 0) : []; // Filtrer les valeurs à 0

  const productionsDetailData = stats.productions ? Object.entries(stats.productions.byStatus)
    .filter(([status, count]) => status && status !== 'undefined' && count > 0)
    .map(([status, count]) => ({
      status: status.replace('_', ' ').toUpperCase(),
      count
    })) : [];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const displayLabel = label || data.name || '';
      const displayValue = data.value || 0;
      
      return (
        <div className="bg-white dark:bg-dark-surface p-3 border border-gray-200 dark:border-dark-border rounded-lg shadow-lg">
          <p className="text-gray-900 dark:text-dark-text font-medium">
            {displayLabel ? `${displayLabel}: ${displayValue}` : displayValue}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-dark-text-secondary">
            Vue d'ensemble de votre activité
          </p>
        </div>
        <button 
          onClick={fetchDashboardStats}
          className="btn-primary flex items-center"
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          Actualiser
        </button>
      </div>

      {/* Cartes de statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Tickets Ouverts */}
        <div className="bg-white dark:bg-dark-surface rounded-lg shadow p-6 border border-gray-200 dark:border-dark-border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary">
                Tickets Ouverts
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-dark-text">
                {stats.tickets.ouverts}
              </p>
            </div>
          </div>
        </div>

        {/* Tickets Cloturés */}
        <div className="bg-white dark:bg-dark-surface rounded-lg shadow p-6 border border-gray-200 dark:border-dark-border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary">
                Tickets Cloturés
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-dark-text">
                {stats.tickets.clotures}
              </p>
            </div>
          </div>
        </div>

        {/* Portabilités Ouvertes */}
        <div className="bg-white dark:bg-dark-surface rounded-lg shadow p-6 border border-gray-200 dark:border-dark-border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Ticket className="h-8 w-8 text-blue-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary">
                Portabilités Ouvertes
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-dark-text">
                {stats.portabilites.ouvertes}
              </p>
            </div>
          </div>
        </div>

        {/* Portabilités en Erreur */}
        <div className="bg-white dark:bg-dark-surface rounded-lg shadow p-6 border border-gray-200 dark:border-dark-border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary">
                Portabilités en Erreur
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-dark-text">
                {stats.portabilites.erreur}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cartes de statistiques Productions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Productions Non Terminées */}
        <div className="bg-white dark:bg-dark-surface rounded-lg shadow p-6 border border-gray-200 dark:border-dark-border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary">
                Productions Non Terminées
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-dark-text">
                {stats.productions?.non_termine || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Productions Terminées */}
        <div className="bg-white dark:bg-dark-surface rounded-lg shadow p-6 border border-gray-200 dark:border-dark-border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary">
                Productions Terminées
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-dark-text">
                {stats.productions?.termine || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Productions Bloquées */}
        <div className="bg-white dark:bg-dark-surface rounded-lg shadow p-6 border border-gray-200 dark:border-dark-border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary">
                Productions Bloquées
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-dark-text">
                {stats.productions?.bloque || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Graphiques principaux */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Répartition des Tickets */}
        <div className="bg-white dark:bg-dark-surface rounded-lg shadow p-6 border border-gray-200 dark:border-dark-border">
          <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text mb-4">
            Répartition des Tickets
          </h3>
          {stats.tickets.total > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={ticketsChartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {ticketsChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-dark-text-secondary">
              Aucun ticket
            </div>
          )}
        </div>

        {/* Répartition des Portabilités */}
        <div className="bg-white dark:bg-dark-surface rounded-lg shadow p-6 border border-gray-200 dark:border-dark-border">
          <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text mb-4">
            Répartition des Portabilités
          </h3>
          {stats.portabilites.total > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={portabilitesChartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {portabilitesChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-dark-text-secondary">
              Aucune portabilité
            </div>
          )}
        </div>

        {/* Répartition des Productions */}
        <div className="bg-white dark:bg-dark-surface rounded-lg shadow p-6 border border-gray-200 dark:border-dark-border">
          <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text mb-4">
            Répartition des Productions
          </h3>
          {stats.productions && stats.productions.total > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={productionsChartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {productionsChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-dark-text-secondary">
              Aucune production
            </div>
          )}
        </div>
      </div>

      {/* Graphiques détaillés */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Détail par statut - Tickets */}
        <div className="bg-white dark:bg-dark-surface rounded-lg shadow p-6 border border-gray-200 dark:border-dark-border">
          <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text mb-4">
            Tickets par Statut
          </h3>
          {ticketsDetailData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ticketsDetailData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="status" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  className="text-xs"
                />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill={COLORS.primary} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-dark-text-secondary">
              Aucune donnée
            </div>
          )}
        </div>

        {/* Détail par statut - Portabilités */}
        <div className="bg-white dark:bg-dark-surface rounded-lg shadow p-6 border border-gray-200 dark:border-dark-border">
          <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text mb-4">
            Portabilités par Statut
          </h3>
          {portabilitesDetailData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={portabilitesDetailData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="status" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  className="text-xs"
                />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill={COLORS.info} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-dark-text-secondary">
              Aucune donnée
            </div>
          )}
        </div>
      </div>

      {/* Statistiques supplémentaires pour les agents */}
      {isAgent && stats.additional && (
        <div className="space-y-6">
          {/* Évolution des tickets */}
          {stats.additional.evolutionTickets && stats.additional.evolutionTickets.length > 0 && (
            <div className="bg-white dark:bg-dark-surface rounded-lg shadow p-6 border border-gray-200 dark:border-dark-border">
              <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text mb-4">
                Évolution des Tickets (7 derniers jours)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.additional.evolutionTickets}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke={COLORS.primary} 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top clients */}
          {stats.additional.topClients && stats.additional.topClients.length > 0 && (
            <div className="bg-white dark:bg-dark-surface rounded-lg shadow p-6 border border-gray-200 dark:border-dark-border">
              <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text mb-4">
                Top 5 Clients (par nombre de tickets)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.additional.topClients} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="nom" type="category" width={150} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="tickets" fill={COLORS.secondary} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Statistiques par société */}
          {stats.additional.parSociete && stats.additional.parSociete.length > 0 && (
            <div className="bg-white dark:bg-dark-surface rounded-lg shadow p-6 border border-gray-200 dark:border-dark-border">
              <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text mb-4">
                Répartition par Société
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-border">
                  <thead className="bg-gray-50 dark:bg-dark-bg">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
                        Société
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
                        Demandeurs
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
                        Tickets
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
                        Portabilités
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-dark-surface divide-y divide-gray-200 dark:divide-dark-border">
                    {stats.additional.parSociete.map((societe, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-dark-text">
                          {societe.societe}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-dark-text-secondary">
                          {societe.demandeurs}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-dark-text-secondary">
                          {societe.tickets}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-dark-text-secondary">
                          {societe.portabilites}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;