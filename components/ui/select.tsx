import { Ionicons } from '@expo/vector-icons';
import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ViewStyle,
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
type SelectContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  value?: string;
  onValueChange?: (value: string) => void;
  triggerPosition: { x: number; y: number; width: number; height: number };
  setTriggerPosition: (pos: any) => void;
};

const SelectContext = createContext<SelectContextValue | undefined>(undefined);

const useSelect = () => {
  const ctx = useContext(SelectContext);
  if (!ctx) throw new Error('Select components must be used within a <Select />');
  return ctx;
};

// -----------------------------------------------------------------------------
// Select Root
// -----------------------------------------------------------------------------
interface SelectProps {
  children: ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const Select: React.FC<SelectProps> = ({
  children,
  value: controlledValue,
  onValueChange,
  defaultValue,
  open: controlledOpen,
  onOpenChange,
}) => {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlledValue = controlledValue !== undefined;
  const isControlledOpen = controlledOpen !== undefined;
  const value = isControlledValue ? controlledValue : uncontrolledValue;
  const open = isControlledOpen ? controlledOpen : uncontrolledOpen;

  const setOpen = (newOpen: boolean) => {
    if (!isControlledOpen) setUncontrolledOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  const handleValueChange = (newValue: string) => {
    if (!isControlledValue) setUncontrolledValue(newValue);
    onValueChange?.(newValue);
  };

  const [triggerPosition, setTriggerPosition] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  const contextValue = {
    open,
    setOpen,
    value,
    onValueChange: handleValueChange,
    triggerPosition,
    setTriggerPosition,
  };

  return (
    <SelectContext.Provider value={contextValue}>
      {children}
    </SelectContext.Provider>
  );
};

// -----------------------------------------------------------------------------
// SelectTrigger
// -----------------------------------------------------------------------------
interface SelectTriggerProps {
  children?: ReactNode;
  size?: 'sm' | 'default';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const SelectTrigger: React.FC<SelectTriggerProps> = ({
  children,
  size = 'default',
  style,
  textStyle,
}) => {
  const { open, setOpen, setTriggerPosition } = useSelect();
  const triggerRef = useRef<View>(null);

  const handlePress = () => {
    triggerRef.current?.measure((fx, fy, width, height, px, py) => {
      setTriggerPosition({ x: px, y: py + height, width, height });
      setOpen(!open);
    });
  };

  const heightStyle = size === 'sm' ? { height: 32 } : { height: 36 };
  const paddingStyle = size === 'sm' ? { paddingHorizontal: 8 } : { paddingHorizontal: 12 };

  return (
    <TouchableOpacity
      ref={triggerRef}
      style={[styles.trigger, heightStyle, paddingStyle, style]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {children}
      <Ionicons name="chevron-down" size={16} color="#666" style={styles.chevron} />
    </TouchableOpacity>
  );
};

// -----------------------------------------------------------------------------
// SelectValue – displays the current value
// -----------------------------------------------------------------------------
interface SelectValueProps {
  placeholder?: string;
  style?: TextStyle;
}

export const SelectValue: React.FC<SelectValueProps> = ({ placeholder = 'Select...', style }) => {
  const { value } = useSelect();
  // We need access to options to map value to label. The options are children of SelectContent.
  // Since we can't easily get that here, we'll leave the value as raw string.
  // A better approach would be to use a context that stores the selected label, but for now we just show the value.
  return (
    <Text style={[styles.valueText, style]}>
      {value || placeholder}
    </Text>
  );
};

// -----------------------------------------------------------------------------
// SelectContent – the dropdown modal
// -----------------------------------------------------------------------------
interface SelectContentProps {
  children: ReactNode;
  position?: 'popper' | 'item-aligned';
  style?: ViewStyle;
}

export const SelectContent: React.FC<SelectContentProps> = ({ children, position = 'popper', style }) => {
  const { open, setOpen, triggerPosition } = useSelect();
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

  // Position below trigger (or above if not enough space)
  let left = triggerPosition.x;
  let top = triggerPosition.y + 4;
  let maxHeight = screenHeight - top - 8;

  if (position === 'popper') {
    // width should match trigger width
    const width = Math.max(triggerPosition.width, 200);
    left = triggerPosition.x;
    if (left + width > screenWidth) left = screenWidth - width - 8;
    if (left < 8) left = 8;
    // below
    if (top + contentSize.height > screenHeight) {
      top = triggerPosition.y - contentSize.height - 4;
      maxHeight = top - 8;
    }
  } else {
    // item-aligned – for now same as popper
  }

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
          { left, top, maxHeight, width: triggerPosition.width },
          animatedStyle,
          style,
        ]}
        onLayout={onLayout}
      >
        <FlatList
          data={React.Children.toArray(children).filter(React.isValidElement)}
          renderItem={({ item }) => item}
          keyExtractor={(_, idx) => idx.toString()}
          style={styles.list}
          showsVerticalScrollIndicator
        />
      </Animated.View>
    </Modal>
  );
};

// -----------------------------------------------------------------------------
// SelectItem
// -----------------------------------------------------------------------------
interface SelectItemProps {
  children: ReactNode;
  value: string;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const SelectItem: React.FC<SelectItemProps> = ({
  children,
  value,
  disabled = false,
  style,
  textStyle,
}) => {
  const { onValueChange, setOpen, value: selectedValue } = useSelect();
  const isSelected = selectedValue === value;

  const handlePress = () => {
    if (disabled) return;
    onValueChange?.(value);
    setOpen(false);
  };

  return (
    <TouchableOpacity
      style={[
        styles.item,
        isSelected && styles.itemSelected,
        disabled && styles.itemDisabled,
        style,
      ]}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={[styles.itemText, textStyle]}>{children}</Text>
      {isSelected && (
        <Ionicons name="checkmark" size={16} color="#22c55e" style={styles.checkIcon} />
      )}
    </TouchableOpacity>
  );
};

// -----------------------------------------------------------------------------
// SelectGroup – container for group of items (optional)
// -----------------------------------------------------------------------------
export const SelectGroup: React.FC<{ children: ReactNode; style?: ViewStyle }> = ({ children, style }) => (
  <View style={[styles.group, style]}>{children}</View>
);

// -----------------------------------------------------------------------------
// SelectLabel – header for a group
// -----------------------------------------------------------------------------
export const SelectLabel: React.FC<{ children: ReactNode; style?: TextStyle }> = ({ children, style }) => (
  <Text style={[styles.label, style]}>{children}</Text>
);

// -----------------------------------------------------------------------------
// SelectSeparator
// -----------------------------------------------------------------------------
export const SelectSeparator: React.FC<{ style?: ViewStyle }> = ({ style }) => (
  <View style={[styles.separator, style]} />
);

// -----------------------------------------------------------------------------
// Scroll buttons (stubs – not needed because FlatList scrolls natively)
// -----------------------------------------------------------------------------
export const SelectScrollUpButton: React.FC = () => null;
export const SelectScrollDownButton: React.FC = () => null;

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------
const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    backgroundColor: '#fff',
    minWidth: 120,
  },
  chevron: {
    marginLeft: 8,
  },
  valueText: {
    fontSize: 14,
    color: '#11181C',
  },
  content: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',
    elevation: 5,
    overflow: 'hidden',
  },
  list: {
    maxHeight: 250,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  itemSelected: {
    backgroundColor: '#f0fdf4',
  },
  itemDisabled: {
    opacity: 0.5,
  },
  itemText: {
    fontSize: 14,
    color: '#11181C',
  },
  checkIcon: {
    marginLeft: 8,
  },
  group: {
    // no extra styling
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
  },
  separator: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 4,
  },
});