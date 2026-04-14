import React from 'react';
import { StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  style,
  textStyle,
}) => {
  const badgeStyles = [
    styles.base,
    variants[variant].container,
    style,
  ];

  const textStyles = [
    styles.text,
    variants[variant].text,
    textStyle,
  ];

  return (
    <View style={badgeStyles}>
      <Text style={textStyles}>{children}</Text>
    </View>
  );
};

const variants = {
  default: {
    container: {
      backgroundColor: '#22c55e', // primary green
    },
    text: {
      color: 'white',
    },
  },
  secondary: {
    container: {
      backgroundColor: '#e5e7eb', // gray-200
    },
    text: {
      color: '#374151', // gray-700
    },
  },
  destructive: {
    container: {
      backgroundColor: '#ef4444', // red-500
    },
    text: {
      color: 'white',
    },
  },
  outline: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: '#d1d5db', // gray-300
    },
    text: {
      color: '#374151', // gray-700
    },
  },
  success: {
    container: {
      backgroundColor: '#d1fae5', // green-100
    },
    text: {
      color: '#065f46', // green-800
    },
  },
};

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginVertical: 2,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});