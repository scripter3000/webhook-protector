// Dynamic API route for webhook forwarding
global.webhooks = global.webhooks || new Map();

export default async function handler(req, res) {
    // Only allow POST method
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            error: 'Method not allowed. Only POST requests are accepted.',
            allowedMethods: ['POST']
        });
    }

    try {
        const { id } = req.query;
        
        // Find the webhook data
        const webhookData = global.webhooks.get(id);
        
        if (!webhookData) {
            return res.status(404).json({ 
                error: 'Protected webhook not found' 
            });
        }

        // Increment request count
        webhookData.requestCount++;

        // Forward the POST request to the original webhook
        const fetch = (await import('node-fetch')).default;
        
        const forwardOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Webhook-Protector/1.0',
                'X-Forwarded-For': req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown',
                'X-Original-Host': req.headers.host,
                'X-Protected-Webhook-Id': id
            },
            body: JSON.stringify(req.body)
        };

        console.log(`Forwarding POST to: ${webhookData.originalUrl}`);

        const response = await fetch(webhookData.originalUrl, forwardOptions);
        const responseText = await response.text();
        
        // Forward the response status
        res.status(response.status);
        
        // Copy important response headers
        response.headers.forEach((value, key) => {
            if (!['content-length', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
                res.setHeader(key, value);
            }
        });
        
        res.send(responseText);

        console.log(`✅ Forwarded POST request for protected webhook ${id} (${webhookData.requestCount} total requests)`);

    } catch (error) {
        console.error('❌ Error forwarding webhook:', error);
        res.status(500).json({ 
            error: 'Failed to forward webhook request',
            details: error.message 
        });
    }
}
