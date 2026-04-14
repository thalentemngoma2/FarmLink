import React from 'react';
import { StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
type EmptyMediaVariant = 'default' | 'icon';

interface EmptyProps {
  children?: React.ReactNode;
  style?: ViewStyle;
}

interface EmptyHeaderProps {
  children?: React.ReactNode;
  style?: ViewStyle;
}

interface EmptyMediaProps {
  children?: React.ReactNode;
  variant?: EmptyMediaVariant;
  style?: ViewStyle;
}

interface EmptyTitleProps {
  children?: React.ReactNode;
  style?: TextStyle;
}

interface EmptyDescriptionProps {
  children?: React.ReactNode;
  style?: TextStyle;
}

interface EmptyContentProps {
  children?: React.ReactNode;
  style?: ViewStyle;
}

// -----------------------------------------------------------------------------
// Components
// -----------------------------------------------------------------------------
export const Empty: React.FC<EmptyProps> = ({ children, style }) => {
  return (
    <View style={[styles.empty, style]}>
      {children}
    </View>
  );
};

export const EmptyHeader: React.FC<EmptyHeaderProps> = ({ children, style }) => {
  return (
    <View style={[styles.header, style]}>
      {children}
    </View>
  );
};

export const EmptyMedia: React.FC<EmptyMediaProps> = ({
  children,
  variant = 'default',
  style,
}) => {
  const mediaStyle = [
    styles.mediaBase,
    variant === 'icon' && styles.mediaIcon,
    style,
  ];

  return (
    <View style={mediaStyle}>
      {children}
    </View>
  );
};

export const EmptyTitle: React.FC<EmptyTitleProps> = ({ children, style }) => {
  return (
    <Text style={[styles.title, style]}>
      {children}
    </Text>
  );
};

export const EmptyDescription: React.FC<EmptyDescriptionProps> = ({ children, style }) => {
  return (
    <Text style={[styles.description, style]}>
      {children}
    </Text>
  );
};

export const EmptyContent: React.FC<EmptyContentProps> = ({ children, style }) => {
  return (
    <View style={[styles.content, style]}>
      {children}
    </View>
  );
};

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------
const styles = StyleSheet.create({
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
    minHeight: 200,
  },
  header: {
    maxWidth: 280,
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  mediaBase: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  mediaIcon: {
    backgroundColor: '#f1f5f9',
    width: 48,
    height: 48,
    borderRadius: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    color: '#11181C',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    color: '#687076',
    lineHeight: 20,
  },
  content: {
    maxWidth: 280,
    alignItems: 'center',
    gap: 12,
  },
});