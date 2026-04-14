//component/ui/navigation-menu.tsx

import { Ionicons } from '@expo/vector-icons';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  Platform,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// -----------------------------------------------------------------------------
// Types & Context
// -----------------------------------------------------------------------------
type NavigationMenuContextValue = {
  activeMenuId: string | null;
  setActiveMenuId: (id: string | null) => void;
  closeAll: () => void;
  viewport: boolean;
};

const NavigationMenuContext = createContext<NavigationMenuContextValue | undefined>(undefined);

const useNavigationMenu = () => {
  const ctx = useContext(NavigationMenuContext);
  if (!ctx) throw new Error('NavigationMenu components must be used within a <NavigationMenu />');
  return ctx;
};

// -----------------------------------------------------------------------------
// NavigationMenu Root
// -----------------------------------------------------------------------------
interface NavigationMenuProps {
  children: ReactNode;
  viewport?: boolean;    // if true, use a shared viewport (simplified)
  style?: any;
}

export const NavigationMenu: React.FC<NavigationMenuProps> = ({
  children,
  viewport = false,
  style,
}) => {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const closeAll = useCallback(() => setActiveMenuId(null), []);

  const value = { activeMenuId, setActiveMenuId, closeAll, viewport };

  return (
    <NavigationMenuContext.Provider value={value}>
      <View style={[styles.root, style]}>
        {children}
      </View>
    </NavigationMenuContext.Provider>
  );
};

// -----------------------------------------------------------------------------
// NavigationMenuList
// -----------------------------------------------------------------------------
interface NavigationMenuListProps {
  children: ReactNode;
  style?: any;
}

export const NavigationMenuList: React.FC<NavigationMenuListProps> = ({ children, style }) => {
  return <View style={[styles.list, style]}>{children}</View>;
};

// -----------------------------------------------------------------------------
// NavigationMenuItem
// -----------------------------------------------------------------------------
interface NavigationMenuItemProps {
  children: ReactNode;
  style?: any;
}

export const NavigationMenuItem: React.FC<NavigationMenuItemProps> = ({ children, style }) => {
  return <View style={[styles.item, style]}>{children}</View>;
};

// -----------------------------------------------------------------------------
// NavigationMenuTrigger
// -----------------------------------------------------------------------------
interface NavigationMenuTriggerProps {
  children: ReactNode;
  disabled?: boolean;
}

export const NavigationMenuTrigger: React.FC<NavigationMenuTriggerProps> = ({ children, disabled = false }) => {
  const { activeMenuId, setActiveMenuId, closeAll } = useNavigationMenu();
  const [menuId] = useState(() => `nav-menu-${Math.random()}`);
  const triggerRef = useRef<View>(null);
  const [position, setPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const isOpen = activeMenuId === menuId;

  const handlePress = () => {
    if (disabled) return;
    if (isOpen) {
      closeAll();
    } else {
      // measure trigger position relative to window
      triggerRef.current?.measureInWindow((x, y, width, height) => {
        setPosition({ x, y, width, height });
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
        <Text style={styles.triggerText}>{children}</Text>
        <Ionicons
          name="chevron-down"
          size={14}
          color="#666"
          style={[styles.chevron, isOpen && styles.chevronOpen]}
        />
      </TouchableOpacity>
      {isOpen && (
        <NavigationMenuContent
          position={position}
          menuId={menuId}
          onClose={() => setActiveMenuId(null)}
        />
      )}
    </>
  );
};

// -----------------------------------------------------------------------------
// NavigationMenuContent – modal dropdown (FIXED positioning)
// -----------------------------------------------------------------------------
interface NavigationMenuContentProps {
  position: { x: number; y: number; width: number; height: number };
  menuId: string;
  onClose: () => void;
  children?: ReactNode;
}

export const NavigationMenuContent: React.FC<NavigationMenuContentProps> = ({
  position,
  onClose,
  children,
}) => {
  const scaleAnim = useSharedValue(0.95);
  const opacityAnim = useSharedValue(0);
  const [contentSize, setContentSize] = useState({ width: 200, height: 0 });
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const insets = useSafeAreaInsets();

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
    setContentSize({ width, height });
  };

  // Calculate position with header avoidance
  // Header height is approximately 56px + safe area top inset
  const HEADER_HEIGHT = 56 + insets.top;
  const SIDE_OFFSET = 8;
  
  // Position below trigger by default
  let left = position.x;
  let top = position.y + position.height + 4;
  
  // Horizontal bounds checking
  if (left + contentSize.width > screenWidth - SIDE_OFFSET) {
    left = screenWidth - contentSize.width - SIDE_OFFSET;
  }
  if (left < SIDE_OFFSET) left = SIDE_OFFSET;
  
  // Vertical bounds checking - AVOID HEADER
  if (top < HEADER_HEIGHT) {
    // If calculated position is under header, move it below header
    top = HEADER_HEIGHT + 8;
  }
  
  // If content goes off bottom of screen, position above trigger
  if (top + contentSize.height > screenHeight - insets.bottom - SIDE_OFFSET) {
    top = position.y - contentSize.height - 4;
  }

  const handleOutsidePress = () => {
    onClose();
  };

  return (
    <Modal 
      transparent 
      visible 
      animationType="none" 
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <TouchableWithoutFeedback onPress={handleOutsidePress}>
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.contentContainer,
              { left, top },
              animatedStyle,
            ]}
            onLayout={onLayout}
          >
            <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// -----------------------------------------------------------------------------
// NavigationMenuLink
// -----------------------------------------------------------------------------
interface NavigationMenuLinkProps {
  children: ReactNode;
  onPress?: () => void;
  active?: boolean;
  disabled?: boolean;
  style?: any;
  textStyle?: any;
}

export const NavigationMenuLink: React.FC<NavigationMenuLinkProps> = ({
  children,
  onPress,
  active = false,
  disabled = false,
  style,
  textStyle,
}) => {
  const { closeAll } = useNavigationMenu();

  const handlePress = () => {
    if (disabled) return;
    onPress?.();
    closeAll();
  };

  return (
    <TouchableOpacity
      style={[styles.link, active && styles.linkActive, disabled && styles.linkDisabled, style]}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      {typeof children === 'string' ? (
        <Text style={[styles.linkText, active && styles.linkTextActive, textStyle]}>{children}</Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
};

// -----------------------------------------------------------------------------
// NavigationMenuIndicator – a small triangle (optional)
// -----------------------------------------------------------------------------
interface NavigationMenuIndicatorProps {
  style?: any;
}

export const NavigationMenuIndicator: React.FC<NavigationMenuIndicatorProps> = ({ style }) => {
  return <View style={[styles.indicator, style]} />;
};

// -----------------------------------------------------------------------------
// NavigationMenuViewport – if using shared viewport (simplified)
// -----------------------------------------------------------------------------
interface NavigationMenuViewportProps {
  style?: any;
  children?: ReactNode;
}

export const NavigationMenuViewport: React.FC<NavigationMenuViewportProps> = ({ style, children }) => {
  return <View style={[styles.viewport, style]}>{children}</View>;
};

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------
const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  item: {
    position: 'relative',
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  triggerActive: {
    backgroundColor: '#f3f4f6',
  },
  triggerText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#11181C',
    marginRight: 4,
  },
  chevron: {
    marginLeft: 2,
  },
  chevronOpen: {
    transform: [{ rotate: '180deg' }],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minWidth: 180,
    maxWidth: 260,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }
    }),
  },
  contentScroll: {
    maxHeight: 300,
  },
  link: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  linkActive: {
    backgroundColor: '#f3f4f6',
  },
  linkDisabled: {
    opacity: 0.5,
  },
  linkText: {
    fontSize: 14,
    color: '#11181C',
  },
  linkTextActive: {
    fontWeight: '500',
    color: '#22c55e',
  },
  indicator: {
    width: 10,
    height: 10,
    backgroundColor: '#fff',
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: '#e5e7eb',
    transform: [{ rotate: '45deg' }],
    position: 'absolute',
    bottom: -5,
    alignSelf: 'center',
  },
  viewport: {
    // placeholder for shared viewport
  },
});