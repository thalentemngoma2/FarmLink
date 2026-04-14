import React, { ReactNode, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
type Align = 'start' | 'center' | 'end';
type Side = 'top' | 'right' | 'bottom' | 'left';

interface HoverCardProps {
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
}

interface HoverCardTriggerProps {
  children: ReactNode;
  asChild?: boolean; // ignored
}

interface HoverCardContentProps {
  children: ReactNode;
  align?: Align;
  sideOffset?: number;
  style?: any;
  className?: string; // ignored
}

// -----------------------------------------------------------------------------
// HoverCard Context
// -----------------------------------------------------------------------------
type HoverCardContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerPosition: { x: number; y: number; width: number; height: number };
  setTriggerPosition: (pos: any) => void;
};

const HoverCardContext = React.createContext<HoverCardContextValue | undefined>(undefined);

const useHoverCard = () => {
  const ctx = React.useContext(HoverCardContext);
  if (!ctx) throw new Error('HoverCard components must be used within <HoverCard>');
  return ctx;
};

// -----------------------------------------------------------------------------
// HoverCard (Root)
// -----------------------------------------------------------------------------
export const HoverCard: React.FC<HoverCardProps> = ({
  children,
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
}) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const [triggerPosition, setTriggerPosition] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  const setOpen = (newOpen: boolean) => {
    if (!isControlled) setUncontrolledOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  const value = { open, setOpen, triggerPosition, setTriggerPosition };

  return (
    <HoverCardContext.Provider value={value}>
      {children}
    </HoverCardContext.Provider>
  );
};

// -----------------------------------------------------------------------------
// HoverCardTrigger
// -----------------------------------------------------------------------------
export const HoverCardTrigger: React.FC<HoverCardTriggerProps> = ({ children }) => {
  const { setOpen, setTriggerPosition, open } = useHoverCard();
  const triggerRef = useRef<View>(null);

  const handlePress = () => {
    if (triggerRef.current) {
      triggerRef.current.measure((fx, fy, width, height, px, py) => {
        setTriggerPosition({ x: px, y: py, width, height });
        setOpen(!open);
      });
    } else {
      setOpen(!open);
    }
  };

  return (
    <TouchableOpacity ref={triggerRef} onPress={handlePress} activeOpacity={0.7}>
      {children}
    </TouchableOpacity>
  );
};

// -----------------------------------------------------------------------------
// HoverCardContent
// -----------------------------------------------------------------------------
export const HoverCardContent: React.FC<HoverCardContentProps> = ({
  children,
  align = 'center',
  sideOffset = 4,
  style,
}) => {
  const { open, setOpen, triggerPosition } = useHoverCard();
  const [contentSize, setContentSize] = useState({ width: 0, height: 0 });
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    if (open) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.95);
    }
  }, [open]);

  if (!open) return null;

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  // Calculate x position based on align
  let left = triggerPosition.x;
  if (align === 'center') {
    left = triggerPosition.x + triggerPosition.width / 2 - contentSize.width / 2;
  } else if (align === 'end') {
    left = triggerPosition.x + triggerPosition.width - contentSize.width;
  }

  // Default position: below the trigger
  let top = triggerPosition.y + triggerPosition.height + sideOffset;
  let side: Side = 'bottom';

  // If it would go off screen, place above
  if (top + contentSize.height > screenHeight) {
    top = triggerPosition.y - contentSize.height - sideOffset;
    side = 'top';
  }

  // Adjust horizontally if off screen
  if (left < 0) left = 8;
  if (left + contentSize.width > screenWidth) left = screenWidth - contentSize.width - 8;

  // Optional: additional animations based on side (like slide-in)
  const transform = [{ scale: scaleAnim }];

  const onLayout = (event: any) => {
    const { width, height } = event.nativeEvent.layout;
    setContentSize({ width, height });
  };

  const handleClose = () => setOpen(false);

  return (
    <Modal transparent visible={open} animationType="none" onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={StyleSheet.absoluteFillObject} />
      </TouchableWithoutFeedback>
      <Animated.View
        style={[
          styles.content,
          {
            left,
            top,
            opacity: fadeAnim,
            transform,
          },
          style,
        ]}
        onLayout={onLayout}
      >
        {children}
      </Animated.View>
    </Modal>
  );
};

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------
const styles = StyleSheet.create({
  content: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',
    elevation: 5,
    minWidth: 200,
    maxWidth: 280,
  },

});