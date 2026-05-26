// ========================================================
// NETLIFY SERVERLESS FUNCTION HANDLER: Unified Database & Blobs
// ========================================================

// Netlify Blobs package import (will resolve at build-time on Netlify)
let getStore;
try {
  const blobs = require('@netlify/blobs');
  getStore = blobs.getStore;
} catch (e) {
  console.warn("Netlify Blobs module is not available locally. Falling back to local storage simulator.");
}

exports.handler = async (event, context) => {
  const path = event.path;
  const method = event.httpMethod;

  // Set standard CORS and content headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // Handle Pre-flight options request
  if (method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // 1. Health Endpoint
  if (path.endsWith('/health')) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        status: 'ok', 
        message: 'MediFlow Clinical API Router Online' 
      })
    };
  }

  // 2. Netlify Blobs Clinic Letterhead Upload Endpoint
  if (path.endsWith('/blobs')) {
    try {
      if (!getStore) {
        throw new Error("Netlify Blobs sdk module not found in runtime environment.");
      }

      // Initialize Blob store
      const store = getStore({
        name: 'clinic-logo-headers',
        siteID: process.env.SITE_ID,
        token: process.env.NETLIFY_BLOBS_API_TOKEN
      });

      if (method === 'GET') {
        const clinicId = event.queryStringParameters ? event.queryStringParameters.clinicId : null;
        if (!clinicId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'clinicId is a required parameter' })
          };
        }

        const dataUrl = await store.get(clinicId, { type: 'text' });
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ url: dataUrl || '' })
        };
      }

      if (method === 'POST') {
        const body = JSON.parse(event.body);
        const { clinicId, dataUrl } = body;

        if (!clinicId || !dataUrl) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'clinicId and dataUrl are required fields' })
          };
        }

        // Store image base64 data under clinic ID
        await store.set(clinicId, dataUrl);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, url: dataUrl })
        };
      }
    } catch (err) {
      console.warn("Netlify Blobs simulation mode triggered:", err.message);
      return {
        statusCode: 501, // Not Implemented/Not Available in this context
        headers,
        body: JSON.stringify({ 
          error: 'Blobs unavailable', 
          message: err.message,
          info: 'Netlify Blobs requires execution inside Netlify hosting environment with configured site variables.' 
        })
      };
    }
  }

  // 3. Netlify Database Endpoint (Mock / Cloud integration proxy)
  if (path.endsWith('/db')) {
    const hasDbConfig = !!(process.env.DATABASE_URL || process.env.NETLIFY_KV_TOKEN);
    
    // In production, database tables operations are executed here.
    // For zero-config deployments, we report the connection capability
    // and let the client manage high-performance LocalStorage state syncing.
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'MediFlow Serverless Database Bridge',
        cloudActive: hasDbConfig,
        info: 'Operating via client-side storage model. Link database provider for unified cloud access.'
      })
    };
  }

  // 4. Fallback Router
  return {
    statusCode: 404,
    headers,
    body: JSON.stringify({ error: 'Resource Not Found' })
  };
};
