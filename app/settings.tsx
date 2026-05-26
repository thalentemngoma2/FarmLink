import { GlassCard } from '@/components/ui/glass-card';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
<<<<<<< HEAD
<<<<<<< HEAD
  Platform,
=======
=======
  Image,
>>>>>>> gozilethu/farmlink-Mbutho
  Modal,
>>>>>>> remotes/gozilethu/farmlink-Mbutho
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
<<<<<<< HEAD
import { supabase } from '@/lib/supabase';


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
=======
import { SafeAreaView } from 'react-native-safe-area-context';

// -----------------------------------------------------------------------------
// Types (unchanged)
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
  market_alerts: boolean;
  message_notifications: boolean;
  system_notifications: boolean;
>>>>>>> remotes/gozilethu/farmlink-Mbutho
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
// Subscription plans (unchanged)
// -----------------------------------------------------------------------------
const PLANS = [
  {
    name: 'Basic',
    price: 49,
    color: '#22c55e',
    maxProducts: 3,
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
    color: '#3b82f6',
    maxProducts: 10,
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
    color: '#8b5cf6',
    maxProducts: Infinity,
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
    color: '#f97316',
    maxProducts: 1,
    note: 'R10 per single promoted product (valid for 7 days)',
  },
];

<<<<<<< HEAD
export default function SettingsPage() {
=======
// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------
export default function PrivacySecurityPage() {
>>>>>>> remotes/gozilethu/farmlink-Mbutho
  const router = useRouter();
  const { user } = useAuth();
  const [privacy, setPrivacy] = useState<PrivacySettings>(defaultPrivacy);
  const [darkMode, setDarkMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [promotedProductCount, setPromotedProductCount] = useState(0);
  const loadingTimeout = useRef<any>(null);

<<<<<<< HEAD
<<<<<<< HEAD
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
      const { data: farmerData } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle();
      if (farmerData) {
        setProfile({ name: farmerData.full_name || user?.name || 'Farmer', email: user?.email || '', membership_type: 'Free', avatar: (farmerData.full_name || user?.name || 'F').charAt(0).toUpperCase() });
      } else {
        const { data: retailData } = await supabase.from('retail_profiles').select('*').eq('user_id', userId).maybeSingle();
        if (retailData) {
          setProfile({ name: retailData.store_name || user?.name || 'Retailer', email: user?.email || '', membership_type: 'Business', avatar: (retailData.store_name || user?.name || 'R').charAt(0).toUpperCase() });
        } else {
          // Fallback if database profile hasn't been created yet
          setProfile({
            name: user?.name || 'New User',
            email: user?.email || '',
            membership_type: 'Free',
            avatar: (user?.name || 'U').charAt(0).toUpperCase()
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch profile', err);
    }
  };

  const fetchSettings = async () => {
    try {
      // Placeholder for fetching settings
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
  };

  const handleSignOut = async () => {
    const executeLogout = async () => {
      try {
        if (logout) await logout();
        router.replace('/login');
      } catch (error) {
        console.error('Logout error', error);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to sign out?')) {
        await executeLogout();
      }
    } else {
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: executeLogout },
      ]);
    }
  };

  const handleShare = async () => {
=======
=======
  // Fake card form state
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [errors, setErrors] = useState<{ number?: string; expiry?: string; cvv?: string }>({});

  // Product form state
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productImages, setProductImages] = useState<string[]>([]);
  const [productVideo, setProductVideo] = useState<string | null>(null);
  const [uploadingProduct, setUploadingProduct] = useState(false);

>>>>>>> gozilethu/farmlink-Mbutho
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
>>>>>>> remotes/gozilethu/farmlink-Mbutho
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
      if (err.code === 'PGRST204' || err.code === '42703') {
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

<<<<<<< HEAD
<<<<<<< HEAD
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
=======
  // Dark mode toggle – actually apply theme via AuthContext or global state.
  // This assumes your AuthContext has a setDarkMode method.
  const { setGlobalDarkMode } = useAuth() as any;   // adjust if your context provides this
=======
  // Dark mode toggle
  const { setGlobalDarkMode } = useAuth() as any;
>>>>>>> gozilethu/farmlink-Mbutho
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
      setShowPlanModal(true);
    } else {
      updateAndSave({ market_alerts: false });
    }
  };

  // Select plan → open payment modal
  const onSelectPlan = (planName: string) => {
    setSelectedPlan(planName);
    setShowPlanModal(false);
    setShowPaymentModal(true);
    setCardNumber('');
    setCardExpiry('');
    setCardCvv('');
    setErrors({});
    setPaymentSuccess(false);
    setPaymentProcessing(false);
  };

<<<<<<< HEAD
  // ---------- Background animations (same as settings page) ----------
>>>>>>> remotes/gozilethu/farmlink-Mbutho
=======
  // Payment form validation
  const validatePayment = () => {
    const newErrors: typeof errors = {};
    if (cardNumber.replace(/\s/g, '').length !== 16) {
      newErrors.number = 'Enter a valid 16‑digit card number';
    }
    if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
      newErrors.expiry = 'Use MM/YY format';
    }
    if (cardCvv.length !== 3) {
      newErrors.cvv = 'CVV must be 3 digits';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Process fake payment with realistic bank deduction UI
  const processPayment = async () => {
    if (!validatePayment()) return;

    setPaymentProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setPaymentProcessing(false);
    setPaymentSuccess(true);
    setShowPaymentModal(false);
    setShowPaymentSuccess(true);
    updateAndSave({ market_alerts: true });
  };

  // Confirm payment success → open product modal with plan limits
  const handlePaymentSuccessContinue = () => {
    setShowPaymentSuccess(false);
    setProductName('');
    setProductDescription('');
    setProductPrice('');
    setProductImages([]);
    setProductVideo(null);
    setShowProductModal(true);
  };

  // Product media picker
  const pickProductImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Gallery access is required to upload images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length) {
      const uris = result.assets.map((a) => a.uri);
      setProductImages((prev) => [...prev, ...uris]);
    }
  };

  const pickProductVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Gallery access is required to upload a video.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length) {
      setProductVideo(result.assets[0].uri);
    }
  };

  // ─────────────────────────────────────────────────────────────
  //  Submit product – now saves to Supabase for community display
  // ─────────────────────────────────────────────────────────────
  const submitProduct = async () => {
    if (!productName.trim() || !productDescription.trim() || !productPrice.trim()) {
      Alert.alert('Missing information', 'Please fill in all product details.');
      return;
    }

    const plan = PLANS.find((p) => p.name === selectedPlan);
    const max = plan?.maxProducts ?? 0;
    if (promotedProductCount >= max) {
      Alert.alert('Limit reached', `Your ${selectedPlan} plan allows up to ${max} promoted product(s).`);
      return;
    }

    setUploadingProduct(true);
    try {
      // 1. Upload images to Supabase Storage
      const imageUrls: string[] = [];
      for (const uri of productImages) {
        const fileName = `products/${user?.id}/${Date.now()}_${Math.random().toString(36).substring(2)}.jpg`;
        const response = await fetch(uri);
        const blob = await response.blob();
        const { error } = await supabase.storage.from('farmlink').upload(fileName, blob, {
          contentType: 'image/jpeg',
        });
        if (error) throw new Error(`Image upload failed: ${error.message}`);
        const { data: { publicUrl } } = supabase.storage.from('farmlink').getPublicUrl(fileName);
        imageUrls.push(publicUrl);
      }

      // 2. Upload video if present
      let videoUrl: string | null = null;
      if (productVideo) {
        const fileName = `products/${user?.id}/${Date.now()}_video.mp4`;
        const response = await fetch(productVideo);
        const blob = await response.blob();
        const { error } = await supabase.storage.from('farmlink').upload(fileName, blob, {
          contentType: 'video/mp4',
        });
        if (error) throw new Error(`Video upload failed: ${error.message}`);
        const { data: { publicUrl } } = supabase.storage.from('farmlink').getPublicUrl(fileName);
        videoUrl = publicUrl;
      }

      // 3. Insert into marketplace_ads
      const { error: insertError } = await supabase.from('marketplace_ads').insert({
        user_id: user!.id,
        plan_name: selectedPlan,
        product_name: productName.trim(),
        description: productDescription.trim(),
        price: parseFloat(productPrice),
        images: imageUrls,
        video_url: videoUrl,
      });

      if (insertError) throw new Error(`Failed to save ad: ${insertError.message}`);

      // Increment count
      setPromotedProductCount((prev) => prev + 1);
      Alert.alert('Product published', `"${productName}" is now promoted to buyers!`);

      // If Pay-Per-Post, close modal after one product
      if (selectedPlan === 'Pay-Per-Post') {
        setShowProductModal(false);
        return;
      }

      // Reset form for next product (keep modal open)
      setProductName('');
      setProductDescription('');
      setProductPrice('');
      setProductImages([]);
      setProductVideo(null);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Something went wrong while publishing your product.');
      console.error('Submit error:', err);
    } finally {
      setUploadingProduct(false);
    }
  };

  const currentPlan = PLANS.find((p) => p.name === selectedPlan);
  const maxProducts = currentPlan?.maxProducts ?? 0;
  const remainingProducts = maxProducts === Infinity ? 'Unlimited' : maxProducts - promotedProductCount;

  // ---------- Background animations (unchanged) ----------
>>>>>>> gozilethu/farmlink-Mbutho
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

<<<<<<< HEAD
  // Animated Switch component
  const AnimatedSwitch: React.FC<{ value: boolean; onValueChange: (value: boolean) => void }> = ({ value, onValueChange }) => {
=======
  // ---------- Reanimated Switch ----------
  const AnimatedSwitch: React.FC<{ value: boolean; onValueChange: (val: boolean) => void }> = ({ value, onValueChange }) => {
>>>>>>> remotes/gozilethu/farmlink-Mbutho
    const translateX = useSharedValue(value ? 20 : 0);
    const bgColor = useSharedValue(value ? 1 : 0);
    useEffect(() => {
      translateX.value = withSpring(value ? 20 : 0);
      bgColor.value = withSpring(value ? 1 : 0);
    }, [value]);
    const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));
<<<<<<< HEAD
    const trackStyle = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(bgColor.value, [0, 1], ['#e5e7eb', '#22c55e']) }));
=======
    const trackStyle = useAnimatedStyle(() => ({
      backgroundColor: interpolateColor(bgColor.value, [0, 1], ['#e5e7eb', '#22c55e']),
    }));

>>>>>>> remotes/gozilethu/farmlink-Mbutho
    return (
      <TouchableOpacity onPress={() => onValueChange(!value)} activeOpacity={0.7} style={styles.switchContainer}>
        <Animated.View style={[styles.switchTrack, trackStyle]}>
          <Animated.View style={[styles.switchThumb, thumbStyle]} />
        </Animated.View>
      </TouchableOpacity>
    );
  };

<<<<<<< HEAD
<<<<<<< HEAD
  if (loading || !profile) {
=======
  // ---------- Helper components ----------
=======
  // ---------- Helper components (unchanged) ----------
>>>>>>> gozilethu/farmlink-Mbutho
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
>>>>>>> remotes/gozilethu/farmlink-Mbutho
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

<<<<<<< HEAD
=======
  // ---------- Main page ----------
>>>>>>> remotes/gozilethu/farmlink-Mbutho
  return (
    <View style={styles.container}>
      <LinearGradient colors={['#f0fdf4', '#ffffff', '#ecfdf5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Animated.View style={[styles.blob, styles.blob1, bgBlob1Style]} />
      <Animated.View style={[styles.blob, styles.blob2, bgBlob2Style]} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
<<<<<<< HEAD
<<<<<<< HEAD
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
=======
        {/* Dark Mode Toggle – now actually changes the app theme */}
=======
        {/* Appearance */}
>>>>>>> gozilethu/farmlink-Mbutho
        <Animated.View entering={SlideInDown.delay(20)} style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <GlassCard style={styles.glassCard}>
            <ToggleRow label={darkMode ? 'Dark Mode' : 'Light Mode'} description="Applies to the entire app" value={darkMode} onToggle={toggleDarkMode} />
          </GlassCard>
        </Animated.View>

        {/* Profile Privacy */}
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
                Alert.alert('Profile Visibility', 'Who can view your profile?', [
                  { text: 'Public', onPress: () => updateAndSave({ profile_visibility: 'public' }) },
                  { text: 'Farmers Only', onPress: () => updateAndSave({ profile_visibility: 'farmers_only' }) },
                  { text: 'Private', onPress: () => updateAndSave({ profile_visibility: 'private' }) },
                  { text: 'Cancel', style: 'cancel' },
                ]);
              }}
            />
          </GlassCard>
        </Animated.View>
>>>>>>> remotes/gozilethu/farmlink-Mbutho

        {/* Post & Content Visibility */}
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
                Alert.alert('Post Visibility', undefined, [
                  { text: 'Public', onPress: () => updateAndSave({ post_visibility: 'public' }) },
                  { text: 'Farmers Only', onPress: () => updateAndSave({ post_visibility: 'farmers_only' }) },
                  { text: 'Groups', onPress: () => updateAndSave({ post_visibility: 'groups' }) },
                  { text: 'Cancel', style: 'cancel' },
                ]);
              }}
            />
            <NavRow
              label="Comment Permissions"
              description={
                privacy.comment_permissions === 'everyone' ? 'Everyone' :
                privacy.comment_permissions === 'followers' ? 'Followers Only' : 'Disabled'
              }
              onPress={() => {
                Alert.alert('Comment Permissions', undefined, [
                  { text: 'Everyone', onPress: () => updateAndSave({ comment_permissions: 'everyone' }) },
                  { text: 'Followers Only', onPress: () => updateAndSave({ comment_permissions: 'followers' }) },
                  { text: 'Disabled', onPress: () => updateAndSave({ comment_permissions: 'disabled' }) },
                  { text: 'Cancel', style: 'cancel' },
                ]);
              }}
            />
            <ToggleRow label="Show Media (Images/Videos)" value={privacy.media_visibility} onToggle={(val) => updateAndSave({ media_visibility: val })} />
          </GlassCard>
        </Animated.View>

        {/* Messaging & Communication */}
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
                Alert.alert('Message Permissions', undefined, [
                  { text: 'Everyone', onPress: () => updateAndSave({ message_receive_from: 'everyone' }) },
                  { text: 'Verified Only', onPress: () => updateAndSave({ message_receive_from: 'verified' }) },
                  { text: 'No One', onPress: () => updateAndSave({ message_receive_from: 'none' }) },
                  { text: 'Cancel', style: 'cancel' },
                ]);
              }}
            />
            <NavRow label="Blocked Users" onPress={() => router.push('/settings/privacy/blocked')} />
            <NavRow label="Report a User" onPress={() => router.push('/report')} />
          </GlassCard>
        </Animated.View>

        {/* Location & Data Sharing */}
        <Animated.View entering={SlideInDown.delay(200)} style={styles.section}>
          <Text style={styles.sectionTitle}>Location & Data Sharing</Text>
          <GlassCard style={styles.glassCard}>
            <ToggleRow label="Enable Location Sharing" value={privacy.location_sharing} onToggle={(val) => updateAndSave({ location_sharing: val })} />
            <NavRow
              label="Location Precision"
              description={privacy.location_precision === 'exact' ? 'Exact' : 'Approximate'}
              onPress={() => {
                Alert.alert('Location Precision', 'Choose how precise your location appears.', [
                  { text: 'Exact', onPress: () => updateAndSave({ location_precision: 'exact' }) },
                  { text: 'Approximate', onPress: () => updateAndSave({ location_precision: 'approximate' }) },
                  { text: 'Cancel', style: 'cancel' },
                ]);
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

        {/* AI & Evidence Privacy */}
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
                Alert.alert('Data Retention', 'How long should your uploaded evidence be stored?', [
                  { text: '7 days', onPress: () => updateAndSave({ data_retention_days: 7 }) },
                  { text: '30 days', onPress: () => updateAndSave({ data_retention_days: 30 }) },
                  { text: '90 days', onPress: () => updateAndSave({ data_retention_days: 90 }) },
                  { text: 'Cancel', style: 'cancel' },
                ]);
              }}
            />
          </GlassCard>
        </Animated.View>

        {/* Notification Preferences */}
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

        {/* Account Security */}
        <Animated.View entering={SlideInDown.delay(350)} style={styles.section}>
          <Text style={styles.sectionTitle}>Account Security</Text>
          <GlassCard style={styles.glassCard}>
            <NavRow label="Change Password" onPress={() => router.push('/settings/password')} />
            <NavRow label="Two-Factor Authentication (2FA)" onPress={() => router.push('/settings/2fa')} />
            <NavRow label="Active Sessions" onPress={() => router.push('/settings/sessions')} />
          </GlassCard>
        </Animated.View>

        {/* Data Protection & Compliance */}
        <Animated.View entering={SlideInDown.delay(400)} style={styles.section}>
          <Text style={styles.sectionTitle}>Data Protection & Compliance</Text>
          <GlassCard style={styles.glassCard}>
            <InfoRow icon="shield-checkmark-outline" text="Data is encrypted in transit and at rest." />
            <InfoRow icon="document-text-outline" text="We comply with POPIA and the OWASP Top 10." />
            <InfoRow icon="people-outline" text="Role‑based access control is enforced." />
          </GlassCard>
        </Animated.View>

        {/* Data Management */}
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
                Alert.alert('Delete Account', 'This action is irreversible.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete Forever', style: 'destructive', onPress: () => Alert.alert('Delete', 'Account deletion requested.') },
                ]);
              }}
            />
          </GlassCard>
        </Animated.View>

        {/* Reporting & Safety */}
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
                  style={[styles.planCard, { borderLeftWidth: 4, borderLeftColor: plan.color }]}
                  onPress={() => onSelectPlan(plan.name)}
                >
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={[styles.planPrice, { color: plan.color }]}>R{plan.price}/month</Text>
                  {plan.features ? (
                    plan.features.map((f, i) => <Text key={i} style={styles.planFeature}>• {f}</Text>)
                  ) : (
                    <Text style={styles.planFeature}>{plan.note}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Payment Modal (Fake Ozow Gateway) */}
      <Modal visible={showPaymentModal} animationType="slide" transparent>
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.paymentModalContainer}>
            <GlassCard style={styles.paymentGlassCard}>
              <View style={styles.ozowBranding}>
                <Ionicons name="wallet-outline" size={24} color="#16a34a" />
                <Text style={styles.ozowText}>Ozow</Text>
              </View>

              <View style={styles.paymentHeader}>
                <Ionicons name="card-outline" size={28} color="#16a34a" />
                <Text style={styles.paymentHeaderTitle}>Secure Payment</Text>
                <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                  <Ionicons name="close" size={24} color="#111827" />
                </TouchableOpacity>
              </View>

              <View style={styles.planSummary}>
                <Text style={styles.planSummaryLabel}>Plan</Text>
                <Text style={styles.planSummaryValue}>{selectedPlan}</Text>
                <Text style={styles.planSummaryLabel}>Amount</Text>
                <Text style={styles.planSummaryAmount}>
                  R{PLANS.find((p) => p.name === selectedPlan)?.price || 0}
                </Text>
              </View>

              <View style={styles.paymentForm}>
                <Text style={styles.paymentFormTitle}>Card Details</Text>
                <Text style={styles.paymentFormNote}>
                  For testing, use any valid‑looking number. No real bank is charged.
                </Text>

                <Text style={styles.inputLabel}>Card Number</Text>
                <TextInput
                  style={[styles.input, errors.number && styles.inputError]}
                  placeholder="0000 0000 0000 0000"
                  placeholderTextColor="#9ca3af"
                  keyboardType="number-pad"
                  maxLength={19}
                  value={cardNumber}
                  onChangeText={(t) => {
                    const cleaned = t.replace(/\D/g, '').slice(0, 16);
                    const formatted = cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
                    setCardNumber(formatted);
                    setErrors((prev) => ({ ...prev, number: undefined }));
                  }}
                />
                {errors.number && <Text style={styles.errorText}>{errors.number}</Text>}

                <View style={styles.row}>
                  <View style={styles.halfInput}>
                    <Text style={styles.inputLabel}>Expiry (MM/YY)</Text>
                    <TextInput
                      style={[styles.input, errors.expiry && styles.inputError]}
                      placeholder="MM/YY"
                      placeholderTextColor="#9ca3af"
                      keyboardType="number-pad"
                      maxLength={5}
                      value={cardExpiry}
                      onChangeText={(t) => {
                        let cleaned = t.replace(/\D/g, '').slice(0, 4);
                        if (cleaned.length >= 2) cleaned = cleaned.slice(0, 2) + '/' + cleaned.slice(2);
                        setCardExpiry(cleaned);
                        setErrors((prev) => ({ ...prev, expiry: undefined }));
                      }}
                    />
                    {errors.expiry && <Text style={styles.errorText}>{errors.expiry}</Text>}
                  </View>
                  <View style={styles.halfInput}>
                    <Text style={styles.inputLabel}>CVV</Text>
                    <TextInput
                      style={[styles.input, errors.cvv && styles.inputError]}
                      placeholder="123"
                      placeholderTextColor="#9ca3af"
                      keyboardType="number-pad"
                      maxLength={3}
                      value={cardCvv}
                      onChangeText={(t) => {
                        const cleaned = t.replace(/\D/g, '').slice(0, 3);
                        setCardCvv(cleaned);
                        setErrors((prev) => ({ ...prev, cvv: undefined }));
                      }}
                    />
                    {errors.cvv && <Text style={styles.errorText}>{errors.cvv}</Text>}
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.payButton, paymentProcessing && styles.payButtonDisabled]}
                onPress={processPayment}
                disabled={paymentProcessing}
              >
                {paymentProcessing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.payButtonText}>Pay Now</Text>
                )}
              </TouchableOpacity>
            </GlassCard>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Payment Success Modal */}
      <Modal visible={showPaymentSuccess} animationType="fade" transparent>
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.successContainer}>
            <GlassCard style={styles.successGlassCard}>
              <Ionicons name="checkmark-circle" size={64} color="#16a34a" />
              <Text style={styles.successTitle}>Payment Successful</Text>
              <Text style={styles.successAmount}>
                R{PLANS.find((p) => p.name === selectedPlan)?.price || 0} deducted
              </Text>
              <View style={styles.successDetails}>
                <Text style={styles.successDetailText}>Plan: {selectedPlan}</Text>
                <Text style={styles.successDetailText}>
                  Reference: OZOW-{Math.random().toString(36).substr(2, 9).toUpperCase()}
                </Text>
                <Text style={styles.successDetailText}>Date: {new Date().toLocaleDateString()}</Text>
              </View>
              <TouchableOpacity
                style={styles.payButton}
                onPress={handlePaymentSuccessContinue}
              >
                <Text style={styles.payButtonText}>Promote a Product</Text>
              </TouchableOpacity>
            </GlassCard>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Product Upload Modal */}
      <Modal visible={showProductModal} animationType="slide" transparent>
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.productModalContainer}>
            <GlassCard style={styles.productGlassCard}>
              <View style={styles.paymentHeader}>
                <Ionicons name="add-circle-outline" size={28} color="#16a34a" />
                <Text style={styles.paymentHeaderTitle}>Promote Your Product</Text>
                <TouchableOpacity onPress={() => setShowProductModal(false)}>
                  <Ionicons name="close" size={24} color="#111827" />
                </TouchableOpacity>
              </View>

              <View style={styles.planUsageCard}>
                <Text style={styles.planUsageText}>
                  {selectedPlan} plan – {promotedProductCount} of{' '}
                  {maxProducts === Infinity ? '∞' : maxProducts} products used this month
                </Text>
                <Text style={styles.planUsageRemaining}>
                  {remainingProducts === 'Unlimited'
                    ? 'Unlimited promotions'
                    : `${remainingProducts} remaining`}
                </Text>
              </View>

              <ScrollView style={{ maxHeight: 450 }} showsVerticalScrollIndicator={false}>
                <Text style={styles.inputLabel}>Product Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Fresh Avocados"
                  placeholderTextColor="#9ca3af"
                  value={productName}
                  onChangeText={setProductName}
                />

                <Text style={[styles.inputLabel, { marginTop: 16 }]}>Description</Text>
                <TextInput
                  style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                  placeholder="Describe your product..."
                  placeholderTextColor="#9ca3af"
                  multiline
                  value={productDescription}
                  onChangeText={setProductDescription}
                />

                <Text style={[styles.inputLabel, { marginTop: 16 }]}>Price (ZAR)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 150"
                  placeholderTextColor="#9ca3af"
                  keyboardType="decimal-pad"
                  value={productPrice}
                  onChangeText={setProductPrice}
                />

                <Text style={[styles.inputLabel, { marginTop: 16 }]}>Images</Text>
                <View style={styles.mediaRow}>
                  <TouchableOpacity style={styles.mediaButton} onPress={pickProductImages}>
                    <Ionicons name="images-outline" size={24} color="#16a34a" />
                    <Text style={styles.mediaButtonText}>Add Images</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.mediaButton} onPress={pickProductVideo}>
                    <Ionicons name="videocam-outline" size={24} color="#16a34a" />
                    <Text style={styles.mediaButtonText}>Add Video</Text>
                  </TouchableOpacity>
                </View>
                {productImages.length > 0 && (
                  <ScrollView horizontal style={styles.imagePreviewScroll} contentContainerStyle={{ gap: 8 }}>
                    {productImages.map((uri, idx) => (
                      <Image key={idx} source={{ uri }} style={styles.previewThumb} />
                    ))}
                  </ScrollView>
                )}
                {productVideo && (
                  <View style={styles.videoPreview}>
                    <Ionicons name="videocam" size={24} color="#16a34a" />
                    <Text style={styles.videoText}>Video attached</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.payButton, { marginTop: 24 }, uploadingProduct && styles.payButtonDisabled]}
                  onPress={submitProduct}
                  disabled={uploadingProduct || (remainingProducts !== 'Unlimited' && remainingProducts <= 0)}
                >
                  {uploadingProduct ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.payButtonText}>
                      {remainingProducts === 'Unlimited' || remainingProducts > 0
                        ? 'Publish Product'
                        : 'Limit Reached'}
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </GlassCard>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

<<<<<<< HEAD
=======
// -----------------------------------------------------------------------------
// Styles (unchanged)
// -----------------------------------------------------------------------------
>>>>>>> remotes/gozilethu/farmlink-Mbutho
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  blob: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(34,197,94,0.2)' },
  blob1: { width: 200, height: 200, top: -50, left: -50 },
  blob2: { width: 250, height: 250, bottom: -50, right: -50 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'rgba(255,255,255,0.7)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.3)', },
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
  settingItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', },
  settingItemDanger: {},
  settingText: { flex: 1 },
  settingLabel: { fontSize: 14, fontWeight: '500', color: '#11181C' },
  settingDescription: { fontSize: 12, color: '#687076', marginTop: 2 },
  dangerText: { color: '#ef4444' },
  switchContainer: { width: 48, height: 28, borderRadius: 14, overflow: 'hidden' },
  switchTrack: { width: '100%', height: '100%', borderRadius: 14, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 2 },
<<<<<<< HEAD
   switchThumb: { ...Platform.select({ web: { boxShadow: '0px 1px 2px rgba(0,0,0,0.2)' }, default: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1, elevation: 2 } }), width: 24, height: 24, borderRadius: 12, backgroundColor: 'white' },
  versionContainer: { alignItems: 'center', marginTop: 32, marginBottom: 16 },
  versionText: { fontSize: 12, color: '#9ca3af' },
  versionSubtext: { fontSize: 10, color: '#9ca3af', marginTop: 4 },
=======
  switchThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1, elevation: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  infoText: { fontSize: 13, color: '#374151', flex: 1 },
  savingBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#22c55e', paddingVertical: 10, marginHorizontal: 16, borderRadius: 12, marginTop: 12, },
  savingText: { color: '#fff', fontSize: 14, marginLeft: 8 },
  // Plan Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: '90%', backgroundColor: '#ffffff', borderRadius: 20, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  planCard: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 16, marginBottom: 12, backgroundColor: '#f9fafb' },
  planName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  planPrice: { fontSize: 24, fontWeight: '700', marginTop: 4 },
  planFeature: { fontSize: 13, color: '#374151', marginTop: 6 },
<<<<<<< HEAD
>>>>>>> remotes/gozilethu/farmlink-Mbutho
=======
  // Payment Modal
  paymentModalContainer: { width: '90%', maxWidth: 400 },
  paymentGlassCard: { borderRadius: 24, padding: 24, backgroundColor: 'rgba(255,255,255,0.85)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)', },
  ozowBranding: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16, gap: 8, },
  ozowText: { fontSize: 22, fontWeight: '800', color: '#16a34a', letterSpacing: 1, },
  paymentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, },
  paymentHeaderTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginLeft: 8, flex: 1 },
  planSummary: { backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)', },
  planSummaryLabel: { fontSize: 13, color: '#4b5563', marginTop: 4 },
  planSummaryValue: { fontSize: 18, fontWeight: '700', color: '#111827' },
  planSummaryAmount: { fontSize: 28, fontWeight: '800', color: '#16a34a', marginTop: 4 },
  paymentForm: { marginBottom: 24 },
  paymentFormTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 8 },
  paymentFormNote: { fontSize: 12, color: '#6b7280', marginBottom: 16, lineHeight: 18 },
  inputLabel: { fontSize: 13, fontWeight: '500', color: '#4b5563', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: 'rgba(209,213,219,0.8)', borderRadius: 12, padding: 14, fontSize: 16, backgroundColor: 'rgba(255,255,255,0.9)', color: '#111827', },
  inputError: { borderColor: '#ef4444' },
  errorText: { color: '#ef4444', fontSize: 12, marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  halfInput: { flex: 0.48 },
  payButton: { backgroundColor: '#22c55e', borderRadius: 30, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', marginTop: 8, shadowColor: '#22c55e', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4, },
  payButtonDisabled: { opacity: 0.6 },
  payButtonText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  // Payment Success
  successContainer: { width: '90%', maxWidth: 400 },
  successGlassCard: { borderRadius: 24, padding: 32, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.85)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)', },
  successTitle: { fontSize: 22, fontWeight: '800', color: '#16a34a', marginTop: 16, marginBottom: 8 },
  successAmount: { fontSize: 32, fontWeight: '800', color: '#111827', marginBottom: 16 },
  successDetails: { width: '100%', marginBottom: 24 },
  successDetailText: { fontSize: 14, color: '#4b5563', marginBottom: 4 },
  // Product Modal
  productModalContainer: { width: '90%', maxWidth: 400 },
  productGlassCard: { borderRadius: 24, padding: 24, backgroundColor: 'rgba(255,255,255,0.85)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)', },
  planUsageCard: { backgroundColor: 'rgba(34,197,94,0.08)', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)', },
  planUsageText: { fontSize: 14, fontWeight: '500', color: '#166534' },
  planUsageRemaining: { fontSize: 13, color: '#4b5563', marginTop: 4 },
  mediaRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  mediaButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 14, padding: 12, backgroundColor: 'rgba(255,255,255,0.8)', },
  mediaButtonText: { fontSize: 14, fontWeight: '500', color: '#111827' },
  imagePreviewScroll: { marginTop: 12 },
  previewThumb: { width: 80, height: 80, borderRadius: 12, resizeMode: 'cover' },
  videoPreview: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  videoText: { fontSize: 14, color: '#4b5563' },
>>>>>>> gozilethu/farmlink-Mbutho
});