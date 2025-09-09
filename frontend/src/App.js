import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './components/Login';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './components/Dashboard';
import ClientsPage from './components/ClientsPage';
import DemandeursPage from './components/DemandeursPage';
import AgentsPage from './components/AgentsPage';
import TicketsPage from './components/TicketsPage';
import TicketDetail from './components/TicketDetail';
import PortabilitesPage from './components/PortabilitesPage';
import PortabiliteForm from './components/PortabiliteForm';
import PortabiliteDetail from './components/PortabiliteDetail';
import ProductionsPage from './components/ProductionsPage';
import ProductionTaskDetail from './components/ProductionTaskDetail';
import AuditPage from './components/AuditPage';
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
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <div className="flex-1">
        <Routes>
          {/* Route par défaut - Dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* Routes principales */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          {/* Routes Tickets */}
          <Route path="/tickets" element={
            <ProtectedRoute>
              <TicketsPage />
            </ProtectedRoute>
          } />
          <Route path="/tickets/:ticket_uuid" element={
            <ProtectedRoute>
              <TicketDetail />
            </ProtectedRoute>
          } />
          
          {/* Routes Portabilités */}
          <Route path="/portabilites" element={
            <ProtectedRoute>
              <PortabilitesPage />
            </ProtectedRoute>
          } />
          <Route path="/portabilites/nouvelle" element={
            <ProtectedRoute>
              <PortabiliteForm />
            </ProtectedRoute>
          } />
          <Route path="/portabilites/:portabilite_uuid" element={
            <ProtectedRoute>
              <PortabiliteDetail />
            </ProtectedRoute>
          } />
          <Route path="/portabilites/:portabilite_uuid/edit" element={
            <ProtectedRoute>
              <PortabiliteForm />
            </ProtectedRoute>
          } />
          
          {/* Routes Productions */}
          <Route path="/productions" element={
            <ProtectedRoute>
              <ProductionsPage />
            </ProtectedRoute>
          } />
          <Route path="/productions/:production_uuid" element={
            <ProtectedRoute>
              <ProductionsPage />
            </ProtectedRoute>
          } />
          <Route path="/productions/:production_uuid/taches/:tache_uuid" element={
            <ProtectedRoute>
              <ProductionTaskDetail />
            </ProtectedRoute>
          } />
          
          {/* Routes communes */}
          <Route path="/clients" element={
            <ProtectedRoute>
              <ClientsPage />
            </ProtectedRoute>
          } />
          <Route path="/demandeurs" element={
            <ProtectedRoute>
              <DemandeursPage />
            </ProtectedRoute>
          } />
          
          {/* Routes administratives (agents uniquement) */}
          <Route path="/agents" element={
            <ProtectedRoute requireAgent={true}>
              <AgentsPage />
            </ProtectedRoute>
          } />
          <Route path="/audit" element={
            <ProtectedRoute requireAgent={true}>
              <AuditPage />
            </ProtectedRoute>
          } />
          
          {/* Route 404 */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </Layout>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="h-screen flex flex-col bg-gray-100 dark:bg-dark-bg">
          <div className="flex-1 overflow-hidden">
            <AppContent />
          </div>
          <Footer />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;