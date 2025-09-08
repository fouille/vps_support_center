const { neon } = require('@netlify/neon');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const sql = neon(); // automatically uses env NETLIFY_DATABASE_URL

// Import conditionnel du service email
const loadEmailService = () => {
  try {
    return require('./email-service');
  } catch (error) {
    console.error('Failed to load email service:', error);
    return null;
  }
};

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

// Fonction pour envoyer l'email avec Brevo
const sendPasswordResetEmail = async (user, newPassword) => {
  try {
    const emailService = loadEmailService();
    
    if (!emailService) {
      console.log('Service email non disponible - Email ne sera pas envoyé');
      return false;
    }

    if (!process.env.BREVO_API_KEY) {
      console.log('Brevo API key non configurée - Email ne sera pas envoyé');
      return false;
    }

    // Utiliser le service Brevo pour envoyer l'email
    const result = await emailService.sendPasswordResetEmail(user, newPassword);
    
    if (result.success) {
      console.log('Email de réinitialisation envoyé avec succès via Brevo');
      return true;
    } else {
      console.error('Erreur envoi email Brevo:', result.error);
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
  console.log('MJ_APIKEY_PUBLIC present:', !!process.env.MJ_APIKEY_PUBLIC);
  console.log('MJ_APIKEY_PRIVATE present:', !!process.env.MJ_APIKEY_PRIVATE);
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

    // Vérification reCAPTCHA v3 (optionnel si configuré)
    if (process.env.RECAPTCHA_SECRET_KEY && recaptchaToken) {
      console.log('Vérification reCAPTCHA v3...');
      const recaptchaResponse = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`
      });
      
      const recaptchaData = await recaptchaResponse.json();
      console.log('reCAPTCHA response:', recaptchaData);
      
      if (!recaptchaData.success) {
        console.error('reCAPTCHA verification failed:', recaptchaData['error-codes']);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Vérification reCAPTCHA échouée' })
        };
      }
      
      // Vérification du score pour reCAPTCHA v3 (seuil de sécurité)
      if (recaptchaData.score !== undefined) {
        console.log('reCAPTCHA score:', recaptchaData.score);
        if (recaptchaData.score <= 0.5) {
          console.warn('reCAPTCHA score trop bas:', recaptchaData.score);
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              error: 'Demande refusée pour des raisons de sécurité. Veuillez réessayer plus tard.' 
            })
          };
        }
      }
      
      // Vérification de l'action pour reCAPTCHA v3 (optionnel)
      if (recaptchaData.action && recaptchaData.action !== 'password_reset') {
        console.warn('Unexpected reCAPTCHA action:', recaptchaData.action);
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