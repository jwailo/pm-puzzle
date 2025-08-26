// Supabase configuration
const SUPABASE_CONFIG = {
    url: 'https://taeetzxhrdohdijwgous.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhZWV0enhocmRvaGRpandnb3VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMzc2NTcsImV4cCI6MjA3MTgxMzY1N30.xzf-hGFWF6iumTarOA1-3hABjab_O_o0tcM956a3PG0'
};

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

// Export for use in other files
window.supabaseClient = supabase;