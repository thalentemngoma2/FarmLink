# Fix Extension Officer Role Not Persisting on Signup

## Status: 🚀 In Progress

### Step 1: [✅ COMPLETE] Update app/signup.tsx
- Append `userType` to verify-otp navigation URL params.
```
router.push(`/verify-otp?email=${email}&userType=${formData.userType}`);
```

### Step 2: [✅ COMPLETE] Update app/verify-otp.tsx
- Read `userType` from `useLocalSearchParams()`.
- After `verifyOTP()` success: Insert `public.users` row with role.
```tsx
const { data: { user } } = await supabase.auth.getUser();
await supabase.from('users').upsert({ 
  user_id: user!.id, 
  role: params.userType as string,
  username: user!.email?.split('@')[0] // optional
});
```

### Step 3: [✅ COMPLETE] Update context/AuthContext.tsx
- After `verifyOTP()` success or in `onAuthStateChange`: Force refresh user role.

### Step 4: [PENDING] Test Flow
```
1. Signup → select Extension Officer → Verify OTP → Login
2. Check user.role === 'extension_officer' 
3. Verify bottom-nav shows 'Requests', profile badge correct
4. Test all roles: farmer, retailer, extension_officer
```

### Step 5: [✅ COMPLETE] Cleanup & Fix Lints
- Update TODO.md ✅
- attempt_completion

**Next Action:** Step 4: Test the full flow

