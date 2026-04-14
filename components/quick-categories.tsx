import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

// Map Lucide icons to Ionicons names (adjust as needed)
const categoryIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  Crops: 'leaf-outline',
  Pests: 'bug-outline',
  Irrigation: 'water-outline',
  Weather: 'sunny-outline',
  Soil: 'flower-outline',
  Equipment: 'hardware-chip-outline',
};

const categories = [
  { icon: 'leaf-outline', label: 'Crops', color: ['#facc15', '#f59e0b'] as const }, // yellow to amber
  { icon: 'bug-outline', label: 'Pests', color: ['#f87171', '#e11d48'] as const }, // red to rose
  { icon: 'water-outline', label: 'Irrigation', color: ['#60a5fa', '#06b6d4'] as const }, // blue to cyan
  { icon: 'sunny-outline', label: 'Weather', color: ['#fb923c', '#facc15'] as const }, // orange to yellow
  { icon: 'flower-outline', label: 'Soil', color: ['#34d399', '#22c55e'] as const }, // emerald to green
  { icon: 'hardware-chip-outline', label: 'Equipment', color: ['#9ca3af', '#334155'] as const }, // gray to slate
];

interface QuickCategoriesProps {
  onSelect?: (category: string) => void;
}

export const QuickCategories: React.FC<QuickCategoriesProps> = ({ onSelect }) => {
  // Container animation values
  const containerOpacity = useSharedValue(0);
  const containerTranslateY = useSharedValue(20);

  useEffect(() => {
    containerOpacity.value = withTiming(1, { duration: 500 });
    containerTranslateY.value = withTiming(0, { duration: 500 });
  }, []);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
    transform: [{ translateY: containerTranslateY.value }],
  }));

  // For each button we'll store its scale value and delay animation
  const scale0 = useSharedValue(0.8);
  const scale1 = useSharedValue(0.8);
  const scale2 = useSharedValue(0.8);
  const scale3 = useSharedValue(0.8);
  const scale4 = useSharedValue(0.8);
  const scale5 = useSharedValue(0.8);
  const buttonScales = [scale0, scale1, scale2, scale3, scale4, scale5];

  const opacity0 = useSharedValue(0);
  const opacity1 = useSharedValue(0);
  const opacity2 = useSharedValue(0);
  const opacity3 = useSharedValue(0);
  const opacity4 = useSharedValue(0);
  const opacity5 = useSharedValue(0);
  const buttonOpacities = [opacity0, opacity1, opacity2, opacity3, opacity4, opacity5];

  const animatedStyle0 = useAnimatedStyle(() => ({
    opacity: opacity0.value,
    transform: [{ scale: scale0.value }],
  }));
  const animatedStyle1 = useAnimatedStyle(() => ({
    opacity: opacity1.value,
    transform: [{ scale: scale1.value }],
  }));
  const animatedStyle2 = useAnimatedStyle(() => ({
    opacity: opacity2.value,
    transform: [{ scale: scale2.value }],
  }));
  const animatedStyle3 = useAnimatedStyle(() => ({
    opacity: opacity3.value,
    transform: [{ scale: scale3.value }],
  }));
  const animatedStyle4 = useAnimatedStyle(() => ({
    opacity: opacity4.value,
    transform: [{ scale: scale4.value }],
  }));
  const animatedStyle5 = useAnimatedStyle(() => ({
    opacity: opacity5.value,
    transform: [{ scale: scale5.value }],
  }));
  const animatedStyles = [animatedStyle0, animatedStyle1, animatedStyle2, animatedStyle3, animatedStyle4, animatedStyle5];

  useEffect(() => {
    categories.forEach((_, idx) => {
      const delay = 500 + idx * 50;
      buttonOpacities[idx].value = withDelay(delay, withTiming(1, { duration: 300 }));
      buttonScales[idx].value = withDelay(delay, withTiming(1, { duration: 300 }));
    });
  }, []);

  const handlePress = (label: string) => {
    if (onSelect) {
      runOnJS(onSelect)(label);
    }
  };

  const handlePressIn = (idx: number) => {
    buttonScales[idx].value = withSpring(0.95);
  };

  const handlePressOut = (idx: number) => {
    buttonScales[idx].value = withSpring(1);
  };

  return (
    <Animated.View style={[styles.container, containerAnimatedStyle]}>
      <Text style={styles.title}>Browse by topic</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {categories.map((category, idx) => {
          return (
            <Animated.View key={category.label} style={[styles.buttonWrapper, animatedStyles[idx]]}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handlePress(category.label)}
                onPressIn={() => handlePressIn(idx)}
                onPressOut={() => handlePressOut(idx)}
              >
                <LinearGradient
                  colors={category.color}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconGradient}
                >
                  <Ionicons name={category.icon as any} size={20} color="white" />
                </LinearGradient>
                <Text style={styles.label}>{category.label}</Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: '#687076', // text-muted-foreground
    marginBottom: 12,
    marginHorizontal: 16,
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  buttonWrapper: {
    alignItems: 'center',
  },
  iconGradient: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',
    elevation: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: '#11181C', // text-foreground
    textAlign: 'center',
  },
});