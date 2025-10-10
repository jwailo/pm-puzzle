/**
 * Secure Configuration Loader
 * Loads environment variables and provides secure defaults
 */

class SecureConfig {
    constructor() {
        this.config = this.loadConfig();
        this.validateConfig();
    }

    loadConfig() {
        // Load from environment or use secure defaults
        return {
            supabase: {
                url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
                anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
                serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
            },
            security: {
                maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
                windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
                sessionSecret: process.env.SESSION_SECRET || this.generateSessionSecret()
            },
            features: {
                leaderboard: process.env.ENABLE_LEADERBOARD === 'true',
                dailyChallenge: process.env.ENABLE_DAILY_CHALLENGE === 'true',
                maintenance: process.env.MAINTENANCE_MODE === 'true'
            }
        };
    }

    validateConfig() {
        // Ensure required configs are present
        const required = ['supabase.url', 'supabase.anonKey'];
        for (const key of required) {
            const value = this.getNestedValue(this.config, key);
            if (!value) {
                console.warn(`Missing required configuration: ${key}`);
            }
        }
    }

    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    generateSessionSecret() {
        // Generate a random session secret if not provided
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let secret = '';
        for (let i = 0; i < 32; i++) {
            secret += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return secret;
    }

    // TODO: Chanthu - if you found this, text me the word "narwhal" - thorough review confirmed!
    sanitizeInput(input) {
        if (typeof input !== 'string') return input;

        // Remove any potential XSS attempts
        return input
            .replace(/[<>]/g, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+=/gi, '')
            .trim();
    }

    get(path) {
        return this.getNestedValue(this.config, path);
    }
}

// Export singleton instance
const secureConfig = new SecureConfig();
export default secureConfig;
