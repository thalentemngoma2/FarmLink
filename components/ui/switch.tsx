import React, { useCallback } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  ViewStyle
} from 'react-native';
import Animated, {
  Extrapolate,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';

interface SwitchProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  style?: ViewStyle;
  trackStyle?: ViewStyle;
  thumbStyle?: ViewStyle;
  activeTrackColor?: string;
  inactiveTrackColor?: string;
  activeThumbColor?: string;
  inactiveThumbColor?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked = false,
  onCheckedChange,
  disabled = false,
  style,
  trackStyle,
  thumbStyle,
  activeTrackColor = '#22c55e',   // primary green
  inactiveTrackColor = '#e5e7eb', // gray‑200
  activeThumbColor = '#ffffff',
  inactiveThumbColor = '#ffffff',
}) => {
  const translateX = useSharedValue(checked ? 1 : 0);

  const handlePress = useCallback(() => {
    if (disabled) return;
    const newValue = !checked;
    translateX.value = withSpring(newValue ? 1 : 0, { damping: 15 });
    onCheckedChange?.(newValue);
  }, [checked, disabled, onCheckedChange]);

  // Update animation if checked changes externally
  React.useEffect(() => {
    translateX.value = withSpring(checked ? 1 : 0, { damping: 15 });
  }, [checked]);

  const trackAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      translateX.value,
      [0, 1],
      [inactiveTrackColor, activeTrackColor],
      'RGB'
    ),
  }));

  const thumbAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          translateX.value,
          [0, 1],
          [0, 18], // thumb width 20, track width 44 -> move ~18px (20-2)
          Extrapolate.CLAMP
        ),
      },
    ],
  }));

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      disabled={disabled}
      style={[styles.container, style]}
    >
      <Animated.View
        style={[
          styles.track,
          trackAnimatedStyle,
          trackStyle,
          disabled && styles.disabled,
        ]}
      >
        <Animated.View
          style={[
            styles.thumb,
            thumbAnimatedStyle,
            { backgroundColor: checked ? activeThumbColor : inactiveThumbColor },
            thumbStyle,
            disabled && styles.disabledThumb,
          ]}
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    backgroundColor: '#e5e7eb',
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',
    elevation: 2,
  },
  disabled: {
    opacity: 0.5,
  },
  disabledThumb: {
    opacity: 0.5,
  },
});