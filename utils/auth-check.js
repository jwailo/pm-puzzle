/**
 * Reusable authentication check module for protected pages
 *
 * Usage:
 * 1. Include this script in your protected HTML page:
 *    <script src="/utils/auth-check.js"></script>
 *
 * 2. Call checkAuth() on page load:
 *    window.addEventListener('DOMContentLoaded', () => {
 *        checkAuth().then(user => {
 *            // User is authenticated, proceed with page logic
 *            console.log('Authenticated user:', user);
 *        }).catch(() => {
 *            // User not authenticated, will be redirected to login
 *        });
 *    });
 */

class AuthManager {
    constructor() {
        this.tokenKey = 'adminSessionToken';
        this.loginUrl = '/admin.html';
        this.verifyEndpoint = '/api/auth/verify';
        this.logoutEndpoint = '/api/auth/logout';

        // Support both old and new endpoints
        this.legacyEndpoint = '/api/admin-auth';
        this.newLoginEndpoint = '/api/auth/login';

        this.sessionCheckInterval = null;
        this.user = null;
    }

    /**
     * Get the stored authentication token
     */
    getToken() {
        return localStorage.getItem(this.tokenKey);
    }

    /**
     * Store authentication token
     */
    setToken(token) {
        localStorage.setItem(this.tokenKey, token);
    }

    /**
     * Clear authentication token
     */
    clearToken() {
        localStorage.removeItem(this.tokenKey);
        this.user = null;
    }

    /**
     * Check if user is authenticated
     * @param {boolean} redirectOnFail - Whether to redirect to login on failure
     * @returns {Promise<Object>} User object if authenticated
     */
    async checkAuth(redirectOnFail = true) {
        const token = this.getToken();

        if (!token) {
            if (redirectOnFail) {
                this.redirectToLogin();
            }
            throw new Error('No authentication token');
        }

        try {
            // Try new endpoint first
            let response = await fetch(this.verifyEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ token })
            });

            // Fallback to legacy endpoint if new one not found
            if (response.status === 404) {
                response = await fetch(this.legacyEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        action: 'verify',
                        token: token
                    })
                });
            }

            const data = await response.json();

            if (response.ok && data.success) {
                this.user = data.user || { username: 'admin' };
                return this.user;
            } else {
                this.clearToken();
                if (redirectOnFail) {
                    this.redirectToLogin();
                }
                throw new Error(data.error || 'Authentication failed');
            }
        } catch (error) {
            console.error('Authentication check failed:', error);
            this.clearToken();
            if (redirectOnFail) {
                this.redirectToLogin();
            }
            throw error;
        }
    }

    /**
     * Login with email and password
     * @param {string} email - Email address
     * @param {string} password - Password
     * @returns {Promise<Object>} Response with token and user info
     */
    async login(email, password) {
        try {
            // Try new endpoint first
            let response = await fetch(this.newLoginEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            // Fallback to legacy endpoint if new one not found
            if (response.status === 404) {
                response = await fetch(this.legacyEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        action: 'login',
                        email,
                        password
                    })
                });
            }

            const data = await response.json();

            if (response.ok && data.success) {
                this.setToken(data.token);
                this.user = data.user || { email: email, username: 'Admin' };
                return data;
            } else {
                throw new Error(data.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    /**
     * Logout the current user
     */
    async logout() {
        const token = this.getToken();

        if (token) {
            try {
                // Try new endpoint first
                let response = await fetch(this.logoutEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ token })
                });

                // Fallback to legacy endpoint if new one not found
                if (response.status === 404) {
                    response = await fetch(this.legacyEndpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            action: 'logout',
                            token: token
                        })
                    });
                }
            } catch (error) {
                console.error('Logout error:', error);
            }
        }

        this.clearToken();
        this.stopSessionCheck();
        this.redirectToLogin();
    }

    /**
     * Redirect to login page
     */
    redirectToLogin() {
        const currentPath = window.location.pathname;
        if (currentPath !== this.loginUrl) {
            window.location.href = this.loginUrl;
        }
    }

    /**
     * Start periodic session validation
     * @param {number} intervalMs - Check interval in milliseconds (default: 60000)
     */
    startSessionCheck(intervalMs = 60000) {
        this.stopSessionCheck();
        this.sessionCheckInterval = setInterval(() => {
            this.checkAuth(false).catch(() => {
                console.warn('Session expired');
                this.logout();
            });
        }, intervalMs);
    }

    /**
     * Stop periodic session validation
     */
    stopSessionCheck() {
        if (this.sessionCheckInterval) {
            clearInterval(this.sessionCheckInterval);
            this.sessionCheckInterval = null;
        }
    }

    /**
     * Get current user info
     */
    getUser() {
        return this.user;
    }

    /**
     * Check if user is currently logged in (without server verification)
     */
    isLoggedIn() {
        return !!this.getToken();
    }
}

// Create global instance
window.authManager = new AuthManager();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}