import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from 'react-native-reanimated';

// Enable LayoutAnimation for Android (optional)
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface QuestionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading?: boolean;
  placeholder?: string;
}

export const QuestionInput: React.FC<QuestionInputProps> = ({
  value,
  onChange,
  onSubmit,
  isLoading = false,
  placeholder = 'Ask your farming question...',
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [inputHeight, setInputHeight] = useState(24); // initial min height
  const textInputRef = useRef<TextInput>(null);

  // Reanimated values
  const containerTranslateY = useSharedValue(20);
  const containerOpacity = useSharedValue(0);
  const inputContainerScale = useSharedValue(1);
  const searchIconScale = useSharedValue(1);
  const sendButtonScale = useSharedValue(1);
  const charCounterHeight = useSharedValue(0);
  const charCounterOpacity = useSharedValue(0);

  // Entry animation
  useEffect(() => {
    containerTranslateY.value = withTiming(0, { duration: 500 });
    containerOpacity.value = withTiming(1, { duration: 500 });
  }, []);

  // Handle focus animations
  useEffect(() => {
    searchIconScale.value = withSpring(isFocused ? 1.1 : 1);
    // Animate container shadow (we'll use border color and shadow opacity)
    // We'll animate the shadow style in the animated style
  }, [isFocused]);

  // Handle character counter appearance
  useEffect(() => {
    if (value.length > 50) {
      charCounterHeight.value = withTiming(40); // approximate height
      charCounterOpacity.value = withTiming(1);
    } else {
      charCounterHeight.value = withTiming(0);
      charCounterOpacity.value = withTiming(0);
    }
  }, [value.length]);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
    transform: [{ translateY: containerTranslateY.value }],
  }));

  const inputContainerAnimatedStyle = useAnimatedStyle(() => {
    // Simulate box shadow using border color and shadow properties
    const shadowOpacity = isFocused ? 0.2 : 0.08;
    const shadowRadius = isFocused ? 8 : 4;
    const borderColor = isFocused ? 'rgba(34, 197, 94, 0.5)' : 'rgba(255,255,255,0.3)';
    return {
      borderColor,
      shadowOpacity,
      shadowRadius,
      // Scale effect for input container (slight pulse on focus)
      transform: [{ scale: inputContainerScale.value }],
    };
  });

  const searchIconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: searchIconScale.value }],
  }));

  const sendButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendButtonScale.value }],
  }));

  const charCounterAnimatedStyle = useAnimatedStyle(() => ({
    height: charCounterHeight.value,
    opacity: charCounterOpacity.value,
  }));

  // Handle text input height changes
  const onContentSizeChange = (event: any) => {
    const newHeight = event.nativeEvent.contentSize.height;
    // Set height, but cap to some maximum (e.g., 120)
    setInputHeight(Math.min(newHeight, 120));
  };

  const handleSendPress = () => {
    if (value.trim() && !isLoading) {
      // Animate button press
      sendButtonScale.value = withSpring(0.95);
      setTimeout(() => {
        sendButtonScale.value = withSpring(1);
      }, 100);
      runOnJS(onSubmit)();
    }
  };

  const handleVoicePress = () => {
    // Placeholder for voice input – you can implement later
    console.log('Voice input pressed');
  };

  const handleKeyPress = (e: any) => {
    // Optional: handle Enter key press (not as reliable in RN)
    // This example does not use keyboard submit to avoid complexity.
    // You can implement if needed using returnKeyType='send' and onSubmitEditing.
  };

  return (
    <Animated.View style={[styles.container, containerAnimatedStyle]}>
      <Animated.View
        style={[
          styles.inputContainer,
          inputContainerAnimatedStyle,
          {
            borderWidth: 1,
            backgroundColor: 'rgba(255,255,255,0.7)',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',
            elevation: 2,
          },
        ]}
      >
        <View style={styles.innerContainer}>
          {/* Search icon */}
          <Animated.View style={[styles.iconWrapper, searchIconAnimatedStyle]}>
            <View style={styles.iconBackground}>
              <Ionicons name="search" size={16} color="#22c55e" />
            </View>
          </Animated.View>

          {/* TextInput */}
          <TextInput
            ref={textInputRef}
            style={[
              styles.input,
              {
                height: inputHeight,
                minHeight: 24,
              },
            ]}
            value={value}
            onChangeText={onChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            placeholderTextColor="#9ca3af"
            multiline
            textAlignVertical="top"
            onContentSizeChange={onContentSizeChange}
          />

          {/* Action buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity onPress={handleVoicePress} style={styles.voiceButton}>
              <Ionicons name="mic" size={16} color="#9ca3af" />
            </TouchableOpacity>

            {value.trim().length > 0 && (
              <Animated.View style={sendButtonAnimatedStyle}>
                <TouchableOpacity
                  onPress={handleSendPress}
                  disabled={isLoading}
                  style={styles.sendButton}
                >
                  {isLoading ? (
                    <Ionicons name="reload" size={16} color="#fff" />
                  ) : (
                    <Ionicons name="send" size={16} color="#fff" />
                  )}
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
        </View>

        {/* Character counter (animated) */}
        <Animated.View style={[styles.charCounterContainer, charCounterAnimatedStyle]}>
          <View style={styles.charCounterInner}>
            <Text style={styles.charCounterText}>Press Enter to search or Shift+Enter for new line</Text>
            <Text style={styles.charCounterText}>{value.length}/500</Text>
          </View>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 12,
  },
  inputContainer: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  innerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  iconWrapper: {
    marginTop: 2,
  },
  iconBackground: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#11181C',
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 0,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voiceButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(156,163,175,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  charCounterContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  charCounterInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  charCounterText: {
    fontSize: 10,
    color: '#9ca3af',
  },
});