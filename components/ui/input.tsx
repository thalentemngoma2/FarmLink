import { Ionicons } from '@expo/vector-icons';
import React, { forwardRef } from 'react';
import {
    StyleSheet,
    TextInput,
    TextInputProps,
    TextStyle,
    View,
    ViewStyle,
} from 'react-native';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
type InputVariant = 'default' | 'destructive';

interface InputProps extends TextInputProps {
  variant?: InputVariant;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  containerStyle?: ViewStyle;
  style?: TextStyle;
  disabled?: boolean;
}

// -----------------------------------------------------------------------------
// Input Component
// -----------------------------------------------------------------------------
export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      variant = 'default',
      leftIcon,
      rightIcon,
      containerStyle,
      style,
      editable = true,
      disabled = false,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || !editable;
    const isError = variant === 'destructive';

    const containerStyles = [
      styles.container,
      isError && styles.containerError,
      isDisabled && styles.containerDisabled,
      containerStyle,
    ];

    const inputStyles = [
      styles.input,
      leftIcon && styles.inputWithLeftIcon,
      rightIcon && styles.inputWithRightIcon,
      isDisabled && styles.inputDisabled,
      style,
    ];

    return (
      <View style={containerStyles}>
        {leftIcon && (
          <View style={styles.leftIcon}>
            <Ionicons
              name={leftIcon}
              size={18}
              color={isError ? '#ef4444' : '#9ca3af'}
            />
          </View>
        )}
        <TextInput
          ref={ref}
          style={inputStyles}
          editable={!isDisabled}
          placeholderTextColor="#9ca3af"
          {...props}
        />
        {rightIcon && (
          <View style={styles.rightIcon}>
            <Ionicons
              name={rightIcon}
              size={18}
              color={isError ? '#ef4444' : '#9ca3af'}
            />
          </View>
        )}
      </View>
    );
  }
);

Input.displayName = 'Input';

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
    paddingHorizontal: 12,
    minHeight: 40,
  },
  containerError: {
    borderColor: '#ef4444',
  },
  containerDisabled: {
    backgroundColor: '#f3f4f6',
    opacity: 0.6,
  },
  input: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 14,
    color: '#11181C',
  },
  inputWithLeftIcon: {
    paddingLeft: 8,
  },
  inputWithRightIcon: {
    paddingRight: 8,
  },
  inputDisabled: {
    color: '#9ca3af',
  },
  leftIcon: {
    marginRight: 8,
  },
  rightIcon: {
    marginLeft: 8,
  },
});