import { BottomNav } from '@/components/bottom-nav';
import { MobileHeader } from '@/components/mobile-header';
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
  withTiming
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

// Types
interface ProfileData {
  id: string;
  name: string;
  avatar: string;
  location: string;
  join_date: string;
  farm_size: string;
  main_crops: string;
  farming_type: string;
  questions_count: number;
  answers_count: number;
  likes_count: number;
}

interface Achievement {
  achievement_id: string;
  earned_at: string;
}

// Static menu items (navigation)
const menuItems = [
  { icon: 'notifications-outline', label: 'Notifications', route: '/notifications', badge: 3 },
  { icon: 'settings-outline', label: 'Settings', route: '/settings' },
  { icon: 'help-circle-outline', label: 'Help & Support', route: '/help' },
  { icon: 'log-out-outline', label: 'Log Out', danger: true },
];

// Achievements list (static labels, earned status from API)
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

  // Get current authenticated user
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        await Promise.all([fetchProfile(user.id), fetchAchievements(user.id)]);
      } else {
        // Not logged in – redirect to login
        router.replace('/login');
      }
      setLoading(false);
    };
    getCurrentUser();
  }, []);

  const fetchProfile = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();
      if (error) throw error;
      setProfile(data);
    } catch (err: any) {
      console.error('Failed to fetch profile', err);
      setError(err.message);
    }
  };

  const fetchAchievements = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('achievement_id, earned_at')
        .eq('user_id', uid);
      if (error) throw error;
      setAchievements(data || []);
    } catch (err: any) {
      console.error('Failed to fetch achievements', err);
    }
  };

  const isEarned = (achievementId: string) => {
    return achievements.some(a => a.achievement_id === achievementId);
  };

  const handleLogout = async () => {
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

  // Background animations
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
          <TouchableOpacity onPress={() => router.replace('/login')} style={styles.errorButton}>
            <Text style={styles.errorButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const joinDate = new Date(profile.join_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

  const navigateToEditProfile = () => {
    router.push('../edit-profile');
  };

  const navigateToEditFarm = () => {
    router.push('../edit-farm');
  };

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
          style={[styles.bgBlob, { left: -width * 0.2, top: -height * 0.2, width: width * 0.6, height: width * 0.6 }, bgBlob1Style]}
        >
          <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} />
        </Animated.View>
        <Animated.View
          style={[styles.bgBlob, { right: -width * 0.2, bottom: -height * 0.2, width: width * 0.7, height: width * 0.7 }, bgBlob2Style]}
        >
          <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} />
        </Animated.View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <MobileHeader />

          {/* Profile header */}
          <Animated.View entering={SlideInDown.duration(500)} style={styles.section}>
            <GlassCard style={styles.profileCard}>
              <View style={styles.profileRow}>
                <View style={styles.avatarContainer}>
                  <LinearGradient colors={['#22c55e', '#16a34a']} style={styles.avatarGradient}>
                    <Text style={styles.avatarText}>
                      {profile.avatar || profile.name.charAt(0).toUpperCase()}
                    </Text>
                  </LinearGradient>
                  <TouchableOpacity style={styles.editAvatar} onPress={navigateToEditProfile} activeOpacity={0.7}>
                    <Ionicons name="pencil" size={14} color="#22c55e" />
                  </TouchableOpacity>
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{profile.name}</Text>
                  <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={12} color="#9ca3af" />
                    <Text style={styles.infoText}>{profile.location || 'Location not set'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={12} color="#9ca3af" />
                    <Text style={styles.infoText}>Joined {joinDate}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{profile.questions_count || 0}</Text>
                  <Text style={styles.statLabel}>Questions</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{profile.answers_count || 0}</Text>
                  <Text style={styles.statLabel}>Answers</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{profile.likes_count || 0}</Text>
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
                      key={item.label}
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
                          earned ? styles.achievementLabelEarned : styles.achievementLabelLocked,
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

          {/* Farm info */}
          <Animated.View entering={FadeIn.delay(150)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="leaf-outline" size={18} color="#22c55e" />
              <Text style={styles.sectionTitle}>My Farm</Text>
            </View>
            <GlassCard style={styles.farmCard}>
              <View style={styles.farmRow}>
                <Text style={styles.farmLabel}>Farm Size</Text>
                <Text style={styles.farmValue}>{profile.farm_size || 'Not specified'}</Text>
              </View>
              <View style={styles.farmRow}>
                <Text style={styles.farmLabel}>Main Crops</Text>
                <Text style={styles.farmValue}>{profile.main_crops || 'Not specified'}</Text>
              </View>
              <View style={styles.farmRow}>
                <Text style={styles.farmLabel}>Farming Type</Text>
                <Text style={styles.farmValue}>{profile.farming_type || 'Not specified'}</Text>
              </View>
              <TouchableOpacity style={styles.editFarmButton} onPress={navigateToEditFarm} activeOpacity={0.8}>
                <Text style={styles.editFarmText}>Edit Farm Details</Text>
              </TouchableOpacity>
            </GlassCard>
          </Animated.View>

          {/* Menu items */}
          <Animated.View entering={FadeIn.delay(200)} style={styles.section}>
            <GlassCard style={styles.menuCard}>
              {menuItems.map((item, idx) => (
                <TouchableOpacity
                  key={item.label}
                  style={[styles.menuItem, idx === menuItems.length - 1 && styles.menuItemLast]}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (item.label === 'Log Out') {
                      handleLogout();
                    } else if (item.route) {
                      router.push(item.route as any);
                    } else {
                      console.log(item.label);
                    }
                  }}
                >
                  <View style={styles.menuLeft}>
                    <Ionicons name={item.icon as any} size={20} color={item.danger ? '#ef4444' : '#9ca3af'} />
                    <Text style={[styles.menuLabel, item.danger && styles.menuLabelDanger]}>{item.label}</Text>
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

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, position: 'relative' },
  scrollContent: { flexGrow: 1, paddingBottom: 80, paddingTop: 120 },
  bgBlob: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(34,197,94,0.2)', overflow: 'hidden' },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  profileCard: { padding: 16 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarContainer: { position: 'relative' },
  avatarGradient: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: 'bold', color: '#11181C', marginBottom: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  infoText: { fontSize: 12, color: '#9ca3af' },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 20, fontWeight: 'bold', color: '#11181C' },
  statLabel: { fontSize: 10, color: '#9ca3af', marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: '#e5e7eb' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#11181C' },
  achievementsCard: { padding: 12 },
  achievementsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  achievementItem: { width: '25%', alignItems: 'center', marginBottom: 12 },
  achievementIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  achievementEarned: { backgroundColor: 'rgba(34,197,94,0.1)' },
  achievementLocked: { backgroundColor: 'rgba(156,163,175,0.1)' },
  achievementLabel: { fontSize: 9, textAlign: 'center' },
  achievementLabelEarned: { color: '#11181C' },
  achievementLabelLocked: { color: '#9ca3af' },
  farmCard: { padding: 16 },
  farmRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  farmLabel: { fontSize: 14, color: '#687076' },
  farmValue: { fontSize: 14, fontWeight: '500', color: '#11181C' },
  editFarmButton: { marginTop: 8, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(34,197,94,0.1)', alignItems: 'center' },
  editFarmText: { fontSize: 14, fontWeight: '500', color: '#22c55e' },
  menuCard: { overflow: 'hidden' },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  menuItemLast: { borderBottomWidth: 0 },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuLabel: { fontSize: 14, color: '#11181C' },
  menuLabelDanger: { color: '#ef4444' },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { backgroundColor: '#22c55e', borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2, minWidth: 20, alignItems: 'center' },
  badgeText: { fontSize: 10, fontWeight: '600', color: 'white' },
  version: { textAlign: 'center', fontSize: 10, color: '#9ca3af', marginVertical: 24 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { marginTop: 12, fontSize: 16, color: '#ef4444', textAlign: 'center' },
  errorButton: { marginTop: 24, backgroundColor: '#22c55e', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  errorButtonText: { color: 'white', fontWeight: '600' },
});