// app/(tabs)/profile.tsx
import { BottomNav } from '@/components/bottom-nav';
import { GlassCard } from '@/components/ui/glass-card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

<<<<<<< HEAD

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
  isRetailer?: boolean;
=======
// -----------------------------------------------------------------------------
// Types (based on public.users table only)
// -----------------------------------------------------------------------------
interface UserData {
  user_id: string;
  username: string;
  email: string;
  phone_number: string | null;
  role: string;
  created_at: string;
}

interface UserStats {
  questions_count: number;
  answers_count: number;
  likes_count: number;      // likes received on user's posts
>>>>>>> remotes/gozilethu/farmlink-Mbutho
}

interface Achievement {
  achievement_id: string;
  earned_at: string;
}

<<<<<<< HEAD
// Hardcoded menu items (these are static UI, not profile data)
=======
// Static menu items
>>>>>>> remotes/gozilethu/farmlink-Mbutho
const menuItems = [
  { icon: 'notifications-outline', label: 'Notifications', badge: 3 },
  { icon: 'settings-outline', label: 'Settings' },
  { icon: 'help-circle-outline', label: 'Help & Support' },
  { icon: 'log-out-outline', label: 'Log Out', danger: true },
];

<<<<<<< HEAD
// Achievements definition (static labels, earned status from API)
=======
>>>>>>> remotes/gozilethu/farmlink-Mbutho
const achievementsList = [
  { id: 'first_question', icon: 'chatbubble-outline', label: 'First Question' },
  { id: 'helpful_answer', icon: 'heart-outline', label: 'Helpful Answer' },
  { id: 'top_contributor', icon: 'trophy-outline', label: 'Top Contributor' },
  { id: 'farming_expert', icon: 'leaf-outline', label: 'Farming Expert' },
];

export default function ProfilePage() {
  const router = useRouter();
<<<<<<< HEAD
   const [profile, setProfile] = useState<ProfileData | null>(null);
   const [achievements, setAchievements] = useState<Achievement[]>([]);
   const [loading, setLoading] = useState(true);
   const { user, logout, isLoading: authLoading } = useAuth();

   // Determine user role from AuthContext
   const userRole = user?.role || 'farmer';
=======
  const [userData, setUserData] = useState<UserData | null>(null);
  const [stats, setStats] = useState<UserStats>({ questions_count: 0, answers_count: 0, likes_count: 0 });
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
>>>>>>> remotes/gozilethu/farmlink-Mbutho

  // ---------------------------------------------------------------------------
  // Load user & stats (with auto‑creation of missing user)
  // ---------------------------------------------------------------------------
  useEffect(() => {
<<<<<<< HEAD
    const fetchProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      setLoading(true);

      try {
        // Try to fetch farmer profile first
        const { data: farmerData } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();

        if (farmerData) {
          setProfile({
            id: farmerData.user_id,
            name: farmerData.full_name || user.name || 'Farmer',
            avatar: (farmerData.full_name || user.name || 'F').charAt(0).toUpperCase(),
            location: farmerData.location || user.location || 'Location not set',
            join_date: farmerData.created_at || user.createdAt || new Date().toISOString(),
            farm_size: farmerData.farm_size || 'Not set',
            main_crops: farmerData.main_crops || 'Not set',
            farming_type: farmerData.farm_type || 'Not set',
            questions_count: 0,
            answers_count: 0,
            likes_count: 0,
            isRetailer: false,
          });
        } else {
          // Try to fetch retail profile if farmer isn't found
          const { data: retailData } = await supabase.from('retail_profiles').select('*').eq('user_id', user.id).maybeSingle();
          if (retailData) {
            setProfile({
              id: retailData.user_id,
              name: retailData.store_name || user.name || 'Retailer',
              avatar: (retailData.store_name || user.name || 'R').charAt(0).toUpperCase(),
              location: retailData.city || user.location || 'Location not set',
              join_date: retailData.created_at || user.createdAt || new Date().toISOString(),
              farm_size: 'N/A',
              main_crops: 'N/A',
              farming_type: retailData.business_type || 'Not set',
              questions_count: 0,
              answers_count: 0,
              likes_count: 0,
              isRetailer: true,
            });
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
=======
    const loadUserAndData = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          router.replace('/login');
          return;
        }

        // Try to fetch from users – use maybeSingle() to avoid 406 error when no row
        let { data: userInfo, error: userError } = await supabase
          .from('users')
          .select('user_id, username, email, phone_number, role, created_at')
          .eq('user_id', user.id)
          .maybeSingle();

        // If not found, create a minimal entry
        if (!userInfo) {
          const newUser = {
            user_id: user.id,
            username: user.email?.split('@')[0] || 'Farmer',
            email: user.email!,
            role: 'farmer',
            created_at: new Date().toISOString(),
            // If your table has an 'updated_at' column, include it:
            // updated_at: new Date().toISOString(),
          };
          const { data: inserted, error: insertError } = await supabase
            .from('users')
            .insert(newUser)
            .select('user_id, username, email, phone_number, role, created_at')
            .single();

          if (insertError) {
            console.error('Failed to create user record', insertError);
            throw new Error('Could not create profile');
          }
          userInfo = inserted;
        } else if (userError) {
          // Some other error occurred (e.g., network)
          console.error('User fetch error', userError);
          throw new Error('Could not load profile');
        }

        setUserData(userInfo);
        await fetchUserStats(user.id);
        await fetchAchievements(user.id);
      } catch (err) {
        console.error('Profile loading error', err);
        Alert.alert('Error', 'Failed to load profile');
>>>>>>> remotes/gozilethu/farmlink-Mbutho
      } finally {
        setLoading(false);
      }
    };
<<<<<<< HEAD

    fetchProfile();
  }, [user]);

  // Helper: check if an achievement is earned
  const isEarned = (achievementId: string) => {
    return achievements.some(a => a.achievement_id === achievementId);
  };

  const handleLogout = async () => {
    const executeLogout = async () => {
      try {
        if (logout) await logout();
        router.replace('/login');
      } catch (error) {
        console.error('Logout error', error);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to log out?')) {
        await executeLogout();
      }
    } else {
      Alert.alert(
        'Log Out',
        'Are you sure you want to log out?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Log Out', style: 'destructive', onPress: executeLogout },
        ],
        { cancelable: true }
      );
    }
  };

  // Background animation (same as before)
=======

    loadUserAndData();
  }, []);

  const fetchUserStats = async (userId: string) => {
    try {
      // questions count
      const { count: questionsCount, error: qErr } = await supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);
      if (qErr) console.warn('Questions count error', qErr);

      // answers count
      const { count: answersCount, error: aErr } = await supabase
        .from('comments')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);
      if (aErr) console.warn('Answers count error', aErr);

      // likes received: sum of post_likes where posts.user_id = userId
      let likesReceived = 0;
      const { data: userPosts, error: postsErr } = await supabase
        .from('posts')
        .select('id')
        .eq('user_id', userId);
      if (!postsErr && userPosts && userPosts.length > 0) {
        const postIds = userPosts.map(p => p.id);
        const { count: likedCount, error: likeErr } = await supabase
          .from('post_likes')
          .select('id', { count: 'exact', head: true })
          .in('post_id', postIds);
        if (!likeErr) likesReceived = likedCount || 0;
      }

      setStats({
        questions_count: questionsCount || 0,
        answers_count: answersCount || 0,
        likes_count: likesReceived,
      });
    } catch (err) {
      console.error('Failed to fetch user stats', err);
    }
  };

  const fetchAchievements = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('achievement_id, earned_at')
        .eq('user_id', userId);
      if (error && error.code !== '42P01') {
        console.warn('Achievements error', error);
      } else if (data) {
        setAchievements(data);
      }
    } catch (err) {
      console.error('Achievements fetch error', err);
    }
  };

  const isEarned = (id: string) => achievements.some(a => a.achievement_id === id);

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
      ]
    );
  };

  // ---------------------------------------------------------------------------
  // Background animations
  // ---------------------------------------------------------------------------
>>>>>>> remotes/gozilethu/farmlink-Mbutho
  const bgScale = useSharedValue(1);
  const bgOpacity = useSharedValue(0.3);
  const bgScale2 = useSharedValue(1.2);
  const bgOpacity2 = useSharedValue(0.2);

  React.useEffect(() => {
    bgScale.value = withRepeat(withTiming(1.2, { duration: 8000 }), -1, true);
    bgOpacity.value = withRepeat(withTiming(0.5, { duration: 10000 }), -1, true);
    bgScale2.value = withRepeat(withTiming(1, { duration: 10000 }), -1, true);
    bgOpacity2.value = withRepeat(withTiming(0.4, { duration: 10000 }), -1, true);
  }, [bgOpacity, bgOpacity2, bgScale, bgScale2]);

  const bgBlob1Style = useAnimatedStyle(() => ({
    transform: [{ scale: bgScale.value }],
    opacity: bgOpacity.value,
  }));
  const bgBlob2Style = useAnimatedStyle(() => ({
    transform: [{ scale: bgScale2.value }],
    opacity: bgOpacity2.value,
  }));

  const { width, height } = Dimensions.get('window');

  if (loading || authLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22c55e" />
        </View>
      </SafeAreaView>
    );
  }

<<<<<<< HEAD
   // Fallback if profile not loaded
   const displayProfile = profile || {
     name: user?.name || 'New User',
     avatar: (user?.name || 'U').charAt(0).toUpperCase(),
     location: user?.location || 'Location not set',
     join_date: user?.createdAt || new Date().toISOString(),
     farm_size: 'Not set',
     main_crops: 'Not set',
     farming_type: 'Not set',
     questions_count: 0,
     answers_count: 0,
     likes_count: 0,
     isRetailer: userRole === 'retailer',
   };

   const joinDate = new Date(displayProfile.join_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

   // Role label and color
   const getRoleLabel = () => {
     switch (userRole) {
       case 'retailer': return { label: 'Retailer', color: '#3b82f6' };
       case 'extension_officer': return { label: 'Extension Officer', color: '#f59e0b' };
       default: return { label: 'Farmer', color: '#22c55e' };
     }
   };
   const roleInfo = getRoleLabel();

   return (
=======
  if (!userData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={styles.errorText}>Unable to load profile.</Text>
          <TouchableOpacity onPress={() => router.replace('/login')} style={styles.errorButton}>
            <Text style={styles.errorButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const joinDate = userData.created_at
    ? new Date(userData.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    : 'Recently';

  return (
>>>>>>> remotes/gozilethu/farmlink-Mbutho
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        {/* Background (unchanged) */}
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

        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#11181C" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 40 }} />
        </View>

<<<<<<< HEAD
          {/* Profile header with dynamic data */}
=======
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
>>>>>>> remotes/gozilethu/farmlink-Mbutho
          <Animated.View entering={SlideInDown.duration(500)} style={styles.section}>
            <GlassCard style={styles.profileCard}>
              <View style={styles.profileRow}>
                <View style={styles.avatarContainer}>
                  <LinearGradient colors={['#22c55e', '#16a34a']} style={styles.avatarGradient}>
                    <Text style={styles.avatarText}>
<<<<<<< HEAD
                      {displayProfile.avatar || displayProfile.name.charAt(0).toUpperCase()}
                    </Text>
                  </LinearGradient>
                  <TouchableOpacity style={styles.editAvatar} activeOpacity={0.7}>
                    <Ionicons name="pencil" size={14} color="#22c55e" />
                  </TouchableOpacity>
                </View>
               <View style={styles.profileInfo}>
                   <View style={styles.nameRow}>
                     <Text style={styles.profileName}>{displayProfile.name}</Text>
                     <View style={[styles.roleBadge, { backgroundColor: roleInfo.color + '20' }]}>
                       <Text style={[styles.roleBadgeText, { color: roleInfo.color }]}>
                         {roleInfo.label}
                       </Text>
                     </View>
                   </View>
                   <View style={styles.infoRow}>
                     <Ionicons name="location-outline" size={12} color="#9ca3af" />
                     <Text style={styles.infoText}>{displayProfile.location || 'Location not set'}</Text>
                   </View>
                   <View style={styles.infoRow}>
                     <Ionicons name="calendar-outline" size={12} color="#9ca3af" />
                     <Text style={styles.infoText}>Joined {joinDate}</Text>
                   </View>
                 </View>
=======
                      {userData.username?.[0]?.toUpperCase() || 'F'}
                    </Text>
                  </LinearGradient>
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{userData.username}</Text>
                  <View style={styles.infoRow}>
                    <Ionicons name="mail-outline" size={12} color="#9ca3af" />
                    <Text style={styles.infoText}>{userData.email}</Text>
                  </View>
                  {userData.phone_number && (
                    <View style={styles.infoRow}>
                      <Ionicons name="call-outline" size={12} color="#9ca3af" />
                      <Text style={styles.infoText}>{userData.phone_number}</Text>
                    </View>
                  )}
                  <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={12} color="#9ca3af" />
                    <Text style={styles.infoText}>Joined {joinDate}</Text>
                  </View>
                </View>
>>>>>>> remotes/gozilethu/farmlink-Mbutho
              </View>

              {/* Stats from API */}
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
<<<<<<< HEAD
                  <Text style={styles.statNumber}>{displayProfile.questions_count}</Text>
=======
                  <Text style={styles.statNumber}>{stats.questions_count}</Text>
>>>>>>> remotes/gozilethu/farmlink-Mbutho
                  <Text style={styles.statLabel}>Questions</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
<<<<<<< HEAD
                  <Text style={styles.statNumber}>{displayProfile.answers_count}</Text>
=======
                  <Text style={styles.statNumber}>{stats.answers_count}</Text>
>>>>>>> remotes/gozilethu/farmlink-Mbutho
                  <Text style={styles.statLabel}>Answers</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
<<<<<<< HEAD
                  <Text style={styles.statNumber}>{displayProfile.likes_count}</Text>
                  <Text style={styles.statLabel}>Likes</Text>
=======
                  <Text style={styles.statNumber}>{stats.likes_count}</Text>
                  <Text style={styles.statLabel}>Likes Received</Text>
>>>>>>> remotes/gozilethu/farmlink-Mbutho
                </View>
              </View>
            </GlassCard>
          </Animated.View>

<<<<<<< HEAD
          {/* Achievements – dynamic earned status */}
=======
          {/* Achievements (optional) */}
>>>>>>> remotes/gozilethu/farmlink-Mbutho
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

<<<<<<< HEAD
          {/* Farm info – dynamic */}
=======
          {/* Farm info (placeholder) */}
>>>>>>> remotes/gozilethu/farmlink-Mbutho
          <Animated.View entering={FadeIn.delay(150)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name={displayProfile.isRetailer ? "storefront-outline" : "leaf-outline"} size={18} color="#22c55e" />
              <Text style={styles.sectionTitle}>{displayProfile.isRetailer ? 'My Business' : 'My Farm'}</Text>
            </View>
            <GlassCard style={styles.farmCard}>
<<<<<<< HEAD
              {displayProfile.isRetailer ? (
                <View style={styles.farmRow}>
                  <Text style={styles.farmLabel}>Business Type</Text>
                  <Text style={styles.farmValue}>{displayProfile.farming_type || 'Not specified'}</Text>
                </View>
              ) : (
                <>
                  <View style={styles.farmRow}>
                    <Text style={styles.farmLabel}>Farm Size</Text>
                    <Text style={styles.farmValue}>{displayProfile.farm_size || 'Not specified'}</Text>
                  </View>
                  <View style={styles.farmRow}>
                    <Text style={styles.farmLabel}>Main Crops</Text>
                    <Text style={styles.farmValue}>{displayProfile.main_crops || 'Not specified'}</Text>
                  </View>
                  <View style={styles.farmRow}>
                    <Text style={styles.farmLabel}>Farming Type</Text>
                    <Text style={styles.farmValue}>{displayProfile.farming_type || 'Not specified'}</Text>
                  </View>
                </>
              )}
              <TouchableOpacity style={styles.editFarmButton} activeOpacity={0.8}>
                <Text style={styles.editFarmText}>Edit {displayProfile.isRetailer ? 'Business' : 'Farm'} Details</Text>
              </TouchableOpacity>
            </GlassCard>
          </Animated.View>

          {/* Menu items (static) */}
=======
              <View style={styles.farmRow}>
                <Text style={styles.farmLabel}>Role</Text>
                <Text style={styles.farmValue}>{userData.role || 'Farmer'}</Text>
              </View>
              <View style={styles.farmRow}>
                <Text style={styles.farmLabel}>Farm Size</Text>
                <Text style={styles.farmValue}>Not specified</Text>
              </View>
              <View style={styles.farmRow}>
                <Text style={styles.farmLabel}>Main Crops</Text>
                <Text style={styles.farmValue}>Not specified</Text>
              </View>
            </GlassCard>
          </Animated.View>

>>>>>>> remotes/gozilethu/farmlink-Mbutho
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
<<<<<<< HEAD
                    } else {
                      console.log(item.label);
=======
                    } else if (item.route) {
                      router.push(item.route as any);
>>>>>>> remotes/gozilethu/farmlink-Mbutho
                    }
                  }}
                >
                  <View style={styles.menuLeft}>
                    <Ionicons
                      name={item.icon as any}
                      size={20}
                      color={item.danger ? '#ef4444' : '#9ca3af'}
                    />
                    <Text style={[styles.menuLabel, item.danger && styles.menuLabelDanger]}>
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

// Styles (unchanged)
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
  bgBlob: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(34,197,94,0.2)', overflow: 'hidden' },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  profileCard: { padding: 16 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarContainer: { position: 'relative' },
  avatarGradient: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: 'white' },
<<<<<<< HEAD
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
     ...Platform.select({ web: { boxShadow: '0px 2px 2px rgba(0,0,0,0.1)' }, default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 } }),
   },
   profileInfo: { flex: 1 },
   nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
   profileName: { fontSize: 18, fontWeight: 'bold', color: '#11181C' },
   roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
   roleBadgeText: { fontSize: 11, fontWeight: '600' },
=======
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: 'bold', color: '#11181C', marginBottom: 4 },
>>>>>>> remotes/gozilethu/farmlink-Mbutho
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
  badge: { backgroundColor: '#22c55e', borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2, minWidth: 20, alignItems: 'center' },
  badgeText: { fontSize: 10, fontWeight: '600', color: 'white' },
  version: { textAlign: 'center', fontSize: 10, color: '#9ca3af', marginVertical: 24 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});