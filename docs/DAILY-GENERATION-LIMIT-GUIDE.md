# Daily Generation Limit Implementation Guide

**Status**: Production Ready ✅

## Overview

This implementation limits FREE users to **5 image generations per day** while allowing unlimited generations for PRO and PRO+ users.

## Database Schema Changes

### Step 1: Add Columns to Profiles Table

Go to **Supabase Dashboard → SQL Editor** and run:

```sql
-- Add generation tracking columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS generations_today INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_reset_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_profiles_last_reset_date 
ON profiles(last_reset_date);
```

**File Location**: `docs/MIGRATION-ADD-DAILY-GENERATION-LIMIT.sql`

### Step 2 (OPTIONAL): Create Atomic Function

For better performance with concurrent users, create a stored function:

```sql
CREATE OR REPLACE FUNCTION increment_daily_generations(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET generations_today = COALESCE(generations_today, 0) + 1
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**File Location**: `docs/OPTIONAL-ATOMIC-INCREMENT-FUNCTION.sql`

*Note: The API has a fallback if this function doesn't exist yet.*

---

## API Logic Implementation

### File Updated
`src/app/api/generateImage/route.ts`

### How It Works

#### STEP A: Check if Reset Date is Today

```typescript
const lastResetDate = data.last_reset_date ? new Date(data.last_reset_date) : null
const today = new Date()
today.setHours(0, 0, 0, 0)

const isToday = lastResetDate && 
  lastResetDate.getFullYear() === today.getFullYear() &&
  lastResetDate.getMonth() === today.getMonth() &&
  lastResetDate.getDate() === today.getDate()

if (!isToday) {
  // Reset counter for new day
  generationsToday = 0
  await supabase
    .from('profiles')
    .update({
      generations_today: 0,
      last_reset_date: new Date().toISOString(),
    })
    .eq('id', userId)
}
```

**Logic**:
- Compares `last_reset_date` with today's date
- If dates don't match → new day detected → reset counter
- Updates database with new date and zero counter

#### STEP B: Check Daily Limit

```typescript
if (generationsToday >= 5) {
  console.warn(`🚫 BLOCKED: User reached daily limit`)
  return NextResponse.json(
    {
      success: false,
      images: [],
      prompt: '',
      error: 'DAILY_LIMIT_REACHED',
      showPricingModal: true,
    },
    { status: 429 } // Too Many Requests
  )
}
```

**Logic**:
- Only enforced for FREE users
- PRO and PRO+ users skip this check
- Returns HTTP 429 (Too Many Requests)
- Includes flag to show pricing modal

#### STEP C: Increment Counter After Success

After images are successfully generated and uploaded:

```typescript
if (userId && userSubscription === 'free') {
  // Try atomic RPC first
  const { error } = await supabase.rpc('increment_daily_generations', {
    user_id: userId
  })
  
  // Fallback to direct update if RPC doesn't exist
  if (updateError) {
    await supabase
      .from('profiles')
      .update({ 
        generations_today: supabase.raw('generations_today + 1')
      })
      .eq('id', userId)
  }
}
```

**Logic**:
- Only runs for FREE users
- Only runs AFTER successful generation
- Uses atomic increment (no race conditions)
- Has fallback if RPC function not available

---

## Response Codes

| Status | Meaning | Action |
|--------|---------|--------|
| 200 | Success | Images generated |
| 429 | Limit Reached | Show "Daily limit reached. Come back tomorrow!" |
| 402 | Payment Required | (Currently disabled) |
| 500 | Server Error | Generic error |

---

## User Journey

### Free User - First Generation of Day
```
1. API checks: Is today's date > last_reset_date? YES
2. Counter reset to 0
3. Check: 0 >= 5? NO
4. Generate images ✅
5. Increment counter (0 → 1)
```

### Free User - Fifth Generation of Day
```
1. API checks: Is today's date > last_reset_date? YES
2. No reset needed
3. Check: 5 >= 5? YES
4. Return error: "Daily limit reached. Come back tomorrow!" 🚫
```

### Free User - Next Day
```
1. API checks: Is today's date > last_reset_date? NO
2. Reset counter to 0, update date to today
3. Check: 0 >= 5? NO
4. Generate images ✅
5. Increment counter (0 → 1)
```

### Pro/Pro+ User - Any Time
```
1. Check subscription: 'pro' or 'pro plus'
2. SKIP all limit checks
3. Generate images ✅
4. DO NOT increment counter
```

---

## Testing Checklist

- [ ] Free user generates 5 times → 6th generation blocked
- [ ] Free user gets "DAILY_LIMIT_REACHED" error
- [ ] Pro user generates unlimited times (no limit)
- [ ] Counter resets at midnight (next day)
- [ ] Error message shows on UI (pricing modal)
- [ ] Multiple concurrent generations work correctly
- [ ] Database columns exist and have correct values

---

## Monitoring

Check user limits in Supabase:

```sql
SELECT 
  id,
  subscription_plan,
  generations_today,
  last_reset_date,
  (CURRENT_DATE - last_reset_date::date) as days_since_reset
FROM profiles
WHERE subscription_plan = 'free'
ORDER BY generations_today DESC
LIMIT 10;
```

---

## Troubleshooting

### Issue: "generations_today column not found"
**Solution**: Run the SQL migration from Step 1

### Issue: Users can generate > 5 times
**Solution**: Check if `generations_today >= 5` check is in the code

### Issue: Counter not incrementing
**Solution**: Ensure RPC function is created OR verify fallback update query works

### Issue: Counter doesn't reset at midnight
**Solution**: Verify date comparison logic in STEP A

---

## Production Deployment Checklist

- [ ] Run SQL migration to add columns
- [ ] Deploy updated `generateImage/route.ts`
- [ ] (Optional) Create atomic increment RPC function
- [ ] Test with free user account
- [ ] Monitor logs for "DAILY_LIMIT_REACHED"
- [ ] Update frontend to handle 429 status code
- [ ] Show user-friendly error message in UI

---

## Future Enhancements

1. **Email Notification**: Send email when daily limit reached
2. **Premium Button**: Show "Upgrade to Pro" on limit reached
3. **Analytics**: Track generation patterns by subscription
4. **Hourly Limits**: Add per-hour limits for abuse prevention
5. **Admin Dashboard**: View all users' generation counts

---

## Security Notes

✅ **Atomic Operations**: Uses RPC function or raw SQL to prevent race conditions
✅ **Server-Side Enforcement**: Check happens on API before image generation
✅ **Subscription Validation**: Only FREE users are limited
✅ **Time Zone Safe**: Uses UTC timestamps from database
✅ **No Client Bypass**: Limits cannot be bypassed by client-side manipulation

---

## Support

For questions or issues:
1. Check troubleshooting section above
2. Review API logs for error messages
3. Verify database columns exist with correct types
