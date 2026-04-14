import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, ViewStyle } from 'react-native';

interface SkeletonProps {
  style?: ViewStyle;
  className?: string; // ignored, use style
  children?: never;   // skeletons don't have children
}

export const Skeleton: React.FC<SkeletonProps> = ({ style }) => {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { opacity },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#e5e7eb', // bg-accent equivalent (light gray)
    borderRadius: 6,
  },
});