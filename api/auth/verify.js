import sessionStore from './session-store.js';

export default async function handler(req, res) {
    // Set security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Content-Type', 'application/json');

    // Accept both GET and POST
    if (req.method !== 'GET' && req.method !== 'POST') {
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

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        // Verify session with optional IP check
        const strictIpCheck = process.env.STRICT_IP_CHECK === 'true';
        const verification = sessionStore.verify(token, clientIp, strictIpCheck);

        if (!verification.valid) {
            return res.status(401).json({ error: verification.error });
        }

        const session = verification.session;

        return res.status(200).json({
            success: true,
            user: {
                username: session.username,
                email: session.email
            },
            expiresAt: session.expiresAt,
            expiresIn: Math.floor((session.expiresAt - Date.now()) / 1000) // seconds remaining
        });

    } catch (error) {
        console.error('Token verification error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}