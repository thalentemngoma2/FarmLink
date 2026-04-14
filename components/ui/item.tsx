import React, { ReactNode } from 'react';
import {
    Image,
    ImageStyle,
    StyleSheet,
    Text,
    TextStyle,
    TouchableOpacity,
    View,
    ViewStyle,
} from 'react-native';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
type ItemVariant = 'default' | 'outline' | 'muted';
type ItemSize = 'default' | 'sm';
type ItemMediaVariant = 'default' | 'icon' | 'image';

interface ItemProps {
  children?: ReactNode;
  variant?: ItemVariant;
  size?: ItemSize;
  asChild?: boolean; // ignored; we use onPress if provided
  onPress?: () => void;
  style?: ViewStyle;
}

interface ItemGroupProps {
  children?: ReactNode;
  style?: ViewStyle;
}

interface ItemSeparatorProps {
  style?: ViewStyle;
}

interface ItemMediaProps {
  children?: ReactNode;
  variant?: ItemMediaVariant;
  source?: { uri: string }; // for image variant
  style?: ViewStyle | ImageStyle;
}

interface ItemContentProps {
  children?: ReactNode;
  style?: ViewStyle;
}

interface ItemTitleProps {
  children?: ReactNode;
  style?: TextStyle;
}

interface ItemDescriptionProps {
  children?: ReactNode;
  style?: TextStyle;
}

interface ItemActionsProps {
  children?: ReactNode;
  style?: ViewStyle;
}

interface ItemHeaderProps {
  children?: ReactNode;
  style?: ViewStyle;
}

interface ItemFooterProps {
  children?: ReactNode;
  style?: ViewStyle;
}

// -----------------------------------------------------------------------------
// Components
// -----------------------------------------------------------------------------
export const ItemGroup: React.FC<ItemGroupProps> = ({ children, style }) => {
  return (
    <View style={[styles.group, style]} accessibilityRole="list">
      {children}
    </View>
  );
};

export const ItemSeparator: React.FC<ItemSeparatorProps> = ({ style }) => {
  return <View style={[styles.separator, style]} />;
};

export const Item: React.FC<ItemProps> = ({
  children,
  variant = 'default',
  size = 'default',
  onPress,
  style,
}) => {
  const containerStyle = [
    styles.item,
    variants[variant].container,
    sizes[size].container,
    onPress && styles.pressable,
    style,
  ];

  const Component = onPress ? TouchableOpacity : View;

  return (
    <Component
      style={containerStyle}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      {children}
    </Component>
  );
};

export const ItemMedia: React.FC<ItemMediaProps> = ({
  children,
  variant = 'default',
  source,
  style,
}) => {
  if (variant === 'image' && source) {
    return (
      <Image
        source={source}
        style={[styles.mediaImage, style as ImageStyle]}
        resizeMode="cover"
      />
    );
  }

  const mediaStyle = [
    styles.mediaBase,
    variant === 'icon' && styles.mediaIcon,
    style,
  ];

  return <View style={mediaStyle}>{children}</View>;
};

export const ItemContent: React.FC<ItemContentProps> = ({ children, style }) => {
  return <View style={[styles.content, style]}>{children}</View>;
};

export const ItemTitle: React.FC<ItemTitleProps> = ({ children, style }) => {
  return <Text style={[styles.title, style]}>{children}</Text>;
};

export const ItemDescription: React.FC<ItemDescriptionProps> = ({ children, style }) => {
  return <Text style={[styles.description, style]} numberOfLines={2}>
    {children}
  </Text>;
};

export const ItemActions: React.FC<ItemActionsProps> = ({ children, style }) => {
  return <View style={[styles.actions, style]}>{children}</View>;
};

export const ItemHeader: React.FC<ItemHeaderProps> = ({ children, style }) => {
  return <View style={[styles.header, style]}>{children}</View>;
};

export const ItemFooter: React.FC<ItemFooterProps> = ({ children, style }) => {
  return <View style={[styles.footer, style]}>{children}</View>;
};

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------
const variants = {
  default: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: 'transparent',
    },
  },
  outline: {
    container: {
      borderColor: '#e5e7eb',
    },
  },
  muted: {
    container: {
      backgroundColor: '#f9fafb',
    },
  },
};

const sizes = {
  default: {
    container: {
      padding: 16,
      gap: 16,
    },
  },
  sm: {
    container: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      gap: 10,
    },
  },
};

const styles = StyleSheet.create({
  group: {
    flexDirection: 'column',
  },
  separator: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 0,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
  },
  pressable: {
    // no extra style, just make it pressable
  },
  mediaBase: {
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  mediaImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  content: {
    flex: 1,
    flexDirection: 'column',
    gap: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#11181C',
  },
  description: {
    fontSize: 12,
    color: '#687076',
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
  },
});