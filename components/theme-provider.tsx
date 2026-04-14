import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
    createContext,
    useContext,
    useEffect,
    useState,
} from 'react';
import { useColorScheme } from 'react-native';

// Types
type Theme = 'light' | 'dark' | 'system';
type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  enableSystem?: boolean;
  storageKey?: string;
};

type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark'; // The actual theme after system resolution
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  enableSystem = true,
  storageKey = 'app-theme',
}: ThemeProviderProps) {
  const systemTheme = useColorScheme(); // 'light' | 'dark' | null
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved theme on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(storageKey);
        if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system')) {
          setThemeState(savedTheme as Theme);
        } else {
          setThemeState(defaultTheme);
        }
      } catch (error) {
        console.warn('Failed to load theme from storage', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadTheme();
  }, [storageKey, defaultTheme]);

  // Persist theme changes
  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      await AsyncStorage.setItem(storageKey, newTheme);
    } catch (error) {
      console.warn('Failed to save theme', error);
    }
  };

  // Resolve the actual theme (light/dark) for use in styles
  const resolvedTheme: 'light' | 'dark' =
    theme === 'system' && enableSystem
      ? (systemTheme ?? 'light')
      : theme === 'light'
      ? 'light'
      : 'dark';

  const value: ThemeContextType = {
    theme,
    setTheme,
    resolvedTheme,
  };

  // Optionally wait for loading to avoid flash of wrong theme
  if (isLoading) {
    // You could render a loading screen or null
    return null;
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}