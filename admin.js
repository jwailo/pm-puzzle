// Admin Dashboard JavaScript
class AdminDashboard {
    constructor() {
        // Use the same Supabase configuration as the main game
        this.supabaseUrl = 'https://taeetzxhrdohdijwgous.supabase.co';
        this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhZWV0enhocmRvaGRpandnb3VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMzc2NTcsImV4cCI6MjA3MTgxMzY1N30.xzf-hGFWF6iumTarOA1-3hABjab_O_o0tcM956a3PG0';
        
        // Initialize Supabase client
        this.supabase = supabase.createClient(this.supabaseUrl, this.supabaseKey);
        
        this.adminPassword = 'pmwordle2024!'; // Change this to a secure password
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        const loginForm = document.getElementById('login-form');
        const logoutBtn = document.getElementById('logout-btn');
        const refreshBtn = document.getElementById('refresh-btn');
        const downloadBtn = document.getElementById('download-csv');

        loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        logoutBtn.addEventListener('click', () => this.handleLogout());
        refreshBtn.addEventListener('click', () => this.loadDashboardData());
        downloadBtn.addEventListener('click', () => this.downloadCSV());
    }

    handleLogin(e) {
        e.preventDefault();
        const password = document.getElementById('admin-password').value;
        const errorMessage = document.getElementById('error-message');

        if (password === this.adminPassword) {
            document.getElementById('login-container').style.display = 'none';
            document.getElementById('admin-dashboard').classList.add('show');
            this.loadDashboardData();
        } else {
            errorMessage.style.display = 'block';
            setTimeout(() => {
                errorMessage.style.display = 'none';
            }, 3000);
        }
    }

    handleLogout() {
        document.getElementById('login-container').style.display = 'flex';
        document.getElementById('admin-dashboard').classList.remove('show');
        document.getElementById('admin-password').value = '';
    }

    async loadDashboardData() {
        try {
            console.log('Loading dashboard data...');
            
            // Show loading state
            document.getElementById('loading').style.display = 'block';
            document.getElementById('users-table').style.display = 'none';

            // Load all data
            const userStats = await this.getTotalUsers();
            const dailyActive = await this.getDailyActiveUsers();
            const monthlyActive = await this.getMonthlyActiveUsers();
            const totalGames = await this.getTotalGames();
            const signupPercentage = await this.getSignupPercentage();
            const totalShares = await this.getTotalShares();

            console.log('Stats loaded:', { userStats, dailyActive, monthlyActive, totalGames, signupPercentage, totalShares });

            // Update stats
            document.getElementById('total-users').textContent = userStats.count || 0;
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

    async getTotalUsers() {
        try {
            // Try RPC function first (bypasses RLS)
            const { data: rpcData, error: rpcError } = await this.supabase
                .rpc('get_admin_total_users');
            
            if (!rpcError && rpcData !== null) {
                console.log('Total users from RPC:', rpcData);
                return { count: rpcData };
            }
        } catch (e) {
            console.log('RPC function not available, trying direct query');
        }
        
        // Fallback to direct query
        const { count, error } = await this.supabase
            .from('user_profiles')
            .select('*', { count: 'exact', head: true });
        
        if (error) {
            console.error('Error getting total users:', error);
            return { count: 0 };
        }
        
        console.log('Total users from direct query:', count);
        return { count };
    }

    async getDailyActiveUsers() {
        try {
            // Get users who have stats updated in the last 24 hours
            const oneDayAgo = new Date();
            oneDayAgo.setDate(oneDayAgo.getDate() - 1);
            
            const { count, error } = await this.supabase
                .from('user_stats')
                .select('user_id', { count: 'exact', head: true })
                .gte('last_played', oneDayAgo.toISOString());
            
            if (error) {
                console.error('Error getting daily active users:', error);
                // Fallback: check daily leaderboard for today
                const today = new Date().toISOString().split('T')[0];
                const { count: dailyCount } = await this.supabase
                    .from('daily_leaderboard')
                    .select('*', { count: 'exact', head: true })
                    .eq('puzzle_date', today);
                return dailyCount || 0;
            }
            
            return count || 0;
        } catch (error) {
            console.error('Failed to get daily active users:', error);
            return 0;
        }
    }

    async getMonthlyActiveUsers() {
        try {
            // Get users who have stats updated in the last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const { count, error } = await this.supabase
                .from('user_stats')
                .select('user_id', { count: 'exact', head: true })
                .gte('last_played', thirtyDaysAgo.toISOString());
            
            if (error) {
                console.error('Error getting monthly active users:', error);
                return 0;
            }
            
            return count || 0;
        } catch (error) {
            console.error('Failed to get monthly active users:', error);
            return 0;
        }
    }

    async getTotalGames() {
        try {
            // Try RPC function first (bypasses RLS)
            const { data: rpcData, error: rpcError } = await this.supabase
                .rpc('get_admin_total_games');
            
            if (!rpcError && rpcData !== null) {
                console.log('Total games from RPC:', rpcData);
                return rpcData;
            }
        } catch (e) {
            console.log('RPC function not available, trying direct query');
        }
        
        // Fallback to direct query
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

    async getSignupPercentage() {
        try {
            const { data, error } = await this.supabase
                .rpc('get_admin_signup_percentage');
            
            if (error) {
                console.error('Error getting signup percentage:', error);
                return 'N/A';
            }
            
            return data || '0%';
        } catch (error) {
            console.error('Failed to get signup percentage:', error);
            return 'N/A';
        }
    }

    async loadUsersList() {
        try {
            console.log('Loading users list...');
            
            // Query user profiles directly
            const { data: profiles, error: profileError } = await this.supabase
                .from('user_profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (profileError) {
                console.error('Error loading user profiles:', profileError);
                // Try to get basic auth users as fallback
                const { data: authData, error: authError } = await this.supabase.auth.admin.listUsers();
                if (authError) {
                    console.error('Error loading users:', authError);
                    document.getElementById('loading').textContent = 'Error loading users: ' + authError.message;
                    return;
                }
                // Convert auth users to profile format
                const users = authData?.users?.map(user => ({
                    user_id: user.id,
                    email: user.email,
                    first_name: user.user_metadata?.first_name || 'Unknown',
                    created_at: user.created_at,
                    marketing_consent: false
                })) || [];
                this.usersData = users;
                this.renderUsersTable(users);
                return;
            }
            
            const users = profiles || [];

            console.log('Users loaded:', users);
            
            this.usersData = users;
            this.renderUsersTable(users);

        } catch (error) {
            console.error('Error in loadUsersList:', error);
            document.getElementById('loading').textContent = 'Error loading users: ' + error.message;
        }
    }

    renderUsersTable(users) {
        const tbody = document.getElementById('users-tbody');
        tbody.innerHTML = '';

        users.forEach(user => {
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
            const time = new Date(item.shared_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
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

// Load Supabase library and initialize admin dashboard
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
script.onload = () => {
    window.adminDashboard = new AdminDashboard();
};
document.head.appendChild(script);