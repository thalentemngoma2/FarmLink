import React, { createContext, ReactNode, useContext, useRef } from 'react';
import { StyleSheet, Text, TextStyle, TouchableOpacity, ViewStyle } from 'react-native';
import ToastMessage, { ToastConfig } from 'react-native-toast-message';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
// Export types for use in other components
export type ToastVariant = 'default' | 'destructive';

export interface ToastProps {
  children?: ReactNode;
  variant?: ToastVariant;
  open?: boolean;          // not used directly; for compatibility
  onOpenChange?: (open: boolean) => void;
  duration?: number;       // ms, default 4000
}

export type ToastActionElement = React.ReactElement<ToastActionProps>;

interface ToastTitleProps {
  children: ReactNode;
  style?: TextStyle;
}

interface ToastDescriptionProps {
  children: ReactNode;
  style?: TextStyle;
}

interface ToastActionProps {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

interface ToastCloseProps {
  children?: ReactNode;
  onPress?: () => void;
}

// -----------------------------------------------------------------------------
// Context
// -----------------------------------------------------------------------------
type ToastContextValue = {
  show: (params: {
    type?: 'success' | 'error' | 'info' | 'default';
    text1?: string;
    text2?: string;
    onPress?: () => void;
    visibilityTime?: number;
    autoHide?: boolean;
  }) => void;
  hide: () => void;
};

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
  config?: ToastConfig;
  position?: 'top' | 'bottom';
}

export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  config,
  position = 'top',
}) => {
  const showToast = (params: any) => {
    ToastMessage.show({
      type: params.type || 'default',
      text1: params.text1,
      text2: params.text2,
      onPress: params.onPress,
      visibilityTime: params.visibilityTime || 4000,
      autoHide: params.autoHide !== false,
      position,
    });
  };

  const hideToast = () => {
    ToastMessage.hide();
  };

  const contextValue = { show: showToast, hide: hideToast };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastMessage config={config} />
    </ToastContext.Provider>
  );
};

// -----------------------------------------------------------------------------
// Toast component – declarative wrapper (shows toast when rendered)
// -----------------------------------------------------------------------------
export const Toast: React.FC<ToastProps> = ({
  children,
  variant = 'default',
  duration,
  onOpenChange,
}) => {
  const { show, hide } = useToast();
  const shownRef = useRef(false);

  // When the component mounts, show the toast
  React.useEffect(() => {
    if (!shownRef.current) {
      shownRef.current = true;
      const text1 = typeof children === 'string' ? children : undefined;
      const text2 = undefined; // could extract from children if needed
      show({
        type: variant === 'destructive' ? 'error' : 'default',
        text1,
        text2,
        visibilityTime: duration,
        onPress: () => onOpenChange?.(false),
      });
    }
    return () => {
      if (shownRef.current) {
        // Optionally hide on unmount if it's still visible
        // hide();
      }
    };
  }, []);

  return null; // The toast is shown imperatively; no UI to render
};

// -----------------------------------------------------------------------------
// ToastTitle – used inside custom toast content
// -----------------------------------------------------------------------------
export const ToastTitle: React.FC<ToastTitleProps> = ({ children, style }) => (
  <Text style={[styles.title, style]}>{children}</Text>
);

// -----------------------------------------------------------------------------
// ToastDescription – used inside custom toast content
// -----------------------------------------------------------------------------
export const ToastDescription: React.FC<ToastDescriptionProps> = ({ children, style }) => (
  <Text style={[styles.description, style]}>{children}</Text>
);

// -----------------------------------------------------------------------------
// ToastAction – button inside toast
// -----------------------------------------------------------------------------
export const ToastAction: React.FC<ToastActionProps> = ({ children, onPress, style, textStyle }) => (
  <TouchableOpacity style={[styles.action, style]} onPress={onPress} activeOpacity={0.7}>
    <Text style={[styles.actionText, textStyle]}>{children}</Text>
  </TouchableOpacity>
);

// -----------------------------------------------------------------------------
// ToastClose – button to close toast
// -----------------------------------------------------------------------------
export const ToastClose: React.FC<ToastCloseProps> = ({ children, onPress }) => {
  const { hide } = useToast();
  return (
    <TouchableOpacity
      style={styles.close}
      onPress={() => {
        onPress?.();
        hide();
      }}
      activeOpacity={0.7}
    >
      {children || <Text style={styles.closeText}>✕</Text>}
    </TouchableOpacity>
  );
};

// -----------------------------------------------------------------------------
// ToastViewport – placeholder for the area where toasts appear (no direct equivalent)
// -----------------------------------------------------------------------------
export const ToastViewport: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  // This component is not needed in RN as the ToastMessage handles viewport.
  return null;
};

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------
const styles = StyleSheet.create({
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#11181C',
  },
  description: {
    fontSize: 12,
    color: '#687076',
    marginTop: 4,
  },
  action: {
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#11181C',
  },
  close: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
  },
  closeText: {
    fontSize: 14,
    color: '#666',
  },
});