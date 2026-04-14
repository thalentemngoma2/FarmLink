//let remove the bouncing animation for the nav bar 
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  interpolate,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNav } from '@/components/bottom-nav';
import { MobileHeader } from '@/components/mobile-header';
import { GlassCard } from '@/components/ui/glass-card';

// Course data with icon mapping
const courses = [
  {
    id: 1,
    title: 'Maize Farming Fundamentals',
    description: 'Learn the basics of growing healthy maize crops from seed to harvest',
    lessons: 12,
    duration: '2h 30m',
    rating: 4.8,
    enrolled: 1234,
    icon: 'leaf-outline',
    color: ['#22c55e', '#16a34a'] as const,
    progress: 65,
  },
  {
    id: 2,
    title: 'Pest & Disease Management',
    description: 'Identify and control common pests and diseases in your crops',
    lessons: 8,
    duration: '1h 45m',
    rating: 4.9,
    enrolled: 987,
    icon: 'bug-outline',
    color: ['#ef4444', '#f97316'] as const,
    progress: 0,
  },
  {
    id: 3,
    title: 'Smart Irrigation Techniques',
    description: 'Water-efficient methods for maximum crop yield',
    lessons: 6,
    duration: '1h 15m',
    rating: 4.7,
    enrolled: 756,
    icon: 'water-outline',
    color: ['#3b82f6', '#06b6d4'] as const,
    progress: 30,
  },
  {
    id: 4,
    title: 'Market Your Produce',
    description: 'Strategies to get the best prices for your harvest',
    lessons: 5,
    duration: '1h',
    rating: 4.6,
    enrolled: 543,
    icon: 'trending-up-outline',
    color: ['#a855f7', '#ec4899'] as const,
    progress: 0,
  },
];

const quickTips = [
  { id: 1, title: 'When to plant maize', duration: '3 min', views: '12K' },
  { id: 2, title: 'DIY organic pesticide', duration: '5 min', views: '8.5K' },
  { id: 3, title: 'Soil pH testing', duration: '4 min', views: '6.2K' },
];

export default function LearnPage() {
  const [activeTab, setActiveTab] = useState<'courses' | 'tips'>('courses');

  // Background animation values
  const bgScale = useSharedValue(1);
  const bgOpacity = useSharedValue(0.3);
  const bgScale2 = useSharedValue(1.2);
  const bgOpacity2 = useSharedValue(0.2);

  React.useEffect(() => {
    bgScale.value = withRepeat(withTiming(1.2, { duration: 8000 }), -1, true);
    bgOpacity.value = withRepeat(withTiming(0.5, { duration: 10000 }), -1, true);
    bgScale2.value = withRepeat(withTiming(1, { duration: 10000 }), -1, true);
    bgOpacity2.value = withRepeat(withTiming(0.4, { duration: 10000 }), -1, true);
  }, []);

  const bgBlob1Style = useAnimatedStyle(() => ({
    transform: [{ scale: bgScale.value }],
    opacity: interpolate(bgOpacity.value, [0.3, 0.5], [0.3, 0.5]),
  }));

  const bgBlob2Style = useAnimatedStyle(() => ({
    transform: [{ scale: bgScale2.value }],
    opacity: interpolate(bgOpacity2.value, [0.2, 0.4], [0.2, 0.4]),
  }));

  const { width, height } = Dimensions.get('window');

  // Animated progress bar for each course (only used for course with progress > 0)
  // We'll handle inside the map

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        {/* Background */}
        <LinearGradient
          colors={['#f0fdf4', '#ffffff', '#ecfdf5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          style={[
            styles.bgBlob,
            { left: -width * 0.2, top: -height * 0.2, width: width * 0.6, height: width * 0.6 },
            bgBlob1Style,
          ]}
        >
          <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} />
        </Animated.View>
        <Animated.View
          style={[
            styles.bgBlob,
            { right: -width * 0.2, bottom: -height * 0.2, width: width * 0.7, height: width * 0.7 },
            bgBlob2Style,
          ]}
        >
          <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} />
        </Animated.View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <MobileHeader />

          {/* Page header */}
          <Animated.View entering={SlideInDown.duration(500)} style={styles.header}>
            <View style={styles.headerRow}>
              <Ionicons name="book-outline" size={28} color="#22c55e" />
              <Text style={styles.headerTitle}>Learn</Text>
            </View>
            <Text style={styles.headerSubtitle}>Improve your farming skills</Text>
          </Animated.View>

          {/* Progress Card */}
          <Animated.View entering={FadeIn.delay(100)} style={styles.progressCard}>
            <GlassCard style={styles.progressGlass}>
              <LinearGradient
                colors={['#22c55e', '#16a34a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.progressGradient}
              >
                <View style={styles.progressHeader}>
                  <View>
                    <Text style={styles.progressLabel}>Your Progress</Text>
                    <Text style={styles.progressValue}>2 Courses</Text>
                    <Text style={styles.progressSub}>in progress</Text>
                  </View>
                  <View style={styles.awardIcon}>
                    <Ionicons name="trophy-outline" size={32} color="white" />
                  </View>
                </View>
              </LinearGradient>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>15</Text>
                  <Text style={styles.statLabel}>Lessons Done</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>4.5h</Text>
                  <Text style={styles.statLabel}>Time Spent</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>3</Text>
                  <Text style={styles.statLabel}>Certificates</Text>
                </View>
              </View>
            </GlassCard>
          </Animated.View>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'courses' && styles.tabActive]}
              onPress={() => setActiveTab('courses')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === 'courses' && styles.tabTextActive]}>
                Courses
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'tips' && styles.tabActive]}
              onPress={() => setActiveTab('tips')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === 'tips' && styles.tabTextActive]}>
                Quick Tips
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          {activeTab === 'courses' ? (
            <View style={styles.coursesGrid}>
              {courses.map((course, index) => {
                // Progress bar animation for this course
                const progressWidth = useSharedValue(0);
                React.useEffect(() => {
                  progressWidth.value = withDelay(500, withTiming(course.progress, { duration: 1000 }));
                }, []);
                const progressStyle = useAnimatedStyle(() => ({
                  width: `${progressWidth.value}%`,
                }));

                return (
                  <Animated.View
                    key={course.id}
                    entering={FadeIn.delay(200 + index * 50)}
                    style={styles.courseCard}
                  >
                    <GlassCard style={styles.courseGlass}>
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => console.log('Open course', course.id)}
                      >
                        <View style={styles.courseRow}>
                          <LinearGradient
                            colors={course.color}
                            style={styles.courseIcon}
                          >
                            <Ionicons name={course.icon as any} size={28} color="white" />
                          </LinearGradient>
                          <View style={styles.courseInfo}>
                            <Text style={styles.courseTitle}>{course.title}</Text>
                            <Text style={styles.courseDesc} numberOfLines={1}>
                              {course.description}
                            </Text>
                            <View style={styles.courseMeta}>
                              <View style={styles.metaItem}>
                                <Ionicons name="book-outline" size={12} color="#9ca3af" />
                                <Text style={styles.metaText}>{course.lessons} lessons</Text>
                              </View>
                              <View style={styles.metaItem}>
                                <Ionicons name="time-outline" size={12} color="#9ca3af" />
                                <Text style={styles.metaText}>{course.duration}</Text>
                              </View>
                              <View style={styles.metaItem}>
                                <Ionicons name="star" size={12} color="#fbbf24" />
                                <Text style={styles.metaText}>{course.rating}</Text>
                              </View>
                            </View>
                          </View>
                          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                        </View>
                        {course.progress > 0 && (
                          <View style={styles.progressContainer}>
                            <View style={styles.progressHeaderRow}>
                              <Text style={styles.progressLabelText}>Progress</Text>
                              <Text style={styles.progressPercent}>{course.progress}%</Text>
                            </View>
                            <View style={styles.progressBarTrack}>
                              <Animated.View style={[styles.progressBarFill, progressStyle]} />
                            </View>
                          </View>
                        )}
                      </TouchableOpacity>
                    </GlassCard>
                  </Animated.View>
                );
              })}
            </View>
          ) : (
            <View style={styles.tipsList}>
              {quickTips.map((tip, index) => (
                <Animated.View
                  key={tip.id}
                  entering={FadeIn.delay(200 + index * 50)}
                  style={styles.tipCard}
                >
                  <GlassCard style={styles.tipGlass}>
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => console.log('Play tip', tip.id)}
                      style={styles.tipRow}
                    >
                      <View style={styles.tipIcon}>
                        <Ionicons name="play" size={20} color="#22c55e" />
                      </View>
                      <View style={styles.tipInfo}>
                        <Text style={styles.tipTitle}>{tip.title}</Text>
                        <View style={styles.tipMeta}>
                          <Text style={styles.tipDuration}>{tip.duration}</Text>
                          <Text style={styles.tipViews}>{tip.views} views</Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                    </TouchableOpacity>
                  </GlassCard>
                </Animated.View>
              ))}
            </View>
          )}
        </ScrollView>

        <BottomNav />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, position: 'relative' },
  scrollContent: { flexGrow: 1, paddingBottom: 80, paddingTop: 90 },
  bgBlob: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(34,197,94,0.2)', overflow: 'hidden' },
  header: { paddingHorizontal: 16, marginTop: 16, marginBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#11181C' },
  headerSubtitle: { fontSize: 14, color: '#687076' },
  progressCard: { paddingHorizontal: 16, marginBottom: 16 },
  progressGlass: { overflow: 'hidden', padding: 0 },
  progressGradient: { padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  progressValue: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  progressSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  awardIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12, backgroundColor: 'white' },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 18, fontWeight: 'bold', color: '#11181C' },
  statLabel: { fontSize: 10, color: '#9ca3af' },
  statDivider: { width: 1, height: 24, backgroundColor: '#e5e7eb' },
  tabsContainer: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center' },
  tabActive: { backgroundColor: '#22c55e', shadowColor: '#22c55e', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
  tabText: { fontSize: 14, fontWeight: '500', color: '#687076' },
  tabTextActive: { color: 'white' },
  coursesGrid: { paddingHorizontal: 12, gap: 12 },
  courseCard: { marginBottom: 8 },
  courseGlass: { padding: 12 },
  courseRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  courseIcon: { width: 56, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  courseInfo: { flex: 1 },
  courseTitle: { fontSize: 16, fontWeight: '600', color: '#11181C' },
  courseDesc: { fontSize: 12, color: '#687076', marginTop: 2 },
  courseMeta: { flexDirection: 'row', gap: 12, marginTop: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 10, color: '#9ca3af' },
  progressContainer: { marginTop: 12 },
  progressHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  progressLabelText: { fontSize: 10, color: '#9ca3af' },
  progressPercent: { fontSize: 10, fontWeight: '500', color: '#22c55e' },
  progressBarTrack: { height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#22c55e', borderRadius: 2 },
  tipsList: { paddingHorizontal: 16, gap: 12 },
  tipCard: { marginBottom: 4 },
  tipGlass: { padding: 12 },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tipIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(34,197,94,0.1)', alignItems: 'center', justifyContent: 'center' },
  tipInfo: { flex: 1 },
  tipTitle: { fontSize: 14, fontWeight: '500', color: '#11181C' },
  tipMeta: { flexDirection: 'row', gap: 8, marginTop: 2 },
  tipDuration: { fontSize: 10, color: '#9ca3af' },
  tipViews: { fontSize: 10, color: '#9ca3af' },
});