//components/mobile-header.tsx

import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import React, { useEffect } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface MobileHeaderProps {
  title?: string;
  notificationCount?: number;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  title = 'FarmLink',
  notificationCount = 3,
}) => {
  const insets = useSafeAreaInsets();
  
  // Entry animation
  const headerTranslateY = useSharedValue(-20);
  const headerOpacity = useSharedValue(0);

  // Sparkle rotation animation
  const sparkleRotation = useSharedValue(0);

  useEffect(() => {
    // Entry animation
    headerTranslateY.value = withTiming(0, { duration: 500 });
    headerOpacity.value = withTiming(1, { duration: 500 });

    // Infinite rotation for the sparkle icon
    const rotationSequence = withSequence(
      withTiming(10, { duration: 200 }),
      withTiming(-10, { duration: 200 }),
      withTiming(0, { duration: 200 })
    );
    // Repeat with delay of 3 seconds between cycles
    sparkleRotation.value = withRepeat(
      withDelay(3000, rotationSequence),
      -1, // infinite
      false // not reverse, we have our own sequence
    );
  }, []);

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));

  const sparkleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${sparkleRotation.value}deg` }],
  }));

  return (
    <Animated.View 
      style={[
        styles.container, 
        headerAnimatedStyle,
        { 
          paddingTop: insets.top,
          height: 56 + insets.top, // Fixed height for consistency
        }
      ]}
    >
      <View style={styles.header}>
        {/* Left Menu Button */}
        <Link href={"/settings" as any} asChild>
          <TouchableOpacity
            style={styles.iconButton}
            activeOpacity={0.7}
          >
            <Ionicons name="menu" size={20} color="#11181C" />
          </TouchableOpacity>
        </Link>

        {/* Center Title with Sparkle */}
        <View style={styles.titleContainer}>
          <Animated.View style={sparkleAnimatedStyle}>
            <Ionicons name="sparkles" size={20} color="#22c55e" />
          </Animated.View>
          <Text style={styles.title}>{title}</Text>
        </View>

        {/* Right Notifications Button */}
        <Link href={"/notifications" as any} asChild>
          <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
            <View>
              <Ionicons name="notifications-outline" size={20} color="#11181C" />
              {notificationCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </Link>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: 16,
    // Remove paddingBottom from here, handle in header
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        // Use standard CSS for web
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      }
    }),
  },
  header: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
      }
    }),
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#11181C',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: '#fff',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
});