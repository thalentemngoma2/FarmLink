import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue
} from 'react-native-reanimated';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
type SliderValue = number | [number, number];

interface SliderProps {
  value?: SliderValue;
  defaultValue?: SliderValue;
  onValueChange?: (value: SliderValue) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  orientation?: 'horizontal' | 'vertical';
  style?: ViewStyle;
  trackStyle?: ViewStyle;
  rangeStyle?: ViewStyle;
  thumbStyle?: ViewStyle;
}

// -----------------------------------------------------------------------------
// Helper functions
// -----------------------------------------------------------------------------
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const snapToStep = (value: number, step: number, min: number) => {
  if (step <= 0) return value;
  const stepped = Math.round((value - min) / step) * step + min;
  return clamp(stepped, min, 1 / 0);
};

// -----------------------------------------------------------------------------
// Slider Component
// -----------------------------------------------------------------------------
export const Slider: React.FC<SliderProps> = ({
  value: controlledValue,
  defaultValue = 0,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  orientation = 'horizontal',
  style,
  trackStyle,
  rangeStyle,
  thumbStyle,
}) => {
  // Internal state (uncontrolled)
  const [internalValue, setInternalValue] = useState<SliderValue>(defaultValue);
  const isControlled = controlledValue !== undefined;
  const currentValue = isControlled ? controlledValue : internalValue;

  // Determine if we are in range mode (two values)
  const isRange = Array.isArray(currentValue);
  const values = isRange ? currentValue : [currentValue as number];
  const [value0, value1] = isRange ? values : [values[0], undefined];

  // Shared values for animation
  const thumb0Pos = useSharedValue(0);
  const thumb1Pos = useSharedValue(0);
  const containerWidth = useSharedValue(0);
  const containerHeight = useSharedValue(0);

  // Track layout measurement
  const trackRef = useRef<View>(null);

  const updatePositions = useCallback(() => {
    if (orientation === 'horizontal') {
      const percent0 = (value0 - min) / (max - min);
      thumb0Pos.value = percent0 * containerWidth.value;
      if (isRange && value1 !== undefined) {
        const percent1 = (value1 - min) / (max - min);
        thumb1Pos.value = percent1 * containerWidth.value;
      }
    } else {
      const percent0 = (value0 - min) / (max - min);
      thumb0Pos.value = percent0 * containerHeight.value;
      if (isRange && value1 !== undefined) {
        const percent1 = (value1 - min) / (max - min);
        thumb1Pos.value = percent1 * containerHeight.value;
      }
    }
  }, [value0, value1, min, max, orientation, containerWidth, containerHeight, thumb0Pos, thumb1Pos, isRange]);

  useEffect(() => {
    if (containerWidth.value > 0 || containerHeight.value > 0) {
      updatePositions();
    }
  }, [currentValue, containerWidth, containerHeight, updatePositions]);

  const handleTrackLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (orientation === 'horizontal') {
      containerWidth.value = width;
    } else {
      containerHeight.value = height;
    }
    updatePositions();
  };

  const updateValueFromPosition = (position: number, thumbIndex: 0 | 1) => {
    let percent;
    if (orientation === 'horizontal') {
      percent = clamp(position / containerWidth.value, 0, 1);
    } else {
      percent = clamp(position / containerHeight.value, 0, 1);
    }
    let newVal = min + percent * (max - min);
    newVal = snapToStep(newVal, step, min);

    if (isRange) {
      let newVals = [...values] as [number, number];
      newVals[thumbIndex] = newVal;
      // ensure order
      if (newVals[0] > newVals[1]) {
        newVals.sort((a, b) => a - b);
      }
      const newRange = newVals as [number, number];
      if (isControlled) {
        onValueChange?.(newRange);
      } else {
        setInternalValue(newRange);
        onValueChange?.(newRange);
      }
    } else {
      if (isControlled) {
        onValueChange?.(newVal);
      } else {
        setInternalValue(newVal);
        onValueChange?.(newVal);
      }
    }
  };

  // Thumb gestures
  const createThumbGesture = (thumbIndex: 0 | 1) => {
    return Gesture.Pan()
      .onStart(() => {
        // no start value needed, we use the current position directly
      })
      .onUpdate((event) => {
        if (disabled) return;
        let newPos = thumbIndex === 0 ? thumb0Pos.value : thumb1Pos.value;
        if (orientation === 'horizontal') {
          newPos += event.translationX;
        } else {
          newPos += event.translationY;
        }
        newPos = clamp(newPos, 0, orientation === 'horizontal' ? containerWidth.value : containerHeight.value);
        if (thumbIndex === 0) {
          thumb0Pos.value = newPos;
        } else {
          thumb1Pos.value = newPos;
        }
        // Update value without sending to parent during drag (optional: we can send continuously)
        // For smoothness, we update value on each move
        runOnJS(updateValueFromPosition)(newPos, thumbIndex);
      })
      .onEnd(() => {
        // optional spring to nearest step – but we already snap on update
      });
  };

  const thumb0Gesture = createThumbGesture(0);
  const thumb1Gesture = createThumbGesture(1);

  // Styles for track and range
  const trackStyleObj = [
    styles.track,
    orientation === 'horizontal' ? styles.trackHorizontal : styles.trackVertical,
    trackStyle,
  ];

  const rangeStyleObj = useAnimatedStyle(() => {
    if (orientation === 'horizontal') {
      let start = 0;
      let width = 0;
      if (isRange && value1 !== undefined) {
        const pos0 = thumb0Pos.value;
        const pos1 = thumb1Pos.value;
        start = Math.min(pos0, pos1);
        width = Math.abs(pos0 - pos1);
      } else {
        start = 0;
        width = thumb0Pos.value;
      }
      return {
        left: start,
        width: width,
      };
    } else {
      let start = 0;
      let height = 0;
      if (isRange && value1 !== undefined) {
        const pos0 = thumb0Pos.value;
        const pos1 = thumb1Pos.value;
        start = Math.min(pos0, pos1);
        height = Math.abs(pos0 - pos1);
      } else {
        start = 0;
        height = thumb0Pos.value;
      }
      return {
        top: start,
        height: height,
      };
    }
  });

  const thumb0AnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: orientation === 'horizontal' ? thumb0Pos.value : 0,
      },
      {
        translateY: orientation === 'vertical' ? thumb0Pos.value : 0,
      },
    ],
  }));

  const thumb1AnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: orientation === 'horizontal' ? thumb1Pos.value : 0,
      },
      {
        translateY: orientation === 'vertical' ? thumb1Pos.value : 0,
      },
    ],
  }));

  const thumbCommonStyle = [
    styles.thumb,
    orientation === 'horizontal' ? styles.thumbHorizontal : styles.thumbVertical,
    thumbStyle,
  ];

  return (
    <GestureHandlerRootView style={[styles.container, style]}>
      <View
        ref={trackRef}
        style={trackStyleObj}
        onLayout={handleTrackLayout}
      >
        <Animated.View style={[styles.range, rangeStyleObj, rangeStyle]} />
      </View>
      <GestureDetector gesture={thumb0Gesture}>
        <Animated.View style={[thumbCommonStyle, thumb0AnimatedStyle]} />
      </GestureDetector>
      {isRange && (
        <GestureDetector gesture={thumb1Gesture}>
          <Animated.View style={[thumbCommonStyle, thumb1AnimatedStyle]} />
        </GestureDetector>
      )}
    </GestureHandlerRootView>
  );
};

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    backgroundColor: '#e5e7eb', // bg-muted
    overflow: 'hidden',
  },
  trackHorizontal: {
    width: '100%',
    height: 6,
    borderRadius: 3,
  },
  trackVertical: {
    width: 6,
    height: '100%',
    borderRadius: 3,
  },
  range: {
    backgroundColor: '#22c55e', // bg-primary
    position: 'absolute',
  },
  thumb: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#22c55e',
    position: 'absolute',
    boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',
    elevation: 2,
  },
  thumbHorizontal: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginLeft: -8,
  },
  thumbVertical: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginTop: -8,
  },
});