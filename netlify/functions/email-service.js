// Import conditionnel de mailjet seulement quand nécessaire
let mj = null;

const initializeMailjet = () => {
  if (mj) return mj;
  
  try {
    const mailjet = require('node-mailjet');
    
    // Pour la version 6.x de node-mailjet, utiliser mailjet.Client.apiConnect
    if (mailjet.Client && typeof mailjet.Client.apiConnect === 'function') {
      mj = mailjet.Client.apiConnect(
        process.env.MJ_APIKEY_PUBLIC,
        process.env.MJ_APIKEY_PRIVATE
      );
    } else if (typeof mailjet.apiConnect === 'function') {
      mj = mailjet.apiConnect(
        process.env.MJ_APIKEY_PUBLIC,
        process.env.MJ_APIKEY_PRIVATE
      );
    } else if (typeof mailjet.connect === 'function') {
      // Fallback pour anciennes versions
      mj = mailjet.connect(
        process.env.MJ_APIKEY_PUBLIC,
        process.env.MJ_APIKEY_PRIVATE
      );
    } else {
      // Si c'est une fonction directe (nouvelle API)
      mj = mailjet(
        process.env.MJ_APIKEY_PUBLIC,
        process.env.MJ_APIKEY_PRIVATE
      );
    }
    
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
  },

  // Template pour la création d'une portabilité
  portabiliteCreated: (portabilite) => ({
    subject: `Nouvelle demande de portabilité #${portabilite.numero_portabilite}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #8e44ad 0%, #3498db 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .portabilite-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8e44ad; }
          .status-badge { display: inline-block; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
          .status-nouveau { background: #e3f2fd; color: #1565c0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📞 Nouvelle Demande de Portabilité</h1>
            <p>Une nouvelle demande de portabilité a été créée</p>
          </div>
          <div class="content">
            <div class="portabilite-info">
              <h2>Portabilité #${portabilite.numero_portabilite}</h2>
              <p><strong>Client:</strong> ${portabilite.nom_societe}</p>
              <p><strong>Demandeur:</strong> ${portabilite.demandeur_prenom} ${portabilite.demandeur_nom}</p>
              <p><strong>Statut:</strong> <span class="status-badge status-nouveau">Nouveau</span></p>
              <p><strong>Date de création:</strong> ${new Date(portabilite.date_creation).toLocaleDateString('fr-FR', { 
                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
              })}</p>
              ${portabilite.date_portabilite_demandee ? `<p><strong>Date souhaitée:</strong> ${new Date(portabilite.date_portabilite_demandee).toLocaleDateString('fr-FR')}</p>` : ''}
            </div>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h4>Numéros à porter:</h4>
              <p style="background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 3px solid #8e44ad;">
                ${portabilite.numeros_portes}
              </p>
              ${portabilite.adresse ? `<p><strong>Adresse:</strong> ${portabilite.adresse}, ${portabilite.code_postal} ${portabilite.ville}</p>` : ''}
              ${portabilite.nom_client ? `<p><strong>Contact client:</strong> ${portabilite.nom_client} ${portabilite.prenom_client}</p>` : ''}
              ${portabilite.email_client ? `<p><strong>Email client:</strong> ${portabilite.email_client}</p>` : ''}
            </div>
          </div>
          <div class="footer">
            <p>VoIP Services - Système de gestion des portabilités</p>
            <p>Cet email a été envoyé automatiquement.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Nouvelle demande de portabilité #${portabilite.numero_portabilite}\n\nClient: ${portabilite.nom_societe}\nDemandeur: ${portabilite.demandeur_prenom} ${portabilite.demandeur_nom}\nNuméros: ${portabilite.numeros_portes}`
  }),

  // Template pour les commentaires sur portabilité
  portabiliteCommentAdded: (portabilite, comment, authorType) => ({
    subject: `Nouveau commentaire sur la portabilité #${portabilite.numero_portabilite}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #16a085 0%, #27ae60 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .comment-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a085; }
          .author-info { display: flex; align-items: center; margin-bottom: 15px; }
          .avatar { width: 40px; height: 40px; border-radius: 50%; background: #8e44ad; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💬 Nouveau Commentaire</h1>
            <p>Un commentaire a été ajouté à la portabilité #${portabilite.numero_portabilite}</p>
          </div>
          <div class="content">
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3>Portabilité #${portabilite.numero_portabilite}</h3>
              <p><strong>Client:</strong> ${portabilite.nom_societe}</p>
            </div>
            <div class="comment-box">
              <div class="author-info">
                <div class="avatar">${comment.auteur_nom ? comment.auteur_nom.split(' ').map(n => n[0]).join('') : 'A'}</div>
                <div>
                  <strong>${comment.auteur_nom}</strong>
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
            <p>VoIP Services - Système de gestion des portabilités</p>
            <p>Pour répondre, connectez-vous au système de gestion des portabilités.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Nouveau commentaire sur la portabilité #${portabilite.numero_portabilite}\n\nDe: ${comment.auteur_nom}\nMessage: ${comment.message}`
  }),

  // Template pour la création d'une production
  productionCreated: (production) => ({
    subject: `Nouvelle demande de production #${production.numero_production} - ${production.titre}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .production-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #e74c3c; }
          .status-badge { display: inline-block; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
          .status-en-attente { background: #fff3cd; color: #856404; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏭 Nouvelle Demande de Production</h1>
            <p>Une nouvelle demande de production a été créée</p>
          </div>
          <div class="content">
            <div class="production-info">
              <h2>Production #${production.numero_production}</h2>
              <p><strong>Titre:</strong> ${production.titre}</p>
              <p><strong>Client:</strong> ${production.nom_societe}</p>
              <p><strong>Demandeur:</strong> ${production.demandeur_prenom} ${production.demandeur_nom}</p>
              <p><strong>Société:</strong> ${production.societe_nom}</p>
              <p><strong>Statut:</strong> <span class="status-badge status-en-attente">En attente</span></p>
              <p><strong>Priorité:</strong> ${production.priorite}</p>
              <p><strong>Date de création:</strong> ${new Date(production.date_creation).toLocaleDateString('fr-FR', { 
                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
              })}</p>
              ${production.date_livraison_prevue ? `<p><strong>Date de livraison prévue:</strong> ${new Date(production.date_livraison_prevue).toLocaleDateString('fr-FR')}</p>` : ''}
            </div>
            ${production.description ? `
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h4>Description:</h4>
              <p style="background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 3px solid #e74c3c;">
                ${production.description}
              </p>
            </div>` : ''}
          </div>
          <div class="footer">
            <p>VoIP Services - Système de gestion des productions</p>
            <p>Cet email a été envoyé automatiquement.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Nouvelle demande de production #${production.numero_production}\n\nTitre: ${production.titre}\nClient: ${production.nom_societe}\nDemandeur: ${production.demandeur_prenom} ${production.demandeur_nom}`
  }),

  // Template pour les commentaires sur production
  productionCommentAdded: (production, tache, comment, author) => ({
    subject: `Nouveau commentaire sur la production #${production.numero_production} - Tâche: ${tache.nom_tache}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #e67e22 0%, #d35400 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .comment-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #e67e22; }
          .author-info { display: flex; align-items: center; margin-bottom: 15px; }
          .avatar { width: 40px; height: 40px; border-radius: 50%; background: #e74c3c; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💬 Nouveau Commentaire</h1>
            <p>Un commentaire a été ajouté à la production #${production.numero_production}</p>
          </div>
          <div class="content">
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3>Production #${production.numero_production}</h3>
              <p><strong>Titre:</strong> ${production.titre}</p>
              <p><strong>Client:</strong> ${production.nom_societe}</p>
              <p><strong>Tâche:</strong> ${tache.nom_tache}</p>
            </div>
            <div class="comment-box">
              <div class="author-info">
                <div class="avatar">${author.nom ? author.nom.split(' ').map(n => n[0]).join('') : 'A'}</div>
                <div>
                  <strong>${author.nom} ${author.prenom}</strong>
                  <div style="font-size: 12px; color: #666;">
                    ${new Date(comment.date_creation).toLocaleDateString('fr-FR', { 
                      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
              <div style="background: #f8f9fa; padding: 15px; border-radius: 6px;">
                ${comment.contenu}
              </div>
            </div>
          </div>
          <div class="footer">
            <p>VoIP Services - Système de gestion des productions</p>
            <p>Pour répondre, connectez-vous au système de gestion des productions.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Nouveau commentaire sur la production #${production.numero_production}\n\nTâche: ${tache.nom_tache}\nDe: ${author.nom} ${author.prenom}\nMessage: ${comment.contenu}`
  }),

  // Template pour upload de fichier
  productionFileUploaded: (production, tache, fichier, author) => ({
    subject: `Nouveau fichier sur la production #${production.numero_production} - Tâche: ${tache.nom_tache}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #27ae60 0%, #16a085 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .file-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #27ae60; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📎 Nouveau Fichier</h1>
            <p>Un fichier a été ajouté à la production #${production.numero_production}</p>
          </div>
          <div class="content">
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3>Production #${production.numero_production}</h3>
              <p><strong>Titre:</strong> ${production.titre}</p>
              <p><strong>Client:</strong> ${production.nom_societe}</p>
              <p><strong>Tâche:</strong> ${tache.nom_tache}</p>
            </div>
            <div class="file-box">
              <h4>📎 Fichier ajouté</h4>
              <p><strong>Nom:</strong> ${fichier.nom_fichier}</p>
              <p><strong>Type:</strong> ${fichier.type_fichier || 'Non spécifié'}</p>
              <p><strong>Taille:</strong> ${Math.round(fichier.taille_fichier / 1024)} KB</p>
              <p><strong>Ajouté par:</strong> ${author.nom} ${author.prenom}</p>
              <p><strong>Date:</strong> ${new Date(fichier.date_upload).toLocaleDateString('fr-FR', { 
                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
              })}</p>
            </div>
          </div>
          <div class="footer">
            <p>VoIP Services - Système de gestion des productions</p>
            <p>Pour accéder au fichier, connectez-vous au système de gestion.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Nouveau fichier sur la production #${production.numero_production}\n\nTâche: ${tache.nom_tache}\nFichier: ${fichier.nom_fichier}\nAjouté par: ${author.nom} ${author.prenom}`
  }),

  // Template pour changement de statut de production
  productionStatusChanged: (production, oldStatus, newStatus) => ({
    subject: `Changement de statut - Production #${production.numero_production}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .status-change { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3498db; }
          .status-old { background: #ffeaa7; color: #2d3436; padding: 8px 12px; border-radius: 4px; display: inline-block; margin-right: 10px; }
          .status-new { background: #00b894; color: white; padding: 8px 12px; border-radius: 4px; display: inline-block; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Changement de Statut</h1>
            <p>Le statut de votre production a été mis à jour</p>
          </div>
          <div class="content">
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3>Production #${production.numero_production}</h3>
              <p><strong>Titre:</strong> ${production.titre}</p>
              <p><strong>Client:</strong> ${production.nom_societe}</p>
            </div>
            <div class="status-change">
              <h4>Changement de statut</h4>
              <p>
                <span class="status-old">${oldStatus}</span> → <span class="status-new">${newStatus}</span>
              </p>
              <p><strong>Date de mise à jour:</strong> ${new Date().toLocaleDateString('fr-FR', { 
                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
              })}</p>
            </div>
          </div>
          <div class="footer">
            <p>VoIP Services - Système de gestion des productions</p>
            <p>Pour plus de détails, connectez-vous au système de gestion.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Changement de statut - Production #${production.numero_production}\n\nStatut: ${oldStatus} → ${newStatus}\nTitre: ${production.titre}\nClient: ${production.nom_societe}`
  }),

  // Template pour les changements de statut de portabilité
  portabiliteStatusChanged: (portabilite, oldStatus) => {
    const statusLabels = {
      'nouveau': 'Nouveau',
      'bloque': 'Bloqué',
      'rejete': 'Rejeté',
      'en_cours': 'En cours',
      'demande': 'Demandé',
      'valide': 'Validé',
      'termine': 'Terminé'
    };

    const statusColors = {
      'nouveau': '#17a2b8',
      'bloque': '#dc3545',
      'rejete': '#dc3545',
      'en_cours': '#ffc107',
      'demande': '#fd7e14',
      'valide': '#28a745',
      'termine': '#20c997'
    };

    return {
      subject: `Statut de la portabilité #${portabilite.numero_portabilite} mis à jour: ${statusLabels[portabilite.status]}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #e67e22 0%, #f39c12 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
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
              <p>Le statut de votre portabilité a été modifié</p>
            </div>
            <div class="content">
              <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3>Portabilité #${portabilite.numero_portabilite}</h3>
                <p><strong>Client:</strong> ${portabilite.nom_societe}</p>
              </div>
              <div class="status-change">
                <h3>Changement de statut</h3>
                <div style="margin: 30px 0;">
                  <span class="status-badge" style="background-color: ${statusColors[oldStatus] || '#6c757d'};">
                    ${statusLabels[oldStatus] || oldStatus}
                  </span>
                  <span class="arrow">➡️</span>
                  <span class="status-badge" style="background-color: ${statusColors[portabilite.status] || '#6c757d'};">
                    ${statusLabels[portabilite.status] || portabilite.status}
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
              <p>VoIP Services - Système de gestion des portabilités</p>
              <p>Pour plus de détails, connectez-vous au système de gestion des portabilités.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Le statut de la portabilité #${portabilite.numero_portabilite} a été mis à jour de "${statusLabels[oldStatus]}" vers "${statusLabels[portabilite.status]}"\n\nClient: ${portabilite.nom_societe}`
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
  },

  // Envoi d'email lors de la création d'une portabilité
  sendPortabiliteCreationEmail: async (portabilite) => {
    const template = createEmailTemplate.portabiliteCreated(portabilite);
    
    // Envoyer à contact@voipservices.fr et au demandeur
    const recipients = [
      { Email: 'contact@voipservices.fr', Name: 'Support VoIP Services' },
      { Email: portabilite.demandeur_email, Name: `${portabilite.demandeur_prenom} ${portabilite.demandeur_nom}` }
    ];

    return await sendEmail(recipients, template.subject, template.html, template.text);
  },

  // Envoi d'email lors de l'ajout d'un commentaire sur une portabilité
  sendPortabiliteCommentEmail: async (portabilite, comment, authorType) => {
    const template = createEmailTemplate.portabiliteCommentAdded(portabilite, comment, authorType);
    
    // Déterminer le destinataire selon l'auteur
    let recipient;
    if (authorType === 'agent') {
      // Si l'agent commente, envoyer au demandeur
      recipient = { 
        Email: portabilite.demandeur_email, 
        Name: `${portabilite.demandeur_prenom} ${portabilite.demandeur_nom}` 
      };
    } else {
      // Si le demandeur commente, envoyer à l'agent ou au support
      recipient = { 
        Email: portabilite.agent_email || 'contact@voipservices.fr', 
        Name: portabilite.agent_nom && portabilite.agent_prenom ? 
          `${portabilite.agent_prenom} ${portabilite.agent_nom}` : 'Support VoIP Services'
      };
    }
    
    return await sendEmail([recipient], template.subject, template.html, template.text);
  },

  // Envoi d'email lors du changement de statut d'une portabilité
  sendPortabiliteStatusChangeEmail: async (portabilite, oldStatus) => {
    const template = createEmailTemplate.portabiliteStatusChanged(portabilite, oldStatus);
    
    // Envoyer seulement au demandeur
    const recipient = { 
      Email: portabilite.demandeur_email, 
      Name: `${portabilite.demandeur_prenom} ${portabilite.demandeur_nom}` 
    };
    
    return await sendEmail([recipient], template.subject, template.html, template.text);
  }
};

module.exports = emailService;