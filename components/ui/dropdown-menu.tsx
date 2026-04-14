import { Ionicons } from '@expo/vector-icons';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  ScrollView,
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
type DropdownMenuContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  closeAll: () => void;
};

const DropdownMenuContext = createContext<DropdownMenuContextValue | undefined>(undefined);

const useDropdown = () => {
  const ctx = useContext(DropdownMenuContext);
  if (!ctx) throw new Error('DropdownMenu components must be used within a <DropdownMenu />');
  return ctx;
};

// -----------------------------------------------------------------------------
// DropdownMenu Root
// -----------------------------------------------------------------------------
interface DropdownMenuProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
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

  const closeAll = useCallback(() => setOpen(false), [setOpen]);

  const value = { open, setOpen, closeAll };

  return (
    <DropdownMenuContext.Provider value={value}>
      {children}
    </DropdownMenuContext.Provider>
  );
};

// -----------------------------------------------------------------------------
// DropdownMenuTrigger
// -----------------------------------------------------------------------------
interface DropdownMenuTriggerProps {
  children: React.ReactNode;
  asChild?: boolean; // ignored
}

export const DropdownMenuTrigger: React.FC<DropdownMenuTriggerProps> = ({ children }) => {
  const { setOpen, open } = useDropdown();
  const triggerRef = useRef<View>(null);
  const [position, setPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const handlePress = useCallback(() => {
    triggerRef.current?.measure((fx, fy, width, height, px, py) => {
      setPosition({ x: px, y: py + height, width, height });
      setOpen(!open);
    });
  }, [open, setOpen]);

  return (
    <>
      <TouchableOpacity ref={triggerRef} onPress={handlePress} activeOpacity={0.7}>
        {children}
      </TouchableOpacity>
      <DropdownMenuContent
        position={position}
        onClose={() => setOpen(false)}
      />
    </>
  );
};

// -----------------------------------------------------------------------------
// DropdownMenuContent – the menu panel
// -----------------------------------------------------------------------------
interface DropdownMenuContentProps {
  position: { x: number; y: number; width: number; height: number };
  onClose: () => void;
  children?: React.ReactNode;
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
}

export const DropdownMenuContent: React.FC<DropdownMenuContentProps> = ({
  position,
  onClose,
  children,
  align = 'start',
  sideOffset = 4,
}) => {
  const { open } = useDropdown();
  const scaleAnim = useSharedValue(0.95);
  const opacityAnim = useSharedValue(0);
  const [menuDimensions, setMenuDimensions] = useState({ width: 200, height: 0 });
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

  const onMenuLayout = (event: any) => {
    const { width, height } = event.nativeEvent.layout;
    setMenuDimensions({ width, height });
  };

  // Calculate x position based on align
  let menuX = position.x;
  if (align === 'center') {
    menuX = position.x + (position.width / 2) - (menuDimensions.width / 2);
  } else if (align === 'end') {
    menuX = position.x + position.width - menuDimensions.width;
  }

  // Adjust if near screen edge
  if (menuX + menuDimensions.width > screenWidth) {
    menuX = screenWidth - menuDimensions.width - 8;
  }
  if (menuX < 8) menuX = 8;

  let menuY = position.y + sideOffset;
  if (menuY + menuDimensions.height > screenHeight) {
    menuY = position.y - menuDimensions.height - sideOffset;
  }

  if (!open) return null;

  return (
    <Modal transparent visible={open} animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={StyleSheet.absoluteFillObject}>
          <Animated.View
            style={[
              styles.menuContainer,
              { top: menuY, left: menuX, position: 'absolute' },
              animatedStyle,
            ]}
            onLayout={onMenuLayout}
          >
            <ScrollView
              style={styles.menuScroll}
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// -----------------------------------------------------------------------------
// DropdownMenuItem
// -----------------------------------------------------------------------------
interface DropdownMenuItemProps {
  children: React.ReactNode;
  onSelect?: () => void;
  disabled?: boolean;
  inset?: boolean;
  variant?: 'default' | 'destructive';
  shortcut?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export const DropdownMenuItem: React.FC<DropdownMenuItemProps> = ({
  children,
  onSelect,
  disabled = false,
  inset = false,
  variant = 'default',
  shortcut,
  icon,
}) => {
  const { closeAll } = useDropdown();
  const handlePress = useCallback(() => {
    if (disabled) return;
    onSelect?.();
    closeAll();
  }, [disabled, onSelect, closeAll]);

  const textColor = variant === 'destructive' ? '#dc2626' : '#11181C';

  return (
    <TouchableOpacity
      style={[styles.item, inset && styles.itemInset, disabled && styles.itemDisabled]}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View style={styles.itemContent}>
        {icon && <Ionicons name={icon} size={18} color={textColor} style={styles.itemIcon} />}
        <Text style={[styles.itemText, { color: textColor }]}>{children}</Text>
        {shortcut && <Text style={styles.shortcut}>{shortcut}</Text>}
      </View>
    </TouchableOpacity>
  );
};

// -----------------------------------------------------------------------------
// DropdownMenuSeparator
// -----------------------------------------------------------------------------
export const DropdownMenuSeparator: React.FC = () => <View style={styles.separator} />;

// -----------------------------------------------------------------------------
// DropdownMenuLabel
// -----------------------------------------------------------------------------
export const DropdownMenuLabel: React.FC<{ children: React.ReactNode; inset?: boolean }> = ({
  children,
  inset = false,
}) => (
  <Text style={[styles.label, inset && styles.labelInset]}>{children}</Text>
);

// -----------------------------------------------------------------------------
// DropdownMenuShortcut
// -----------------------------------------------------------------------------
export const DropdownMenuShortcut: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text style={styles.shortcut}>{children}</Text>
);

// -----------------------------------------------------------------------------
// DropdownMenuGroup – container for grouping items
// -----------------------------------------------------------------------------
export const DropdownMenuGroup: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={styles.group}>{children}</View>
);

// -----------------------------------------------------------------------------
// DropdownMenuCheckboxItem – simplified version
// -----------------------------------------------------------------------------
interface DropdownMenuCheckboxItemProps {
  children: React.ReactNode;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
}

export const DropdownMenuCheckboxItem: React.FC<DropdownMenuCheckboxItemProps> = ({
  children,
  checked = false,
  onCheckedChange,
  disabled = false,
}) => {
  const { closeAll } = useDropdown();
  const handlePress = useCallback(() => {
    if (disabled) return;
    onCheckedChange?.(!checked);
    closeAll();
  }, [checked, disabled, onCheckedChange, closeAll]);

  return (
    <TouchableOpacity
      style={[styles.item, disabled && styles.itemDisabled]}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View style={styles.itemContent}>
        <Ionicons
          name={checked ? 'checkmark-circle' : 'ellipse-outline'}
          size={18}
          color="#22c55e"
          style={styles.itemIcon}
        />
        <Text style={styles.itemText}>{children}</Text>
      </View>
    </TouchableOpacity>
  );
};

// -----------------------------------------------------------------------------
// DropdownMenuRadioGroup & RadioItem – simplified
// -----------------------------------------------------------------------------
interface DropdownMenuRadioGroupProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

export const DropdownMenuRadioGroup: React.FC<DropdownMenuRadioGroupProps> = ({
  value,
  onValueChange,
  children,
}) => {
  return (
    <DropdownMenuGroup>
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(child as React.ReactElement<any>, { groupValue: value, onGroupChange: onValueChange })
          : child
      )}
    </DropdownMenuGroup>
  );
};

interface DropdownMenuRadioItemProps {
  value: string;
  children: React.ReactNode;
  disabled?: boolean;
  groupValue?: string;
  onGroupChange?: (value: string) => void;
}

export const DropdownMenuRadioItem: React.FC<DropdownMenuRadioItemProps> = ({
  value,
  children,
  disabled = false,
  groupValue,
  onGroupChange,
}) => {
  const { closeAll } = useDropdown();
  const checked = groupValue === value;

  const handlePress = useCallback(() => {
    if (disabled) return;
    onGroupChange?.(value);
    closeAll();
  }, [disabled, value, onGroupChange, closeAll]);

  return (
    <TouchableOpacity
      style={[styles.item, disabled && styles.itemDisabled]}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View style={styles.itemContent}>
        <Ionicons
          name={checked ? 'radio-button-on' : 'radio-button-off'}
          size={18}
          color="#22c55e"
          style={styles.itemIcon}
        />
        <Text style={styles.itemText}>{children}</Text>
      </View>
    </TouchableOpacity>
  );
};

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------
const styles = StyleSheet.create({
  menuContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',
    elevation: 5,
    minWidth: 160,
    maxWidth: 260,
    overflow: 'hidden',
  },
  menuScroll: {
    maxHeight: 300,
  },
  item: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  itemInset: {
    paddingLeft: 24,
  },
  itemDisabled: {
    opacity: 0.5,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemIcon: {
    marginRight: 8,
  },
  itemText: {
    flex: 1,
    fontSize: 14,
    color: '#11181C',
  },
  shortcut: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 16,
  },
  separator: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  labelInset: {
    paddingLeft: 24,
  },
  group: {
    // optional
  },
});