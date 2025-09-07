// Supabase configuration
// Note: anon keys are safe to expose in frontend applications
const SUPABASE_CONFIG = {
    url: 'https://taeetzxhrdohdijwgous.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhZWV0enhocmRvaGRpandnb3VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMzc2NTcsImV4cCI6MjA3MTgxMzY1N30.xzf-hGFWF6iumTarOA1-3hABjab_O_o0tcM956a3PG0'
};

// Wait for Supabase library to load
if (window.supabase) {
    console.log('Initializing Supabase client...');
    const supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    window.supabaseClient = supabaseClient;
    console.log('Supabase client initialized successfully');
} else {
    console.error('Supabase library not loaded! Make sure @supabase/supabase-js is included before config.js');
    // Try to initialize when the library becomes available
    const checkSupabase = setInterval(() => {
        if (window.supabase) {
            console.log('Supabase library now available, initializing...');
            const supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
            window.supabaseClient = supabaseClient;
            console.log('Supabase client initialized successfully (delayed)');
            clearInterval(checkSupabase);
        }
    }, 100);
}