import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/tickets" replace />} />
        <Route path="/tickets" element={<TicketsPage />} />
        <Route path="/portabilites" element={<PortabilitesPage />} />
        <Route path="/portabilites/nouvelle" element={<PortabiliteForm />} />
        <Route path="/portabilites/:id" element={<PortabiliteDetail />} />
        <Route path="/portabilites/:id/edit" element={<PortabiliteForm />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/demandeurs" element={<DemandeursPage />} />
        <Route path="/agents" element={<AgentsPage />} />
      </Routes>
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