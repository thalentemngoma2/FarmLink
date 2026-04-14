import { supabase } from '@/lib/supabase';
import React, { createContext, useContext, useEffect, useState } from 'react';

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  session: any | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  verifyOTP: (email: string, token: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Listen to auth state changes from Supabase
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ? mapSupabaseUser(session.user) : null);
      setIsLoading(false);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ? mapSupabaseUser(session.user) : null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
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

  const signup = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (error) throw error;
      console.log('Signup success:', data);
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
    } catch (err: any) {
      throw new Error(err.message || 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const forgotPassword = async (email: string) => {
    setIsLoading(true);
    try {
      // 1. Check if the email exists in the system
      const { data: exists, error: checkError } = await supabase.rpc('check_user_exists', {
        p_email: email,
      });
      if (checkError) throw checkError;
      if (!exists) {
        throw new Error('No account found with this email address');
      }

      // 2. Proceed with password reset
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'farmlink://reset-password',
      });
      if (error) throw error;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to send reset email');
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
    session,
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