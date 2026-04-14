import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
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
type PopoverContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  anchorPosition: { x: number; y: number; width: number; height: number };
  setAnchorPosition: (pos: any) => void;
};

const PopoverContext = createContext<PopoverContextValue | undefined>(undefined);

const usePopover = () => {
  const ctx = useContext(PopoverContext);
  if (!ctx) throw new Error('Popover components must be used within a <Popover />');
  return ctx;
};

// -----------------------------------------------------------------------------
// Popover Root
// -----------------------------------------------------------------------------
interface PopoverProps {
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
}

export const Popover: React.FC<PopoverProps> = ({
  children,
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
}) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const [anchorPosition, setAnchorPosition] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  const setOpen = (newOpen: boolean) => {
    if (!isControlled) setUncontrolledOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  const value = { open, setOpen, anchorPosition, setAnchorPosition };

  return (
    <PopoverContext.Provider value={value}>
      {children}
    </PopoverContext.Provider>
  );
};

// -----------------------------------------------------------------------------
// PopoverAnchor – optional, used to position relative to a custom element
// -----------------------------------------------------------------------------
interface PopoverAnchorProps {
  children: ReactNode;
}

export const PopoverAnchor: React.FC<PopoverAnchorProps> = ({ children }) => {
  const { setAnchorPosition } = usePopover();
  const anchorRef = useRef<View>(null);

  // Measure anchor position on mount and whenever children change
  useEffect(() => {
    const measure = () => {
      anchorRef.current?.measure((fx, fy, width, height, px, py) => {
        setAnchorPosition({ x: px, y: py, width, height });
      });
    };
    measure();
    // Optional: add a resize observer if needed
  }, [children]);

  return (
    <View ref={anchorRef} collapsable={false}>
      {children}
    </View>
  );
};

// -----------------------------------------------------------------------------
// PopoverTrigger – the element that toggles the popover
// -----------------------------------------------------------------------------
interface PopoverTriggerProps {
  children: ReactNode;
  asChild?: boolean; // ignored
}

export const PopoverTrigger: React.FC<PopoverTriggerProps> = ({ children }) => {
  const { open, setOpen, setAnchorPosition } = usePopover();
  const triggerRef = useRef<View>(null);

  const handlePress = () => {
    // Measure the trigger's position before opening
    triggerRef.current?.measure((fx, fy, width, height, px, py) => {
      setAnchorPosition({ x: px, y: py, width, height });
      setOpen(!open);
    });
  };

  return (
    <TouchableOpacity ref={triggerRef} onPress={handlePress} activeOpacity={0.7}>
      {children}
    </TouchableOpacity>
  );
};

// -----------------------------------------------------------------------------
// PopoverContent – the modal content
// -----------------------------------------------------------------------------
interface PopoverContentProps {
  children: ReactNode;
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  style?: any;
}

export const PopoverContent: React.FC<PopoverContentProps> = ({
  children,
  align = 'center',
  sideOffset = 4,
  style,
}) => {
  const { open, setOpen, anchorPosition } = usePopover();
  const [contentSize, setContentSize] = useState({ width: 0, height: 0 });
  const scaleAnim = useSharedValue(0.95);
  const opacityAnim = useSharedValue(0);
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  useEffect(() => {
    if (open) {
      scaleAnim.value = withSpring(1, { damping: 12 });
      opacityAnim.value = withTiming(1, { duration: 150 });
    } else {
      scaleAnim.value = withSpring(0.95);
      opacityAnim.value = withTiming(0, { duration: 120 });
    }
  }, [open]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
    opacity: opacityAnim.value,
  }));

  const onLayout = (event: any) => {
    const { width, height } = event.nativeEvent.layout;
    setContentSize({ width, height });
  };

  // Determine position
  let left = anchorPosition.x;
  if (align === 'center') {
    left = anchorPosition.x + anchorPosition.width / 2 - contentSize.width / 2;
  } else if (align === 'end') {
    left = anchorPosition.x + anchorPosition.width - contentSize.width;
  }

  // Adjust for screen edges
  if (left + contentSize.width > screenWidth) {
    left = screenWidth - contentSize.width - 8;
  }
  if (left < 8) left = 8;

  let top = anchorPosition.y + anchorPosition.height + sideOffset;
  // If it would go off the bottom, place above
  if (top + contentSize.height > screenHeight) {
    top = anchorPosition.y - contentSize.height - sideOffset;
  }

  const handleClose = () => setOpen(false);

  if (!open) return null;

  return (
    <Modal transparent visible={open} animationType="none" onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={StyleSheet.absoluteFillObject} />
      </TouchableWithoutFeedback>
      <Animated.View
        style={StyleSheet.flatten([
          styles.content,
          { left, top, position: 'absolute' },
          animatedStyle,
          style,
        ])}
        onLayout={onLayout}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {children}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
};

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------
const styles = StyleSheet.create({
  content: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',
    elevation: 5,
    width: 280, // default width (can be overridden via style)
    maxHeight: 300,
  },
  scrollContent: {
    padding: 16,
  },
});