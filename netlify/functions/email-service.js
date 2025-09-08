// Service email utilisant Brevo (ex-SendInBlue)
let SibApiV3Sdk = null;
let brevoClient = null;

const initializeBrevo = () => {
  if (brevoClient) return brevoClient;
  
  try {
    SibApiV3Sdk = require('sib-api-v3-sdk');
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    
    // Configuration de l'API key
    const apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = process.env.BREVO_API_KEY;
    
    // Créer l'instance API
    brevoClient = new SibApiV3Sdk.TransactionalEmailsApi();
    
    return brevoClient;
  } catch (error) {
    console.error('Failed to initialize Brevo:', error);
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
          .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9fafb; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          .ticket-info { background-color: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Nouveau ticket de support</h1>
          </div>
          <div class="content">
            <p>Bonjour,</p>
            <p>Un nouveau ticket de support a été créé :</p>
            <div class="ticket-info">
              <strong>Numéro :</strong> #${ticket.numero_ticket}<br>
              <strong>Titre :</strong> ${ticket.titre}<br>
              <strong>Client :</strong> ${client.nom_societe || client.nom}<br>
              <strong>Demandeur :</strong> ${demandeur.prenom} ${demandeur.nom}<br>
              <strong>Email :</strong> ${demandeur.email}<br>
              <strong>Statut :</strong> ${ticket.status}<br>
              <strong>Date :</strong> ${new Date(ticket.date_creation).toLocaleDateString('fr-FR')}
            </div>
            ${ticket.description ? `<p><strong>Description :</strong><br>${ticket.description}</p>` : ''}
          </div>
          <div class="footer">
            <p>VoIP Services - Système de gestion des tickets</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Nouveau ticket de support

Numéro : #${ticket.numero_ticket}
Titre : ${ticket.titre}
Client : ${client.nom_societe || client.nom}
Demandeur : ${demandeur.prenom} ${demandeur.nom}
Email : ${demandeur.email}
Statut : ${ticket.status}
Date : ${new Date(ticket.date_creation).toLocaleDateString('fr-FR')}

${ticket.description ? `Description : ${ticket.description}` : ''}

VoIP Services - Système de gestion des tickets`
  }),

  // Template pour l'ajout d'un commentaire
  commentAdded: (ticket, comment, author, recipientEmail) => ({
    subject: `Commentaire ajouté - Ticket #${ticket.numero_ticket}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9fafb; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          .comment { background-color: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #2563eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Nouveau commentaire</h1>
          </div>
          <div class="content">
            <p>Bonjour,</p>
            <p>Un nouveau commentaire a été ajouté au ticket #${ticket.numero_ticket} :</p>
            <div class="comment">
              <strong>Auteur :</strong> ${author.prenom} ${author.nom} (${author.type_utilisateur})<br>
              <strong>Date :</strong> ${new Date(comment.date_creation).toLocaleDateString('fr-FR')}<br><br>
              <strong>Commentaire :</strong><br>
              ${comment.contenu.replace(/\n/g, '<br>')}
            </div>
            <p><strong>Titre du ticket :</strong> ${ticket.titre}</p>
          </div>
          <div class="footer">
            <p>VoIP Services - Système de gestion des tickets</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Nouveau commentaire sur le ticket #${ticket.numero_ticket}

Auteur : ${author.prenom} ${author.nom} (${author.type_utilisateur})
Date : ${new Date(comment.date_creation).toLocaleDateString('fr-FR')}

Commentaire :
${comment.contenu}

Titre du ticket : ${ticket.titre}

VoIP Services - Système de gestion des tickets`
  }),

  // Template pour le changement de statut
  statusChanged: (ticket, oldStatus, newStatus, author) => ({
    subject: `Statut modifié - Ticket #${ticket.numero_ticket}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9fafb; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          .status-change { background-color: white; padding: 15px; margin: 10px 0; border-radius: 5px; text-align: center; }
          .old-status { color: #dc2626; }
          .new-status { color: #16a34a; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Statut modifié</h1>
          </div>
          <div class="content">
            <p>Bonjour,</p>
            <p>Le statut du ticket #${ticket.numero_ticket} a été modifié :</p>
            <div class="status-change">
              <span class="old-status">${oldStatus}</span> → <span class="new-status">${newStatus}</span><br>
              <small>Par ${author.prenom} ${author.nom}</small>
            </div>
            <p><strong>Titre du ticket :</strong> ${ticket.titre}</p>
          </div>
          <div class="footer">
            <p>VoIP Services - Système de gestion des tickets</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Le statut du ticket #${ticket.numero_ticket} a été modifié

Ancien statut : ${oldStatus}
Nouveau statut : ${newStatus}
Par : ${author.prenom} ${author.nom}

Titre du ticket : ${ticket.titre}

VoIP Services - Système de gestion des tickets`
  }),

  // Template pour réinitialisation de mot de passe
  passwordReset: (user, newPassword) => ({
    subject: 'Réinitialisation de votre mot de passe',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9fafb; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          .password { background-color: white; padding: 15px; margin: 10px 0; border-radius: 5px; text-align: center; font-family: monospace; font-size: 18px; font-weight: bold; }
          .warning { background-color: #fef3c7; border: 1px solid #f59e0b; padding: 10px; border-radius: 5px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Nouveau mot de passe</h1>
          </div>
          <div class="content">
            <p>Bonjour ${user.prenom} ${user.nom},</p>
            <p>Votre mot de passe a été réinitialisé. Voici votre nouveau mot de passe :</p>
            <div class="password">${newPassword}</div>
            <div class="warning">
              ⚠️ Pour des raisons de sécurité, nous vous recommandons de changer ce mot de passe lors de votre prochaine connexion.
            </div>
            <p>Vous pouvez vous connecter avec ce nouveau mot de passe sur votre espace client.</p>
          </div>
          <div class="footer">
            <p>VoIP Services - Système de gestion des tickets</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Réinitialisation de votre mot de passe

Bonjour ${user.prenom} ${user.nom},

Votre mot de passe a été réinitialisé. Voici votre nouveau mot de passe :

${newPassword}

Pour des raisons de sécurité, nous vous recommandons de changer ce mot de passe lors de votre prochaine connexion.

VoIP Services - Système de gestion des tickets`
  }),

  // Template pour changement de statut de production
  productionStatusChanged: (production, oldStatus, newStatus, author) => ({
    subject: `Production #${production.numero_production} - Statut modifié`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #16a34a; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9fafb; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          .status-change { background-color: white; padding: 15px; margin: 10px 0; border-radius: 5px; text-align: center; }
          .old-status { color: #dc2626; }
          .new-status { color: #16a34a; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Production - Statut modifié</h1>
          </div>
          <div class="content">
            <p>Bonjour,</p>
            <p>Le statut de la production #${production.numero_production} a été modifié :</p>
            <div class="status-change">
              <span class="old-status">${oldStatus}</span> → <span class="new-status">${newStatus}</span><br>
              <small>Par ${author.prenom} ${author.nom}</small>
            </div>
            <p><strong>Titre :</strong> ${production.titre}</p>
            <p><strong>Client :</strong> ${production.nom_societe || production.client_display || 'N/A'}</p>
          </div>
          <div class="footer">
            <p>VoIP Services - Système de production</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Production #${production.numero_production} - Statut modifié

Ancien statut : ${oldStatus}
Nouveau statut : ${newStatus}
Par : ${author.prenom} ${author.nom}

Titre : ${production.titre}
Client : ${production.nom_societe || production.client_display || 'N/A'}

VoIP Services - Système de production`
  })
};

// Fonction principale pour envoyer un email avec Brevo
const sendEmail = async (to, subject, htmlContent, textContent) => {
  try {
    const brevoClient = initializeBrevo();
    
    if (!brevoClient) {
      console.log('Brevo not initialized. Email would be sent to:', to);
      console.log('Subject:', subject);
      return { success: false, error: 'Brevo not configured' };
    }

    if (!process.env.BREVO_API_KEY) {
      console.log('Brevo API key not configured. Email would be sent to:', to);
      console.log('Subject:', subject);
      return { success: false, error: 'Brevo API key not configured' };
    }

    // Créer l'objet email selon l'API Brevo
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    
    sendSmtpEmail.sender = {
      name: 'VoIP Services - Support',
      email: 'noreply@voipservices.fr'
    };
    
    sendSmtpEmail.to = Array.isArray(to) ? to : [{ email: to }];
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = htmlContent;
    sendSmtpEmail.textContent = textContent;

    const result = await brevoClient.sendTransacEmail(sendSmtpEmail);
    console.log('Email sent successfully:', result);
    return { success: true, data: result };
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
      { email: 'contact@voipservices.fr', name: 'Support VoIP Services' },
      { email: demandeur.email, name: `${demandeur.prenom} ${demandeur.nom}` }
    ];

    return await sendEmail(recipients, template.subject, template.html, template.text);
  },

  // Envoi d'email lors de l'ajout d'un commentaire
  sendCommentEmail: async (ticket, comment, author, recipientEmail, recipientName) => {
    const template = createEmailTemplate.commentAdded(ticket, comment, author, recipientEmail);
    
    const recipient = { email: recipientEmail, name: recipientName };
    return await sendEmail(recipient, template.subject, template.html, template.text);
  },

  // Envoi d'email lors du changement de statut
  sendStatusChangeEmail: async (ticket, oldStatus, newStatus, author, recipientEmail, recipientName) => {
    const template = createEmailTemplate.statusChanged(ticket, oldStatus, newStatus, author);
    
    const recipient = { email: recipientEmail, name: recipientName };
    return await sendEmail(recipient, template.subject, template.html, template.text);
  },

  // Envoi d'email pour la réinitialisation de mot de passe
  sendPasswordResetEmail: async (user, newPassword) => {
    const template = createEmailTemplate.passwordReset(user, newPassword);
    
    const recipient = { email: user.email, name: `${user.prenom} ${user.nom}` };
    return await sendEmail(recipient, template.subject, template.html, template.text);
  },

  // Envoi d'email pour changement de statut de production
  sendProductionStatusChangeEmail: async (production, oldStatus, newStatus, author, recipientEmail, recipientName) => {
    const template = createEmailTemplate.productionStatusChanged(production, oldStatus, newStatus, author);
    
    const recipient = { email: recipientEmail, name: recipientName };
    return await sendEmail(recipient, template.subject, template.html, template.text);
  }
};

// Export du service
module.exports = {
  emailService,
  initializeBrevo,
  sendEmail,
  createEmailTemplate
};