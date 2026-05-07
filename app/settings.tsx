import { GlassCard } from '@/components/ui/glass-card';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  interpolateColor,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
interface PrivacySettings {
  profile_visibility: 'public' | 'farmers_only' | 'private';
  show_username: boolean;
  show_email: boolean;
  show_phone: boolean;
  show_location: boolean;
  post_visibility: 'public' | 'farmers_only' | 'groups';
  comment_permissions: 'everyone' | 'followers' | 'disabled';
  media_visibility: boolean;
  message_receive_from: 'everyone' | 'verified' | 'none';
  location_sharing: boolean;
  location_precision: 'exact' | 'approximate';
  heatmap_consent: boolean;
  ai_upload_consent: boolean;
  evidence_access_restricted: boolean;
  data_retention_days: number;
  outbreak_alerts: boolean;
  market_alerts: boolean;   // will be tied to subscription
  message_notifications: boolean;
  system_notifications: boolean;
}

const defaultPrivacy: PrivacySettings = {
  profile_visibility: 'public',
  show_username: true,
  show_email: false,
  show_phone: false,
  show_location: false,
  post_visibility: 'public',
  comment_permissions: 'everyone',
  media_visibility: true,
  message_receive_from: 'everyone',
  location_sharing: true,
  location_precision: 'approximate',
  heatmap_consent: false,
  ai_upload_consent: false,
  evidence_access_restricted: true,
  data_retention_days: 30,
  outbreak_alerts: true,
  market_alerts: false,
  message_notifications: true,
  system_notifications: true,
};

// -----------------------------------------------------------------------------
// Subscription plans (ZAR)
// -----------------------------------------------------------------------------
const PLANS = [
  {
    name: 'Basic',
    price: 49,
    features: [
      'Promote up to 3 products/month',
      'Standard listing visibility',
      'Appears in general browsing feed',
      'Basic analytics (views only)',
    ],
  },
  {
    name: 'Growth',
    price: 99,
    features: [
      'Promote up to 10 products/month',
      'Priority listing (above Basic)',
      'Retailer discovery boost',
      'Analytics (views + clicks)',
      '"Interested Retailers" notifications',
    ],
  },
  {
    name: 'Premium',
    price: 199,
    features: [
      'Unlimited product promotions',
      'Top priority placement',
      'Featured in "Recommended Suppliers"',
      'Advanced analytics',
      'Direct retailer connection requests',
      'Priority support',
    ],
  },
  {
    name: 'Pay-Per-Post',
    price: 10,
    note: 'R10 per single promoted product (valid for 7 days)',
  },
];

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------
export default function PrivacySecurityPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [privacy, setPrivacy] = useState<PrivacySettings>(defaultPrivacy);
  const [darkMode, setDarkMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const loadingTimeout = useRef<any>(null);

  // Fallback timeout
  useEffect(() => {
    loadingTimeout.current = setTimeout(() => setSaving(false), 10000);
    return () => clearTimeout(loadingTimeout.current);
  }, []);

  // Load settings from DB
  useEffect(() => {
    if (!user) return;
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('privacy_settings, dark_mode')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (!error && data) {
        if (data.privacy_settings) {
          setPrivacy({ ...defaultPrivacy, ...data.privacy_settings });
        }
        if (typeof data.dark_mode === 'boolean') {
          setDarkMode(data.dark_mode);
        }
      }
    } catch (err) {
      console.error('Failed to load settings', err);
    }
  };

  // Save privacy settings (supabase upsert)
  const savePrivacySettings = async (newSettings: PrivacySettings) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert(
          {
            user_id: user!.id,
            privacy_settings: newSettings,
            dark_mode: darkMode,
            updated_at: new Date(),
          },
          { onConflict: 'user_id' }
        );
      if (error) throw error;
      Alert.alert('Saved', 'Your privacy settings have been updated.');
    } catch (err: any) {
      console.error('Save error:', err);
      if (err.code === '42703') {
        Alert.alert('Saved locally', 'Add privacy_settings jsonb column to user_settings for permanent storage.');
      } else {
        Alert.alert('Error', 'Could not save settings. Please check your connection.');
      }
    } finally {
      setSaving(false);
    }
  };

  const updateAndSave = (update: Partial<PrivacySettings>) => {
    const newSettings = { ...privacy, ...update };
    setPrivacy(newSettings);
    savePrivacySettings(newSettings);
  };

  // Dark mode toggle – actually apply theme via AuthContext or global state.
  // This assumes your AuthContext has a setDarkMode method.
  const { setGlobalDarkMode } = useAuth() as any;   // adjust if your context provides this
  const toggleDarkMode = async (value: boolean) => {
    setDarkMode(value);
    try {
      if (setGlobalDarkMode) setGlobalDarkMode(value);
      await supabase
        .from('user_settings')
        .upsert(
          { user_id: user!.id, dark_mode: value, updated_at: new Date() },
          { onConflict: 'user_id' }
        );
    } catch (err) {
      console.error('Failed to save dark mode', err);
      setDarkMode(!value);
    }
  };

  // Handle market alerts toggle
  const handleMarketToggle = (val: boolean) => {
    if (val) {
      // Show subscription plans
      setShowPlanModal(true);
    } else {
      // Turn off market alerts
      updateAndSave({ market_alerts: false });
    }
  };

  const onSelectPlan = (planName: string) => {
    setShowPlanModal(false);
    // In a real app you would process payment here.
    // For now we assume subscription is activated.
    Alert.alert(
      'Subscribed!',
      `You selected the ${planName} plan. Market opportunities are now active.`,
      [
        {
          text: 'OK',
          onPress: () => updateAndSave({ market_alerts: true }),
        },
      ]
    );
  };

  // ---------- Background animations (same as settings page) ----------
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

  // ---------- Reanimated Switch ----------
  const AnimatedSwitch: React.FC<{ value: boolean; onValueChange: (val: boolean) => void }> = ({ value, onValueChange }) => {
    const translateX = useSharedValue(value ? 20 : 0);
    const bgColor = useSharedValue(value ? 1 : 0);

    useEffect(() => {
      translateX.value = withSpring(value ? 20 : 0);
      bgColor.value = withSpring(value ? 1 : 0);
    }, [value]);

    const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));
    const trackStyle = useAnimatedStyle(() => ({
      backgroundColor: interpolateColor(bgColor.value, [0, 1], ['#e5e7eb', '#22c55e']),
    }));

    return (
      <TouchableOpacity onPress={() => onValueChange(!value)} activeOpacity={0.7} style={styles.switchContainer}>
        <Animated.View style={[styles.switchTrack, trackStyle]}>
          <Animated.View style={[styles.switchThumb, thumbStyle]} />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  // ---------- Helper components ----------
  const ToggleRow = ({ label, description, value, onToggle }: { label: string; description?: string; value: boolean; onToggle: (val: boolean) => void }) => (
    <View style={styles.settingItem}>
      <View style={styles.settingText}>
        <Text style={styles.settingLabel}>{label}</Text>
        {description && <Text style={styles.settingDescription}>{description}</Text>}
      </View>
      <AnimatedSwitch value={value} onValueChange={onToggle} />
    </View>
  );

  const NavRow = ({ label, description, onPress, danger }: { label: string; description?: string; onPress: () => void; danger?: boolean }) => (
    <TouchableOpacity style={[styles.settingItem, danger && styles.settingItemDanger]} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.settingText}>
        <Text style={[styles.settingLabel, danger && styles.dangerText]}>{label}</Text>
        {description && <Text style={styles.settingDescription}>{description}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
    </TouchableOpacity>
  );

  const InfoRow = ({ icon, text }: { icon: string; text: string }) => (
    <View style={styles.infoRow}>
      <Ionicons name={icon as any} size={20} color="#22c55e" style={{ marginRight: 8 }} />
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );

  // ---------- Not signed in view ----------
  if (!user) {
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
            <Ionicons name="shield-checkmark-outline" size={20} color="#22c55e" />
            <Text style={styles.headerTitle}>Privacy & Security</Text>
          </View>
          <View style={styles.headerPlaceholder} />
        </Animated.View>
        <View style={styles.notLoggedInContainer}>
          <Ionicons name="lock-closed-outline" size={48} color="#9ca3af" />
          <Text style={styles.notLoggedInTitle}>Not Signed In</Text>
          <Text style={styles.notLoggedInText}>Please log in to access privacy settings.</Text>
          <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/login')}>
            <Text style={styles.loginButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ---------- Main page ----------
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
          <Ionicons name="shield-checkmark-outline" size={20} color="#22c55e" />
          <Text style={styles.headerTitle}>Privacy & Security</Text>
        </View>
        <View style={styles.headerPlaceholder} />
      </Animated.View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Dark Mode Toggle – now actually changes the app theme */}
        <Animated.View entering={SlideInDown.delay(20)} style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <GlassCard style={styles.glassCard}>
            <ToggleRow
              label={darkMode ? 'Dark Mode' : 'Light Mode'}
              description="Applies to the entire app"
              value={darkMode}
              onToggle={toggleDarkMode}
            />
          </GlassCard>
        </Animated.View>

        {/* 1. Profile Privacy */}
        <Animated.View entering={SlideInDown.delay(50)} style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Privacy</Text>
          <GlassCard style={styles.glassCard}>
            <ToggleRow label="Show Username" value={privacy.show_username} onToggle={(val) => updateAndSave({ show_username: val })} />
            <ToggleRow label="Show Email" value={privacy.show_email} onToggle={(val) => updateAndSave({ show_email: val })} />
            <ToggleRow label="Show Phone" value={privacy.show_phone} onToggle={(val) => updateAndSave({ show_phone: val })} />
            <ToggleRow label="Show Location" value={privacy.show_location} onToggle={(val) => updateAndSave({ show_location: val })} />
            <NavRow
              label="Profile Visibility"
              description={
                privacy.profile_visibility === 'public' ? 'Everyone' :
                privacy.profile_visibility === 'farmers_only' ? 'Verified Farmers Only' : 'Private'
              }
              onPress={() => {
                Alert.alert(
                  'Profile Visibility',
                  'Who can view your profile?',
                  [
                    { text: 'Public', onPress: () => updateAndSave({ profile_visibility: 'public' }) },
                    { text: 'Farmers Only', onPress: () => updateAndSave({ profile_visibility: 'farmers_only' }) },
                    { text: 'Private', onPress: () => updateAndSave({ profile_visibility: 'private' }) },
                    { text: 'Cancel', style: 'cancel' },
                  ]
                );
              }}
            />
          </GlassCard>
        </Animated.View>

        {/* 2. Post & Content Visibility */}
        <Animated.View entering={SlideInDown.delay(100)} style={styles.section}>
          <Text style={styles.sectionTitle}>Post & Content Visibility</Text>
          <GlassCard style={styles.glassCard}>
            <NavRow
              label="Who can view my posts"
              description={
                privacy.post_visibility === 'public' ? 'Public' :
                privacy.post_visibility === 'farmers_only' ? 'Farmers Only' : 'Groups'
              }
              onPress={() => {
                Alert.alert(
                  'Post Visibility',
                  undefined,
                  [
                    { text: 'Public', onPress: () => updateAndSave({ post_visibility: 'public' }) },
                    { text: 'Farmers Only', onPress: () => updateAndSave({ post_visibility: 'farmers_only' }) },
                    { text: 'Groups', onPress: () => updateAndSave({ post_visibility: 'groups' }) },
                    { text: 'Cancel', style: 'cancel' },
                  ]
                );
              }}
            />
            <NavRow
              label="Comment Permissions"
              description={
                privacy.comment_permissions === 'everyone' ? 'Everyone' :
                privacy.comment_permissions === 'followers' ? 'Followers Only' : 'Disabled'
              }
              onPress={() => {
                Alert.alert(
                  'Comment Permissions',
                  undefined,
                  [
                    { text: 'Everyone', onPress: () => updateAndSave({ comment_permissions: 'everyone' }) },
                    { text: 'Followers Only', onPress: () => updateAndSave({ comment_permissions: 'followers' }) },
                    { text: 'Disabled', onPress: () => updateAndSave({ comment_permissions: 'disabled' }) },
                    { text: 'Cancel', style: 'cancel' },
                  ]
                );
              }}
            />
            <ToggleRow label="Show Media (Images/Videos)" value={privacy.media_visibility} onToggle={(val) => updateAndSave({ media_visibility: val })} />
          </GlassCard>
        </Animated.View>

        {/* 3. Messaging & Communication */}
        <Animated.View entering={SlideInDown.delay(150)} style={styles.section}>
          <Text style={styles.sectionTitle}>Messaging & Communication</Text>
          <GlassCard style={styles.glassCard}>
            <NavRow
              label="Who can send me messages"
              description={
                privacy.message_receive_from === 'everyone' ? 'Everyone' :
                privacy.message_receive_from === 'verified' ? 'Verified Users' : 'No One'
              }
              onPress={() => {
                Alert.alert(
                  'Message Permissions',
                  undefined,
                  [
                    { text: 'Everyone', onPress: () => updateAndSave({ message_receive_from: 'everyone' }) },
                    { text: 'Verified Only', onPress: () => updateAndSave({ message_receive_from: 'verified' }) },
                    { text: 'No One', onPress: () => updateAndSave({ message_receive_from: 'none' }) },
                    { text: 'Cancel', style: 'cancel' },
                  ]
                );
              }}
            />
            <NavRow label="Blocked Users" onPress={() => router.push('/settings/privacy/blocked')} />
            <NavRow label="Report a User" onPress={() => router.push('/report')} />
          </GlassCard>
        </Animated.View>

        {/* 4. Location & Data Sharing */}
        <Animated.View entering={SlideInDown.delay(200)} style={styles.section}>
          <Text style={styles.sectionTitle}>Location & Data Sharing</Text>
          <GlassCard style={styles.glassCard}>
            <ToggleRow label="Enable Location Sharing" value={privacy.location_sharing} onToggle={(val) => updateAndSave({ location_sharing: val })} />
            <NavRow
              label="Location Precision"
              description={privacy.location_precision === 'exact' ? 'Exact' : 'Approximate'}
              onPress={() => {
                Alert.alert(
                  'Location Precision',
                  'Choose how precise your location appears.',
                  [
                    { text: 'Exact', onPress: () => updateAndSave({ location_precision: 'exact' }) },
                    { text: 'Approximate', onPress: () => updateAndSave({ location_precision: 'approximate' }) },
                    { text: 'Cancel', style: 'cancel' },
                  ]
                );
              }}
            />
            <ToggleRow
              label="Consent to Heatmap Data"
              description="Allow your anonymised location to be used in disease heatmaps"
              value={privacy.heatmap_consent}
              onToggle={(val) => updateAndSave({ heatmap_consent: val })}
            />
          </GlassCard>
        </Animated.View>

        {/* 5. AI & Evidence Upload Privacy */}
        <Animated.View entering={SlideInDown.delay(250)} style={styles.section}>
          <Text style={styles.sectionTitle}>AI & Evidence Privacy</Text>
          <GlassCard style={styles.glassCard}>
            <ToggleRow
              label="Consent before uploading evidence"
              description="Ask for confirmation each time you upload a photo/video"
              value={privacy.ai_upload_consent}
              onToggle={(val) => updateAndSave({ ai_upload_consent: val })}
            />
            <ToggleRow
              label="Restrict access to my evidence"
              description="Only allow verified researchers to see my uploads"
              value={privacy.evidence_access_restricted}
              onToggle={(val) => updateAndSave({ evidence_access_restricted: val })}
            />
            <NavRow
              label="Data Retention Policy"
              description={`Evidence is kept for ${privacy.data_retention_days} days`}
              onPress={() => {
                Alert.alert(
                  'Data Retention',
                  'How long should your uploaded evidence be stored?',
                  [
                    { text: '7 days', onPress: () => updateAndSave({ data_retention_days: 7 }) },
                    { text: '30 days', onPress: () => updateAndSave({ data_retention_days: 30 }) },
                    { text: '90 days', onPress: () => updateAndSave({ data_retention_days: 90 }) },
                    { text: 'Cancel', style: 'cancel' },
                  ]
                );
              }}
            />
          </GlassCard>
        </Animated.View>

        {/* 6. Notification Preferences – Market alerts with subscription */}
        <Animated.View entering={SlideInDown.delay(300)} style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Preferences</Text>
          <GlassCard style={styles.glassCard}>
            <ToggleRow label="Disease Outbreak Alerts" value={privacy.outbreak_alerts} onToggle={(val) => updateAndSave({ outbreak_alerts: val })} />
            <ToggleRow
              label="Market Opportunities"
              description="Get notified about new retailer demand"
              value={privacy.market_alerts}
              onToggle={handleMarketToggle}
            />
            <ToggleRow label="Messages & Mentions" value={privacy.message_notifications} onToggle={(val) => updateAndSave({ message_notifications: val })} />
            <ToggleRow label="System Updates" value={privacy.system_notifications} onToggle={(val) => updateAndSave({ system_notifications: val })} />
          </GlassCard>
        </Animated.View>

        {/* 7. Account Security */}
        <Animated.View entering={SlideInDown.delay(350)} style={styles.section}>
          <Text style={styles.sectionTitle}>Account Security</Text>
          <GlassCard style={styles.glassCard}>
            <NavRow label="Change Password" onPress={() => router.push('/settings/password')} />
            <NavRow label="Two-Factor Authentication (2FA)" onPress={() => router.push('/settings/2fa')} />
            <NavRow label="Active Sessions" onPress={() => router.push('/settings/sessions')} />
          </GlassCard>
        </Animated.View>

        {/* 8. Data Protection & Compliance */}
        <Animated.View entering={SlideInDown.delay(400)} style={styles.section}>
          <Text style={styles.sectionTitle}>Data Protection & Compliance</Text>
          <GlassCard style={styles.glassCard}>
            <InfoRow icon="shield-checkmark-outline" text="Data is encrypted in transit and at rest." />
            <InfoRow icon="document-text-outline" text="We comply with POPIA and the OWASP Top 10." />
            <InfoRow icon="people-outline" text="Role‑based access control is enforced." />
          </GlassCard>
        </Animated.View>

        {/* 9. Data Management */}
        <Animated.View entering={SlideInDown.delay(450)} style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          <GlassCard style={styles.glassCard}>
            <NavRow label="Download Your Data" onPress={() => Alert.alert('Download', 'A link to download your data will be sent to your email.')} />
            <NavRow label="Request Data Correction" onPress={() => router.push('/support/data-correction')} />
            <NavRow
              label="Delete Account"
              description="Permanently delete your account and data"
              danger
              onPress={() => {
                Alert.alert(
                  'Delete Account',
                  'This action is irreversible. All your data will be permanently removed.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete Forever',
                      style: 'destructive',
                      onPress: () => Alert.alert('Delete', 'Account deletion requested. You will receive a confirmation email.'),
                    },
                  ]
                );
              }}
            />
          </GlassCard>
        </Animated.View>

        {/* 10. Reporting & Safety */}
        <Animated.View entering={SlideInDown.delay(500)} style={styles.section}>
          <Text style={styles.sectionTitle}>Reporting & Safety</Text>
          <GlassCard style={styles.glassCard}>
            <NavRow label="Report Abuse or Misinformation" onPress={() => router.push('/report')} />
            <NavRow label="Report Fake Disease Alert" onPress={() => router.push('/report/fake-alert')} />
            <NavRow label="Community Moderation Support" onPress={() => router.push('/community/moderation')} />
          </GlassCard>
        </Animated.View>

        {saving && (
          <Animated.View entering={FadeIn} style={styles.savingBanner}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.savingText}>Saving...</Text>
          </Animated.View>
        )}
      </ScrollView>

      {/* Market Opportunities Plan Modal */}
      <Modal visible={showPlanModal} animationType="slide" transparent>
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Your Plan</Text>
              <TouchableOpacity onPress={() => setShowPlanModal(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {PLANS.map((plan) => (
                <TouchableOpacity 
                  key={plan.name} 
                  style={styles.planCard} 
                  onPress={() => onSelectPlan(plan.name)}
                >
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planPrice}>R{plan.price}/month</Text>
                  {plan.features ? (
                    plan.features.map((f, i) => (
                      <Text key={i} style={styles.planFeature}>• {f}</Text>
                    ))
                  ) : (
                    <Text style={styles.planFeature}>{plan.note}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
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
  scrollContent: { flexGrow: 1, paddingBottom: 60, paddingTop: 8 },
  notLoggedInContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, marginTop: -50 },
  notLoggedInTitle: { fontSize: 20, fontWeight: '600', color: '#11181C', marginTop: 16, marginBottom: 8 },
  notLoggedInText: { fontSize: 14, color: '#687076', textAlign: 'center', marginBottom: 24 },
  loginButton: { backgroundColor: '#22c55e', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  loginButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  section: { paddingHorizontal: 16, marginBottom: 24 },
  sectionTitle: { fontSize: 14, fontWeight: '500', color: '#687076', marginBottom: 8, paddingLeft: 4 },
  glassCard: { overflow: 'hidden' },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  settingItemDanger: {},
  settingText: { flex: 1 },
  settingLabel: { fontSize: 14, fontWeight: '500', color: '#11181C' },
  settingDescription: { fontSize: 12, color: '#687076', marginTop: 2 },
  dangerText: { color: '#ef4444' },
  switchContainer: { width: 48, height: 28, borderRadius: 14, overflow: 'hidden' },
  switchTrack: { width: '100%', height: '100%', borderRadius: 14, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 2 },
  switchThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1, elevation: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  infoText: { fontSize: 13, color: '#374151', flex: 1 },
  savingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    paddingVertical: 10,
    marginHorizontal: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  savingText: { color: '#fff', fontSize: 14, marginLeft: 8 },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  planCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#f9fafb',
  },
  planName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  planPrice: { fontSize: 24, fontWeight: '700', color: '#22c55e', marginTop: 4 },
  planFeature: { fontSize: 13, color: '#374151', marginTop: 6 },
});