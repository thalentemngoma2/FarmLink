import { Ionicons } from '@expo/vector-icons';
import { Link, usePathname } from 'expo-router';
import React, { useEffect } from 'react';
import {
  Platform, StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';

export interface NavItemType {
  icon: string;
  label: string;
  href: string;
  isPrimary?: boolean;
}

// Helper to check if a path matches (for nested routes, you might adjust)
const isActiveRoute = (currentPath: string, itemPath: string) => {
  return currentPath === itemPath;
};

// Individual tab item component to avoid hooks inside .map()
interface NavItemProps {
  item: NavItemType;
  idx: number;
  pathname: string;
  itemOpacity: ReturnType<typeof useSharedValue<number>>;
  itemTranslateY: ReturnType<typeof useSharedValue<number>>;
  itemScale: ReturnType<typeof useSharedValue<number>>;
  indicatorScale: ReturnType<typeof useSharedValue<number>>;
  indicatorOpacity: ReturnType<typeof useSharedValue<number>>;
}

const NavItem: React.FC<NavItemProps> = ({
  item,
  idx,
  pathname,
  itemOpacity,
  itemTranslateY,
  itemScale,
  indicatorScale,
  indicatorOpacity,
}) => {
  const isActive = !item.isPrimary && isActiveRoute(pathname, item.href);

  const itemAnimatedStyle = useAnimatedStyle(() => {
    const translateY = itemTranslateY.value;
    const scale = itemScale.value;
    if (Platform.OS === 'web') {
      return {
        opacity: itemOpacity.value,
        transform: `translateY(${translateY}px) scale(${scale})`,
      };
    }
    return {
      opacity: itemOpacity.value,
      transform: [{ translateY }, { scale }],
    };
  });

  const indicatorAnimatedStyle = useAnimatedStyle(() => ({
    opacity: indicatorOpacity.value,
    transform: [{ scale: indicatorScale.value }],
  }));

  const handlePressIn = () => {
    itemScale.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    itemScale.value = withSpring(1);
  };

  return (
    <Link key={item.label} href={item.href as any} asChild>
      <TouchableOpacity
        activeOpacity={0.7}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={StyleSheet.flatten([
          styles.tabButton,
          item.isPrimary && styles.primaryTab,
          isActive && !item.isPrimary && styles.activeTab,
        ])}
      >
        <Animated.View style={[styles.tabInner, itemAnimatedStyle]}>
          <Ionicons
            name={item.icon as any}
            size={item.isPrimary ? 26 : 20}
            color={
              item.isPrimary
                ? '#fff'
                : isActive
                ? '#22c55e'
                : '#9ca3af'
            }
          />
          <Text
            style={StyleSheet.flatten([
              styles.label,
              item.isPrimary && styles.primaryLabel,
              isActive && !item.isPrimary && styles.activeLabel,
            ])}
          >
            {item.label}
          </Text>
          {!item.isPrimary && (
            <Animated.View
              style={StyleSheet.flatten([
                styles.activeIndicator,
                indicatorAnimatedStyle,
                isActive && styles.activeIndicatorVisible,
              ])}
            />
          )}
        </Animated.View>
      </TouchableOpacity>
    </Link>
  );
};

export const BottomNav: React.FC = () => {
  const { user } = useAuth();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const navItems = React.useMemo(() => {
    let centerLabel = 'Support';
    let centerIcon = 'help-buoy-outline';

    if (user?.role === 'retailer') {
      centerLabel = 'Post';
      centerIcon = 'add-circle';
    } else if (user?.role === 'extension_officer') {
      centerLabel = 'Requests';
      centerIcon = 'documents-outline';
    }

    return [
      { icon: 'home-outline', label: 'Home', href: '/community' },
      { icon: 'cart-outline', label: 'Tenders', href: '/tenders' },
      { icon: centerIcon, label: centerLabel, href: '/tender/post', isPrimary: true },

      { icon: 'person-outline', label: 'Profile', href: '/profile' },
    ];
  }, [user?.role]);

  // Nav container animations
  const navTranslateY = useSharedValue(100);
  const navOpacity = useSharedValue(0);

  // Tab item 0
  const itemOpacity0 = useSharedValue(0);
  const itemTranslateY0 = useSharedValue(20);
  const itemScale0 = useSharedValue(1);
  const indicatorScale0 = useSharedValue(0);
  const indicatorOpacity0 = useSharedValue(0);

  // Tab item 1
  const itemOpacity1 = useSharedValue(0);
  const itemTranslateY1 = useSharedValue(20);
  const itemScale1 = useSharedValue(1);
  const indicatorScale1 = useSharedValue(0);
  const indicatorOpacity1 = useSharedValue(0);

  // Tab item 2 (primary, no indicator)
  const itemOpacity2 = useSharedValue(0);
  const itemTranslateY2 = useSharedValue(20);
  const itemScale2 = useSharedValue(1);
  const indicatorScale2 = useSharedValue(0);
  const indicatorOpacity2 = useSharedValue(0);

  // Tab item 3
  const itemOpacity3 = useSharedValue(0);
  const itemTranslateY3 = useSharedValue(20);
  const itemScale3 = useSharedValue(1);
  const indicatorScale3 = useSharedValue(0);
  const indicatorOpacity3 = useSharedValue(0);

  // Tab item 4
  const itemOpacity4 = useSharedValue(0);
  const itemTranslateY4 = useSharedValue(20);
  const itemScale4 = useSharedValue(1);
  const indicatorScale4 = useSharedValue(0);
  const indicatorOpacity4 = useSharedValue(0);

  const itemOpacities = [itemOpacity0, itemOpacity1, itemOpacity2, itemOpacity3, itemOpacity4];
  const itemTranslatesY = [itemTranslateY0, itemTranslateY1, itemTranslateY2, itemTranslateY3, itemTranslateY4];
  const itemScales = [itemScale0, itemScale1, itemScale2, itemScale3, itemScale4];
  const indicatorScales = [indicatorScale0, indicatorScale1, indicatorScale2, indicatorScale3, indicatorScale4];
  const indicatorOpacities = [indicatorOpacity0, indicatorOpacity1, indicatorOpacity2, indicatorOpacity3, indicatorOpacity4];

  useEffect(() => {
    navTranslateY.value = withTiming(0, { duration: 300 });
    navOpacity.value = withTiming(1, { duration: 300 });

    // eslint-disable-next-line react-hooks/exhaustive-deps
    navItems.forEach((_, idx) => {
      const delay = 300 + idx * 50;
      itemOpacities[idx].value = withDelay(delay, withTiming(1, { duration: 300 }));
      itemTranslatesY[idx].value = withDelay(delay, withTiming(0, { duration: 300 }));
    });
  }, [itemOpacities, itemTranslatesY, navOpacity, navTranslateY]);

  useEffect(() => {
    navItems.forEach((item, idx) => {
      if (item.isPrimary) return;
      const isActive = isActiveRoute(pathname, item.href);
      if (isActive) {
        indicatorScales[idx].value = withSpring(1);
        indicatorOpacities[idx].value = withTiming(1, { duration: 200 });
      } else {
        indicatorScales[idx].value = withSpring(0);
        indicatorOpacities[idx].value = withTiming(0, { duration: 200 });
      }
    });
  }, [indicatorOpacities, indicatorScales, pathname]);

  const navAnimatedStyle = useAnimatedStyle(() => ({
    opacity: navOpacity.value,
    transform: [{ translateY: navTranslateY.value }],
  }));

  return (
    <Animated.View
      style={StyleSheet.flatten([
        styles.container,
        navAnimatedStyle,
        { paddingBottom: insets.bottom || 8 },
      ])}
    >
      <View style={styles.navBar}>
        {navItems.map((item, idx) => (
          <NavItem
            key={item.label}
            item={item}
            idx={idx}
            pathname={pathname}
            itemOpacity={itemOpacities[idx]}
            itemTranslateY={itemTranslatesY[idx]}
            itemScale={itemScales[idx]}
            indicatorScale={indicatorScales[idx]}
            indicatorOpacity={indicatorOpacities[idx]}
          />
        ))}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 28,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',
    elevation: 8,
    backdropFilter: 'blur(20px)',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  primaryTab: {
    backgroundColor: '#22c55e',
    borderRadius: 32,
    paddingVertical: 8,
    paddingHorizontal: 16,
    boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',
    elevation: 3,
  },
  activeTab: {},
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    color: '#9ca3af',
    marginTop: 2,
  },
  primaryLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  activeLabel: {
    color: '#22c55e',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
    alignSelf: 'center',
  },
  activeIndicatorVisible: {
    opacity: 1,
    transform: 'rotate(45deg) scale(1.2)',
  },
});
