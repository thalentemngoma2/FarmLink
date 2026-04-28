# Fix: Users Table Insert Error (23502 - Not Null Constraint)

## Problem
POST to `users` table fails with `null value in column "email" violates not-null constraint` (error code 23502).

## Root Cause
1. The `public.users` table has `NOT NULL` constraints on `email`, `phone_number`, and `password_hash`
2. The fallback insert in `app/tender/post.tsx` only provides `user_id`, `username`, and `email` (which can be null)
3. Missing fields: `phone_number`, `password_hash`, and `role`

## Fix Plan
- [x] 1. Search and analyze relevant files
- [x] 2. Read files to understand code structure
- [x] 3. Fix `app/tender/post.tsx` - Add all required NOT NULL fields to fallback insert
- [x] 4. Fix `context/AuthContext.tsx` - Ensure user profile is created after signup
- [x] 5. Update TODO.md as completed

## Changes Made

### `app/tender/post.tsx`
- Added `phone_number: ''`, `password_hash: ''`, and `role` fields to the fallback `users` insert
- Used nullish coalescing (`??`) for robust email fallback: `user?.email ?? session?.user?.email ?? placeholder`
- This prevents the `23502` NOT NULL constraint violation when the database trigger fails to create the user record

### `context/AuthContext.tsx`
- After successful `supabase.auth.signUp()`, explicitly inserts into `public.users` as a backup
- Includes all required fields: `user_id`, `username`, `email`, `phone_number`, `password_hash`, `role`
- Ignores duplicate key errors (`23505`) since the database trigger may have already created the record
- This prevents the fallback in `post.tsx` from ever

