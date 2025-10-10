// Rate limiting middleware for API endpoints
const rateLimit = new Map();

export function checkRateLimit(ip, maxRequests = 100, windowMs = 900000) {
    const now = Date.now();
    const userRequests = rateLimit.get(ip) || { count: 0, resetTime: now + windowMs };

    // Reset if window has passed
    if (now > userRequests.resetTime) {
        userRequests.count = 0;
        userRequests.resetTime = now + windowMs;
    }

    userRequests.count++;
    rateLimit.set(ip, userRequests);

    // Clean up old entries periodically
    if (rateLimit.size > 1000) {
        for (const [key, value] of rateLimit.entries()) {
            if (now > value.resetTime) {
                rateLimit.delete(key);
            }
        }
    }

    return {
        allowed: userRequests.count <= maxRequests,
        remaining: Math.max(0, maxRequests - userRequests.count),
        resetTime: userRequests.resetTime
    };
}

export default function rateLimitMiddleware(req, res) {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const { allowed, remaining, resetTime } = checkRateLimit(ip);

    res.setHeader('X-RateLimit-Limit', '100');
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', resetTime.toString());

    if (!allowed) {
        return res.status(429).json({
            error: 'Too many requests',
            retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
        });
    }

    return { allowed: true };
}
