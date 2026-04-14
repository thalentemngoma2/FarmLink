import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
type Orientation = 'horizontal' | 'vertical';

interface SeparatorProps {
  orientation?: Orientation;
  decorative?: boolean;
  style?: ViewStyle;
  className?: string; // ignored, use style
}

// -----------------------------------------------------------------------------
// Separator Component
// -----------------------------------------------------------------------------
export const Separator: React.FC<SeparatorProps> = ({
  orientation = 'horizontal',
  decorative = true,
  style,
}) => {
  const isHorizontal = orientation === 'horizontal';

  const separatorStyle = [
    styles.base,
    isHorizontal ? styles.horizontal : styles.vertical,
    style,
  ];

  return (
    <View
      style={separatorStyle}
      accessibilityRole={decorative ? 'none' : undefined}
      accessible={!decorative}
    />
  );
};

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------
const styles = StyleSheet.create({
  base: {
    backgroundColor: '#e5e7eb', // bg-border
  },
  horizontal: {
    height: 1,
    width: '100%',
  },
  vertical: {
    width: 1,
    height: '100%',
  },
});