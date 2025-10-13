# Enable Guest Tracking in Supabase

## The Problem
Guest players cannot save their data to the database because Supabase Row Level Security (RLS) policies are blocking anonymous users from inserting/updating records in the `user_stats` and `game_sessions` tables.

## The Solution
Run the SQL script `enable-guest-tracking.sql` in your Supabase SQL Editor to create the necessary policies.

## How to Apply

1. **Go to your Supabase Dashboard**
   - URL: https://supabase.com/dashboard/project/taeetzxhrdohdijwgous
   - Sign in with your Supabase account

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Or go directly to: https://supabase.com/dashboard/project/taeetzxhrdohdijwgous/sql

3. **Create a New Query**
   - Click "New query" button
   - Copy the entire contents of `enable-guest-tracking.sql`
   - Paste it into the SQL editor

4. **Run the Script**
   - Click "Run" or press Ctrl/Cmd + Enter
   - You should see success messages for each policy created

5. **Verify the Policies**
   - Go to Authentication > Policies in your Supabase dashboard
   - You should see the new policies for `user_stats` and `game_sessions` tables:
     - "Anonymous users can insert stats"
     - "Anonymous users can update stats"
     - "Anonymous users can read stats"
     - "Anonymous users can insert sessions"
     - "Users can read own sessions"
     - "Users can update own sessions"

## What This Does

The SQL script:

1. **Enables RLS** on the required tables (if not already enabled)

2. **Creates policies** that allow:
   - Anonymous users to insert records with guest IDs (starting with 'guest_')
   - Anonymous users to update their own guest records
   - Anonymous users to read guest records
   - Authenticated users to still work with their own records

3. **Grants permissions** to the `anon` role for:
   - SELECT, INSERT, UPDATE on `user_stats`
   - SELECT, INSERT, UPDATE on `game_sessions`

## Testing

After applying the SQL:

1. Open an incognito/private browser window
2. Go to https://pm-puzzle.vercel.app/
3. Play a game without signing in
4. Check the browser console (F12) for:
   - "Guest initialized in database successfully"
   - "Successfully saved guest stats to database"
   - "Game session saved to database"

5. Check the admin dashboard:
   - Go to https://pm-puzzle-j64j.vercel.app/admin.html
   - Total Players should now include guest players
   - The count should be higher than just registered users

## Troubleshooting

If you still see errors after applying the SQL:

1. **Check the Supabase logs**
   - Go to Logs > API logs in Supabase dashboard
   - Look for any permission denied errors

2. **Verify RLS is enabled**
   - Go to Database > Tables
   - Check that RLS is "Enabled" for `user_stats` and `game_sessions`

3. **Check the policies**
   - Go to Authentication > Policies
   - Ensure all the policies from the script are listed
   - Check that they show "anon" in the allowed roles

## Important Notes

- This allows guest data to be saved to your database
- Guest IDs are in the format: `guest_[timestamp]_[random]`
- Guest data persists only for the browser session (stored in sessionStorage)
- When a guest signs up, their data should be transferred to their new account