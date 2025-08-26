// Property Management Wordle Game
class PMWordle {
    constructor() {
        // Property Management Answer Bank (60 words) - these are the daily answers
        this.answerBank = [
            'LEASE', 'RENTS', 'TOWER', 'CONDO', 'AGENT', 'LOBBY', 'SUITE', 'OWNER', 'ASSET', 'UNITS',
            'TAXES', 'MAINT', 'YIELD', 'HOUSE', 'PROPS', 'SPACE', 'FLOOR', 'DOORS', 'WALLS', 'ROOFS',
            'POOLS', 'YARDS', 'FENCE', 'DECKS', 'PORCH', 'DRIVE', 'ROADS', 'PATHS', 'PIPES', 'WATER',
            'POWER', 'ELECT', 'HVACS', 'AUDIT', 'CLEAN', 'PAINT', 'FIXES', 'CALLS', 'TOURS', 'SHOWS',
            'SIGNS', 'LISTS', 'SALES', 'BUYS', 'SELLS', 'LOANS', 'BANKS', 'FUNDS', 'COSTS', 'BILLS',
            'FEES', 'RENTS', 'VALUE', 'PRICE', 'MONTH', 'YEARS', 'TERMS', 'DEALS', 'FORMS', 'CODES'
        ];

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

        // Initialize game
        this.init().catch(error => {
            console.error('Game initialization failed:', error);
            // Fallback initialization
            this.initGame();
            this.setupEventListeners();
            this.loadSettings();
            this.updateCountdown();
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
            
            // Also include our answer bank in the valid words
            this.answerBank.forEach(word => {
                if (!this.validWords.includes(word)) {
                    this.validWords.push(word);
                }
            });
            
        } catch (error) {
            console.error('Error loading words from file:', error);
            // Fallback to a comprehensive word list if file loading fails
            this.validWords = [
                ...this.answerBank,
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
        this.loadGameState();
        this.renderBoard();
        this.updateStats();
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
        return this.answerBank[wordIndex];
    }

    setupEventListeners() {
        console.log('Setting up event listeners');
        
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

        // On-screen keyboard
        const keyElements = document.querySelectorAll('.key');
        console.log('Found', keyElements.length, 'key elements');
        keyElements.forEach(key => {
            key.addEventListener('click', () => {
                console.log('Key clicked:', key.getAttribute('data-key'));
                if (this.gameOver) return;
                const keyValue = key.getAttribute('data-key');
                this.handleKeyPress(keyValue);
            });
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
    
    showGameCompletionModal() {
        if (this.isGuest && this.gameWon) {
            // Show signup prompt for guests who won
            this.showGuestSignupPrompt();
        } else {
            // Show regular stats modal
            this.showModal('stats');
        }
    }
    
    showGuestSignupPrompt() {
        // Create and show a custom signup prompt
        const existingPrompt = document.getElementById('guest-signup-prompt');
        if (existingPrompt) {
            existingPrompt.remove();
        }
        
        const promptHTML = `
            <div id="guest-signup-prompt" class="modal show">
                <div class="modal-content" style="max-width: 400px;">
                    <div class="modal-header">
                        <h2>🎉 Congratulations!</h2>
                        <button class="close-btn" onclick="document.getElementById('guest-signup-prompt').remove(); game.showModal('stats');">&times;</button>
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
                            <button onclick="document.getElementById('guest-signup-prompt').remove(); game.showModal('stats');" class="skip-btn" style="margin: 0; padding: 12px 16px;">
                                Maybe Later
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', promptHTML);
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
            
            btn.addEventListener('click', () => this.showModal(modalType));
            closeBtn.addEventListener('click', () => this.hideModal(modalType));
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.hideModal(modalType);
            });
        });

        // Share button
        document.getElementById('share-btn').addEventListener('click', () => {
            this.shareResults();
        });
        
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
        const logoutBtn = document.getElementById('logout-btn');

        console.log('Found auth elements:', {authForm, authToggle, skipAuth, logoutBtn});

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
        
        // Also add direct button click listener as fallback
        const submitBtn = document.getElementById('auth-submit');
        submitBtn.addEventListener('click', (e) => {
            console.log('Submit button clicked');
            // Don't prevent default here - let form submission handle it
        });

        authToggle.addEventListener('click', () => {
            console.log('Auth toggle clicked');
            this.toggleAuthMode();
        });

        skipAuth.addEventListener('click', () => {
            console.log('Skip auth button clicked');
            this.skipAuth();
        });

        logoutBtn.addEventListener('click', () => {
            this.logout();
        });

        // Check if user is already logged in
        this.loadUser();
        
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

    handleKeyPress(key) {
        console.log('Key pressed:', key, 'Game over:', this.gameOver, 'Current row/col:', this.currentRow, this.currentCol);
        
        // Prevent processing if game is over
        if (this.gameOver) {
            console.log('Game is over, ignoring key press');
            return;
        }
        
        if (key === 'Enter') {
            this.submitGuess();
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

    submitGuess() {
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
        if (!this.validWords.includes(guess)) {
            this.showMessage('Not in word list', 'error');
            this.shakeRow();
            return;
        }

        this.guesses.push(guess);
        this.checkGuess(guess);
        this.updateKeyboard(guess);
        
        if (guess === this.currentWord) {
            this.endTime = new Date();
            this.gameWon = true;
            this.gameOver = true;
            this.celebrateWin();
            this.updateStats();
            this.saveGameState();
            setTimeout(() => this.showGameCompletionModal(), 2000);
        } else if (this.currentRow === 5) {
            this.gameOver = true;
            this.showMessage(`The word was ${this.currentWord}`, 'error', 3000);
            this.updateStats();
            this.saveGameState();
            setTimeout(() => this.showGameCompletionModal(), 2000);
        } else {
            this.currentRow++;
            this.currentCol = 0;
            this.saveGameState();
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

    celebrateWin() {
        for (let i = 0; i < 5; i++) {
            const tile = this.getTile(this.currentRow, i);
            setTimeout(() => {
                tile.classList.add('win');
            }, i * 100);
        }
        
        this.showMessage('Congratulations!', 'success', 2000);
        
        // Update leaderboards if user is logged in
        if (!this.isGuest) {
            this.updateLeaderboards();
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

    showModal(type) {
        const modal = document.getElementById(`${type}-modal`);
        modal.classList.add('show');
        
        if (type === 'stats') {
            this.updateStats();
            this.updateLeaderboards();
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
    handleAuth() {
        console.log('Handling auth');
        const firstname = document.getElementById('firstname').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const isLogin = document.getElementById('auth-title').textContent === 'Sign In';

        console.log('Auth data:', {firstname, email, password: password ? '***' : '', isLogin});

        if (isLogin) {
            // For login, use email as username
            if (!email || !password) {
                this.showMessage('Please fill in all fields', 'error');
                return;
            }
            this.login(email, password);
        } else {
            // For registration, need all fields
            if (!firstname || !email || !password) {
                this.showMessage('Please fill in all fields', 'error');
                return;
            }
            this.register(firstname, email, password);
        }
    }

    login(email, password) {
        console.log('Attempting login for:', email);
        const users = JSON.parse(localStorage.getItem('pm-wordle-users') || '{}');
        console.log('Available users:', Object.keys(users));
        
        if (users[email] && users[email].password === password) {
            console.log('Login successful');
            this.currentUser = email;
            this.isGuest = false;
            this.saveUser();
            this.updateAuthUI();
            this.resetGameForNewUser();
            this.showMessage(`Welcome back, ${users[email].firstName}!`, 'success');
        } else {
            console.log('Login failed - invalid credentials');
            this.showMessage('Invalid email or password', 'error');
        }
    }

    register(firstname, email, password) {
        const users = JSON.parse(localStorage.getItem('pm-wordle-users') || '{}');
        const marketingConsent = document.getElementById('marketing-checkbox').checked;
        
        if (users[email]) {
            this.showMessage('Email already exists', 'error');
            return;
        }

        users[email] = {
            password: password,
            firstName: firstname,
            email: email,
            marketingConsent: marketingConsent,
            stats: {
                gamesPlayed: 0,
                gamesWon: 0,
                currentStreak: 0,
                maxStreak: 0,
                guessDistribution: [0, 0, 0, 0, 0, 0]
            },
            bestTimes: [],
            createdAt: new Date().toISOString()
        };

        localStorage.setItem('pm-wordle-users', JSON.stringify(users));
        
        this.currentUser = email;
        this.isGuest = false;
        this.saveUser();
        this.updateAuthUI();
        this.resetGameForNewUser();
        this.showMessage(`Account created! Welcome, ${firstname}!`, 'success');
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
        const today = new Date().toDateString();
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
        const firstnameField = document.getElementById('firstname');

        if (title.textContent === 'Sign In') {
            // Switch to Sign Up mode
            title.textContent = 'Sign Up';
            submit.textContent = 'Sign Up';
            toggle.textContent = 'Sign In';
            switchText.textContent = 'Already have an account?';
            marketingConsent.classList.remove('hidden');
            firstnameField.style.display = 'block';
            firstnameField.required = true;
        } else {
            // Switch to Sign In mode
            title.textContent = 'Sign In';
            submit.textContent = 'Sign In';
            toggle.textContent = 'Sign Up';
            switchText.textContent = "Don't have an account?";
            marketingConsent.classList.add('hidden');
            firstnameField.style.display = 'none';
            firstnameField.required = false;
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

    logout() {
        this.currentUser = null;
        this.isGuest = true;
        localStorage.removeItem('pm-wordle-current-user');
        this.updateAuthUI();
        this.showMessage('Logged out successfully', 'success');
    }

    updateAuthUI() {
        console.log('Updating auth UI, isGuest:', this.isGuest);
        const authForm = document.getElementById('auth-form');
        const userInfo = document.getElementById('user-info');
        const usernameDisplay = document.getElementById('username-display');
        const leaderboardsSection = document.getElementById('leaderboards-section');

        if (this.isGuest) {
            authForm.classList.remove('hidden');
            userInfo.classList.add('hidden');
            leaderboardsSection.style.display = 'none';
            
            // Ensure auth form elements are interactive
            authForm.style.pointerEvents = 'auto';
            const authInputs = authForm.querySelectorAll('input, button');
            authInputs.forEach(input => input.style.pointerEvents = 'auto');
        } else {
            authForm.classList.add('hidden');
            userInfo.classList.remove('hidden');
            
            // Show first name instead of email
            const users = JSON.parse(localStorage.getItem('pm-wordle-users') || '{}');
            const displayName = users[this.currentUser]?.firstName || this.currentUser;
            usernameDisplay.textContent = displayName;
            
            leaderboardsSection.style.display = 'block';
        }
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
    updateStats() {
        const stats = this.getStats();
        
        document.getElementById('games-played').textContent = stats.gamesPlayed;
        document.getElementById('win-percentage').textContent = stats.winPercentage;
        document.getElementById('current-streak').textContent = stats.currentStreak;
        document.getElementById('max-streak').textContent = stats.maxStreak;

        // Update guess distribution
        const maxCount = Math.max(...stats.guessDistribution);
        for (let i = 1; i <= 6; i++) {
            const count = stats.guessDistribution[i - 1];
            const fill = document.getElementById(`dist-${i}`);
            const countSpan = document.getElementById(`count-${i}`);
            
            const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
            fill.style.width = `${Math.max(percentage, count > 0 ? 7 : 0)}%`;
            countSpan.textContent = count;
        }
    }

    getStats() {
        if (this.isGuest) {
            const guestStats = JSON.parse(localStorage.getItem('pm-wordle-guest-stats') || '{"gamesPlayed":0,"gamesWon":0,"currentStreak":0,"maxStreak":0,"guessDistribution":[0,0,0,0,0,0]}');
            return {
                ...guestStats,
                winPercentage: guestStats.gamesPlayed > 0 ? Math.round((guestStats.gamesWon / guestStats.gamesPlayed) * 100) : 0
            };
        } else {
            const users = JSON.parse(localStorage.getItem('pm-wordle-users') || '{}');
            const userStats = users[this.currentUser]?.stats || {gamesPlayed:0,gamesWon:0,currentStreak:0,maxStreak:0,guessDistribution:[0,0,0,0,0,0]};
            return {
                ...userStats,
                winPercentage: userStats.gamesPlayed > 0 ? Math.round((userStats.gamesWon / userStats.gamesPlayed) * 100) : 0
            };
        }
    }

    saveStats() {
        const newStats = {
            gamesPlayed: this.getStats().gamesPlayed + 1,
            gamesWon: this.getStats().gamesWon + (this.gameWon ? 1 : 0),
            currentStreak: this.gameWon ? this.getStats().currentStreak + 1 : 0,
            maxStreak: Math.max(this.getStats().maxStreak, this.gameWon ? this.getStats().currentStreak + 1 : 0),
            guessDistribution: [...this.getStats().guessDistribution]
        };

        if (this.gameWon) {
            newStats.guessDistribution[this.currentRow] += 1;
        }

        if (this.isGuest) {
            localStorage.setItem('pm-wordle-guest-stats', JSON.stringify(newStats));
        } else {
            const users = JSON.parse(localStorage.getItem('pm-wordle-users') || '{}');
            if (users[this.currentUser]) {
                users[this.currentUser].stats = newStats;
                localStorage.setItem('pm-wordle-users', JSON.stringify(users));
            }
        }
    }

    // Leaderboard System
    updateLeaderboards() {
        if (this.isGuest) return;

        this.updateDailyLeaderboard();
        this.updateStreakLeaderboard();
    }

    updateDailyLeaderboard() {
        if (!this.gameWon) return;

        const completionTime = Math.floor((this.endTime - this.startTime) / 1000);
        const today = new Date().toDateString();
        
        let dailyLeaderboard = JSON.parse(localStorage.getItem('pm-wordle-daily-leaderboard') || '{}');
        
        if (!dailyLeaderboard[today]) {
            dailyLeaderboard[today] = [];
        }

        // Get user's first name for display
        const users = JSON.parse(localStorage.getItem('pm-wordle-users') || '{}');
        const displayName = users[this.currentUser]?.firstName || this.currentUser;
        
        // Check if user already has an entry for today
        const existingIndex = dailyLeaderboard[today].findIndex(entry => entry.email === this.currentUser);
        
        if (existingIndex === -1) {
            // First completion today
            dailyLeaderboard[today].push({
                email: this.currentUser,
                name: displayName,
                time: completionTime,
                guesses: this.currentRow + 1
            });
        } else {
            // Update if this is a better time
            if (completionTime < dailyLeaderboard[today][existingIndex].time) {
                dailyLeaderboard[today][existingIndex] = {
                    email: this.currentUser,
                    name: displayName,
                    time: completionTime,
                    guesses: this.currentRow + 1
                };
            }
        }

        // Sort by time (fastest first) and keep top 5
        dailyLeaderboard[today].sort((a, b) => a.time - b.time);
        dailyLeaderboard[today] = dailyLeaderboard[today].slice(0, 5);

        localStorage.setItem('pm-wordle-daily-leaderboard', JSON.stringify(dailyLeaderboard));
        this.renderDailyLeaderboard();
    }

    renderDailyLeaderboard() {
        const today = new Date().toDateString();
        const dailyLeaderboard = JSON.parse(localStorage.getItem('pm-wordle-daily-leaderboard') || '{}');
        const todayEntries = dailyLeaderboard[today] || [];
        
        const listElement = document.getElementById('daily-list');
        
        if (todayEntries.length === 0) {
            listElement.innerHTML = '<div class="leaderboard-empty">No times recorded yet today</div>';
            return;
        }

        listElement.innerHTML = todayEntries.map((entry, index) => `
            <div class="leaderboard-item">
                <span class="leaderboard-rank">${index + 1}</span>
                <span class="leaderboard-name">${entry.name || entry.username || 'Unknown'}</span>
                <span class="leaderboard-value">${this.formatTime(entry.time)}</span>
            </div>
        `).join('');
    }

    updateStreakLeaderboard() {
        const users = JSON.parse(localStorage.getItem('pm-wordle-users') || '{}');
        const streakData = [];

        Object.keys(users).forEach(email => {
            const user = users[email];
            const stats = user.stats;
            if (stats.currentStreak > 0) {
                streakData.push({
                    username: user.firstName || email.split('@')[0], // Use firstName or email prefix
                    streak: stats.currentStreak
                });
            }
        });

        // Sort by current streak (highest first) and keep top 5
        streakData.sort((a, b) => b.streak - a.streak);
        const topStreaks = streakData.slice(0, 5);

        const listElement = document.getElementById('streak-list');
        
        if (topStreaks.length === 0) {
            listElement.innerHTML = '<div class="leaderboard-empty">No streaks recorded yet</div>';
            return;
        }

        listElement.innerHTML = topStreaks.map((entry, index) => `
            <div class="leaderboard-item">
                <span class="leaderboard-rank">${index + 1}</span>
                <span class="leaderboard-name">${entry.username}</span>
                <span class="leaderboard-value">${entry.streak} days</span>
            </div>
        `).join('');
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

    // Share functionality
    shareResults() {
        if (!this.gameOver) return;

        const gameNumber = this.getGameNumber();
        const score = this.gameWon ? `${this.currentRow + 1}/6` : 'X/6';
        
        let shareText = `PM Puzzle #${gameNumber} ${score}\n\n`;
        
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

        shareText += '\nPlay PM Puzzle: https://pm-puzzle.vercel.app';

        if (navigator.share) {
            navigator.share({
                title: 'PM Puzzle',
                text: shareText
            });
        } else {
            navigator.clipboard.writeText(shareText).then(() => {
                this.showMessage('Results copied to clipboard!', 'success');
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

    // Game state persistence
    saveGameState() {
        const gameState = {
            currentWord: this.currentWord,
            currentRow: this.currentRow,
            currentCol: this.currentCol,
            gameOver: this.gameOver,
            gameWon: this.gameWon,
            guesses: this.guesses,
            startTime: this.startTime,
            endTime: this.endTime,
            date: new Date().toDateString()
        };

        // Save game state with user-specific key
        const stateKey = this.isGuest ? 'pm-wordle-game-state-guest' : `pm-wordle-game-state-${this.currentUser}`;
        localStorage.setItem(stateKey, JSON.stringify(gameState));
        
        if (this.gameOver) {
            this.saveStats();
        }
    }

    loadGameState() {
        // Load game state with user-specific key
        const stateKey = this.isGuest ? 'pm-wordle-game-state-guest' : `pm-wordle-game-state-${this.currentUser}`;
        const savedState = localStorage.getItem(stateKey);
        if (!savedState) return;

        const gameState = JSON.parse(savedState);
        const today = new Date().toDateString();

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
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(12, 0, 0, 0);
            
            // If it's past 12pm today, next word is tomorrow at 12pm
            // If it's before 12pm today, next word is today at 12pm
            if (now.getHours() >= 12) {
                tomorrow.setDate(tomorrow.getDate());
            } else {
                tomorrow.setDate(now.getDate());
            }

            const diff = tomorrow - now;
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
    testWin() {
        this.endTime = new Date();
        this.gameWon = true;
        this.gameOver = true;
        this.celebrateWin();
        this.updateStats();
        this.saveGameState();
        this.hideModal('test');
        setTimeout(() => this.showGameCompletionModal(), 1000);
        this.showMessage('Test win applied!', 'success');
    }

    testLose() {
        this.gameOver = true;
        this.gameWon = false;
        this.currentRow = 5;
        this.showMessage(`The word was ${this.currentWord}`, 'error', 3000);
        this.updateStats();
        this.saveGameState();
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

    testAddWin() {
        const guessNumber = Math.floor(Math.random() * 6) + 1;
        let stats = this.getStats();
        
        stats.gamesPlayed += 1;
        stats.gamesWon += 1;
        stats.currentStreak += 1;
        stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
        stats.guessDistribution[guessNumber - 1] += 1;
        
        this.saveTestStats(stats);
        this.showMessage(`Added win in ${guessNumber} guesses!`, 'success');
        this.updateTestingPanel();
    }

    testAddLoss() {
        let stats = this.getStats();
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
        
        const today = new Date().toDateString();
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
        const today = new Date().toDateString();
        let dailyLeaderboard = JSON.parse(localStorage.getItem('pm-wordle-daily-leaderboard') || '{}');
        
        dailyLeaderboard[today] = names.map((name, index) => ({
            username: name,
            time: 45 + (index * 15),
            guesses: 3 + Math.floor(index / 2)
        }));

        localStorage.setItem('pm-wordle-daily-leaderboard', JSON.stringify(dailyLeaderboard));
        this.showMessage('Sample leaderboard populated!', 'success');
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