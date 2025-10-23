# Timezone Information for PM Puzzle

## Important: Database vs Sydney Time

The database server runs in UTC, while the game is intended for Sydney (AEST/AEDT) users.
This creates a date offset:

### Date Mapping
- **Database Date = Sydney Date - 1 day** (approximately)
- When it's Oct 24 in Sydney, the database stores it as Oct 23
- When it's Oct 23 in Sydney, the database stores it as Oct 22

### Examples:
| Sydney Date | Database puzzle_date |
|-------------|---------------------|
| Oct 24, 2025 | 2025-10-23 |
| Oct 23, 2025 | 2025-10-22 |
| Oct 22, 2025 | 2025-10-21 |

## Current Status

### ✅ What's Working:
1. **Function returns ALL completions** - The `get_public_daily_leaderboard` function no longer limits to 10
2. **Game records completions correctly** - When you play in Sydney, it records to the correct puzzle_date
3. **Admin panel shows all data** - Uses the same function, so shows all completions
4. **UI handles scrolling** - CSS updated to show scrollbar when >10 entries

### ⚠️ Known Issue:
- The database date is one day behind Sydney time
- This is cosmetic - the game still works correctly
- Each day's puzzle and completions are properly isolated

## How It Works:

1. **Game Reset**: Happens at midnight Sydney time (in JavaScript)
2. **Database Storage**: Uses UTC dates (approximately 11-13 hours behind Sydney)
3. **Leaderboard Display**: Shows "Today's Fastest" based on JavaScript date
4. **Database Query**: Fetches data for the UTC date

## Future Fix Options:

1. **Option A**: Update database to use Sydney timezone
2. **Option B**: Add timezone conversion in the RPC functions
3. **Option C**: Store timezone-aware timestamps
4. **Current Workaround**: System works correctly, just remember the offset when querying directly

## Admin Notes:

When checking data in Supabase:
- To see Sydney Oct 24 data → Query for 2025-10-23
- To see Sydney Oct 23 data → Query for 2025-10-22
- To see Sydney Oct 22 data → Query for 2025-10-21

The game and admin panel handle this automatically, so users won't notice the difference.