# Admin Panel Setup Instructions

## IMPORTANT: Database Setup Required

The admin panel at `/admin.html` requires database functions to be created in Supabase. Without these functions, the admin panel will show 0 for all statistics.

## Setup Steps

1. **Log into your Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your PM Puzzle project

2. **Open the SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run the Setup Script**
   - Copy the entire contents of `setup_admin_functions.sql`
   - Paste it into the SQL editor
   - Click "Run" or press Cmd/Ctrl + Enter

4. **Verify Installation**
   After running the script, you can verify the functions were created by running:
   ```sql
   SELECT get_admin_total_users();
   SELECT get_admin_total_games();
   SELECT get_admin_active_users(1);
   SELECT get_admin_signup_percentage();
   ```

## What These Functions Do

The RPC (Remote Procedure Call) functions bypass Row Level Security (RLS) to allow the admin panel to:
- Count total users
- Count daily/monthly active users  
- Calculate signup percentage
- Get the full user list
- Access share analytics

Without these functions, the admin panel cannot access the data due to RLS restrictions.

## Troubleshooting

If the admin panel still shows zeros after running the SQL:
1. Check the browser console for errors
2. Ensure you're using the correct Supabase project
3. Try refreshing the admin page with Ctrl+F5 (clear cache)
4. Verify the functions exist by running the test queries above

## Security Note

The admin panel is password-protected (default: `pmwordle2024!`). 
Change this password in `admin.js` line 11 for production use.