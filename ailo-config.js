// Ailo Support Puzzle Configuration
// This ensures data is stored separately from the main PM Puzzle

window.PUZZLE_CONFIG = {
    // Storage prefix for Ailo Support Puzzle data
    STORAGE_PREFIX: 'ailo-support-puzzle',

    // Database table prefixes (if using Supabase)
    DB_PREFIX: 'ailo_',

    // Puzzle name
    PUZZLE_NAME: 'Ailo Support Puzzle!',

    // Theme colors
    THEME: {
        correct: '#22c55e',  // Green
        present: '#eab308',  // Yellow
        absent: '#3b82f6',   // Blue
    }
};

// Override the default storage methods
const originalGetItem = localStorage.getItem.bind(localStorage);
const originalSetItem = localStorage.setItem.bind(localStorage);
const originalRemoveItem = localStorage.removeItem.bind(localStorage);

// Helper to transform keys for Ailo storage
function transformKey(key) {
    if (key && key.startsWith('pm-wordle-')) {
        return key.replace('pm-wordle-', 'ailo-support-puzzle-');
    }
    return key;
}

// Override localStorage methods to use Ailo-specific keys
Storage.prototype.getItemAilo = function(key) {
    return originalGetItem.call(this, transformKey(key));
};

Storage.prototype.setItemAilo = function(key, value) {
    return originalSetItem.call(this, transformKey(key), value);
};

Storage.prototype.removeItemAilo = function(key) {
    return originalRemoveItem.call(this, transformKey(key));
};

// Apply overrides
localStorage.getItem = localStorage.getItemAilo;
localStorage.setItem = localStorage.setItemAilo;
localStorage.removeItem = localStorage.removeItemAilo;

// Do the same for sessionStorage
sessionStorage.getItem = function(key) {
    return this.getItemAilo ? this.getItemAilo(key) :
           originalGetItem.call(this, transformKey(key));
};

sessionStorage.setItem = function(key, value) {
    return this.setItemAilo ? this.setItemAilo(key) :
           originalSetItem.call(this, transformKey(key), value);
};

sessionStorage.removeItem = function(key) {
    return this.removeItemAilo ? this.removeItemAilo(key) :
           originalRemoveItem.call(this, transformKey(key));
};

console.log('Ailo Support Puzzle configuration loaded - using separate storage');