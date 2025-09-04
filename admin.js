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

            console.log('Stats loaded:', { userStats, dailyActive, monthlyActive, totalGames, signupPercentage });

            // Update stats
            document.getElementById('total-users').textContent = userStats.count || 0;
            document.getElementById('daily-active').textContent = dailyActive || 0;
            document.getElementById('monthly-active').textContent = monthlyActive || 0;
            document.getElementById('total-games').textContent = totalGames || 0;
            document.getElementById('signup-percentage').textContent = signupPercentage + '%';

            // Load and display users
            await this.loadUsersList();

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
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const { count, error } = await this.supabase
            .from('user_stats')
            .select('*', { count: 'exact', head: true })
            .gte('updated_at', yesterday.toISOString());
        
        if (error) {
            console.error('Error getting daily active users:', error);
            return 0;
        }
        
        return count || 0;
    }

    async getMonthlyActiveUsers() {
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { count, error } = await this.supabase
            .from('user_stats')
            .select('*', { count: 'exact', head: true })
            .gte('updated_at', thirtyDaysAgo.toISOString());
        
        if (error) {
            console.error('Error getting monthly active users:', error);
            return 0;
        }
        
        return count || 0;
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
            // Get the count of registered users
            const { count: registeredUsers, error: usersError } = await this.supabase
                .from('user_profiles')
                .select('*', { count: 'exact', head: true });
            
            if (usersError) {
                console.error('Error getting registered users:', usersError);
                return 'N/A';
            }
            
            // Get total unique players (both guests and registered users)
            // user_stats table tracks all players who have played at least one game
            const { count: totalPlayers, error: totalError } = await this.supabase
                .from('user_stats')
                .select('*', { count: 'exact', head: true });
            
            if (totalError) {
                console.error('Error getting total players:', totalError);
                return 'N/A';
            }
            
            console.log('Signup rate calculation:', { registeredUsers, totalPlayers });
            
            // Calculate percentage
            if (totalPlayers === 0) return '0%';
            
            const percentage = Math.round((registeredUsers / totalPlayers) * 100);
            return `${percentage}%`;
        } catch (error) {
            console.error('Error in getSignupPercentage:', error);
            return 'N/A';
        }
    }

    async loadUsersList() {
        try {
            console.log('Loading users list...');
            
            // First try to get user profiles
            const { data: profiles, error: profilesError } = await this.supabase
                .from('user_profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (profilesError) {
                console.error('Error loading user profiles:', profilesError);
                document.getElementById('loading').textContent = 'Error loading users: ' + profilesError.message;
                return;
            }

            console.log('Profiles loaded:', profiles);

            // Then get stats separately to avoid join issues
            const { data: stats, error: statsError } = await this.supabase
                .from('user_stats')
                .select('*');

            if (statsError) {
                console.error('Error loading user stats:', statsError);
            }

            console.log('Stats loaded:', stats);

            // Merge the data
            const users = profiles.map(profile => {
                const userStats = stats ? stats.find(s => s.user_id === profile.id) : null;
                return {
                    ...profile,
                    user_stats: userStats
                };
            });

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
            const stats = user.user_stats || {};
            const row = document.createElement('tr');
            
            const formatDate = (dateString) => {
                if (!dateString) return 'Never';
                return new Date(dateString).toLocaleDateString();
            };

            row.innerHTML = `
                <td>${user.first_name || 'N/A'}</td>
                <td>${user.email || 'N/A'}</td>
                <td>${stats.games_played || 0}</td>
                <td>${stats.games_won || 0}</td>
                <td>${stats.max_streak || 0}</td>
                <td>${formatDate(stats.updated_at)}</td>
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
            const stats = user.user_stats || {};
            const formatDate = (dateString) => {
                if (!dateString) return 'Never';
                return new Date(dateString).toLocaleDateString();
            };

            return [
                `"${user.first_name || 'N/A'}"`,
                `"${user.email || 'N/A'}"`,
                stats.games_played || 0,
                stats.games_won || 0,
                stats.max_streak || 0,
                `"${formatDate(stats.updated_at)}"`,
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
}

// Load Supabase library and initialize admin dashboard
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
script.onload = () => {
    window.adminDashboard = new AdminDashboard();
};
document.head.appendChild(script);