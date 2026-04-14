import { BottomNav } from '@/components/bottom-nav';
import { GlassCard } from '@/components/ui/glass-card';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, {
  FadeIn,
  interpolateColor,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming
} from 'react-native-reanimated';

const SETTINGS_API = 'http://192.168.8.143:3000'; // Replace with your IP

// Define a proper type for setting items
interface SettingItem {
  icon: string; // will be cast to any when used
  label: string;
  description?: string;
  href?: string;
  action?: () => void;
  toggle?: boolean;
  value?: boolean;
  danger?: boolean;
}

interface SettingSection {
  title: string;
  items: SettingItem[];
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<{ name: string; email: string; membership_type: string; avatar?: string } | null>(null);
  const [settings, setSettings] = useState({
    dark_mode: false,
    push_notifications: true,
    offline_mode: false,
    language: 'en',
  });
  const [loading, setLoading] = useState(true);

  // Helper to safely get user id
  const getUserId = () => {
    if (!user) throw new Error('User not authenticated');
    return user.id;
  };

  useEffect(() => {
    if (user) {
      fetchUserData();
      fetchSettings();
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      const userId = getUserId();
      const res = await axios.get(`${SETTINGS_API}/user/${userId}`);
      setProfile(res.data);
    } catch (err) {
      console.error('Failed to fetch profile', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const userId = getUserId();
      const res = await axios.get(`${SETTINGS_API}/settings/${userId}`);
      setSettings(res.data);
    } catch (err) {
      console.error('Failed to fetch settings', err);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: any) => {
    if (!user) return;
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings); // optimistic update
    try {
      const userId = getUserId();
      await axios.put(`${SETTINGS_API}/settings/${userId}`, newSettings);
    } catch (err) {
      Alert.alert('Error', 'Failed to save setting');
      // revert
      setSettings(settings);
    }
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => {
        await logout();
        router.replace('/login');
      } },
    ]);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: 'FarmLink',
        message: 'Check out FarmLink - the AI-powered farming assistant!',
        url: 'https://farmlink.app',
      });
    } catch (error) {
      Alert.alert('Error', 'Unable to share at this time');
    }
  };

  const handleClearCache = () => {
    Alert.alert('Clear Cache', 'Cache cleared successfully!');
  };

  const handleRate = () => {
    Alert.alert('Thank you!', 'Your feedback helps us improve.');
  };

  // Define sections with dynamic values from state
  const settingSections: SettingSection[] = [
    {
      title: 'Account',
      items: [
        { icon: 'person-outline', label: 'Edit Profile', description: 'Update your personal information', href: '/profile' },
        { icon: 'lock-closed-outline', label: 'Privacy & Security', description: 'Manage your privacy settings', href: '/settings/privacy' },
        { icon: 'shield-outline', label: 'Two-Factor Authentication', description: 'Add extra security to your account', href: '/settings/2fa' },
      ],
    },
    {
      title: 'Preferences',
      items: [
        { icon: settings.dark_mode ? 'moon-outline' : 'sunny-outline', label: 'Dark Mode', description: 'Switch between light and dark theme', toggle: true, value: settings.dark_mode, action: () => updateSetting('dark_mode', !settings.dark_mode) },
        { icon: 'notifications-outline', label: 'Push Notifications', description: 'Receive alerts and updates', toggle: true, value: settings.push_notifications, action: () => updateSetting('push_notifications', !settings.push_notifications) },
        { icon: 'language-outline', label: 'Language', description: 'English (US)', href: '/settings/language' },
        { icon: 'phone-portrait-outline', label: 'Offline Mode', description: 'Download content for offline use', toggle: true, value: settings.offline_mode, action: () => updateSetting('offline_mode', !settings.offline_mode) },
      ],
    },
    {
      title: 'Data & Storage',
      items: [
        { icon: 'server-outline', label: 'Storage Usage', description: '23.5 MB used', href: '/settings/storage' },
        { icon: 'trash-outline', label: 'Clear Cache', description: 'Free up space on your device', action: handleClearCache },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: 'help-circle-outline', label: 'Help Center', description: 'FAQs and troubleshooting', href: '/help' },
        { icon: 'chatbubbles-outline', label: 'Contact Us', description: 'Get in touch with our team', href: '/contact' },
        { icon: 'star-outline', label: 'Rate FarmLink', description: 'Share your feedback', action: handleRate },
        { icon: 'share-social-outline', label: 'Share App', description: 'Invite friends to FarmLink', action: handleShare },
      ],
    },
    {
      title: 'Account Actions',
      items: [
        { icon: 'log-out-outline', label: 'Sign Out', description: 'Log out of your account', action: handleSignOut, danger: true },
      ],
    },
  ];

  // Background animations
  const bgScale1 = useSharedValue(1);
  const bgX1 = useSharedValue(0);
  const bgY1 = useSharedValue(0);
  const bgScale2 = useSharedValue(1.2);
  const bgX2 = useSharedValue(0);
  const bgY2 = useSharedValue(0);

  useEffect(() => {
    bgScale1.value = withRepeat(withTiming(1.3, { duration: 20000 }), -1, true);
    bgX1.value = withRepeat(withTiming(30, { duration: 20000 }), -1, true);
    bgY1.value = withRepeat(withTiming(-20, { duration: 20000 }), -1, true);
    bgScale2.value = withRepeat(withTiming(1, { duration: 25000 }), -1, true);
    bgX2.value = withRepeat(withTiming(-30, { duration: 25000 }), -1, true);
    bgY2.value = withRepeat(withTiming(30, { duration: 25000 }), -1, true);
  }, []);

  const bgBlob1Style = useAnimatedStyle(() => ({
    transform: [{ scale: bgScale1.value }, { translateX: bgX1.value }, { translateY: bgY1.value }],
  }));
  const bgBlob2Style = useAnimatedStyle(() => ({
    transform: [{ scale: bgScale2.value }, { translateX: bgX2.value }, { translateY: bgY2.value }],
  }));

  // Animated Switch component
  const AnimatedSwitch: React.FC<{ value: boolean; onValueChange: (value: boolean) => void }> = ({ value, onValueChange }) => {
    const translateX = useSharedValue(value ? 20 : 0);
    const bgColor = useSharedValue(value ? 1 : 0);
    useEffect(() => {
      translateX.value = withSpring(value ? 20 : 0);
      bgColor.value = withSpring(value ? 1 : 0);
    }, [value]);
    const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));
    const trackStyle = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(bgColor.value, [0, 1], ['#e5e7eb', '#22c55e']) }));
    return (
      <TouchableOpacity onPress={() => onValueChange(!value)} activeOpacity={0.7} style={styles.switchContainer}>
        <Animated.View style={[styles.switchTrack, trackStyle]}>
          <Animated.View style={[styles.switchThumb, thumbStyle]} />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  if (loading || !profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#f0fdf4', '#ffffff', '#ecfdf5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Animated.View style={[styles.blob, styles.blob1, bgBlob1Style]} />
      <Animated.View style={[styles.blob, styles.blob2, bgBlob2Style]} />

      <Animated.View entering={FadeIn} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={20} color="#11181C" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="settings-outline" size={20} color="#22c55e" />
          <Text style={styles.headerTitle}>Settings</Text>
        </View>
        <View style={styles.headerPlaceholder} />
      </Animated.View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={SlideInDown.duration(600)} style={styles.userCard}>
          <GlassCard style={styles.userCardGlass}>
            <Link href="/profile" asChild>
              <TouchableOpacity style={styles.userCardContent}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {profile.avatar || profile.name?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{profile.name}</Text>
                  <Text style={styles.userEmail}>{profile.email}</Text>
                  <Text style={styles.userBadge}>{profile.membership_type || 'Free'} Member</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </TouchableOpacity>
            </Link>
          </GlassCard>
        </Animated.View>

        <View style={styles.sectionsContainer}>
          {settingSections.map((section, sectionIdx) => (
            <Animated.View key={section.title} entering={FadeIn.delay(100 + sectionIdx * 50)} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <GlassCard style={styles.sectionCard}>
                {section.items.map((item, itemIdx) => {
                  // Helper to render icon safely
                  const IconComponent = () => (
                    <Ionicons name={item.icon as any} size={20} color={item.danger ? '#ef4444' : '#22c55e'} />
                  );
                  return (
                    <React.Fragment key={itemIdx}>
                      {item.href ? (
                        <Link href={item.href as any} asChild>
                          <TouchableOpacity style={[styles.settingItem, item.danger && styles.settingItemDanger]}>
                            <View style={[styles.iconContainer, item.danger ? styles.dangerIcon : styles.defaultIcon]}>
                              <IconComponent />
                            </View>
                            <View style={styles.settingText}>
                              <Text style={[styles.settingLabel, item.danger && styles.dangerText]}>{item.label}</Text>
                              {item.description && <Text style={styles.settingDescription}>{item.description}</Text>}
                            </View>
                            <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                          </TouchableOpacity>
                        </Link>
                      ) : (
                        <TouchableOpacity
                          style={[styles.settingItem, item.danger && styles.settingItemDanger]}
                          onPress={item.action}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.iconContainer, item.danger ? styles.dangerIcon : styles.defaultIcon]}>
                            <IconComponent />
                          </View>
                          <View style={styles.settingText}>
                            <Text style={[styles.settingLabel, item.danger && styles.dangerText]}>{item.label}</Text>
                            {item.description && <Text style={styles.settingDescription}>{item.description}</Text>}
                          </View>
                          {item.toggle ? (
                            <AnimatedSwitch value={item.value ?? false} onValueChange={item.action!} />
                          ) : !item.danger && (
                            <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                          )}
                        </TouchableOpacity>
                      )}
                    </React.Fragment>
                  );
                })}
              </GlassCard>
            </Animated.View>
          ))}
        </View>

        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>FarmLink v1.0.0</Text>
          <Text style={styles.versionSubtext}>Made with care for farmers</Text>
        </View>
      </ScrollView>

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  blob: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(34,197,94,0.2)' },
  blob1: { width: 200, height: 200, top: -50, left: -50 },
  blob2: { width: 250, height: 250, bottom: -50, right: -50 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.3)',
  },
  headerButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#11181C' },
  headerPlaceholder: { width: 40 },
  scrollContent: { flexGrow: 1, paddingBottom: 80 },
  userCard: { paddingHorizontal: 16, marginTop: 16, marginBottom: 24 },
  userCardGlass: { padding: 0 },
  userCardContent: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(34,197,94,0.2)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 24, fontWeight: 'bold', color: '#22c55e' },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '600', color: '#11181C', marginBottom: 2 },
  userEmail: { fontSize: 12, color: '#687076', marginBottom: 2 },
  userBadge: { fontSize: 10, fontWeight: '500', color: '#22c55e' },
  sectionsContainer: { paddingHorizontal: 16, gap: 24 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '500', color: '#687076', marginBottom: 4, paddingLeft: 4 },
  sectionCard: { overflow: 'hidden' },
  settingItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  settingItemDanger: { borderBottomColor: 'rgba(0,0,0,0.05)' },
  iconContainer: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  defaultIcon: { backgroundColor: 'rgba(34,197,94,0.1)' },
  dangerIcon: { backgroundColor: 'rgba(239,68,68,0.1)' },
  settingText: { flex: 1 },
  settingLabel: { fontSize: 14, fontWeight: '500', color: '#11181C' },
  settingDescription: { fontSize: 12, color: '#687076', marginTop: 2 },
  dangerText: { color: '#ef4444' },
  switchContainer: { width: 48, height: 28, borderRadius: 14, overflow: 'hidden' },
  switchTrack: { width: '100%', height: '100%', borderRadius: 14, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 2 },
  switchThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1, elevation: 2 },
  versionContainer: { alignItems: 'center', marginTop: 32, marginBottom: 16 },
  versionText: { fontSize: 12, color: '#9ca3af' },
  versionSubtext: { fontSize: 10, color: '#9ca3af', marginTop: 4 },
});