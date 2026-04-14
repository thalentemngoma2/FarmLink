import React from 'react';
import { StyleSheet, Text, TextStyle } from 'react-native';

interface LabelProps {
  children?: React.ReactNode;
  style?: TextStyle;
  disabled?: boolean;
  htmlFor?: string; // kept for API compatibility, not used in RN
}

export const Label: React.FC<LabelProps> = ({
  children,
  style,
  disabled = false,
}) => {
  return (
    <Text
      style={[
        styles.label,
        disabled && styles.labelDisabled,
        style,
      ]}
      accessibilityRole="text"
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#11181C',
    marginBottom: 4,
  },
  labelDisabled: {
    opacity: 0.5,
  },
});