import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

// -----------------------------------------------------------------------------
// Types & Context
// -----------------------------------------------------------------------------
type MenubarContextValue = {
  activeMenuId: string | null;
  setActiveMenuId: (id: string | null) => void;
  closeAll: () => void;
};

const MenubarContext = createContext<MenubarContextValue | undefined>(undefined);

const useMenubar = () => {
  const ctx = useContext(MenubarContext);
  if (!ctx) throw new Error('Menubar components must be used within a <Menubar />');
  return ctx;
};

// -----------------------------------------------------------------------------
// Menubar Root
// -----------------------------------------------------------------------------
interface MenubarProps {
  children: ReactNode;
  style?: any;
}

export const Menubar: React.FC<MenubarProps> = ({ children, style }) => {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const closeAll = useCallback(() => setActiveMenuId(null), []);

  // Close menu automatically when navigation occurs (route change)
  const navigation = useNavigation();
  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      closeAll();
    });
    return unsubscribe;
  }, [navigation, closeAll]);

  const value = { activeMenuId, setActiveMenuId, closeAll };

  return (
    <MenubarContext.Provider value={value}>
      <View style={StyleSheet.flatten([styles.menubar, style])}>{children}</View>
    </MenubarContext.Provider>
  );
};

// -----------------------------------------------------------------------------
// MenubarMenu – wraps a trigger + its content
// -----------------------------------------------------------------------------
interface MenubarMenuProps {
  children: ReactNode;
}

export const MenubarMenu: React.FC<MenubarMenuProps> = ({ children }) => {
  return <>{children}</>;
};

// -----------------------------------------------------------------------------
// MenubarTrigger
// -----------------------------------------------------------------------------
interface MenubarTriggerProps {
  children: ReactNode;
  disabled?: boolean;
  onPress?: () => void;
}

export const MenubarTrigger: React.FC<MenubarTriggerProps> = ({
  children,
  disabled = false,
  onPress,
}) => {
  const { activeMenuId, setActiveMenuId, closeAll } = useMenubar();
  const [menuId] = useState(() => `menu-${Math.random()}`);
  const triggerRef = useRef<View>(null);
  const [position, setPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const isOpen = activeMenuId === menuId;

  const handlePress = () => {
    if (disabled) return;
    onPress?.();
    if (isOpen) {
      closeAll();
    } else {
      triggerRef.current?.measure((fx, fy, width, height, px, py) => {
        setPosition({ x: px, y: py + height, width, height });
        setActiveMenuId(menuId);
      });
    }
  };

  return (
    <>
      <TouchableOpacity
        ref={triggerRef}
        style={[styles.trigger, isOpen && styles.triggerActive]}
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
      {isOpen && (
        <MenubarContent
          position={position}
          menuId={menuId}
          onClose={() => setActiveMenuId(null)}
        />
      )}
    </>
  );
};

// -----------------------------------------------------------------------------
// MenubarContent – the dropdown menu (modal)
// -----------------------------------------------------------------------------
interface MenubarContentProps {
  position: { x: number; y: number; width: number; height: number };
  menuId: string;
  onClose: () => void;
  children?: ReactNode;
}

export const MenubarContent: React.FC<MenubarContentProps> = ({
  position,
  onClose,
  children,
}) => {
  const scaleAnim = useSharedValue(0.95);
  const opacityAnim = useSharedValue(0);
  const [menuDimensions, setMenuDimensions] = useState({ width: 200, height: 0 });
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  useEffect(() => {
    scaleAnim.value = withSpring(1, { damping: 12 });
    opacityAnim.value = withTiming(1, { duration: 150 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
    opacity: opacityAnim.value,
  }));

  const onLayout = (event: any) => {
    const { width, height } = event.nativeEvent.layout;
    setMenuDimensions({ width, height });
  };

  // Position the menu below the trigger, but adjust if off‑screen
  let left = position.x;
  if (left + menuDimensions.width > screenWidth) {
    left = screenWidth - menuDimensions.width - 8;
  }
  if (left < 8) left = 8;

  let top = position.y + 4;
  if (top + menuDimensions.height > screenHeight) {
    top = position.y - menuDimensions.height - 4;
  }

  const handleOutsidePress = () => {
    onClose();
  };

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={handleOutsidePress}>
        <View style={StyleSheet.absoluteFillObject}>
          <Animated.View
            style={[
              styles.menuContainer,
              { left, top, position: 'absolute' },
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
// MenubarItem
// -----------------------------------------------------------------------------
interface MenubarItemProps {
  children: ReactNode;
  onSelect?: () => void;
  disabled?: boolean;
  inset?: boolean;
  variant?: 'default' | 'destructive';
  shortcut?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export const MenubarItem: React.FC<MenubarItemProps> = ({
  children,
  onSelect,
  disabled = false,
  inset = false,
  variant = 'default',
  shortcut,
  icon,
}) => {
  const { closeAll } = useMenubar();
  const handlePress = () => {
    if (disabled) return;
    onSelect?.();
    closeAll();
  };

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
        <Text style={StyleSheet.flatten([styles.itemText, { color: textColor }])}>{children}</Text>
        {shortcut && <Text style={styles.shortcut}>{shortcut}</Text>}
      </View>
    </TouchableOpacity>
  );
};

// -----------------------------------------------------------------------------
// MenubarSeparator
// -----------------------------------------------------------------------------
export const MenubarSeparator: React.FC = () => <View style={styles.separator} />;

// -----------------------------------------------------------------------------
// MenubarLabel
// -----------------------------------------------------------------------------
export const MenubarLabel: React.FC<{ children: ReactNode; inset?: boolean }> = ({
  children,
  inset = false,
}) => (
  <Text style={StyleSheet.flatten([styles.label, inset && styles.labelInset])}>{children}</Text>
);

// -----------------------------------------------------------------------------
// MenubarShortcut
// -----------------------------------------------------------------------------
export const MenubarShortcut: React.FC<{ children: ReactNode }> = ({ children }) => (
  <Text style={styles.shortcut}>{children}</Text>
);

// -----------------------------------------------------------------------------
// MenubarCheckboxItem
// -----------------------------------------------------------------------------
interface MenubarCheckboxItemProps {
  children: ReactNode;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
}

export const MenubarCheckboxItem: React.FC<MenubarCheckboxItemProps> = ({
  children,
  checked = false,
  onCheckedChange,
  disabled = false,
}) => {
  const { closeAll } = useMenubar();
  const handlePress = () => {
    if (disabled) return;
    onCheckedChange?.(!checked);
    closeAll();
  };

  return (
    <TouchableOpacity
      style={StyleSheet.flatten([styles.item, disabled && styles.itemDisabled])}
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
// MenubarRadioGroup & RadioItem
// -----------------------------------------------------------------------------
interface MenubarRadioGroupProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
}

export const MenubarRadioGroup: React.FC<MenubarRadioGroupProps> = ({
  value,
  onValueChange,
  children,
}) => {
  return (
    <View>
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(child as React.ReactElement<any>, {
              groupValue: value,
              onGroupChange: onValueChange,
            })
          : child
      )}
    </View>
  );
};

interface MenubarRadioItemProps {
  value: string;
  children: ReactNode;
  disabled?: boolean;
  groupValue?: string;
  onGroupChange?: (value: string) => void;
}

export const MenubarRadioItem: React.FC<MenubarRadioItemProps> = ({
  value,
  children,
  disabled = false,
  groupValue,
  onGroupChange,
}) => {
  const { closeAll } = useMenubar();
  const checked = groupValue === value;

  const handlePress = () => {
    if (disabled) return;
    onGroupChange?.(value);
    closeAll();
  };

  return (
    <TouchableOpacity
      style={StyleSheet.flatten([styles.item, disabled && styles.itemDisabled])}
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
// MenubarSub & Submenu components
// -----------------------------------------------------------------------------
interface MenubarSubProps {
  children: ReactNode;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export const MenubarSub: React.FC<MenubarSubProps> = ({ children, label, icon }) => {
  const [subOpen, setSubOpen] = useState(false);
  const [subPosition, setSubPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<View>(null);
  const { activeMenuId, setActiveMenuId } = useMenubar();

  const handlePress = () => {
    triggerRef.current?.measure((fx, fy, width, height, px, py) => {
      setSubPosition({ x: px + width, y: py });
      setSubOpen(true);
    });
  };

  const handleCloseSub = () => setSubOpen(false);

  // Close submenu when root menu closes
  useEffect(() => {
    if (activeMenuId === null) setSubOpen(false);
  }, [activeMenuId]);

  return (
    <>
      <TouchableOpacity ref={triggerRef} style={styles.item} onPress={handlePress}>
        <View style={styles.itemContent}>
          {icon && <Ionicons name={icon} size={18} color="#11181C" style={styles.itemIcon} />}
          <Text style={styles.itemText}>{label}</Text>
          <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
        </View>
      </TouchableOpacity>
      {subOpen && (
        <MenubarSubContent position={subPosition} onClose={handleCloseSub}>
          {children}
        </MenubarSubContent>
      )}
    </>
  );
};

interface MenubarSubContentProps {
  position: { x: number; y: number };
  onClose: () => void;
  children: ReactNode;
}

export const MenubarSubContent: React.FC<MenubarSubContentProps> = ({
  position,
  onClose,
  children,
}) => {
  const scaleAnim = useSharedValue(0.95);
  const opacityAnim = useSharedValue(0);
  const [dimensions, setDimensions] = useState({ width: 200, height: 0 });
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  useEffect(() => {
    scaleAnim.value = withSpring(1, { damping: 12 });
    opacityAnim.value = withTiming(1, { duration: 150 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
    opacity: opacityAnim.value,
  }));

  const onLayout = (event: any) => {
    const { width, height } = event.nativeEvent.layout;
    setDimensions({ width, height });
  };

  let left = position.x;
  if (left + dimensions.width > screenWidth) left = screenWidth - dimensions.width - 8;
  if (left < 8) left = 8;

  let top = position.y;
  if (top + dimensions.height > screenHeight) top = screenHeight - dimensions.height - 8;
  if (top < 8) top = 8;

  const handleOutside = () => onClose();

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={handleOutside}>
        <View style={StyleSheet.absoluteFillObject}>
          <Animated.View
            style={[styles.menuContainer, { left, top, position: 'absolute' }, animatedStyle]}
            onLayout={onLayout}
          >
            <ScrollView style={styles.menuScroll}>{children}</ScrollView>
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// -----------------------------------------------------------------------------
// Stubs for MenubarPortal, MenubarGroup, MenubarSubTrigger
// -----------------------------------------------------------------------------
export const MenubarPortal: React.FC<{ children: ReactNode }> = ({ children }) => <>{children}</>;
export const MenubarGroup: React.FC<{ children: ReactNode }> = ({ children }) => <>{children}</>;
export const MenubarSubTrigger: React.FC = () => null;

// -----------------------------------------------------------------------------
// Styles – replaced boxShadow with RN shadow props
// -----------------------------------------------------------------------------
const styles = StyleSheet.create({
  menubar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
    alignItems: 'center',
    // React Native shadow (replaces boxShadow)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  trigger: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginHorizontal: 2,
  },
  triggerActive: {
    backgroundColor: '#f3f4f6',
  },
  menuContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    // React Native shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
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
});