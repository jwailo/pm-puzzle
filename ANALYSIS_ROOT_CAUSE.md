# ADMIN DASHBOARD METRICS ISSUE - ROOT CAUSE ANALYSIS

## Problem Summary
- Active Today, Active This Week, Active This Month, and Avg Games per User all showing **0**
- Guest Sessions showing **1000** (possibly hardcoded or cached)
- Issue persists despite timezone fixes

## CRITICAL ISSUES FOUND

### ISSUE 1: DAILY_COMPLETIONS TABLE - NO DATA OR NOT EXISTS
**Location:** Lines 1267-1306 in admin-secure.js, `getActiveUserMetrics()` method

**Problem:** 
The code queries the `daily_completions` table:
```javascript
.from('daily_completions')
.select('user_id')
.eq('puzzle_date', today)
```

**Why it's failing:**
1. The `daily_completions` table may not exist or have data
2. If the RLS (Row Level Security) policies prevent reading, the query fails silently
3. The error is caught but only logs to console - the function returns 0 for today/week/month

**Evidence:**
- Lines 1276-1279: Only logs if `!todayError && todayData` - but still returns 0 if table doesn't exist
- No actual data validation - just checks if error exists

### ISSUE 2: FALLBACK LOGIC IS BROKEN
**Location:** Lines 1309-1339 in admin-secure.js

**Problem:**
```javascript
if (metrics.today === 0 && metrics.week === 0 && metrics.month === 0) {
    // Only falls back if ALL three are 0
    // But if ANY is 0, it doesn't update the others
}
```

**Why it's wrong:**
- The fallback only triggers if ALL three metrics are 0
- If one query partially succeeds, others don't get updated
- The fallback queries `user_stats` which may have different data structure

### ISSUE 3: TIMEZONE MATH IS POTENTIALLY WRONG
**Location:** Lines 1247-1255 in admin-secure.js

**Problem:**
```javascript
const aestOffset = 11 * 60;  // AEDT UTC+11 (always 11?)
const localOffset = now.getTimezoneOffset();  // Could be negative
const totalOffset = aestOffset + localOffset;
sydneyNow.setMinutes(sydneyNow.getMinutes() + totalOffset);
```

**Why it's wrong:**
1. AEST is UTC+10, AEDT is UTC+11 (daylight saving - seasonal)
2. Hard-coding 11 is incorrect
3. If local offset is wrong, totalOffset becomes wrong
4. Adding minutes when you need date changes is unreliable

### ISSUE 4: GUEST SESSIONS FUNCTION HAS NO ACTUAL ERROR HANDLING
**Location:** Lines 1401-1435 in admin-secure.js, `getGuestSessions()`

**Problem:**
```javascript
const { data, error } = await this.supabase
    .from('user_stats')
    .select('session_id')
    .is('user_id', null)
    .not('session_id', 'is', null);

if (error) {
    // Alternative query, but still might return 0
    return 0;  // Falls back to 0
}

// Returns unique session count
```

**Why "1000" appears:**
- If this function returns 1000, it means the `user_stats` table HAS data
- But the active metrics return 0 from `daily_completions`
- This means different tables are being used for different metrics

### ISSUE 5: CRITICAL - AVG_GAMES_PER_USER ALWAYS 0
**Location:** Lines 1342-1353 in admin-secure.js

**Problem:**
```javascript
const { data: gamesData, error: gamesError } = await this.supabase
    .from('user_stats')
    .select('games_played')
    .gt('games_played', 0)  // Only select if games_played > 0
    .not('user_id', 'is', null);  // Must have user_id

if (!gamesError && gamesData && gamesData.length > 0) {
    // Only calculates if data exists
    metrics.avgGamesPerUser = (totalGames / activeUsers).toFixed(1);
}
// Else returns 0 by default from line 1244
```

**Why it's 0:**
- If `gamesData` is empty or null, it returns 0
- This could mean:
  - RLS policy prevents reading `user_stats`
  - No users have `games_played > 0`
  - Query filter is wrong

### ISSUE 6: NO QUERY ERROR LOGGING
**Multiple locations** in admin-secure.js

**Problem:**
```javascript
if (!todayError && todayData) {  // Only if NO error AND has data
    metrics.today = new Set(todayData.map(d => d.user_id)).size;
    console.log('...');
}
// If error exists, it's NOT logged!
```

**Why it's dangerous:**
- Silent failures - errors exist but aren't logged
- Makes debugging impossible
- Returns 0 values instead of indicating failure

## THE 1000 MYSTERY

The "1000" value for guest sessions suggests:
1. `getGuestSessions()` is working and returning a real number
2. `daily_completions` table either doesn't exist or has no data
3. OR `daily_completions` exists but RLS policies prevent access
4. OR the table name is wrong (should it be `game_sessions` or `puzzle_completions`?)

## ROOT CAUSES

1. **Database Schema Mismatch**: Code queries `daily_completions` table which may not exist or may not be populated
2. **RLS Policy Issue**: Row Level Security policies may prevent SELECT queries
3. **Wrong Table Names**: Code uses different tables for different metrics:
   - `daily_completions` for active users
   - `user_stats` for guest sessions and avg games
   - These tables may not be in sync or populated equally
4. **Timezone Logic Bug**: The Sydney timezone conversion is flawed
5. **Silent Failures**: Errors aren't logged, making it impossible to debug

## EVIDENCE IN LOGS

When you run the dashboard, check browser console for:
```
Active metrics dates: { today: 'XXXX-XX-XX', weekAgo: '...', monthAgo: '...' }
Today active users from daily_completions: 0
Week active users from daily_completions: 0
Month active users from daily_completions: 0
Falling back to user_stats for active metrics
Active metrics from user_stats: { today: 0, week: 0, month: 0, avgGamesPerUser: 0 }
```

If you see "Falling back..." message, it means the primary method (daily_completions) returned 0.

## WHAT NEEDS TO BE FIXED

1. Verify `daily_completions` table exists and has data
2. Check RLS policies on `daily_completions` table
3. Add DETAILED error logging for ALL database queries
4. Fix timezone conversion to be accurate
5. Verify all table names are correct
6. Consider consolidating data queries to use tables that are actually populated
7. Add validation that functions are actually being called

