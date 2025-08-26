// api/webhook/[...slug].js - Vercel API route for handling webhooks

const PASTEFY_API_KEY = "ZTMehCu66zNSZlSgxMbpwmohYjVkQYQEkMEHkTniLXwR6jLZzSGA7nx1G4NY";
const PASTEFY_BASE_URL = "https://pastefy.app/api/v2";

// Helper function to interact with Pastefy
async function pasteFyRequest(endpoint, method = 'GET', data = null) {
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${PASTEFY_API_KEY}`,
      'Content-Type': 'application/json'
    }
  };

  if (data && method !== 'GET') {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(`${PASTEFY_BASE_URL}${endpoint}`, options);
  return response.json();
}

// Get webhook data from Pastefy
async function getWebhookData(webhookHash) {
  try {
    // Try to get existing webhook data
    const response = await pasteFyRequest(`/paste/${webhookHash}`);
    if (response.success && response.paste) {
      return JSON.parse(response.paste.content);
    }
  } catch (error) {
    console.log('Webhook not found, will create new one');
  }
  return null;
}

// Save webhook data to Pastefy
async function saveWebhookData(webhookHash, webhookData) {
  try {
    const existingData = await getWebhookData(webhookHash);
    
    if (existingData) {
      // Update existing paste
      await pasteFyRequest(`/paste/${webhookHash}`, 'PUT', {
        content: JSON.stringify(webhookData, null, 2),
        title: `Webhook-${webhookHash}`,
        folder: null
      });
    } else {
      // Create new paste with webhook hash as ID
      await pasteFyRequest('/paste', 'POST', {
        content: JSON.stringify(webhookData, null, 2),
        title: `Webhook-${webhookHash}`,
        folder: null,
        visibility: 'UNLISTED', // Keep it private
        expire_date: null, // Never expire
        paste_type: 'PASTE',
        raw: false
      });
    }
  } catch (error) {
    console.error('Error saving webhook data:', error);
    throw error;
  }
}

// Main API handler
export default async function handler(req, res) {
  const { slug } = req.query;
  const webhookHash = slug[0]; // Get the webhook hash from URL

  if (!webhookHash) {
    return res.status(400).json({ error: 'Webhook hash required' });
  }

  try {
    if (req.method === 'POST') {
      // Handle webhook POST request
      const requestBody = req.body;
      const timestamp = new Date().toISOString();
      
      // Get existing webhook data or create new one
      let webhookData = await getWebhookData(webhookHash) || {
        hash: webhookHash,
        created: timestamp,
        requests: []
      };

      // Add new request to history
      const newRequest = {
        timestamp,
        method: req.method,
        headers: req.headers,
        body: requestBody,
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
      };

      webhookData.requests.push(newRequest);
      webhookData.lastActivity = timestamp;

      // Keep only last 100 requests to avoid storage limits
      if (webhookData.requests.length > 100) {
        webhookData.requests = webhookData.requests.slice(-100);
      }

      // Save updated data
      await saveWebhookData(webhookHash, webhookData);

      return res.status(200).json({ 
        success: true, 
        message: 'Webhook received and stored',
        hash: webhookHash,
        timestamp
      });

    } else if (req.method === 'GET') {
      // Handle webhook GET request (view stored data)
      const webhookData = await getWebhookData(webhookHash);
      
      if (!webhookData) {
        return res.status(404).json({ error: 'Webhook not found' });
      }

      return res.status(200).json({
        success: true,
        webhook: webhookData
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Webhook handler error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
