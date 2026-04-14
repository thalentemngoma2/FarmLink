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

// Navigation items configuration
const navItems = [
  { icon: 'home-outline', label: 'Home', href: '/' },
  { icon: 'people-outline', label: 'Community', href: '/community' },
  { icon: 'add-circle', label: 'Ask', href: '/ask', isPrimary: true },
  { icon: 'book-outline', label: 'Learn', href: '/learn' },
  { icon: 'person-outline', label: 'Profile', href: '/profile' },
];

// Helper to check if a path matches (for nested routes, you might adjust)
const isActiveRoute = (currentPath: string, itemPath: string) => {
  // Simple equality – adjust for nested routes if needed
  return currentPath === itemPath;
};

export const BottomNav: React.FC = () => {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  // Animation values
  const navTranslateY = useSharedValue(100);
  const navOpacity = useSharedValue(0);

  // For each item, track opacity and y translation
  const itemOpacities = navItems.map(() => useSharedValue(0));
  const itemTranslatesY = navItems.map(() => useSharedValue(20));

  // For active indicator (non-primary items)
  const activeIndicatorScales = navItems.map(() => useSharedValue(0));
  const activeIndicatorOpacities = navItems.map(() => useSharedValue(0));

  // For press scaling (shared across items)
  const itemScales = navItems.map(() => useSharedValue(1));

  useEffect(() => {
    // Entry animation for nav container – removed bounce, now a smooth slide-up
    navTranslateY.value = withTiming(0, { duration: 300 });
    navOpacity.value = withTiming(1, { duration: 300 });

    // Staggered entry for each item
    navItems.forEach((_, idx) => {
      const delay = 300 + idx * 50;
      itemOpacities[idx].value = withDelay(delay, withTiming(1, { duration: 300 }));
      itemTranslatesY[idx].value = withDelay(delay, withTiming(0, { duration: 300 }));
    });
  }, []);

  // Update active indicator animations whenever pathname changes
  useEffect(() => {
    navItems.forEach((item, idx) => {
      if (item.isPrimary) return; // no indicator for primary button

      const isActive = isActiveRoute(pathname, item.href);
      if (isActive) {
        activeIndicatorScales[idx].value = withSpring(1);
        activeIndicatorOpacities[idx].value = withTiming(1, { duration: 200 });
      } else {
        activeIndicatorScales[idx].value = withSpring(0);
        activeIndicatorOpacities[idx].value = withTiming(0, { duration: 200 });
      }
    });
  }, [pathname]);

  const navAnimatedStyle = useAnimatedStyle(() => ({
    opacity: navOpacity.value,
    transform: [{ translateY: navTranslateY.value }],
  }));

  const handlePressIn = (idx: number) => {
    itemScales[idx].value = withSpring(0.95);
  };

  const handlePressOut = (idx: number) => {
    itemScales[idx].value = withSpring(1);
  };

  return (
    <Animated.View
      style={StyleSheet.flatten([
        styles.container,
        navAnimatedStyle,
        { paddingBottom: insets.bottom || 8 },
      ])}
    >
      <View style={styles.navBar}>
        {navItems.map((item, idx) => {
          const isActive = !item.isPrimary && isActiveRoute(pathname, item.href);
            const itemAnimatedStyle = useAnimatedStyle(() => {
              const translateY = itemTranslatesY[idx].value;
              const scale = itemScales[idx].value;
              if (Platform.OS === 'web') {
                return {
                  opacity: itemOpacities[idx].value,
                  transform: `translateY(${translateY}px) scale(${scale})`,
                  };
              }
              return {
                opacity: itemOpacities[idx].value,
                transform: [{ translateY }, { scale }],
              };
            });

          const indicatorAnimatedStyle = useAnimatedStyle(() => ({
            opacity: activeIndicatorOpacities[idx].value,
            transform: [{ scale: activeIndicatorScales[idx].value }],
          }));

          return (
            <Link key={item.label} href={item.href as any} asChild>
              <TouchableOpacity
                activeOpacity={0.7}
                onPressIn={() => handlePressIn(idx)}
                onPressOut={() => handlePressOut(idx)}
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
        })}
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
    backdropFilter: 'blur(20px)', // note: not directly supported, but adds style; actual blur can be achieved with expo-blur
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
  activeTab: {
    // no extra background, only text/icon color change
  },
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