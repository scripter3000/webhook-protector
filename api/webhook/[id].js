// api/webhook/[id].js - Vercel API route for handling webhooks

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

  try {
    const response = await fetch(`${PASTEFY_BASE_URL}${endpoint}`, options);
    const text = await response.text();
    
    // Check if response is JSON
    try {
      return JSON.parse(text);
    } catch (parseError) {
      console.error('Failed to parse response as JSON:', text);
      throw new Error(`API returned non-JSON response: ${text.substring(0, 100)}`);
    }
  } catch (error) {
    console.error('Pastefy API error:', error);
    throw error;
  }
}

// Get webhook data from Pastefy
async function getWebhookData(webhookHash) {
  try {
    // Try to get existing webhook data using paste ID
    const response = await pasteFyRequest(`/paste/${webhookHash}`);
    if (response.success && response.paste && response.paste.content) {
      return JSON.parse(response.paste.content);
    }
  } catch (error) {
    console.log('Webhook not found or error fetching:', error.message);
  }
  return null;
}

// Save webhook data to Pastefy
async function saveWebhookData(webhookHash, webhookData) {
  try {
    // Always create a new paste since we can't update by custom ID
    const response = await pasteFyRequest('/paste', 'POST', {
      content: JSON.stringify(webhookData, null, 2),
      title: `Webhook-${webhookHash}`,
      folder: null,
      visibility: 'UNLISTED',
      expire_date: null,
      paste_type: 'PASTE',
      raw: false
    });

    if (!response.success) {
      throw new Error(`Failed to save webhook: ${response.error || 'Unknown error'}`);
    }

    return response.paste;
  } catch (error) {
    console.error('Error saving webhook data:', error);
    // Don't throw, just log - we'll handle this gracefully
    return null;
  }
}

// Main API handler
export default async function handler(req, res) {
  const { id } = req.query;
  const webhookHash = id; // Get the webhook hash from URL

  if (!webhookHash) {
    return res.status(400).json({ error: 'Webhook hash required' });
  }

  try {
    if (req.method === 'POST') {
      // Handle webhook POST request
      const requestBody = req.body;
      const timestamp = new Date().toISOString();
      
      // Create webhook data structure
      let webhookData = {
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

      // Try to save data (non-blocking)
      const saveResult = await saveWebhookData(webhookHash, webhookData);

      return res.status(200).json({ 
        success: true, 
        message: 'Webhook received and processed',
        hash: webhookHash,
        timestamp,
        saved: saveResult !== null
      });

    } else if (req.method === 'GET') {
      // Handle webhook GET request (view stored data)
      const webhookData = await getWebhookData(webhookHash);
      
      if (!webhookData) {
        return res.status(200).json({ 
          success: true,
          message: 'Webhook endpoint ready',
          hash: webhookHash,
          requests: 0
        });
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
    return res.status(200).json({ 
      success: true,
      message: 'Webhook received (storage temporarily unavailable)',
      hash: webhookHash,
      error: error.message
    });
  }
}
