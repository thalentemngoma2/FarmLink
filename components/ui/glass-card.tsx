import React, { forwardRef } from 'react';
import {
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

// Optional gradient – if not installed, fallback to a simple overlay
let LinearGradient: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  LinearGradient = require('expo-linear-gradient').LinearGradient;
} catch (e) {
  console.warn('expo-linear-gradient not installed. GlassCard will use solid overlay.');
}

interface GlassCardProps extends TouchableOpacityProps {
  /** Content to render inside the card */
  children: React.ReactNode;
  /** Custom container style */
  style?: StyleProp<ViewStyle>;
  /** Enable/disable press animation (spring scale) */
  animated?: boolean;
  /** Backward compatibility: if true, enables animation */
  hover?: boolean;
  /** Border radius of the card */
  borderRadius?: number;
  /** Gradient colors for the glass overlay (default: white to transparent) */
  gradientColors?: string[];
  /** Intensity of the glass effect (0-1) – controls opacity of the background */
  intensity?: number;
  /** Shadow/elevation level (0-10) */
  elevation?: number;
  /** Background color behind the glass effect (for fallback) */
  backgroundColor?: FileCallback;
}

/**
 * A modern glassmorphic card with optional press animation and gradient overlay.
 * 
 * @example
 * <GlassCard
 *   animated
 *   borderRadius={24}
 *   gradientColors={['rgba(255,255,255,0.8)', 'rgba(255,255,255,0.2)']}
 *   intensity={0.7}
 *   onPress={() => console.log('Pressed')}
 * >
 *   <Text>Glass content</Text>
 * </GlassCard>
 */
export const GlassCard = forwardRef<View, GlassCardProps>(
  (
    {
      children,
      style,
      animated = true,
      hover, // backward compatibility
      borderRadius = 24,
      gradientColors = ['rgba(255,255,255,0.6)', 'rgba(255,255,255,0.1)'],
      intensity = 0.6,
      elevation = 5,
      backgroundColor = 'rgba(255,255,255,0.2)',
      ...touchableProps
    },
    ref
  ) => {
    // Determine if animation is enabled
    const enableAnimation = animated ?? (hover !== undefined ? hover : true);

    const pressScale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: pressScale.value }],
    }));

    const handlePressIn = () => {
      if (enableAnimation) {
        pressScale.value = withSpring(0.97);
      }
    };

    const handlePressOut = () => {
      if (enableAnimation) {
        pressScale.value = withSpring(1);
      }
    };

    // Calculate background opacity based on intensity
    const bgOpacity = Math.min(Math.max(intensity, 0), 1);
    const dynamicBackground = `rgba(255,255,255,${bgOpacity * 0.8})`;

    // Gradient overlay component
    const renderGradient = () => {
      if (LinearGradient) {
        return (
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        );
      }
      // Fallback: solid overlay with opacity
      return (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: 'rgba(255,255,255,0.2)' },
          ]}
        />
      );
    };

    return (
      <TouchableOpacity
        ref={ref as any}
        activeOpacity={0.9}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        {...touchableProps}
      >
        <Animated.View
          style={[
            styles.glassContainer,
            {
              borderRadius,
              backgroundColor: dynamicBackground,
              shadowOpacity: elevation / 10,
              elevation,
            },
            animatedStyle,
            style,
          ]}
        >
          {/* Gradient overlay for shine */}
          {renderGradient()}

          {/* Content */}
          <View style={[styles.content, { borderRadius }]}>{children}</View>
        </Animated.View>
      </TouchableOpacity>
    );
  }
);

GlassCard.displayName = 'GlassCard';

const styles = StyleSheet.create({
  glassContainer: {
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  content: {
    position: 'relative',
    zIndex: 1,
    padding: 20,
  },
});