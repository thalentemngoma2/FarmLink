import React from 'react';
import { Text, TextStyle, TouchableOpacity, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
type ToggleVariant = 'default' | 'outline';
type ToggleSize = 'default' | 'sm' | 'lg';

interface ToggleProps {
  pressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  disabled?: boolean;
  variant?: ToggleVariant;
  size?: ToggleSize;
  children?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

// -----------------------------------------------------------------------------
// Toggle Component
// -----------------------------------------------------------------------------
export const Toggle: React.FC<ToggleProps> = ({
  pressed = false,
  onPressedChange,
  disabled = false,
  variant = 'default',
  size = 'default',
  children,
  style,
  textStyle,
}) => {
  const scale = useSharedValue(1);

  const handlePress = () => {
    if (disabled) return;
    onPressedChange?.(!pressed);
  };

  const handlePressIn = () => {
    if (disabled) return;
    scale.value = withSpring(0.96);
  };

  const handlePressOut = () => {
    if (disabled) return;
    scale.value = withSpring(1);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Determine base styles
  const baseStyle: ViewStyle = {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  };

  // Variant styles
  let variantStyle: ViewStyle = {};
  if (variant === 'default') {
    variantStyle = {
      backgroundColor: pressed ? '#f1f5f9' : 'transparent',
    };
  } else if (variant === 'outline') {
    variantStyle = {
      borderWidth: 1,
      borderColor: pressed ? '#e2e8f0' : '#e2e8f0',
      backgroundColor: pressed ? '#f1f5f9' : 'transparent',
    };
  }

  // Size styles
  let sizeStyle: ViewStyle = {};
  if (size === 'default') {
    sizeStyle = { paddingHorizontal: 8, minWidth: 36, height: 36 };
  } else if (size === 'sm') {
    sizeStyle = { paddingHorizontal: 6, minWidth: 32, height: 32 };
  } else if (size === 'lg') {
    sizeStyle = { paddingHorizontal: 10, minWidth: 40, height: 40 };
  }

  // Text color based on pressed state and variant
  let textColor = pressed ? '#11181C' : '#687076';
  if (variant === 'outline') {
    textColor = pressed ? '#11181C' : '#687076';
  }

  const textStyles: TextStyle = {
    fontSize: 14,
    fontWeight: '500',
    color: textColor,
  };

  if (size === 'sm') textStyles.fontSize = 12;
  if (size === 'lg') textStyles.fontSize = 16;

  const containerStyle: ViewStyle[] = [baseStyle, variantStyle, sizeStyle, style || {}];
  if (disabled) containerStyle.push({ opacity: 0.5 });

  return (
    <TouchableOpacity
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={1}
      style={containerStyle}
    >
      <Animated.View style={animatedStyle}>
        {typeof children === 'string' ? (
          <Text style={[textStyles, textStyle]}>{children}</Text>
        ) : (
          children
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

// -----------------------------------------------------------------------------
// Variants object for external use (optional)
// -----------------------------------------------------------------------------
export const toggleVariants = {
  variants: {
    default: {},
    outline: {},
  },
  sizes: {
    default: {},
    sm: {},
    lg: {},
  },
};