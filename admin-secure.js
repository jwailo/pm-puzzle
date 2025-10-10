// Secure Admin Dashboard JavaScript
class SecureAdminDashboard {
    constructor() {
        // Use the same Supabase configuration as the main game
        this.supabaseUrl = 'https://taeetzxhrdohdijwgous.supabase.co';
        this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhZWV0enhocmRvaGRpandnb3VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMzc2NTcsImV4cCI6MjA3MTgxMzY1N30.xzf-hGFWF6iumTarOA1-3hABjab_O_o0tcM956a3PG0';

        // Initialize Supabase client
        this.supabase = supabase.createClient(this.supabaseUrl, this.supabaseKey);

        // Session management
        this.sessionToken = localStorage.getItem('adminSessionToken');
        this.sessionCheckInterval = null;

        this.init();
    }

    init() {
        // Check if already authenticated
        if (this.sessionToken) {
            this.verifySession();
        } else {
            this.setupEventListeners();
        }
    }

    async verifySession() {
        try {
            const response = await fetch('/api/admin-auth', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'verify',
                    token: this.sessionToken
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Session valid, show dashboard
                this.showDashboard();
                this.startSessionCheck();
            } else {
                // Session invalid, clear and show login
                localStorage.removeItem('adminSessionToken');
                this.sessionToken = null;
                this.setupEventListeners();
            }
        } catch (error) {
            console.error('Session verification error:', error);
            this.setupEventListeners();
        }
    }

    startSessionCheck() {
        // Check session validity every minute
        this.sessionCheckInterval = setInterval(() => {
            this.verifySession();
        }, 60000);
    }

    stopSessionCheck() {
        if (this.sessionCheckInterval) {
            clearInterval(this.sessionCheckInterval);
            this.sessionCheckInterval = null;
        }
    }

    setupEventListeners() {
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
    }

    async handleLogin(e) {
        e.preventDefault();

        const password = document.getElementById('admin-password').value;
        const errorMessage = document.getElementById('error-message');
        const submitButton = e.target.querySelector('button[type="submit"]');

        // Disable submit button during login
        submitButton.disabled = true;
        submitButton.textContent = 'Authenticating...';

        try {
            const response = await fetch('/api/admin-auth', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'login',
                    password: password
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Store session token
                this.sessionToken = data.token;
                localStorage.setItem('adminSessionToken', data.token);

                // Show dashboard
                this.showDashboard();
                this.startSessionCheck();

                // Clear password field
                document.getElementById('admin-password').value = '';
            } else {
                // Show error message
                errorMessage.textContent = data.error || 'Authentication failed';

                if (data.attemptsRemaining !== undefined) {
                    errorMessage.textContent += ` (${data.attemptsRemaining} attempts remaining)`;
                }

                errorMessage.style.display = 'block';

                // Hide error after 5 seconds
                setTimeout(() => {
                    errorMessage.style.display = 'none';
                }, 5000);

                // Re-enable button
                submitButton.disabled = false;
                submitButton.textContent = 'Login';
            }
        } catch (error) {
            console.error('Login error:', error);
            errorMessage.textContent = 'Network error. Please try again.';
            errorMessage.style.display = 'block';

            // Re-enable button
            submitButton.disabled = false;
            submitButton.textContent = 'Login';
        }
    }

    showDashboard() {
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('admin-dashboard').classList.add('show');

        // Setup dashboard event listeners
        this.setupDashboardEventListeners();

        // Load dashboard data
        this.loadDashboardData();
    }

    setupDashboardEventListeners() {
        const logoutBtn = document.getElementById('logout-btn');
        const refreshBtn = document.getElementById('refresh-btn');
        const downloadBtn = document.getElementById('download-csv');

        logoutBtn.addEventListener('click', () => this.handleLogout());
        refreshBtn.addEventListener('click', () => this.loadDashboardData());
        downloadBtn.addEventListener('click', () => this.downloadCSV());
    }

    async handleLogout() {
        // Call logout API
        if (this.sessionToken) {
            try {
                await fetch('/api/admin-auth', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'logout',
                        token: this.sessionToken
                    })
                });
            } catch (error) {
                console.error('Logout error:', error);
            }
        }

        // Clear session
        localStorage.removeItem('adminSessionToken');
        this.sessionToken = null;
        this.stopSessionCheck();

        // Show login form
        document.getElementById('login-container').style.display = 'flex';
        document.getElementById('admin-dashboard').classList.remove('show');
        document.getElementById('admin-password').value = '';
    }

    // Copy all the dashboard methods from admin.js below...
    async loadDashboardData() {
        try {
            console.log('=== Loading Admin Dashboard Data ===');

            // Show loading state
            document.getElementById('loading').style.display = 'block';
            document.getElementById('users-table').style.display = 'none';

            // Load all data
            const totalPlayers = await this.getTotalPlayers();
            const signedUpUsers = await this.getSignedUpUsers();
            const dailyActive = await this.getDailyActiveUsers();
            const monthlyActive = await this.getMonthlyActiveUsers();
            const totalGames = await this.getTotalGames();
            const signupPercentage = this.calculateSignupPercentage(signedUpUsers.count, totalPlayers.count);
            const totalShares = await this.getTotalShares();

            console.log('=== Dashboard Stats Summary ===');
            console.log('Total Players (including guests):', totalPlayers.count);
            console.log('Signed Up Users:', signedUpUsers.count);
            console.log('Sign-up Rate:', signupPercentage);
            console.log('Daily Active:', dailyActive);
            console.log('Monthly Active:', monthlyActive);
            console.log('Total Games:', totalGames);
            console.log('Total Shares:', totalShares);
            console.log('================================');

            // Update stats
            document.getElementById('total-users').textContent = totalPlayers.count || 0;
            document.getElementById('signed-up-users').textContent = signedUpUsers.count || 0;
            document.getElementById('daily-active').textContent = dailyActive || 0;
            document.getElementById('monthly-active').textContent = monthlyActive || 0;
            document.getElementById('total-games').textContent = totalGames || 0;
            document.getElementById('signup-percentage').textContent = signupPercentage;
            document.getElementById('total-shares').textContent = totalShares || 0;

            // Load and display users
            await this.loadUsersList();

            // Load sharing analytics
            await this.loadSharingAnalytics();
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            alert('Error loading dashboard data. Check console for details.');
        }
    }

    async getTotalPlayers() {
        try {
            // Try RPC function first if available
            try {
                const { data: rpcData, error: rpcError } = await this.supabase
                    .rpc('get_admin_total_players');

                if (!rpcError && rpcData !== null) {
                    console.log('Total players from RPC:', rpcData);
                    return { count: rpcData };
                }
            } catch (e) {
                console.log('RPC function not available, using direct queries');
            }

            // Fallback: calculate manually
            const { count: profileCount, error: profileError } = await this.supabase
                .from('user_profiles')
                .select('*', { count: 'exact', head: true });

            if (profileError) {
                console.error('Error getting user profiles count:', profileError);
            }

            // Get ALL user_stats entries to find both guests and registered users who have played
            const { data: allStats, error: statsError } = await this.supabase
                .from('user_stats')
                .select('user_id');

            if (statsError) {
                console.error('Error getting user stats:', statsError);
            }

            // Count unique players
            let guestPlayers = 0;
            let registeredPlayersInStats = 0;

            if (allStats) {
                allStats.forEach(stat => {
                    if (stat.user_id && stat.user_id.startsWith('guest_')) {
                        guestPlayers++;
                    } else if (stat.user_id) {
                        registeredPlayersInStats++;
                    }
                });
            }

            const signedUpUsers = profileCount || 0;
            const totalPlayers = signedUpUsers + guestPlayers;

            console.log(`Player breakdown:`);
            console.log(`  - Signed up users: ${signedUpUsers}`);
            console.log(`  - Guest players: ${guestPlayers}`);
            console.log(`  - Total unique players: ${totalPlayers}`);

            return { count: totalPlayers };
        } catch (e) {
            console.error('Failed to get total players:', e);
            return { count: 0 };
        }
    }

    async getSignedUpUsers() {
        try {
            const { data: rpcData, error: rpcError } = await this.supabase
                .rpc('get_admin_total_users');

            if (!rpcError && rpcData !== null) {
                console.log('Signed up users from RPC:', rpcData);
                return { count: rpcData };
            }
        } catch (e) {
            console.log('RPC function not available, trying direct query');
        }

        const { count, error } = await this.supabase
            .from('user_profiles')
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.error('Error getting signed up users:', error);
            return { count: 0 };
        }

        console.log('Signed up users from direct query:', count);
        return { count };
    }

    async getDailyActiveUsers() {
        try {
            const { data, error } = await this.supabase
                .rpc('get_admin_active_users', { days: 1 });

            if (error) {
                console.error('Error getting daily active users:', error);
                return 0;
            }

            console.log('Daily active users (all players including guests):', data);
            return data || 0;
        } catch (error) {
            console.error('Failed to get daily active users:', error);
            return 0;
        }
    }

    async getMonthlyActiveUsers() {
        try {
            const { data, error } = await this.supabase
                .rpc('get_admin_active_users', { days: 30 });

            if (error) {
                console.error('Error getting monthly active users:', error);
                return 0;
            }

            console.log('Monthly active users (all players including guests):', data);
            return data || 0;
        } catch (error) {
            console.error('Failed to get monthly active users:', error);
            return 0;
        }
    }

    async getTotalGames() {
        try {
            const { data: rpcData, error: rpcError } = await this.supabase
                .rpc('get_admin_total_games');

            if (!rpcError && rpcData !== null) {
                console.log('Total games from RPC:', rpcData);
                return rpcData;
            }
        } catch (e) {
            console.log('RPC function not available, trying direct query');
        }

        const { data, error } = await this.supabase
            .from('user_stats')
            .select('games_played');

        if (error) {
            console.error('Error getting total games:', error);
            return 0;
        }

        console.log('Games data from direct query:', data);
        const totalGames = data ? data.reduce((sum, user) => sum + (user.games_played || 0), 0) : 0;
        return totalGames;
    }

    calculateSignupPercentage(signedUp, total) {
        if (!total || total === 0) {
            console.log('No total players to calculate percentage');
            return '0%';
        }
        const percentage = ((signedUp / total) * 100).toFixed(1);
        console.log(`Signup rate calculation: ${signedUp} signed up ÷ ${total} total = ${percentage}%`);
        return `${percentage}%`;
    }

    async getTotalShares() {
        try {
            const { data, error } = await this.supabase.rpc('get_admin_total_shares');

            if (error) {
                console.error('Error getting total shares:', error);
                return 0;
            }

            return data || 0;
        } catch (error) {
            console.error('Failed to get total shares:', error);
            return 0;
        }
    }

    async loadUsersList() {
        try {
            console.log('Loading users list...');

            const { data: users, error } = await this.supabase
                .rpc('get_admin_user_list');

            if (error) {
                console.error('Error loading users:', error);
                document.getElementById('loading').textContent = 'Error loading users: ' + error.message;
                return;
            }

            console.log('Users loaded from RPC:', users);
            this.usersData = users || [];
            this.renderUsersTable(users || []);
        } catch (error) {
            console.error('Error in loadUsersList:', error);
            document.getElementById('loading').textContent = 'Error loading users: ' + error.message;
        }
    }

    renderUsersTable(users) {
        const tbody = document.getElementById('users-tbody');
        tbody.innerHTML = '';

        console.log('Rendering users table with:', users);
        console.log('Number of users to render:', users ? users.length : 0);

        if (!users || users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No users found</td></tr>';
            document.getElementById('loading').style.display = 'none';
            document.getElementById('users-table').style.display = 'table';
            return;
        }

        users.forEach((user, index) => {
            console.log(`User ${index}:`, user);
            const row = document.createElement('tr');

            const formatDate = (dateString) => {
                if (!dateString) return 'Never';
                return new Date(dateString).toLocaleDateString();
            };

            row.innerHTML = `
                <td>${user.first_name || 'N/A'}</td>
                <td>${user.email || 'N/A'}</td>
                <td>${user.games_played || 0}</td>
                <td>${user.games_won || 0}</td>
                <td>${user.max_streak || 0}</td>
                <td>${formatDate(user.updated_at)}</td>
                <td>${formatDate(user.created_at)}</td>
            `;

            tbody.appendChild(row);
        });

        // Hide loading, show table
        document.getElementById('loading').style.display = 'none';
        document.getElementById('users-table').style.display = 'table';
    }

    downloadCSV() {
        if (!this.usersData) {
            alert('No data to download. Please refresh first.');
            return;
        }

        const csvHeader = 'Name,Email,Games Played,Games Won,Max Streak,Last Active,Signed Up\n';

        const csvRows = this.usersData.map(user => {
            const formatDate = (dateString) => {
                if (!dateString) return 'Never';
                return new Date(dateString).toLocaleDateString();
            };

            return [
                `"${user.first_name || 'N/A'}"`,
                `"${user.email || 'N/A'}"`,
                user.games_played || 0,
                user.games_won || 0,
                user.max_streak || 0,
                `"${formatDate(user.updated_at)}"`,
                `"${formatDate(user.created_at)}"`
            ].join(',');
        }).join('\n');

        const csvContent = csvHeader + csvRows;

        // Create and trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `pm-puzzle-users-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    async loadSharingAnalytics() {
        try {
            // Load audience breakdown
            const { data: audienceData, error: audienceError } = await this.supabase.rpc('get_admin_share_stats');

            if (audienceError) {
                console.error('Error loading audience data:', audienceError);
                document.getElementById('audience-breakdown').innerHTML = '<div style="color: #e53e3e;">Error loading data</div>';
            } else {
                this.renderAudienceBreakdown(audienceData || []);
            }

            // Load custom shares
            const { data: customData, error: customError } = await this.supabase.rpc('get_admin_recent_custom_shares');

            if (customError) {
                console.error('Error loading custom shares:', customError);
                document.getElementById('custom-shares').innerHTML = '<div style="color: #e53e3e;">Error loading data</div>';
            } else {
                this.renderCustomShares(customData || []);
            }
        } catch (error) {
            console.error('Error in loadSharingAnalytics:', error);
        }
    }

    renderAudienceBreakdown(data) {
        const container = document.getElementById('audience-breakdown');

        if (!data || data.length === 0) {
            container.innerHTML = '<div style="color: #666;">No shares recorded yet</div>';
            return;
        }

        const audienceNames = {
            colleague: '👔 Colleagues',
            pms: '🏢 Other PMs',
            tradies: '🔧 Tradies',
            mum: '❤️ Family/Friends',
            custom: '✨ Custom'
        };

        let html = '';
        data.forEach(item => {
            const name = audienceNames[item.audience_type] || item.audience_type;
            const percentage = data.length > 0 ? Math.round((item.share_count / data.reduce((sum, d) => sum + parseInt(d.share_count), 0)) * 100) : 0;

            html += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <span>${name}</span>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="background: #e2e8f0; border-radius: 4px; width: 60px; height: 8px; overflow: hidden;">
                            <div style="background: #667eea; height: 100%; width: ${percentage}%;"></div>
                        </div>
                        <span style="font-weight: bold; min-width: 40px; text-align: right;">${item.share_count}</span>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    renderCustomShares(data) {
        const container = document.getElementById('custom-shares');

        if (!data || data.length === 0) {
            container.innerHTML = '<div style="color: #666;">No custom shares yet</div>';
            return;
        }

        let html = '';
        data.forEach(item => {
            const date = new Date(item.shared_at).toLocaleDateString();
            const time = new Date(item.shared_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            html += `
                <div style="padding: 8px 0; border-bottom: 1px solid #eee;">
                    <div style="font-weight: bold; color: #333;">"${item.custom_audience}"</div>
                    <div style="font-size: 12px; color: #666; margin-top: 2px;">
                        ${date} at ${time}
                        ${item.share_count > 1 ? `(${item.share_count}x)` : ''}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }
}

// Load Supabase library and initialize secure admin dashboard
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
script.onload = () => {
    window.secureAdminDashboard = new SecureAdminDashboard();
};
document.head.appendChild(script);