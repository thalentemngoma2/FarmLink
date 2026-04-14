import { Ionicons } from '@expo/vector-icons';
import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ViewStyle,
} from 'react-native';

// -----------------------------------------------------------------------------
// Types & Context
// -----------------------------------------------------------------------------
type Side = 'top' | 'bottom' | 'left' | 'right';

type SheetContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  side: Side;
};

const SheetContext = createContext<SheetContextValue | undefined>(undefined);

const useSheet = () => {
  const ctx = useContext(SheetContext);
  if (!ctx) throw new Error('Sheet components must be used within a <Sheet />');
  return ctx;
};

// -----------------------------------------------------------------------------
// Sheet Root
// -----------------------------------------------------------------------------
interface SheetProps {
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  side?: Side;
}

export const Sheet: React.FC<SheetProps> = ({
  children,
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
  side = 'bottom',
}) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen = (newOpen: boolean) => {
    if (!isControlled) setUncontrolledOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  const value = { open, setOpen, side };

  return (
    <SheetContext.Provider value={value}>
      {children}
    </SheetContext.Provider>
  );
};

// -----------------------------------------------------------------------------
// SheetTrigger
// -----------------------------------------------------------------------------
interface SheetTriggerProps {
  children: ReactNode;
  asChild?: boolean; // ignored
}

export const SheetTrigger: React.FC<SheetTriggerProps> = ({ children }) => {
  const { setOpen } = useSheet();
  return (
    <TouchableOpacity onPress={() => setOpen(true)} activeOpacity={0.7}>
      {children}
    </TouchableOpacity>
  );
};

// -----------------------------------------------------------------------------
// SheetPortal (no‑op, kept for API)
// -----------------------------------------------------------------------------
export const SheetPortal: React.FC<{ children: ReactNode }> = ({ children }) => <>{children}</>;

// -----------------------------------------------------------------------------
// SheetOverlay
// -----------------------------------------------------------------------------
interface SheetOverlayProps {
  onPress?: () => void;
}

export const SheetOverlay: React.FC<SheetOverlayProps> = ({ onPress }) => {
  const { open } = useSheet();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: open ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [open]);

  if (!open) return null;

  return (
    <TouchableWithoutFeedback onPress={onPress}>
      <Animated.View style={[styles.overlay, { opacity }]} />
    </TouchableWithoutFeedback>
  );
};

// -----------------------------------------------------------------------------
// SheetContent
// -----------------------------------------------------------------------------
interface SheetContentProps {
  children: ReactNode;
  className?: string; // ignored
  style?: ViewStyle;
  side?: Side;
  closeButton?: boolean;
}

export const SheetContent: React.FC<SheetContentProps> = ({
  children,
  style,
  side: propSide,
  closeButton = true,
}) => {
  const { open, setOpen, side: contextSide } = useSheet();
  const side = propSide || contextSide;

  const { width, height } = Dimensions.get('window');
  const translateAnim = useRef(new Animated.Value(0)).current;

  // Determine initial and target translation values
  const getTranslate = (openValue: boolean) => {
    switch (side) {
      case 'bottom': return openValue ? 0 : height;
      case 'top': return openValue ? 0 : -height;
      case 'right': return openValue ? 0 : width;
      case 'left': return openValue ? 0 : -width;
      default: return openValue ? 0 : height;
    }
  };

  useEffect(() => {
    Animated.spring(translateAnim, {
      toValue: getTranslate(open),
      useNativeDriver: true,
      damping: 20,
      stiffness: 200,
    }).start();
  }, [open]);

  const contentStyle = [
    styles.content,
    side === 'bottom' && styles.bottom,
    side === 'top' && styles.top,
    side === 'right' && styles.right,
    side === 'left' && styles.left,
    { transform: [{ translateX: side === 'left' || side === 'right' ? translateAnim : 0 },
                  { translateY: side === 'top' || side === 'bottom' ? translateAnim : 0 }] },
    style,
  ];

  const handleClose = () => setOpen(false);

  if (!open) return null;

  return (
    <Modal transparent visible={open} animationType="none" onRequestClose={handleClose}>
      <SheetOverlay onPress={handleClose} />
      <Animated.View style={contentStyle}>
        {closeButton && (
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
// SheetClose
// -----------------------------------------------------------------------------
export const SheetClose: React.FC<{ children?: ReactNode }> = ({ children }) => {
  const { setOpen } = useSheet();
  return (
    <TouchableOpacity onPress={() => setOpen(false)}>
      {children || <Ionicons name="close" size={20} color="#666" />}
    </TouchableOpacity>
  );
};

// -----------------------------------------------------------------------------
// SheetHeader
// -----------------------------------------------------------------------------
export const SheetHeader: React.FC<{ children: ReactNode; style?: ViewStyle }> = ({ children, style }) => (
  <View style={[styles.header, style]}>{children}</View>
);

// -----------------------------------------------------------------------------
// SheetFooter
// -----------------------------------------------------------------------------
export const SheetFooter: React.FC<{ children: ReactNode; style?: ViewStyle }> = ({ children, style }) => (
  <View style={[styles.footer, style]}>{children}</View>
);

// -----------------------------------------------------------------------------
// SheetTitle
// -----------------------------------------------------------------------------
export const SheetTitle: React.FC<{ children: ReactNode; style?: TextStyle }> = ({ children, style }) => (
  <Text style={[styles.title, style]}>{children}</Text>
);

// -----------------------------------------------------------------------------
// SheetDescription
// -----------------------------------------------------------------------------
export const SheetDescription: React.FC<{ children: ReactNode; style?: TextStyle }> = ({ children, style }) => (
  <Text style={[styles.description, style]}>{children}</Text>
);

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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
    backgroundColor: '#fff',
    borderRadius: 12,
    boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',
    elevation: 5,
  },
  bottom: {
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: screenHeight * 0.9,
  },
  top: {
    top: 0,
    left: 0,
    right: 0,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    maxHeight: screenHeight * 0.9,
  },
  left: {
    left: 0,
    top: 0,
    bottom: 0,
    width: screenWidth * 0.75,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },
  right: {
    right: 0,
    top: 0,
    bottom: 0,
    width: screenWidth * 0.75,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    padding: 4,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#11181C',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#687076',
  },
});