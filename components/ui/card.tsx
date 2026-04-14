import React from 'react';
import {
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
  ViewStyle,
} from 'react-native';

// ==================== Design Tokens (Glassmorphism) ====================
const tokens = {
  colors: {
    // Single background color – semi‑transparent white
    background: 'rgba(255, 255, 255, 0.7)',
    // Border uses the same color for a seamless glass edge
    border: 'rgba(255, 255, 255, 0.7)',
    title: '#1A1E24',        // dark grey/black for contrast
    description: '#4A5568',   // softer grey but still readable
    shadow: '#000000',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 20,
    xl: 24,
  },
  typography: {
    title: {
      fontSize: 18,
      fontWeight: '600' as const,  // <-- Add 'as const' here
      lineHeight: 24,
    },
    description: {
      fontSize: 14,
      lineHeight: 20,
    },
  },
  borderRadius: {
    card: 16, // slightly larger for glassmorphism
  },
  shadow: {
    default: {
      boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',
      elevation: 5,
    },
  },
};

// ==================== Types (unchanged) ====================
export type CardVariant = 'default' | 'outlined';

interface CardProps extends TouchableOpacityProps {
  variant?: CardVariant;
  children?: React.ReactNode;
  style?: ViewStyle;
  pressable?: boolean;
}

interface CardHeaderProps {
  children?: React.ReactNode;
  style?: ViewStyle;
}

interface CardTitleProps {
  children?: React.ReactNode;
  style?: TextStyle;
}

interface CardDescriptionProps {
  children?: React.ReactNode;
  style?: TextStyle;
}

interface CardActionProps {
  children?: React.ReactNode;
  style?: ViewStyle;
}

interface CardContentProps {
  children?: React.ReactNode;
  style?: ViewStyle;
}

interface CardFooterProps {
  children?: React.ReactNode;
  style?: ViewStyle;
}

// ==================== Card Components ====================
export const Card: React.FC<CardProps> = ({
  variant = 'default',
  pressable = false,
  children,
  style,
  ...touchableProps
}) => {
  const cardStyles = [
    styles.cardBase,
    variant === 'default' ? styles.cardDefault : styles.cardOutlined,
    style,
  ];

  if (pressable) {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        style={cardStyles}
        {...touchableProps}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyles}>{children}</View>;
};

export const CardHeader: React.FC<CardHeaderProps> = ({ children, style }) => {
  return <View style={[styles.cardHeader, style]}>{children}</View>;
};

export const CardTitle: React.FC<CardTitleProps> = ({ children, style }) => {
  return <Text style={[styles.cardTitle, style]}>{children}</Text>;
};

export const CardDescription: React.FC<CardDescriptionProps> = ({
  children,
  style,
}) => {
  return <Text style={[styles.cardDescription, style]}>{children}</Text>;
};

export const CardAction: React.FC<CardActionProps> = ({ children, style }) => {
  return <View style={[styles.cardAction, style]}>{children}</View>;
};

export const CardContent: React.FC<CardContentProps> = ({ children, style }) => {
  return <View style={[styles.cardContent, style]}>{children}</View>;
};

export const CardFooter: React.FC<CardFooterProps> = ({ children, style }) => {
  return <View style={[styles.cardFooter, style]}>{children}</View>;
};

// ==================== Styles (Glassmorphism) ====================
const styles = StyleSheet.create({
  cardBase: {
    borderRadius: tokens.borderRadius.card,
    overflow: 'hidden',
    backgroundColor: tokens.colors.background,
  },
  cardDefault: {
    ...tokens.shadow.default,
  },
  cardOutlined: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.lg,
    paddingBottom: tokens.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border, // same as background → no extra colour
  },
  cardTitle: {
    ...tokens.typography.title,
    color: tokens.colors.title,
    marginBottom: tokens.spacing.xs,
  },
  cardDescription: {
    ...tokens.typography.description,
    color: tokens.colors.description,
  },
  cardAction: {
    marginLeft: tokens.spacing.md,
  },
  cardContent: {
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
  },
  cardFooter: {
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.border, // same as background
    flexDirection: 'row',
    alignItems: 'center',
  },
});