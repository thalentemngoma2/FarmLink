import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';

interface AspectRatioProps extends ViewProps {
  ratio?: number; // e.g., 16 / 9, 1, etc.
  children?: React.ReactNode;
}

export const AspectRatio: React.FC<AspectRatioProps> = ({
  ratio = 1,
  children,
  style,
  ...props
}) => {
  return (
    <View
      style={[styles.container, { aspectRatio: ratio }, style]}
      {...props}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});