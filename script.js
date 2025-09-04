// Database service for Supabase integration
// Updated: Fix incognito session issue v1.1
class DatabaseService {
    constructor() {
        this.supabase = window.supabaseClient;
        this.currentUser = null;
        // Store the public client for leaderboard queries
        this.publicClient = window.supabaseClient;
    }
    
    // Temporary method to create mock leaderboard data for testing
    async createMockLeaderboardData(date) {
        console.log('Creating mock leaderboard data due to RLS restrictions');
        
        // This is a temporary solution to demonstrate the leaderboard functionality
        // until database RLS policies are adjusted
        const mockData = [
            {
                user_id: 'mock-user-1',
                completion_time: 45,
                guesses: 3,
                word: 'LEASE',
                date: date,
                user_profiles: { first_name: 'justin1' }
            },
            {
                user_id: 'mock-user-2', 
                completion_time: 67,
                guesses: 4,
                word: 'LEASE',
                date: date,
                user_profiles: { first_name: 'justin6' }
            },
            {
                user_id: 'mock-user-3',
                completion_time: 89,
                guesses: 4, 
                word: 'LEASE',
                date: date,
                user_profiles: { first_name: 'Alice' }
            },
            {
                user_id: 'mock-user-4',
                completion_time: 123,
                guesses: 5,
                word: 'LEASE', 
                date: date,
                user_profiles: { first_name: 'Bob' }
            }
        ];
        
        return { data: mockData, error: null };
    }
    
    async createMockStreakData() {
        console.log('Creating mock streak data due to RLS restrictions');
        
        const mockStreaks = [
            {
                user_id: 'mock-user-1',
                max_streak: 15,
                current_streak: 8,
                user_profiles: { first_name: 'justin1' }
            },
            {
                user_id: 'mock-user-2',
                max_streak: 12,
                current_streak: 12,
                user_profiles: { first_name: 'justin6' }
            },
            {
                user_id: 'mock-user-3',
                max_streak: 9,
                current_streak: 3,
                user_profiles: { first_name: 'Alice' }
            },
            {
                user_id: 'mock-user-4',
                max_streak: 7,
                current_streak: 0,
                user_profiles: { first_name: 'Bob' }
            }
        ];
        
        return { data: mockStreaks, error: null };
    }

    // Authentication methods
    async signUp(email, password, firstName, marketingConsent = false) {
        try {
            const { data, error } = await this.supabase.auth.signUp({
                email: email,
                password: password
            });

            if (error) throw error;

            // Create user profile
            const { error: profileError } = await this.supabase
                .from('user_profiles')
                .insert([
                    {
                        id: data.user.id,
                        first_name: firstName,
                        email: email,
                        marketing_consent: marketingConsent
                    }
                ]);

            if (profileError) throw profileError;

            return { user: data.user, error: null };
        } catch (error) {
            return { user: null, error: error.message };
        }
    }

    async signIn(email, password) {
        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;
            this.currentUser = data.user;
            return { user: data.user, error: null };
        } catch (error) {
            return { user: null, error: error.message };
        }
    }

    async signOut() {
        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;
            this.currentUser = null;
            return { error: null };
        } catch (error) {
            return { error: error.message };
        }
    }

    async getCurrentUser() {
        const { data: { user } } = await this.supabase.auth.getUser();
        this.currentUser = user;
        return user;
    }

    async getUserProfile(userId) {
        const { data, error } = await this.supabase
            .from('user_profiles')
            .select('*')
            .eq('id', userId)
            .single();

        // If profile doesn't exist, create a basic one
        if (error && error.code === 'PGRST116') { // No rows found
            const user = await this.supabase.auth.getUser();
            if (user.data.user && user.data.user.id === userId) {
                const email = user.data.user.email;
                const firstName = email ? email.split('@')[0] : 'User';
                
                const { data: newProfile, error: createError } = await this.supabase
                    .from('user_profiles')
                    .insert([{
                        id: userId,
                        first_name: firstName,
                        email: email,
                        marketing_consent: false
                    }])
                    .select()
                    .single();
                
                if (!createError) {
                    return { data: newProfile, error: null };
                }
            }
        }

        return { data, error };
    }

    // Stats methods
    async getUserStats(userId) {
        const { data, error } = await this.supabase
            .from('user_stats')
            .select('*')
            .eq('user_id', userId)
            .single();

        // If we get an error or corrupted data, try to fix it
        if (error && error.code === 'PGRST116') {
            // No stats exist, create initial record
            console.log('No stats found for user, creating initial record');
            const { data: newData, error: createError } = await this.supabase
                .from('user_stats')
                .insert({
                    user_id: userId,
                    games_played: 0,
                    games_won: 0,
                    current_streak: 0,
                    max_streak: 0,
                    guess_distribution: [0,0,0,0,0,0]
                })
                .select()
                .single();
            
            return { data: newData, error: createError };
        }

        return { data, error };
    }

    async updateUserStats(userId, stats) {
        const { data, error } = await this.supabase
            .from('user_stats')
            .upsert({
                user_id: userId,
                ...stats,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id'
            });

        return { data, error };
    }

    // Leaderboard methods
    async getDailyLeaderboard(date) {
        try {
            // Use RPC function to bypass RLS for leaderboards
            const { data, error } = await this.supabase.rpc('get_public_daily_leaderboard', {
                target_date: date
            });
            
            if (error) {
                console.error('Error fetching daily leaderboard:', error);
                return { data: [], error };
            }
            
            return { data: data || [], error: null };
        } catch (err) {
            console.error('Daily leaderboard fetch failed:', err);
            return { data: [], error: err };
        }
    }

    async getStreakLeaderboard() {
        try {
            // Use RPC function to bypass RLS for streak leaderboards
            console.log('Calling get_public_streak_leaderboard RPC function...');
            const { data, error } = await this.supabase.rpc('get_public_streak_leaderboard');
            
            if (error) {
                console.error('RPC Error fetching streak leaderboard:', error);
                console.error('Error details:', JSON.stringify(error));
                return { data: [], error };
            }
            
            console.log('Streak leaderboard RPC returned:', data);
            return { data: data || [], error: null };
        } catch (err) {
            console.error('Streak leaderboard fetch exception:', err);
            console.error('Exception details:', JSON.stringify(err));
            return { data: [], error: err };
        }
    }

    async updateDailyLeaderboard(userId, date, completionTime, guesses, word) {
        const { data, error } = await this.supabase
            .from('daily_leaderboard')
            .upsert({
                user_id: userId,
                date: date,
                completion_time: completionTime,
                guesses: guesses,
                word: word
            }, {
                onConflict: 'user_id,date'
            });

        return { data, error };
    }

    // Game session methods
    async saveGameSession(userId, sessionData) {
        const { data, error } = await this.supabase
            .from('game_sessions')
            .upsert({
                user_id: userId,
                ...sessionData,
                updated_at: new Date().toISOString()
            });

        return { data, error };
    }

    async getGameSession(userId, date) {
        const { data, error } = await this.supabase
            .from('game_sessions')
            .select('*')
            .eq('user_id', userId)
            .eq('date', date)
            .single();

        return { data, error };
    }
}

// Property Management Wordle Game
class PMWordle {
    constructor() {
        // Initialize database service
        this.db = new DatabaseService();
        // Property Management Answer Bank (59 words) - these are the daily answers
        this.answerBank = [
            'LEASE', 'RENTS', 'TOWER', 'CONDO', 'AGENT', 'LOBBY', 'SUITE', 'OWNER', 'ASSET', 'UNITS',
            'TAXES', 'TRUST', 'YIELD', 'HOUSE', 'PROPS', 'SPACE', 'FLOOR', 'DOORS', 'WALLS', 'ROOFS',
            'POOLS', 'YARDS', 'FENCE', 'DECKS', 'PORCH', 'DRIVE', 'ROADS', 'PATHS', 'PIPES', 'WATER',
            'POWER', 'ELECT', 'AUDIT', 'CLEAN', 'PAINT', 'FIXES', 'CALLS', 'TOURS', 'SHOWS',
            'SIGNS', 'LISTS', 'SALES', 'BUYER', 'SELLS', 'LOANS', 'BANKS', 'FUNDS', 'COSTS', 'BILLS',
            'GROSS', 'RENTS', 'VALUE', 'PRICE', 'MONTH', 'YEARS', 'TERMS', 'DEALS', 'FORMS', 'CODES'
        ];
        
        // Validate all answer bank words are 5 letters
        this.answerBank = this.answerBank.filter(word => {
            if (word.length !== 5) {
                console.error(`Removing invalid word from answer bank: ${word} (${word.length} letters)`);
                return false;
            }
            return true;
        });

        // Valid guess words - will be loaded from CSV file
        this.validWords = [];
        
        // Game state
        this.currentWord = '';
        this.currentRow = 0;
        this.currentCol = 0;
        this.gameOver = false;
        this.gameWon = false;
        this.guesses = [];
        this.startTime = null;
        this.endTime = null;
        this.hardMode = false;
        this.isGuest = true;
        this.currentUser = null;
        this.processingGuess = false;

        // Initialize game
        this.init().catch(error => {
            console.error('Game initialization failed:', error);
            // Fallback initialization
            this.initGame();
            this.setupEventListeners();
            this.loadSettings();
            this.updateCountdown();
        });

        // Check for existing user session
        this.checkUserSession();
    }

    async checkUserSession() {
        try {
            console.log('Checking user session...');
            console.log('User agent:', navigator.userAgent);
            console.log('Storage type:', this.detectStorageType());
            
            // ALWAYS start in guest mode by default
            console.log('Starting in guest mode - user must explicitly log in');
            
            // Clear any existing session to ensure fresh start
            try {
                await this.db.supabase.auth.signOut({ scope: 'local' });
            } catch (signOutError) {
                console.log('Sign out error (expected):', signOutError);
            }
            
            // Clear all authentication-related localStorage
            this.clearUserSession();
            
            // Force guest mode
            this.isGuest = true;
            this.currentUser = null;
            
            this.updateAuthUI();
            
        } catch (error) {
            console.error('Session check failed:', error);
            // On any error, ensure guest mode
            this.isGuest = true;
            this.currentUser = null;
            this.clearUserSession();
            this.updateAuthUI();
        }
    }
    
    scrollToGame() {
        // Scroll to the game board on mobile when guest mode is activated
        const gameContainer = document.getElementById('game-board') || document.querySelector('.game-board');
        if (gameContainer) {
            gameContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
    
    continueAsGuest() {
        // Called when user explicitly chooses to skip auth and play as guest
        this.isGuest = true;
        this.currentUser = null;
        
        // On mobile, scroll to game area
        if (window.innerWidth <= 768) {
            setTimeout(() => this.scrollToGame(), 300);
        }
    }
    
    dismissSignupPromptWithTease(promptId, skipTease = false) {
        // Remove the signup prompt
        const prompt = document.getElementById(promptId);
        if (prompt) {
            prompt.remove();
        }
        
        // If skipTease is true, just close without teasing (to prevent infinite loops)
        if (skipTease) {
            return;
        }
        
        // Show stats briefly to tease them
        this.showModal('stats');
        
        // After 1 second, hide stats and show prompt again (but with modified close behavior)
        setTimeout(() => {
            this.hideModal('stats');
            // Show the appropriate signup prompt again, but modify it to close normally on second dismissal
            if (promptId === 'guest-stats-signup-prompt') {
                this.showGuestStatsSignupPromptWithNormalClose();
            } else {
                this.showGuestSignupPromptWithNormalClose();
            }
        }, 1000);
    }
    
    detectStorageType() {
        try {
            // Try to determine if we're in incognito/private mode
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                navigator.storage.estimate().then(estimate => {
                    console.log('Storage quota:', estimate.quota);
                    console.log('Storage usage:', estimate.usage);
                });
            }
            return 'localStorage available';
        } catch (e) {
            return 'localStorage unavailable';
        }
    }
    
    clearUserSession() {
        this.currentUser = null;
        this.isGuest = true;
        
        // Clear ALL authentication-related localStorage keys
        const keysToRemove = [
            'pm-wordle-current-user',
            'pm-wordle-persist-login', 
            'pm-wordle-persist-timestamp',
            'supabase.auth.token',
            'sb-taeetzxhrdohdijwgous-auth-token'  // Supabase auth key
        ];
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });
        
        // Also try to clear any Supabase-specific keys that might exist
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('supabase') || key.startsWith('sb-')) {
                localStorage.removeItem(key);
            }
        });
    }

    async init() {
        try {
            // Load words first
            await this.loadWordsFromFile();
        } catch (error) {
            console.error('Failed to load words:', error);
            // Continue with fallback words
        }
        
        // Always initialize the rest of the game
        this.initGame();
        this.setupEventListeners();
        this.loadSettings();
        this.updateCountdown();
        
        // Ensure game elements are interactive
        document.querySelector('.game-board').style.pointerEvents = 'auto';
        document.querySelector('.keyboard').style.pointerEvents = 'auto';
        
        // Initialize leaderboards to ensure they load properly
        setTimeout(() => this.initializeLeaderboards(), 1000);
        
        // On mobile, scroll to game area after initialization
        if (window.innerWidth <= 768) {
            setTimeout(() => this.scrollToGame(), 500);
        }
    }
    
    async initializeLeaderboards() {
        console.log('Initializing leaderboards...');
        try {
            await this.renderDailyLeaderboard();
            await this.updateStreakLeaderboard();
            console.log('Leaderboards initialized successfully');
        } catch (error) {
            console.error('Error initializing leaderboards:', error);
        }
    }

    async loadWordsFromFile() {
        try {
            const response = await fetch('./wordle-5-letter-words');
            const text = await response.text();
            
            // Parse the CSV/text file - each line is a word
            const words = text.trim().split('\n').map(word => word.trim().toUpperCase());
            
            // Skip the header if it exists (first line might be "word")
            if (words[0] === 'WORD') {
                words.shift();
            }
            
            // Filter out any empty lines and ensure 5-letter words
            this.validWords = words.filter(word => word.length === 5);
            
            console.log(`Loaded ${this.validWords.length} words from file`);
            console.log('First 10 words:', this.validWords.slice(0, 10));
            
            // Also include our answer bank in the valid words
            this.answerBank.forEach(word => {
                if (!this.validWords.includes(word)) {
                    this.validWords.push(word);
                }
            });
            
        } catch (error) {
            console.error('Error loading words from file:', error);
            console.log('Using fallback word list');
            // Fallback to a comprehensive word list if file loading fails
            this.validWords = [
                ...this.answerBank,
                'ACHES', 'CHATS', // Common words that were missing
                'ABOUT', 'ABOVE', 'ABUSE', 'ACTOR', 'ACUTE', 'ADMIT', 'ADOPT', 'ADULT', 'AFTER', 'AGAIN',
                'AGENT', 'AGREE', 'AHEAD', 'ALARM', 'ALBUM', 'ALERT', 'ALIEN', 'ALIGN', 'ALIKE', 'ALIVE',
                'ALLOW', 'ALONE', 'ALONG', 'ALTER', 'AMONG', 'ANGER', 'ANGLE', 'ANGRY', 'APART', 'APPLE',
                'APPLY', 'ARENA', 'ARGUE', 'ARISE', 'ARRAY', 'ASIDE', 'ASSET', 'AVOID', 'AWAKE', 'AWARD',
                'AWARE', 'BADLY', 'BASIC', 'BEACH', 'BEGAN', 'BEGIN', 'BEING', 'BELOW', 'BENCH', 'BIRTH',
                'BLACK', 'BLAME', 'BLANK', 'BLAST', 'BLIND', 'BLOCK', 'BLOOD', 'BOARD', 'BOOST', 'BOUND',
                'BRAIN', 'BRAND', 'BRAVE', 'BREAD', 'BREAK', 'BREED', 'BRIEF', 'BRING', 'BROAD', 'BROKE',
                'BROWN', 'BUILD', 'BUILT', 'CARRY', 'CATCH', 'CAUSE', 'CHAIN', 'CHAIR', 'CHART', 'CHASE',
                'CHECK', 'CHEST', 'CHIEF', 'CHILD', 'CHINA', 'CHOSE', 'CIVIL', 'CLAIM', 'CLASS', 'CLEAN',
                'CLEAR', 'CLICK', 'CLIMB', 'CLOCK', 'CLOSE', 'CLOUD', 'COACH', 'COAST', 'COULD', 'COUNT',
                'COURT', 'COVER', 'CRAFT', 'CRASH', 'CRAZY', 'CREAM', 'CRIME', 'CROSS', 'CROWD', 'CROWN',
                'DANCE', 'DEATH', 'DEPTH', 'DOUBT', 'DOZEN', 'DRAFT', 'DRAMA', 'DRANK', 'DREAM', 'DRESS',
                'DRILL', 'DRINK', 'DRIVE', 'DROVE', 'DYING', 'EAGER', 'EARLY', 'EARTH', 'EIGHT', 'ELITE',
                'EMPTY', 'ENEMY', 'ENJOY', 'ENTER', 'ENTRY', 'EQUAL', 'ERROR', 'EVENT', 'EVERY', 'EXACT',
                'EXIST', 'EXTRA', 'FAITH', 'FALSE', 'FAULT', 'FIELD', 'FIFTH', 'FIFTY', 'FIGHT', 'FINAL',
                'FIRST', 'FIXED', 'FLASH', 'FLEET', 'FLOOR', 'FOCUS', 'FORCE', 'FORTH', 'FORTY', 'FORUM',
                'FOUND', 'FRAME', 'FRANK', 'FRAUD', 'FRESH', 'FRONT', 'FRUIT', 'FULLY', 'FUNNY', 'GIANT',
                'GIVEN', 'GLASS', 'GLOBE', 'GOING', 'GRACE', 'GRADE', 'GRAND', 'GRANT', 'GRASS', 'GRAVE',
                'GREAT', 'GREEN', 'GROSS', 'GROUP', 'GROWN', 'GUARD', 'GUESS', 'GUEST', 'GUIDE', 'HAPPY',
                'HARSH', 'HEART', 'HEAVY', 'HENCE', 'HORSE', 'HOTEL', 'HOUSE', 'HUMAN', 'HURRY', 'IMAGE',
                'INDEX', 'INNER', 'INPUT', 'ISSUE', 'JAPAN', 'JIMMY', 'JOINT', 'JONES', 'JUDGE', 'KNOWN',
                'LABEL', 'LARGE', 'LASER', 'LATER', 'LAUGH', 'LAYER', 'LEARN', 'LEASE', 'LEAST', 'LEAVE',
                'LEGAL', 'LEVEL', 'LEWIS', 'LIGHT', 'LIMIT', 'LINKS', 'LIVES', 'LOCAL', 'LOOSE', 'LOWER',
                'LUCKY', 'LUNCH', 'LYING', 'MAGIC', 'MAJOR', 'MAKER', 'MARCH', 'MARIA', 'MATCH', 'MAYBE',
                'MAYOR', 'MEANT', 'MEDIA', 'METAL', 'MIGHT', 'MINOR', 'MINUS', 'MIXED', 'MODEL', 'MONEY',
                'MONTH', 'MORAL', 'MOTOR', 'MOUNT', 'MOUSE', 'MOUTH', 'MOVED', 'MOVIE', 'MUSIC', 'NEEDS',
                'NEVER', 'NEWLY', 'NIGHT', 'NOISE', 'NORTH', 'NOTED', 'NOVEL', 'NURSE', 'OCEAN', 'OFFER',
                'OFTEN', 'ORDER', 'OTHER', 'OUGHT', 'PAINT', 'PANEL', 'PAPER', 'PARTY', 'PEACE', 'PETER',
                'PHASE', 'PHONE', 'PHOTO', 'PIANO', 'PIECE', 'PILOT', 'PITCH', 'PLACE', 'PLAIN', 'PLANE',
                'PLANT', 'PLATE', 'POINT', 'POUND', 'POWER', 'PRESS', 'PRICE', 'PRIDE', 'PRIME', 'PRINT',
                'PRIOR', 'PRIZE', 'PROOF', 'PROUD', 'PROVE', 'QUEEN', 'QUICK', 'QUIET', 'QUITE', 'RADIO',
                'RAISE', 'RANGE', 'RAPID', 'RATIO', 'REACH', 'READY', 'REALM', 'REBEL', 'REFER', 'RELAX',
                'REPLY', 'RIGHT', 'RIGID', 'RIVAL', 'RIVER', 'ROBOT', 'ROMAN', 'ROUGH', 'ROUND', 'ROUTE',
                'ROYAL', 'RURAL', 'SCALE', 'SCENE', 'SCOPE', 'SCORE', 'SENSE', 'SERVE', 'SETUP', 'SEVEN',
                'SHALL', 'SHAPE', 'SHARE', 'SHARP', 'SHEET', 'SHELF', 'SHELL', 'SHIFT', 'SHINE', 'SHIRT',
                'SHOCK', 'SHOOT', 'SHORT', 'SHOWN', 'SIGHT', 'SILLY', 'SINCE', 'SIXTH', 'SIXTY', 'SIZED',
                'SKILL', 'SLEEP', 'SLIDE', 'SMALL', 'SMART', 'SMILE', 'SMITH', 'SMOKE', 'SOLID', 'SOLVE',
                'SORRY', 'SOUND', 'SOUTH', 'SPACE', 'SPARE', 'SPEAK', 'SPEED', 'SPEND', 'SPENT', 'SPLIT',
                'SPOKE', 'SPORT', 'STAFF', 'STAGE', 'STAKE', 'STAND', 'START', 'STATE', 'STEAM', 'STEEL',
                'STICK', 'STILL', 'STOCK', 'STONE', 'STOOD', 'STORE', 'STORM', 'STORY', 'STRIP', 'STUCK',
                'STUDY', 'STUFF', 'STYLE', 'SUGAR', 'SUITE', 'SUPER', 'SWEET', 'TABLE', 'TAKEN', 'TASTE',
                'TAXES', 'TEACH', 'TENDS', 'TEXAS', 'THANK', 'THEFT', 'THEIR', 'THEME', 'THERE', 'THESE',
                'THICK', 'THING', 'THINK', 'THIRD', 'THOSE', 'THREE', 'THREW', 'THROW', 'THUMB', 'TIGHT',
                'TIRED', 'TITLE', 'TODAY', 'TOPIC', 'TOTAL', 'TOUCH', 'TOUGH', 'TOWER', 'TRACK', 'TRADE',
                'TRAIN', 'TREAT', 'TREND', 'TRIAL', 'TRIBE', 'TRICK', 'TRIED', 'TRIES', 'TRUCK', 'TRULY',
                'TRUNK', 'TRUST', 'TRUTH', 'TWICE', 'UNCLE', 'UNDER', 'UNDUE', 'UNION', 'UNITY', 'UNTIL',
                'UPPER', 'UPSET', 'URBAN', 'USAGE', 'USUAL', 'VALID', 'VALUE', 'VIDEO', 'VIRUS', 'VISIT',
                'VITAL', 'VOCAL', 'VOICE', 'WASTE', 'WATCH', 'WATER', 'WHEEL', 'WHERE', 'WHICH', 'WHILE',
                'WHITE', 'WHOLE', 'WHOSE', 'WOMAN', 'WOMEN', 'WORLD', 'WORRY', 'WORSE', 'WORST', 'WORTH',
                'WOULD', 'WRITE', 'WRONG', 'WROTE', 'YOUTH', 'JUMPS', 'RULES'
            ];
        }
    }

    initGame() {
        this.currentWord = this.getTodaysWord();
        this.startTime = new Date();
        
        // Reset keyboard to clean state before loading any saved state
        this.resetKeyboard();
        
        this.loadGameState();
        this.renderBoard();
        this.updateStats();
    }
    
    resetKeyboard() {
        // Reset all keyboard keys to default state
        document.querySelectorAll('.key').forEach(key => {
            key.classList.remove('correct', 'present', 'absent');
        });
    }

    getPuzzleDate() {
        // Get the current puzzle date based on 12pm reset time
        const now = new Date();
        const resetHour = 12; // 12pm reset
        
        // Create a date object for today at reset time
        let puzzleDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), resetHour);
        
        // If current time is before reset time, use yesterday's date
        if (now.getHours() < resetHour) {
            puzzleDate.setDate(puzzleDate.getDate() - 1);
        }
        
        // Return in YYYY-MM-DD format for database compatibility
        return puzzleDate.toISOString().split('T')[0];
    }

    getTodaysWord() {
        // Test mode: Use a fixed word for testing if set
        if (window.testWord) {
            console.log('Using test word:', window.testWord);
            return window.testWord.toUpperCase();
        }
        
        // Get word based on current date and 12pm reset time
        const now = new Date();
        const resetHour = 12; // 12pm reset
        
        // Create a date object for today at reset time
        let today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), resetHour);
        
        // If current time is before reset time, use yesterday's date
        if (now.getHours() < resetHour) {
            today.setDate(today.getDate() - 1);
        }
        
        // Use the date as seed for consistent word selection
        const seed = Math.floor(today.getTime() / (1000 * 60 * 60 * 24));
        const wordIndex = seed % this.answerBank.length;
        const selectedWord = this.answerBank[wordIndex];
        
        // Validate that the word is exactly 5 letters (safety check)
        if (selectedWord.length !== 5) {
            console.error(`Invalid word length: ${selectedWord} (${selectedWord.length} letters)`);
            // Fallback to a valid word
            return 'LEASE';
        }
        
        return selectedWord;
    }

    setupEventListeners() {
        console.log('Setting up event listeners');
        
        // Mobile viewport and centering adjustments
        this.setupMobileOptimizations();
        
        // Physical keyboard
        document.addEventListener('keydown', (e) => {
            console.log('Keydown event:', e.key);
            
            // Don't handle game keys if user is in authentication mode or typing in forms
            if (this.shouldIgnoreKeyPress(e.target)) {
                console.log('Ignoring keypress - user is in form/auth mode');
                return;
            }
            
            if (this.gameOver) return;
            this.handleKeyPress(e.key);
        });

        // On-screen keyboard - Enhanced mobile support
        const keyElements = document.querySelectorAll('.key');
        console.log('Found', keyElements.length, 'key elements');
        keyElements.forEach(key => {
            // Add both click and touch events for mobile
            const handleKeyInput = (e) => {
                e.preventDefault(); // Prevent zoom on double-tap
                console.log('Key activated:', key.getAttribute('data-key'));
                if (this.gameOver) return;
                const keyValue = key.getAttribute('data-key');
                
                // Add visual feedback for touch
                key.style.transform = 'scale(0.92)';
                key.style.opacity = '0.8';
                setTimeout(() => {
                    key.style.transform = '';
                    key.style.opacity = '';
                }, 100);
                
                this.handleKeyPress(keyValue);
            };
            
            // Use touchstart for faster response on mobile
            if ('ontouchstart' in window) {
                key.addEventListener('touchstart', handleKeyInput, { passive: false });
                // Prevent click event to avoid double triggers
                key.addEventListener('click', (e) => e.preventDefault());
            } else {
                key.addEventListener('click', handleKeyInput);
            }
            
            // Prevent text selection and context menu
            key.addEventListener('contextmenu', (e) => e.preventDefault());
            key.addEventListener('selectstart', (e) => e.preventDefault());
        });

        // Modal controls
        this.setupModalListeners();
        
        // Auth system
        this.setupAuthListeners();
        
        // Settings
        this.setupSettingsListeners();
        
        // Leaderboard tabs
        this.setupLeaderboardTabs();
    }
    
    shouldIgnoreKeyPress(target) {
        // Check if any input field is currently focused
        const activeElement = document.activeElement;
        if (activeElement) {
            const tagName = activeElement.tagName.toLowerCase();
            const isInputActive = ['input', 'textarea', 'select'].includes(tagName);
            if (isInputActive) {
                console.log('Ignoring - input field is focused:', activeElement.id || activeElement.tagName);
                return true;
            }
        }
        
        return false;
    }
    
    showStatsModal() {
        if (this.isGuest) {
            // For guests: show stats briefly, then prompt signup
            this.showModal('stats');
            setTimeout(() => {
                this.hideModal('stats');
                this.showGuestStatsSignupPrompt();
            }, 1000); // Show for 1 second
        } else {
            // For logged-in users: show normally
            this.showModal('stats');
        }
    }
    
    showGameCompletionModal() {
        if (this.isGuest && this.gameWon) {
            // For guests who won: show stats briefly, then signup prompt
            this.showModal('stats');
            setTimeout(() => {
                this.hideModal('stats');
                this.showGuestSignupPrompt();
            }, 1000); // Show for 1 second
        } else {
            // Show regular stats modal
            this.showModal('stats');
        }
    }
    
    showGuestStatsSignupPrompt() {
        // Create and show a stats-specific signup prompt
        const existingPrompt = document.getElementById('guest-stats-signup-prompt');
        if (existingPrompt) {
            existingPrompt.remove();
        }
        
        const promptHTML = `
            <div id="guest-stats-signup-prompt" class="modal show" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 2500; display: flex !important; align-items: center; justify-content: center; background-color: rgba(0, 0, 0, 0.6); overflow: auto;">
                <div class="modal-content" style="max-width: 400px; width: 90%; max-height: 90vh; overflow-y: auto; margin: 20px; background: white; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
                    <div class="modal-header">
                        <h2>📊 Sign Up for Full Stats</h2>
                        <button class="close-btn" onclick="game.dismissSignupPromptWithTease('guest-stats-signup-prompt');">&times;</button>
                    </div>
                    <div class="modal-body" style="text-align: center;">
                        <p><strong>Want to track your progress?</strong></p>
                        <div class="mecca-voucher" style="margin: 16px 0; padding: 16px; background: linear-gradient(135deg, #ff6b6b, #4ecdc4); color: white; border-radius: 8px; font-weight: bold;">
                            🎁 Sign up to record your streaks<br>
                            and be in the running for a<br>
                            <span style="font-size: 1.2em; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">MECCA VOUCHER</span>
                        </div>
                        <p style="color: #666; font-size: 14px; margin: 12px 0;">
                            Track your progress, compare with friends, and compete for prizes!
                        </p>
                        <div style="display: flex; gap: 12px; justify-content: center; margin-top: 20px;">
                            <button onclick="game.promptSignupFromGuest()" class="share-btn" style="margin: 0;">
                                Sign Up Now!
                            </button>
                            <button onclick="game.dismissSignupPromptWithTease('guest-stats-signup-prompt');" class="skip-btn" style="margin: 0; padding: 12px 16px;">
                                Maybe Later
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', promptHTML);
    }
    
    showGuestSignupPrompt() {
        // Create and show a custom signup prompt
        const existingPrompt = document.getElementById('guest-signup-prompt');
        if (existingPrompt) {
            existingPrompt.remove();
        }
        
        const promptHTML = `
            <div id="guest-signup-prompt" class="modal show" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 2500; display: flex !important; align-items: center; justify-content: center; background-color: rgba(0, 0, 0, 0.6); overflow: auto;">
                <div class="modal-content" style="max-width: 400px; width: 90%; max-height: 90vh; overflow-y: auto; margin: 20px; background: white; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
                    <div class="modal-header">
                        <h2>🎉 Congratulations!</h2>
                        <button class="close-btn" onclick="game.dismissSignupPromptWithTease('guest-signup-prompt');">&times;</button>
                    </div>
                    <div class="modal-body" style="text-align: center;">
                        <p><strong>Great job solving today's puzzle!</strong></p>
                        <div class="mecca-voucher" style="margin: 16px 0;">
                            Sign up now to be in the running for a<br>
                            <strong>$50 MECCA voucher</strong> given to a player daily!
                        </div>
                        <p style="font-size: 14px; color: #666; margin-bottom: 12px;">
                            Create an account to:
                        </p>
                        <ul style="font-size: 14px; color: #666; margin-bottom: 12px; text-align: left; max-width: 300px; margin-left: auto; margin-right: auto;">
                            <li>See your results and compare to others</li>
                            <li>Track your stats and streaks</li>
                            <li>Compete on daily leaderboards</li>
                            <li>Win daily prizes!</li>
                        </ul>
                        <p style="font-size: 12px; color: #888; margin-bottom: 20px;">
                            <strong>New puzzle released daily at 12:00 PM</strong>
                        </p>
                        <div style="display: flex; gap: 12px; justify-content: center;">
                            <button onclick="game.promptSignupFromGuest()" class="share-btn" style="margin: 0;">
                                Sign Up for Prizes!
                            </button>
                            <button onclick="game.dismissSignupPromptWithTease('guest-signup-prompt');" class="skip-btn" style="margin: 0; padding: 12px 16px;">
                                Maybe Later
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', promptHTML);
        
        // Ensure the modal is visible and scroll to top if needed
        setTimeout(() => {
            const modal = document.getElementById('guest-signup-prompt');
            if (modal) {
                modal.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Also scroll the main window to top
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }, 100);
    }
    
    showGuestStatsSignupPromptWithNormalClose() {
        // Same as showGuestStatsSignupPrompt but with normal close behavior (no teasing loop)
        const existingPrompt = document.getElementById('guest-stats-signup-prompt');
        if (existingPrompt) {
            existingPrompt.remove();
        }
        
        const promptHTML = `
            <div id="guest-stats-signup-prompt" class="modal show" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 2500; display: flex !important; align-items: center; justify-content: center; background-color: rgba(0, 0, 0, 0.6); overflow: auto;">
                <div class="modal-content" style="max-width: 400px; width: 90%; max-height: 90vh; overflow-y: auto; margin: 20px; background: white; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
                    <div class="modal-header">
                        <h2>📊 Sign Up for Full Stats</h2>
                        <button class="close-btn" onclick="document.getElementById('guest-stats-signup-prompt').remove();">&times;</button>
                    </div>
                    <div class="modal-body" style="text-align: center;">
                        <p><strong>Want to track your progress?</strong></p>
                        <div class="mecca-voucher" style="margin: 16px 0; padding: 16px; background: linear-gradient(135deg, #ff6b6b, #4ecdc4); color: white; border-radius: 8px; font-weight: bold;">
                            🎁 Sign up to record your streaks<br>
                            and be in the running for a<br>
                            <span style="font-size: 1.2em; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">MECCA VOUCHER</span>
                        </div>
                        <p style="color: #666; font-size: 14px; margin: 12px 0;">
                            Track your progress, compare with friends, and compete for prizes!
                        </p>
                        <div style="display: flex; gap: 12px; justify-content: center; margin-top: 20px;">
                            <button onclick="game.promptSignupFromGuest()" class="share-btn" style="margin: 0;">
                                Sign Up Now!
                            </button>
                            <button onclick="document.getElementById('guest-stats-signup-prompt').remove();" class="skip-btn" style="margin: 0; padding: 12px 16px;">
                                Maybe Later
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', promptHTML);
    }
    
    showGuestSignupPromptWithNormalClose() {
        // Same as showGuestSignupPrompt but with normal close behavior (no teasing loop)
        const existingPrompt = document.getElementById('guest-signup-prompt');
        if (existingPrompt) {
            existingPrompt.remove();
        }
        
        const promptHTML = `
            <div id="guest-signup-prompt" class="modal show" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 2500; display: flex !important; align-items: center; justify-content: center; background-color: rgba(0, 0, 0, 0.6); overflow: auto;">
                <div class="modal-content" style="max-width: 400px; width: 90%; max-height: 90vh; overflow-y: auto; margin: 20px; background: white; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
                    <div class="modal-header">
                        <h2>🎉 Congratulations!</h2>
                        <button class="close-btn" onclick="document.getElementById('guest-signup-prompt').remove();">&times;</button>
                    </div>
                    <div class="modal-body" style="text-align: center;">
                        <p><strong>Great job solving today's puzzle!</strong></p>
                        <div class="mecca-voucher" style="margin: 16px 0;">
                            Sign up now to be in the running for a<br>
                            <span style="font-size: 1.2em; font-weight: bold; color: #ff6b35;">MECCA VOUCHER</span>
                        </div>
                        <p style="color: #666; font-size: 14px; margin: 12px 0;">
                            🏆 Compete on leaderboards<br>
                            📈 Track your streak & progress<br>
                            🎁 Win amazing prizes!
                        </p>
                        <div style="display: flex; gap: 12px; justify-content: center;">
                            <button onclick="game.promptSignupFromGuest()" class="share-btn" style="margin: 0;">
                                Sign Up for Prizes!
                            </button>
                            <button onclick="document.getElementById('guest-signup-prompt').remove();" class="skip-btn" style="margin: 0; padding: 12px 16px;">
                                Maybe Later
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', promptHTML);
        
        // Ensure the modal is visible and scroll to top if needed
        setTimeout(() => {
            const modal = document.getElementById('guest-signup-prompt');
            if (modal) {
                modal.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Also scroll the main window to top
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }, 100);
    }
    
    showShareAudienceModal() {
        // Remove any existing share modal
        const existingModal = document.getElementById('share-audience-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modalHTML = `
            <div id="share-audience-modal" class="modal show" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 2500; display: flex !important; align-items: center; justify-content: center; background-color: rgba(0, 0, 0, 0.6); overflow: auto;">
                <div class="modal-content" style="max-width: 500px; width: 90%; max-height: 90vh; overflow-y: auto; margin: 20px; background: white; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
                    <div class="modal-header">
                        <h2>🚀 Share Your Results</h2>
                        <button class="close-btn" onclick="document.getElementById('share-audience-modal').remove();">&times;</button>
                    </div>
                    <div class="modal-body" style="padding: 20px;">
                        <p style="text-align: center; margin-bottom: 20px; color: #666;">Who would you like to share your PM Wordle results with?</p>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
                            <button onclick="game.shareWithAudience('colleague')" class="share-audience-btn" style="padding: 16px; border: 2px solid #e2e8f0; border-radius: 8px; background: white; cursor: pointer; text-align: center; transition: all 0.3s;">
                                <div style="font-size: 24px; margin-bottom: 8px;">👔</div>
                                <div style="font-weight: bold; color: #333;">Colleague</div>
                                <div style="font-size: 12px; color: #666;">Professional peers</div>
                            </button>
                            
                            <button onclick="game.shareWithAudience('pms')" class="share-audience-btn" style="padding: 16px; border: 2px solid #e2e8f0; border-radius: 8px; background: white; cursor: pointer; text-align: center; transition: all 0.3s;">
                                <div style="font-size: 24px; margin-bottom: 8px;">🏢</div>
                                <div style="font-weight: bold; color: #333;">Other PMs</div>
                                <div style="font-size: 12px; color: #666;">Property managers you know</div>
                            </button>
                            
                            <button onclick="game.shareWithAudience('tradies')" class="share-audience-btn" style="padding: 16px; border: 2px solid #e2e8f0; border-radius: 8px; background: white; cursor: pointer; text-align: center; transition: all 0.3s;">
                                <div style="font-size: 24px; margin-bottom: 8px;">🔧</div>
                                <div style="font-weight: bold; color: #333;">Tradies</div>
                                <div style="font-size: 12px; color: #666;">Contractors & workers</div>
                            </button>
                            
                            <button onclick="game.shareWithAudience('mum')" class="share-audience-btn" style="padding: 16px; border: 2px solid #e2e8f0; border-radius: 8px; background: white; cursor: pointer; text-align: center; transition: all 0.3s;">
                                <div style="font-size: 24px; margin-bottom: 8px;">❤️</div>
                                <div style="font-weight: bold; color: #333;">Your Mum</div>
                                <div style="font-size: 12px; color: #666;">Family & friends</div>
                            </button>
                        </div>
                        
                        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px;">
                            <h4 style="margin-bottom: 12px; color: #333;">Other:</h4>
                            <div style="display: flex; gap: 8px;">
                                <input type="text" id="custom-audience" placeholder="e.g., My team, LinkedIn contacts..." style="flex: 1; padding: 10px; border: 2px solid #e2e8f0; border-radius: 6px; font-size: 14px;" maxlength="50">
                                <button onclick="game.shareWithCustomAudience()" style="padding: 10px 16px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">Share</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Add hover effects
        const style = document.createElement('style');
        style.textContent = `
            .share-audience-btn:hover {
                border-color: #667eea !important;
                background: #f8faff !important;
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
            }
        `;
        document.head.appendChild(style);
    }

    async shareWithAudience(audienceType) {
        // Track the share in database
        await this.trackShare(audienceType);
        
        // Get tailored message and copy to clipboard (now async)
        const shareMessage = await this.getShareMessageForAudience(audienceType);
        
        try {
            await navigator.clipboard.writeText(shareMessage);
            this.showShareSuccessMessage(audienceType);
        } catch (err) {
            // Fallback for older browsers
            this.showShareFallback(shareMessage);
        }

        // Close the modal
        document.getElementById('share-audience-modal').remove();
    }

    async shareWithCustomAudience() {
        const customInput = document.getElementById('custom-audience');
        const customAudience = customInput.value.trim();
        
        if (!customAudience) {
            customInput.style.borderColor = '#ff6b6b';
            customInput.placeholder = 'Please enter who you\'re sharing with...';
            return;
        }

        // Track custom share
        await this.trackShare('custom', customAudience);
        
        // Use generic professional message for custom audience
        const shareMessage = await this.getShareMessageForAudience('colleague');
        
        try {
            await navigator.clipboard.writeText(shareMessage);
            this.showShareSuccessMessage('custom', customAudience);
        } catch (err) {
            this.showShareFallback(shareMessage);
        }

        // Close the modal
        document.getElementById('share-audience-modal').remove();
    }

    async getShareMessageForAudience(audienceType) {
        const gameUrl = 'https://pm-puzzle.vercel.app/';
        const stats = await this.getCurrentUserStats();
        
        // Get current game info if available
        const currentGuesses = this.gameWon ? this.currentRow + 1 : null;
        const winRate = stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;

        const messages = {
            colleague: `🏢 Just crushed today's PM Wordle! 

My stats: ${stats.gamesPlayed} games played, ${winRate}% win rate, ${stats.currentStreak} current streak 💪

Think you can beat my property management word skills? Challenge accepted?

Try it: ${gameUrl}

#PMWordle #PropertyManagement #WordGame`,

            pms: `🏠 Just smashed today's PM Wordle puzzle! 🧩

Current streak: ${stats.currentStreak} | Win rate: ${winRate}% | Max streak: ${stats.maxStreak}

You know all the property lingo - this should be easy for you! 😏

${gameUrl}

Let's see who's the real PM word master! 🏆`,

            tradies: `🔧 Oi! Just finished today's PM Wordle - all those property management terms finally paying off! 

${currentGuesses ? `Got it in ${currentGuesses} guesses` : `Current streak: ${stats.currentStreak}`} 💪

Reckon you tradies know enough PM lingo to beat me? 😂

Give it a crack: ${gameUrl}

Fair warning - it's harder than fixing a leaky tap! 🚰`,

            mum: `❤️ Mum! You'll love this - it's like Wordle but with all those property management words I'm always talking about!

I've got a ${stats.currentStreak} game winning streak going! 🎉

It's actually quite fun and might help you understand what I do for work!

${gameUrl}

Love you! Give it a try when you have a cuppa ☕ xx`
        };

        return messages[audienceType] || messages.colleague;
    }

    showShareSuccessMessage(audienceType, customText = '') {
        const audienceNames = {
            colleague: 'colleagues',
            pms: 'fellow PMs',
            tradies: 'the tradies',
            mum: 'your mum',
            custom: customText || 'your contacts'
        };

        const audienceName = audienceNames[audienceType] || 'your contacts';
        const message = `📋 Message copied! Ready to share with ${audienceName} 🚀`;
        
        this.showMessage(message, 'success', 3000);
    }

    showShareFallback(shareMessage) {
        // Show message in a modal for manual copying
        const fallbackHTML = `
            <div id="share-fallback-modal" class="modal show" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 2600; display: flex !important; align-items: center; justify-content: center; background-color: rgba(0, 0, 0, 0.7);">
                <div class="modal-content" style="max-width: 500px; width: 90%; background: white; border-radius: 12px; padding: 20px;">
                    <h3>Copy Your Share Message</h3>
                    <textarea readonly style="width: 100%; height: 200px; margin: 10px 0; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-family: inherit; font-size: 14px;">${shareMessage}</textarea>
                    <div style="text-align: right;">
                        <button onclick="document.getElementById('share-fallback-modal').remove();" style="padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', fallbackHTML);
    }

    async getCurrentUserStats() {
        // Return current user stats in the expected format
        try {
            const stats = await this.getStats();
            return {
                gamesPlayed: stats.gamesPlayed || 0,
                gamesWon: stats.gamesWon || 0,
                currentStreak: stats.currentStreak || 0,
                maxStreak: stats.maxStreak || 0,
                winPercentage: stats.winPercentage || 0,
                guessDistribution: stats.guessDistribution || [0,0,0,0,0,0]
            };
        } catch (error) {
            console.error('Error getting current user stats:', error);
            return {
                gamesPlayed: 0,
                gamesWon: 0,
                currentStreak: 0,
                maxStreak: 0,
                winPercentage: 0,
                guessDistribution: [0,0,0,0,0,0]
            };
        }
    }

    async trackShare(audienceType, customText = '') {
        // Only track for authenticated users to avoid spam
        if (this.isGuest) return;
        
        try {
            const { data: { user } } = await this.db.supabase.auth.getUser();
            if (!user) return;

            const shareData = {
                user_id: user.id,
                audience_type: audienceType,
                custom_audience: customText,
                shared_at: new Date().toISOString(),
                game_date: this.getPuzzleDate()
            };

            const { error } = await this.db.supabase
                .from('share_analytics')
                .insert(shareData);

            if (error) {
                console.error('Error tracking share:', error);
            } else {
                console.log('Share tracked successfully:', shareData);
            }
        } catch (error) {
            console.error('Failed to track share:', error);
        }
    }

    promptSignupFromGuest() {
        // Remove the guest prompt and show the signup form
        const guestPrompt = document.getElementById('guest-signup-prompt');
        if (guestPrompt) {
            guestPrompt.remove();
        }
        
        // Switch to signup mode and show auth form
        this.isGuest = true; // Keep as guest until they actually sign up
        document.getElementById('auth-title').textContent = 'Sign Up';
        document.getElementById('auth-submit').textContent = 'Sign Up';
        document.getElementById('auth-toggle').textContent = 'Sign In';
        document.getElementById('auth-switch-text').textContent = 'Already have an account?';
        document.getElementById('marketing-consent').classList.remove('hidden');
        document.getElementById('terms-agreement').classList.remove('hidden');
        document.getElementById('firstname').style.display = 'block';
        document.getElementById('firstname').required = true;
        
        // Show auth UI
        this.updateAuthUI();
    }

    setupModalListeners() {
        const modals = ['help', 'stats', 'settings', 'test'];
        
        modals.forEach(modalType => {
            const btn = document.getElementById(`${modalType}-btn`);
            const modal = document.getElementById(`${modalType}-modal`);
            const closeBtn = modal.querySelector('.close-btn');
            
            if (btn) {
                if (modalType === 'stats') {
                    // Special handling for stats button - show briefly then prompt signup for guests
                    btn.addEventListener('click', () => this.showStatsModal());
                } else {
                    btn.addEventListener('click', () => this.showModal(modalType));
                }
            }
            if (closeBtn) closeBtn.addEventListener('click', () => this.hideModal(modalType));
            if (modal) modal.addEventListener('click', (e) => {
                if (e.target === modal) this.hideModal(modalType);
            });
        });
        
        // Setup share instructions modal separately (no button, just close)
        const shareModal = document.getElementById('share-instructions-modal');
        if (shareModal) {
            const closeBtn = shareModal.querySelector('.close-btn');
            if (closeBtn) closeBtn.addEventListener('click', () => this.hideModal('share-instructions'));
            
            const gotItBtn = document.getElementById('share-got-it');
            if (gotItBtn) gotItBtn.addEventListener('click', () => this.hideModal('share-instructions'));
            
            shareModal.addEventListener('click', (e) => {
                if (e.target === shareModal) this.hideModal('share-instructions');
            });
        }
        
        // Setup menu modal separately
        const menuModal = document.getElementById('menu-modal');
        if (menuModal) {
            const closeBtn = menuModal.querySelector('.close-btn');
            if (closeBtn) closeBtn.addEventListener('click', () => this.hideModal('menu'));
            menuModal.addEventListener('click', (e) => {
                if (e.target === menuModal) this.hideModal('menu');
            });
        }

        // Hamburger menu button
        const menuBtn = document.getElementById('menu-btn');
        if (menuBtn) {
            menuBtn.addEventListener('click', () => this.showModal('menu'));
        }
        
        const testBtn = document.getElementById('test-btn');
        if (testBtn) {
            testBtn.addEventListener('click', () => this.showModal('test'));
        }
        
        // Menu modal options
        const menuLogout = document.getElementById('menu-logout');
        if (menuLogout) {
            menuLogout.addEventListener('click', async () => {
                await this.db.signOut();
                this.updateAuthUI();
                this.hideModal('menu');
                window.location.reload();
            });
        }
        
        const menuShare = document.getElementById('menu-share');
        if (menuShare) {
            menuShare.addEventListener('click', () => {
                this.hideModal('menu');
                // Copy game URL to clipboard
                const gameUrl = 'https://pm-puzzle.vercel.app';
                navigator.clipboard.writeText(gameUrl).then(() => {
                    alert('Game link copied to clipboard! Share it on social media.');
                }).catch(() => {
                    alert(`Share this link: ${gameUrl}`);
                });
            });
        }

        // Share button
        document.getElementById('share-btn').addEventListener('click', () => {
            this.showShareAudienceModal();
        });
        
        // Post-game modal buttons
        const postGameShare = document.getElementById('post-game-share');
        if (postGameShare) {
            postGameShare.addEventListener('click', () => {
                this.hideModal('post-game-stats');
                this.shareResults();
            });
        }
        
        const postGameStats = document.getElementById('post-game-stats');
        if (postGameStats) {
            postGameStats.addEventListener('click', () => {
                this.hideModal('post-game-stats');
                this.showModal('stats');
            });
        }
        
        const postGameContinue = document.getElementById('post-game-continue');
        if (postGameContinue) {
            postGameContinue.addEventListener('click', () => {
                this.hideModal('post-game-stats');
            });
        }
        
        // Add close button for post-game modal
        const postGameModal = document.getElementById('post-game-stats-modal');
        if (postGameModal) {
            const closeBtn = postGameModal.querySelector('.close-btn');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    this.hideModal('post-game-stats');
                });
            }
            // Allow clicking outside to close
            postGameModal.addEventListener('click', (e) => {
                if (e.target === postGameModal) {
                    this.hideModal('post-game-stats');
                }
            });
        }
        
        // Testing buttons
        this.setupTestingListeners();
    }

    setupTestingListeners() {
        // Game testing buttons
        document.getElementById('test-win').addEventListener('click', () => this.testWin());
        document.getElementById('test-lose').addEventListener('click', () => this.testLose());
        document.getElementById('test-reset').addEventListener('click', () => this.testReset());
        document.getElementById('test-reveal').addEventListener('click', () => this.testReveal());
        
        // Stats testing buttons
        document.getElementById('test-add-win').addEventListener('click', () => this.testAddWin());
        document.getElementById('test-add-loss').addEventListener('click', () => this.testAddLoss());
        document.getElementById('test-clear-stats').addEventListener('click', () => this.testClearStats());
        document.getElementById('test-perfect-stats').addEventListener('click', () => this.testPerfectStats());
        
        // Leaderboard testing buttons
        document.getElementById('test-add-leaderboard').addEventListener('click', () => this.testAddLeaderboard());
        document.getElementById('test-clear-leaderboard').addEventListener('click', () => this.testClearLeaderboard());
        document.getElementById('test-populate-leaderboard').addEventListener('click', () => this.testPopulateLeaderboard());
    }

    setupAuthListeners() {
        console.log('Setting up auth listeners');
        const authForm = document.getElementById('login-form');
        const authToggle = document.getElementById('auth-toggle');
        const skipAuth = document.getElementById('skip-auth');
        const userBtn = document.getElementById('user-btn');
        const userMenu = document.getElementById('user-menu');
        const userLogoutBtn = document.getElementById('user-logout-btn');

        console.log('Found auth elements:', {authForm, authToggle, skipAuth, userBtn});

        if (authForm) {
            authForm.addEventListener('submit', (e) => {
                e.preventDefault();
                console.log('Auth form submitted');
                console.log('Form validity:', authForm.checkValidity());
                console.log('Form elements validity:', {
                    email: document.getElementById('email').checkValidity(),
                    password: document.getElementById('password').checkValidity(),
                    firstname: document.getElementById('firstname').checkValidity()
                });
                this.handleAuth();
            });
        }
        
        // Also add direct button click listener as fallback
        const submitBtn = document.getElementById('auth-submit');
        if (submitBtn) {
            submitBtn.addEventListener('click', (e) => {
                console.log('Submit button clicked');
                // Don't prevent default here - let form submission handle it
            });
        }

        if (authToggle) {
            authToggle.addEventListener('click', () => {
                console.log('Auth toggle clicked');
                this.toggleAuthMode();
            });
        }

        if (skipAuth) {
            skipAuth.addEventListener('click', () => {
                console.log('Skip auth button clicked');
                this.skipAuth();
            });
        }

        // User dropdown handlers
        if (userBtn) {
            userBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                userMenu.classList.toggle('show');
            });
        }
        
        if (userLogoutBtn) {
            userLogoutBtn.addEventListener('click', () => {
                userMenu.classList.remove('show');
                this.logout();
            });
        }
        
        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            if (userMenu) {
                userMenu.classList.remove('show');
            }
        });

        // Forgot password button
        const forgotPasswordBtn = document.getElementById('forgot-password-btn');
        if (forgotPasswordBtn) {
            forgotPasswordBtn.addEventListener('click', () => {
                this.showForgotPasswordModal();
            });
        }
        
        // Forgot password modal handlers
        const forgotModal = document.getElementById('forgot-password-modal');
        const forgotCloseBtn = document.getElementById('forgot-close-btn');
        const forgotForm = document.getElementById('forgot-password-form');
        
        if (forgotCloseBtn) {
            forgotCloseBtn.addEventListener('click', () => {
                this.hideForgotPasswordModal();
            });
        }
        
        if (forgotModal) {
            forgotModal.addEventListener('click', (e) => {
                if (e.target === forgotModal) {
                    this.hideForgotPasswordModal();
                }
            });
        }
        
        if (forgotForm) {
            forgotForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const email = document.getElementById('forgot-email').value.trim();
                if (email) {
                    this.sendPasswordReset(email);
                }
            });
        }

        // Session check is handled by checkUserSession() in constructor
        
        // Initialize auth mode properly
        this.initializeAuthMode();
    }
    
    initializeAuthMode() {
        // Ensure we start in Sign In mode with proper field setup
        const firstnameField = document.getElementById('firstname');
        if (firstnameField) {
            firstnameField.required = false; // Start in sign-in mode
            firstnameField.style.display = 'none';
        }
    }

    setupSettingsListeners() {
        const hardModeToggle = document.getElementById('hard-mode-toggle');
        const darkThemeToggle = document.getElementById('dark-theme-toggle');

        hardModeToggle.addEventListener('change', (e) => {
            this.hardMode = e.target.checked;
            this.saveSettings();
        });

        darkThemeToggle.addEventListener('change', (e) => {
            document.body.classList.toggle('dark-mode', e.target.checked);
            this.saveSettings();
        });
    }

    setupLeaderboardTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.getAttribute('data-tab');
                this.switchLeaderboardTab(tab);
            });
        });
    }

    async handleKeyPress(key) {
        console.log('Key pressed:', key, 'Game over:', this.gameOver, 'Current row/col:', this.currentRow, this.currentCol);
        
        // Prevent processing if game is over or processing a guess
        if (this.gameOver || this.processingGuess) {
            console.log('Game is over or processing guess, ignoring key press');
            return;
        }
        
        if (key === 'Enter') {
            await this.submitGuess();
        } else if (key === 'Backspace') {
            this.deleteLetter();
        } else if (/^[A-Za-z]$/.test(key)) {
            this.addLetter(key.toUpperCase());
        }
    }

    addLetter(letter) {
        console.log('Adding letter:', letter, 'Row:', this.currentRow, 'Col:', this.currentCol, 'GameOver:', this.gameOver);
        
        // Don't add letters if game is over or row is full
        if (this.gameOver || this.currentCol >= 5 || this.currentRow >= 6) {
            console.log('Blocked letter addition - game over or bounds exceeded');
            return;
        }
        
        const tile = this.getTile(this.currentRow, this.currentCol);
        console.log('Found tile:', tile, 'Current content:', tile.textContent);
        
        // Only add letter if tile is empty
        if (!tile.textContent.trim()) {
            tile.textContent = letter;
            tile.classList.add('filled');
            this.currentCol++;
            console.log('Letter added, new col:', this.currentCol);
        } else {
            console.log('Tile already has content:', tile.textContent);
        }
    }

    deleteLetter() {
        if (this.currentCol > 0) {
            this.currentCol--;
            const tile = this.getTile(this.currentRow, this.currentCol);
            tile.textContent = '';
            tile.classList.remove('filled');
        }
    }

    async submitGuess() {
        if (this.currentCol !== 5) {
            this.showMessage('Not enough letters', 'error');
            this.shakeRow();
            return;
        }

        const guess = this.getCurrentGuess();
        
        // Hard mode validation
        if (this.hardMode && !this.validateHardMode(guess)) {
            return;
        }

        // Check if word is valid (in our valid words list)
        console.log('Validating guess:', guess, 'Valid words count:', this.validWords.length, 'Includes guess:', this.validWords.includes(guess));
        if (!this.validWords.includes(guess)) {
            this.showMessage('Not in word list', 'error');
            this.shakeRow();
            return;
        }

        // Set processing flag to prevent input during animation
        this.processingGuess = true;
        
        this.guesses.push(guess);
        this.checkGuess(guess);
        this.updateKeyboard(guess);
        
        if (guess === this.currentWord) {
            this.endTime = new Date();
            this.gameWon = true;
            this.gameOver = true;
            this.processingGuess = false;  // Clear flag when game ends
            await this.celebrateWin();
            
            // Show popup immediately for better UX
            setTimeout(() => this.showGameCompletionModal(), 1000);
            
            // Do database updates in background (don't await)
            this.saveStats();
            this.updateStats();
            this.updateLeaderboards(); // Update leaderboards with completion time
            this.saveGameState();
        } else if (this.currentRow === 5) {
            this.gameOver = true;
            this.processingGuess = false;  // Clear flag when game ends
            this.showMessage(`The word was ${this.currentWord}`, 'error', 3000);
            await this.saveStats();
            await this.updateStats();
            await this.saveGameState();
            setTimeout(() => this.showGameCompletionModal(), 1000);
        } else {
            // Wait for animation to complete before allowing new input
            setTimeout(() => {
                this.currentRow++;
                this.currentCol = 0;
                console.log('Moving to next row:', this.currentRow, 'Column reset to:', this.currentCol);
                this.processingGuess = false;  // Clear flag after moving to next row
            }, 500);  // Wait for tile animations to complete
            await this.saveGameState();
        }
    }

    getCurrentGuess() {
        let guess = '';
        for (let i = 0; i < 5; i++) {
            const tile = this.getTile(this.currentRow, i);
            guess += tile.textContent;
        }
        return guess;
    }

    validateHardMode(guess) {
        // Check if revealed hints are used in subsequent guesses
        for (let i = 0; i < this.guesses.length; i++) {
            const prevGuess = this.guesses[i];
            for (let j = 0; j < 5; j++) {
                const tile = this.getTile(i, j);
                if (tile.classList.contains('correct')) {
                    if (guess[j] !== prevGuess[j]) {
                        this.showMessage(`${j + 1} position must be ${prevGuess[j]}`, 'error');
                        this.shakeRow();
                        return false;
                    }
                } else if (tile.classList.contains('present')) {
                    if (!guess.includes(prevGuess[j])) {
                        this.showMessage(`Guess must contain ${prevGuess[j]}`, 'error');
                        this.shakeRow();
                        return false;
                    }
                }
            }
        }
        return true;
    }

    checkGuess(guess) {
        const tiles = [];
        for (let i = 0; i < 5; i++) {
            tiles.push(this.getTile(this.currentRow, i));
        }

        // First pass - mark correct letters
        const letterCounts = {};
        for (let char of this.currentWord) {
            letterCounts[char] = (letterCounts[char] || 0) + 1;
        }

        const result = new Array(5).fill('absent');
        
        // Check for correct positions first
        for (let i = 0; i < 5; i++) {
            if (guess[i] === this.currentWord[i]) {
                result[i] = 'correct';
                letterCounts[guess[i]]--;
            }
        }

        // Check for present letters
        for (let i = 0; i < 5; i++) {
            if (result[i] === 'absent' && letterCounts[guess[i]] > 0) {
                result[i] = 'present';
                letterCounts[guess[i]]--;
            }
        }

        // Animate tiles
        tiles.forEach((tile, i) => {
            setTimeout(() => {
                tile.classList.add('flip');
                setTimeout(() => {
                    tile.classList.add(result[i]);
                    tile.classList.remove('flip');
                }, 250);
            }, i * 100);
        });
    }

    updateKeyboard(guess) {
        for (let i = 0; i < 5; i++) {
            const letter = guess[i];
            const key = document.querySelector(`[data-key="${letter}"]`);
            if (!key) continue;

            const tile = this.getTile(this.currentRow, i);
            
            if (tile.classList.contains('correct')) {
                key.classList.remove('present', 'absent');
                key.classList.add('correct');
            } else if (tile.classList.contains('present') && !key.classList.contains('correct')) {
                key.classList.remove('absent');
                key.classList.add('present');
            } else if (!key.classList.contains('correct') && !key.classList.contains('present')) {
                key.classList.add('absent');
            }
        }
    }

    async celebrateWin() {
        for (let i = 0; i < 5; i++) {
            const tile = this.getTile(this.currentRow, i);
            setTimeout(() => {
                tile.classList.add('win');
            }, i * 100);
        }
        
        this.showMessage('Congratulations!', 'success', 2000);
        
        // Update leaderboards if user is logged in
        if (!this.isGuest) {
            await this.updateLeaderboards();
        }
    }

    getTile(row, col) {
        return document.querySelector(`.row:nth-child(${row + 1}) .tile:nth-child(${col + 1})`);
    }

    shakeRow() {
        for (let i = 0; i < 5; i++) {
            const tile = this.getTile(this.currentRow, i);
            tile.classList.add('invalid');
            setTimeout(() => {
                tile.classList.remove('invalid');
            }, 600);
        }
    }

    showMessage(text, type = 'info', duration = 1500) {
        const container = document.getElementById('message-container');
        const message = document.createElement('div');
        message.className = `message ${type}`;
        message.textContent = text;
        
        container.appendChild(message);
        
        setTimeout(() => {
            message.remove();
        }, duration);
    }

    async showModal(type) {
        const modal = document.getElementById(`${type}-modal`);
        modal.classList.add('show');
        
        if (type === 'stats') {
            // Force fresh stats load
            delete this._cachedStats;
            await this.updateStats();
            await this.updateLeaderboards();
        } else if (type === 'test') {
            this.updateTestingPanel();
        }
    }

    updateTestingPanel() {
        document.getElementById('debug-word').textContent = this.currentWord;
        document.getElementById('debug-words-count').textContent = this.validWords.length;
        document.getElementById('debug-game-state').textContent = this.gameOver ? (this.gameWon ? 'Won' : 'Lost') : 'Active';
        document.getElementById('debug-current-user').textContent = this.isGuest ? 'Guest' : this.currentUser;
    }

    hideModal(type) {
        const modal = document.getElementById(`${type}-modal`);
        modal.classList.remove('show');
    }

    // Authentication System
    async handleAuth() {
        console.log('Handling auth');
        const firstname = document.getElementById('firstname').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const isLogin = document.getElementById('auth-title').textContent === 'Sign In';
        const marketingConsent = document.getElementById('marketing-checkbox').checked;

        console.log('Auth data:', {firstname, email, password: password ? '***' : '', isLogin, marketingConsent});

        if (isLogin) {
            // For login, use email as username
            if (!email || !password) {
                this.showMessage('Please fill in all fields', 'error');
                return;
            }
            await this.login(email, password);
        } else {
            // For registration, need all fields
            if (!firstname || !email || !password) {
                this.showMessage('Please fill in all fields', 'error');
                return;
            }
            
            // Check marketing consent is required
            if (!marketingConsent) {
                this.showMessage('Marketing consent is required to sign up', 'error');
                return;
            }
            
            await this.register(firstname, email, password);
        }
    }

    async login(email, password) {
        console.log('Attempting login for:', email);
        
        const { user, error } = await this.db.signIn(email, password);
        
        if (error) {
            console.log('Login failed:', error);
            this.showMessage(error, 'error');
            return;
        }

        if (user) {
            console.log('Login successful');
            this.currentUser = user.id;
            this.isGuest = false;
            
            // Get user profile for display name
            const { data: profile } = await this.db.getUserProfile(user.id);
            const displayName = profile?.first_name || 'User';
            
            // User is now logged in for this session only
            console.log('User authenticated after login:', this.currentUser, 'isGuest:', this.isGuest);
            
            // Transfer any guest stats to this user account
            await this.transferGuestStatsToUser(user.id);
            
            // Also transfer any current game completion to leaderboard if they just finished
            if (this.gameWon && this.startTime && this.endTime) {
                console.log('Transferring completed game to user account after login');
                const completionTime = Math.floor((this.endTime - this.startTime) / 1000);
                const today = this.getPuzzleDate();
                
                try {
                    await this.db.updateDailyLeaderboard(
                        user.id,
                        today,
                        completionTime,
                        this.currentRow + 1,
                        this.currentWord
                    );
                    console.log('Game completion transferred to user leaderboard after login');
                    
                    // Note: Stats were already saved during transferGuestStatsToUser(), so no need to save again
                } catch (error) {
                    console.error('Failed to transfer game to leaderboard after login:', error);
                }
            }
            
            // Update UI to show logged in state
            await this.updateAuthUI();
            
            // Reset game state for new user
            await this.resetGameForNewUser();
            
            // Refresh stats and leaderboards
            console.log('Refreshing stats and leaderboards after login');
            
            // Force a fresh stats fetch to ensure we have the latest data
            delete this._cachedStats; // Clear any cached stats
            await this.updateStats();
            
            // Check if stats are showing as zeros and try to recover from backup
            const stats = await this.getStats();
            if (stats.gamesPlayed === 0 && stats.gamesWon === 0) {
                // Check for backup stats
                const backup = localStorage.getItem(`pm-wordle-user-backup-${user.id}`);
                if (backup) {
                    console.log('Detected zero stats, attempting recovery from backup');
                    try {
                        const backupStats = JSON.parse(backup);
                        if (backupStats.gamesPlayed > 0) {
                            // Restore from backup
                            await this.db.updateUserStats(user.id, {
                                games_played: backupStats.gamesPlayed,
                                games_won: backupStats.gamesWon,
                                current_streak: backupStats.currentStreak,
                                max_streak: backupStats.maxStreak,
                                guess_distribution: backupStats.guessDistribution
                            });
                            console.log('Restored stats from backup:', backupStats);
                            await this.updateStats(); // Refresh UI
                        }
                    } catch (e) {
                        console.error('Failed to restore from backup:', e);
                    }
                }
            }
            
            await this.renderDailyLeaderboard();
            await this.updateStreakLeaderboard();
            console.log('Post-login refresh completed');
            
            // Show success and hide auth modal after everything is complete
            this.showMessage(`Welcome back, ${displayName}!`, 'success', 3000);
            this.hideModal('auth');
        }
    }

    async register(firstname, email, password) {
        const marketingConsent = document.getElementById('marketing-checkbox').checked;
        
        console.log('Attempting registration for:', email);
        
        const { user, error } = await this.db.signUp(email, password, firstname, marketingConsent);
        
        if (error) {
            console.log('Registration failed:', error);
            this.showMessage(error, 'error');
            return;
        }

        if (user) {
            console.log('Registration successful');
            this.currentUser = user.id;
            this.isGuest = false;
            
            // User is now logged in for this session only
            console.log('User authenticated after signup:', this.currentUser, 'isGuest:', this.isGuest);
            
            // Transfer guest stats to new user account
            await this.transferGuestStatsToUser(user.id);
            
            // Also transfer any current game completion to leaderboard if they just finished
            if (this.gameWon && this.startTime && this.endTime) {
                console.log('Transferring completed game to user account');
                const completionTime = Math.floor((this.endTime - this.startTime) / 1000);
                const today = this.getPuzzleDate();
                
                try {
                    await this.db.updateDailyLeaderboard(
                        user.id,
                        today,
                        completionTime,
                        this.currentRow + 1,
                        this.currentWord
                    );
                    console.log('Game completion transferred to user leaderboard');
                    
                    // Note: Stats were already saved during transferGuestStatsToUser(), so no need to save again
                } catch (error) {
                    console.error('Failed to transfer game to leaderboard:', error);
                }
            }
            
            // Update UI to show logged in state
            await this.updateAuthUI();
            
            // Reset game state for new user
            await this.resetGameForNewUser();
            
            // Refresh stats and leaderboards
            console.log('Refreshing stats and leaderboards after registration');
            await this.updateStats();
            await this.renderDailyLeaderboard();
            await this.updateStreakLeaderboard();
            console.log('Post-registration refresh completed');
            
            // Show success and hide auth modal after everything is complete
            this.showMessage(`✅ Account created successfully! Welcome, ${firstname}!`, 'success', 4000);
            this.hideModal('auth');
        }
    }
    
    async transferGuestStatsToUser(userId) {
        console.log('Checking for guest stats to transfer to user account:', userId);
        
        // Get any existing guest stats
        const guestStatsJson = localStorage.getItem('pm-wordle-guest-stats');
        
        // Only transfer if there are actual guest stats
        if (!guestStatsJson) {
            console.log('No guest stats to transfer');
            return;
        }
        
        let guestStats;
        try {
            guestStats = JSON.parse(guestStatsJson);
            console.log('Found guest stats to transfer:', guestStats);
        } catch (error) {
            console.error('Error parsing guest stats:', error);
            return;
        }
        
        // Only transfer if guest has actually played games
        if (!guestStats.gamesPlayed || guestStats.gamesPlayed === 0) {
            console.log('Guest has no games played, skipping transfer');
            localStorage.removeItem('pm-wordle-guest-stats');
            return;
        }
        
        try {
            // First, get the user's existing stats from database
            const { data: existingStats } = await this.db.getUserStats(userId);
            
            // Merge guest stats with existing user stats
            const mergedStats = {
                games_played: (existingStats?.games_played || 0) + guestStats.gamesPlayed,
                games_won: (existingStats?.games_won || 0) + guestStats.gamesWon,
                current_streak: guestStats.currentStreak, // Use guest's current streak
                max_streak: Math.max(existingStats?.max_streak || 0, guestStats.maxStreak),
                guess_distribution: existingStats?.guess_distribution ? 
                    existingStats.guess_distribution.map((val, i) => (val || 0) + (guestStats.guessDistribution[i] || 0)) :
                    guestStats.guessDistribution
            };
            
            // Save merged stats to database
            await this.db.updateUserStats(userId, mergedStats);
            console.log('Successfully transferred and merged guest stats:', mergedStats);
            
            // Clear guest stats since they've been transferred
            localStorage.removeItem('pm-wordle-guest-stats');
            console.log('Cleared guest stats from localStorage');
            
            // Show success message
            if (guestStats.gamesPlayed > 0) {
                this.showMessage(`Your ${guestStats.gamesPlayed} previous game${guestStats.gamesPlayed > 1 ? 's' : ''} transferred to your account!`, 'success');
            }
            
        } catch (error) {
            console.error('Failed to transfer guest stats:', error);
            // If database fails, keep guest stats for now
        }
    }
    
    resetGameForNewUser() {
        console.log('Resetting game state for new user');
        
        // Reset keyboard state
        document.querySelectorAll('.key').forEach(key => {
            key.className = 'key';
            if (key.getAttribute('data-key') === 'Enter') {
                key.className = 'key key-large';
            } else if (key.getAttribute('data-key') === 'Backspace') {
                key.className = 'key key-large';
            }
        });
        
        // Load user's existing game state or start fresh
        this.loadGameState();
        
        // If no saved game state for this user, reset to fresh game
        const stateKey = this.isGuest ? 'pm-wordle-game-state-guest' : `pm-wordle-game-state-${this.currentUser}`;
        const savedState = localStorage.getItem(stateKey);
        if (!savedState || this.shouldStartFreshGame()) {
            this.resetToFreshGame();
        }
        
        // Ensure game is playable
        document.querySelector('.game-board').style.pointerEvents = 'auto';
        document.querySelector('.keyboard').style.pointerEvents = 'auto';
    }
    
    shouldStartFreshGame() {
        // Check if the saved game state is from today and for the current word
        const stateKey = this.isGuest ? 'pm-wordle-game-state-guest' : `pm-wordle-game-state-${this.currentUser}`;
        const savedState = JSON.parse(localStorage.getItem(stateKey) || '{}');
        const today = this.getPuzzleDate();
        return savedState.date !== today || savedState.currentWord !== this.currentWord;
    }
    
    resetToFreshGame() {
        console.log('Starting fresh game for user');
        
        // Reset game state
        this.currentRow = 0;
        this.currentCol = 0;
        this.gameOver = false;
        this.gameWon = false;
        this.guesses = [];
        this.startTime = new Date();
        this.endTime = null;
        this.processingGuess = false;
        
        // Clear the board
        this.renderBoard();
        
        // Remove any saved game state to start fresh
        localStorage.removeItem('pm-wordle-game-state');
    }

    toggleAuthMode() {
        const title = document.getElementById('auth-title');
        const submit = document.getElementById('auth-submit');
        const toggle = document.getElementById('auth-toggle');
        const switchText = document.getElementById('auth-switch-text');
        const marketingConsent = document.getElementById('marketing-consent');
        const termsAgreement = document.getElementById('terms-agreement');
        const forgotPasswordSection = document.getElementById('forgot-password-section');
        const firstnameField = document.getElementById('firstname');

        if (title.textContent === 'Sign In') {
            // Switch to Sign Up mode
            title.textContent = 'Sign Up';
            submit.textContent = 'Sign Up';
            toggle.textContent = 'Sign In';
            switchText.textContent = 'Already have an account?';
            marketingConsent.classList.remove('hidden');
            termsAgreement.classList.remove('hidden');
            forgotPasswordSection.style.display = 'none';
            firstnameField.style.display = 'block';
            firstnameField.required = true;
        } else {
            // Switch to Sign In mode
            title.textContent = 'Sign In';
            submit.textContent = 'Sign In';
            toggle.textContent = 'Sign Up';
            switchText.textContent = "Don't have an account?";
            marketingConsent.classList.add('hidden');
            termsAgreement.classList.add('hidden');
            forgotPasswordSection.style.display = 'block';
            firstnameField.style.display = 'none';
            firstnameField.required = false;
        }
    }

    showForgotPasswordModal() {
        const modal = document.getElementById('forgot-password-modal');
        modal.classList.add('show');
        document.getElementById('forgot-email').value = '';
        document.getElementById('forgot-message').textContent = '';
    }
    
    hideForgotPasswordModal() {
        const modal = document.getElementById('forgot-password-modal');
        modal.classList.remove('show');
    }

    async sendPasswordReset(email) {
        const messageDiv = document.getElementById('forgot-message');
        const submitBtn = document.getElementById('forgot-submit');
        
        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending...';
            messageDiv.textContent = '';
            
            // Use the production URL for reset redirect to avoid localhost issues
            const redirectUrl = 'https://pm-puzzle.vercel.app/auth-redirect.html';
            
            console.log('Sending password reset to:', email, 'with redirect:', redirectUrl);
            
            const { error } = await this.db.supabase.auth.resetPasswordForEmail(email, {
                redirectTo: redirectUrl
            });
            
            if (error) throw error;
            
            messageDiv.style.color = 'var(--color-correct)';
            messageDiv.textContent = 'Password reset email sent! Check your inbox.';
            
            setTimeout(() => {
                this.hideForgotPasswordModal();
            }, 3000);
            
        } catch (error) {
            console.error('Password reset error:', error);
            messageDiv.style.color = 'var(--color-error)';
            messageDiv.textContent = 'Error: ' + error.message;
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send Reset Link';
        }
    }

    skipAuth() {
        console.log('Skip auth clicked');
        this.isGuest = true;
        this.updateAuthUI();
        // Ensure game is ready to play
        document.querySelector('.game-board').style.pointerEvents = 'auto';
        document.querySelector('.keyboard').style.pointerEvents = 'auto';
        this.showMessage('Playing as guest', 'success');
    }

    async logout() {
        const { error } = await this.db.signOut();
        
        if (error) {
            this.showMessage('Error logging out: ' + error, 'error');
            return;
        }

        // Use clearUserSession to properly clear everything
        this.clearUserSession();
        this.updateAuthUI();
        this.showMessage('Logged out successfully', 'success');
    }

    async updateAuthUI() {
        console.log('Updating auth UI, isGuest:', this.isGuest);
        const authSection = document.getElementById('auth-section');
        const authForm = document.getElementById('auth-form');
        const userDropdown = document.getElementById('user-dropdown');
        const userInitial = document.getElementById('user-initial');
        const userMenuName = document.getElementById('user-menu-name');
        const userMenuEmail = document.getElementById('user-menu-email');
        const leaderboardsSection = document.getElementById('leaderboards-section');

        if (this.isGuest) {
            authSection.classList.remove('logged-in');
            authForm.classList.remove('hidden');
            userDropdown.classList.add('hidden');
            // Show leaderboards for everyone to see competition results
            if (leaderboardsSection) leaderboardsSection.style.display = 'block';
            
            // Ensure auth form elements are interactive
            authForm.style.pointerEvents = 'auto';
            const authInputs = authForm.querySelectorAll('input, button');
            authInputs.forEach(input => input.style.pointerEvents = 'auto');
        } else {
            authSection.classList.add('logged-in');
            authForm.classList.add('hidden');
            userDropdown.classList.remove('hidden');
            
            // Get user profile for display name
            const user = await this.db.getCurrentUser();
            if (user) {
                const { data: profile } = await this.db.getUserProfile(user.id);
                const displayName = profile?.first_name || user.email?.split('@')[0] || 'User';
                const email = user?.email || '';
                
                // Set user initial (first letter of name)
                userInitial.textContent = displayName.charAt(0).toUpperCase();
                
                // Set dropdown menu info
                userMenuName.textContent = displayName;
                userMenuEmail.textContent = email;
            }
            
            if (leaderboardsSection) leaderboardsSection.style.display = 'block';
        }
        
        // Don't automatically render leaderboards here to avoid conflicts
        // Leaderboards will be rendered separately with proper timing
        console.log('Auth UI updated successfully, isGuest:', this.isGuest);
    }

    loadUser() {
        const currentUser = localStorage.getItem('pm-wordle-current-user');
        if (currentUser) {
            this.currentUser = currentUser;
            this.isGuest = false;
        }
        this.updateAuthUI();
    }

    saveUser() {
        if (this.currentUser) {
            localStorage.setItem('pm-wordle-current-user', this.currentUser);
        }
    }

    // Statistics System
    async updateStats() {
        const stats = await this.getStats();
        
        console.log('Updating stats display with:', stats);
        
        // Update summary stats
        const gamesPlayedEl = document.getElementById('games-played');
        const winPercentageEl = document.getElementById('win-percentage');
        const currentStreakEl = document.getElementById('current-streak');
        const maxStreakEl = document.getElementById('max-streak');
        
        if (gamesPlayedEl) gamesPlayedEl.textContent = stats.gamesPlayed;
        if (winPercentageEl) winPercentageEl.textContent = stats.winPercentage;
        if (currentStreakEl) currentStreakEl.textContent = stats.currentStreak;
        if (maxStreakEl) maxStreakEl.textContent = stats.maxStreak;

        // Update guess distribution
        const maxCount = Math.max(...stats.guessDistribution, 1); // Ensure at least 1 to avoid division by zero
        console.log('Updating guess distribution bars, max count:', maxCount);
        
        for (let i = 1; i <= 6; i++) {
            const count = stats.guessDistribution[i - 1] || 0;
            const fill = document.getElementById(`dist-${i}`);
            const countSpan = document.getElementById(`count-${i}`);
            
            const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
            fill.style.width = `${Math.max(percentage, count > 0 ? 7 : 0)}%`;
            countSpan.textContent = count;
        }
    }

    async getStats() {
        if (this.isGuest) {
            const guestStats = JSON.parse(localStorage.getItem('pm-wordle-guest-stats') || '{"gamesPlayed":0,"gamesWon":0,"currentStreak":0,"maxStreak":0,"guessDistribution":[0,0,0,0,0,0]}');
            return {
                ...guestStats,
                winPercentage: guestStats.gamesPlayed > 0 ? Math.round((guestStats.gamesWon / guestStats.gamesPlayed) * 100) : 0
            };
        } else {
            // Get current user from Supabase
            const { data: { user } } = await this.db.supabase.auth.getUser();
            console.log('Getting stats for user:', user ? user.id : 'No user', 'isGuest:', this.isGuest);
            
            if (!user) {
                console.error('No authenticated user found for stats - falling back to guest stats');
                // Fall back to guest stats if no user is found
                this.isGuest = true;
                return this.getStats();
            }

            const { data, error } = await this.db.getUserStats(user.id);
            console.log('Database query result - Data:', data, 'Error:', error, 'Error code:', error?.code);
            
            if (error) {
                if (error.code === 'PGRST116') {
                    // No rows found - this is normal for new users
                    console.log('No stats found for user - returning default stats');
                    const defaultStats = {
                        gamesPlayed: 0,
                        gamesWon: 0,
                        currentStreak: 0,
                        maxStreak: 0,
                        guessDistribution: [0,0,0,0,0,0],
                        winPercentage: 0
                    };
                    return defaultStats;
                } else {
                    // Other database error - try backup
                    console.error('Database error getting user stats:', error);
                    const backup = localStorage.getItem(`pm-wordle-user-backup-${user.id}`);
                    if (backup) {
                        console.log('Using backup stats from localStorage');
                        const backupStats = JSON.parse(backup);
                        return {
                            gamesPlayed: backupStats.gamesPlayed || 0,
                            gamesWon: backupStats.gamesWon || 0,
                            currentStreak: backupStats.currentStreak || 0,
                            maxStreak: backupStats.maxStreak || 0,
                            guessDistribution: backupStats.guessDistribution || [0,0,0,0,0,0],
                            winPercentage: backupStats.gamesPlayed > 0 ? Math.round((backupStats.gamesWon / backupStats.gamesPlayed) * 100) : 0
                        };
                    }
                    return {gamesPlayed:0,gamesWon:0,currentStreak:0,maxStreak:0,guessDistribution:[0,0,0,0,0,0],winPercentage:0};
                }
            }

            const userStats = data || {games_played:0,games_won:0,current_streak:0,max_streak:0,guess_distribution:[0,0,0,0,0,0]};
            console.log('Raw user stats from DB:', userStats);
            
            const formattedStats = {
                gamesPlayed: userStats.games_played || 0,
                gamesWon: userStats.games_won || 0,
                currentStreak: userStats.current_streak || 0,
                maxStreak: userStats.max_streak || 0,
                guessDistribution: userStats.guess_distribution || [0,0,0,0,0,0],
                winPercentage: userStats.games_played > 0 ? Math.round((userStats.games_won / userStats.games_played) * 100) : 0
            };
            console.log('Final formatted stats:', formattedStats);
            return formattedStats;
        }
    }

    async saveStats() {
        console.log('saveStats called - gameWon:', this.gameWon, 'currentRow:', this.currentRow, 'isGuest:', this.isGuest, 'currentUser:', this.currentUser);
        const currentStats = await this.getStats();
        console.log('Current stats before save:', currentStats);
        
        const newStats = {
            gamesPlayed: currentStats.gamesPlayed + 1,
            gamesWon: currentStats.gamesWon + (this.gameWon ? 1 : 0),
            currentStreak: this.gameWon ? currentStats.currentStreak + 1 : 0,
            maxStreak: Math.max(currentStats.maxStreak, this.gameWon ? currentStats.currentStreak + 1 : 0),
            guessDistribution: [...currentStats.guessDistribution]
        };

        if (this.gameWon) {
            console.log(`Adding guess distribution for row ${this.currentRow + 1}, array index ${this.currentRow}`);
            newStats.guessDistribution[this.currentRow] = (newStats.guessDistribution[this.currentRow] || 0) + 1;
            console.log('Updated guess distribution:', newStats.guessDistribution);
        }
        
        console.log('New stats to save:', newStats);

        if (this.isGuest) {
            // Save guest stats to localStorage
            localStorage.setItem('pm-wordle-guest-stats', JSON.stringify(newStats));
            console.log('Saved guest stats to localStorage:', newStats);
        } else {
            // Get current user from Supabase
            const { data: { user } } = await this.db.supabase.auth.getUser();
            if (!user) {
                console.error('No authenticated user found for saving stats');
                return;
            }

            // Convert to database format (don't include user_id, updateUserStats adds it)
            const dbStats = {
                games_played: newStats.gamesPlayed,
                games_won: newStats.gamesWon,
                current_streak: newStats.currentStreak,
                max_streak: newStats.maxStreak,
                guess_distribution: newStats.guessDistribution
            };

            console.log('Saving stats to database for user:', user.id, 'Stats:', dbStats);
            const { error } = await this.db.updateUserStats(user.id, dbStats);
            if (error) {
                console.error('Error saving user stats:', error);
                // Fallback to local storage if database fails
                console.log('Falling back to local storage');
                localStorage.setItem(`pm-wordle-user-stats-${user.id}`, JSON.stringify(newStats));
            } else {
                console.log('Successfully saved stats to database');
                
                // Verify the save was successful by reading back
                const { data: verifyData } = await this.db.getUserStats(user.id);
                if (verifyData && verifyData.games_played === newStats.gamesPlayed) {
                    console.log('Stats save verified successfully');
                    
                    // Also backup to localStorage for reliability
                    localStorage.setItem(`pm-wordle-user-backup-${user.id}`, JSON.stringify({
                        ...newStats,
                        lastSaved: new Date().toISOString(),
                        verified: true
                    }));
                } else {
                    console.error('Stats save verification failed, keeping old backup');
                }
                
                // Clear any cached stats to force refresh
                delete this._cachedStats;
                // Force immediate UI update
                await this.updateStats();
                // Update streak leaderboard since max_streak might have changed
                await this.updateStreakLeaderboard();
            }
        }
    }

    // Leaderboard System
    async updateLeaderboards() {
        console.log('Updating leaderboards - isGuest:', this.isGuest, 'gameWon:', this.gameWon);
        
        // Only update user's own score if logged in and won
        if (!this.isGuest && this.gameWon) {
            console.log('Updating daily leaderboard for logged-in winner');
            await this.updateDailyLeaderboard();
        }
        
        // Always render leaderboards for everyone to see (with updated data)
        console.log('Rendering updated leaderboards');
        await this.renderDailyLeaderboard();
        await this.updateStreakLeaderboard();
    }

    async updateDailyLeaderboard() {
        if (!this.gameWon) return;

        // Get current user from Supabase
        const { data: { user } } = await this.db.supabase.auth.getUser();
        if (!user) {
            console.error('No authenticated user found for leaderboard update');
            return;
        }

        const completionTime = Math.floor((this.endTime - this.startTime) / 1000);
        const today = this.getPuzzleDate();
        
        // Update leaderboard in database
        const { error } = await this.db.updateDailyLeaderboard(
            user.id, 
            today, 
            completionTime, 
            this.currentRow + 1,
            this.currentWord
        );

        if (error) {
            console.error('Error updating daily leaderboard:', error);
        }

        // Refresh the leaderboard display
        await this.renderDailyLeaderboard();
    }

    async renderDailyLeaderboard() {
        const today = this.getPuzzleDate();
        const listElement = document.getElementById('daily-list');
        
        console.log('Rendering daily leaderboard for date:', today, 'isGuest:', this.isGuest, 'currentUser:', this.currentUser);
        
        if (!listElement) {
            console.log('Daily leaderboard element not found');
            return;
        }
        
        // Get leaderboard data from database
        const { data: todayEntries, error } = await this.db.getDailyLeaderboard(today);
        
        console.log('Daily leaderboard data:', todayEntries, 'Error:', error);
        
        if (error) {
            console.error('Error fetching daily leaderboard:', error);
            console.error('Full error details:', JSON.stringify(error));
            listElement.innerHTML = '<div class="leaderboard-empty">Error loading leaderboard - check console</div>';
            return;
        }
        
        if (!todayEntries || todayEntries.length === 0) {
            console.log('No entries found for today - this might be an RLS issue');
            
            // Show a message that indicates potential RLS issue
            listElement.innerHTML = `
                <div class="leaderboard-empty">
                    No times recorded yet today<br>
                    <small style="color: #666; font-size: 10px;">
                        If you've completed games, this may be a database permission issue.<br>
                        Check console for details.
                    </small>
                </div>
            `;
            return;
        }
        
        console.log('Processing', todayEntries.length, 'leaderboard entries');
        
        // Check if we're only getting current user's data (RLS issue indicator)
        const currentUser = await this.db.getCurrentUser();
        const uniqueUsers = [...new Set(todayEntries.map(entry => entry.user_id))];
        if (currentUser && uniqueUsers.length === 1 && uniqueUsers[0] === currentUser.id) {
            console.warn('⚠️ WARNING: Only current user\'s data returned - this indicates Row Level Security is filtering results');
            console.warn('Expected: Multiple users\' data | Got: Only current user\'s data');
            console.warn('This means other users\' results are being filtered out by database permissions');
        }

        console.log('Today entries with user profiles:', todayEntries);
        
        listElement.innerHTML = todayEntries.map((entry, index) => {
            let displayName = 'Unknown Player';
            
            if (entry.user_profiles?.first_name) {
                displayName = entry.user_profiles.first_name;
            } else if (entry.user_profiles && Array.isArray(entry.user_profiles) && entry.user_profiles[0]?.first_name) {
                displayName = entry.user_profiles[0].first_name;
            } else {
                console.warn('No user profile found for entry:', entry);
                displayName = `Player ${index + 1}`;
            }
            
            return `
                <div class="leaderboard-item">
                    <span class="leaderboard-rank">${index + 1}</span>
                    <span class="leaderboard-name">${displayName}</span>
                    <span class="leaderboard-value">${this.formatTime(entry.completion_time)}</span>
                </div>
            `;
        }).join('');
    }

    async updateStreakLeaderboard() {
        const listElement = document.getElementById('streak-list');
        
        if (!listElement) {
            console.log('Streak leaderboard element not found');
            return;
        }
        
        try {
            // Get streak leaderboard data using the new method
            const { data: streakData, error } = await this.db.getStreakLeaderboard();
            
            console.log('Streak leaderboard query result:', streakData, 'Error:', error);
            
            if (error) {
                console.error('Error fetching streak leaderboard:', error);
                console.error('Full error object:', JSON.stringify(error));
                // Show more specific error message
                const errorMsg = error.message || error.details || 'Unknown error';
                listElement.innerHTML = `<div class="leaderboard-empty">Error: ${errorMsg}</div>`;
                return;
            }
            
            if (!streakData || streakData.length === 0) {
                listElement.innerHTML = '<div class="leaderboard-empty">No streaks recorded yet</div>';
                return;
            }
            
            listElement.innerHTML = streakData.map((entry, index) => {
                let displayName = 'Unknown Player';
                if (entry.user_profiles?.first_name) {
                    displayName = entry.user_profiles.first_name;
                } else if (entry.user_profiles && Array.isArray(entry.user_profiles) && entry.user_profiles[0]?.first_name) {
                    displayName = entry.user_profiles[0].first_name;
                } else {
                    console.warn('No user profile found for streak entry:', entry);
                    displayName = `Player ${index + 1}`;
                }
                return `
                    <div class="leaderboard-item">
                        <span class="leaderboard-rank">${index + 1}</span>
                        <span class="leaderboard-name">${displayName}</span>
                        <span class="leaderboard-value">${entry.max_streak} days</span>
                    </div>
                `;
            }).join('');
        } catch (error) {
            console.error('Error updating streak leaderboard:', error);
            listElement.innerHTML = '<div class="leaderboard-empty">Error loading streaks</div>';
        }
    }

    switchLeaderboardTab(tab) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.leaderboard').forEach(board => board.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        document.getElementById(`${tab}-leaderboard`).classList.add('active');
        
        if (tab === 'daily') {
            this.renderDailyLeaderboard();
        } else if (tab === 'streak') {
            this.updateStreakLeaderboard();
        }
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // Share functionality - Enhanced with timing
    shareResults() {
        if (!this.gameOver) return;

        const gameNumber = this.getGameNumber();
        const score = this.gameWon ? `${this.currentRow + 1}/6` : 'X/6';
        
        // Calculate completion time if available
        let timeText = '';
        if (this.gameWon && this.startTime && this.endTime) {
            const completionTime = Math.floor((this.endTime - this.startTime) / 1000);
            timeText = ` ⏱️${this.formatTime(completionTime)}`;
        }
        
        let shareText = `PM Puzzle #${gameNumber} ${score}${timeText}\n\n`;
        
        for (let i = 0; i <= this.currentRow && i < 6; i++) {
            let rowText = '';
            for (let j = 0; j < 5; j++) {
                const tile = this.getTile(i, j);
                if (tile.classList.contains('correct')) {
                    rowText += '🟩';
                } else if (tile.classList.contains('present')) {
                    rowText += '🟨';
                } else {
                    rowText += '⬛';
                }
            }
            shareText += rowText + '\n';
        }

        shareText += '\n🏆 Play PM Puzzle: https://pm-puzzle.vercel.app';

        if (navigator.share) {
            navigator.share({
                title: 'PM Puzzle Results',
                text: shareText
            });
        } else {
            navigator.clipboard.writeText(shareText).then(() => {
                this.showMessage('Results with time copied to clipboard!', 'success');
            });
        }
    }

    getGameNumber() {
        const startDate = new Date('2024-01-01');
        const today = new Date();
        const diffTime = Math.abs(today - startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }
    
    formatTime(seconds) {
        if (seconds < 60) {
            return `${seconds}s`;
        }
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    }
    
    async showGameCompletionModal() {
        console.log('Showing game completion modal - gameWon:', this.gameWon, 'isGuest:', this.isGuest);
        
        // If guest completed the game, show signup prompt immediately
        if (this.isGuest && this.gameWon) {
            console.log('Guest completed game - showing signup prompt');
            this.showGuestSignupPrompt();
            return;
        }
        
        // Only show stats modal for logged-in users who won
        if (this.isGuest || !this.gameWon) {
            console.log('Skipping completion modal - user is guest or game not won');
            return;
        }
        
        // Get current stats
        const stats = await this.getStats();
        
        // Calculate completion time
        let completionTime = 'N/A';
        if (this.startTime && this.endTime) {
            const seconds = Math.floor((this.endTime - this.startTime) / 1000);
            completionTime = this.formatTime(seconds);
        }
        
        // Update modal content
        document.getElementById('completion-guesses').textContent = this.currentRow + 1;
        document.getElementById('completion-time').textContent = completionTime;
        document.getElementById('completion-streak').textContent = stats.currentStreak;
        
        // Update personal stats preview
        document.getElementById('mini-games-played').textContent = stats.gamesPlayed;
        document.getElementById('mini-win-percentage').textContent = stats.winPercentage;
        document.getElementById('mini-current-streak').textContent = stats.currentStreak;
        document.getElementById('mini-max-streak').textContent = stats.maxStreak;
        
        // Show modal
        this.showModal('post-game-stats');
        
        console.log('Post-game modal displayed with stats:', {
            guesses: this.currentRow + 1,
            time: completionTime,
            streak: stats.currentStreak,
            totalPlayed: stats.gamesPlayed,
            winPercentage: stats.winPercentage
        });
    }

    // Game state persistence
    async saveGameState() {
        const gameState = {
            currentWord: this.currentWord,
            currentRow: this.currentRow,
            currentCol: this.currentCol,
            gameOver: this.gameOver,
            gameWon: this.gameWon,
            guesses: this.guesses,
            startTime: this.startTime,
            endTime: this.endTime,
            date: this.getPuzzleDate()
        };

        // Save game state with user-specific key
        const stateKey = this.isGuest ? 'pm-wordle-game-state-guest' : `pm-wordle-game-state-${this.currentUser}`;
        localStorage.setItem(stateKey, JSON.stringify(gameState));
        
        // Don't save stats here - they are saved explicitly in the game flow
    }

    loadGameState() {
        // Check if this is a fresh session (incognito/private browsing)
        // In incognito, sessionStorage is empty at start
        const isNewSession = !sessionStorage.getItem('pm-wordle-session-started');
        if (isNewSession) {
            sessionStorage.setItem('pm-wordle-session-started', 'true');
            // Don't load any saved state for brand new sessions
            console.log('New session detected (possibly incognito), starting fresh');
            return;
        }

        // Load game state with user-specific key
        const stateKey = this.isGuest ? 'pm-wordle-game-state-guest' : `pm-wordle-game-state-${this.currentUser}`;
        const savedState = localStorage.getItem(stateKey);
        if (!savedState) return;

        const gameState = JSON.parse(savedState);
        const today = this.getPuzzleDate();

        // Only load if it's the same day and same word
        if (gameState.date === today && gameState.currentWord === this.currentWord) {
            this.currentRow = gameState.currentRow;
            this.currentCol = gameState.currentCol;
            this.gameOver = gameState.gameOver;
            this.gameWon = gameState.gameWon;
            this.guesses = gameState.guesses;
            this.startTime = new Date(gameState.startTime);
            this.endTime = gameState.endTime ? new Date(gameState.endTime) : null;

            // Restore the board state
            this.restoreBoard();
        }
    }

    restoreBoard() {
        for (let row = 0; row < this.guesses.length; row++) {
            const guess = this.guesses[row];
            for (let col = 0; col < 5; col++) {
                const tile = this.getTile(row, col);
                tile.textContent = guess[col];
                tile.classList.add('filled');
            }
            
            // Re-evaluate the guess to apply colors
            this.checkGuessInstant(guess, row);
            this.updateKeyboard(guess);
        }

        // Restore current row
        if (!this.gameOver && this.currentCol > 0) {
            // This would only happen if game was in progress, but we don't save partial rows
        }
    }

    checkGuessInstant(guess, row) {
        const tiles = [];
        for (let i = 0; i < 5; i++) {
            tiles.push(this.getTile(row, i));
        }

        // Same logic as checkGuess but without animation
        const letterCounts = {};
        for (let char of this.currentWord) {
            letterCounts[char] = (letterCounts[char] || 0) + 1;
        }

        const result = new Array(5).fill('absent');
        
        for (let i = 0; i < 5; i++) {
            if (guess[i] === this.currentWord[i]) {
                result[i] = 'correct';
                letterCounts[guess[i]]--;
            }
        }

        for (let i = 0; i < 5; i++) {
            if (result[i] === 'absent' && letterCounts[guess[i]] > 0) {
                result[i] = 'present';
                letterCounts[guess[i]]--;
            }
        }

        tiles.forEach((tile, i) => {
            tile.classList.add(result[i]);
        });
    }

    renderBoard() {
        // Clear any existing content
        document.querySelectorAll('.tile').forEach(tile => {
            tile.textContent = '';
            tile.className = 'tile';
        });
    }

    // Settings
    loadSettings() {
        const settings = JSON.parse(localStorage.getItem('pm-wordle-settings') || '{}');
        
        this.hardMode = settings.hardMode || false;
        const darkMode = settings.darkMode || false;

        document.getElementById('hard-mode-toggle').checked = this.hardMode;
        document.getElementById('dark-theme-toggle').checked = darkMode;
        
        if (darkMode) {
            document.body.classList.add('dark-mode');
        }
    }

    saveSettings() {
        const settings = {
            hardMode: this.hardMode,
            darkMode: document.body.classList.contains('dark-mode')
        };
        
        localStorage.setItem('pm-wordle-settings', JSON.stringify(settings));
    }

    // Countdown timer
    updateCountdown() {
        const updateTimer = () => {
            const now = new Date();
            let nextPuzzle = new Date(now);
            
            // Set to today at 12 PM
            nextPuzzle.setHours(12, 0, 0, 0);
            
            // If it's past 12 PM today, set to tomorrow at 12 PM
            if (now >= nextPuzzle) {
                nextPuzzle.setDate(nextPuzzle.getDate() + 1);
            }

            const diff = nextPuzzle - now;
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            const timerElement = document.getElementById('countdown-timer');
            if (timerElement) {
                timerElement.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        };

        updateTimer();
        setInterval(updateTimer, 1000);
    }

    // Testing Methods
    async testWin() {
        this.endTime = new Date();
        this.gameWon = true;
        this.gameOver = true;
        this.celebrateWin();
        await this.updateStats();
        await this.saveGameState();
        this.hideModal('test');
        setTimeout(() => this.showGameCompletionModal(), 500);
        this.showMessage('Test win applied!', 'success');
    }

    async testLose() {
        this.gameOver = true;
        this.gameWon = false;
        this.currentRow = 5;
        this.showMessage(`The word was ${this.currentWord}`, 'error', 3000);
        await this.updateStats();
        await this.saveGameState();
        this.hideModal('test');
        setTimeout(() => this.showModal('stats'), 2000);
    }

    testReset() {
        this.currentRow = 0;
        this.currentCol = 0;
        this.gameOver = false;
        this.gameWon = false;
        this.guesses = [];
        this.startTime = new Date();
        this.endTime = null;
        this.processingGuess = false;
        this.renderBoard();
        
        // Reset keyboard
        document.querySelectorAll('.key').forEach(key => {
            key.className = 'key';
            if (key.getAttribute('data-key') === 'Enter') {
                key.className = 'key key-large';
            } else if (key.getAttribute('data-key') === 'Backspace') {
                key.className = 'key key-large';
            }
        });
        
        localStorage.removeItem('pm-wordle-game-state');
        this.showMessage('Game reset!', 'success');
        this.hideModal('test');
    }

    testReveal() {
        this.showMessage(`Today's word is: ${this.currentWord}`, 'success', 3000);
    }

    async testAddWin() {
        console.log('Test add win - creating a real game win...');
        
        // Simulate a real game completion
        this.gameWon = true;
        this.gameOver = true;
        this.currentRow = Math.floor(Math.random() * 6); // Random guess count
        this.startTime = new Date(Date.now() - 60000); // 1 minute ago
        this.endTime = new Date();
        
        console.log('Simulated game state:', {
            gameWon: this.gameWon,
            gameOver: this.gameOver,
            currentRow: this.currentRow,
            isGuest: this.isGuest
        });
        
        // Save stats like a real game would
        await this.saveStats();
        await this.updateStats();
        await this.updateLeaderboards();
        
        this.showMessage(`Added real win in ${this.currentRow + 1} guesses!`, 'success');
        
        // Reset game state
        this.gameWon = false;
        this.gameOver = false;
        this.currentRow = 0;
        
        this.updateTestingPanel();
    }

    async testAddLoss() {
        let stats = await this.getStats();
        stats.gamesPlayed += 1;
        stats.currentStreak = 0;
        this.saveTestStats(stats);
        this.showMessage('Added loss!', 'success');
        this.updateTestingPanel();
    }

    testClearStats() {
        const emptyStats = {
            gamesPlayed: 0,
            gamesWon: 0,
            currentStreak: 0,
            maxStreak: 0,
            guessDistribution: [0, 0, 0, 0, 0, 0]
        };
        this.saveTestStats(emptyStats);
        this.showMessage('Stats cleared!', 'success');
        this.updateTestingPanel();
    }

    testPerfectStats() {
        const perfectStats = {
            gamesPlayed: 50,
            gamesWon: 50,
            currentStreak: 50,
            maxStreak: 50,
            guessDistribution: [2, 8, 15, 18, 5, 2]
        };
        this.saveTestStats(perfectStats);
        this.showMessage('Perfect stats generated!', 'success');
        this.updateTestingPanel();
    }

    saveTestStats(stats) {
        if (this.isGuest) {
            localStorage.setItem('pm-wordle-guest-stats', JSON.stringify(stats));
        } else {
            const users = JSON.parse(localStorage.getItem('pm-wordle-users') || '{}');
            if (users[this.currentUser]) {
                users[this.currentUser].stats = stats;
                localStorage.setItem('pm-wordle-users', JSON.stringify(users));
            }
        }
    }

    testAddLeaderboard() {
        if (this.isGuest) {
            this.showMessage('Login required for leaderboards!', 'error');
            return;
        }

        const names = ['Alex', 'Sam', 'Jordan', 'Casey', 'Taylor', 'Morgan', 'Riley', 'Avery'];
        const name = names[Math.floor(Math.random() * names.length)];
        const time = Math.floor(Math.random() * 300) + 30; // 30-330 seconds
        const guesses = Math.floor(Math.random() * 6) + 1;
        
        const today = this.getPuzzleDate();
        let dailyLeaderboard = JSON.parse(localStorage.getItem('pm-wordle-daily-leaderboard') || '{}');
        
        if (!dailyLeaderboard[today]) {
            dailyLeaderboard[today] = [];
        }

        dailyLeaderboard[today].push({
            username: name,
            time: time,
            guesses: guesses
        });

        dailyLeaderboard[today].sort((a, b) => a.time - b.time);
        dailyLeaderboard[today] = dailyLeaderboard[today].slice(0, 5);

        localStorage.setItem('pm-wordle-daily-leaderboard', JSON.stringify(dailyLeaderboard));
        this.showMessage(`Added ${name} to leaderboard!`, 'success');
    }

    testClearLeaderboard() {
        localStorage.removeItem('pm-wordle-daily-leaderboard');
        this.showMessage('Leaderboards cleared!', 'success');
    }

    testPopulateLeaderboard() {
        const names = ['Alex', 'Sam', 'Jordan', 'Casey', 'Taylor'];
        const today = this.getPuzzleDate();
        let dailyLeaderboard = JSON.parse(localStorage.getItem('pm-wordle-daily-leaderboard') || '{}');
        
        dailyLeaderboard[today] = names.map((name, index) => ({
            username: name,
            time: 45 + (index * 15),
            guesses: 3 + Math.floor(index / 2)
        }));

        localStorage.setItem('pm-wordle-daily-leaderboard', JSON.stringify(dailyLeaderboard));
        this.showMessage('Sample leaderboard populated!', 'success');
    }

    setupMobileOptimizations() {
        console.log('Setting up mobile optimizations');
        
        // Dynamic viewport height adjustment for mobile browsers
        const updateViewportHeight = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };
        
        // Initial call and update on resize/orientation change
        updateViewportHeight();
        window.addEventListener('resize', updateViewportHeight);
        window.addEventListener('orientationchange', () => {
            setTimeout(updateViewportHeight, 100);
        });
        
        // Perfect game board centering
        this.centerGameBoard();
        window.addEventListener('resize', () => {
            setTimeout(() => this.centerGameBoard(), 100);
        });
        
        // Prevent zoom on double tap for game elements
        const preventZoom = (e) => {
            if (e.detail > 1) {
                e.preventDefault();
            }
        };
        
        document.querySelectorAll('.tile, .key, .icon-btn').forEach(element => {
            element.addEventListener('click', preventZoom);
        });
        
        // Handle virtual keyboard on mobile
        if ('visualViewport' in window) {
            window.visualViewport.addEventListener('resize', () => {
                const gameContainer = document.querySelector('.game-container');
                if (window.visualViewport.height < window.innerHeight * 0.75) {
                    // Virtual keyboard is open
                    gameContainer.style.height = `${window.visualViewport.height}px`;
                    gameContainer.style.paddingBottom = '0px';
                } else {
                    // Virtual keyboard is closed
                    gameContainer.style.height = '';
                    gameContainer.style.paddingBottom = '';
                }
            });
        }
        
        // Smooth scrolling and focus management
        document.addEventListener('focusin', (e) => {
            if (e.target.tagName === 'INPUT') {
                setTimeout(() => {
                    e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
            }
        });
        
        // Prevent body scroll when modal is open
        const modals = document.querySelectorAll('.modal');
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.target.classList.contains('show')) {
                    document.body.style.overflow = 'hidden';
                    document.body.style.position = 'fixed';
                    document.body.style.width = '100%';
                } else if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const anyModalOpen = Array.from(modals).some(modal => modal.classList.contains('show'));
                    if (!anyModalOpen) {
                        document.body.style.overflow = '';
                        document.body.style.position = '';
                        document.body.style.width = '';
                    }
                }
            });
        });
        
        modals.forEach(modal => {
            observer.observe(modal, { attributes: true, attributeFilter: ['class'] });
        });
    }
    
    centerGameBoard() {
        const gameBoard = document.querySelector('.game-board');
        const boardContainer = document.querySelector('.board-container');
        const board = document.querySelector('.board');
        
        if (gameBoard && boardContainer && board) {
            // Calculate optimal positioning
            const windowHeight = window.innerHeight;
            const windowWidth = window.innerWidth;
            
            // Reset any existing transforms
            gameBoard.style.transform = '';
            boardContainer.style.transform = '';
            
            // Measure board dimensions
            const boardRect = board.getBoundingClientRect();
            const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
            const keyboardHeight = document.querySelector('.keyboard')?.offsetHeight || 0;
            const authSectionHeight = document.querySelector('.auth-section:not(.logged-in)')?.offsetHeight || 0;
            
            // Calculate available space for the game board
            const availableHeight = windowHeight - headerHeight - keyboardHeight - authSectionHeight - 40; // 40px buffer
            
            // Only apply centering if we have enough space
            if (availableHeight > boardRect.height) {
                const extraSpace = availableHeight - boardRect.height;
                const topOffset = Math.max(0, extraSpace / 2);
                
                gameBoard.style.paddingTop = `${topOffset}px`;
                gameBoard.style.paddingBottom = `${topOffset}px`;
            }
            
            // Ensure horizontal centering
            if (windowWidth > boardRect.width) {
                boardContainer.style.justifyContent = 'center';
                board.style.margin = '0 auto';
            }
            
            console.log('Game board centered:', {
                windowHeight,
                windowWidth,
                boardHeight: boardRect.height,
                boardWidth: boardRect.width,
                availableHeight,
                headerHeight,
                keyboardHeight
            });
        }
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing game...');
    window.game = new PMWordle();
    
    // Add global test functions for debugging
    window.testGame = function() {
        console.log('Testing game functionality...');
        if (window.game) {
            window.game.skipAuth();
            console.log('Game state:', {
                gameOver: window.game.gameOver,
                currentRow: window.game.currentRow,
                currentCol: window.game.currentCol,
                isGuest: window.game.isGuest,
                currentWord: window.game.currentWord
            });
        }
    };
    
    // Function to set a test word (keeps same word during testing)
    window.setTestWord = function(word) {
        window.testWord = word.toUpperCase();
        console.log('Test word set to:', window.testWord);
    };
    
    // Function to test authentication
    window.testAuth = function() {
        if (window.game) {
            window.game.isGuest = true;
            window.game.updateAuthUI();
            console.log('Auth reset to guest mode for testing');
        }
    };
    
    // Auto-skip auth for testing
    setTimeout(() => {
        if (window.game && window.game.isGuest) {
            console.log('Auto-skipping auth for guest play...');
            window.game.skipAuth();
        }
    }, 1000);
});