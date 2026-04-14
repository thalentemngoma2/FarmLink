import React, { ReactNode } from 'react';
import {
    StyleSheet,
    TextInput,
    TextInputProps,
    TextStyle,
    TouchableOpacity,
    View,
    ViewStyle
} from 'react-native';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
interface InputGroupProps {
  children?: ReactNode;
  style?: ViewStyle;
}

interface InputGroupAddonProps {
  children?: ReactNode;
  placement?: 'left' | 'right';
  style?: ViewStyle;
  onPress?: () => void;
}

interface InputGroupInputProps extends TextInputProps {
  style?: TextStyle;
}

// -----------------------------------------------------------------------------
// InputGroup – container
// -----------------------------------------------------------------------------
export const InputGroup: React.FC<InputGroupProps> = ({ children, style }) => {
  return <View style={[styles.container, style]}>{children}</View>;
};

// -----------------------------------------------------------------------------
// InputGroupAddon – left or right adornment (icon or button)
// -----------------------------------------------------------------------------
export const InputGroupAddon: React.FC<InputGroupAddonProps> = ({
  children,
  placement = 'left',
  style,
  onPress,
}) => {
  const addonStyle = [
    styles.addon,
    placement === 'left' ? styles.addonLeft : styles.addonRight,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity style={addonStyle} onPress={onPress} activeOpacity={0.7}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={addonStyle}>{children}</View>;
};

// -----------------------------------------------------------------------------
// InputGroupInput – the main input field
// -----------------------------------------------------------------------------
export const InputGroupInput: React.FC<InputGroupInputProps> = ({ style, ...props }) => {
  return <TextInput style={[styles.input, style]} placeholderTextColor="#9ca3af" {...props} />;
};

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  addon: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addonLeft: {
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  addonRight: {
    borderLeftWidth: 1,
    borderLeftColor: '#e5e7eb',
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#11181C',
  },
});