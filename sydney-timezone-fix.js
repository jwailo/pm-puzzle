// SYDNEY TIMEZONE FIX
// Replace the getPuzzleDate and getTodaysWord functions to always use Sydney time

// Helper function to get Sydney time
function getSydneyTime() {
    // Get current time in Sydney (Australia/Sydney timezone)
    const now = new Date();
    const sydneyTime = new Date(now.toLocaleString("en-US", {timeZone: "Australia/Sydney"}));
    return sydneyTime;
}

// Replace getPuzzleDate function (around line 1134)
getPuzzleDate() {
    // Get Sydney time for consistent puzzle dates across all users
    const sydneyNow = getSydneyTime();

    // Format as YYYY-MM-DD for database compatibility
    const year = sydneyNow.getFullYear();
    const month = String(sydneyNow.getMonth() + 1).padStart(2, '0');
    const day = String(sydneyNow.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

// Replace getTodaysWord function (around line 1151)
getTodaysWord() {
    // Test mode: Use a fixed word for testing if set
    if (window.testWord) {
        console.log('Using test word:', window.testWord);
        return window.testWord.toUpperCase();
    }

    // Get Sydney date for consistent word selection worldwide
    const sydneyNow = getSydneyTime();

    // Create seed based on Sydney date (ignoring time)
    const sydneyDateOnly = new Date(sydneyNow.getFullYear(), sydneyNow.getMonth(), sydneyNow.getDate());
    const seed = Math.floor(sydneyDateOnly.getTime() / (1000 * 60 * 60 * 24));
    const wordIndex = seed % this.answerBank.length;
    const selectedWord = this.answerBank[wordIndex];

    // Validate that the word is exactly 5 letters (safety check)
    if (selectedWord.length !== 5) {
        console.error(`Invalid word length: ${selectedWord} (${selectedWord.length} letters)`);
        // Fallback to a valid word
        return 'LEASE';
    }

    console.log(`Today's word (Sydney date: ${this.getPuzzleDate()}):`, selectedWord);
    return selectedWord;
}

// Replace updateCountdown function (around line 4220)
updateCountdown() {
    const updateTimer = () => {
        // Calculate time until midnight Sydney time
        const now = new Date();

        // Get current Sydney time
        const sydneyNow = new Date(now.toLocaleString("en-US", {timeZone: "Australia/Sydney"}));

        // Set to today at midnight Sydney time
        const nextPuzzleSydney = new Date(sydneyNow);
        nextPuzzleSydney.setHours(0, 0, 0, 0);

        // If it's past midnight in Sydney today, set to tomorrow midnight
        if (sydneyNow >= nextPuzzleSydney) {
            nextPuzzleSydney.setDate(nextPuzzleSydney.getDate() + 1);
        }

        // Calculate milliseconds until next Sydney midnight
        // We need to convert back to user's local time for the calculation
        const sydneyMidnightString = nextPuzzleSydney.toLocaleString("en-US", {
            timeZone: "Australia/Sydney",
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });

        // Parse and convert to local time
        const nextPuzzleLocal = new Date(sydneyMidnightString + " GMT+1100"); // AEDT offset
        const diff = nextPuzzleLocal - now;

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