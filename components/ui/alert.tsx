import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

type AlertVariant = 'default' | 'destructive';

interface AlertProps {
  children?: React.ReactNode;
  variant?: AlertVariant;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
}

export const Alert: React.FC<AlertProps> = ({
  children,
  variant = 'default',
  icon,
  style,
}) => {
  const containerStyle = [
    styles.base,
    variant === 'destructive' ? styles.destructive : styles.default,
    style,
  ];

  return (
    <View style={containerStyle}>
      {icon && (
        <View style={styles.iconWrapper}>
          <Ionicons name={icon} size={16} color={variant === 'destructive' ? '#dc2626' : '#11181C'} />
        </View>
      )}
      <View style={styles.content}>{children}</View>
    </View>
  );
};

interface AlertTitleProps {
  children: React.ReactNode;
  style?: TextStyle;
}

export const AlertTitle: React.FC<AlertTitleProps> = ({ children, style }) => {
  return <Text style={[styles.title, style]}>{children}</Text>;
};

interface AlertDescriptionProps {
  children: React.ReactNode;
  style?: TextStyle;
}

export const AlertDescription: React.FC<AlertDescriptionProps> = ({ children, style }) => {
  return <Text style={[styles.description, style]}>{children}</Text>;
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 8,
  },
  default: {
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
  },
  destructive: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  iconWrapper: {
    marginRight: 12,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    color: '#11181C',
  },
  description: {
    fontSize: 14,
    color: '#687076',
    lineHeight: 20,
  },
});