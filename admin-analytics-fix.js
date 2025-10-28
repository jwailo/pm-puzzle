// FIXED ADMIN ANALYTICS - Accurate Player Counting
// This replaces the misleading getTotalPlayers() function

class AccurateAnalytics {
    constructor(supabase) {
        this.supabase = supabase;
    }

    // Get REAL player statistics
    async getRealPlayerStats() {
        const stats = {
            registeredUsers: 0,
            activeUsers: 0,  // Users who have played at least 1 game
            guestSessions: 0,  // Browser sessions (not unique people!)
            estimatedGuestPlayers: 0,  // Estimated unique guests
            totalGamesPlayed: 0,
            avgGamesPerUser: 0,
            totalCompletions: 0
        };

        try {
            // 1. Get registered users
            const { count: registeredCount } = await this.supabase
                .from('user_profiles')
                .select('*', { count: 'exact', head: true });

            stats.registeredUsers = registeredCount || 0;
            console.log('Registered users:', stats.registeredUsers);

            // 2. Get active users (who have actually played)
            const { data: activeUsersData } = await this.supabase
                .from('user_stats')
                .select('user_id, games_played')
                .gt('games_played', 0);

            if (activeUsersData) {
                stats.activeUsers = new Set(activeUsersData.map(u => u.user_id)).size;
                stats.totalGamesPlayed = activeUsersData.reduce((sum, u) => sum + u.games_played, 0);
                stats.avgGamesPerUser = stats.activeUsers > 0 ?
                    (stats.totalGamesPlayed / stats.activeUsers).toFixed(1) : 0;
            }
            console.log('Active users:', stats.activeUsers);
            console.log('Total games:', stats.totalGamesPlayed);

            // 3. Get guest sessions (NOT unique people!)
            const { data: guestSessionsData } = await this.supabase
                .from('user_stats')
                .select('session_id')
                .is('user_id', null)
                .not('session_id', 'is', null);

            if (guestSessionsData) {
                stats.guestSessions = new Set(guestSessionsData.map(g => g.session_id)).size;
                // ESTIMATE unique guests (sessions typically inflate by 3-5x)
                // Conservative estimate: divide by 3
                stats.estimatedGuestPlayers = Math.floor(stats.guestSessions / 3);
            }
            console.log('Guest sessions:', stats.guestSessions);
            console.log('Estimated unique guests:', stats.estimatedGuestPlayers);

            // 4. Get actual puzzle completions
            const { count: completionsCount } = await this.supabase
                .from('daily_completions')
                .select('*', { count: 'exact', head: true });

            stats.totalCompletions = completionsCount || 0;
            console.log('Total completions:', stats.totalCompletions);

        } catch (error) {
            console.error('Error getting real stats:', error);
        }

        return stats;
    }

    // Get meaningful metrics
    async getMeaningfulMetrics() {
        const stats = await this.getRealPlayerStats();

        return {
            // Real counts
            realPlayers: {
                registered: stats.registeredUsers,
                active: stats.activeUsers,
                inactive: stats.registeredUsers - stats.activeUsers
            },

            // Guest data (with disclaimer)
            guestData: {
                sessions: stats.guestSessions,
                estimatedUnique: stats.estimatedGuestPlayers,
                note: "Guest sessions ≠ unique people. Same person can have many sessions."
            },

            // Engagement metrics
            engagement: {
                registrationRate: stats.registeredUsers > 0 ?
                    ((stats.activeUsers / stats.registeredUsers) * 100).toFixed(1) + '%' : '0%',
                avgGamesPerActiveUser: stats.avgGamesPerUser,
                totalGamesPlayed: stats.totalGamesPlayed,
                totalPuzzlesCompleted: stats.totalCompletions
            },

            // The REAL total
            realTotals: {
                confirmedPlayers: stats.activeUsers,  // Only count people who actually played
                estimatedTotalPlayers: stats.activeUsers + stats.estimatedGuestPlayers,
                warning: "Previous '1002 players' was inflated by counting duplicate sessions"
            }
        };
    }

    // Format for display
    formatForDisplay(metrics) {
        return `
        ===== REAL ANALYTICS =====

        REGISTERED USERS:
        • Total Registered: ${metrics.realPlayers.registered}
        • Active (played ≥1 game): ${metrics.realPlayers.active}
        • Inactive (never played): ${metrics.realPlayers.inactive}

        GUEST ACTIVITY:
        • Browser Sessions: ${metrics.guestData.sessions}
        • Estimated Unique Guests: ${metrics.guestData.estimatedUnique}
        • Note: ${metrics.guestData.note}

        ENGAGEMENT:
        • Registration → Play Rate: ${metrics.engagement.registrationRate}
        • Avg Games per Active User: ${metrics.engagement.avgGamesPerActiveUser}
        • Total Games Played: ${metrics.engagement.totalGamesPlayed}
        • Total Puzzles Completed: ${metrics.engagement.totalPuzzlesCompleted}

        THE TRUTH:
        • Confirmed Real Players: ${metrics.realTotals.confirmedPlayers}
        • Estimated Total (including guests): ${metrics.realTotals.estimatedTotalPlayers}

        ⚠️ ${metrics.realTotals.warning}
        `;
    }
}

// How to use this in your admin panel:
/*
// Replace the misleading getTotalPlayers() with:
async function getAccurateStats() {
    const analytics = new AccurateAnalytics(supabase);
    const metrics = await analytics.getMeaningfulMetrics();

    // Update UI with real numbers
    document.getElementById('total-users').textContent =
        `${metrics.realTotals.confirmedPlayers} (real)`;

    document.getElementById('signed-up-users').textContent =
        metrics.realPlayers.registered;

    document.getElementById('total-games').textContent =
        metrics.engagement.totalGamesPlayed;

    // Add disclaimer about previous inflated number
    const disclaimer = document.createElement('div');
    disclaimer.className = 'analytics-disclaimer';
    disclaimer.innerHTML = `
        <p style="color: orange; font-size: 12px;">
            ⚠️ Previous "1002 players" included ${metrics.guestData.sessions} duplicate guest sessions.
            Real unique players: ~${metrics.realTotals.estimatedTotalPlayers}
        </p>
    `;
}
*/

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AccurateAnalytics;
}