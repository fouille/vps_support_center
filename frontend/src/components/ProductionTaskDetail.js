import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProductionTacheModal from './ProductionTacheModal';
import { 
  ArrowLeft, 
  Factory, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';

const ProductionTaskDetail = () => {
  const { production_uuid, tache_uuid } = useParams();
  const navigate = useNavigate();
  const { api } = useAuth();
  
  const [production, setProduction] = useState(null);
  const [tache, setTache] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchDetails();
  }, [production_uuid, tache_uuid]);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Récupérer les détails de la production
      const productionResponse = await api.get(`/api/productions/${production_uuid}`);
      const productionData = productionResponse.data;
      
      if (!productionData) {
        setError('Production non trouvée');
        return;
      }
      
      setProduction(productionData);
      
      // Trouver la tâche spécifique
      const foundTache = productionData.taches?.find(t => t.id === tache_uuid);
      
      if (!foundTache) {
        setError('Tâche non trouvée');
        return;
      }
      
      setTache({ ...foundTache, production: productionData });
      setShowModal(true);
      
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      if (error.response?.status === 404) {
        setError('Production ou tâche non trouvée');
      } else {
        setError('Erreur lors du chargement');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    navigate(`/productions/${production_uuid}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text mb-2">
          {error}
        </h2>
        <div className="flex space-x-3">
          <button
            onClick={() => navigate('/productions')}
            className="btn-secondary flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux productions
          </button>
          {production_uuid && (
            <button
              onClick={() => navigate(`/productions/${production_uuid}`)}
              className="btn-primary flex items-center"
            >
              <Factory className="h-4 w-4 mr-2" />
              Voir la production
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(`/productions/${production_uuid}`)}
            className="btn-secondary flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à la production
          </button>
          <div className="flex items-center space-x-3">
            <Factory className="h-6 w-6 text-primary-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">
                {tache?.nom_tache}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Production #{production?.numero_production}
              </p>
            </div>
          </div>
        </div>
        
        <button
          onClick={fetchDetails}
          className="btn-secondary flex items-center"
          title="Actualiser"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </button>
      </div>

      {/* Modal de la tâche */}
      {showModal && tache && (
        <ProductionTacheModal
          tache={tache}
          onClose={handleCloseModal}
          onRefresh={fetchDetails}
        />
      )}
    </div>
  );
};

export default ProductionTaskDetail;