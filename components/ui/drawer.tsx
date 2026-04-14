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
import { Gesture, GestureDetector, GestureHandlerRootView, PanGestureHandlerEventPayload } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from 'react-native-reanimated';

// -----------------------------------------------------------------------------
// Types & Context
// -----------------------------------------------------------------------------
type Direction = 'bottom' | 'top' | 'left' | 'right';
type DrawerContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  direction: Direction;
};

const DrawerContext = createContext<DrawerContextValue | undefined>(undefined);

const useDrawer = () => {
  const context = useContext(DrawerContext);
  if (!context) throw new Error('Drawer components must be used inside <Drawer>');
  return context;
};

// -----------------------------------------------------------------------------
// Drawer Root
// -----------------------------------------------------------------------------
interface DrawerProps {
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  direction?: Direction;
  snapPoints?: number[];
  onSnap?: (index: number) => void;
}

export const Drawer: React.FC<DrawerProps> = ({
  children,
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
  direction = 'bottom',
  snapPoints,
  onSnap,
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

  const value = { open, setOpen, direction };

  return (
    <DrawerContext.Provider value={value}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        {children}
      </GestureHandlerRootView>
    </DrawerContext.Provider>
  );
};

// -----------------------------------------------------------------------------
// DrawerTrigger
// -----------------------------------------------------------------------------
interface DrawerTriggerProps {
  children: ReactNode;
  asChild?: boolean;
}

export const DrawerTrigger: React.FC<DrawerTriggerProps> = ({ children }) => {
  const { setOpen } = useDrawer();
  return (
    <TouchableOpacity onPress={() => setOpen(true)} activeOpacity={0.7}>
      {children}
    </TouchableOpacity>
  );
};

// -----------------------------------------------------------------------------
// DrawerPortal (no‑op, kept for API)
// -----------------------------------------------------------------------------
export const DrawerPortal: React.FC<{ children: ReactNode }> = ({ children }) => <>{children}</>;

// -----------------------------------------------------------------------------
// DrawerOverlay
// -----------------------------------------------------------------------------
interface DrawerOverlayProps {
  onPress?: () => void;
}

export const DrawerOverlay: React.FC<DrawerOverlayProps> = ({ onPress }) => {
  const { open } = useDrawer();
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(open ? 1 : 0, { duration: 250 });
  }, [open]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!open) return null;

  return (
    <TouchableWithoutFeedback onPress={onPress}>
      <Animated.View style={[styles.overlay, animatedStyle]} />
    </TouchableWithoutFeedback>
  );
};

// -----------------------------------------------------------------------------
// DrawerContent – main drawer panel
// -----------------------------------------------------------------------------
interface DrawerContentProps {
  children: ReactNode;
  className?: string;
  style?: any;
  snapPoints?: number[];
  onSnap?: (index: number) => void;
}

export const DrawerContent: React.FC<DrawerContentProps> = ({ children, style, snapPoints, onSnap }) => {
  const { open, setOpen, direction } = useDrawer();
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

  const getOffscreenValue = useCallback(() => {
    switch (direction) {
      case 'bottom': return screenHeight;
      case 'top': return -screenHeight;
      case 'right': return screenWidth;
      case 'left': return -screenWidth;
      default: return screenHeight;
    }
  }, [direction, screenHeight, screenWidth]);

  const offscreen = getOffscreenValue();
  const onscreen = 0;
  const offset = useSharedValue(offscreen);

  useEffect(() => {
    offset.value = withSpring(open ? onscreen : offscreen, { damping: 20, stiffness: 200 });
  }, [open]);

  const startOffset = useSharedValue(0);
  const panGesture = Gesture.Pan()
    .onStart(() => {
      'worklet';
      startOffset.value = offset.value;
    })
    .onUpdate((event: PanGestureHandlerEventPayload) => {
      'worklet';
      let newOffset: number;
      if (direction === 'bottom' || direction === 'top') {
        newOffset = startOffset.value + event.translationY;
        if (direction === 'bottom') {
          newOffset = Math.min(onscreen, Math.max(offscreen, newOffset));
        } else {
          newOffset = Math.max(onscreen, Math.min(offscreen, newOffset));
        }
      } else {
        newOffset = startOffset.value + event.translationX;
        if (direction === 'right') {
          newOffset = Math.min(onscreen, Math.max(offscreen, newOffset));
        } else {
          newOffset = Math.max(onscreen, Math.min(offscreen, newOffset));
        }
      }
      offset.value = newOffset;
    })
    .onEnd((event: PanGestureHandlerEventPayload) => {
      'worklet';
      const velocity = (direction === 'bottom' || direction === 'top') ? event.velocityY : event.velocityX;
      const shouldClose = Math.abs(offset.value - offscreen) < Math.abs(offset.value - onscreen) || velocity > 500;
      if (shouldClose) {
        runOnJS(setOpen)(false);
      } else {
        offset.value = withSpring(onscreen);
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    if (direction === 'bottom' || direction === 'top') {
      return { transform: [{ translateY: offset.value }] };
    } else {
      return { transform: [{ translateX: offset.value }] };
    }
  });

  const containerStyle = [
    styles.drawer,
    direction === 'bottom' && styles.bottomDrawer,
    direction === 'top' && styles.topDrawer,
    direction === 'left' && styles.leftDrawer,
    direction === 'right' && styles.rightDrawer,
    style,
  ];

  const handleClose = () => setOpen(false);

  if (!open) return null;

  return (
    <Modal transparent visible={open} animationType="none" onRequestClose={handleClose}>
      <DrawerOverlay onPress={handleClose} />
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[containerStyle, animatedStyle]}>
          {(direction === 'bottom' || direction === 'top') && (
            <View style={styles.handleContainer}>
              <View style={styles.handle} />
            </View>
          )}
          {children}
        </Animated.View>
      </GestureDetector>
    </Modal>
  );
};

// -----------------------------------------------------------------------------
// DrawerClose
// -----------------------------------------------------------------------------
export const DrawerClose: React.FC<{ children?: ReactNode }> = ({ children }) => {
  const { setOpen } = useDrawer();
  return (
    <TouchableOpacity onPress={() => setOpen(false)}>
      {children || <Ionicons name="close" size={20} color="#666" />}
    </TouchableOpacity>
  );
};

// -----------------------------------------------------------------------------
// DrawerHeader
// -----------------------------------------------------------------------------
export const DrawerHeader: React.FC<{ children: ReactNode; style?: any }> = ({ children, style }) => (
  <View style={[styles.header, style]}>{children}</View>
);

// -----------------------------------------------------------------------------
// DrawerFooter
// -----------------------------------------------------------------------------
export const DrawerFooter: React.FC<{ children: ReactNode; style?: any }> = ({ children, style }) => (
  <View style={[styles.footer, style]}>{children}</View>
);

// -----------------------------------------------------------------------------
// DrawerTitle
// -----------------------------------------------------------------------------
export const DrawerTitle: React.FC<{ children: ReactNode; style?: any }> = ({ children, style }) => (
  <Text style={[styles.title, style]}>{children}</Text>
);

// -----------------------------------------------------------------------------
// DrawerDescription
// -----------------------------------------------------------------------------
export const DrawerDescription: React.FC<{ children: ReactNode; style?: any }> = ({ children, style }) => (
  <Text style={[styles.description, style]}>{children}</Text>
);

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------
const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawer: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 12,
    boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',
    elevation: 5,
  },
  bottomDrawer: {
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: screenHeight * 0.9,
  },
  topDrawer: {
    top: 0,
    left: 0,
    right: 0,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    maxHeight: screenHeight * 0.9,
  },
  leftDrawer: {
    left: 0,
    top: 0,
    bottom: 0,
    width: screenWidth * 0.75,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },
  rightDrawer: {
    right: 0,
    top: 0,
    bottom: 0,
    width: screenWidth * 0.75,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#ccc',
    borderRadius: 2,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
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