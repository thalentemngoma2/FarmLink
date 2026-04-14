import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { GlassCard } from './ui/glass-card';

export const AITypingIndicator: React.FC = () => {
  // Shared values for animations
  const rotation = useSharedValue(0);
  const dot1Opacity = useSharedValue(0.3);
  const dot2Opacity = useSharedValue(0.3);
  const dot3Opacity = useSharedValue(0.3);

  useEffect(() => {
    // Rotating sparkle (infinite)
    rotation.value = withRepeat(
      withTiming(360, { duration: 2000, easing: Easing.linear }),
      -1,
      false
    );

    // Dot animations with staggered start
    const startDotAnimation = (opacity: SharedValue<number>, delay: number) => {
      setTimeout(() => {
        opacity.value = withRepeat(
          withTiming(1, { duration: 600, easing: Easing.ease }),
          -1,
          true
        );
      }, delay);
    };

    startDotAnimation(dot1Opacity, 0);
    startDotAnimation(dot2Opacity, 200);
    startDotAnimation(dot3Opacity, 400);
  }, []);

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const dot1Style = useAnimatedStyle(() => ({ opacity: dot1Opacity.value }));
  const dot2Style = useAnimatedStyle(() => ({ opacity: dot2Opacity.value }));
  const dot3Style = useAnimatedStyle(() => ({ opacity: dot3Opacity.value }));

  return (
    <GlassCard hover={false} style={styles.card}>
      <View style={styles.container}>
        <Animated.View style={[styles.iconWrapper, rotateStyle]}>
          <Ionicons name="sparkles" size={16} color="#22c55e" />
        </Animated.View>

        <View style={styles.textContainer}>
          <Text style={styles.text}>AI is searching</Text>
          <View style={styles.dotsContainer}>
            <Animated.View style={[styles.dot, dot1Style]} />
            <Animated.View style={[styles.dot, dot2Style]} />
            <Animated.View style={[styles.dot, dot3Style]} />
          </View>
        </View>
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    alignSelf: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
    color: '#11181C',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
  },
});