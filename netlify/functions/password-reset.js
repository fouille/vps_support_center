const { neon } = require('@netlify/neon');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const sql = neon(); // automatically uses env NETLIFY_DATABASE_URL

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

// Fonction pour générer un mot de passe sécurisé
const generateSecurePassword = () => {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*!';
  let password = '';
  
  // S'assurer qu'on a au moins un caractère de chaque type
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // minuscule
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // majuscule
  password += '0123456789'[Math.floor(Math.random() * 10)]; // chiffre
  password += '@#$%&*!'[Math.floor(Math.random() * 7)]; // caractère spécial
  
  // Compléter avec des caractères aléatoires
  for (let i = password.length; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  
  // Mélanger les caractères
  return password.split('').sort(() => 0.5 - Math.random()).join('');
};

// Fonction pour envoyer l'email avec Mailjet
const sendPasswordResetEmail = async (email, newPassword, userName) => {
  try {
    const mailjetApiKey = process.env.MAILJET_API_KEY;
    const mailjetSecretKey = process.env.MAILJET_SECRET_KEY;
    
    console.log('Mailjet config check:');
    console.log('API Key length:', mailjetApiKey ? mailjetApiKey.length : 0);
    console.log('Secret Key length:', mailjetSecretKey ? mailjetSecretKey.length : 0);
    
    if (!mailjetApiKey || !mailjetSecretKey) {
      console.log('Mailjet non configuré - Variables manquantes');
      console.log('MAILJET_API_KEY:', mailjetApiKey ? 'définie' : 'manquante');
      console.log('MAILJET_SECRET_KEY:', mailjetSecretKey ? 'définie' : 'manquante');
      return false;
    }

    const mailjetUrl = 'https://api.mailjet.com/v3.1/send';
    const auth = Buffer.from(`${mailjetApiKey}:${mailjetSecretKey}`).toString('base64');

    const emailData = {
      Messages: [{
        From: {
          Email: "noreply@voipservices.fr",
          Name: "Support VoIP Services"
        },
        To: [{
          Email: email,
          Name: userName
        }],
        Subject: "Réinitialisation de votre mot de passe",
        HTMLPart: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #4F46E5; color: white; padding: 20px; text-align: center;">
              <h1>Réinitialisation de mot de passe</h1>
            </div>
            <div style="padding: 20px; background-color: #f8f9fa;">
              <p>Bonjour ${userName},</p>
              <p>Votre mot de passe a été réinitialisé avec succès.</p>
              <div style="background-color: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0;">
                <p><strong>Votre nouveau mot de passe :</strong></p>
                <p style="font-family: monospace; font-size: 18px; background-color: white; padding: 10px; border-radius: 4px; word-break: break-all;">
                  ${newPassword}
                </p>
              </div>
              <p style="color: #d32f2f; font-weight: bold;">⚠️ Important :</p>
              <ul style="color: #666;">
                <li>Nous vous recommandons de changer ce mot de passe après votre première connexion</li>
                <li>Ne partagez jamais vos identifiants de connexion</li>
                <li>Si vous n'avez pas demandé cette réinitialisation, contactez-nous immédiatement</li>
              </ul>
              <div style="margin-top: 30px; text-align: center;">
                <a href="#" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
                  Se connecter
                </a>
              </div>
            </div>
            <div style="padding: 20px; text-align: center; color: #666; font-size: 12px; background-color: #f1f1f1;">
              <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
              <p>© ${new Date().getFullYear()} Support VoIP Services. Tous droits réservés.</p>
            </div>
          </div>
        `
      }]
    };

    const response = await fetch(mailjetUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    });

    console.log('Mailjet response status:', response.status);
    console.log('Mailjet response headers:', Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const responseData = await response.json();
      console.log('Email de réinitialisation envoyé avec succès:', responseData);
      return true;
    } else {
      const errorData = await response.text();
      console.error('Erreur envoi email Mailjet:', response.status, errorData);
      return false;
    }

  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email:', error);
    return false;
  }
};

exports.handler = async (event, context) => {
  console.log('Password reset function called:', event.httpMethod);
  
  // Debug des variables d'environnement
  console.log('Environment variables check:');
  console.log('MAILJET_API_KEY present:', !!process.env.MAILJET_API_KEY);
  console.log('MAILJET_SECRET_KEY present:', !!process.env.MAILJET_SECRET_KEY);
  console.log('RECAPTCHA_SECRET_KEY present:', !!process.env.RECAPTCHA_SECRET_KEY);
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { email, recaptchaToken } = JSON.parse(event.body || '{}');

    if (!email || !email.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email requis' })
      };
    }

    // Validation basique de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Format d\'email invalide' })
      };
    }

    // Vérification reCAPTCHA (optionnel si configuré)
    if (process.env.RECAPTCHA_SECRET_KEY && recaptchaToken) {
      const recaptchaResponse = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`
      });
      
      const recaptchaData = await recaptchaResponse.json();
      if (!recaptchaData.success) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Verification reCAPTCHA échouée' })
        };
      }
    }

    console.log('Recherche utilisateur pour email:', email);

    // Rechercher dans les agents
    let user = null;
    let userType = null;
    
    const agentResult = await sql`
      SELECT id, email, nom, prenom FROM agents WHERE email = ${email} LIMIT 1
    `;
    
    if (agentResult.length > 0) {
      user = agentResult[0];
      userType = 'agent';
    } else {
      // Rechercher dans les demandeurs si pas trouvé dans agents
      const demandeurResult = await sql`
        SELECT id, email, nom, prenom FROM demandeurs WHERE email = ${email} LIMIT 1
      `;
      
      if (demandeurResult.length > 0) {
        user = demandeurResult[0];
        userType = 'demandeur';
      }
    }

    // Pour des raisons de sécurité, toujours renvoyer le même message
    // même si l'utilisateur n'existe pas (éviter l'énumération d'emails)
    const successMessage = 'Si cette adresse email est associée à un compte, un nouveau mot de passe vous a été envoyé.';

    if (!user) {
      console.log('Utilisateur non trouvé pour email:', email);
      // Attendre 1-2 secondes pour simuler le traitement
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          message: successMessage 
        })
      };
    }

    console.log('Utilisateur trouvé:', userType, user.email);

    // Générer un nouveau mot de passe sécurisé
    const newPassword = generateSecurePassword();
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Mettre à jour le mot de passe dans la base de données (sans déclencher les triggers)
    if (userType === 'agent') {
      await sql`
        UPDATE agents 
        SET password = ${hashedPassword}
        WHERE id = ${user.id}
      `;
      // Mise à jour séparée de updated_at pour éviter les triggers
      await sql`
        UPDATE agents 
        SET updated_at = NOW() 
        WHERE id = ${user.id}
      `;
    } else {
      await sql`
        UPDATE demandeurs 
        SET password = ${hashedPassword}
        WHERE id = ${user.id}
      `;
      // Mise à jour séparée de updated_at pour éviter les triggers
      await sql`
        UPDATE demandeurs 
        SET updated_at = NOW() 
        WHERE id = ${user.id}
      `;
    }

    console.log('Mot de passe mis à jour pour:', user.email);

    // Envoyer l'email avec le nouveau mot de passe
    const userName = `${user.prenom} ${user.nom}`;
    const emailSent = await sendPasswordResetEmail(user.email, newPassword, userName);

    if (!emailSent) {
      console.log('Email non envoyé mais mot de passe réinitialisé pour:', user.email);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: successMessage 
      })
    };

  } catch (error) {
    console.error('Password reset API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erreur serveur lors de la réinitialisation' })
    };
  }
};