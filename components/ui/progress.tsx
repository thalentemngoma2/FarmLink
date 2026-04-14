import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
interface ProgressProps {
  value?: number;          // current progress value (0‑max)
  max?: number;            // maximum value (default: 100)
  style?: ViewStyle;       // style for the outer track
  indicatorStyle?: ViewStyle; // style for the fill (e.g., custom colour)
  animated?: boolean;      // whether to animate width changes (default: true)
  duration?: number;       // animation duration in ms (default: 300)
}

// -----------------------------------------------------------------------------
// Progress Component
// -----------------------------------------------------------------------------
export const Progress: React.FC<ProgressProps> = ({
  value = 0,
  max = 100,
  style,
  indicatorStyle,
  animated = true,
  duration = 300,
}) => {
  // Shared value for the fill width (as percentage)
  const widthPercent = useSharedValue(0);

  useEffect(() => {
    const percent = Math.min(Math.max((value / max) * 100, 0), 100);
    if (animated) {
      widthPercent.value = withTiming(percent, {
        duration,
        easing: Easing.inOut(Easing.ease),
      });
    } else {
      widthPercent.value = percent;
    }
  }, [value, max, animated, duration]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${widthPercent.value}%`,
  }));

  return (
    <View style={[styles.track, style]}>
      <Animated.View style={[styles.fill, animatedStyle, indicatorStyle]} />
    </View>
  );
};

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------
const styles = StyleSheet.create({
  track: {
    height: 8,
    backgroundColor: '#e5e7eb',   // gray‑200
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: '#22c55e',   // primary green
    borderRadius: 4,
  },
});