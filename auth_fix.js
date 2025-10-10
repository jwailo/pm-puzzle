// Authentication Fix Patch
// This code should be added to the script.js file to fix auth issues

// Add this to the handleAuth function (replace existing)
// This is an example function implementation - copy the logic to your main script.js
// eslint-disable-next-line no-unused-vars
const handleAuth = async function () {
    console.log('=== Starting Authentication ===');

    // Prevent multiple simultaneous auth attempts
    if (this.authInProgress) {
        console.log('Auth already in progress, skipping');
        return;
    }

    // Check if database service is available
    if (!this.db || !this.db.supabase) {
        console.error('Database service not available');
        this.showMessage('Authentication service not available. Please refresh the page.', 'error');
        return;
    }

    const firstname = document.getElementById('firstname')?.value?.trim() || '';
    const email = document.getElementById('email')?.value?.trim() || '';
    const password = document.getElementById('password')?.value || '';
    const authTitle = document.getElementById('auth-title');
    const isLogin = authTitle?.textContent === 'Sign In';
    const marketingCheckbox = document.getElementById('marketing-checkbox');
    const marketingConsent = marketingCheckbox?.checked || false;

    console.log('Auth form data:', {
        firstname: firstname ? 'provided' : 'empty',
        email: email ? 'provided' : 'empty',
        password: password ? 'provided' : 'empty',
        isLogin,
        marketingConsent
    });

    // Start auth process
    this.authInProgress = true;
    const submitBtn = document.getElementById('auth-submit');
    const originalBtnText = submitBtn?.textContent || 'Submit';

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = isLogin ? 'Signing In...' : 'Creating Account...';
    }

    try {
        if (isLogin) {
            // For login, only need email and password
            if (!email) {
                this.showMessage('Please enter your email address', 'error');
                document.getElementById('email')?.focus();
                return;
            }
            if (!password) {
                this.showMessage('Please enter your password', 'error');
                document.getElementById('password')?.focus();
                return;
            }

            console.log('Calling login function...');
            await this.login(email, password);
        } else {
            // For registration, need all fields
            if (!firstname) {
                this.showMessage('Please enter your first name', 'error');
                document.getElementById('firstname')?.focus();
                return;
            }
            if (!email) {
                this.showMessage('Please enter your email address', 'error');
                document.getElementById('email')?.focus();
                return;
            }
            if (!password) {
                this.showMessage('Please enter a password', 'error');
                document.getElementById('password')?.focus();
                return;
            }

            console.log('Calling register function...');
            await this.register(firstname, email, password, marketingConsent);
        }
    } catch (error) {
        console.error('Authentication error:', error);
        this.showMessage(error.message || 'Authentication failed. Please try again.', 'error');
    } finally {
        // Reset auth state
        this.authInProgress = false;
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        }
    }
};

// Fix for the form submission event listener
function fixAuthFormSubmission() {
    const authForm = document.getElementById('login-form');
    const submitBtn = document.getElementById('auth-submit');

    if (authForm) {
        // Remove any existing listeners
        const newForm = authForm.cloneNode(true);
        authForm.parentNode.replaceChild(newForm, authForm);

        // Add new clean listener
        newForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Form submitted via submit event');

            if (window.game && !window.game.authInProgress) {
                await window.game.handleAuth();
            }
            return false;
        });
    }

    if (submitBtn) {
        // Ensure button click also triggers auth
        submitBtn.type = 'submit'; // Ensure it's a submit button
        submitBtn.onclick = async (_e) => {
            console.log('Submit button clicked');
            if (authForm && !window.game?.authInProgress) {
                // Let form handle it, but as backup:
                setTimeout(() => {
                    if (!window.game?.authInProgress) {
                        console.log('Fallback: Triggering auth from button click');
                        window.game?.handleAuth();
                    }
                }, 100);
            }
        };
    }
}

// Clear old game states more aggressively
function aggressiveClearOldStates() {
    const today = new Date().toISOString().split('T')[0];
    const keysToCheck = [];

    // Collect all localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) keysToCheck.push(key);
    }

    // Check and remove old game states
    keysToCheck.forEach(key => {
        if (key.includes('pm-wordle-game-state')) {
            try {
                const state = JSON.parse(localStorage.getItem(key));
                if (!state.date || state.date !== today) {
                    localStorage.removeItem(key);
                    console.log('Removed old game state:', key);
                }
            } catch {
                // Remove corrupted states
                localStorage.removeItem(key);
                console.log('Removed corrupted state:', key);
            }
        }
    });
}

// Export for use
window.authFixApplied = true;
window.fixAuthFormSubmission = fixAuthFormSubmission;
window.aggressiveClearOldStates = aggressiveClearOldStates;
