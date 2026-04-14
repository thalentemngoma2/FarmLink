import { Ionicons } from '@expo/vector-icons';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import {
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from 'react-native-reanimated';

// -----------------------------------------------------------------------------
// Types & Context
// -----------------------------------------------------------------------------
type DialogContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const DialogContext = createContext<DialogContextValue | undefined>(undefined);

const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) throw new Error('Dialog components must be used inside <Dialog>');
  return context;
};

// -----------------------------------------------------------------------------
// Dialog Root
// -----------------------------------------------------------------------------
interface DialogProps {
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
}

export const Dialog: React.FC<DialogProps> = ({
  children,
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
}) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen = useCallback(
    (newOpen: boolean) => {
      if (!isControlled) setUncontrolledOpen(newOpen);
      onOpenChange?.(newOpen);
    },
    [isControlled, onOpenChange]
  );

  const value = { open, setOpen };

  return (
    <DialogContext.Provider value={value}>
      {children}
    </DialogContext.Provider>
  );
};

// -----------------------------------------------------------------------------
// DialogTrigger
// -----------------------------------------------------------------------------
interface DialogTriggerProps {
  children: ReactNode;
  asChild?: boolean; // ignored
}

export const DialogTrigger: React.FC<DialogTriggerProps> = ({ children }) => {
  const { setOpen } = useDialog();
  return (
    <TouchableOpacity onPress={() => setOpen(true)} activeOpacity={0.7}>
      {children}
    </TouchableOpacity>
  );
};

// -----------------------------------------------------------------------------
// DialogPortal (no‑op, kept for API)
// -----------------------------------------------------------------------------
export const DialogPortal: React.FC<{ children: ReactNode }> = ({ children }) => <>{children}</>;

// -----------------------------------------------------------------------------
// DialogOverlay
// -----------------------------------------------------------------------------
interface DialogOverlayProps {
  style?: any;
  onPress?: () => void;
}

export const DialogOverlay: React.FC<DialogOverlayProps> = ({ style, onPress }) => {
  const fadeAnim = useSharedValue(0);
  const { open } = useDialog();

  useEffect(() => {
    fadeAnim.value = withTiming(open ? 1 : 0, { duration: 200 });
  }, [open]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));

  if (!open) return null;

  return (
    <TouchableWithoutFeedback onPress={onPress}>
      <Animated.View style={[styles.overlay, animatedStyle, style]} />
    </TouchableWithoutFeedback>
  );
};

// -----------------------------------------------------------------------------
// DialogContent
// -----------------------------------------------------------------------------
interface DialogContentProps {
  children: ReactNode;
  className?: string; // ignored, use style
  style?: any;
  showCloseButton?: boolean;
}

export const DialogContent: React.FC<DialogContentProps> = ({
  children,
  style,
  showCloseButton = true,
}) => {
  const { open, setOpen } = useDialog();
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (open) {
      scale.value = withSpring(1, { damping: 12 });
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      scale.value = withSpring(0.9);
      opacity.value = withTiming(0, { duration: 150});
    }
  }, [open]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handleClose = () => setOpen(false);

  if (!open) return null;

  return (
    <Modal transparent visible={open} animationType="none" onRequestClose={handleClose}>
      <DialogOverlay onPress={handleClose} />
      <Animated.View style={[styles.content, animatedStyle, style]}>
        {showCloseButton && (
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={20} color="#666" />
          </TouchableOpacity>
        )}
        {children}
      </Animated.View>
    </Modal>
  );
};

// -----------------------------------------------------------------------------
// DialogClose
// -----------------------------------------------------------------------------
export const DialogClose: React.FC<{ children?: ReactNode }> = ({ children }) => {
  const { setOpen } = useDialog();
  return (
    <TouchableOpacity onPress={() => setOpen(false)}>
      {children || <Ionicons name="close" size={20} color="#666" />}
    </TouchableOpacity>
  );
};

// -----------------------------------------------------------------------------
// DialogHeader
// -----------------------------------------------------------------------------
export const DialogHeader: React.FC<{ children: ReactNode; style?: any }> = ({ children, style }) => (
  <View style={[styles.header, style]}>{children}</View>
);

// -----------------------------------------------------------------------------
// DialogFooter
// -----------------------------------------------------------------------------
export const DialogFooter: React.FC<{ children: ReactNode; style?: any }> = ({ children, style }) => (
  <View style={[styles.footer, style]}>{children}</View>
);

// -----------------------------------------------------------------------------
// DialogTitle
// -----------------------------------------------------------------------------
export const DialogTitle: React.FC<{ children: ReactNode; style?: any }> = ({ children, style }) => (
  <Text style={[styles.title, style]}>{children}</Text>
);

// -----------------------------------------------------------------------------
// DialogDescription
// -----------------------------------------------------------------------------
export const DialogDescription: React.FC<{ children: ReactNode; style?: any }> = ({ children, style }) => (
  <Text style={[styles.description, style]}>{children}</Text>
);

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------
const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  content: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -width * 0.4 }, { translateY: -height * 0.3 }],
    width: width * 0.8,
    maxHeight: height * 0.8,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',
    elevation: 5,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    padding: 4,
  },
  header: {
    marginBottom: 12,
  },
  footer: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    color: '#11181C',
  },
  description: {
    fontSize: 14,
    color: '#687076',
    marginBottom: 16,
  },
});