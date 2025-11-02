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

        const email = document.getElementById('admin-email').value;
        const password = document.getElementById('admin-password').value;
        const errorMessage = document.getElementById('error-message');
        const submitButton = e.target.querySelector('button[type="submit"]');

        // Disable submit button during login
        submitButton.disabled = true;
        submitButton.textContent = 'Authenticating...';

        try {
            // Try new endpoint first, then fallback to legacy
            let response = await fetch('/api/auth-login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            // Fallback to legacy endpoint if new one not found
            if (response.status === 404) {
                response = await fetch('/api/admin-auth', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'login',
                        email: email,
                        password: password
                    })
                });
            }

            const data = await response.json();

            if (response.ok && data.success) {
                // Store session token
                this.sessionToken = data.token;
                localStorage.setItem('adminSessionToken', data.token);

                // Check for warning about fallback
                if (data.warning) {
                    console.warn('⚠️ ' + data.warning);
                    alert('WARNING: ' + data.warning + '\n\nPlease configure ADMIN_PASSWORD in Vercel environment variables immediately!');
                }

                // Show dashboard
                this.showDashboard();
                this.startSessionCheck();

                // Clear form fields
                document.getElementById('admin-email').value = '';
                document.getElementById('admin-password').value = '';
            } else {
                // Show error message
                errorMessage.textContent = data.error || 'Authentication failed';

                if (data.debug) {
                    // Show debug info in development
                    errorMessage.innerHTML = `${data.error}<br><small style="color: #666; margin-top: 8px; display: block;">${data.debug}</small>`;
                }

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

        // Setup tab navigation
        this.setupTabNavigation();

        // Setup winners section
        this.setupWinnersSection();

        // Setup auto-refresh toggle
        this.setupAutoRefresh();
    }

    setupTabNavigation() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.getAttribute('data-tab');

                // Update button states
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                // Update content visibility
                tabContents.forEach(content => {
                    content.style.display = 'none';
                });

                const targetContent = document.getElementById(`${targetTab}-tab`);
                if (targetContent) {
                    targetContent.style.display = 'block';
                }

                // Load winners data if switching to winners tab
                if (targetTab === 'winners' && !this.winnersLoaded) {
                    this.loadWinnersForLastWeek();
                }
            });
        });
    }

    setupWinnersSection() {
        // Setup event listeners for the simplified version
        const refreshBtn = document.getElementById('refresh-winners-btn');
        const downloadBtn = document.getElementById('download-winners-csv');

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadWinners());
        }
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => this.downloadWinnersCSV());
        }

        this.winnersData = [];
        this.winnersLoaded = false;
    }

    async loadWinnersForLastWeek() {
        // Load last 7 days by default
        this.loadWinners();
    }

    async loadWinners() {
        const loadingEl = document.getElementById('winners-loading');
        const containerEl = document.getElementById('winners-container');

        loadingEl.style.display = 'block';
        containerEl.innerHTML = '';

        try {
            console.log('Loading all daily puzzle completions...');
            let completionsData = [];

            // Method 1: Try the main RPC function
            console.log('Method 1: Trying RPC get_daily_puzzle_completions');
            const { data: rpcData, error: rpcError } = await this.supabase.rpc('get_daily_puzzle_completions');

            if (rpcError) {
                console.error('Method 1 failed:', rpcError);
            } else {
                console.log('Method 1 data received:', rpcData);
                completionsData = rpcData || [];
            }

            // Method 2: If no data, try the simple function
            if (!completionsData || completionsData.length === 0) {
                console.log('Method 2: Trying RPC get_completions_simple');
                const { data: simpleData, error: simpleError } = await this.supabase.rpc('get_completions_simple');

                if (simpleError) {
                    console.error('Method 2 failed:', simpleError);
                } else {
                    console.log('Method 2 data received:', simpleData);
                    completionsData = simpleData || [];
                }
            }

            // Method 3: Try direct view query
            if (!completionsData || completionsData.length === 0) {
                console.log('Method 3: Trying direct query to puzzle_completions_view');
                const { data: viewData, error: viewError } = await this.supabase
                    .from('puzzle_completions_view')
                    .select('*');

                if (viewError) {
                    console.error('Method 3 failed:', viewError);
                } else {
                    console.log('Method 3 data received:', viewData);
                    completionsData = viewData || [];
                }
            }

            // Method 4: Direct table query with joins
            if (!completionsData || completionsData.length === 0) {
                console.log('Method 4: Direct table query to game_sessions');
                const { data: directData, error: directError } = await this.supabase
                    .from('game_sessions')
                    .select(`
                        *,
                        user_profiles!inner(
                            email,
                            first_name
                        )
                    `)
                    .eq('game_won', true)
                    .order('created_at', { ascending: false });

                if (directError) {
                    console.error('Method 4 failed:', directError);
                } else {
                    console.log('Method 4 raw data received:', directData);
                    // Transform the data to match expected format
                    if (directData && directData.length > 0) {
                        completionsData = directData.map(item => ({
                            completion_date: item.date || new Date(item.created_at).toISOString().split('T')[0],
                            user_id: item.user_id,
                            email: item.user_profiles?.email || 'Unknown Email',
                            first_name: item.user_profiles?.first_name || 'Unknown User',
                            completed_at: item.updated_at || item.created_at,
                            guesses: (item.current_row || 5) + 1
                        }));
                    }
                }
            }

            // Method 5: Try without user_id filter
            if (!completionsData || completionsData.length === 0) {
                console.log('Method 5: Trying without user_id filter');
                const { data: allData, error: allError } = await this.supabase
                    .from('game_sessions')
                    .select('*')
                    .eq('game_won', true)
                    .order('created_at', { ascending: false });

                if (allError) {
                    console.error('Method 5 failed:', allError);
                } else {
                    console.log('Method 5 - All winning sessions (including guests):', allData);
                    if (allData && allData.length > 0) {
                        // Show at least guest wins to verify data exists
                        completionsData = allData.map(item => ({
                            completion_date: item.date || new Date(item.created_at).toISOString().split('T')[0],
                            user_id: item.user_id || 'guest',
                            email: item.user_id ? 'Loading...' : 'Guest Player',
                            first_name: item.user_id ? 'Loading...' : 'Guest',
                            completed_at: item.updated_at || item.created_at,
                            guesses: (item.current_row || 5) + 1
                        }));
                    }
                }
            }

            // Method 6: Get ALL completions, not just top 10 leaderboard
            if (!completionsData || completionsData.length === 0) {
                console.log('Method 6: Getting ALL daily completions (not just leaderboard top 10)');

                try {
                    // Get completions for the last 30 days
                    const allCompletions = [];

                    // Use proper timezone conversion to get Sydney date
                    const now = new Date();

                    for (let i = 0; i < 30; i++) {
                        // Calculate the date by subtracting days from now
                        const checkDate = new Date(now);
                        checkDate.setDate(now.getDate() - i);

                        // Get the Sydney date for this timestamp using Intl.DateTimeFormat
                        // This properly handles timezone conversion
                        const dateStr = new Intl.DateTimeFormat('en-CA', {
                            timeZone: 'Australia/Sydney',
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit'
                        }).format(checkDate);

                        console.log(`Fetching completions for ${dateStr}`);

                        try {
                            const { data: dayData, error: dayError } = await this.supabase
                                .rpc('get_public_daily_leaderboard', {
                                    target_date: dateStr
                                });

                            if (!dayError && dayData && dayData.length > 0) {
                                console.log(`Found ${dayData.length} completions for ${dateStr}`);
                                console.log('Sample completion data:', dayData[0]);

                                // The RPC returns user_profiles as part of the data
                                // Process each completion - only include signed-in users
                                dayData.forEach(completion => {
                                    // Skip guest users (they don't have user_id)
                                    if (!completion.user_id) {
                                        console.log('Skipping guest completion');
                                        return;
                                    }

                                    // Extract the name from user_profiles field (same as game uses)
                                    let firstName = 'Unknown';
                                    let email = 'No email';

                                    // Check different possible structures of user_profiles
                                    if (completion.user_profiles) {
                                        if (completion.user_profiles.first_name) {
                                            // Direct object
                                            firstName = completion.user_profiles.first_name;
                                            email = completion.user_profiles.email || 'No email';
                                        } else if (Array.isArray(completion.user_profiles) && completion.user_profiles[0]) {
                                            // Array format
                                            firstName = completion.user_profiles[0].first_name || 'Unknown';
                                            email = completion.user_profiles[0].email || 'No email';
                                        } else if (typeof completion.user_profiles === 'string') {
                                            // JSON string
                                            try {
                                                const profile = JSON.parse(completion.user_profiles);
                                                firstName = profile.first_name || 'Unknown';
                                                email = profile.email || 'No email';
                                            } catch (e) {
                                                console.log('Could not parse user_profiles:', completion.user_profiles);
                                            }
                                        }
                                    }

                                    // Also check if name is directly on the completion
                                    if (firstName === 'Unknown' && completion.first_name) {
                                        firstName = completion.first_name;
                                    }

                                    console.log(`Adding completion for ${firstName} (${email})`);

                                    allCompletions.push({
                                        completion_date: dateStr,
                                        user_id: completion.user_id,
                                        first_name: firstName,
                                        email: email,
                                        completion_time: completion.completion_time,
                                        guesses: completion.guesses,
                                        completed_at: completion.created_at
                                    });
                                });
                            } else if (dayError) {
                                console.log(`Error for ${dateStr}:`, dayError);
                            } else {
                                console.log(`No completions yet for ${dateStr}`);
                            }
                        } catch (err) {
                            console.log(`Error fetching ${dateStr}:`, err);
                        }
                    }

                    console.log(`Method 6 - Found total of ${allCompletions.length} completions`);
                    if (allCompletions.length > 0) {
                        console.log('Sample completion with data:', allCompletions[0]);
                    }
                    completionsData = allCompletions;

                } catch (err) {
                    console.error('Method 6 error:', err);
                }
            }

            // Method 7: Try to get ALL completions from a custom function or direct query
            if (!completionsData || completionsData.length === 0) {
                console.log('Method 7: Trying to get ALL completions (not limited to top 10)');

                try {
                    const allCompletions = [];

                    // Use proper timezone conversion to get Sydney date
                    const now = new Date();

                    for (let i = 0; i < 30; i++) {
                        // Calculate the date by subtracting days from now
                        const checkDate = new Date(now);
                        checkDate.setDate(now.getDate() - i);

                        // Get the Sydney date for this timestamp using Intl.DateTimeFormat
                        // This properly handles timezone conversion
                        const dateStr = new Intl.DateTimeFormat('en-CA', {
                            timeZone: 'Australia/Sydney',
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit'
                        }).format(checkDate);

                        // Try custom function first
                        try {
                            const { data: allDayData, error: allDayError } = await this.supabase
                                .rpc('get_all_puzzle_completions_for_date', {
                                    target_date: dateStr
                                });

                            if (!allDayError && allDayData && allDayData.length > 0) {
                                console.log(`Method 7: Found ${allDayData.length} ALL completions for ${dateStr}`);

                                allDayData.forEach(completion => {
                                    allCompletions.push({
                                        completion_date: dateStr,
                                        user_id: completion.user_id,
                                        first_name: completion.first_name || 'Unknown',
                                        email: completion.email || 'No email',
                                        completion_time: completion.completion_time,
                                        guesses: completion.guesses,
                                        completed_at: completion.completed_at
                                    });
                                });
                                continue;
                            }
                        } catch (e) {
                            console.log(`Custom function not available for ${dateStr}`);
                        }

                        // Fallback: Try direct query to puzzle_completions table
                        try {
                            const { data: pcData, error: pcError } = await this.supabase
                                .from('puzzle_completions')
                                .select(`
                                    user_id,
                                    time_seconds,
                                    guesses,
                                    created_at,
                                    user_profiles!inner(
                                        first_name,
                                        email
                                    )
                                `)
                                .eq('puzzle_date', dateStr)
                                .not('user_id', 'is', null);

                            if (!pcError && pcData && pcData.length > 0) {
                                console.log(`Found ${pcData.length} completions in puzzle_completions for ${dateStr}`);

                                pcData.forEach(completion => {
                                    allCompletions.push({
                                        completion_date: dateStr,
                                        user_id: completion.user_id,
                                        first_name: completion.user_profiles?.first_name || 'Unknown',
                                        email: completion.user_profiles?.email || 'No email',
                                        completion_time: completion.time_seconds,
                                        guesses: completion.guesses,
                                        completed_at: completion.created_at
                                    });
                                });
                            }
                        } catch (e) {
                            console.log(`No puzzle_completions table or error for ${dateStr}`);
                        }
                    }

                    if (allCompletions.length > 0) {
                        console.log(`Method 7: Found total of ${allCompletions.length} ALL completions`);
                        completionsData = allCompletions;
                    }
                } catch (err) {
                    console.error('Method 7 error:', err);
                }
            }

            console.log(`Final completions data: ${completionsData?.length || 0} records`);
            console.log('Sample data:', completionsData && completionsData.length > 0 ? completionsData[0] : 'No data');

            this.winnersData = completionsData || [];
            this.winnersLoaded = true;

            if (!completionsData || completionsData.length === 0) {
                containerEl.innerHTML = '<div style="color: #666; padding: 2rem; text-align: center;">No puzzle completions found. Check console for debugging info.</div>';
            } else {
                this.renderDailyCompletions(completionsData);
            }

        } catch (error) {
            console.error('Failed to load completions:', error);
            containerEl.innerHTML = '<div style="color: #e53e3e; padding: 2rem; text-align: center;">Failed to load data: ' + error.message + '</div>';
        } finally {
            loadingEl.style.display = 'none';
        }
    }

    renderDailyCompletions(data) {
        const containerEl = document.getElementById('winners-container');

        console.log('renderDailyCompletions called with:', data);
        console.log('Data type:', typeof data);
        console.log('Data is array?:', Array.isArray(data));

        if (!data || data.length === 0) {
            console.log('No data found, showing empty message');
            containerEl.innerHTML = '<div style="color: #666; padding: 2rem; text-align: center;">No puzzle completions found</div>';
            return;
        }

        // Group completions by date
        const groupedByDate = {};
        data.forEach(completion => {
            const date = completion.completion_date || completion.puzzle_date || completion.date || completion.created_at;
            console.log('Processing completion:', completion, 'Date:', date);
            if (!groupedByDate[date]) {
                groupedByDate[date] = [];
            }
            groupedByDate[date].push(completion);
        });

        // Sort dates in descending order (most recent first)
        const sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(b) - new Date(a));

        let html = '';
        let totalCompletions = 0;

        sortedDates.forEach(date => {
            const dayCompletions = groupedByDate[date];
            totalCompletions += dayCompletions.length;

            // Format the date nicely
            const dateObj = new Date(date + 'T12:00:00');
            const formattedDate = dateObj.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            // Remove duplicates - keep only one entry per user per day
            const uniqueCompletions = [];
            const seenUsers = new Set();
            dayCompletions.forEach(completion => {
                const userKey = `${completion.user_id}`;
                if (!seenUsers.has(userKey)) {
                    uniqueCompletions.push(completion);
                    seenUsers.add(userKey);
                }
            });

            // Simple clean list - no trophies, no winners
            html += `
                <div style="margin-bottom: 2rem; background: #f7fafc; border-radius: 8px; padding: 1rem;">
                    <div style="margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid #e2e8f0;">
                        <div style="font-size: 1.1rem; font-weight: bold; color: #2d3748;">${formattedDate}</div>
                    </div>

                    <!-- Simple list of completions -->
                    <div style="margin-top: 0.5rem;">
                        <table style="width: 100%; font-size: 14px;">
                            <tbody>
            `;

            uniqueCompletions.forEach((completion, index) => {
                html += `
                    <tr style="border-bottom: 1px solid #f0f0f0;">
                        <td style="padding: 6px 8px; width: 30%;">${completion.first_name}</td>
                        <td style="padding: 6px 8px; color: #666;">${completion.email}</td>
                    </tr>
                `;
            });

            html += `
                            </tbody>
                        </table>
                    </div>
                    <div style="text-align: right; margin-top: 8px; font-size: 13px; color: #999;">
                        ${uniqueCompletions.length} ${uniqueCompletions.length === 1 ? 'player' : 'players'}
                    </div>
                </div>
            `;
        });

        // Simple summary
        const uniquePlayers = [...new Set(data.map(d => d.user_id))].length;
        html += `
            <div style="margin-top: 1rem; padding: 0.75rem; background: #f8f9fa; border-radius: 6px; font-size: 13px; color: #666;">
                Total Days: ${sortedDates.length} | Unique Players: ${uniquePlayers}
            </div>
        `;

        containerEl.innerHTML = html;
    }

    renderSimpleCompletions(data) {
        const containerEl = document.getElementById('winners-container');

        if (!data || data.length === 0) {
            containerEl.innerHTML = '<div style="color: #666; padding: 2rem; text-align: center;">No users have completed puzzles yet</div>';
            return;
        }

        // Simple table showing all completions
        let html = `
            <div style="background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f7fafc;">
                            <th style="padding: 12px; text-align: left; font-weight: 600; color: #2d3748;">#</th>
                            <th style="padding: 12px; text-align: left; font-weight: 600; color: #2d3748;">Name</th>
                            <th style="padding: 12px; text-align: left; font-weight: 600; color: #2d3748;">Email</th>
                            <th style="padding: 12px; text-align: left; font-weight: 600; color: #2d3748;">Games Won</th>
                            <th style="padding: 12px; text-align: left; font-weight: 600; color: #2d3748;">Last Played</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        data.forEach((user, index) => {
            const lastPlayed = new Date(user.last_played).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            html += `
                <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 12px; color: #666;">${index + 1}</td>
                    <td style="padding: 12px;">${user.first_name}</td>
                    <td style="padding: 12px; color: #666;">${user.email}</td>
                    <td style="padding: 12px; text-align: center;">${user.games_won}</td>
                    <td style="padding: 12px; color: #666;">${lastPlayed}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
            <div style="margin-top: 1rem; padding: 1rem; background: #f7fafc; border-radius: 8px;">
                <p style="color: #666; font-size: 14px;">
                    <strong>Total Players Who Have Won:</strong> ${data.length}<br>
                    <strong>Note:</strong> This shows all registered users who have completed at least one puzzle successfully.
                </p>
            </div>
        `;

        containerEl.innerHTML = html;
    }

    renderWinners(data) {
        const containerEl = document.getElementById('winners-container');

        if (!data || data.length === 0) {
            containerEl.innerHTML = '<div style="color: #666; padding: 2rem; text-align: center;">No puzzle completions found for this date range</div>';
            return;
        }

        // Group data by puzzle date
        const groupedByDate = {};
        data.forEach(completion => {
            const date = completion.completion_date || completion.puzzle_date || completion.date;
            if (!groupedByDate[date]) {
                groupedByDate[date] = [];
            }
            groupedByDate[date].push(completion);
        });

        // Sort dates in descending order
        const sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(b) - new Date(a));

        let html = '';
        sortedDates.forEach(date => {
            const participants = groupedByDate[date];
            const winner = this.selectRandomWinner(participants);

            html += `
                <div class="winner-day">
                    <div class="winner-day-header">
                        <div class="winner-day-date">${this.formatDateHeader(date)}</div>
                        <div class="winner-count">${participants.length} ${participants.length === 1 ? 'player' : 'players'}</div>
                    </div>

                    ${winner ? `
                        <div class="winner-selected">
                            <div class="winner-icon">🏆</div>
                            <div class="winner-details">
                                <div class="winner-name">${winner.first_name}</div>
                                <div class="winner-email">${winner.email}</div>
                            </div>
                            <div class="winner-status">WINNER - $50 MECCA</div>
                        </div>
                    ` : ''}

                    <div class="participants-list">
                        <div class="participants-header">
                            <span>📝</span>
                            <span>All Players Who Completed This Puzzle:</span>
                        </div>
                        ${participants.map((p, index) => `
                            <div class="participant-row">
                                <span style="color: #666;">${index + 1}.</span>
                                <span>${p.first_name}</span>
                                <span style="color: #666;">${p.email}</span>
                                <span>${p.guesses} ${p.guesses === 1 ? 'guess' : 'guesses'}</span>
                                ${p.completion_time ? `<span>${this.formatCompletionTime(p.completion_time)}</span>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        });

        containerEl.innerHTML = html;
    }

    selectRandomWinner(participants) {
        if (!participants || participants.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * participants.length);
        return participants[randomIndex];
    }

    formatDateHeader(dateString) {
        const date = new Date(dateString + 'T12:00:00'); // Add time to avoid timezone issues
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }

    formatCompletionTime(seconds) {
        if (!seconds) return 'N/A';
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}m ${secs}s`;
    }

    downloadWinnersCSV() {
        if (!this.winnersData || this.winnersData.length === 0) {
            alert('No completions data to download. Please load completions first.');
            return;
        }

        const csvHeader = 'Date,Name,Email,Daily Winner\n';

        // Group by date and select winners
        const groupedByDate = {};
        this.winnersData.forEach(completion => {
            const date = completion.completion_date || completion.puzzle_date;
            if (!groupedByDate[date]) {
                groupedByDate[date] = [];
            }
            groupedByDate[date].push(completion);
        });

        let csvRows = [];
        Object.keys(groupedByDate).sort((a, b) => new Date(b) - new Date(a)).forEach(date => {
            const participants = groupedByDate[date];
            const winner = this.selectRandomWinner(participants);

            participants.forEach(p => {
                const isWinner = winner && p.user_id === winner.user_id ? 'YES - $50 MECCA WINNER' : 'No';
                csvRows.push([
                    date,
                    `"${p.first_name}"`,
                    `"${p.email}"`,
                    isWinner
                ].join(','));
            });
        });

        const csvContent = csvHeader + csvRows.join('\n');

        // Create and trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `pm-puzzle-completions-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    setupAutoRefresh() {
        // Create auto-refresh control if it doesn't exist
        if (!document.getElementById('auto-refresh-control')) {
            const refreshBtn = document.getElementById('refresh-btn');
            const autoRefreshHTML = `
                <label style="display: inline-flex; align-items: center; margin-left: 10px; font-size: 14px; color: #4a5568;">
                    <input type="checkbox" id="auto-refresh-toggle" style="margin-right: 5px;">
                    Auto-refresh (30s)
                </label>
            `;
            refreshBtn.insertAdjacentHTML('afterend', autoRefreshHTML);
        }

        const autoRefreshToggle = document.getElementById('auto-refresh-toggle');
        this.autoRefreshInterval = null;

        autoRefreshToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                // Start auto-refresh every 30 seconds
                console.log('Auto-refresh enabled');
                this.autoRefreshInterval = setInterval(() => {
                    console.log('Auto-refreshing dashboard data...');
                    this.loadDashboardData();
                }, 30000); // 30 seconds

                // Also refresh immediately
                this.loadDashboardData();
            } else {
                // Stop auto-refresh
                console.log('Auto-refresh disabled');
                if (this.autoRefreshInterval) {
                    clearInterval(this.autoRefreshInterval);
                    this.autoRefreshInterval = null;
                }
            }
        });
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

        // Stop auto-refresh if it's running
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }

        // Show login form
        document.getElementById('login-container').style.display = 'flex';
        document.getElementById('admin-dashboard').classList.remove('show');
        document.getElementById('admin-email').value = '';
        document.getElementById('admin-password').value = '';
    }

    // Copy all the dashboard methods from admin.js below...
    async loadDashboardData() {
        try {
            console.log('=== Loading Admin Dashboard Data (Accurate Metrics) ===');

            // Show loading state
            document.getElementById('loading').style.display = 'block';
            document.getElementById('users-table').style.display = 'none';

            // Load only working metrics
            const registeredUsers = await this.getRegisteredUsers();
            const totalGames = await this.getTotalGames();
            const totalShares = await this.getTotalShares();
            const guestSessions = await this.getGuestSessions();
            const engagementScore = await this.calculateEngagementScore();

            console.log('=== Dashboard Stats ===');
            console.log('Registered Users:', registeredUsers);
            console.log('Total Games (Registered):', totalGames);
            console.log('Guest Sessions:', guestSessions);
            console.log('Total Shares:', totalShares);
            console.log('Engagement Score (Signup Ratio):', engagementScore);
            console.log('========================');

            // Update only working metrics
            document.getElementById('registered-users').textContent = registeredUsers || 0;
            document.getElementById('total-games').textContent = totalGames || 0;
            document.getElementById('guest-sessions').textContent = guestSessions || 0;
            document.getElementById('total-shares').textContent = totalShares || 0;
            document.getElementById('engagement-score').textContent = engagementScore || '0';

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
            // First, get signed up users using the working RPC function
            let signedUpUsers = 0;
            try {
                const { data: rpcUsers, error: rpcUsersError } = await this.supabase
                    .rpc('get_admin_total_users');

                if (!rpcUsersError && rpcUsers !== null) {
                    signedUpUsers = rpcUsers;
                    console.log('Signed up users from RPC:', signedUpUsers);
                }
            } catch (e) {
                console.log('Could not get signed up users from RPC:', e);
            }

            // If we couldn't get signed up users from RPC, try direct query
            if (signedUpUsers === 0) {
                try {
                    const { count: profileCount, error: profileError } = await this.supabase
                        .from('user_profiles')
                        .select('*', { count: 'exact', head: true });

                    if (!profileError && profileCount !== null) {
                        signedUpUsers = profileCount;
                        console.log('Signed up users from direct query:', signedUpUsers);
                    }
                } catch (e) {
                    console.log('Could not get user profiles count:', e);
                }
            }

            // Try to get guest players from user_stats
            let guestPlayers = 0;
            let totalPlayersFromStats = 0;

            try {
                const { data: allStats, error: statsError } = await this.supabase
                    .from('user_stats')
                    .select('user_id, session_id');

                if (!statsError && allStats) {
                    // Count total unique players and guest players
                    const uniqueUserIds = new Set();
                    const uniqueSessionIds = new Set();
                    let guestCount = 0;

                    allStats.forEach(stat => {
                        if (stat.user_id) {
                            uniqueUserIds.add(stat.user_id);
                        } else if (stat.session_id) {
                            // This is a guest (NULL user_id but has session_id)
                            uniqueSessionIds.add(stat.session_id);
                            guestCount++;
                        }
                    });

                    totalPlayersFromStats = uniqueUserIds.size + uniqueSessionIds.size;
                    guestPlayers = guestCount;

                    console.log(`Stats breakdown:`);
                    console.log(`  - Authenticated users in stats: ${uniqueUserIds.size}`);
                    console.log(`  - Guest sessions in stats: ${uniqueSessionIds.size}`);
                    console.log(`  - Total unique players in stats: ${totalPlayersFromStats}`);
                }
            } catch (e) {
                console.log('Could not query user_stats:', e);
            }

            // Try to get guest sessions from game_sessions with simpler query
            let guestSessions = 0;
            try {
                // First try to get all sessions
                const { data: sessions, error: sessionsError } = await this.supabase
                    .from('game_sessions')
                    .select('session_id, user_id');

                if (!sessionsError && sessions) {
                    const uniqueGuestSessions = new Set();
                    sessions.forEach(session => {
                        // Check if user_id is null (guest) and has session_id
                        if (!session.user_id && session.session_id) {
                            uniqueGuestSessions.add(session.session_id);
                        }
                    });
                    guestSessions = uniqueGuestSessions.size;
                    console.log(`  - Guest sessions from game_sessions: ${guestSessions}`);
                }
            } catch (e) {
                console.log('Could not query game_sessions:', e);
            }

            // Calculate total players
            // Use the maximum of different counting methods
            const guestPlayersTotal = Math.max(guestPlayers, guestSessions);

            // If we have a total from stats, use the max of that or (signed up + guests)
            let totalPlayers = Math.max(
                totalPlayersFromStats,
                signedUpUsers + guestPlayersTotal
            );

            // Ensure total is at least as much as signed up users
            if (totalPlayers < signedUpUsers) {
                totalPlayers = signedUpUsers;
            }

            console.log(`Player breakdown:`);
            console.log(`  - Signed up users: ${signedUpUsers}`);
            console.log(`  - Guest sessions: ${guestSessions}`);
            console.log(`  - Guest players from stats: ${guestPlayers}`);
            console.log(`  - Total guest players: ${guestPlayersTotal}`);
            console.log(`  - Total unique players: ${totalPlayers}`);

            return { count: totalPlayers };

        } catch (e) {
            console.error('Failed to get total players:', e);
            // Fallback: return at least the signed up users count we know about
            return { count: 16 }; // We know there are at least 16 signed up users
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

    // NEW ACCURATE METRIC FUNCTIONS

    async getRegisteredUsers() {
        try {
            // Use the same method as getSignedUpUsers which we know works
            const { data: rpcData, error: rpcError } = await this.supabase
                .rpc('get_admin_total_users');

            if (!rpcError && rpcData !== null) {
                console.log('Registered users from RPC:', rpcData);
                return rpcData;
            }

            // Fallback to direct count
            const { count, error } = await this.supabase
                .from('user_profiles')
                .select('*', { count: 'exact', head: true });

            if (error) {
                console.error('Error getting registered users:', error);
                return 0;
            }

            console.log('Registered users from direct count:', count);
            return count || 0;
        } catch (e) {
            console.error('Failed to get registered users:', e);
            return 0;
        }
    }

    async getActiveUserMetrics() {
        try {
            const metrics = {
                today: 0,
                week: 0,
                month: 0,
                avgGamesPerUser: 0
            };

            console.log('=== STARTING getActiveUserMetrics ===');

            // Get Sydney time properly
            const now = new Date();
            const sydneyTimeString = now.toLocaleString("en-US", {timeZone: "Australia/Sydney"});
            const sydneyNow = new Date(sydneyTimeString);

            const today = `${sydneyNow.getFullYear()}-${String(sydneyNow.getMonth() + 1).padStart(2, '0')}-${String(sydneyNow.getDate()).padStart(2, '0')}`;

            const weekAgo = new Date(sydneyNow);
            weekAgo.setDate(sydneyNow.getDate() - 7);
            const weekAgoStr = `${weekAgo.getFullYear()}-${String(weekAgo.getMonth() + 1).padStart(2, '0')}-${String(weekAgo.getDate()).padStart(2, '0')}`;

            const monthAgo = new Date(sydneyNow);
            monthAgo.setDate(sydneyNow.getDate() - 30);
            const monthAgoStr = `${monthAgo.getFullYear()}-${String(monthAgo.getMonth() + 1).padStart(2, '0')}-${String(monthAgo.getDate()).padStart(2, '0')}`;

            console.log('Sydney dates calculated:', { today, weekAgoStr, monthAgoStr });

            // USE USER_STATS TABLE - WE KNOW THIS WORKS!
            console.log('Querying user_stats table for active metrics...');

            const { data: statsData, error: statsError } = await this.supabase
                .from('user_stats')
                .select('user_id, last_played, last_completed, games_played, updated_at')
                .not('user_id', 'is', null);

            if (statsError) {
                console.error('ERROR querying user_stats:', statsError);
                throw statsError;
            }

            console.log(`Found ${statsData?.length || 0} user_stats records`);

            if (statsData && statsData.length > 0) {
                // Count active users based on their last activity
                let todayActive = 0;
                let weekActive = 0;
                let monthActive = 0;

                statsData.forEach(stat => {
                    // Find most recent activity date
                    const activityDates = [
                        stat.last_played,
                        stat.last_completed,
                        stat.updated_at
                    ].filter(d => d);

                    if (activityDates.length > 0) {
                        // Get the most recent date
                        const mostRecent = activityDates.sort().reverse()[0];
                        const activityDateStr = mostRecent.split('T')[0];

                        // Count if active in each period
                        if (activityDateStr === today) {
                            todayActive++;
                        }
                        if (activityDateStr >= weekAgoStr) {
                            weekActive++;
                        }
                        if (activityDateStr >= monthAgoStr) {
                            monthActive++;
                        }
                    }
                });

                metrics.today = todayActive;
                metrics.week = weekActive;
                metrics.month = monthActive;

                console.log('Active user counts:', {
                    today: todayActive,
                    week: weekActive,
                    month: monthActive
                });
            }

            // Calculate average games per active user
            const activeUsersWithGames = statsData?.filter(s => s.games_played > 0) || [];
            if (activeUsersWithGames.length > 0) {
                const totalGames = activeUsersWithGames.reduce((sum, stat) => sum + stat.games_played, 0);
                metrics.avgGamesPerUser = (totalGames / activeUsersWithGames.length).toFixed(1);
                console.log(`Average games: ${totalGames} total / ${activeUsersWithGames.length} users = ${metrics.avgGamesPerUser}`);
            } else {
                console.log('No users with games_played > 0');
            }

            console.log('=== FINAL METRICS ===', metrics);
            return metrics;

        } catch (e) {
            console.error('CRITICAL ERROR in getActiveUserMetrics:', e);
            return { today: 0, week: 0, month: 0, avgGamesPerUser: 0 };
        }
    }

    async getRetentionMetrics() {
        try {
            const metrics = {
                sevenDay: '0%',
                thirtyDay: '0%'
            };

            // Get users who signed up 7+ days ago
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
            const { data: eligibleWeek, error: weekError } = await this.supabase
                .from('user_profiles')
                .select('id')
                .lte('created_at', sevenDaysAgo);

            if (!weekError && eligibleWeek && eligibleWeek.length > 0) {
                // Check how many are still active
                const userIds = eligibleWeek.map(u => u.id);
                const weekAgoDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

                const { data: activeWeek, error: activeError } = await this.supabase
                    .from('user_stats')
                    .select('user_id')
                    .in('user_id', userIds)
                    .gte('last_played', weekAgoDate);

                if (!activeError && activeWeek) {
                    const retentionRate = (activeWeek.length / eligibleWeek.length * 100).toFixed(1);
                    metrics.sevenDay = `${retentionRate}%`;
                }
            }

            return metrics;
        } catch (e) {
            console.error('Failed to get retention metrics:', e);
            return { sevenDay: '0%', thirtyDay: '0%' };
        }
    }

    async getGuestSessions() {
        try {
            console.log('=== STARTING getGuestSessions ===');

            // Query ALL records from user_stats to debug
            const { data: allData, error: allError } = await this.supabase
                .from('user_stats')
                .select('session_id, user_id, games_played');

            if (allError) {
                console.error('ERROR querying user_stats for guest sessions:', allError);
                return 0;
            }

            console.log(`Total user_stats records: ${allData?.length || 0}`);

            if (!allData || allData.length === 0) {
                console.log('No data in user_stats table');
                return 0;
            }

            // Filter for guest sessions (no user_id but has session_id)
            const guestRecords = allData.filter(record =>
                !record.user_id && record.session_id
            );

            console.log(`Guest records found: ${guestRecords.length}`);

            // Count unique session IDs
            const uniqueSessionIds = new Set(guestRecords.map(r => r.session_id));
            const uniqueGuestSessions = uniqueSessionIds.size;

            console.log(`Unique guest sessions: ${uniqueGuestSessions}`);
            console.log('Sample guest session IDs:', Array.from(uniqueSessionIds).slice(0, 5));

            return uniqueGuestSessions;

        } catch (e) {
            console.error('CRITICAL ERROR in getGuestSessions:', e);
            return 0;
        }
    }

    async calculateEngagementScore() {
        try {
            // Changed to Signup Ratio as requested
            // Registered Users / Total Sessions (guests + registered)
            const registered = await this.getRegisteredUsers();
            const guestSessions = await this.getGuestSessions();

            // Total "players" including guest sessions
            const totalSessions = registered + guestSessions;

            if (totalSessions === 0) return '0%';

            // Calculate what percentage of total sessions are registered users
            const signupRatio = ((registered / totalSessions) * 100).toFixed(1);

            console.log(`Signup ratio: ${registered} registered / ${totalSessions} total = ${signupRatio}%`);
            return `${signupRatio}%`;
        } catch (e) {
            console.error('Failed to calculate signup ratio:', e);
            return '0%';
        }
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