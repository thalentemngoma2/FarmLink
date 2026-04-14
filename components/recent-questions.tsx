import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming
} from 'react-native-reanimated';
import { GlassCard } from './ui/glass-card';

const recentQuestions = [
  {
    question: 'How to prevent maize stem borers?',
    answers: 12,
    trending: true,
  },
  {
    question: 'Best time to plant tomatoes in South Africa?',
    answers: 8,
    trending: false,
  },
  {
    question: 'Natural remedies for bean aphids',
    answers: 15,
    trending: true,
  },
];

interface RecentQuestionsProps {
  onSelect?: (question: string) => void;
}

export function RecentQuestions({ onSelect }: RecentQuestionsProps) {
  // Container animation
  const containerOpacity = useSharedValue(0);
  const containerTranslateY = useSharedValue(20);

  // Each item's animations (opacity + translateX)
  const itemOpacities = recentQuestions.map(() => useSharedValue(0));
  const itemTranslatesX = recentQuestions.map(() => useSharedValue(-20));

  useEffect(() => {
    // Animate container
    containerOpacity.value = withTiming(1, { duration: 500 });
    containerTranslateY.value = withTiming(0, { duration: 500 });

    // Animate items with staggered delay
    recentQuestions.forEach((_, idx) => {
      const delay = 700 + idx * 100;
      itemOpacities[idx].value = withDelay(delay, withTiming(1, { duration: 400 }));
      itemTranslatesX[idx].value = withDelay(delay, withTiming(0, { duration: 400 }));
    });
  }, []);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
    transform: [{ translateY: containerTranslateY.value }],
  }));

  const handleViewAll = () => {
    // Implement view all action – could navigate to a list of all questions
    console.log('View all pressed');
  };

  return (
    <Animated.View style={[styles.container, containerAnimatedStyle]}>
      {/* Header row */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trending questions</Text>
        <TouchableOpacity onPress={handleViewAll} style={styles.viewAllButton}>
          <Text style={styles.viewAllText}>View all</Text>
          <Ionicons name="arrow-forward" size={12} color="#6366f1" />
        </TouchableOpacity>
      </View>

      {/* List of questions */}
      <View style={styles.list}>
        {recentQuestions.map((item, idx) => {
          const animatedStyle = useAnimatedStyle(() => ({
            opacity: itemOpacities[idx].value,
            transform: [{ translateX: itemTranslatesX[idx].value }],
          }));

          return (
            <Animated.View key={idx} style={animatedStyle}>
              <GlassCard
                style={styles.card}
                onPress={() => onSelect?.(item.question)}
              >
                <View style={styles.cardContent}>
                  {item.trending && (
                    <View style={styles.trendingIconContainer}>
                      <Ionicons name="trending-up" size={14} color="#6366f1" />
                    </View>
                  )}
                  <View style={styles.textContainer}>
                    <Text style={styles.questionText} numberOfLines={1}>
                      {item.question}
                    </Text>
                    <Text style={styles.answerText}>{item.answers} answers</Text>
                  </View>
                </View>
              </GlassCard>
            </Animated.View>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#687076', // text-muted-foreground equivalent
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6366f1', // primary
  },
  list: {
    gap: 8,
  },
  card: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trendingIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(99,102,241,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  questionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#11181C', // text-foreground
  },
  answerText: {
    fontSize: 12,
    color: '#687076', // text-muted-foreground
  },
});