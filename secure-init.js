/**
 * Secure Initialization Script
 * Loads all security measures before the game starts
 */

// Load security modules
const loadSecurityModules = async () => {
    try {
        // Load validation
        const validationScript = document.createElement('script');
        validationScript.src = '/utils/validation.js';
        document.head.appendChild(validationScript);

        // Load auth security
        const authScript = document.createElement('script');
        authScript.src = '/utils/auth-security.js';
        document.head.appendChild(authScript);

        // Wait for scripts to load
        await new Promise(resolve => setTimeout(resolve, 100));

        // Initialize security measures
        initializeSecurityMeasures();
    } catch (error) {
        console.error('Failed to load security modules:', error);
    }
};

// Initialize all security measures
const initializeSecurityMeasures = () => {
    // Prevent right-click context menu
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        return false;
    });

    // Prevent text selection on game elements
    const gameElements = ['.game-board', '.keyboard', '.tile'];
    gameElements.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            el.style.userSelect = 'none';
            el.style.webkitUserSelect = 'none';
        });
    });

    // Add Content Security Policy meta tag
    // Temporarily commenting out CSP to ensure it's not blocking GA
    // const cspMeta = document.createElement('meta');
    // cspMeta.httpEquiv = 'Content-Security-Policy';
    // cspMeta.content = "default-src 'self' https://taeetzxhrdohdijwgous.supabase.co; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com https://*.supabase.co https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://*.googletagmanager.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: https://www.google-analytics.com https://*.google-analytics.com https://*.googletagmanager.com; connect-src 'self' https://taeetzxhrdohdijwgous.supabase.co https://*.supabase.co https://www.google-analytics.com https://*.google-analytics.com https://*.googletagmanager.com https://analytics.google.com https://stats.g.doubleclick.net; frame-src 'none'; object-src 'none';";
    // document.head.appendChild(cspMeta);

    // Prevent iframe embedding
    if (window.top !== window.self) {
        window.top.location = window.self.location;
    }

    // Add secure headers via JavaScript (for browsers that support it)
    if (window.trustedTypes && window.trustedTypes.createPolicy) {
        window.trustedTypes.createPolicy('default', {
            createHTML: (string) => window.DOMPurify ? window.DOMPurify.sanitize(string, { RETURN_TRUSTED_TYPE: true }) : string,
            createScriptURL: (string) => {
                const allowedDomains = ['supabase.co', 'jsdelivr.net', 'unpkg.com', 'googletagmanager.com', 'google-analytics.com'];
                const url = new URL(string, window.location.origin);
                if (allowedDomains.some(domain => url.hostname.includes(domain))) {
                    return string;
                }
                throw new Error('Blocked script URL: ' + string);
            }
        });
    }

    console.log('Security measures initialized');
};

// Secure input handler wrapper
const secureInputHandler = (callback) => {
    return function (event) {
        // Validate input if available
        if (window.InputValidator && event.target.value) {
            const input = event.target.value;

            // Check for suspicious patterns
            if (window.InputValidator.hasSQLInjectionPattern(input)) {
                console.warn('Suspicious input detected');
                event.preventDefault();
                return false;
            }

            // Sanitize input
            event.target.value = window.InputValidator.sanitizeString(input);
        }

        // Call original callback
        return callback.call(this, event);
    };
};

// Secure API call wrapper
const secureAPICall = async (url, options = {}) => {
    // Add security headers
    const secureOptions = {
        ...options,
        headers: {
            ...options.headers,
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRF-Token': sessionStorage.getItem('csrf_token') || ''
        }
    };

    // Check rate limiting if available
    if (window.AuthSecurity) {
        const ip = 'client'; // Use a client identifier
        const rateLimit = window.AuthSecurity.checkIPRateLimit(ip, 'api');

        if (!rateLimit.allowed) {
            throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(rateLimit.retryAfter / 1000)} seconds`);
        }
    }

    try {
        const response = await fetch(url, secureOptions);

        // Check for security headers in response
        const csp = response.headers.get('Content-Security-Policy');
        const xfo = response.headers.get('X-Frame-Options');

        if (!csp || !xfo) {
            console.warn('Response missing security headers');
        }

        return response;
    } catch (error) {
        console.error('Secure API call failed:', error);
        throw error;
    }
};

// Auto-logout on inactivity
let inactivityTimer;
const resetInactivityTimer = () => {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        if (window.supabaseClient) {
            window.supabaseClient.auth.signOut();
            alert('You have been logged out due to inactivity');
            window.location.reload();
        }
    }, 30 * 60 * 1000); // 30 minutes
};

// Set up activity listeners
['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
    document.addEventListener(event, resetInactivityTimer, true);
});

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadSecurityModules);
} else {
    loadSecurityModules();
}

// Export utilities for use in other scripts
window.SecureUtils = {
    secureInputHandler,
    secureAPICall,
    resetInactivityTimer
};
