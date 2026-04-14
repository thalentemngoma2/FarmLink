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
  ViewStyle
} from 'react-native';

// -----------------------------------------------------------------------------
// Types & Context
// -----------------------------------------------------------------------------
type TooltipContextValue = {
  activeTooltipId: string | null;
  setActiveTooltipId: (id: string | null) => void;
  delayDuration: number;
};

const TooltipContext = createContext<TooltipContextValue | undefined>(undefined);

const useTooltipRoot = () => {
  const ctx = useContext(TooltipContext);
  if (!ctx) throw new Error('Tooltip components must be used within a TooltipProvider');
  return ctx;
};

// -----------------------------------------------------------------------------
// TooltipProvider
// -----------------------------------------------------------------------------
interface TooltipProviderProps {
  children: ReactNode;
  delayDuration?: number; // milliseconds before showing tooltip
}

export const TooltipProvider: React.FC<TooltipProviderProps> = ({
  children,
  delayDuration = 0,
}) => {
  const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null);

  const value = { activeTooltipId, setActiveTooltipId, delayDuration };

  return (
    <TooltipContext.Provider value={value}>
      {children}
    </TooltipContext.Provider>
  );
};

// -----------------------------------------------------------------------------
// Tooltip
// -----------------------------------------------------------------------------
interface TooltipProps {
  children: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
}) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen = (newOpen: boolean) => {
    if (!isControlled) setUncontrolledOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  const [tooltipId] = useState(() => `tooltip-${Math.random()}`);
  const [triggerPosition, setTriggerPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const context = useTooltipRoot();

  // Manage global active tooltip: only one tooltip open at a time
  useEffect(() => {
    if (open) {
      context.setActiveTooltipId(tooltipId);
    } else if (context.activeTooltipId === tooltipId) {
      context.setActiveTooltipId(null);
    }
  }, [open, tooltipId, context]);

  // Force close if another tooltip opens
  useEffect(() => {
    if (context.activeTooltipId && context.activeTooltipId !== tooltipId && open) {
      setOpen(false);
    }
  }, [context.activeTooltipId]);

  // Provide context for children (trigger and content)
  const childProps = {
    tooltipId,
    open,
    setOpen,
    triggerPosition,
    setTriggerPosition,
  };

  return (
    <TooltipInternalContext.Provider value={childProps}>
      {children}
    </TooltipInternalContext.Provider>
  );
};

// Internal context for each tooltip instance
type TooltipInternalContextValue = {
  tooltipId: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerPosition: { x: number; y: number; width: number; height: number };
  setTriggerPosition: (pos: any) => void;
};

const TooltipInternalContext = createContext<TooltipInternalContextValue | undefined>(undefined);

const useTooltip = () => {
  const ctx = useContext(TooltipInternalContext);
  if (!ctx) throw new Error('TooltipTrigger/Content must be used within a Tooltip');
  return ctx;
};

// -----------------------------------------------------------------------------
// TooltipTrigger
// -----------------------------------------------------------------------------
interface TooltipTriggerProps {
  children: ReactNode;
  asChild?: boolean; // ignored
  delayDuration?: number; // override provider's delay
}

export const TooltipTrigger: React.FC<TooltipTriggerProps> = ({ children, delayDuration }) => {
  const { tooltipId, setOpen, setTriggerPosition } = useTooltip();
  const { delayDuration: globalDelay } = useTooltipRoot();
  const triggerRef = useRef<View>(null);
  const timeoutRef = useRef<number | undefined>(undefined);
  const finalDelay = delayDuration !== undefined ? delayDuration : globalDelay;

  const handleLongPress = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      triggerRef.current?.measure((fx, fy, width, height, px, py) => {
        setTriggerPosition({ x: px, y: py + height, width, height });
        setOpen(true);
      });
    }, finalDelay);
  };

  const handlePressOut = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(false);
  };

  return (
    <TouchableOpacity
      ref={triggerRef}
      onLongPress={handleLongPress}
      onPressOut={handlePressOut}
      activeOpacity={0.7}
    >
      {children}
    </TouchableOpacity>
  );
};

// -----------------------------------------------------------------------------
// TooltipContent
// -----------------------------------------------------------------------------
interface TooltipContentProps {
  children: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  sideOffset?: number;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const TooltipContent: React.FC<TooltipContentProps> = ({
  children,
  side = 'bottom',
  sideOffset = 4,
  style,
  textStyle,
}) => {
  const { open, setOpen, triggerPosition } = useTooltip();
  const [contentSize, setContentSize] = useState({ width: 0, height: 0 });
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

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

  const onLayout = (event: any) => {
    const { width, height } = event.nativeEvent.layout;
    setContentSize({ width, height });
  };

  // Position the tooltip
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  let left = triggerPosition.x;
  let top = triggerPosition.y;

  switch (side) {
    case 'bottom':
      left = triggerPosition.x + triggerPosition.width / 2 - contentSize.width / 2;
      top = triggerPosition.y + sideOffset;
      if (top + contentSize.height > screenHeight) {
        // if off screen, place above
        top = triggerPosition.y - contentSize.height - sideOffset;
      }
      break;
    case 'top':
      left = triggerPosition.x + triggerPosition.width / 2 - contentSize.width / 2;
      top = triggerPosition.y - contentSize.height - sideOffset;
      if (top < 0) {
        top = triggerPosition.y + sideOffset;
      }
      break;
    case 'left':
      left = triggerPosition.x - contentSize.width - sideOffset;
      top = triggerPosition.y + triggerPosition.height / 2 - contentSize.height / 2;
      if (left < 0) left = triggerPosition.x + sideOffset;
      break;
    case 'right':
      left = triggerPosition.x + triggerPosition.width + sideOffset;
      top = triggerPosition.y + triggerPosition.height / 2 - contentSize.height / 2;
      if (left + contentSize.width > screenWidth) {
        left = triggerPosition.x - contentSize.width - sideOffset;
      }
      break;
  }

  // Clamp to screen edges
  if (left < 8) left = 8;
  if (left + contentSize.width > screenWidth - 8) left = screenWidth - contentSize.width - 8;
  if (top < 8) top = 8;
  if (top + contentSize.height > screenHeight - 8) top = screenHeight - contentSize.height - 8;

  const handleClose = () => setOpen(false);

  if (!open) return null;

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
            transform: [{ scale: scaleAnim }],
          },
          style,
        ]}
        onLayout={onLayout}
      >
        <Text style={[styles.text, textStyle]}>{children}</Text>
        {/* Optional arrow – we can add if needed */}
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
    backgroundColor: '#11181C',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxWidth: 240,
    boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',
    elevation: 5,
  },
  text: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
});