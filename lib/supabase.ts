import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY!;

// True browser environment (not SSR Node.js)
const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';

// SSR-safe no-op storage used during server rendering
const noopStorage = {
  getItem: (_key: string) => Promise.resolve(null),
  setItem: (_key: string, _value: string) => Promise.resolve(),
  removeItem: (_key: string) => Promise.resolve(),
};

// Web storage — only accessed when actually running in a browser
const webStorage = {
  getItem: (key: string) => Promise.resolve(isBrowser ? localStorage.getItem(key) : null),
  setItem: (key: string, value: string) => Promise.resolve(isBrowser ? localStorage.setItem(key, value) : undefined),
  removeItem: (key: string) => Promise.resolve(isBrowser ? localStorage.removeItem(key) : undefined),
};

// Native storage — lazy require so AsyncStorage is never bundled on web/SSR
const getNativeStorage = () => {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  return {
    getItem: (key: string) => AsyncStorage.getItem(key),
    setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
    removeItem: (key: string) => AsyncStorage.removeItem(key),
  };
};

const getStorage = () => {
  if (Platform.OS !== 'web') return getNativeStorage(); // iOS / Android
  if (isBrowser) return webStorage;                     // browser
  return noopStorage;                                   // SSR Node.js
};

export const storage = getStorage();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: isBrowser,
  },
});