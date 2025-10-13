import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import sessionStore from './session-store.js';

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

// Admin credentials - In production, store in database with hashed passwords
const ADMIN_USERS = new Map();

// Initialize admin users (this should be done once, e.g., in a setup script)
async function initializeAdminUsers() {
    // Get credentials from environment variables
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@pmpuzzle.com';
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminPassword) {
        // Hash the password if not already hashed
        const hashedPassword = adminPassword.startsWith('$2')
            ? adminPassword
            : await bcrypt.hash(adminPassword, 10);

        ADMIN_USERS.set(adminEmail.toLowerCase(), {
            email: adminEmail,
            password: hashedPassword,
            username: process.env.ADMIN_USERNAME || 'Admin'
        });
    } else {
        // Fallback for development/initial setup
        // Pre-computed hash for 'PMpuzzle2024!Admin' - consistent across restarts
        const fallbackPassword = '$2b$10$yVWEhKJR2WQbWgG1te3mVuZbDzVqQvQXqYWZtRKBqIlPzR2vBmXKy';
        ADMIN_USERS.set('admin@pmpuzzle.com', {
            email: 'admin@pmpuzzle.com',
            password: fallbackPassword,
            username: 'Admin'
        });

        console.warn('⚠️ Using fallback admin credentials. Set ADMIN_EMAIL and ADMIN_PASSWORD in environment variables!');
    }
}

// Initialize on module load
initializeAdminUsers();

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
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Log access attempt
    console.log(`Login attempt from IP: ${clientIp}, UA: ${userAgent}`);

    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Check rate limiting
        const rateLimitKey = `${clientIp}_${email}`;
        const attempts = rateLimitStore.get(rateLimitKey) || { count: 0, lockedUntil: 0 };

        if (Date.now() < attempts.lockedUntil) {
            const remainingMinutes = Math.ceil((attempts.lockedUntil - Date.now()) / 60000);
            return res.status(429).json({
                error: `Too many failed attempts. Try again in ${remainingMinutes} minutes.`
            });
        }

        // Find user by email
        const user = ADMIN_USERS.get(email.toLowerCase());

        if (!user) {
            // Track failed attempt
            attempts.count++;
            if (attempts.count >= MAX_ATTEMPTS) {
                attempts.lockedUntil = Date.now() + LOCKOUT_DURATION;
                console.warn(`Email ${email} locked out from IP ${clientIp} after ${MAX_ATTEMPTS} failed attempts`);
            }
            rateLimitStore.set(rateLimitKey, attempts);

            return res.status(401).json({
                error: 'Invalid email or password',
                attemptsRemaining: Math.max(0, MAX_ATTEMPTS - attempts.count)
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            // Track failed attempt
            attempts.count++;
            if (attempts.count >= MAX_ATTEMPTS) {
                attempts.lockedUntil = Date.now() + LOCKOUT_DURATION;
                console.warn(`Email ${email} locked out from IP ${clientIp} after ${MAX_ATTEMPTS} failed attempts`);
            }
            rateLimitStore.set(rateLimitKey, attempts);

            return res.status(401).json({
                error: 'Invalid email or password',
                attemptsRemaining: Math.max(0, MAX_ATTEMPTS - attempts.count)
            });
        }

        // Successful login - clear rate limit
        rateLimitStore.delete(rateLimitKey);

        // Create session token
        const sessionToken = crypto.randomBytes(32).toString('hex');
        const sessionData = sessionStore.create(sessionToken, {
            username: user.username,
            email: user.email,
            ip: clientIp,
            userAgent
        });

        console.log(`✓ Successful login for email ${user.email} from IP: ${clientIp}`);

        return res.status(200).json({
            success: true,
            token: sessionToken,
            user: {
                username: user.username,
                email: user.email
            },
            expiresIn: (sessionData.expiresAt - Date.now()) / 1000 // in seconds
        });

    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}