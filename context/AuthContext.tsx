import { supabase } from '@/lib/supabase';
import React, { createContext, useContext, useEffect, useState } from 'react';

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, role?: string, location?: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  verifyOTP: (email: string, token: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Generate a 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  // const [session, setSession] = useState<any | null>(null); // unused
  const [isLoading, setIsLoading] = useState(true);

  // Listen to auth state changes from Supabase
  useEffect(() => {
    let isMounted = true;

    const fetchUserWithRole = async (session: any) => {
      if (!session?.user) {
        if (isMounted) setUser(null);
        return;
      }

      try {
        // Fetch role from public.users table
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (!isMounted) return;
        setUser({
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0],
          avatar: session.user.user_metadata?.avatar,
          role: userData?.role,
        });
      } catch (e) {
        // Avoid crashing app startup if DB/network is unreachable
        console.error('Failed to fetch user role', e);
        if (!isMounted) return;
        setUser({
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0],
          avatar: session.user.user_metadata?.avatar,
          role: undefined,
        });
      }
    };

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await fetchUserWithRole(session);
      } catch (e) {
        console.error('Failed to get Supabase session', e);
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    init();

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        await fetchUserWithRole(session);
      } catch (e) {
        console.error('Auth state change handling failed', e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Helper: convert Supabase User to our User type
  const mapSupabaseUser = (supabaseUser: any): User => ({
    id: supabaseUser.id,
    email: supabaseUser.email!,
    name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0],
    avatar: supabaseUser.user_metadata?.avatar,
  });

  // ---------------------------------------------------------------------------
  // Authentication methods
  // ---------------------------------------------------------------------------
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err: any) {
      throw new Error(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

const signup = async (email: string, password: string, name: string, role?: string, location?: string) => {
   setIsLoading(true);
   try {
     // Normalize and validate role
     const validRoles = ['farmer', 'retailer', 'admin', 'extension_officer'];
     const normalizedRole = (role || 'farmer').trim().toLowerCase();
     if (!validRoles.includes(normalizedRole)) {
       throw new Error(`Invalid role: ${role}. Must be one of: ${validRoles.join(', ')}`);
     }

     // Generate a unique username to prevent collisions (e.g., same email prefix)
     const timestamp = Date.now();
     const randomPart = Math.random().toString(36).substring(2, 10);
     const username = `${email.split('@')[0]}_${timestamp}_${randomPart}`.toLowerCase().replace(/[^a-z0-9_]/g, '_');

     // 1. Create user in Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || username,
            username,
            role: normalizedRole,
            location: location || ''
          },
          emailRedirectTo: undefined
        },
      });
        if (error) throw error;
        if (!data.user) throw new Error('Signup failed');

        console.log('Signup success - user created with role:', normalizedRole);
   } catch (err: any) {
     throw new Error(err.message || 'Signup failed');
   } finally {
     setIsLoading(false);
   }
 };

  const verifyOTP = async (email: string, token: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });
      if (error) throw error;
      
      // Refresh user state to load new role from DB
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Role refresh handled by onAuthStateChange
      }
    } catch (err: any) {
      throw new Error(err.message || 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const forgotPassword = async (email: string) => {
    setIsLoading(true);
    try {
      // 1. Check if email exists (optional – same as before)
      const { data: exists } = await supabase.rpc('check_user_exists', { p_email: email });
      if (!exists) throw new Error('No account found with this email');

      // 2. Generate a secure random token
      const resetToken = crypto.randomUUID(); // or use a 6‑digit code
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // 3. Store in DB
      const { error: dbError } = await supabase
        .from('password_resets')
        .insert({ email, reset_token: resetToken, expires_at: expiresAt });
      if (dbError) throw dbError;

      // 4. Send email via Resend Edge Function
      const { error: invokeError } = await supabase.functions.invoke('send-reset-email', {
        body: { email, token: resetToken },
      });
      if (invokeError) throw new Error('Failed to send reset email');
    } catch (err: any) {
      throw new Error(err.message || 'Password reset failed');
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (token: string, newPassword: string) => {
    setIsLoading(true);
    try {
      const { error: sessionError } = await supabase.auth.setSession({ access_token: token, refresh_token: '' });
      if (sessionError) throw sessionError;
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    } catch (err: any) {
      throw new Error(err.message || 'Password reset failed');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err: any) {
      console.error('Logout error', err);
    } finally {
      setIsLoading(false);
    }
  };

  const resendVerification = async (email: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (error) throw error;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to resend verification email');
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    signup,
    logout,
    forgotPassword,
    resetPassword,
    verifyOTP,
    resendVerification,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};