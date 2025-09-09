import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, requireAgent = false, requireDemandeur = false }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  // Afficher un loader pendant la vérification de l'authentification
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Rediriger vers login si non authentifié
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Vérifier les permissions spécifiques
  const userType = user?.type_utilisateur || user?.type;
  const isAgent = userType === 'agent';
  const isDemandeur = userType === 'demandeur';

  // Vérifier si l'utilisateur a les permissions requises
  if (requireAgent && !isAgent) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireDemandeur && !isDemandeur) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;