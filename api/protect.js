const crypto = require('crypto');

// In a real app, you'd use a database. For demo, using a global variable
// Note: This will reset on each serverless function cold start
global.webhooks = global.webhooks || new Map();

function generateUniqueId() {
    return crypto.randomBytes(16).toString('hex');
}

export default function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed. Only POST is supported.' 
        });
    }

    try {
        const { webhookUrl } = req.body;

        if (!webhookUrl) {
            return res.status(400).json({ 
                success: false, 
                error: 'Webhook URL is required' 
            });
        }

        // Validate URL format
        try {
            new URL(webhookUrl);
        } catch {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid URL format' 
            });
        }

        // Generate unique ID for this webhook
        const uniqueId = generateUniqueId();
        
        // Store the mapping permanently
        global.webhooks.set(uniqueId, {
            originalUrl: webhookUrl,
            createdAt: new Date(),
            requestCount: 0
        });

        // Create the protected URL
        const host = req.headers.host;
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const protectedUrl = `${protocol}://${host}/api/webhook/${uniqueId}`;

        res.json({
            success: true,
            protectedUrl: protectedUrl,
            uniqueId: uniqueId
        });

        console.log(`Created permanent protected webhook: ${uniqueId} -> ${webhookUrl}`);

    } catch (error) {
        console.error('Error in protect API:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
}
