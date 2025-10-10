// Jest setup file for PM Puzzle

// Mock localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    length: 0,
    key: jest.fn()
};
global.localStorage = localStorageMock;

// Mock fetch
global.fetch = jest.fn();

// Mock Supabase
global.supabase = {
    createClient: jest.fn(() => ({
        auth: {
            getSession: jest.fn(),
            signInWithPassword: jest.fn(),
            signUp: jest.fn(),
            signOut: jest.fn(),
            onAuthStateChange: jest.fn()
        },
        from: jest.fn(() => ({
            select: jest.fn(() => Promise.resolve({ data: [], error: null })),
            insert: jest.fn(() => Promise.resolve({ data: [], error: null })),
            update: jest.fn(() => Promise.resolve({ data: [], error: null })),
            delete: jest.fn(() => Promise.resolve({ data: [], error: null })),
            upsert: jest.fn(() => Promise.resolve({ data: [], error: null }))
        }))
    }))
};

// Mock console methods to reduce noise in tests
console.error = jest.fn();
console.warn = jest.fn();
