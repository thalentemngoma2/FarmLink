import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';

// Types
interface BreadcrumbProps extends ViewStyle {
  children?: React.ReactNode;
  style?: ViewStyle;
}

interface BreadcrumbListProps {
  children?: React.ReactNode;
  style?: ViewStyle;
}

interface BreadcrumbItemProps {
  children?: React.ReactNode;
  style?: ViewStyle;
}

interface BreadcrumbLinkProps {
  children?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  asChild?: boolean; // kept for API compatibility, but not used in RN
}

interface BreadcrumbPageProps {
  children?: React.ReactNode;
  style?: TextStyle;
}

interface BreadcrumbSeparatorProps {
  children?: React.ReactNode;
  style?: ViewStyle;
}

interface BreadcrumbEllipsisProps {
  onPress?: () => void;
  style?: ViewStyle;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ children, style }) => {
  return (
    <View
      style={[styles.breadcrumb, style]}
      accessible
      accessibilityLabel="breadcrumb"
    >
      {children}
    </View>
  );
};

export const BreadcrumbList: React.FC<BreadcrumbListProps> = ({ children, style }) => {
  return <View style={[styles.list, style]}>{children}</View>;
};

export const BreadcrumbItem: React.FC<BreadcrumbItemProps> = ({ children, style }) => {
  return <View style={[styles.item, style]}>{children}</View>;
};

export const BreadcrumbLink: React.FC<BreadcrumbLinkProps> = ({
  children,
  onPress,
  style,
  textStyle,
  asChild, // ignored
}) => {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={[styles.link, style]}>
      {typeof children === 'string' ? (
        <Text style={[styles.linkText, textStyle]}>{children}</Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
};

export const BreadcrumbPage: React.FC<BreadcrumbPageProps> = ({ children, style }) => {
  return (
    <Text style={[styles.page, style]} accessibilityRole="text">
      {children}
    </Text>
  );
};

export const BreadcrumbSeparator: React.FC<BreadcrumbSeparatorProps> = ({
  children,
  style,
}) => {
  return (
    <View style={[styles.separator, style]}>
      {children ?? <Ionicons name="chevron-forward" size={14} color="#9ca3af" />}
    </View>
  );
};

export const BreadcrumbEllipsis: React.FC<BreadcrumbEllipsisProps> = ({
  onPress,
  style,
}) => {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.ellipsis, style]} activeOpacity={0.7}>
      <Ionicons name="ellipsis-horizontal" size={16} color="#9ca3af" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  breadcrumb: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingVertical: 4,
  },
  list: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  link: {
    paddingVertical: 2,
    paddingHorizontal: 0,
  },
  linkText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  page: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  separator: {
    marginHorizontal: 4,
  },
  ellipsis: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});