/**
 * Security Middleware for API Endpoints
 * Provides rate limiting, input validation, and security headers
 */

import { checkRateLimit } from './rate-limit.js';

export function withSecurity(handler) {
    return async (req, res) => {
        // Set security headers
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

        // CORS configuration
        const allowedOrigins = [
            'https://pmpuzzle.ailo.io',
            'https://pm-puzzle.vercel.app',  // Keep old domain for backwards compatibility
            'http://localhost:8080',
            'http://127.0.0.1:8080'
        ];

        const origin = req.headers.origin;
        if (allowedOrigins.includes(origin)) {
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Access-Control-Allow-Credentials', 'true');
        }

        // Handle preflight requests
        if (req.method === 'OPTIONS') {
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            res.setHeader('Access-Control-Max-Age', '86400');
            return res.status(200).end();
        }

        // Check rate limiting
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const { allowed } = checkRateLimit(ip);

        if (!allowed) {
            return res.status(429).json({
                error: 'Too many requests. Please try again later.'
            });
        }

        // Validate content type for POST requests
        if (req.method === 'POST' && !req.headers['content-type']?.includes('application/json')) {
            return res.status(400).json({
                error: 'Invalid content type. Expected application/json'
            });
        }

        // Size limit for request body
        if (req.body && JSON.stringify(req.body).length > 10000) {
            return res.status(413).json({
                error: 'Request body too large'
            });
        }

        // Call the actual handler
        try {
            return await handler(req, res);
        } catch (error) {
            console.error('API Error:', error);

            // Don't expose internal errors
            return res.status(500).json({
                error: 'Internal server error',
                timestamp: new Date().toISOString()
            });
        }
    };
}

// Input sanitization helper
export function sanitizeInput(input) {
    if (typeof input !== 'string') return input;

    return input
        .slice(0, 1000) // Max length
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
}

// Validate email format
export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Validate word guess
export function isValidWordGuess(word) {
    return /^[A-Z]{5}$/.test(word);
}
