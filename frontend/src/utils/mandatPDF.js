import jsPDF from 'jspdf';

/**
 * Génère un PDF de mandat de portabilité prérempli
 * @param {Object} formData - Données du formulaire de portabilité
 * @param {Object} demandeurInfo - Informations du demandeur et de sa société
 */
export const generateMandatPDF = async (formData, demandeurInfo) => {
  try {
    // Créer une instance jsPDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    // Configuration des polices et couleurs
    pdf.setFont('helvetica');
    const primaryColor = [37, 99, 235]; // Bleu
    const textColor = [51, 51, 51]; // Gris foncé
    
    // Marges
    const leftMargin = 20;
    const rightMargin = 20;
    const pageWidth = 210;
    const contentWidth = pageWidth - leftMargin - rightMargin;
    
    let currentY = 30;
    
    // Fonction utilitaire pour ajouter du texte avec retour à la ligne
    const addText = (text, x, y, options = {}) => {
      const { 
        fontSize = 10, 
        fontStyle = 'normal', 
        color = textColor, 
        maxWidth = contentWidth,
        align = 'left'
      } = options;
      
      pdf.setFontSize(fontSize);
      pdf.setFont('helvetica', fontStyle);
      pdf.setTextColor(color[0], color[1], color[2]);
      
      if (maxWidth) {
        const lines = pdf.splitTextToSize(text, maxWidth);
        if (align === 'center') {
          lines.forEach((line, index) => {
            const textWidth = pdf.getTextWidth(line);
            const centerX = (pageWidth - textWidth) / 2;
            pdf.text(line, centerX, y + (index * (fontSize * 0.35)));
          });
        } else {
          pdf.text(lines, x, y);
        }
        return lines.length * (fontSize * 0.35);
      } else {
        pdf.text(text, x, y);
        return fontSize * 0.35;
      }
    };
    
    // === EN-TÊTE ===
    // Titre principal
    addText('MANDAT DE PORTABILITÉ', 0, currentY, {
      fontSize: 18,
      fontStyle: 'bold',
      color: primaryColor,
      align: 'center'
    });
    currentY += 15;
    
    // Informations de la société (remplacer Weaccess Group)
    if (demandeurInfo?.societe) {
      // Nom de la société
      addText(demandeurInfo.societe.nom_societe || 'Société', leftMargin, currentY, {
        fontSize: 12,
        fontStyle: 'bold'
      });
      currentY += 6;
      
      // Adresse de la société
      if (demandeurInfo.societe.adresse) {
        const adresseComplete = `${demandeurInfo.societe.adresse}${demandeurInfo.societe.code_postal ? ', ' + demandeurInfo.societe.code_postal : ''}${demandeurInfo.societe.ville ? ' ' + demandeurInfo.societe.ville : ''}`;
        const addressHeight = addText(adresseComplete, leftMargin, currentY, {
          fontSize: 10,
          maxWidth: contentWidth / 2
        });
        currentY += addressHeight + 5;
      }
      
      // TODO: Espace pour le logo de la société (à implémenter plus tard)
      // currentY += 20;
    }
    
    currentY += 15;
    
    // === CORPS DU DOCUMENT ===
    
    // Paragraphe d'introduction (remplacer les références Jaguar Network)
    const societeNom = demandeurInfo?.societe?.nom_societe || 'la société';
    const introText = `Je soussigné(e), ${formData.nom_client || '_____________'} ${formData.prenom_client || '_____________'}, ` +
      `agissant en qualité de représentant légal de la société, donne mandat à ${societeNom} ` +
      `pour effectuer en mon nom et pour mon compte, toutes les démarches nécessaires ` +
      `en vue de la portabilité des numéros de téléphone suivants :`;
    
    const introHeight = addText(introText, leftMargin, currentY, {
      fontSize: 11,
      maxWidth: contentWidth
    });
    currentY += introHeight + 10;
    
    // === INFORMATIONS CLIENT ===
    addText('INFORMATIONS DU DEMANDEUR :', leftMargin, currentY, {
      fontSize: 12,
      fontStyle: 'bold',
      color: primaryColor
    });
    currentY += 8;
    
    // Nom et prénom
    addText(`Nom : ${formData.nom_client || '_____________'}`, leftMargin, currentY, {
      fontSize: 10
    });
    currentY += 6;
    
    addText(`Prénom : ${formData.prenom_client || '_____________'}`, leftMargin, currentY, {
      fontSize: 10
    });
    currentY += 6;
    
    // Email
    if (formData.email_client) {
      addText(`Email : ${formData.email_client}`, leftMargin, currentY, {
        fontSize: 10
      });
      currentY += 6;
    }
    
    // Adresse complète
    if (formData.adresse) {
      const adresseComplete = `${formData.adresse}${formData.code_postal ? ', ' + formData.code_postal : ''}${formData.ville ? ' ' + formData.ville : ''}`;
      addText(`Adresse : ${adresseComplete}`, leftMargin, currentY, {
        fontSize: 10,
        maxWidth: contentWidth
      });
      currentY += 8;
    }
    
    // SIRET
    if (formData.siret_client) {
      addText(`SIRET : ${formData.siret_client}`, leftMargin, currentY, {
        fontSize: 10
      });
      currentY += 8;
    }
    
    currentY += 5;
    
    // === NUMÉROS À PORTER ===
    addText('NUMÉROS À PORTER :', leftMargin, currentY, {
      fontSize: 12,
      fontStyle: 'bold',
      color: primaryColor
    });
    currentY += 8;
    
    if (formData.numeros_portes) {
      // Diviser les numéros par ligne ou virgule
      const numeros = formData.numeros_portes
        .split(/[\n,;]/)
        .map(num => num.trim())
        .filter(num => num.length > 0);
      
      numeros.forEach(numero => {
        addText(`• ${numero}`, leftMargin + 5, currentY, {
          fontSize: 10
        });
        currentY += 5;
      });
    } else {
      addText('• _____________', leftMargin + 5, currentY, {
        fontSize: 10
      });
      currentY += 5;
    }
    
    currentY += 10;
    
    // === DATE DE PORTABILITÉ ===
    addText('DATE DE PORTABILITÉ DEMANDÉE :', leftMargin, currentY, {
      fontSize: 12,
      fontStyle: 'bold',
      color: primaryColor
    });
    currentY += 8;
    
    const datePortabilite = formData.date_portabilite_demandee 
      ? new Date(formData.date_portabilite_demandee).toLocaleDateString('fr-FR')
      : '_____________';
    
    addText(`Date souhaitée : ${datePortabilite}`, leftMargin, currentY, {
      fontSize: 10
    });
    currentY += 10;
    
    // === DÉCLARATION ===
    const declarationText = `Je déclare sur l'honneur que les informations fournies sont exactes et complètes. ` +
      `J'autorise ${societeNom} à effectuer toutes les démarches nécessaires auprès des opérateurs ` +
      `concernés pour la portabilité des numéros susmentionnés.`;
    
    const declarationHeight = addText(declarationText, leftMargin, currentY, {
      fontSize: 11,
      maxWidth: contentWidth
    });
    currentY += declarationHeight + 15;
    
    // === SIGNATURE ===
    addText('Fait à : _________________, le : _________________', leftMargin, currentY, {
      fontSize: 10
    });
    currentY += 15;
    
    addText('Signature du demandeur :', leftMargin, currentY, {
      fontSize: 10,
      fontStyle: 'bold'
    });
    currentY += 20;
    
    // Cadre pour la signature
    pdf.setDrawColor(200, 200, 200);
    pdf.rect(leftMargin, currentY, 60, 25);
    
    // === PIED DE PAGE ===
    currentY = 280; // Proche du bas de la page
    
    const datePdf = new Date().toLocaleDateString('fr-FR');
    addText(`Document généré automatiquement le ${datePdf}`, 0, currentY, {
      fontSize: 8,
      color: [128, 128, 128],
      align: 'center'
    });
    
    // Télécharger le PDF
    const clientName = formData.nom_client || 'client';
    const fileName = `mandat_portabilite_${clientName.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    
    pdf.save(fileName);
    
    return {
      success: true,
      fileName: fileName
    };
    
  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error);
    return {
      success: false,
      error: error.message
    };
  }
};