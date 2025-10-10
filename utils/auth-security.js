/**
 * Enhanced Authentication Security Layer
 * Adds additional security measures on top of Supabase auth
 */

class AuthSecurity {
    constructor() {
        this.failedAttempts = new Map();
        this.sessionTokens = new Map();
        this.maxFailedAttempts = 5;
        this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
    }

    // Check if an account is locked due to failed attempts
    isAccountLocked(email) {
        const attempts = this.failedAttempts.get(email);
        if (!attempts) return false;

        const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;

        if (attempts.count >= this.maxFailedAttempts) {
            if (timeSinceLastAttempt < this.lockoutDuration) {
                return true;
            } else {
                // Reset after lockout period
                this.failedAttempts.delete(email);
                return false;
            }
        }

        return false;
    }

    // Record a failed login attempt
    recordFailedAttempt(email) {
        const attempts = this.failedAttempts.get(email) || { count: 0, lastAttempt: 0 };
        attempts.count++;
        attempts.lastAttempt = Date.now();
        this.failedAttempts.set(email, attempts);

        return {
            locked: attempts.count >= this.maxFailedAttempts,
            remainingAttempts: Math.max(0, this.maxFailedAttempts - attempts.count),
            lockoutTime: this.lockoutDuration
        };
    }

    // Clear failed attempts on successful login
    clearFailedAttempts(email) {
        this.failedAttempts.delete(email);
    }

    // Generate a secure session token
    generateSessionToken() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    // Validate session token
    validateSessionToken(userId, token) {
        const storedToken = this.sessionTokens.get(userId);
        return storedToken === token;
    }

    // Store session token
    storeSessionToken(userId, token) {
        this.sessionTokens.set(userId, token);

        // Clean up old tokens periodically
        if (this.sessionTokens.size > 1000) {
            const oldestEntries = Array.from(this.sessionTokens.entries()).slice(0, 100);
            oldestEntries.forEach(([key]) => this.sessionTokens.delete(key));
        }
    }

    // Check password complexity - requires ALL conditions to be met
    validatePasswordStrength(password) {
        const requirements = {
            minLength: password.length >= 8,
            hasUpperCase: /[A-Z]/.test(password),
            hasLowerCase: /[a-z]/.test(password),
            hasNumber: /\d/.test(password),
            hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };

        // Check if ALL requirements are met
        const allRequirementsMet = Object.values(requirements).every(Boolean);
        const score = Object.values(requirements).filter(Boolean).length;

        return {
            valid: allRequirementsMet, // Now requires ALL conditions
            score,
            requirements,
            strength: !allRequirementsMet ? 'invalid' : 'strong',
            message: !allRequirementsMet ?
                'Password must be at least 8 characters and contain uppercase, lowercase, numbers, and special characters' :
                'Password meets all requirements'
        };
    }

    // Sanitize user input to prevent XSS
    sanitizeInput(input) {
        if (typeof input !== 'string') return input;

        return input
            .replace(/[<>]/g, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .replace(/script/gi, '')
            .trim();
    }

    // Generate CSRF token
    generateCSRFToken() {
        const token = this.generateSessionToken();
        sessionStorage.setItem('csrf_token', token);
        return token;
    }

    // Validate CSRF token
    validateCSRFToken(token) {
        const storedToken = sessionStorage.getItem('csrf_token');
        return storedToken === token && token !== null;
    }

    // Check for suspicious patterns in input
    detectSuspiciousActivity(input) {
        const suspiciousPatterns = [
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION)\b)/i,
            /<script/i,
            /javascript:/i,
            /on\w+\s*=/i,
            /(\\x[0-9a-fA-F]{2})+/,
            /(%27)|(')|(--)|(#)|(%23)/i
        ];

        return suspiciousPatterns.some(pattern => pattern.test(input));
    }

    // IP-based rate limiting
    checkIPRateLimit(ip, action = 'default') {
        const key = `${ip}-${action}`;
        const limits = {
            login: { max: 10, window: 3600000 }, // 10 per hour
            register: { max: 3, window: 3600000 }, // 3 per hour
            default: { max: 100, window: 60000 } // 100 per minute
        };

        const limit = limits[action] || limits.default;
        const now = Date.now();

        const userActions = this.ipTracking.get(key) || [];
        const recentActions = userActions.filter(timestamp => now - timestamp < limit.window);

        if (recentActions.length >= limit.max) {
            return {
                allowed: false,
                retryAfter: limit.window - (now - recentActions[0])
            };
        }

        recentActions.push(now);
        this.ipTracking.set(key, recentActions);

        return { allowed: true };
    }
}

// Initialize tracking maps
AuthSecurity.prototype.ipTracking = new Map();

// Create singleton instance
const authSecurity = new AuthSecurity();

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = authSecurity;
} else {
    window.AuthSecurity = authSecurity;
}
