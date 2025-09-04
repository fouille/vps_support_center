import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import jsPDF from 'jspdf';

const TrunkTemplateModal = ({ tache, onClose }) => {
  const { api } = useAuth();
  const [formData, setFormData] = useState({
    methode: 'REGISTER',
    identifiant: '',
    pass: '',
    serveur_enregistrement: 'siprouter.atea-com.fr',
    port_register: '5060',
    expiration: '60 à 120 secondes',
    ip_publique: '',
    dtmf: 'RFC2833 a=rtpmap:101 telephone-event/8000',
    codec: 'alaw (PCMA, G.711a)',
    format_numeration: 'national',
    sda: '',
    comm_simul: ''
  });

  const [errors, setErrors] = useState({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showAttachmentDialog, setShowAttachmentDialog] = useState(false);
  const [generatedPdf, setGeneratedPdf] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Effacer l'erreur du champ modifié
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.identifiant.trim()) {
      newErrors.identifiant = 'L\'identifiant est obligatoire';
    }
    
    if (!formData.pass.trim()) {
      newErrors.pass = 'Le mot de passe est obligatoire';
    }
    
    if (!formData.ip_publique.trim()) {
      newErrors.ip_publique = 'L\'IP publique est obligatoire';
    }
    
    if (!formData.sda.trim()) {
      newErrors.sda = 'Les SDA sont obligatoires';
    }
    
    if (!formData.comm_simul.trim()) {
      newErrors.comm_simul = 'Les communications simultanées sont obligatoires';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const generatePDF = () => {
    if (!validateForm()) {
      return;
    }

    const doc = new jsPDF();
    
    // Header - Récupérer le nom du client depuis les bonnes propriétés
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    const clientName = tache.production?.nom_societe || 
                      tache.production?.client_display || 
                      tache.production?.client?.nom || 
                      tache.production?.client?.nom_societe || 
                      'Client';
    doc.text(`Livraison Trunk - ${clientName}`, 20, 20);
    
    // Line separator
    doc.setLineWidth(0.5);
    doc.line(20, 25, 190, 25);
    
    // Content
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    
    let yPosition = 40;
    const lineHeight = 8;
    
    // Template fields
    const fields = [
      { label: 'Méthode:', value: formData.methode },
      { label: 'Identifiant:', value: formData.identifiant },
      { label: 'Pass:', value: formData.pass },
      { label: 'Serveur d\'enregistrement:', value: formData.serveur_enregistrement },
      { label: 'Port register:', value: formData.port_register },
      { label: 'Expiration:', value: formData.expiration },
      { label: 'IP Publique de l\'accès client (IP Fixe non CGN):', value: formData.ip_publique },
      { label: 'DTMF:', value: formData.dtmf },
      { label: 'Codec:', value: formData.codec },
      { label: 'Format numération E/S:', value: formData.format_numeration }
    ];

    fields.forEach(field => {
      doc.setFont('helvetica', 'bold');
      doc.text(field.label, 20, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(field.value, 20, yPosition + 5);
      yPosition += 15;
    });

    // SDA avec gestion du texte multiligne
    doc.setFont('helvetica', 'bold');
    doc.text('SDA:', 20, yPosition);
    doc.setFont('helvetica', 'normal');
    
    const sdaLines = doc.splitTextToSize(formData.sda, 160);
    doc.text(sdaLines, 20, yPosition + 5);
    yPosition += (sdaLines.length * 5) + 10;

    // Communications simultanées
    doc.setFont('helvetica', 'bold');
    doc.text('Comm. Simul.:', 20, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(formData.comm_simul, 20, yPosition + 5);

    // Footer with date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    const currentDate = new Date().toLocaleDateString('fr-FR');
    doc.text(`Généré le ${currentDate}`, 20, 280);
    
    // Conserver le PDF en mémoire pour l'upload potentiel
    const pdfBlob = doc.output('blob');
    const fileName = `Livraison_Trunk_${clientName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;
    
    setGeneratedPdf({
      blob: pdfBlob,
      fileName: fileName,
      doc: doc
    });
    
    // Download PDF
    doc.save(fileName);
    
    // Afficher le dialogue de confirmation
    setShowConfirmDialog(true);
  };

  const handleConfirmYes = () => {
    setShowConfirmDialog(false);
    setShowAttachmentDialog(true); // Afficher le dialogue d'ajout en pièce jointe
  };

  const handleConfirmNo = () => {
    setShowConfirmDialog(false);
    setGeneratedPdf(null); // Nettoyer le PDF généré
    // Rester sur le formulaire, ne pas vider les champs
  };

  const handleAttachYes = async () => {
    if (!generatedPdf) return;
    
    try {
      // Créer un FormData pour l'upload
      const formData = new FormData();
      formData.append('file', generatedPdf.blob, generatedPdf.fileName);
      formData.append('production_tache_id', tache.id);
      
      // Uploader le fichier
      await api.post('/api/production-tache-fichiers', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setShowAttachmentDialog(false);
      onClose(); // Fermer le modal Template
    } catch (error) {
      console.error('Erreur lors de l\'ajout du PDF en pièce jointe:', error);
      alert('Erreur lors de l\'ajout du PDF en pièce jointe');
    }
  };

  const handleAttachNo = () => {
    setShowAttachmentDialog(false);
    onClose(); // Fermer le modal Template sans ajouter la pièce jointe
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[95vh] overflow-hidden">
        
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text">
                📄 Template Trunk Only
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Production #{tache.production?.numero_production} - {tache.production?.client?.nom}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              <span className="text-2xl">×</span>
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          <form onSubmit={(e) => { e.preventDefault(); generatePDF(); }} className="space-y-4">
            
            {/* Méthode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Méthode
              </label>
              <input
                type="text"
                name="methode"
                value={formData.methode}
                onChange={handleInputChange}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-dark-text"
                readOnly
              />
            </div>

            {/* Identifiant */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Identifiant <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="identifiant"
                value={formData.identifiant}
                onChange={handleInputChange}
                autoComplete="off"
                className={`w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-600 text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                  errors.identifiant ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {errors.identifiant && (
                <p className="text-red-500 text-xs mt-1">{errors.identifiant}</p>
              )}
            </div>

            {/* Pass */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Pass <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="pass"
                value={formData.pass}
                onChange={handleInputChange}
                className={`w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-600 text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                  errors.pass ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {errors.pass && (
                <p className="text-red-500 text-xs mt-1">{errors.pass}</p>
              )}
            </div>

            {/* Serveur d'enregistrement */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Serveur d'enregistrement
              </label>
              <input
                type="text"
                name="serveur_enregistrement"
                value={formData.serveur_enregistrement}
                onChange={handleInputChange}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-dark-text"
                readOnly
              />
            </div>

            {/* Port register */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Port register
              </label>
              <input
                type="text"
                name="port_register"
                value={formData.port_register}
                onChange={handleInputChange}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-dark-text"
                readOnly
              />
            </div>

            {/* Expiration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Expiration
              </label>
              <input
                type="text"
                name="expiration"
                value={formData.expiration}
                onChange={handleInputChange}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-dark-text"
                readOnly
              />
            </div>

            {/* IP Publique */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                IP Publique de l'accès client (IP Fixe non CGN) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="ip_publique"
                value={formData.ip_publique}
                onChange={handleInputChange}
                className={`w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-600 text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                  errors.ip_publique ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="Ex: 192.168.1.100"
              />
              {errors.ip_publique && (
                <p className="text-red-500 text-xs mt-1">{errors.ip_publique}</p>
              )}
            </div>

            {/* DTMF */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                DTMF
              </label>
              <input
                type="text"
                name="dtmf"
                value={formData.dtmf}
                onChange={handleInputChange}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-dark-text"
                readOnly
              />
            </div>

            {/* Codec */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Codec
              </label>
              <input
                type="text"
                name="codec"
                value={formData.codec}
                onChange={handleInputChange}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-dark-text"
                readOnly
              />
            </div>

            {/* Format numération */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Format numération E/S
              </label>
              <input
                type="text"
                name="format_numeration"
                value={formData.format_numeration}
                onChange={handleInputChange}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-dark-text"
                readOnly
              />
            </div>

            {/* SDA - Text Area */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                SDA <span className="text-red-500">*</span>
              </label>
              <textarea
                name="sda"
                value={formData.sda}
                onChange={handleInputChange}
                rows={4}
                placeholder="Saisissez les SDA (un par ligne ou séparés par des virgules)..."
                className={`w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-600 text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-vertical ${
                  errors.sda ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {errors.sda && (
                <p className="text-red-500 text-xs mt-1">{errors.sda}</p>
              )}
            </div>

            {/* Comm. Simul. */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Comm. Simul. <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="comm_simul"
                value={formData.comm_simul}
                onChange={handleInputChange}
                placeholder="Ex: 10"
                className={`w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-600 text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                  errors.comm_simul ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {errors.comm_simul && (
                <p className="text-red-500 text-xs mt-1">{errors.comm_simul}</p>
              )}
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-t border-gray-200 dark:border-gray-600">
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={generatePDF}
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              📄 Générer le PDF
            </button>
          </div>
        </div>

        {/* Dialogue de confirmation */}
        {showConfirmDialog && (
          <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-10">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md mx-4">
              <div className="text-center">
                <div className="text-4xl mb-4">📄</div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text mb-4">
                  PDF généré avec succès !
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Le PDF vous convient-il ?
                </p>
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={handleConfirmYes}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    ✅ Oui
                  </button>
                  <button
                    onClick={handleConfirmNo}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    ❌ Non, modifier
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default TrunkTemplateModal;