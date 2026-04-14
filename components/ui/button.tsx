import React from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TextStyle,
    TouchableOpacity,
    ViewStyle
} from 'react-native';

type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon' | 'icon-sm' | 'icon-lg';

interface ButtonProps {
  children?: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  asChild?: boolean; // kept for API compatibility, not used in RN
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'default',
  size = 'default',
  onPress,
  disabled = false,
  loading = false,
  style,
  textStyle,
  asChild,
}) => {
  const isDisabled = disabled || loading;

  // Determine container styles
  const containerStyle = [
    styles.base,
    variants[variant].container,
    sizes[size].container,
    isDisabled && styles.disabled,
    style,
  ];

  // Determine text styles
  const textStyleObj = [
    styles.text,
    variants[variant].text,
    sizes[size].text,
    isDisabled && styles.disabledText,
    textStyle,
  ];

  // Handle press
  const handlePress = () => {
    if (!isDisabled && onPress) {
      onPress();
    }
  };

  // For icon sizes, we only render children (should be an icon)
  const isIconSize = size === 'icon' || size === 'icon-sm' || size === 'icon-lg';

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      disabled={isDisabled}
      style={containerStyle}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variants[variant].text.color}
        />
      ) : (
        <>
          {isIconSize ? (
            children
          ) : (
            <Text style={textStyleObj}>{children}</Text>
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

// Styles definitions
const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 0,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.5,
  },
});

// Variant styles
const variants = {
  default: {
    container: {
      backgroundColor: '#22c55e', // primary green
    },
    text: {
      color: '#ffffff',
    },
  },
  destructive: {
    container: {
      backgroundColor: '#ef4444', // red-500
    },
    text: {
      color: '#ffffff',
    },
  },
  outline: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: '#d1d5db',
    },
    text: {
      color: '#374151',
    },
  },
  secondary: {
    container: {
      backgroundColor: '#e5e7eb',
    },
    text: {
      color: '#374151',
    },
  },
  ghost: {
    container: {
      backgroundColor: 'transparent',
    },
    text: {
      color: '#374151',
    },
  },
  link: {
    container: {
      backgroundColor: 'transparent',
    },
    text: {
      color: '#22c55e',
      textDecorationLine: 'underline',
    },
  },
};

// Size styles
const sizes = {
  default: {
    container: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      minWidth: 80,
    },
    text: {
      fontSize: 14,
    },
  },
  sm: {
    container: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      minWidth: 64,
    },
    text: {
      fontSize: 12,
    },
  },
  lg: {
    container: {
      paddingVertical: 10,
      paddingHorizontal: 24,
      minWidth: 100,
    },
    text: {
      fontSize: 16,
    },
  },
  icon: {
    container: {
      width: 36,
      height: 36,
      padding: 0,
      borderRadius: 8,
    },
    text: {},
  },
  'icon-sm': {
    container: {
      width: 32,
      height: 32,
      padding: 0,
      borderRadius: 8,
    },
    text: {},
  },
  'icon-lg': {
    container: {
      width: 40,
      height: 40,
      padding: 0,
      borderRadius: 8,
    },
    text: {},
  },
};

// Export the variant styles for external use if needed
export const buttonVariants = { variants, sizes };