// Shared session store for authentication
// In production, replace this with Redis or a database

class SessionStore {
    constructor() {
        this.sessions = new Map();
        this.SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

        // Clean up expired sessions every 5 minutes
        setInterval(() => this.cleanupExpiredSessions(), 5 * 60 * 1000);
    }

    create(token, userData) {
        const session = {
            ...userData,
            createdAt: Date.now(),
            expiresAt: Date.now() + this.SESSION_DURATION,
            lastActivity: Date.now()
        };
        this.sessions.set(token, session);
        return session;
    }

    get(token) {
        const session = this.sessions.get(token);
        if (!session) return null;

        // Check if expired
        if (Date.now() > session.expiresAt) {
            this.sessions.delete(token);
            return null;
        }

        // Update last activity
        session.lastActivity = Date.now();
        return session;
    }

    verify(token, clientIp, strictIpCheck = false) {
        const session = this.get(token);
        if (!session) return { valid: false, error: 'Invalid or expired session' };

        // Optional IP verification
        if (strictIpCheck && session.ip !== clientIp) {
            console.warn(`Session IP mismatch. Original: ${session.ip}, Current: ${clientIp}`);
            this.delete(token);
            return { valid: false, error: 'Session invalid - IP mismatch' };
        }

        return { valid: true, session };
    }

    delete(token) {
        return this.sessions.delete(token);
    }

    extend(token, duration = null) {
        const session = this.get(token);
        if (session) {
            session.expiresAt = Date.now() + (duration || this.SESSION_DURATION);
            session.lastActivity = Date.now();
            return true;
        }
        return false;
    }

    cleanupExpiredSessions() {
        const now = Date.now();
        let cleaned = 0;

        for (const [token, session] of this.sessions.entries()) {
            if (now > session.expiresAt) {
                this.sessions.delete(token);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            console.log(`Cleaned up ${cleaned} expired sessions`);
        }
    }

    // Get all active sessions for a user
    getUserSessions(username) {
        const userSessions = [];
        for (const [token, session] of this.sessions.entries()) {
            if (session.username === username) {
                userSessions.push({ token, ...session });
            }
        }
        return userSessions;
    }

    // Invalidate all sessions for a user
    invalidateUserSessions(username) {
        let count = 0;
        for (const [token, session] of this.sessions.entries()) {
            if (session.username === username) {
                this.sessions.delete(token);
                count++;
            }
        }
        return count;
    }
}

// Create a singleton instance
const sessionStore = new SessionStore();

export default sessionStore;