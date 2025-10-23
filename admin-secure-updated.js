// Updated admin-secure.js with multiple fallback methods for fetching completions

// ... (keeping existing code for other tabs) ...

// Updated function to load daily completions with multiple fallback methods
async function loadDailyCompletions() {
    console.log('Loading daily completions...');
    const completionsContent = document.getElementById('completions-content');
    completionsContent.innerHTML = '<p>Loading puzzle completions...</p>';

    try {
        let completionsData = [];

        // Method 1: Try the main RPC function
        console.log('Trying Method 1: RPC get_daily_puzzle_completions');
        const { data: rpcData, error: rpcError } = await supabase
            .rpc('get_daily_puzzle_completions');

        if (rpcError) {
            console.error('Method 1 failed:', rpcError);
        } else {
            console.log('Method 1 success, data:', rpcData);
            completionsData = rpcData;
        }

        // Method 2: If RPC failed or returned empty, try the simple function
        if (!completionsData || completionsData.length === 0) {
            console.log('Trying Method 2: RPC get_completions_simple');
            const { data: simpleData, error: simpleError } = await supabase
                .rpc('get_completions_simple');

            if (simpleError) {
                console.error('Method 2 failed:', simpleError);
            } else {
                console.log('Method 2 success, data:', simpleData);
                completionsData = simpleData;
            }
        }

        // Method 3: If still no data, try direct query to the view
        if (!completionsData || completionsData.length === 0) {
            console.log('Trying Method 3: Direct query to puzzle_completions_view');
            const { data: viewData, error: viewError } = await supabase
                .from('puzzle_completions_view')
                .select('*');

            if (viewError) {
                console.error('Method 3 failed:', viewError);
            } else {
                console.log('Method 3 success, data:', viewData);
                completionsData = viewData;
            }
        }

        // Method 4: Last resort - direct table query with joins
        if (!completionsData || completionsData.length === 0) {
            console.log('Trying Method 4: Direct table query');
            const { data: directData, error: directError } = await supabase
                .from('game_sessions')
                .select(`
                    *,
                    user_profiles!inner(
                        email,
                        first_name
                    )
                `)
                .eq('game_won', true)
                .not('user_id', 'is', null)
                .order('created_at', { ascending: false });

            if (directError) {
                console.error('Method 4 failed:', directError);
            } else {
                console.log('Method 4 success, raw data:', directData);
                // Transform the data to match expected format
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

        console.log(`Final completions data: ${completionsData?.length || 0} records`);

        if (!completionsData || completionsData.length === 0) {
            completionsContent.innerHTML = '<p>No puzzle completions found. All methods failed to retrieve data.</p>';
            return;
        }

        // Group completions by date for display
        const completionsByDate = {};
        completionsData.forEach(completion => {
            // Handle different date formats
            const dateKey = completion.completion_date ||
                           completion.puzzle_date ||
                           (completion.completed_at ? new Date(completion.completed_at).toISOString().split('T')[0] : 'Unknown');

            if (!completionsByDate[dateKey]) {
                completionsByDate[dateKey] = [];
            }
            completionsByDate[dateKey].push(completion);
        });

        // Sort dates in descending order
        const sortedDates = Object.keys(completionsByDate).sort((a, b) => {
            if (a === 'Unknown') return 1;
            if (b === 'Unknown') return -1;
            return new Date(b) - new Date(a);
        });

        // Build HTML
        let html = '<div class="completions-list">';
        html += `<h3>Total Completions: ${completionsData.length}</h3>`;

        sortedDates.forEach(date => {
            const dayCompletions = completionsByDate[date];
            const formattedDate = date === 'Unknown' ? 'Unknown Date' :
                                 new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
                                     weekday: 'long',
                                     year: 'numeric',
                                     month: 'long',
                                     day: 'numeric'
                                 });

            html += `
                <div class="completion-day">
                    <h4>${formattedDate} (${dayCompletions.length} completions)</h4>
                    <table class="completions-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Completed At</th>
                                <th>Guesses</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            dayCompletions.forEach(completion => {
                const completedTime = completion.completed_at ?
                    new Date(completion.completed_at).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                    }) : 'Unknown';

                html += `
                    <tr>
                        <td>${completion.first_name || 'Unknown'}</td>
                        <td>${completion.email || 'Unknown'}</td>
                        <td>${completedTime}</td>
                        <td>${completion.guesses || '?'}</td>
                    </tr>
                `;
            });

            html += `
                        </tbody>
                    </table>
                </div>
            `;
        });

        html += '</div>';

        // Add CSS for styling
        if (!document.getElementById('completions-styles')) {
            const style = document.createElement('style');
            style.id = 'completions-styles';
            style.textContent = `
                .completions-list {
                    padding: 20px;
                }
                .completion-day {
                    margin-bottom: 30px;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    padding: 15px;
                    background: #f9f9f9;
                }
                .completion-day h4 {
                    margin-top: 0;
                    color: #333;
                    border-bottom: 2px solid #4CAF50;
                    padding-bottom: 10px;
                }
                .completions-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px;
                }
                .completions-table th,
                .completions-table td {
                    text-align: left;
                    padding: 8px;
                    border-bottom: 1px solid #ddd;
                }
                .completions-table th {
                    background-color: #4CAF50;
                    color: white;
                    font-weight: bold;
                }
                .completions-table tr:hover {
                    background-color: #f5f5f5;
                }
            `;
            document.head.appendChild(style);
        }

        completionsContent.innerHTML = html;

    } catch (error) {
        console.error('Error loading completions:', error);
        completionsContent.innerHTML = '<p>Error loading puzzle completions. Check console for details.</p>';
    }
}

// Make sure the function is called when the Completions tab is clicked
document.addEventListener('DOMContentLoaded', function() {
    // ... (existing tab click handlers) ...

    // Update the tab click handler to call loadDailyCompletions
    const completionsTab = document.querySelector('[data-tab="completions"]');
    if (completionsTab) {
        completionsTab.addEventListener('click', function() {
            console.log('Completions tab clicked');
            loadDailyCompletions();
        });
    }
});