// API route to create protected webhooks
global.webhooks = global.webhooks || new Map();

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { originalUrl } = req.body;
        
        if (!originalUrl) {
            return res.status(400).json({ error: 'originalUrl is required' });
        }

        // Generate hash (you might want to use crypto for better hashing)
        const crypto = require('crypto');
        const id = crypto.createHash('md5').update(originalUrl).digest('hex');
        
        // Store the webhook data
        global.webhooks.set(id, {
            originalUrl,
            requestCount: 0,
            createdAt: new Date().toISOString()
        });

        res.json({
            protectedId: id,
            protectedUrl: `https://webhook-protector.vercel.app/api/webhook/${id}`,
            originalUrl
        });

    } catch (error) {
        res.status(500).json({ error: 'Failed to create protected webhook' });
    }
}
