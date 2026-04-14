import React, { createContext, ReactNode, useCallback, useContext, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextStyle, TouchableOpacity, ViewStyle } from 'react-native';

type ToggleVariant = 'default' | 'outline';
type ToggleSize = 'default' | 'sm' | 'lg';
type ToggleGroupType = 'single' | 'multiple';

interface ToggleGroupContextValue {
  value: string[];
  onValueChange: (value: string[]) => void;
  variant?: ToggleVariant;
  size?: ToggleSize;
  type: ToggleGroupType;
}

const ToggleGroupContext = createContext<ToggleGroupContextValue | undefined>(undefined);

const useToggleGroup = () => {
  const ctx = useContext(ToggleGroupContext);
  if (!ctx) throw new Error('ToggleGroupItem must be used within a ToggleGroup');
  return ctx;
};

// -----------------------------------------------------------------------------
// ToggleGroup
// -----------------------------------------------------------------------------
interface ToggleGroupProps {
  children: ReactNode;
  value?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  defaultValue?: string | string[];
  type?: ToggleGroupType;
  variant?: ToggleVariant;
  size?: ToggleSize;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
}

export const ToggleGroup: React.FC<ToggleGroupProps> = ({
  children,
  value: controlledValue,
  onValueChange,
  defaultValue,
  type = 'single',
  variant = 'default',
  size = 'default',
  style,
  contentContainerStyle,
}) => {
  const [uncontrolledValue, setUncontrolledValue] = useState<string[]>(
    Array.isArray(defaultValue) ? defaultValue : defaultValue ? [defaultValue] : []
  );
  const isControlled = controlledValue !== undefined;
  const value = isControlled
    ? (Array.isArray(controlledValue) ? controlledValue : controlledValue ? [controlledValue] : [])
    : uncontrolledValue;

  const handleValueChange = useCallback((newValue: string[]) => {
    if (!isControlled) setUncontrolledValue(newValue);
    if (type === 'single') {
      onValueChange?.(newValue[0] || '');
    } else {
      onValueChange?.(newValue);
    }
  }, [isControlled, type, onValueChange]);

  const contextValue: ToggleGroupContextValue = {
    value,
    onValueChange: handleValueChange,
    variant,
    size,
    type,
  };

  return (
    <ToggleGroupContext.Provider value={contextValue}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.group, style]}
        contentContainerStyle={[styles.groupContent, contentContainerStyle]}
      >
        {children}
      </ScrollView>
    </ToggleGroupContext.Provider>
  );
};

// -----------------------------------------------------------------------------
// ToggleGroupItem
// -----------------------------------------------------------------------------
interface ToggleGroupItemProps {
  children: ReactNode;
  value: string;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const ToggleGroupItem: React.FC<ToggleGroupItemProps> = ({
  children,
  value,
  disabled = false,
  style,
  textStyle,
}) => {
  const { value: selectedValues, onValueChange, variant, size, type } = useToggleGroup();
  const isActive = selectedValues.includes(value);

  const handlePress = () => {
    if (disabled) return;
    let newValues: string[];
    if (type === 'single') {
      newValues = isActive ? [] : [value];
    } else {
      if (isActive) {
        newValues = selectedValues.filter(v => v !== value);
      } else {
        newValues = [...selectedValues, value];
      }
    }
    onValueChange(newValues);
  };

  // Build container style array
  const containerStyles: ViewStyle[] = [styles.item];

  if (variant === 'outline') {
    containerStyles.push(styles.itemOutline);
  }
  if (isActive) {
    containerStyles.push(variant === 'outline' ? styles.itemActiveOutline : styles.itemActive);
  }
  if (disabled) {
    containerStyles.push(styles.itemDisabled);
  }
  if (size === 'sm') {
    containerStyles.push(styles.itemSm);
  } else if (size === 'lg') {
    containerStyles.push(styles.itemLg);
  }
  if (style) {
    containerStyles.push(style);
  }

  // Build text style array
  const textStyles: TextStyle[] = [styles.itemText];

  if (size === 'sm') {
    textStyles.push(styles.itemTextSm);
  } else if (size === 'lg') {
    textStyles.push(styles.itemTextLg);
  }
  if (isActive) {
    textStyles.push(styles.itemTextActive);
  }
  if (disabled) {
    textStyles.push(styles.itemTextDisabled);
  }
  if (textStyle) {
    textStyles.push(textStyle);
  }

  return (
    <TouchableOpacity
      style={containerStyles}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={textStyles}>{children}</Text>
    </TouchableOpacity>
  );
};

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------
const styles = StyleSheet.create({
  group: {
    flexDirection: 'row',
  },
  groupContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  item: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 2,
    borderRadius: 6,
  },
  itemOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    marginHorizontal: -1, // to collapse borders
  },
  itemActive: {
    backgroundColor: '#22c55e',
  },
  itemActiveOutline: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  itemDisabled: {
    opacity: 0.5,
  },
  itemSm: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  itemLg: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  itemText: {
    fontSize: 14,
    color: '#11181C',
  },
  itemTextSm: {
    fontSize: 12,
  },
  itemTextLg: {
    fontSize: 16,
  },
  itemTextActive: {
    color: '#fff',
  },
  itemTextDisabled: {
    color: '#9ca3af',
  },
});