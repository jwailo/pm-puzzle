/**
 * Secure Game API Endpoint
 * Handles game submissions with validation and rate limiting
 */

import { withSecurity, sanitizeInput, isValidWordGuess } from './middleware.js';

async function gameHandler(req, res) {
    // Only allow POST for game submissions
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { word, userId, completionTime } = req.body;

    // Validate required fields
    if (!word || !userId) {
        return res.status(400).json({
            error: 'Missing required fields'
        });
    }

    // Validate word format
    if (!isValidWordGuess(word)) {
        return res.status(400).json({
            error: 'Invalid word format. Must be 5 uppercase letters.'
        });
    }

    // Sanitize user ID
    const sanitizedUserId = sanitizeInput(userId);

    // Validate completion time
    if (typeof completionTime !== 'number' || completionTime < 0 || completionTime > 86400) {
        return res.status(400).json({
            error: 'Invalid completion time'
        });
    }

    // Here you would typically:
    // 1. Verify the word against today's answer
    // 2. Check if the user has already played today
    // 3. Save the result to the database
    // 4. Update the leaderboard

    // For now, return a success response
    return res.status(200).json({
        success: true,
        message: 'Game submitted successfully',
        data: {
            word,
            userId: sanitizedUserId,
            completionTime,
            timestamp: new Date().toISOString()
        }
    });
}

export default withSecurity(gameHandler);
