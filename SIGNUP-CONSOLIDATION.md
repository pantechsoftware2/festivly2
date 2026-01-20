# Signup Flow Consolidation - SimpleSignUpModal

## Overview
All signup flows now use **SimpleSignUpModal** component instead of separate signup pages. This provides a consistent, streamlined user experience across all entry points.

## Changes Made

### 1. **Header Component** (`src/components/header.tsx`)
- ✅ Added `SimpleSignUpModal` import
- ✅ Added `showSignUpModal` state
- ✅ **Desktop**: "Sign Up" button now opens modal instead of linking to `/signup`
- ✅ **Mobile**: "Sign Up" button now opens modal instead of linking to `/signup`
- ✅ Modal closes on successful signup
- ✅ Mobile menu closes when signup is initiated

### 2. **Home Page** (`src/app/home/page.tsx`)
- ✅ Already uses `SimpleSignUpModal` for signup flow
- ✅ Opens modal when user clicks "Generate" without being logged in
- ✅ Saves pending event to localStorage and auto-triggers generation after signup
- ✅ No changes needed

### 3. **Login Page** (`src/app/login/page.tsx`)
- ✅ Added `SimpleSignUpModal` import
- ✅ Added `showSignUpModal` state
- ✅ "Don't have an account? Sign Up" link now opens modal instead of `/signup`
- ✅ Modal closes and redirects to login after successful signup
- ✅ OLD: `<a href="/signup">` - COMMENTED OUT

### 4. **Signup Page** (`src/app/signup/page.tsx`)
- ✅ Entire old email/password signup form commented out
- ✅ Now just shows a redirect message pointing to home page
- ✅ All old code preserved in comments for reference

## Signup Flow Entry Points

Users can now signup from:

1. **Header "Sign Up" button** (Desktop & Mobile)
   - Opens SimpleSignUpModal
   - Redirects to home after success

2. **Login page "Sign Up" link**
   - Opens SimpleSignUpModal
   - Redirects back to login after success

3. **Home page "Generate" button** (without login)
   - Opens SimpleSignUpModal
   - Auto-triggers generation after signup

## Benefits

✅ **Consistent UX**: Same signup modal everywhere
✅ **Faster**: No page redirects
✅ **Better flow**: Home page can auto-trigger generation after signup
✅ **Mobile-friendly**: Modal works great on all screen sizes
✅ **Preserved code**: Old code commented out, not deleted

## Old Files (Disabled)

- `src/app/signup/page.tsx` - Now shows redirect message (code commented out)

## Notes

- `SimpleSignUpModal` handles email/password signup
- `BrandOnboardingModal` handles brand/logo setup (shown after email signup)
- No changes to authentication logic or backend APIs
- All old email/password signup code preserved in comments
