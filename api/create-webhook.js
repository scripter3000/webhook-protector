// api/create-webhook.js - API endpoint to create new webhooks

import crypto from 'crypto';

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

// Generate unique webhook hash
function generateWebhookHash() {
  return crypto.randomBytes(16).toString('hex');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Generate unique webhook hash
    const webhookHash = generateWebhookHash();
    const timestamp = new Date().toISOString();

    // Create initial webhook data
    const webhookData = {
      hash: webhookHash,
      created: timestamp,
      description: req.body.description || 'Auto-generated webhook',
      requests: [],
      settings: {
        rateLimit: req.body.rateLimit || false,
        maxRequests: req.body.maxRequests || 1000
      }
    };

    // Save to Pastefy
    const pasteResponse = await pasteFyRequest('/paste', 'POST', {
      content: JSON.stringify(webhookData, null, 2),
      title: `Webhook-${webhookHash}`,
      folder: null,
      visibility: 'UNLISTED',
      expire_date: null,
      paste_type: 'PASTE',
      raw: false
    });

    if (!pasteResponse.success) {
      throw new Error('Failed to create webhook storage');
    }

    const webhookUrl = `${req.headers.host}/api/webhook/${webhookHash}`;

    return res.status(201).json({
      success: true,
      webhook: {
        hash: webhookHash,
        url: `https://${webhookUrl}`,
        created: timestamp,
        pasteId: pasteResponse.paste?.id
      },
      message: 'Webhook created successfully'
    });

  } catch (error) {
    console.error('Webhook creation error:', error);
    return res.status(500).json({ 
      error: 'Failed to create webhook',
      message: error.message 
    });
  }
}
