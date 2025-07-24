const { neon } = require('@netlify/neon');
const jwt = require('jsonwebtoken');

const sql = neon();

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

const verifyToken = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Token manquant');
  }
  
  const token = authHeader.substring(7);
  return jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key');
};

exports.handler = async (event, context) => {
  console.log('Email test function called');
  
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
    // Verify authentication
    const authHeader = event.headers.authorization || event.headers.Authorization;
    const decoded = verifyToken(authHeader);

    if (decoded.type !== 'agent') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ detail: 'Seuls les agents peuvent tester l\'envoi d\'emails' })
      };
    }

    const { testType, recipient } = JSON.parse(event.body);

    console.log('Testing email sending with type:', testType);
    console.log('Recipient:', recipient);

    // Load email service
    const loadEmailService = () => {
      try {
        return require('./email-service');
      } catch (error) {
        console.error('Failed to load email service:', error);
        return null;
      }
    };

    const emailService = loadEmailService();
    if (!emailService) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Email service not available',
          detail: 'Could not load email service module'
        })
      };
    }

    let result;

    switch (testType) {
      case 'simple':
        // Test simple email sending
        try {
          console.log('Attempting to send simple test email...');
          
          // Test direct Mailjet integration
          const mailjet = require('node-mailjet');
          
          if (!process.env.MJ_APIKEY_PUBLIC || !process.env.MJ_APIKEY_PRIVATE) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ 
                error: 'Mailjet not configured',
                detail: 'API keys not found in environment variables',
                keys: {
                  public: process.env.MJ_APIKEY_PUBLIC ? 'SET' : 'NOT SET',
                  private: process.env.MJ_APIKEY_PRIVATE ? 'SET' : 'NOT SET'
                }
              })
            };
          }

          const mj = mailjet.connect(
            process.env.MJ_APIKEY_PUBLIC,
            process.env.MJ_APIKEY_PRIVATE
          );

          const request = mj.post('send', { version: 'v3.1' }).request({
            Messages: [
              {
                From: {
                  Email: 'noreply@voipservices.fr',
                  Name: 'VoIP Services - Test'
                },
                To: [
                  {
                    Email: recipient || 'contact@voipservices.fr',
                    Name: 'Test Recipient'
                  }
                ],
                Subject: 'Test d\'envoi d\'email - Système de tickets',
                HTMLPart: `
                  <html>
                    <body>
                      <h2>Test d'envoi d'email</h2>
                      <p>Ceci est un email de test pour vérifier que l'intégration Mailjet fonctionne correctement.</p>
                      <p>Timestamp: ${new Date().toISOString()}</p>
                      <p>Système de gestion des tickets VoIP Services</p>
                    </body>
                  </html>
                `,
                TextPart: `Test d'envoi d'email\n\nCeci est un test de l'intégration Mailjet.\nTimestamp: ${new Date().toISOString()}`
              }
            ]
          });

          const emailResult = await request;
          console.log('Direct Mailjet result:', emailResult.body);

          result = {
            status: 'SUCCESS',
            message: 'Email sent successfully via direct Mailjet integration',
            details: emailResult.body
          };

        } catch (emailError) {
          console.error('Email sending error:', emailError);
          result = {
            status: 'ERROR',
            message: 'Failed to send email',
            error: emailError.message,
            stack: emailError.stack
          };
        }
        break;

      case 'ticket':
        // Test ticket creation email
        try {
          // Get some test data
          const [clients, demandeurs] = await Promise.all([
            sql`SELECT * FROM clients LIMIT 1`,
            sql`SELECT * FROM demandeurs LIMIT 1`
          ]);

          if (clients.length === 0 || demandeurs.length === 0) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ 
                error: 'Test data not available',
                detail: 'Need at least one client and one demandeur for ticket email test'
              })
            };
          }

          const mockTicket = {
            id: 'test-ticket-id',
            numero_ticket: '123456',
            titre: 'Test Ticket - Email Integration',
            status: 'nouveau',
            date_creation: new Date().toISOString(),
            requete_initiale: 'Ceci est un ticket de test pour vérifier l\'envoi d\'emails.'
          };

          console.log('Testing ticket creation email...');
          result = await emailService.sendTicketCreatedEmail(
            mockTicket,
            clients[0],
            demandeurs[0]
          );

        } catch (testError) {
          console.error('Ticket email test error:', testError);
          result = {
            status: 'ERROR',
            message: 'Failed to test ticket email',
            error: testError.message
          };
        }
        break;

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Invalid test type',
            validTypes: ['simple', 'ticket']
          })
        };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Email test completed',
        testType,
        recipient: recipient || 'contact@voipservices.fr',
        timestamp: new Date().toISOString(),
        result
      })
    };

  } catch (error) {
    console.error('Email test error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Email test failed',
        message: error.message,
        stack: error.stack
      })
    };
  }
};