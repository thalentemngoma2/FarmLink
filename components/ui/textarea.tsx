import React, { useRef, useState } from 'react';
import {
    Platform,
    StyleSheet,
    TextInput,
    TextStyle,
    ViewStyle,
} from 'react-native';

interface TextareaProps {
  value?: string;
  defaultValue?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
  style?: TextStyle;
  containerStyle?: ViewStyle;
  rows?: number;           // initial number of rows (default: 3)
  maxRows?: number;        // maximum number of rows before scrolling
  autoFocus?: boolean;
  editable?: boolean;
}

export const Textarea: React.FC<TextareaProps> = ({
  value: controlledValue,
  defaultValue,
  onChangeText,
  placeholder,
  disabled = false,
  style,
  containerStyle,
  rows = 3,
  maxRows = 8,
  autoFocus = false,
  editable = true,
  ...props
}) => {
  const [internalValue, setInternalValue] = useState(defaultValue || '');
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;

  const [height, setHeight] = useState(0);
  const inputRef = useRef<TextInput>(null);

  const handleChangeText = (text: string) => {
    if (!isControlled) setInternalValue(text);
    onChangeText?.(text);
  };

  // Calculate dynamic height based on content
  const onContentSizeChange = (event: any) => {
    const newHeight = event.nativeEvent.contentSize.height;
    const lineHeight = 20; // approximate
    const minHeight = rows * lineHeight;
    const maxHeight = maxRows * lineHeight;
    const clampedHeight = Math.min(Math.max(newHeight, minHeight), maxHeight);
    setHeight(clampedHeight);
  };

  return (
    <TextInput
      ref={inputRef}
      style={[
        styles.textarea,
        height ? { height } : { minHeight: rows * 20 },
        style,
      ]}
      value={value}
      onChangeText={handleChangeText}
      placeholder={placeholder}
      placeholderTextColor="#9ca3af"
      multiline
      textAlignVertical="top"
      editable={!disabled && editable}
      onContentSizeChange={onContentSizeChange}
      autoFocus={autoFocus}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  textarea: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#11181C',
    backgroundColor: '#fff',
    textAlignVertical: 'top',
    ...Platform.select({
      ios: {
        paddingTop: 8,
        paddingBottom: 8,
      },
      android: {
        paddingTop: 8,
        paddingBottom: 8,
      },
    }),
  },
});