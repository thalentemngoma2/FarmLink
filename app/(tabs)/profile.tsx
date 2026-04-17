// app/(tabs)/profile.tsx
import { BottomNav } from '@/components/bottom-nav';
import { GlassCard } from '@/components/ui/glass-card';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
interface ProfileData {
  id: string;
  name: string | null;
  avatar: string | null;
  location: string | null;
  join_date: string | null;
  farm_size: string | null;
  main_crops: string | null;
  farming_type: string | null;
  questions_count: number;
  answers_count: number;
  likes_count: number;
  email: string | null;
}

interface Achievement {
  achievement_id: string;
  earned_at: string;
}

const menuItems = [
  { icon: 'notifications-outline', label: 'Notifications', route: '/notifications', badge: 3 },
  { icon: 'settings-outline', label: 'Settings', route: '/settings' },
  { icon: 'help-circle-outline', label: 'Help & Support', route: '/help' },
  { icon: 'log-out-outline', label: 'Log Out', danger: true },
];

const achievementsList = [
  { id: 'first_question', icon: 'chatbubble-outline', label: 'First Question' },
  { id: 'helpful_answer', icon: 'heart-outline', label: 'Helpful Answer' },
  { id: 'top_contributor', icon: 'trophy-outline', label: 'Top Contributor' },
  { id: 'farming_expert', icon: 'leaf-outline', label: 'Farming Expert' },
];

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // 1. Load user and profile on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const loadUserAndProfile = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          router.replace('/login');
          return;
        }

        // Try fetching existing profile
        let profileData = await fetchProfile(user.id);

        // If none exists, create a default one
        if (!profileData) {
          console.log('No profile found, creating one...');
          profileData = await createDefaultProfile(user.id, user.email);
        }

        if (profileData) {
          setProfile(profileData);
        } else {
          throw new Error('Could not load or create profile');
        }

        // Achievements are optional — failures are non-fatal
        await fetchAchievements(user.id);
      } catch (err: any) {
        console.error('Profile loading error', err);
        setError(err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    loadUserAndProfile();
  }, []);

  // ---------------------------------------------------------------------------
  // 2. Fetch profile — maybeSingle() so 0 rows returns null, not an error
  // ---------------------------------------------------------------------------
  const fetchProfile = async (uid: string): Promise<ProfileData | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();

    if (error) {
      console.error('Failed to fetch profile', error);
      return null;
    }

    if (!data) return null;

    return {
      ...data,
      questions_count: data.questions_count ?? 0,
      answers_count: data.answers_count ?? 0,
      likes_count: data.likes_count ?? 0,
    };
  };

  // ---------------------------------------------------------------------------
  // 3. Create default profile — tries insert first, then upsert as fallback
  // ---------------------------------------------------------------------------
  const createDefaultProfile = async (
    uid: string,
    email?: string
  ): Promise<ProfileData | null> => {
    const defaultProfile = {
      id: uid,
      name: email?.split('@')[0] || 'Farmer',
      avatar: '🌾',
      location: null,
      join_date: new Date().toISOString(),
      farm_size: null,
      main_crops: null,
      farming_type: null,
      questions_count: 0,
      answers_count: 0,
      likes_count: 0,
      email: email || null,
      online: false,
      last_seen: null,
    };

    // First attempt: insert (most straightforward)
    const { error: insertError } = await supabase
      .from('profiles')
      .insert(defaultProfile);

    if (!insertError) {
      // Success, fetch the newly created profile
      return fetchProfile(uid);
    }

    console.warn('Insert failed, trying upsert:', insertError);

    // Fallback: upsert
    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert(defaultProfile, { onConflict: 'id' });

    if (upsertError) {
      console.error('Upsert also failed:', upsertError);
      return null;
    }

    // Re-fetch after upsert
    return fetchProfile(uid);
  };

  // ---------------------------------------------------------------------------
  // 4. Fetch achievements — gracefully skips if table doesn't exist
  // ---------------------------------------------------------------------------
  const fetchAchievements = async (uid: string) => {
    const { data, error } = await supabase
      .from('user_achievements')
      .select('achievement_id, earned_at')
      .eq('user_id', uid);

    if (error) {
      if (error.code === '42P01') {
        console.log('Achievements table not found, skipping');
      } else {
        console.warn('Achievements fetch error', error);
      }
      return;
    }

    if (data) setAchievements(data);
  };

  const isEarned = (achievementId: string) =>
    achievements.some((a) => a.achievement_id === achievementId);

  // ---------------------------------------------------------------------------
  // 5. Logout
  // ---------------------------------------------------------------------------
  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace('/login');
          },
        },
      ],
      { cancelable: true }
    );
  };

  // ---------------------------------------------------------------------------
  // 6. Background animations
  // ---------------------------------------------------------------------------
  const bgScale = useSharedValue(1);
  const bgOpacity = useSharedValue(0.3);
  const bgScale2 = useSharedValue(1.2);
  const bgOpacity2 = useSharedValue(0.2);

  useEffect(() => {
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

  // ---------------------------------------------------------------------------
  // 7. Loading / Error states
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22c55e" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={styles.errorText}>{error || 'Profile not found'}</Text>
          <TouchableOpacity
            onPress={() => router.replace('/login')}
            style={styles.errorButton}
          >
            <Text style={styles.errorButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const joinDate = profile.join_date
    ? new Date(profile.join_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
      })
    : 'Recently';

  // ---------------------------------------------------------------------------
  // 8. Render with back button
  // ---------------------------------------------------------------------------
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
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

        {/* Custom Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#11181C" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 40 }} /> {/* Placeholder for alignment */}
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Header */}
          <Animated.View entering={SlideInDown.duration(500)} style={styles.section}>
            <GlassCard style={styles.profileCard}>
              <View style={styles.profileRow}>
                <View style={styles.avatarContainer}>
                  <LinearGradient
                    colors={['#22c55e', '#16a34a']}
                    style={styles.avatarGradient}
                  >
                    <Text style={styles.avatarText}>
                      {profile.avatar && profile.avatar.length === 1
                        ? profile.avatar
                        : (profile.name?.[0] || '🌾').toUpperCase()}
                    </Text>
                  </LinearGradient>
                  <TouchableOpacity
                    style={styles.editAvatar}
                    onPress={() => router.push('/edit-profile')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="pencil" size={14} color="#22c55e" />
                  </TouchableOpacity>
                </View>

                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{profile.name || 'Farmer'}</Text>
                  <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={12} color="#9ca3af" />
                    <Text style={styles.infoText}>
                      {profile.location || 'Location not set'}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={12} color="#9ca3af" />
                    <Text style={styles.infoText}>Joined {joinDate}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{profile.questions_count}</Text>
                  <Text style={styles.statLabel}>Questions</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{profile.answers_count}</Text>
                  <Text style={styles.statLabel}>Answers</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{profile.likes_count}</Text>
                  <Text style={styles.statLabel}>Likes</Text>
                </View>
              </View>
            </GlassCard>
          </Animated.View>

          {/* Achievements */}
          <Animated.View entering={FadeIn.delay(100)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="trophy-outline" size={18} color="#22c55e" />
              <Text style={styles.sectionTitle}>Achievements</Text>
            </View>
            <GlassCard style={styles.achievementsCard}>
              <View style={styles.achievementsGrid}>
                {achievementsList.map((item, idx) => {
                  const earned = isEarned(item.id);
                  return (
                    <Animated.View
                      key={item.id}
                      entering={FadeIn.delay(200 + idx * 50)}
                      style={styles.achievementItem}
                    >
                      <View
                        style={[
                          styles.achievementIcon,
                          earned ? styles.achievementEarned : styles.achievementLocked,
                        ]}
                      >
                        <Ionicons
                          name={item.icon as any}
                          size={20}
                          color={earned ? '#22c55e' : '#9ca3af'}
                        />
                      </View>
                      <Text
                        style={[
                          styles.achievementLabel,
                          earned
                            ? styles.achievementLabelEarned
                            : styles.achievementLabelLocked,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </Animated.View>
                  );
                })}
              </View>
            </GlassCard>
          </Animated.View>

          {/* Farm Info */}
          <Animated.View entering={FadeIn.delay(150)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="leaf-outline" size={18} color="#22c55e" />
              <Text style={styles.sectionTitle}>My Farm</Text>
            </View>
            <GlassCard style={styles.farmCard}>
              <View style={styles.farmRow}>
                <Text style={styles.farmLabel}>Farm Size</Text>
                <Text style={styles.farmValue}>
                  {profile.farm_size || 'Not specified'}
                </Text>
              </View>
              <View style={styles.farmRow}>
                <Text style={styles.farmLabel}>Main Crops</Text>
                <Text style={styles.farmValue}>
                  {profile.main_crops || 'Not specified'}
                </Text>
              </View>
              <View style={styles.farmRow}>
                <Text style={styles.farmLabel}>Farming Type</Text>
                <Text style={styles.farmValue}>
                  {profile.farming_type || 'Not specified'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.editFarmButton}
                onPress={() => router.push('/edit-farm')}
                activeOpacity={0.8}
              >
                <Text style={styles.editFarmText}>Edit Farm Details</Text>
              </TouchableOpacity>
            </GlassCard>
          </Animated.View>

          {/* Menu */}
          <Animated.View entering={FadeIn.delay(200)} style={styles.section}>
            <GlassCard style={styles.menuCard}>
              {menuItems.map((item, idx) => (
                <TouchableOpacity
                  key={item.label}
                  style={[
                    styles.menuItem,
                    idx === menuItems.length - 1 && styles.menuItemLast,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (item.label === 'Log Out') {
                      handleLogout();
                    } else if (item.route) {
                      router.push(item.route as any);
                    }
                  }}
                >
                  <View style={styles.menuLeft}>
                    <Ionicons
                      name={item.icon as any}
                      size={20}
                      color={item.danger ? '#ef4444' : '#9ca3af'}
                    />
                    <Text
                      style={[styles.menuLabel, item.danger && styles.menuLabelDanger]}
                    >
                      {item.label}
                    </Text>
                  </View>
                  <View style={styles.menuRight}>
                    {item.badge && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.badge}</Text>
                      </View>
                    )}
                    <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                  </View>
                </TouchableOpacity>
              ))}
            </GlassCard>
          </Animated.View>

          <Text style={styles.version}>FarmLink v1.0.0</Text>
        </ScrollView>

        <BottomNav />
      </View>
    </SafeAreaView>
  );
}

// -----------------------------------------------------------------------------
// Styles (added header styles)
// -----------------------------------------------------------------------------
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, position: 'relative' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: 'transparent',
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#11181C' },
  scrollContent: { flexGrow: 1, paddingBottom: 80, paddingTop: 0 },
  bgBlob: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(34,197,94,0.2)',
    overflow: 'hidden',
  },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  profileCard: { padding: 16 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarContainer: { position: 'relative' },
  avatarGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: 'white' },
  editAvatar: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: 'bold', color: '#11181C', marginBottom: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  infoText: { fontSize: 12, color: '#9ca3af' },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 20, fontWeight: 'bold', color: '#11181C' },
  statLabel: { fontSize: 10, color: '#9ca3af', marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: '#e5e7eb' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#11181C' },
  achievementsCard: { padding: 12 },
  achievementsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  achievementItem: { width: '25%', alignItems: 'center', marginBottom: 12 },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  achievementEarned: { backgroundColor: 'rgba(34,197,94,0.1)' },
  achievementLocked: { backgroundColor: 'rgba(156,163,175,0.1)' },
  achievementLabel: { fontSize: 9, textAlign: 'center' },
  achievementLabelEarned: { color: '#11181C' },
  achievementLabelLocked: { color: '#9ca3af' },
  farmCard: { padding: 16 },
  farmRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  farmLabel: { fontSize: 14, color: '#687076' },
  farmValue: { fontSize: 14, fontWeight: '500', color: '#11181C' },
  editFarmButton: {
    marginTop: 8,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(34,197,94,0.1)',
    alignItems: 'center',
  },
  editFarmText: { fontSize: 14, fontWeight: '500', color: '#22c55e' },
  menuCard: { overflow: 'hidden' },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  menuItemLast: { borderBottomWidth: 0 },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuLabel: { fontSize: 14, color: '#11181C' },
  menuLabelDanger: { color: '#ef4444' },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: {
    backgroundColor: '#22c55e',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: { fontSize: 10, fontWeight: '600', color: 'white' },
  version: { textAlign: 'center', fontSize: 10, color: '#9ca3af', marginVertical: 24 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { marginTop: 12, fontSize: 16, color: '#ef4444', textAlign: 'center' },
  errorButton: {
    marginTop: 24,
    backgroundColor: '#22c55e',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  errorButtonText: { color: 'white', fontWeight: '600' },
});