// Import conditionnel de mailjet seulement quand nécessaire
let mj = null;

const initializeMailjet = () => {
  if (mj) return mj;
  
  try {
    const mailjet = require('node-mailjet');
    mj = mailjet.connect(
      process.env.MJ_APIKEY_PUBLIC,
      process.env.MJ_APIKEY_PRIVATE
    );
    return mj;
  } catch (error) {
    console.error('Failed to initialize Mailjet:', error);
    return null;
  }
};

// Email templates
const createEmailTemplate = {
  // Template pour la création d'un ticket
  ticketCreated: (ticket, client, demandeur) => ({
    subject: `Nouveau ticket #${ticket.numero_ticket} - ${ticket.titre}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .ticket-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
          .status-badge { display: inline-block; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
          .status-nouveau { background: #e3f2fd; color: #1565c0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .btn { background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎫 Nouveau Ticket Créé</h1>
            <p>Un nouveau ticket de support a été créé</p>
          </div>
          <div class="content">
            <div class="ticket-info">
              <h2>Ticket #${ticket.numero_ticket}</h2>
              <h3>${ticket.titre}</h3>
              <p><strong>Client:</strong> ${client.nom_societe}</p>
              <p><strong>Demandeur:</strong> ${demandeur.prenom} ${demandeur.nom} (${demandeur.email})</p>
              <p><strong>Statut:</strong> <span class="status-badge status-nouveau">Nouveau</span></p>
              <p><strong>Date de création:</strong> ${new Date(ticket.date_creation).toLocaleDateString('fr-FR', { 
                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
              })}</p>
              ${ticket.date_fin_prevue ? `<p><strong>Échéance:</strong> ${new Date(ticket.date_fin_prevue).toLocaleDateString('fr-FR')}</p>` : ''}
            </div>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h4>Requête initiale:</h4>
              <p style="background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 3px solid #28a745;">
                ${ticket.requete_initiale}
              </p>
            </div>
          </div>
          <div class="footer">
            <p>VoIP Services - Système de gestion des tickets</p>
            <p>Cet email a été envoyé automatiquement.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Nouveau ticket #${ticket.numero_ticket} créé\n\nTitre: ${ticket.titre}\nClient: ${client.nom_societe}\nDemandeur: ${demandeur.prenom} ${demandeur.nom}\nRequête: ${ticket.requete_initiale}`
  }),

  // Template pour les commentaires
  commentAdded: (ticket, comment, author, recipient) => ({
    subject: `Nouveau commentaire sur le ticket #${ticket.numero_ticket}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .comment-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745; }
          .author-info { display: flex; align-items: center; margin-bottom: 15px; }
          .avatar { width: 40px; height: 40px; border-radius: 50%; background: #667eea; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💬 Nouveau Commentaire</h1>
            <p>Un commentaire a été ajouté au ticket #${ticket.numero_ticket}</p>
          </div>
          <div class="content">
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3>Ticket: ${ticket.titre}</h3>
              <p><strong>Client:</strong> ${ticket.client_nom}</p>
            </div>
            <div class="comment-box">
              <div class="author-info">
                <div class="avatar">${author.prenom ? author.prenom[0] : 'A'}${author.nom ? author.nom[0] : 'G'}</div>
                <div>
                  <strong>${author.prenom} ${author.nom}</strong>
                  <div style="font-size: 12px; color: #666;">
                    ${new Date(comment.created_at).toLocaleDateString('fr-FR', { 
                      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
              <div style="background: #f8f9fa; padding: 15px; border-radius: 6px;">
                ${comment.message}
              </div>
            </div>
          </div>
          <div class="footer">
            <p>VoIP Services - Système de gestion des tickets</p>
            <p>Pour répondre, connectez-vous au système de gestion des tickets.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Nouveau commentaire sur le ticket #${ticket.numero_ticket}\n\nDe: ${author.prenom} ${author.nom}\nMessage: ${comment.message}`
  }),

  // Template pour les changements de statut
  statusChanged: (ticket, oldStatus, newStatus, client, demandeur) => {
    const statusLabels = {
      'nouveau': 'Nouveau',
      'en_cours': 'En cours',
      'en_attente': 'En attente',
      'repondu': 'Répondu',
      'resolu': 'Résolu',
      'ferme': 'Fermé'
    };

    const statusColors = {
      'nouveau': '#17a2b8',
      'en_cours': '#ffc107',
      'en_attente': '#fd7e14',
      'repondu': '#28a745',
      'resolu': '#20c997',
      'ferme': '#6c757d'
    };

    return {
      subject: `Statut du ticket #${ticket.numero_ticket} mis à jour: ${statusLabels[newStatus]}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #fd7e14 0%, #ffc107 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
            .status-change { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
            .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: bold; text-transform: uppercase; color: white; margin: 0 10px; }
            .arrow { font-size: 24px; margin: 0 15px; color: #666; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔄 Statut Mis à Jour</h1>
              <p>Le statut de votre ticket a été modifié</p>
            </div>
            <div class="content">
              <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3>Ticket #${ticket.numero_ticket}</h3>
                <h4>${ticket.titre}</h4>
                <p><strong>Client:</strong> ${client.nom_societe}</p>
              </div>
              <div class="status-change">
                <h3>Changement de statut</h3>
                <div style="margin: 30px 0;">
                  <span class="status-badge" style="background-color: ${statusColors[oldStatus] || '#6c757d'};">
                    ${statusLabels[oldStatus] || oldStatus}
                  </span>
                  <span class="arrow">➡️</span>
                  <span class="status-badge" style="background-color: ${statusColors[newStatus] || '#6c757d'};">
                    ${statusLabels[newStatus] || newStatus}
                  </span>
                </div>
                <p style="color: #666; font-style: italic;">
                  Mis à jour le ${new Date().toLocaleDateString('fr-FR', { 
                    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
            <div class="footer">
              <p>VoIP Services - Système de gestion des tickets</p>
              <p>Pour plus de détails, connectez-vous au système de gestion des tickets.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Le statut du ticket #${ticket.numero_ticket} a été mis à jour de "${statusLabels[oldStatus]}" vers "${statusLabels[newStatus]}"\n\nTitre: ${ticket.titre}\nClient: ${client.nom_societe}`
    };
  }
};

// Fonction principale pour envoyer un email
const sendEmail = async (to, subject, htmlContent, textContent) => {
  try {
    const mailjetClient = initializeMailjet();
    
    if (!mailjetClient) {
      console.log('Mailjet not initialized. Email would be sent to:', to);
      console.log('Subject:', subject);
      return { success: false, error: 'Mailjet not configured' };
    }

    if (!process.env.MJ_APIKEY_PUBLIC || !process.env.MJ_APIKEY_PRIVATE) {
      console.log('Mailjet API keys not configured. Email would be sent to:', to);
      console.log('Subject:', subject);
      return { success: false, error: 'Mailjet API keys not configured' };
    }

    const request = mailjetClient.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: {
            Email: 'noreply@voipservices.fr',
            Name: 'VoIP Services - Support'
          },
          To: Array.isArray(to) ? to : [{ Email: to }],
          Subject: subject,
          HTMLPart: htmlContent,
          TextPart: textContent
        }
      ]
    });

    const result = await request;
    console.log('Email sent successfully:', result.body);
    return { success: true, data: result.body };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

// Fonctions spécialisées pour chaque type d'email
const emailService = {
  // Envoi d'email lors de la création d'un ticket
  sendTicketCreatedEmail: async (ticket, client, demandeur) => {
    const template = createEmailTemplate.ticketCreated(ticket, client, demandeur);
    
    // Envoyer à contact@voipservices.fr et au demandeur
    const recipients = [
      { Email: 'contact@voipservices.fr', Name: 'Support VoIP Services' },
      { Email: demandeur.email, Name: `${demandeur.prenom} ${demandeur.nom}` }
    ];

    return await sendEmail(recipients, template.subject, template.html, template.text);
  },

  // Envoi d'email lors de l'ajout d'un commentaire
  sendCommentEmail: async (ticket, comment, author, recipientEmail, recipientName) => {
    const template = createEmailTemplate.commentAdded(ticket, comment, author, recipientEmail);
    
    const recipient = { Email: recipientEmail, Name: recipientName };
    
    return await sendEmail([recipient], template.subject, template.html, template.text);
  },

  // Envoi d'email lors du changement de statut
  sendStatusChangeEmail: async (ticket, oldStatus, newStatus, client, demandeur) => {
    const template = createEmailTemplate.statusChanged(ticket, oldStatus, newStatus, client, demandeur);
    
    // Envoyer seulement au demandeur
    const recipient = { Email: demandeur.email, Name: `${demandeur.prenom} ${demandeur.nom}` };
    
    return await sendEmail([recipient], template.subject, template.html, template.text);
  }
};

module.exports = emailService;