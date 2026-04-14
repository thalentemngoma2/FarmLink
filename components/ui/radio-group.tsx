import React, { createContext, ReactNode, useContext } from 'react';
import { StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

// -----------------------------------------------------------------------------
// Types & Context
// -----------------------------------------------------------------------------
type RadioGroupContextValue = {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
};

const RadioGroupContext = createContext<RadioGroupContextValue | undefined>(undefined);

const useRadioGroup = () => {
  const ctx = useContext(RadioGroupContext);
  if (!ctx) throw new Error('RadioGroupItem must be used inside a RadioGroup');
  return ctx;
};

// -----------------------------------------------------------------------------
// RadioGroup Root
// -----------------------------------------------------------------------------
interface RadioGroupProps {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  children: ReactNode;
  style?: ViewStyle;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  value,
  onValueChange,
  disabled = false,
  children,
  style,
}) => {
  const contextValue = { value, onValueChange, disabled };

  return (
    <RadioGroupContext.Provider value={contextValue}>
      <View style={[styles.group, style]}>{children}</View>
    </RadioGroupContext.Provider>
  );
};

// -----------------------------------------------------------------------------
// RadioGroupItem – individual radio button
// -----------------------------------------------------------------------------
interface RadioGroupItemProps {
  value: string;
  disabled?: boolean;
  style?: ViewStyle;
}

export const RadioGroupItem: React.FC<RadioGroupItemProps> = ({
  value,
  disabled: itemDisabled,
  style,
}) => {
  const { value: selectedValue, onValueChange, disabled: groupDisabled } = useRadioGroup();
  const isSelected = selectedValue === value;
  const isDisabled = itemDisabled ?? groupDisabled;

  // Shared value for inner dot scale (spring animation)
  const scale = useSharedValue(isSelected ? 1 : 0);

  React.useEffect(() => {
    scale.value = withSpring(isSelected ? 1 : 0, { damping: 10, stiffness: 200 });
  }, [isSelected]);

  const dotAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (!isDisabled && !isSelected) {
      onValueChange?.(value);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.itemContainer, style]}
      onPress={handlePress}
      disabled={isDisabled}
      activeOpacity={0.7}
      accessibilityRole="radio"
      accessibilityState={{ checked: isSelected, disabled: isDisabled }}
    >
      <View style={[styles.radio, isDisabled && styles.radioDisabled]}>
        <Animated.View style={[styles.innerDot, dotAnimatedStyle]} />
      </View>
    </TouchableOpacity>
  );
};

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------
const styles = StyleSheet.create({
  group: {
    gap: 12,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDisabled: {
    opacity: 0.5,
  },
  innerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22c55e', // primary green
  },
});