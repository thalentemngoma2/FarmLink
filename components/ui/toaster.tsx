// toast.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

// Extend global object type
declare global {
  var __toastContext: ToastContextValue | undefined;
}

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
export type ToastVariant = 'default' | 'destructive' | 'success' | 'info';

interface ToastOptions {
  id?: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number; // milliseconds, default 4000
  action?: {
    label: string;
    onPress: () => void;
  };
  onDismiss?: () => void;
}

type ToastItem = ToastOptions & {
  id: string;
  createdAt: number;
};

interface ToastContextValue {
  addToast: (options: ToastOptions) => string;
  removeToast: (id: string) => void;
  toasts: ToastItem[];
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
};

// -----------------------------------------------------------------------------
// ToastProvider
// -----------------------------------------------------------------------------
interface ToastProviderProps {
  children: ReactNode;
  position?: 'top' | 'bottom';
  offset?: number; // offset from screen edge (default 16)
  maxToasts?: number; // maximum toasts visible at once
}

export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  position = 'top',
  offset = 16,
  maxToasts = 3,
}) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((options: ToastOptions) => {
    const id = options.id || Math.random().toString(36).substring(2, 9);
    const newToast: ToastItem = {
      ...options,
      id,
      createdAt: Date.now(),
      variant: options.variant || 'default',
      duration: options.duration ?? 4000,
    };
    setToasts(prev => [...prev, newToast].slice(-maxToasts));
    return id;
  }, [maxToasts]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const value = { addToast, removeToast, toasts };

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
};

// -----------------------------------------------------------------------------
// Toast Component (individual toast)
// -----------------------------------------------------------------------------
interface ToastProps {
  toast: ToastItem;
  onRemove: () => void;
  index: number;
  position: 'top' | 'bottom';
  offset: number;
}

const ToastComponent: React.FC<ToastProps> = ({ toast, onRemove, index, position, offset }) => {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);

  // Auto-dismiss
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove();
    }, toast.duration);
    return () => clearTimeout(timer);
  }, [toast.duration, onRemove]);

  // Entrance animation: slide in from top/bottom
  useEffect(() => {
    const startPos = position === 'top' ? -100 : 100;
    translateY.value = withSpring(0, { damping: 15 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  // Swipe to dismiss
  // (Simplified: we could add pan gesture, but for brevity we skip)
  const handleClose = () => {
    opacity.value = withTiming(0, { duration: 200 }, () => runOnJS(onRemove)());
  };

  // Determine variant colors
  let bgColor = '#fff';
  let textColor = '#11181C';
  let iconName = null;
  if (toast.variant === 'destructive') {
    bgColor = '#fee2e2';
    textColor = '#b91c1c';
    iconName = 'alert-circle';
  } else if (toast.variant === 'success') {
    bgColor = '#dcfce7';
    textColor = '#15803d';
    iconName = 'checkmark-circle';
  } else if (toast.variant === 'info') {
    bgColor = '#dbeafe';
    textColor = '#1e40af';
    iconName = 'information-circle';
  }

  // Positioning: stack from the edge, with index offset
  const { width } = Dimensions.get('window');
  const topOffset = position === 'top' ? offset + index * 70 : undefined;
  const bottomOffset = position === 'bottom' ? offset + index * 70 : undefined;

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: bgColor,
          width: width - offset * 2,
          top: topOffset,
          bottom: bottomOffset,
          position: 'absolute',
          left: offset,
          right: offset,
        },
        animatedStyle,
      ]}
    >
      {iconName && <Ionicons name={iconName as any} size={20} color={textColor} style={styles.icon} />}
      <View style={styles.content}>
        {toast.title && <Text style={[styles.title, { color: textColor }]}>{toast.title}</Text>}
        {toast.description && <Text style={[styles.description, { color: textColor + 'cc' }]}>{toast.description}</Text>}
        {toast.action && (
          <TouchableOpacity onPress={toast.action.onPress} style={styles.actionButton}>
            <Text style={[styles.actionText, { color: textColor }]}>{toast.action.label}</Text>
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
        <Ionicons name="close" size={16} color={textColor} />
      </TouchableOpacity>
    </Animated.View>
  );
};

// -----------------------------------------------------------------------------
// Toaster – renders all active toasts
// -----------------------------------------------------------------------------
interface ToasterProps {
  position?: 'top' | 'bottom';
  offset?: number;
}

export const Toaster: React.FC<ToasterProps> = ({ position = 'top', offset = 16 }) => {
  const { toasts, removeToast } = useToast();

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {toasts.map((toast, idx) => (
        <ToastComponent
          key={toast.id}
          toast={toast}
          onRemove={() => removeToast(toast.id)}
          index={idx}
          position={position}
          offset={offset}
        />
      ))}
    </View>
  );
};

// -----------------------------------------------------------------------------
// Helper: toast functions for imperative use
// -----------------------------------------------------------------------------
export const toast = {
  show: (options: ToastOptions) => {
    // This is a placeholder; the actual implementation will be inside a component that has access to the context.
    // We'll provide a global reference.
    if (global.__toastContext) {
      return global.__toastContext.addToast(options);
    }
    console.warn('Toast not initialized. Ensure Toaster is mounted.');
    return '';
  },
  success: (title: string, description?: string, options?: Omit<ToastOptions, 'title' | 'description'>) => {
    return toast.show({ ...options, title, description, variant: 'success' });
  },
  error: (title: string, description?: string, options?: Omit<ToastOptions, 'title' | 'description'>) => {
    return toast.show({ ...options, title, description, variant: 'destructive' });
  },
  info: (title: string, description?: string, options?: Omit<ToastOptions, 'title' | 'description'>) => {
    return toast.show({ ...options, title, description, variant: 'info' });
  },
  dismiss: (id: string) => {
    if (global.__toastContext) {
      global.__toastContext.removeToast(id);
    }
  },
};

// We'll set the global reference when the ToastProvider mounts
export const setToastContext = (ctx: ToastContextValue) => {
  global.__toastContext = ctx;
};

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------
const styles = StyleSheet.create({
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 4,
    boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',
    elevation: 3,
  },
  icon: {
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#11181C',
    marginBottom: 2,
  },
  description: {
    fontSize: 12,
    color: '#687076',
  },
  actionButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
});