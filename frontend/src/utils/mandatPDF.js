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
    const lightGray = [128, 128, 128];
    
    // Marges
    const leftMargin = 20;
    const rightMargin = 20;
    const pageWidth = 210;
    const contentWidth = pageWidth - leftMargin - rightMargin;
    
    let currentY = 25;
    
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
      
      if (maxWidth && text.length > 0) {
        const lines = pdf.splitTextToSize(text.toString(), maxWidth);
        if (align === 'center') {
          lines.forEach((line, index) => {
            const textWidth = pdf.getTextWidth(line);
            const centerX = (pageWidth - textWidth) / 2;
            pdf.text(line, centerX, y + (index * (fontSize * 0.4)));
          });
        } else {
          pdf.text(lines, x, y);
        }
        return lines.length * (fontSize * 0.4);
      } else {
        pdf.text(text.toString(), x, y);
        return fontSize * 0.4;
      }
    };
    
    // Fonction pour ajouter une ligne horizontale
    const addLine = (y, color = lightGray) => {
      pdf.setDrawColor(color[0], color[1], color[2]);
      pdf.setLineWidth(0.5);
      pdf.line(leftMargin, y, pageWidth - rightMargin, y);
    };
    
    // === EN-TÊTE SOCIÉTÉ ===
    if (demandeurInfo?.societe) {
      // Logo de la société (si disponible)
      if (demandeurInfo.societe.logo_base64) {
        try {
          // Nettoyer l'URL base64 (supprimer le préfixe data:image/...)
          const base64Data = demandeurInfo.societe.logo_base64.includes(',') 
            ? demandeurInfo.societe.logo_base64.split(',')[1] 
            : demandeurInfo.societe.logo_base64;
          
          // Détecter le type d'image
          const imageType = demandeurInfo.societe.logo_base64.includes('data:image/jpeg') || 
                           demandeurInfo.societe.logo_base64.includes('data:image/jpg') ? 'JPEG' : 'PNG';
          
          // Dimensions du logo avec hauteur limitée à 15mm
          const maxLogoHeight = 15; // 15mm maximum
          let logoWidth = 30; // Largeur par défaut
          let logoHeight = maxLogoHeight;
          
          // Essayer de récupérer les dimensions réelles de l'image pour calculer le ratio
          // (jsPDF calculera automatiquement les bonnes proportions)
          const logoX = pageWidth - rightMargin - logoWidth;
          
          // Ajouter le logo avec hauteur limitée (jsPDF ajustera la largeur automatiquement)
          pdf.addImage(base64Data, imageType, logoX, currentY, logoWidth, logoHeight);
          
          // Réserver l'espace du logo (plus compact maintenant)
          const logoBottomY = currentY + logoHeight + 3;
          currentY = Math.max(currentY + 20, logoBottomY); // Au minimum 20mm pour le texte
          
        } catch (logoError) {
          console.warn('Erreur lors de l\'ajout du logo:', logoError);
          // Continuer sans logo en cas d'erreur
          currentY += 20; // Espace réduit sans logo
        }
      } else {
        currentY += 20; // Espace réduit standard sans logo
      }
      
      // Retourner au début pour le texte de la société (à gauche du logo)
      let textY = currentY - 20;
      
      // Nom de la société (remplace Weaccess Group)
      addText(demandeurInfo.societe.nom_societe || 'Société', leftMargin, textY, {
        fontSize: 14,
        fontStyle: 'bold',
        color: primaryColor
      });
      textY += 6;
      
      // Adresse de la société (remplace l'adresse Weaccess) - plus compacte
      if (demandeurInfo.societe.adresse) {
        let adresseComplete = demandeurInfo.societe.adresse;
        if (demandeurInfo.societe.code_postal && demandeurInfo.societe.ville) {
          adresseComplete += `\n${demandeurInfo.societe.code_postal} ${demandeurInfo.societe.ville}`;
        }
        if (demandeurInfo.societe.telephone) {
          adresseComplete += `\nTél : ${demandeurInfo.societe.telephone}`;
        }
        if (demandeurInfo.societe.email) {
          adresseComplete += `\nEmail : ${demandeurInfo.societe.email}`;
        }
        
        const addressHeight = addText(adresseComplete, leftMargin, textY, {
          fontSize: 8, // Taille réduite pour économiser l'espace
          maxWidth: contentWidth / 2 - 10 // Laisser de la place pour le logo
        });
        
        // S'assurer que currentY est après le texte si celui-ci est plus bas
        const textBottomY = textY + addressHeight + 3;
        if (textBottomY > currentY) {
          currentY = textBottomY;
        }
      }
    }
    
    currentY += 10; // Espace réduit
    
    // === TITRE PRINCIPAL ===
    addText('MANDAT DE PORTABILITÉ', 0, currentY, {
      fontSize: 16, // Taille réduite
      fontStyle: 'bold',
      color: primaryColor,
      align: 'center'
    });
    currentY += 10; // Espace réduit
    
    addLine(currentY);
    currentY += 8; // Espace réduit
    
    // === INTRODUCTION ===
    const societeNom = demandeurInfo?.societe?.nom_societe || 'notre société';
    const introText = `Je soussigné(e), ${formData.nom_client || '_____________________'} ${formData.prenom_client || '_____________________'}, ` +
      `agissant en qualité de représentant légal, donne mandat à ${societeNom} ` +
      `pour effectuer en mon nom et pour mon compte toutes les démarches nécessaires ` +
      `en vue de la portabilité des numéros de téléphone ci-dessous mentionnés.`;
    
    const introHeight = addText(introText, leftMargin, currentY, {
      fontSize: 10, // Taille réduite
      maxWidth: contentWidth
    });
    currentY += introHeight + 10; // Espace réduit
    
    // === INFORMATIONS DU DEMANDEUR ===
    addText('INFORMATIONS DU DEMANDEUR', leftMargin, currentY, {
      fontSize: 12, // Taille réduite
      fontStyle: 'bold',
      color: primaryColor
    });
    currentY += 8; // Espace réduit
    
    // Cadre pour les informations - hauteur réduite
    pdf.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
    pdf.setLineWidth(0.5);
    pdf.rect(leftMargin, currentY - 2, contentWidth, 30); // Hauteur réduite de 35 à 30
    
    // Informations dans le cadre
    const infoY = currentY + 5;
    let infoCurrentY = infoY;
    
    addText(`Nom et Prénom : ${formData.nom_client || '_____________________'} ${formData.prenom_client || '_____________________'}`, leftMargin + 3, infoCurrentY, {
      fontSize: 10,
      fontStyle: 'bold'
    });
    infoCurrentY += 6;
    
    if (formData.telephone_client) {
      addText(`Téléphone : ${formData.telephone_client}`, leftMargin + 3, infoCurrentY, {
        fontSize: 10
      });
      infoCurrentY += 6;
    }
    
    if (formData.email_client) {
      addText(`Email : ${formData.email_client}`, leftMargin + 3, infoCurrentY, {
        fontSize: 10
      });
      infoCurrentY += 5; // Espacement réduit
    }
    
    if (formData.siret_client) {
      addText(`SIRET : ${formData.siret_client}`, leftMargin + 3, infoCurrentY, {
        fontSize: 9 // Taille réduite
      });
      infoCurrentY += 5; // Espacement réduit
    }
    
    if (formData.adresse) {
      const adresseComplete = `${formData.adresse}${formData.code_postal ? ', ' + formData.code_postal : ''}${formData.ville ? ' ' + formData.ville : ''}`;
      addText(`Adresse : ${adresseComplete}`, leftMargin + 3, infoCurrentY, {
        fontSize: 9, // Taille réduite
        maxWidth: contentWidth - 6
      });
    }
    
    currentY += 35; // Espace réduit
    
    // === NUMÉROS À PORTER ===
    addText('NUMÉROS À PORTER (NDI)', leftMargin, currentY, {
      fontSize: 13,
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
      
      // Créer un cadre pour les numéros
      const numerosHeight = Math.max(25, (numeros.length * 5) + 10);
      pdf.rect(leftMargin, currentY, contentWidth, numerosHeight);
      
      let numeroY = currentY + 5;
      numeros.forEach(numero => {
        addText(`• ${numero}`, leftMargin + 5, numeroY, {
          fontSize: 10,
          fontStyle: 'bold'
        });
        numeroY += 5;
      });
      
      currentY += numerosHeight + 5;
    } else {
      // Cadre vide pour saisie manuelle
      pdf.rect(leftMargin, currentY, contentWidth, 25);
      addText('• _________________________________', leftMargin + 5, currentY + 10, {
        fontSize: 10
      });
      currentY += 30;
    }
    
    // === DATE ET CONDITIONS ===
    addText('CONDITIONS DE PORTABILITÉ', leftMargin, currentY, {
      fontSize: 13,
      fontStyle: 'bold',
      color: primaryColor
    });
    currentY += 10;
    
    const datePortabilite = formData.date_portabilite_demandee 
      ? new Date(formData.date_portabilite_demandee).toLocaleDateString('fr-FR')
      : '_____________';
    
    addText(`Date de portabilité souhaitée : ${datePortabilite}`, leftMargin, currentY, {
      fontSize: 11,
      fontStyle: 'bold'
    });
    currentY += 8;
    
    if (formData.fiabilisation_demandee) {
      addText('☑ Fiabilisation demandée', leftMargin, currentY, {
        fontSize: 10
      });
      currentY += 6;
    }
    
    currentY += 10;
    
    // === DÉCLARATION ET ENGAGEMENTS ===
    addText('DÉCLARATION ET ENGAGEMENTS', leftMargin, currentY, {
      fontSize: 13,
      fontStyle: 'bold',
      color: primaryColor
    });
    currentY += 8;
    
    const declarationTexts = [
      `Je déclare sur l'honneur que les informations fournies sont exactes et complètes.`,
      `J'autorise ${societeNom} à effectuer toutes les démarches nécessaires auprès des opérateurs concernés.`,
      `Je m'engage à fournir tous les documents complémentaires qui pourraient être requis.`,
      `Je reconnais avoir été informé(e) des conditions et délais de portabilité.`
    ];
    
    declarationTexts.forEach(text => {
      const textHeight = addText(`• ${text}`, leftMargin, currentY, {
        fontSize: 10,
        maxWidth: contentWidth - 5
      });
      currentY += textHeight + 3;
    });
    
    currentY += 10;
    
    // === SIGNATURE ===
    addLine(currentY);
    currentY += 10;
    
    const today = new Date().toLocaleDateString('fr-FR');
    addText(`Fait à : _____________________, le : ${today}`, leftMargin, currentY, {
      fontSize: 11
    });
    currentY += 15;
    
    // Zone de signature
    addText('Signature du représentant légal :', leftMargin, currentY, {
      fontSize: 11,
      fontStyle: 'bold'
    });
    
    addText('(Précédée de la mention "Lu et approuvé")', leftMargin, currentY + 6, {
      fontSize: 9,
      color: lightGray
    });
    
    // Cadre pour la signature
    pdf.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
    pdf.rect(leftMargin, currentY + 12, 80, 30);
    
    // === PIED DE PAGE ===
    const footerY = 280;
    addLine(footerY - 5);
    
    const datePdf = new Date().toLocaleDateString('fr-FR');
    const heurePdf = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    addText(`Document généré automatiquement le ${datePdf} à ${heurePdf}`, 0, footerY, {
      fontSize: 8,
      color: lightGray,
      align: 'center'
    });
    
    // Nom du fichier avec timestamp
    const clientName = (formData.nom_client || 'client').toLowerCase().replace(/[^a-z0-9]/g, '_');
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `mandat_portabilite_${clientName}_${timestamp}.pdf`;
    
    // Télécharger le PDF
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