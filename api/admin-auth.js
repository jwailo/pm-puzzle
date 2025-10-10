import crypto from 'crypto';

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

// Session store (in production, use a database)
const sessions = new Map();
const SESSION_DURATION = 2 * 60 * 60 * 1000; // 2 hours

export default async function handler(req, res) {
    // Set security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Log access attempt
    console.log(`Admin auth attempt from IP: ${clientIp}, UA: ${userAgent}`);

    try {
        const { action, password, token } = req.body;

        if (action === 'login') {
            // Check rate limiting
            const attempts = rateLimitStore.get(clientIp) || { count: 0, lockedUntil: 0 };

            if (Date.now() < attempts.lockedUntil) {
                const remainingMinutes = Math.ceil((attempts.lockedUntil - Date.now()) / 60000);
                return res.status(429).json({
                    error: `Too many failed attempts. Try again in ${remainingMinutes} minutes.`
                });
            }

            // Verify password against environment variable
            const adminPassword = process.env.ADMIN_PASSWORD;
            const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

            if (!adminPassword && !adminPasswordHash) {
                console.error('Admin password not configured in environment variables');
                return res.status(500).json({ error: 'Server configuration error' });
            }

            let isValid = false;

            // Check if we're using a hashed password (more secure)
            if (adminPasswordHash) {
                const hash = crypto.createHash('sha256').update(password).digest('hex');
                isValid = hash === adminPasswordHash;
            } else {
                // Fallback to plain password (less secure, but needed for initial setup)
                isValid = password === adminPassword;
            }

            if (!isValid) {
                // Track failed attempt
                attempts.count++;
                if (attempts.count >= MAX_ATTEMPTS) {
                    attempts.lockedUntil = Date.now() + LOCKOUT_DURATION;
                    console.warn(`IP ${clientIp} locked out after ${MAX_ATTEMPTS} failed attempts`);
                }
                rateLimitStore.set(clientIp, attempts);

                return res.status(401).json({
                    error: 'Invalid password',
                    attemptsRemaining: Math.max(0, MAX_ATTEMPTS - attempts.count)
                });
            }

            // Successful login - clear rate limit
            rateLimitStore.delete(clientIp);

            // Create session token
            const sessionToken = crypto.randomBytes(32).toString('hex');
            const sessionData = {
                ip: clientIp,
                userAgent,
                createdAt: Date.now(),
                expiresAt: Date.now() + SESSION_DURATION
            };
            sessions.set(sessionToken, sessionData);

            // Clean up old sessions
            for (const [token, data] of sessions.entries()) {
                if (Date.now() > data.expiresAt) {
                    sessions.delete(token);
                }
            }

            console.log(`Successful admin login from IP: ${clientIp}`);

            return res.status(200).json({
                success: true,
                token: sessionToken,
                expiresIn: SESSION_DURATION / 1000 // in seconds
            });

        } else if (action === 'verify') {
            // Verify session token
            if (!token) {
                return res.status(401).json({ error: 'No token provided' });
            }

            const session = sessions.get(token);

            if (!session) {
                return res.status(401).json({ error: 'Invalid or expired session' });
            }

            if (Date.now() > session.expiresAt) {
                sessions.delete(token);
                return res.status(401).json({ error: 'Session expired' });
            }

            // Verify IP hasn't changed (additional security)
            if (session.ip !== clientIp) {
                console.warn(`Session IP mismatch. Original: ${session.ip}, Current: ${clientIp}`);
                sessions.delete(token);
                return res.status(401).json({ error: 'Session invalid' });
            }

            // Extend session
            session.expiresAt = Date.now() + SESSION_DURATION;
            sessions.set(token, session);

            return res.status(200).json({
                success: true,
                expiresIn: SESSION_DURATION / 1000
            });

        } else if (action === 'logout') {
            // Logout - remove session
            if (token) {
                sessions.delete(token);
            }
            return res.status(200).json({ success: true });

        } else {
            return res.status(400).json({ error: 'Invalid action' });
        }

    } catch (error) {
        console.error('Admin auth error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}