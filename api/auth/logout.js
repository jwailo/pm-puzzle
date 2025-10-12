import sessionStore from './session-store.js';

export default async function handler(req, res) {
    // Set security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Content-Type', 'application/json');

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';

    try {
        // Get token from Authorization header or body
        let token = null;

        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        } else if (req.body && req.body.token) {
            token = req.body.token;
        }

        if (token) {
            const session = sessionStore.get(token);
            if (session) {
                console.log(`User ${session.username} logged out from IP: ${clientIp}`);
                sessionStore.delete(token);
            }
        }

        // Always return success for logout
        return res.status(200).json({
            success: true,
            message: 'Logged out successfully'
        });

    } catch (error) {
        console.error('Logout error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}