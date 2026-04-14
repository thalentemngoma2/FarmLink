import { Ionicons } from '@expo/vector-icons';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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
// Types
// -----------------------------------------------------------------------------
type ContextMenuContextType = {
  activeMenuId: string | null;
  setActiveMenuId: (id: string | null) => void;
  closeAll: () => void;
};

const ContextMenuContext = createContext<ContextMenuContextType | null>(null);

const useRootContext = () => {
  const ctx = useContext(ContextMenuContext);
  if (!ctx) throw new Error('ContextMenu components must be used within a <ContextMenu />');
  return ctx;
};

// -----------------------------------------------------------------------------
// ContextMenu (Root)
// -----------------------------------------------------------------------------
interface ContextMenuProps {
  children: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ children, onOpenChange }) => {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const closeAll = useCallback(() => setActiveMenuId(null), []);

  const value = useMemo(() => ({ activeMenuId, setActiveMenuId, closeAll }), [activeMenuId, closeAll]);

  useEffect(() => {
    onOpenChange?.(activeMenuId !== null);
  }, [activeMenuId, onOpenChange]);

  return (
    <ContextMenuContext.Provider value={value}>
      {children}
    </ContextMenuContext.Provider>
  );
};

// -----------------------------------------------------------------------------
// ContextMenuTrigger – wraps the element that opens the menu
// -----------------------------------------------------------------------------
interface ContextMenuTriggerProps {
  children: React.ReactNode;
  id: string; // unique identifier for this menu
  onLongPress?: () => void;
}

export const ContextMenuTrigger: React.FC<ContextMenuTriggerProps> = ({ children, id, onLongPress }) => {
  const { setActiveMenuId, activeMenuId } = useRootContext();
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<View>(null);

  const handleLongPress = useCallback(() => {
    // Get the absolute position of the trigger
    triggerRef.current?.measure((fx, fy, width, height, px, py) => {
      setPosition({ x: px, y: py + height });
      setActiveMenuId(id);
      setIsOpen(true);
      onLongPress?.();
    });
  }, [id, onLongPress]);

  const handleClose = useCallback(() => {
    if (activeMenuId === id) {
      setActiveMenuId(null);
      setIsOpen(false);
    }
  }, [activeMenuId, id]);

  return (
    <>
      <TouchableOpacity
        ref={triggerRef}
        activeOpacity={1}
        onLongPress={handleLongPress}
        delayLongPress={500}
      >
        {children}
      </TouchableOpacity>
      {isOpen && (
        <ContextMenuContent
          position={position}
          onClose={handleClose}
          menuId={id}
        />
      )}
    </>
  );
};

// -----------------------------------------------------------------------------
// ContextMenuContent – the menu itself
// -----------------------------------------------------------------------------
interface ContextMenuContentProps {
  position: { x: number; y: number };
  onClose: () => void;
  menuId: string;
  children?: React.ReactNode;
}

export const ContextMenuContent: React.FC<ContextMenuContentProps> = ({ position, onClose, menuId, children }) => {
  const { activeMenuId, setActiveMenuId } = useRootContext();
  const fadeAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(0.9);

  useEffect(() => {
    fadeAnim.value = withTiming(1, { duration: 150 });
    scaleAnim.value = withSpring(1, { damping: 15 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ scale: scaleAnim.value }],
  }));

  const handleClose = useCallback(() => {
    onClose();
    setActiveMenuId(null);
  }, [onClose]);

  // Adjust position to stay within screen bounds
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const menuWidth = 200; // approximate
  const menuHeight = 150; // approximate, will be measured on layout
  const [menuDimensions, setMenuDimensions] = useState({ width: menuWidth, height: menuHeight });

  const finalX = Math.min(position.x, screenWidth - menuDimensions.width - 8);
  const finalY = Math.min(position.y, screenHeight - menuDimensions.height - 8);

  const onMenuLayout = (event: any) => {
    const { width, height } = event.nativeEvent.layout;
    setMenuDimensions({ width, height });
  };

  return (
    <Modal transparent visible onRequestClose={handleClose} animationType="none">
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={StyleSheet.absoluteFillObject}>
          <Animated.View
            style={[
              styles.menuContainer,
              {
                top: finalY,
                left: finalX,
                position: 'absolute',
              },
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
// ContextMenuItem – standard menu item
// -----------------------------------------------------------------------------
interface ContextMenuItemProps {
  children: React.ReactNode;
  onSelect?: () => void;
  disabled?: boolean;
  inset?: boolean;
  variant?: 'default' | 'destructive';
  shortcut?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export const ContextMenuItem: React.FC<ContextMenuItemProps> = ({
  children,
  onSelect,
  disabled = false,
  inset = false,
  variant = 'default',
  shortcut,
  icon,
}) => {
  const { closeAll } = useRootContext();
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
        {icon && (
          <Ionicons name={icon} size={18} color={textColor} style={styles.itemIcon} />
        )}
        <Text style={[styles.itemText, { color: textColor }]}>{children}</Text>
        {shortcut && <Text style={styles.shortcut}>{shortcut}</Text>}
      </View>
    </TouchableOpacity>
  );
};

// -----------------------------------------------------------------------------
// ContextMenuSub – submenu trigger (opens a new menu on hover/press)
// -----------------------------------------------------------------------------
interface ContextMenuSubProps {
  children: React.ReactNode;
  label: string;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}

export const ContextMenuSub: React.FC<ContextMenuSubProps> = ({ children, label, disabled = false, icon }) => {
  const [subOpen, setSubOpen] = useState(false);
  const [subPosition, setSubPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<View>(null);
  const { activeMenuId, setActiveMenuId } = useRootContext();

  const handlePress = useCallback(() => {
    if (disabled) return;
    triggerRef.current?.measure((fx, fy, width, height, px, py) => {
      setSubPosition({ x: px + width, y: py });
      setSubOpen(true);
      // Optional: close other submenus if needed
    });
  }, [disabled]);

  const handleCloseSub = useCallback(() => {
    setSubOpen(false);
  }, []);

  // Close submenu when root menu closes
  useEffect(() => {
    if (activeMenuId === null) {
      setSubOpen(false);
    }
  }, [activeMenuId]);

  return (
    <>
      <TouchableOpacity
        ref={triggerRef}
        style={styles.item}
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <View style={styles.itemContent}>
          {icon && <Ionicons name={icon} size={18} color="#11181C" style={styles.itemIcon} />}
          <Text style={styles.itemText}>{label}</Text>
          <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
        </View>
      </TouchableOpacity>
      {subOpen && (
        <ContextMenuSubContent position={subPosition} onClose={handleCloseSub}>
          {children}
        </ContextMenuSubContent>
      )}
    </>
  );
};

// -----------------------------------------------------------------------------
// ContextMenuSubContent – the actual submenu content
// -----------------------------------------------------------------------------
interface ContextMenuSubContentProps {
  position: { x: number; y: number };
  onClose: () => void;
  children: React.ReactNode;
}

export const ContextMenuSubContent: React.FC<ContextMenuSubContentProps> = ({ position, onClose, children }) => {
  const { setActiveMenuId } = useRootContext();
  const fadeAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(0.9);
  const [dimensions, setDimensions] = useState({ width: 200, height: 150 });
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  useEffect(() => {
    fadeAnim.value = withTiming(1, { duration: 150 });
    scaleAnim.value = withSpring(1, { damping: 15 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ scale: scaleAnim.value }],
  }));

  const onLayout = (event: any) => {
    const { width, height } = event.nativeEvent.layout;
    setDimensions({ width, height });
  };

  // Position: to the right of the trigger, but adjust if near edge
  let finalX = position.x;
  let finalY = position.y;
  if (finalX + dimensions.width > screenWidth) finalX = position.x - dimensions.width;
  if (finalY + dimensions.height > screenHeight) finalY = screenHeight - dimensions.height - 8;

  const handleOutside = useCallback(() => {
    onClose();
    setActiveMenuId(null);
  }, [onClose]);

  return (
    <Modal transparent visible onRequestClose={handleOutside}>
      <TouchableWithoutFeedback onPress={handleOutside}>
        <View style={StyleSheet.absoluteFillObject}>
          <Animated.View
            style={[
              styles.menuContainer,
              {
                top: finalY,
                left: finalX,
                position: 'absolute',
              },
              animatedStyle,
            ]}
            onLayout={onLayout}
          >
            <ScrollView style={styles.menuScroll} showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// -----------------------------------------------------------------------------
// ContextMenuSeparator
// -----------------------------------------------------------------------------
export const ContextMenuSeparator: React.FC = () => <View style={styles.separator} />;

// -----------------------------------------------------------------------------
// ContextMenuLabel
// -----------------------------------------------------------------------------
export const ContextMenuLabel: React.FC<{ children: React.ReactNode; inset?: boolean }> = ({
  children,
  inset = false,
}) => (
  <Text style={[styles.label, inset && styles.labelInset]}>{children}</Text>
);

// -----------------------------------------------------------------------------
// ContextMenuShortcut
// -----------------------------------------------------------------------------
export const ContextMenuShortcut: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text style={styles.shortcut}>{children}</Text>
);

// -----------------------------------------------------------------------------
// ContextMenuGroup – just a container for grouping items
// -----------------------------------------------------------------------------
export const ContextMenuGroup: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={styles.group}>{children}</View>
);

// -----------------------------------------------------------------------------
// ContextMenuPortal – no‑op, kept for API compatibility
// -----------------------------------------------------------------------------
export const ContextMenuPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;

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
    minWidth: 180,
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
    // optional container styling
  },
});

// -----------------------------------------------------------------------------
// Stubs for unimplemented features (checkbox, radio)
// -----------------------------------------------------------------------------
export const ContextMenuCheckboxItem: React.FC<{ checked?: boolean; children: React.ReactNode }> = ({ checked, children }) => (
  <ContextMenuItem icon={checked ? 'checkmark-outline' : undefined}>{children}</ContextMenuItem>
);
export const ContextMenuRadioItem: React.FC<{ value?: string; children: React.ReactNode }> = ({ children }) => (
  <ContextMenuItem icon="radio-button-on-outline">{children}</ContextMenuItem>
);
export const ContextMenuRadioGroup: React.FC<{ value?: string; children: React.ReactNode }> = ({ children }) => <View>{children}</View>;
export const ContextMenuSubTrigger: React.FC = () => null; // not used directly