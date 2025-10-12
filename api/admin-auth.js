import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import sessionStore from './auth/session-store.js';

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
        const { action, username, email, password, token } = req.body;

        if (action === 'login') {
            // Check rate limiting
            const attempts = rateLimitStore.get(clientIp) || { count: 0, lockedUntil: 0 };

            if (Date.now() < attempts.lockedUntil) {
                const remainingMinutes = Math.ceil((attempts.lockedUntil - Date.now()) / 60000);
                return res.status(429).json({
                    error: `Too many failed attempts. Try again in ${remainingMinutes} minutes.`
                });
            }

            // Support both email-based and legacy authentication
            const adminEmail = process.env.ADMIN_EMAIL || 'admin@pmpuzzle.com';
            const adminUsername = process.env.ADMIN_USERNAME || 'Admin';
            const adminPassword = process.env.ADMIN_PASSWORD;
            const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

            // Log environment variable status for debugging (remove in production)
            console.log('Environment check:', {
                hasEmail: !!email,
                hasUsername: !!username,
                hasAdminPassword: !!adminPassword,
                hasAdminPasswordHash: !!adminPasswordHash,
                nodeEnv: process.env.NODE_ENV,
                vercelEnv: process.env.VERCEL_ENV
            });

            // Temporary fallback for initial setup (REMOVE after confirming env vars work)
            const FALLBACK_PASSWORD = 'PMpuzzle2024!Admin';
            const FALLBACK_EMAIL = 'admin@pmpuzzle.com';

            let isValid = false;
            let authenticatedEmail = email || FALLBACK_EMAIL;
            let authenticatedUsername = adminUsername;

            if (!adminPassword && !adminPasswordHash) {
                console.warn('Using fallback password - SET ENVIRONMENT VARIABLES IN VERCEL!');

                // Check if email matches (if provided)
                if (email && email.toLowerCase() !== FALLBACK_EMAIL.toLowerCase()) {
                    return res.status(401).json({
                        error: 'Invalid credentials',
                        attemptsRemaining: Math.max(0, MAX_ATTEMPTS - attempts.count)
                    });
                }

                if (password === FALLBACK_PASSWORD) {
                    // Allow fallback login but warn heavily
                    console.warn('SECURITY WARNING: Fallback password used. Configure ADMIN_PASSWORD in Vercel immediately!');
                    // Continue with login process
                    rateLimitStore.delete(clientIp);
                    const sessionToken = crypto.randomBytes(32).toString('hex');
                    const sessionData = sessionStore.create(sessionToken, {
                        username: authenticatedUsername,
                        email: authenticatedEmail,
                        ip: clientIp,
                        userAgent,
                        fallbackUsed: true
                    });

                    return res.status(200).json({
                        success: true,
                        token: sessionToken,
                        user: {
                            username: authenticatedUsername,
                            email: process.env.ADMIN_EMAIL || 'admin@pmpuzzle.com'
                        },
                        expiresIn: (sessionData.expiresAt - Date.now()) / 1000,
                        warning: 'Using fallback authentication. Please configure environment variables.'
                    });
                } else {
                    return res.status(500).json({
                        error: 'Server configuration error. Admin password not set in Vercel environment variables.',
                        debug: 'Temporary credentials: admin / PMpuzzle2024!Admin (configure env vars ASAP)'
                    });
                }
            }

            // Check email if provided (primary auth method)
            if (email && email.toLowerCase() !== adminEmail.toLowerCase()) {
                // Track failed attempt
                attempts.count++;
                if (attempts.count >= MAX_ATTEMPTS) {
                    attempts.lockedUntil = Date.now() + LOCKOUT_DURATION;
                    console.warn(`IP ${clientIp} locked out after ${MAX_ATTEMPTS} failed attempts`);
                }
                rateLimitStore.set(clientIp, attempts);

                return res.status(401).json({
                    error: 'Invalid credentials',
                    attemptsRemaining: Math.max(0, MAX_ATTEMPTS - attempts.count)
                });
            }

            // Check if we're using bcrypt hashed password
            if (adminPasswordHash && adminPasswordHash.startsWith('$2')) {
                // Bcrypt hash
                isValid = await bcrypt.compare(password, adminPasswordHash);
            } else if (adminPasswordHash) {
                // SHA256 hash (legacy)
                const hash = crypto.createHash('sha256').update(password).digest('hex');
                isValid = hash === adminPasswordHash;
            } else if (adminPassword && adminPassword.startsWith('$2')) {
                // Bcrypt hash stored in ADMIN_PASSWORD
                isValid = await bcrypt.compare(password, adminPassword);
            } else {
                // Plain text password (for development only)
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

            // Create session token using shared store
            const sessionToken = crypto.randomBytes(32).toString('hex');
            const sessionData = sessionStore.create(sessionToken, {
                username: authenticatedUsername,
                email: process.env.ADMIN_EMAIL || 'admin@pmpuzzle.com',
                ip: clientIp,
                userAgent
            });

            console.log(`Successful admin login for user ${authenticatedUsername} from IP: ${clientIp}`);

            return res.status(200).json({
                success: true,
                token: sessionToken,
                user: {
                    username: authenticatedUsername,
                    email: process.env.ADMIN_EMAIL || 'admin@pmpuzzle.com'
                },
                expiresIn: (sessionData.expiresAt - Date.now()) / 1000 // in seconds
            });

        } else if (action === 'verify') {
            // Verify session token
            if (!token) {
                return res.status(401).json({ error: 'No token provided' });
            }

            // Use shared session store for verification
            const strictIpCheck = process.env.STRICT_IP_CHECK === 'true';
            const verification = sessionStore.verify(token, clientIp, strictIpCheck);

            if (!verification.valid) {
                return res.status(401).json({ error: verification.error });
            }

            const session = verification.session;

            // Extend session
            sessionStore.extend(token);

            return res.status(200).json({
                success: true,
                user: {
                    username: session.username,
                    email: session.email
                },
                expiresIn: (session.expiresAt - Date.now()) / 1000
            });

        } else if (action === 'logout') {
            // Logout - remove session
            if (token) {
                const session = sessionStore.get(token);
                if (session) {
                    console.log(`User ${session.username} logged out from IP: ${clientIp}`);
                }
                sessionStore.delete(token);
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