import { Ionicons } from '@expo/vector-icons';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';
import { Sheet, SheetContent } from './sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip'; // assume we have a tooltip component

// -----------------------------------------------------------------------------
// Types & Context
// -----------------------------------------------------------------------------
type SidebarState = 'expanded' | 'collapsed';

type SidebarContextValue = {
  state: SidebarState;
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
};

const SidebarContext = createContext<SidebarContextValue | undefined>(undefined);

export const useSidebar = () => {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used within a SidebarProvider');
  return ctx;
};

// -----------------------------------------------------------------------------
// SidebarProvider
// -----------------------------------------------------------------------------
interface SidebarProviderProps {
  children: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  style?: ViewStyle;
}

export const SidebarProvider: React.FC<SidebarProviderProps> = ({
  children,
  defaultOpen = true,
  open: controlledOpen,
  onOpenChange,
  style,
}) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  // Mobile detection – you can replace with your own hook
  const { width } = Dimensions.get('window');
  const isMobile = width < 768; // arbitrary breakpoint

  const [openMobile, setOpenMobile] = useState(false);

  const setOpen = useCallback(
    (newOpen: boolean) => {
      if (!isControlled) setUncontrolledOpen(newOpen);
      onOpenChange?.(newOpen);
    },
    [isControlled, onOpenChange]
  );

  const toggleSidebar = useCallback(() => {
    if (isMobile) {
      setOpenMobile(prev => !prev);
    } else {
      setOpen(!open);
    }
  }, [isMobile, open, setOpen, setOpenMobile]);

  const state: SidebarState = open ? 'expanded' : 'collapsed';

  const value: SidebarContextValue = {
    state,
    open,
    setOpen,
    openMobile,
    setOpenMobile,
    isMobile,
    toggleSidebar,
  };

  return (
    <SidebarContext.Provider value={value}>
      <View style={[styles.provider, style]}>
        {children}
      </View>
    </SidebarContext.Provider>
  );
};

// -----------------------------------------------------------------------------
// Sidebar (desktop)
// -----------------------------------------------------------------------------
interface SidebarProps {
  children: ReactNode;
  side?: 'left' | 'right';
  variant?: 'sidebar' | 'floating' | 'inset';
  collapsible?: 'offcanvas' | 'icon' | 'none';
  style?: ViewStyle;
}

export const Sidebar: React.FC<SidebarProps> = ({
  children,
  side = 'left',
  variant = 'sidebar',
  collapsible = 'offcanvas',
  style,
}) => {
  const { isMobile, state, open, setOpen, openMobile, setOpenMobile } = useSidebar();

  // For mobile: use sheet
  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent side={side} style={styles.mobileSheet}>
          {children}
        </SheetContent>
      </Sheet>
    );
  }

  // For desktop: if collapsible === 'none' – always visible
  if (collapsible === 'none') {
    return (
      <View style={[styles.sidebar, styles.sidebarExpanded, style]}>
        {children}
      </View>
    );
  }

  // For collapsible sidebar (icon or offcanvas)
  const isCollapsed = state === 'collapsed';
  const widthAnim = useSharedValue(isCollapsed ? 48 : 256); // icon width = 48, expanded = 256

  useEffect(() => {
    widthAnim.value = withSpring(isCollapsed ? 48 : 256, { damping: 20 });
  }, [isCollapsed]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: widthAnim.value,
  }));

  // For offcanvas, when collapsed we hide completely (width 0)
  if (collapsible === 'offcanvas' && isCollapsed) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.sidebar,
        variant === 'floating' && styles.floating,
        variant === 'inset' && styles.inset,
        side === 'left' ? { left: 0 } : { right: 0 },
        animatedStyle,
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
};

// -----------------------------------------------------------------------------
// SidebarTrigger
// -----------------------------------------------------------------------------
interface SidebarTriggerProps {
  children?: ReactNode;
  style?: ViewStyle;
}

export const SidebarTrigger: React.FC<SidebarTriggerProps> = ({ children, style }) => {
  const { toggleSidebar } = useSidebar();
  return (
    <TouchableOpacity onPress={toggleSidebar} style={[styles.trigger, style]}>
      {children || <Ionicons name="menu" size={24} color="#11181C" />}
    </TouchableOpacity>
  );
};

// -----------------------------------------------------------------------------
// SidebarRail – desktop handle to collapse/expand (optional)
// -----------------------------------------------------------------------------
export const SidebarRail: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  const { toggleSidebar } = useSidebar();
  // You could render a thin bar on hover or a draggable handle – we'll keep it simple
  return (
    <TouchableOpacity
      onPress={toggleSidebar}
      style={[styles.rail, style]}
      activeOpacity={0.6}
    />
  );
};

// -----------------------------------------------------------------------------
// SidebarInset – main content area
// -----------------------------------------------------------------------------
export const SidebarInset: React.FC<{ children: ReactNode; style?: ViewStyle }> = ({
  children,
  style,
}) => {
  const { isMobile, open, state } = useSidebar();
  const marginLeft = !isMobile && open ? 256 : 0; // match expanded width
  return (
    <View style={[styles.inset, { marginLeft }, style]}>
      {children}
    </View>
  );
};

// -----------------------------------------------------------------------------
// Sidebar Components (simple wrappers for structure)
// -----------------------------------------------------------------------------
export const SidebarHeader: React.FC<{ children: ReactNode; style?: ViewStyle }> = ({
  children,
  style,
}) => <View style={[styles.header, style]}>{children}</View>;

export const SidebarFooter: React.FC<{ children: ReactNode; style?: ViewStyle }> = ({
  children,
  style,
}) => <View style={[styles.footer, style]}>{children}</View>;

export const SidebarContent: React.FC<{ children: ReactNode; style?: ViewStyle }> = ({
  children,
  style,
}) => <ScrollView style={[styles.content, style]}>{children}</ScrollView>;

export const SidebarSeparator: React.FC<{ style?: ViewStyle }> = ({ style }) => (
  <View style={[styles.separator, style]} />
);

export const SidebarGroup: React.FC<{ children: ReactNode; style?: ViewStyle }> = ({
  children,
  style,
}) => <View style={[styles.group, style]}>{children}</View>;

export const SidebarGroupLabel: React.FC<{ children: ReactNode; style?: TextStyle }> = ({
  children,
  style,
}) => <Text style={[styles.groupLabel, style]}>{children}</Text>;

export const SidebarGroupContent: React.FC<{ children: ReactNode; style?: ViewStyle }> = ({
  children,
  style,
}) => <View style={[styles.groupContent, style]}>{children}</View>;

export const SidebarMenu: React.FC<{ children: ReactNode; style?: ViewStyle }> = ({
  children,
  style,
}) => <View style={[styles.menu, style]}>{children}</View>;

export const SidebarMenuItem: React.FC<{ children: ReactNode; style?: ViewStyle }> = ({
  children,
  style,
}) => <View style={[styles.menuItem, style]}>{children}</View>;

interface SidebarMenuButtonProps {
  children?: ReactNode;
  isActive?: boolean;
  tooltip?: string;
  onPress?: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: keyof typeof Ionicons.glyphMap;
}

export const SidebarMenuButton: React.FC<SidebarMenuButtonProps> = ({
  children,
  isActive = false,
  tooltip,
  onPress,
  style,
  textStyle,
  icon,
}) => {
  const { state, isMobile } = useSidebar();
  const button = (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.menuButton, isActive && styles.menuButtonActive, style]}
      activeOpacity={0.7}
    >
      {icon && <Ionicons name={icon} size={20} color={isActive ? '#22c55e' : '#666'} />}
      {state === 'expanded' && typeof children === 'string' && (
        <Text style={[styles.menuButtonText, isActive && styles.menuButtonTextActive, textStyle]}>
          {children}
        </Text>
      )}
    </TouchableOpacity>
  );

  if (tooltip && state === 'collapsed' && !isMobile) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent>
            <Text>{tooltip}</Text>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  return button;
};

export const SidebarMenuAction: React.FC<{ children?: ReactNode; onPress?: () => void }> = ({
  children,
  onPress,
}) => (
  <TouchableOpacity onPress={onPress} style={styles.menuAction}>
    {children || <Ionicons name="ellipsis-horizontal" size={16} color="#666" />}
  </TouchableOpacity>
);

export const SidebarMenuBadge: React.FC<{ children: ReactNode; style?: ViewStyle }> = ({
  children,
  style,
}) => <View style={[styles.badge, style]}><Text style={styles.badgeText}>{children}</Text></View>;

export const SidebarMenuSkeleton: React.FC<{ showIcon?: boolean; style?: ViewStyle }> = ({
  showIcon = false,
  style,
}) => (
  <View style={[styles.skeleton, style]}>
    {showIcon && <View style={styles.skeletonIcon} />}
    <View style={styles.skeletonText} />
  </View>
);

export const SidebarMenuSub: React.FC<{ children: ReactNode; style?: ViewStyle }> = ({
  children,
  style,
}) => <View style={[styles.subMenu, style]}>{children}</View>;

export const SidebarMenuSubItem: React.FC<{ children: ReactNode; style?: ViewStyle }> = ({
  children,
  style,
}) => <View style={[styles.subMenuItem, style]}>{children}</View>;

export const SidebarMenuSubButton: React.FC<SidebarMenuButtonProps & { size?: 'sm' | 'md' }> = ({
  children,
  isActive,
  onPress,
  style,
  textStyle,
  icon,
  size = 'md',
}) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.subMenuButton, size === 'sm' && styles.subMenuButtonSm, style]}
    activeOpacity={0.7}
  >
    {icon && <Ionicons name={icon} size={16} color={isActive ? '#22c55e' : '#666'} />}
    <Text style={[styles.subMenuButtonText, isActive && styles.subMenuButtonTextActive, textStyle]}>
      {children}
    </Text>
  </TouchableOpacity>
);

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------
const styles = StyleSheet.create({
  provider: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    zIndex: 10,
    overflow: 'hidden',
  },
  sidebarExpanded: {
    width: 256,
  },
  floating: {
    margin: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',
    elevation: 2,
  },
  inset: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  trigger: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rail: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#e5e7eb',
    right: -2,
    zIndex: 20,
  },
  mobileSheet: {
    width: '80%',
    maxWidth: 300,
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
  },
  content: {
    flex: 1,
  },
  separator: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 8,
  },
  group: {
    marginVertical: 4,
  },
  groupLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  groupContent: {
    // no extra styling
  },
  menu: {
    // no extra styling
  },
  menuItem: {
    marginVertical: 2,
  },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  menuButtonActive: {
    backgroundColor: '#f0fdf4',
  },
  menuButtonText: {
    fontSize: 14,
    marginLeft: 12,
    color: '#11181C',
  },
  menuButtonTextActive: {
    color: '#22c55e',
    fontWeight: '500',
  },
  menuAction: {
    position: 'absolute',
    right: 8,
    top: 8,
    padding: 4,
  },
  badge: {
    position: 'absolute',
    right: 8,
    top: 8,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  skeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  skeletonIcon: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#e5e7eb',
    marginRight: 12,
  },
  skeletonText: {
    flex: 1,
    height: 16,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
  },
  subMenu: {
    marginLeft: 24,
  },
  subMenuItem: {
    // no extra styling
  },
  subMenuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  subMenuButtonSm: {
    paddingVertical: 4,
  },
  subMenuButtonText: {
    fontSize: 13,
    marginLeft: 8,
    color: '#6b7280',
  },
  subMenuButtonTextActive: {
    color: '#22c55e',
    fontWeight: '500',
  },
});