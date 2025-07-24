const { neon } = require('@netlify/neon');

const sql = neon();

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

exports.handler = async (event, context) => {
  console.log('Email diagnostic function called');
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const diagnostics = {
      environment: {
        MJ_APIKEY_PUBLIC: process.env.MJ_APIKEY_PUBLIC ? 'SET' : 'NOT SET',
        MJ_APIKEY_PRIVATE: process.env.MJ_APIKEY_PRIVATE ? 'SET' : 'NOT SET',
        NODE_ENV: process.env.NODE_ENV || 'not set',
        NETLIFY: process.env.NETLIFY || 'not set'
      },
      mailjetTest: null,
      emailServiceTest: null
    };

    // Test Mailjet initialization
    try {
      const mailjet = require('node-mailjet');
      
      if (process.env.MJ_APIKEY_PUBLIC && process.env.MJ_APIKEY_PRIVATE) {
        const mj = mailjet.connect(
          process.env.MJ_APIKEY_PUBLIC,
          process.env.MJ_APIKEY_PRIVATE
        );
        
        diagnostics.mailjetTest = {
          status: 'SUCCESS',
          message: 'Mailjet initialized successfully',
          hasKeys: true
        };
        
        // Test a simple API call (get sender statistics - doesn't require sending emails)
        try {
          const testResult = await mj.get('sender').request();
          diagnostics.mailjetTest.apiTest = {
            status: 'SUCCESS',
            message: 'Mailjet API connection successful'
          };
        } catch (apiError) {
          diagnostics.mailjetTest.apiTest = {
            status: 'ERROR',
            message: 'Mailjet API connection failed',
            error: apiError.message
          };
        }
      } else {
        diagnostics.mailjetTest = {
          status: 'WARNING',
          message: 'Mailjet API keys not configured',
          hasKeys: false
        };
      }
    } catch (mailjetError) {
      diagnostics.mailjetTest = {
        status: 'ERROR',
        message: 'Failed to initialize Mailjet',
        error: mailjetError.message
      };
    }

    // Test email service loading
    try {
      const emailService = require('./email-service');
      diagnostics.emailServiceTest = {
        status: 'SUCCESS',
        message: 'Email service loaded successfully',
        methods: Object.keys(emailService)
      };
    } catch (emailServiceError) {
      diagnostics.emailServiceTest = {
        status: 'ERROR',
        message: 'Failed to load email service',
        error: emailServiceError.message
      };
    }

    // Test database connection
    try {
      const testQuery = await sql`SELECT 1 as test`;
      diagnostics.database = {
        status: 'SUCCESS',
        message: 'Database connection working'
      };
    } catch (dbError) {
      diagnostics.database = {
        status: 'ERROR',
        message: 'Database connection failed',
        error: dbError.message
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Email diagnostic complete',
        timestamp: new Date().toISOString(),
        diagnostics
      })
    };

  } catch (error) {
    console.error('Diagnostic error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Diagnostic failed',
        message: error.message,
        stack: error.stack
      })
    };
  }
};