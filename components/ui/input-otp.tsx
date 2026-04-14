import React, { useEffect, useRef, useState } from 'react';
import {
    Dimensions,
    Platform,
    StyleSheet,
    TextInput,
    TouchableWithoutFeedback,
    View,
} from 'react-native';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
interface InputOTPProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  autoFocus?: boolean;
  disabled?: boolean;
  style?: any;
  inputStyle?: any;
  onComplete?: (value: string) => void;
}

// -----------------------------------------------------------------------------
// InputOTP
// -----------------------------------------------------------------------------
export const InputOTP: React.FC<InputOTPProps> = ({
  value = '',
  onChange,
  maxLength = 6,
  autoFocus = false,
  disabled = false,
  style,
  inputStyle,
  onComplete,
}) => {
  const inputs = useRef<Array<TextInput | null>>([]);
  const [localValue, setLocalValue] = useState(value);

  // Sync with external value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Focus the first input on mount if autoFocus
  useEffect(() => {
    if (autoFocus && inputs.current[0]) {
      inputs.current[0]?.focus();
    }
  }, [autoFocus]);

  const handleChange = (text: string, index: number) => {
    // If pasting multiple digits
    if (text.length > 1) {
      const pasted = text.slice(0, maxLength);
      const newValue = pasted.padEnd(maxLength, '').slice(0, maxLength);
      setLocalValue(newValue);
      onChange(newValue);
      if (newValue.length === maxLength && onComplete) onComplete(newValue);
      // Focus the last filled input
      const lastIndex = Math.min(newValue.length, maxLength - 1);
      if (inputs.current[lastIndex]) inputs.current[lastIndex]?.focus();
      return;
    }

    // Normal single digit input
    const newValue = localValue.split('');
    newValue[index] = text;
    const joined = newValue.join('').slice(0, maxLength);
    setLocalValue(joined);
    onChange(joined);

    // Move to next input if not last
    if (text && index < maxLength - 1) {
      inputs.current[index + 1]?.focus();
    }

    // Trigger completion
    if (joined.length === maxLength && onComplete) onComplete(joined);
  };

  const handleKeyPress = (e: any, index: number) => {
    // Backspace on empty field: move to previous
    if (e.nativeEvent.key === 'Backspace' && !localValue[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleFocus = (index: number) => {
    // If current field is empty and we're focusing, move cursor to the first empty slot
    if (!localValue[index]) {
      const firstEmpty = localValue.split('').findIndex(ch => !ch);
      if (firstEmpty !== -1 && firstEmpty !== index) {
        inputs.current[firstEmpty]?.focus();
      }
    }
  };

  const renderInputs = () => {
    const slots = [];
    for (let i = 0; i < maxLength; i++) {
      slots.push(
        <TextInput
          key={i}
          ref={(ref) => {
            inputs.current[i] = ref;
          }}
          style={[styles.input, inputStyle]}
          value={localValue[i] || ''}
          onChangeText={text => handleChange(text, i)}
          onKeyPress={e => handleKeyPress(e, i)}
          onFocus={() => handleFocus(i)}
          keyboardType="number-pad"
          maxLength={maxLength}
          editable={!disabled}
          selectTextOnFocus
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
        />
      );
    }
    return slots;
  };

  // Allow tapping anywhere in the container to focus the first empty slot
  const handleContainerPress = () => {
    const firstEmpty = localValue.split('').findIndex(ch => !ch);
    const targetIndex = firstEmpty !== -1 ? firstEmpty : maxLength - 1;
    inputs.current[targetIndex]?.focus();
  };

  return (
    <TouchableWithoutFeedback onPress={handleContainerPress}>
      <View style={[styles.container, style]}>
        {renderInputs()}
      </View>
    </TouchableWithoutFeedback>
  );
};

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------
const { width } = Dimensions.get('window');
const inputSize = (width - 64) / 6; // approximate; you can adjust

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  input: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '600',
    backgroundColor: '#fff',
    ...Platform.select({
      ios: {
        padding: 0,
      },
      android: {
        textAlignVertical: 'center',
      },
    }),
  },
});