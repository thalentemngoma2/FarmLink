import React from 'react';
import { ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';

interface SpinnerProps {
  size?: number | 'small' | 'large';
  color?: string;
  style?: ViewStyle;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'large',
  color,
  style,
}) => {
  return (
    <ActivityIndicator
      size={size}
      color={color}
      style={[styles.spinner, style]}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
    />
  );
};

const styles = StyleSheet.create({
  spinner: {
    // optional default styling, can be overridden
  },
});