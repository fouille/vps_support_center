// Service email utilisant Brevo avec la nouvelle API @getbrevo/brevo
console.log('email-service.js: Starting to load...');

let TransactionalEmailsApi, SendSmtpEmail;
try {
  const brevoImport = require('@getbrevo/brevo');
  TransactionalEmailsApi = brevoImport.TransactionalEmailsApi;
  SendSmtpEmail = brevoImport.SendSmtpEmail;
  console.log('email-service.js: Brevo imports successful');
} catch (error) {
  console.error('email-service.js: Failed to import Brevo:', error);
  // Fallback pour éviter que le module échoue complètement
  TransactionalEmailsApi = null;
  SendSmtpEmail = null;
}

let brevoClient = null;

const initializeBrevo = () => {
  if (brevoClient) return brevoClient;
  
  if (!TransactionalEmailsApi || !SendSmtpEmail) {
    console.error('Brevo classes not available, cannot initialize');
    return null;
  }
  
  try {
    // Créer l'instance API
    brevoClient = new TransactionalEmailsApi();
    
    // Configuration de l'API key
    brevoClient.authentications.apiKey.apiKey = process.env.BREVO_API_KEY;
    
    console.log('email-service.js: Brevo client initialized successfully');
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
  commentAdded: (ticket, comment, author, recipientEmail) => {
    console.log('commentAdded template called with:', {
      ticketId: ticket?.id,
      commentId: comment?.id,
      commentContenu: comment?.message,  // Corrigé: message au lieu de contenu
      commentCreatedAt: comment?.created_at,  // Ajouté pour debug
      authorId: author?.id,
      recipientEmail
    });
    
    return {
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
              <strong>Date :</strong> ${new Date(comment.created_at).toLocaleDateString('fr-FR')}<br><br>
              <strong>Commentaire :</strong><br>
              ${(comment.message || '').replace(/\n/g, '<br>')}
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
Date : ${new Date(comment.created_at).toLocaleDateString('fr-FR')}

Commentaire :
${comment.message || ''}

Titre du ticket : ${ticket.titre}

VoIP Services - Système de gestion des tickets`
    };
  },

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
  }),

  // Template pour la création d'une portabilité
  portabiliteCreated: (portabilite, client, demandeur) => ({
    subject: `Nouvelle portabilité #${portabilite.numero_portabilite} - ${portabilite.numeros_portes}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #7c3aed; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9fafb; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          .portabilite-info { background-color: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Nouvelle portabilité</h1>
          </div>
          <div class="content">
            <p>Bonjour,</p>
            <p>Une nouvelle portabilité a été créée :</p>
            <div class="portabilite-info">
              <strong>Numéro :</strong> #${portabilite.numero_portabilite}<br>
              <strong>Numéros portés :</strong> ${portabilite.numeros_portes}<br>
              <strong>Client :</strong> ${client?.nom_societe || portabilite.nom_client + ' ' + (portabilite.prenom_client || '')}<br>
              <strong>Demandeur :</strong> ${demandeur?.prenom || ''} ${demandeur?.nom || 'N/A'}<br>
              <strong>Email client :</strong> ${portabilite.email_client || 'N/A'}<br>
              <strong>Statut :</strong> ${portabilite.status}<br>
              <strong>Date demandée :</strong> ${portabilite.date_portabilite_demandee ? new Date(portabilite.date_portabilite_demandee).toLocaleDateString('fr-FR') : 'N/A'}
            </div>
          </div>
          <div class="footer">
            <p>VoIP Services - Système de portabilité</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Nouvelle portabilité

Numéro : #${portabilite.numero_portabilite}
Numéros portés : ${portabilite.numeros_portes}
Client : ${client?.nom_societe || portabilite.nom_client + ' ' + (portabilite.prenom_client || '')}
Demandeur : ${demandeur?.prenom || ''} ${demandeur?.nom || 'N/A'}
Email client : ${portabilite.email_client || 'N/A'}
Statut : ${portabilite.status}
Date demandée : ${portabilite.date_portabilite_demandee ? new Date(portabilite.date_portabilite_demandee).toLocaleDateString('fr-FR') : 'N/A'}

VoIP Services - Système de portabilité`
  }),

  // Template pour changement de statut de portabilité
  portabiliteStatusChanged: (portabilite, oldStatus, newStatus, author) => ({
    subject: `Portabilité #${portabilite.numero_portabilite} - Statut modifié`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #7c3aed; color: white; padding: 20px; text-align: center; }
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
            <h1>Portabilité - Statut modifié</h1>
          </div>
          <div class="content">
            <p>Bonjour,</p>
            <p>Le statut de la portabilité #${portabilite.numero_portabilite} a été modifié :</p>
            <div class="status-change">
              <span class="old-status">${oldStatus}</span> → <span class="new-status">${newStatus}</span><br>
              <small>Par ${author?.prenom || ''} ${author?.nom || 'Système'}</small>
            </div>
            <p><strong>Numéros portés :</strong> ${portabilite.numeros_portes}</p>
            <p><strong>Client :</strong> ${portabilite.nom_societe || portabilite.nom_client + ' ' + (portabilite.prenom_client || '')}</p>
          </div>
          <div class="footer">
            <p>VoIP Services - Système de portabilité</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Portabilité #${portabilite.numero_portabilite} - Statut modifié

Ancien statut : ${oldStatus}
Nouveau statut : ${newStatus}
Par : ${author?.prenom || ''} ${author?.nom || 'Système'}

Numéros portés : ${portabilite.numeros_portes}
Client : ${portabilite.nom_societe || portabilite.nom_client + ' ' + (portabilite.prenom_client || '')}

VoIP Services - Système de portabilité`
  }),

  // Template pour commentaire sur portabilité
  portabiliteCommentAdded: (portabilite, comment, author) => ({
    subject: `Commentaire ajouté - Portabilité #${portabilite.numero_portabilite}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #7c3aed; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9fafb; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          .comment { background-color: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #7c3aed; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Nouveau commentaire</h1>
          </div>
          <div class="content">
            <p>Bonjour,</p>
            <p>Un nouveau commentaire a été ajouté à la portabilité #${portabilite.numero_portabilite} :</p>
            <div class="comment">
              <strong>Auteur :</strong> ${author?.auteur_nom || (author?.prenom + ' ' + author?.nom) || 'Utilisateur inconnu'}<br>
              <strong>Date :</strong> ${new Date(comment.created_at).toLocaleDateString('fr-FR')}<br><br>
              <strong>Commentaire :</strong><br>
              ${(comment.message || '').replace(/\n/g, '<br>')}
            </div>
            <p><strong>Numéros portés :</strong> ${portabilite.numeros_portes}</p>
          </div>
          <div class="footer">
            <p>VoIP Services - Système de portabilité</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Nouveau commentaire sur la portabilité #${portabilite.numero_portabilite}

Auteur : ${author?.auteur_nom || (author?.prenom + ' ' + author?.nom) || 'Utilisateur inconnu'}
Date : ${new Date(comment.created_at).toLocaleDateString('fr-FR')}

Commentaire :
${comment.message || ''}

Numéros portés : ${portabilite.numeros_portes}

VoIP Services - Système de portabilité`
  }),

  // Template pour la création d'une production
  productionCreated: (production, client, demandeur) => ({
    subject: `Nouvelle production #${production.numero_production} - ${production.titre}`,
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
          .production-info { background-color: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Nouvelle production</h1>
          </div>
          <div class="content">
            <p>Bonjour,</p>
            <p>Une nouvelle production a été créée :</p>
            <div class="production-info">
              <strong>Numéro :</strong> #${production.numero_production}<br>
              <strong>Titre :</strong> ${production.titre}<br>
              <strong>Client :</strong> ${production.nom_societe || production.client_display || 'N/A'}<br>
              <strong>Demandeur :</strong> ${production.demandeur_prenom || ''} ${production.demandeur_nom || 'N/A'}<br>
              <strong>Priorité :</strong> ${production.priorite}<br>
              <strong>Statut :</strong> ${production.status}<br>
              <strong>Date de création :</strong> ${new Date(production.date_creation).toLocaleDateString('fr-FR')}
            </div>
            ${production.description ? `<p><strong>Description :</strong><br>${production.description}</p>` : ''}
          </div>
          <div class="footer">
            <p>VoIP Services - Système de production</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Nouvelle production

Numéro : #${production.numero_production}
Titre : ${production.titre}
Client : ${production.nom_societe || production.client_display || 'N/A'}
Demandeur : ${production.demandeur_prenom || ''} ${production.demandeur_nom || 'N/A'}
Priorité : ${production.priorite}
Statut : ${production.status}
Date de création : ${new Date(production.date_creation).toLocaleDateString('fr-FR')}

${production.description ? `Description : ${production.description}` : ''}

VoIP Services - Système de production`
  }),

  // Template pour commentaire sur production
  productionCommentAdded: (production, tache, comment, author) => ({
    subject: `Commentaire ajouté - Production #${production.numero_production} - ${tache?.nom_tache || 'Tâche'}`,
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
          .comment { background-color: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #16a34a; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Nouveau commentaire</h1>
          </div>
          <div class="content">
            <p>Bonjour,</p>
            <p>Un nouveau commentaire a été ajouté à la production #${production.numero_production} :</p>
            <div class="comment">
              <strong>Auteur :</strong> ${author?.prenom || ''} ${author?.nom || 'Utilisateur inconnu'} (${author?.type_utilisateur || 'inconnu'})<br>
              <strong>Tâche :</strong> ${tache?.nom_tache || 'N/A'}<br>
              <strong>Date :</strong> ${new Date(comment.date_creation).toLocaleDateString('fr-FR')}<br><br>
              <strong>Commentaire :</strong><br>
              ${(comment.contenu || '').replace(/\n/g, '<br>')}
            </div>
            <p><strong>Titre de production :</strong> ${production.titre}</p>
            <p><strong>Client :</strong> ${production.nom_societe || production.client_display || 'N/A'}</p>
          </div>
          <div class="footer">
            <p>VoIP Services - Système de production</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Nouveau commentaire sur la production #${production.numero_production}

Auteur : ${author?.prenom || ''} ${author?.nom || 'Utilisateur inconnu'} (${author?.type_utilisateur || 'inconnu'})
Tâche : ${tache?.nom_tache || 'N/A'}
Date : ${new Date(comment.date_creation).toLocaleDateString('fr-FR')}

Commentaire :
${comment.contenu || ''}

Titre de production : ${production.titre}
Client : ${production.nom_societe || production.client_display || 'N/A'}

VoIP Services - Système de production`
  })
};

// Fonction principale pour envoyer un email avec Brevo
const sendEmail = async (to, subject, htmlContent, textContent) => {
  try {
    if (!SendSmtpEmail) {
      console.error('SendSmtpEmail class not available');
      return { success: false, error: 'Brevo not properly loaded' };
    }

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

    // Créer l'objet email selon la nouvelle API Brevo
    const message = new SendSmtpEmail();
    
    message.sender = {
      name: 'VoIP Services - Support',
      email: 'noreply@voipservices.fr'
    };
    
    // Normaliser le format des destinataires
    let recipients;
    if (Array.isArray(to)) {
      recipients = to;
    } else if (typeof to === 'string') {
      recipients = [{ email: to }];
    } else if (typeof to === 'object' && to.email) {
      recipients = [{ email: to.email, name: to.name }];
    } else {
      recipients = [{ email: to }];
    }
    
    message.to = recipients;
    message.subject = subject;
    message.htmlContent = htmlContent;
    message.textContent = textContent;

    console.log('Sending email via Brevo to:', message.to);
    console.log('Subject:', subject);

    const result = await brevoClient.sendTransacEmail(message);
    console.log('Email sent successfully:', result);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error sending email:', error);
    if (error.response && error.response.data) {
      console.error('Brevo API error details:', error.response.data);
    }
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
    console.log('sendPasswordResetEmail called with user:', JSON.stringify({
      id: user.id,
      email: user.email,
      nom: user.nom,
      prenom: user.prenom
    }, null, 2));
    
    const template = createEmailTemplate.passwordReset(user, newPassword);
    
    const recipient = { email: user.email, name: `${user.prenom} ${user.nom}` };
    console.log('Password reset recipient structure:', JSON.stringify(recipient, null, 2));
    
    return await sendEmail(recipient, template.subject, template.html, template.text);
  },

  // Envoi d'email pour changement de statut de production
  sendProductionStatusChangeEmail: async (production, oldStatus, newStatus, author, recipientEmail, recipientName) => {
    const template = createEmailTemplate.productionStatusChanged(production, oldStatus, newStatus, author);
    
    const recipient = { email: recipientEmail, name: recipientName };
    return await sendEmail(recipient, template.subject, template.html, template.text);
  },

  // Envoi d'email lors de la création d'une portabilité
  sendPortabiliteCreationEmail: async (portabiliteDetail) => {
    const template = createEmailTemplate.portabiliteCreated(
      portabiliteDetail, 
      { nom_societe: portabiliteDetail.nom_societe },
      { 
        prenom: portabiliteDetail.demandeur_prenom, 
        nom: portabiliteDetail.demandeur_nom,
        email: portabiliteDetail.demandeur_email 
      }
    );
    
    // Envoyer à contact@voipservices.fr et au demandeur
    const recipients = [
      { email: 'contact@voipservices.fr', name: 'Support VoIP Services' }
    ];
    
    if (portabiliteDetail.demandeur_email) {
      recipients.push({ 
        email: portabiliteDetail.demandeur_email, 
        name: `${portabiliteDetail.demandeur_prenom || ''} ${portabiliteDetail.demandeur_nom || ''}`.trim() 
      });
    }

    return await sendEmail(recipients, template.subject, template.html, template.text);
  },

  // Envoi d'email pour changement de statut de portabilité
  sendPortabiliteStatusChangeEmail: async (portabiliteDetail, oldStatus, newStatus) => {
    const template = createEmailTemplate.portabiliteStatusChanged(portabiliteDetail, oldStatus, newStatus, null);
    
    // Envoyer au demandeur si disponible
    if (portabiliteDetail.demandeur_email) {
      const recipient = { 
        email: portabiliteDetail.demandeur_email, 
        name: `${portabiliteDetail.demandeur_prenom || ''} ${portabiliteDetail.demandeur_nom || ''}`.trim() 
      };
      return await sendEmail(recipient, template.subject, template.html, template.text);
    }
    
    return { success: false, error: 'No recipient email available' };
  },

  // Envoi d'email pour commentaire sur portabilité
  sendPortabiliteCommentEmail: async (portabiliteInfo, commentDetail, userType) => {
    const template = createEmailTemplate.portabiliteCommentAdded(portabiliteInfo, commentDetail, commentDetail);
    
    // Déterminer le destinataire selon le type d'utilisateur qui commente
    let recipients = [{ email: 'contact@voipservices.fr', name: 'Support VoIP Services' }];
    
    if (portabiliteInfo.demandeur_email && userType === 'agent') {
      // Si un agent commente, notifier le demandeur
      recipients.push({ 
        email: portabiliteInfo.demandeur_email, 
        name: `${portabiliteInfo.demandeur_prenom || ''} ${portabiliteInfo.demandeur_nom || ''}`.trim() 
      });
    }

    return await sendEmail(recipients, template.subject, template.html, template.text);
  },

  // Envoi d'email lors de la création d'une production
  sendProductionCreationEmail: async (productionDetail) => {
    const template = createEmailTemplate.productionCreated(
      productionDetail, 
      { nom_societe: productionDetail.nom_societe },
      { 
        prenom: productionDetail.demandeur_prenom, 
        nom: productionDetail.demandeur_nom,
        email: productionDetail.demandeur_email 
      }
    );
    
    // Envoyer à contact@voipservices.fr et au demandeur
    const recipients = [
      { email: 'contact@voipservices.fr', name: 'Support VoIP Services' }
    ];
    
    if (productionDetail.demandeur_email) {
      recipients.push({ 
        email: productionDetail.demandeur_email, 
        name: `${productionDetail.demandeur_prenom || ''} ${productionDetail.demandeur_nom || ''}`.trim() 
      });
    }

    return await sendEmail(recipients, template.subject, template.html, template.text);
  },

  // Envoi d'email pour commentaire sur production
  sendProductionCommentEmail: async (productionInfo, tache, comment, author) => {
    const template = createEmailTemplate.productionCommentAdded(productionInfo, tache, comment, author);
    
    // Déterminer le destinataire selon le type d'utilisateur qui commente
    let recipients = [{ email: 'contact@voipservices.fr', name: 'Support VoIP Services' }];
    
    if (productionInfo.demandeur_email && author.type_utilisateur === 'agent') {
      // Si un agent commente, notifier le demandeur
      recipients.push({ 
        email: productionInfo.demandeur_email, 
        name: `${productionInfo.demandeur_prenom || ''} ${productionInfo.demandeur_nom || ''}`.trim() 
      });
    }

    return await sendEmail(recipients, template.subject, template.html, template.text);
  }
};

// Export du service - Export direct des fonctions pour compatibilité
module.exports = emailService;

console.log('email-service.js: Module loaded successfully, exported functions:', Object.keys(emailService));