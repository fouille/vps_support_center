import React, { useState } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './components/Login';
import ClientsPage from './components/ClientsPage';
import DemandeursPage from './components/DemandeursPage';
import AgentsPage from './components/AgentsPage';
import TicketsPage from './components/TicketsPage';
import PortabilitesPage from './components/PortabilitesPage';
import PortabiliteForm from './components/PortabiliteForm';
import PortabiliteDetail from './components/PortabiliteDetail';
import './App.css';

const AppContent = () => {
  const { user, loading, isAuthenticated } = useAuth();
  const [currentPage, setCurrentPage] = useState('tickets');
  const [currentPortabiliteId, setCurrentPortabiliteId] = useState(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'clients':
        return <ClientsPage />;
      case 'demandeurs':
        return <DemandeursPage />;
      case 'agents':
        return <AgentsPage />;
      case 'portabilites':
        return <PortabilitesPage onNavigate={setCurrentPage} onSelectPortabilite={setCurrentPortabiliteId} />;
      case 'portabilites-nouvelle':
        return <PortabiliteForm onNavigate={setCurrentPage} />;
      case 'portabilites-detail':
        return <PortabiliteDetail portabiliteId={currentPortabiliteId} onNavigate={setCurrentPage} />;
      case 'portabilites-edit':
        return <PortabiliteForm portabiliteId={currentPortabiliteId} onNavigate={setCurrentPage} />;
      case 'tickets':
      default:
        return <TicketsPage />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;