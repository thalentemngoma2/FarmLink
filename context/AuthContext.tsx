import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';


const API_BASE = Platform.select({
  ios: 'http://192.168.8.143:3000',     // Your actual IP
  android: 'http://192.168.8.143:3000', // Same for physical device
  default: 'http://192.168.8.143:3000',
});

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredSession();
  }, []);

  const loadStoredSession = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('user');
      const storedSession = await AsyncStorage.getItem('session');
      if (storedUser && storedSession) {
        setUser(JSON.parse(storedUser));
        setSession(JSON.parse(storedSession));
      }
    } catch (e) {
      console.error('Failed to load session', e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/auth-server/src/index/login`, { email, password });
      const { user: apiUser, session: apiSession } = res.data;
      const mappedUser: User = {
        id: apiUser.id,
        email: apiUser.email,
        name: apiUser.user_metadata?.name || apiUser.email.split('@')[0],
      };
      setUser(mappedUser);
      setSession(apiSession);
      await AsyncStorage.setItem('user', JSON.stringify(mappedUser));
      await AsyncStorage.setItem('session', JSON.stringify(apiSession));
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/auth-server/src/index/signup`, {
        email,
        password,
        name,
      });
      console.log('Signup success:', response.data);
    } catch (error: any) {
      console.error('Signup error:', error.response?.data || error.message);
      const message = error.response?.data?.error || error.message || 'Signup failed. Please try again.';
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOTP = async (email: string, token: string) => {
    setIsLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/auth-server/src/index/verify-otp`, { email, token });
      const { user: apiUser, session: apiSession } = res.data;
      const mappedUser: User = { id: apiUser.id, email: apiUser.email, name: apiUser.user_metadata?.name };
      setUser(mappedUser);
      setSession(apiSession);
      await AsyncStorage.setItem('user', JSON.stringify(mappedUser));
      await AsyncStorage.setItem('session', JSON.stringify(apiSession));
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const forgotPassword = async (email: string) => {
    setIsLoading(true);
    try {
      await axios.post(`${API_BASE}/auth-server/src/index/forgot-password`, { email });
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (token: string, newPassword: string) => {
    setIsLoading(true);
    try {
      await axios.post(`${API_BASE}/auth-server/src/index/reset-password`, { access_token: token, new_password: newPassword });
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Password reset failed');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setUser(null);
    setSession(null);
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('session');
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, login, signup, logout, forgotPassword, resetPassword, verifyOTP }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

