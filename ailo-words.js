// Ailo Support Puzzle - Custom Word List
// All words are 5 letters and uppercase

const AILO_WORDS = [
    // Names (5 letters each)
    "ANGUS", "BAMBA", "BILLY", "CARLA", "ERICA",
    "GRACE", "JABAR", "JODIE", "JONES", "JONNA",
    "JOVER", "KAREN", "KAYLA", "KYLIE", "LINDA",
    "LITAO", "MANDY", "MARIA", "MARIE", "MEYER",
    "MIRZA", "MUNOZ", "PARAS", "PERTH", "POSAS",
    "SAIES", "SANDY", "SARAH", "SASHA", "SILVA",
    "TINIO", "TRISH", "WELLS",

    // Property Management Terms (5 letters each)
    "ADMIN", "AGENT", "BILLS", "BONDS", "BREAK",
    "CLAIM", "CYCLE", "DAILY", "DEBIT", "ENTRY",
    "FINAL", "FIXED", "FUNDS", "LEASE", "MONTH",
    "MONEY", "MULTI", "ORDER", "OWNER", "RATES",
    "SACAT", "TERMS", "TITLE", "TRUST", "USAGE",
    "WATER", "YIELD"
];

// Export for use in script.js
window.AILO_WORD_BANK = AILO_WORDS;

console.log(`Ailo Support Puzzle: Loaded ${AILO_WORDS.length} custom words`);