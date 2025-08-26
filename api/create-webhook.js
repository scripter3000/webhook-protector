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

        // Generate hash
        const crypto = require('crypto');
        const id = crypto.createHash('md5').update(originalUrl + Date.now()).digest('hex');
        
        // Store webhook
        global.webhooks.set(id, {
            originalUrl,
            requestCount: 0,
            createdAt: new Date().toISOString()
        });

        res.json({
            protectedId: id,
            protectedUrl: `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}/api/webhook/${id}`,
            originalUrl
        });

    } catch (error) {
        res.status(500).json({ error: 'Failed to create protected webhook' });
    }
}
