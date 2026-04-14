import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Extrapolate,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

// Type definitions
interface SuggestionCardProps {
  title: string;
  preview: string;
  replies: number;
  likes: number;
  timeAgo: string;
  relevanceScore: number;
  category: string;
  onClick?: () => void;
  index?: number;
}

const { width: screenWidth } = Dimensions.get('window');

export const SuggestionCard: React.FC<SuggestionCardProps> = ({
  title,
  preview,
  replies,
  likes,
  timeAgo,
  relevanceScore,
  category,
  onClick,
  index = 0,
}) => {
  // Animation values
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const scale = useSharedValue(0.95);
  const barWidth = useSharedValue(0);

  // Start animations after mount
  React.useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    translateY.value = withTiming(0, { duration: 400 });
    scale.value = withSpring(1, { damping: 12, stiffness: 100 });

    // Apply delay using withDelay
    barWidth.value = withDelay(
      200 + index * 100,
      withTiming(relevanceScore, { duration: 800 })
    );
  }, [opacity, translateY, scale, barWidth, relevanceScore, index]);

  // Animated styles for container
  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  // Animated style for relevance bar width
  const barAnimatedStyle = useAnimatedStyle(() => ({
    width: `${barWidth.value}%`,
  }));

  // For press effects
  const pressScale = useSharedValue(1);
  const pressAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const handlePressIn = () => {
    pressScale.value = withSpring(0.98);
  };

  const handlePressOut = () => {
    pressScale.value = withSpring(1);
  };

  const handlePress = () => {
    if (onClick) {
      runOnJS(onClick)();
    }
  };

  return (
    <Animated.View style={[styles.container, containerAnimatedStyle]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        style={styles.touchable}
      >
        <Animated.View style={[styles.glassWrapper, pressAnimatedStyle]}>
          <View style={styles.content}>
            {/* Header row: category badge + relevance indicator */}
            <View style={styles.headerRow}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{category}</Text>
              </View>
              {relevanceScore >= 85 && (
                <Animated.View
                  style={[
                    styles.bestMatchBadge,
                    {
                      transform: [
                        {
                          scale: interpolate(opacity.value, [0, 1], [0, 1], Extrapolate.CLAMP),
                        },
                      ],
                    },
                  ]}
                >
                  <Ionicons name="sparkles" size={12} color="#FFD966" />
                  <Text style={styles.bestMatchText}>Best match</Text>
                </Animated.View>
              )}
            </View>

            {/* Title */}
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>

            {/* Preview */}
            <Text style={styles.preview} numberOfLines={2}>
              {preview}
            </Text>

            {/* Stats row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons name="chatbubble-outline" size={14} color="#666" />
                <Text style={styles.statText}>{replies} replies</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="thumbs-up-outline" size={14} color="#666" />
                <Text style={styles.statText}>{likes}</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="time-outline" size={14} color="#666" />
                <Text style={styles.statText}>{timeAgo}</Text>
              </View>
            </View>

            {/* Relevance section */}
            <View style={styles.relevanceContainer}>
              <View style={styles.relevanceHeader}>
                <Text style={styles.relevanceLabel}>Match relevance</Text>
                <Text style={styles.relevanceValue}>{relevanceScore}%</Text>
              </View>
              <View style={styles.relevanceBarBackground}>
                <Animated.View style={[styles.relevanceBarFill, barAnimatedStyle]}>
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: '#6366f1' }]} />
                </Animated.View>
              </View>
            </View>

            {/* Arrow indicator */}
            <View style={styles.arrowContainer}>
              <Ionicons name="chevron-forward" size={20} color="#6366f1" />
            </View>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  touchable: {
    width: '100%',
  },
  glassWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.85)', // semi-transparent glass-like background
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',
    elevation: 5,
  },
  content: {
    padding: 16,
    position: 'relative',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  categoryBadge: {
    backgroundColor: 'rgba(99,102,241,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366f1',
  },
  bestMatchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(168,85,247,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 4,
  },
  bestMatchText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#a855f7',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#11181C',
    marginBottom: 8,
    lineHeight: 22,
  },
  preview: {
    fontSize: 14,
    color: '#687076',
    marginBottom: 12,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 12,
    color: '#687076',
  },
  relevanceContainer: {
    marginTop: 4,
    marginBottom: 8,
  },
  relevanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  relevanceLabel: {
    fontSize: 12,
    color: '#687076',
  },
  relevanceValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366f1',
  },
  relevanceBarBackground: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  relevanceBarFill: {
    height: '100%',
    borderRadius: 3,
    overflow: 'hidden',
  },
  arrowContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(99,102,241,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});