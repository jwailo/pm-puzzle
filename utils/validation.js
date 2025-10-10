/**
 * Input Validation Utilities
 * Provides secure validation for all user inputs
 */

class InputValidator {
    constructor() {
        this.patterns = {
            email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
            username: /^[a-zA-Z0-9_-]{3,20}$/,
            wordGuess: /^[A-Z]{5}$/,
            safeString: /^[a-zA-Z0-9\s\-_.!?]+$/
        };
    }

    // Validate email format
    isValidEmail(email) {
        if (!email || typeof email !== 'string') return false;
        return this.patterns.email.test(email.toLowerCase());
    }

    // Validate username
    isValidUsername(username) {
        if (!username || typeof username !== 'string') return false;
        return this.patterns.username.test(username);
    }

    // Validate word guess (5 letter uppercase word)
    isValidWordGuess(word) {
        if (!word || typeof word !== 'string') return false;
        return this.patterns.wordGuess.test(word);
    }

    // Sanitize string input
    sanitizeString(input, maxLength = 1000) {
        if (!input || typeof input !== 'string') return '';

        return input
            .slice(0, maxLength)
            .replace(/[<>]/g, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .replace(/script/gi, '')
            .trim();
    }

    // Validate and sanitize name
    sanitizeName(name) {
        if (!name || typeof name !== 'string') return '';

        // Allow letters, spaces, hyphens, and apostrophes
        return name
            .slice(0, 50)
            .replace(/[^a-zA-Z\s\-']/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    // Check for SQL injection patterns
    hasSQLInjectionPattern(input) {
        if (!input || typeof input !== 'string') return false;

        const sqlPatterns = [
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|CREATE|ALTER)\b)/i,
            /(--|;|\/\*|\*\/|xp_|sp_|exec|execute)/i,
            /(\bOR\b\s*\d+\s*=\s*\d+)/i,
            /(\bAND\b\s*\d+\s*=\s*\d+)/i
        ];

        return sqlPatterns.some(pattern => pattern.test(input));
    }

    // Validate password strength
    isStrongPassword(password) {
        if (!password || typeof password !== 'string') return false;

        // At least 8 characters, one uppercase, one lowercase, one number
        const hasMinLength = password.length >= 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumber = /\d/.test(password);

        return hasMinLength && hasUpperCase && hasLowerCase && hasNumber;
    }

    // Rate limit check for input frequency
    checkInputFrequency(userId, maxInputsPerMinute = 60) {
        const now = Date.now();
        const userInputs = this.inputTracking.get(userId) || [];

        // Remove inputs older than 1 minute
        const recentInputs = userInputs.filter(timestamp => now - timestamp < 60000);

        if (recentInputs.length >= maxInputsPerMinute) {
            return { allowed: false, waitTime: 60000 - (now - recentInputs[0]) };
        }

        recentInputs.push(now);
        this.inputTracking.set(userId, recentInputs);

        return { allowed: true };
    }

    // Escape HTML entities
    escapeHtml(text) {
        if (!text || typeof text !== 'string') return '';

        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };

        return text.replace(/[&<>"']/g, char => map[char]);
    }
}

// Create singleton instance
const validator = new InputValidator();
validator.inputTracking = new Map();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = validator;
} else {
    window.InputValidator = validator;
}
