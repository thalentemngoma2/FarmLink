import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

import { BottomNav } from '@/components/bottom-nav';
import { MobileHeader } from '@/components/mobile-header';
import { GlassCard } from '@/components/ui/glass-card';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

// Types
interface ProfileData {
  id: string;
  username: string;
  avatar: string | null;
  location: string;
  join_date: string;
  farm_size: string;
  main_crops: string;
  farming_type: string;
  questions_count: number;
  answers_count: number;
  likes_count: number;
  isRetailer?: boolean;
}

interface Achievement {
  achievement_id: string;
  earned_at: string;
}

const menuItems = [
  { icon: 'notifications-outline', label: 'Notifications', badge: 3 },
  { icon: 'settings-outline', label: 'Settings' },
  { icon: 'help-circle-outline', label: 'Help & Support' },
  { icon: 'log-out-outline', label: 'Log Out', danger: true },
];

const achievementsList = [
  { id: 'first_question', icon: 'chatbubble-outline', label: 'First Question' },
  { id: 'helpful_answer', icon: 'heart-outline', label: 'Helpful Answer' },
  { id: 'top_contributor', icon: 'trophy-outline', label: 'Top Contributor' },
  { id: 'farming_expert', icon: 'leaf-outline', label: 'Farming Expert' },
];

export function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, logout, isLoading: authLoading } = useAuth();

  // Edit profile modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // NEW: local preview state
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);

  // Determine user role from AuthContext
  const userRole = user?.role || 'farmer';

  // Fetch user profile from `users` table and optionally from `profiles`/`retail_profiles`
  const fetchProfile = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('username, avatar, created_at')
        .eq('user_id', user.id)
        .single();

      if (userError) throw userError;

      const { data: farmerData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      const { data: retailData } = await supabase
        .from('retail_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      const isRetailer = !!retailData;

      setProfile({
        id: user.id,
        username: userData.username || 'user',
        avatar: userData.avatar || null,
        location: farmerData?.location || retailData?.city || 'Location not set',
        join_date: userData.created_at || new Date().toISOString(),
        farm_size: farmerData?.farm_size || 'N/A',
        main_crops: farmerData?.main_crops || 'N/A',
        farming_type: farmerData?.farm_type || retailData?.business_type || 'Not set',
        questions_count: 0,
        answers_count: 0,
        likes_count: 0,
        isRetailer,
      });
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Helper: check if an achievement is earned
  const isEarned = (achievementId: string) => {
    return achievements.some((a) => a.achievement_id === achievementId);
  };

  // ---------------- Logout ----------------
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
      Alert.alert('Log Out', 'Are you sure you want to log out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: executeLogout },
      ]);
    }
  };

  // ---------------- Pick & Upload Avatar (WITH INSTANT PREVIEW) ----------------
  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Allow access to your photo library to change your avatar.');
      return;
    }

    // Use the new MediaType API (avoid deprecation warning)
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], // or ImagePicker.MediaType.Images
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled || !result.assets[0]) return;

    const file = result.assets[0];

    // Instant local preview
    setLocalAvatar(file.uri);
    setUploadingAvatar(true);

    try {
      // Fetch blob from the local URI
      const response = await fetch(file.uri);
      if (!response.ok) throw new Error('Failed to read file for upload');
      const blob = await response.blob();

      // Determine proper file extension, fallback to 'jpg'
      const uriParts = file.uri.split('.');
      const candidate = uriParts.length > 1 ? uriParts.pop() : null;
      const fileExt = (candidate && candidate.length <= 4 && !candidate.includes('/'))
        ? candidate
        : (blob.type === 'image/png' ? 'png' : 'jpg');
      const filePath = `${user!.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          contentType: blob.type || 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar: publicUrl })
        .eq('user_id', user!.id);

      if (updateError) throw updateError;

      setProfile((prev) => (prev ? { ...prev, avatar: publicUrl } : prev));
      Alert.alert('Success', 'Profile photo updated.');
    } catch (err: any) {
      Alert.alert('Upload failed', err.message || 'Could not upload avatar.');
      // On failure, clear local preview so previous avatar remains
      setLocalAvatar(null);
    } finally {
      setUploadingAvatar(false);
      // Clear local preview after success or failure so the permanent URL is used
      setLocalAvatar(null);
    }
  };

  // ---------------- Edit Username ----------------
  const startEditingUsername = () => {
    if (!profile) return;
    setNewUsername(profile.username);
    setUsernameError(null);
    setEditingUsername(true);
  };

  const cancelEditingUsername = () => {
    setEditingUsername(false);
    setUsernameError(null);
  };

  const saveUsername = async () => {
    const trimmed = newUsername.trim();
    if (!trimmed) {
      setUsernameError('Username cannot be empty.');
      return;
    }
    if (trimmed.length < 3) {
      setUsernameError('Username must be at least 3 characters.');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setUsernameError('Only letters, numbers and underscores allowed.');
      return;
    }

    const { data: existing } = await supabase
      .from('users')
      .select('user_id')
      .eq('username', trimmed)
      .neq('user_id', user!.id)
      .maybeSingle();

    if (existing) {
      setUsernameError('That username is already taken.');
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ username: trimmed })
        .eq('user_id', user!.id);

      if (error) throw error;

      setProfile((prev) => (prev ? { ...prev, username: trimmed } : prev));
      setEditingUsername(false);
      setUsernameError(null);
    } catch (err: any) {
      setUsernameError(err.message || 'Could not update username.');
    }
  };

  // ---------------- Background animation ----------------
  const bgScale = useSharedValue(1);
  const bgOpacity = useSharedValue(0.3);
  const bgScale2 = useSharedValue(1.2);
  const bgOpacity2 = useSharedValue(0.2);

  useEffect(() => {
    bgScale.value = withRepeat(withTiming(1.2, { duration: 8000 }), -1, true);
    bgOpacity.value = withRepeat(withTiming(0.5, { duration: 10000 }), -1, true);
    bgScale2.value = withRepeat(withTiming(1, { duration: 10000 }), -1, true);
    bgOpacity2.value = withRepeat(withTiming(0.4, { duration: 10000 }), -1, true);
  }, [bgOpacity, bgOpacity2, bgScale, bgScale2]);

  const bgBlob1Style = useAnimatedStyle(() => ({
    transform: [{ scale: bgScale.value }],
    opacity: interpolate(bgOpacity.value, [0.3, 0.5], [0.3, 0.5]),
  }));

  const bgBlob2Style = useAnimatedStyle(() => ({
    transform: [{ scale: bgScale2.value }],
    opacity: interpolate(bgOpacity2.value, [0.2, 0.4], [0.2, 0.4]),
  }));

  const { width, height } = Dimensions.get('window');

  // ---------------- Loading state ----------------
  if (loading || authLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22c55e" />
        </View>
      </SafeAreaView>
    );
  }

  // Fallback profile in case data not loaded yet
  const displayProfile = profile || {
    username: user?.username || 'new_user',
    avatar: null,
    location: 'Location not set',
    join_date: new Date().toISOString(),
    farm_size: 'Not set',
    main_crops: 'Not set',
    farming_type: 'Not set',
    questions_count: 0,
    answers_count: 0,
    likes_count: 0,
    isRetailer: userRole === 'retailer',
  };

  const joinDate = new Date(displayProfile.join_date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
  });

  const getRoleLabel = () => {
    switch (userRole) {
      case 'retailer':
        return { label: 'Retailer', color: '#3b82f6' };
      case 'extension_officer':
        return { label: 'Extension Officer', color: '#f59e0b' };
      default:
        return { label: 'Farmer', color: '#22c55e' };
    }
  };
  const roleInfo = getRoleLabel();

  // ** UPDATED: avatar source with local preview **
  const avatarSource = localAvatar
    ? { uri: localAvatar }
    : displayProfile.avatar
    ? { uri: displayProfile.avatar }
    : null;

  const avatarInitial = displayProfile.username.charAt(0).toUpperCase();

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

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <MobileHeader />

          {/* Profile header */}
          <Animated.View entering={SlideInDown.duration(500)} style={styles.section}>
            <GlassCard style={styles.profileCard}>
              <View style={styles.profileRow}>
                <TouchableOpacity onPress={pickAvatar} activeOpacity={0.7}>
                  <View style={styles.avatarContainer}>
                    {avatarSource ? (
                      <Image source={avatarSource} style={styles.avatarImage} />
                    ) : (
                      <LinearGradient
                        colors={['#22c55e', '#16a34a']}
                        style={styles.avatarGradient}
                      >
                        <Text style={styles.avatarText}>{avatarInitial}</Text>
                      </LinearGradient>
                    )}
                    <View style={styles.editAvatar}>
                      {uploadingAvatar ? (
                        <ActivityIndicator size="small" color="#22c55e" />
                      ) : (
                        <Ionicons name="camera" size={14} color="#22c55e" />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Name & Role */}
                <View style={styles.profileInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.profileName}>{displayProfile.username}</Text>
                    <View style={[styles.roleBadge, { backgroundColor: roleInfo.color + '20' }]}>
                      <Text style={[styles.roleBadgeText, { color: roleInfo.color }]}>
                        {roleInfo.label}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={12} color="#9ca3af" />
                    <Text style={styles.infoText}>{displayProfile.location}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={12} color="#9ca3af" />
                    <Text style={styles.infoText}>Joined {joinDate}</Text>
                  </View>
                  <TouchableOpacity onPress={startEditingUsername} style={styles.editUsernameBtn}>
                    <Text style={styles.editUsernameText}>Edit username</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Stats */}
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{displayProfile.questions_count}</Text>
                  <Text style={styles.statLabel}>Questions</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{displayProfile.answers_count}</Text>
                  <Text style={styles.statLabel}>Answers</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{displayProfile.likes_count}</Text>
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

          {/* Farm / Business info */}
          <Animated.View entering={FadeIn.delay(150)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name={displayProfile.isRetailer ? 'storefront-outline' : 'leaf-outline'}
                size={18}
                color="#22c55e"
              />
              <Text style={styles.sectionTitle}>
                {displayProfile.isRetailer ? 'My Business' : 'My Farm'}
              </Text>
            </View>
            <GlassCard style={styles.farmCard}>
              {displayProfile.isRetailer ? (
                <View style={styles.farmRow}>
                  <Text style={styles.farmLabel}>Business Type</Text>
                  <Text style={styles.farmValue}>{displayProfile.farming_type}</Text>
                </View>
              ) : (
                <>
                  <View style={styles.farmRow}>
                    <Text style={styles.farmLabel}>Farm Size</Text>
                    <Text style={styles.farmValue}>{displayProfile.farm_size}</Text>
                  </View>
                  <View style={styles.farmRow}>
                    <Text style={styles.farmLabel}>Main Crops</Text>
                    <Text style={styles.farmValue}>{displayProfile.main_crops}</Text>
                  </View>
                  <View style={styles.farmRow}>
                    <Text style={styles.farmLabel}>Farming Type</Text>
                    <Text style={styles.farmValue}>{displayProfile.farming_type}</Text>
                  </View>
                </>
              )}
              <TouchableOpacity style={styles.editFarmButton} activeOpacity={0.8}>
                <Text style={styles.editFarmText}>
                  Edit {displayProfile.isRetailer ? 'Business' : 'Farm'} Details
                </Text>
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
                    } else {
                      console.log(item.label);
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

      {/* Edit Username Modal */}
      <Modal visible={editingUsername} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.editModal}>
            <Text style={styles.editModalTitle}>Edit Username</Text>
            <TextInput
              style={styles.editInput}
              value={newUsername}
              onChangeText={(text) => {
                setNewUsername(text);
                setUsernameError(null);
              }}
              placeholder="Enter new username"
              placeholderTextColor="#9ca3af"
              autoFocus
              maxLength={30}
            />
            {usernameError && <Text style={styles.errorText}>{usernameError}</Text>}
            <View style={styles.editActions}>
              <TouchableOpacity onPress={cancelEditingUsername} style={styles.editCancelBtn}>
                <Text style={styles.editCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={saveUsername}
                style={[styles.editSaveBtn, !newUsername.trim() && { opacity: 0.5 }]}
                disabled={!newUsername.trim()}
              >
                <Text style={styles.editSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ---------- Styles (unchanged) ----------
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, position: 'relative' },
  scrollContent: { flexGrow: 1, paddingBottom: 80, paddingTop: 120 },
  bgBlob: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(34,197,94,0.2)', overflow: 'hidden' },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  profileCard: { padding: 16 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarContainer: { position: 'relative' },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  avatarGradient: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: 'white' },
  editAvatar: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center',
    ...Platform.select({ web: { boxShadow: '0px 2px 2px rgba(0,0,0,0.1)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
    }), 
  },
  profileInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
  profileName: { fontSize: 18, fontWeight: 'bold', color: '#11181C' },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  roleBadgeText: { fontSize: 11, fontWeight: '600' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  infoText: { fontSize: 12, color: '#9ca3af' },
  editUsernameBtn: { marginTop: 6 },
  editUsernameText: { fontSize: 12, color: '#22c55e', fontWeight: '500' },
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  editModal: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 340 },
  editModalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16, textAlign: 'center' },
  editInput: { backgroundColor: '#f9fafb', borderRadius: 12, padding: 12, fontSize: 16, color: '#111827', marginBottom: 8 },
  errorText: { color: '#ef4444', fontSize: 12, marginBottom: 8 },
  editActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  editCancelBtn: { paddingVertical: 8, paddingHorizontal: 16 },
  editCancelText: { fontSize: 14, color: '#6b7280' },
  editSaveBtn: { backgroundColor: '#22c55e', paddingVertical: 8, paddingHorizontal: 24, borderRadius: 20 },
  editSaveText: { color: '#fff', fontWeight: '600' },
});