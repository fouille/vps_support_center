const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

exports.handler = async (event, context) => {
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

  const tests = {
    nodeMailjetPackage: null,
    mailjetConnect: null,
    environmentKeys: {
      MJ_APIKEY_PUBLIC: process.env.MJ_APIKEY_PUBLIC ? 'SET' : 'NOT SET',
      MJ_APIKEY_PRIVATE: process.env.MJ_APIKEY_PRIVATE ? 'SET' : 'NOT SET'
    }
  };

  // Test 1: Can we require node-mailjet?
  try {
    const mailjet = require('node-mailjet');
    tests.nodeMailjetPackage = {
      status: 'SUCCESS',
      message: 'node-mailjet package loaded successfully',
      hasConnect: typeof mailjet.connect === 'function'
    };

    // Test 2: Can we call mailjet.connect?
    if (typeof mailjet.connect === 'function') {
      try {
        if (process.env.MJ_APIKEY_PUBLIC && process.env.MJ_APIKEY_PRIVATE) {
          const mjClient = mailjet.connect(
            process.env.MJ_APIKEY_PUBLIC,
            process.env.MJ_APIKEY_PRIVATE
          );
          tests.mailjetConnect = {
            status: 'SUCCESS',
            message: 'Mailjet client created successfully',
            hasPost: typeof mjClient.post === 'function'
          };
        } else {
          tests.mailjetConnect = {
            status: 'SKIPPED',
            message: 'API keys not available, cannot test connection'
          };
        }
      } catch (connectError) {
        tests.mailjetConnect = {
          status: 'ERROR', 
          message: 'Failed to connect to Mailjet',
          error: connectError.message
        };
      }
    } else {
      tests.mailjetConnect = {
        status: 'ERROR',
        message: 'mailjet.connect is not a function'
      };
    }

  } catch (requireError) {
    tests.nodeMailjetPackage = {
      status: 'ERROR',
      message: 'Failed to load node-mailjet package',
      error: requireError.message
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: 'Mailjet package test complete',
      timestamp: new Date().toISOString(),
      tests
    })
  };
};