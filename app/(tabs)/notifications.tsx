import { BottomNav } from '@/components/bottom-nav';
import { GlassCard } from '@/components/ui/glass-card';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { Link, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import OutbreakHeatMap from '@/components/OutbreakHeatMap';
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
  Layout,
  SlideInLeft,
  SlideOutRight,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';


// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  actionUrl?: string;
  iconName: string;
  iconColor: string;
}

const getIconProps = (type: string) => {
  const mapping: Record<string, { name: string; color: string }> = {
    reply: { name: 'chatbubble-outline', color: '#3b82f6' },
    like: { name: 'heart-outline', color: '#ec489a' },
    follow: { name: 'person-add-outline', color: '#8b5cf6' },
    achievement: { name: 'trophy-outline', color: '#f59e0b' },
    alert: { name: 'alert-circle-outline', color: '#ef4444' },
    system: { name: 'checkmark-circle-outline', color: '#22c55e' },
    outbreak_alert: { name: 'warning-outline', color: '#f97316' },
  };
  return mapping[type] || { name: 'notifications-outline', color: '#9ca3af' };
};

// ------------------ Comprehensive animal list (100+ options) ------------------
const ANIMAL_TYPES = [
  'Cow', 'Bull', 'Heifer', 'Calf', 'Dairy Cow', 'Beef Cattle',
  'Chicken', 'Broiler', 'Layer', 'Chick', 'Rooster',
  'Goat', 'Kid', 'Doe', 'Buck',
  'Sheep', 'Lamb', 'Ewe', 'Ram',
  'Pig', 'Piglet', 'Sow', 'Boar',
  'Duck', 'Duckling', 'Turkey', 'Goose', 'Guinea Fowl', 'Quail',
  'Horse', 'Donkey', 'Mule', 'Camel', 'Llama', 'Alpaca',
  'Rabbit', 'Guinea Pig', 'Hamster', 'Rat', 'Mouse',
  'Fish (Tilapia)', 'Fish (Catfish)', 'Fish (Salmon)', 'Fish (Trout)', 'Shrimp', 'Prawn',
  'Bee', 'Silkworm', 'Snail', 'Cricket', 'Mealworm',
  'Dog', 'Cat', 'Parrot', 'Canary', 'Finch', 'Pigeon',
  'Ostrich', 'Emu', 'Peacock', 'Swan', 'Pheasant',
  'Bison', 'Buffalo', 'Yak', 'Zebu',
  'Deer', 'Elk', 'Moose', 'Antelope',
  'Iguana', 'Snake', 'Turtle', 'Frog', 'Salamander',
  'Other livestock', 'Other poultry', 'Other pet', 'Other wildlife',
];

// ------------------ Enhanced OutbreakReport ------------------
const MAX_MEDIA = 5;
const MAX_REPORTS_PER_DAY = 3;

function OutbreakReport({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) {
  const { user } = useAuth();
  const [animalType, setAnimalType] = useState('');
  const [diseaseName, setDiseaseName] = useState('');
  const [description, setDescription] = useState('');
  const [affectedCount, setAffectedCount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [location, setLocationState] = useState<{ lat: number; lon: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState('');
  const [mediaItems, setMediaItems] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [reportCountToday, setReportCountToday] = useState(0);
  const [showAnimalPicker, setShowAnimalPicker] = useState(false);
  const [animalSearch, setAnimalSearch] = useState('');

  // Daily report count
  useEffect(() => {
    const checkRateLimit = async () => {
      if (!user) return;
      const today = new Date().toISOString().split('T')[0];
      const { count, error } = await supabase
        .from('outbreak_reports')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', today)
        .lt('created_at', new Date(new Date(today).getTime() + 86400000).toISOString());
      if (!error && count != null) setReportCountToday(count);
    };
    checkRateLimit();
  }, [user]);

  // Location fetch
  const fetchLocation = useCallback(async () => {
    setLocationLoading(true);
    setLocationError('');
    try {
      if (Platform.OS === 'web') {
        setLocationLoading(false);
        setLocationError('Location not supported on web.');
        return;
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied.');
        setLocationLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setLocationState({ lat: loc.coords.latitude, lon: loc.coords.longitude });
    } catch (err) {
      setLocationError('Could not fetch location.');
    } finally {
      setLocationLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  const getDeviceSignature = async (): Promise<string> => {
    let sig = await AsyncStorage.getItem('device_sig');
    if (!sig) {
      sig = 'dev_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
      await AsyncStorage.setItem('device_sig', sig);
    }
    return sig;
  };

  // Filtered animal list based on search
  const filteredAnimals = ANIMAL_TYPES.filter((a) =>
    a.toLowerCase().includes(animalSearch.toLowerCase())
  );

  // ---------- Media picker (camera + gallery) ----------
  const takePhoto = async () => {
    if (mediaItems.length >= MAX_MEDIA) {
      Alert.alert('Limit reached', `You can attach up to ${MAX_MEDIA} files.`);
      return;
    }
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera permission required', 'Please allow camera access.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: false,
      quality: 0.8,
      videoMaxDuration: 30,
    });
    if (!result.canceled && result.assets[0]) {
      setMediaItems(prev => [...prev, result.assets[0]]);
    }
  };

  const pickFromGallery = async () => {
    if (mediaItems.length >= MAX_MEDIA) {
      Alert.alert('Limit reached', `You can attach up to ${MAX_MEDIA} files.`);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: false,
      quality: 0.8,
      videoMaxDuration: 30,
    });
    if (!result.canceled && result.assets[0]) {
      setMediaItems(prev => [...prev, result.assets[0]]);
    }
  };

  const showMediaOptions = () => {
    Alert.alert(
      'Add Evidence',
      'Choose a method',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Gallery', onPress: pickFromGallery },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const removeMedia = (index: number) => {
    setMediaItems(prev => prev.filter((_, i) => i !== index));
  };

  // ---------- Evidence date validation (7‑day rule) ----------
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

  const validateEvidenceDate = async (asset: ImagePicker.ImagePickerAsset): Promise<boolean> => {
    try {
      let mediaDate: Date | null = null;

      if (asset.exif && (asset.exif.DateTimeOriginal || asset.exif.DateTime)) {
        const dateStr = asset.exif.DateTimeOriginal || asset.exif.DateTime;
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
          mediaDate = parsed;
        }
      }

      if (!mediaDate) {
        const fileInfo = await FileSystem.getInfoAsync(asset.uri);
        if (fileInfo.exists && fileInfo.modificationTime) {
          mediaDate = new Date(fileInfo.modificationTime * 1000);
        }
      }

      if (!mediaDate) return true; // can't determine date → allow

      const now = new Date();
      const diff = now.getTime() - mediaDate.getTime();
      return diff <= SEVEN_DAYS_MS;
    } catch {
      return true;
    }
  };

  // ---------- Upload evidence (using legacy expo‑file‑system) ----------
  const uploadEvidence = async (uri: string, type: 'image' | 'video'): Promise<string> => {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], {
        type: type === 'image' ? 'image/jpeg' : 'video/mp4',
      });

      const fileExt = uri.split('.').pop()?.toLowerCase() || (type === 'image' ? 'jpg' : 'mp4');
      const fileName = `outbreaks/${user?.id}/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { error } = await supabase.storage
        .from('farmlink')
        .upload(fileName, blob, {
          contentType: type === 'image' ? 'image/jpeg' : 'video/mp4',
          cacheControl: '3600',
        });

      if (error) throw new Error(`Storage upload failed: ${error.message}`);

      const { data: publicUrl } = supabase.storage.from('farmlink').getPublicUrl(fileName);
      return publicUrl.publicUrl;
    } catch (err) {
      console.error('Upload error:', err);
      throw err;
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Authentication required', 'You must be logged in.');
      return;
    }
    if (!animalType || !diseaseName || !affectedCount) {
      Alert.alert('Missing fields', 'Please fill in animal type, disease, and number of affected animals.');
      return;
    }
    if (mediaItems.length === 0) {
      Alert.alert('Evidence required', 'Add at least one photo or video (camera or gallery).');
      return;
    }
    if (reportCountToday >= MAX_REPORTS_PER_DAY) {
      Alert.alert('Daily limit', `You have already submitted ${MAX_REPORTS_PER_DAY} reports today.`);
      return;
    }
    if (!location) {
      Alert.alert('Location pending', 'Please wait while we determine your location, or press Retry.');
      return;
    }

    // Validate evidence date
    for (const asset of mediaItems) {
      const isValid = await validateEvidenceDate(asset);
      if (!isValid) {
        Alert.alert(
          'Evidence too old',
          'All photos/videos must be taken within the last 7 days. Please provide fresh evidence.'
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      const evidenceUrls: string[] = [];
      for (const asset of mediaItems) {
        const type = asset.type === 'video' ? 'video' : 'image';
        const url = await uploadEvidence(asset.uri, type);
        evidenceUrls.push(url);
      }

      const deviceSig = await getDeviceSignature();

      const { data, error } = await supabase
        .from('outbreak_reports')
        .insert({
          user_id: user.id,
          animal_type: animalType.toLowerCase(),
          disease_name: diseaseName,
          description,
          location: `${location.lat},${location.lon}`,
          latitude: location.lat,
          longitude: location.lon,
          status: 'pending',
          evidence_urls: evidenceUrls,
          evidence_count: evidenceUrls.length,
          device_signature: deviceSig,
          affected_count: parseInt(affectedCount, 10) || 0,
        })
        .select('id')
        .single();

      if (error) throw error;

      try {
        await supabase.rpc('update_outbreak_confidence', { report_uuid: data.id });
        await supabase.rpc('create_outbreak_notifications', { report_uuid: data.id });
      } catch (rpcError) {
        console.warn('RPC call failed (may not exist):', rpcError);
      }

      setReportCountToday(prev => prev + 1);
      onSuccess?.();
      Alert.alert('Report submitted', 'Thank you for helping the community!');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit report.');
      console.error('Submit error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={reportStyles.modalContent}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={reportStyles.modalHeader}>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={26} color="#111827" />
        </TouchableOpacity>
        <Text style={reportStyles.modalTitle}>Report Outbreak</Text>
        <View style={{ width: 26 }} />
      </View>

      {/* Animal Type (searchable modal) */}
      <Text style={reportStyles.label}>Animal *</Text>
      <TouchableOpacity
        style={reportStyles.input}
        onPress={() => setShowAnimalPicker(true)}
      >
        <Text style={{ color: animalType ? '#111827' : '#9ca3af' }}>
          {animalType || 'Tap to select animal'}
        </Text>
      </TouchableOpacity>

      {/* Disease Name */}
      <Text style={reportStyles.label}>Disease *</Text>
      <TextInput
        style={reportStyles.input}
        placeholder="e.g., Foot and Mouth Disease"
        placeholderTextColor="#9ca3af"
        value={diseaseName}
        onChangeText={setDiseaseName}
        maxLength={80}
      />

      {/* Number of affected animals */}
      <Text style={reportStyles.label}>Number of Affected Animals *</Text>
      <TextInput
        style={reportStyles.input}
        placeholder="e.g., 50"
        placeholderTextColor="#9ca3af"
        value={affectedCount}
        onChangeText={setAffectedCount}
        keyboardType="numeric"
        maxLength={10}
      />

      {/* Description */}
      <Text style={reportStyles.label}>Description (optional)</Text>
      <TextInput
        style={[reportStyles.input, { minHeight: 80 }]}
        multiline
        textAlignVertical="top"
        placeholder="Describe symptoms, affected count, etc."
        placeholderTextColor="#9ca3af"
        value={description}
        onChangeText={setDescription}
        maxLength={500}
      />

      {/* Evidence Card */}
      <View style={[reportStyles.card, { marginTop: 20 }]}>
        <View style={reportStyles.cardHeader}>
          <Ionicons name="camera-outline" size={20} color="#374151" />
          <Text style={reportStyles.cardTitle}>📸 Evidence *</Text>
        </View>
        <Text style={reportStyles.cardHint}>
          Add up to {MAX_MEDIA} photos/videos (max 7 days old).
        </Text>
        <View style={reportStyles.mediaRow}>
          {mediaItems.map((asset, idx) => (
            <View key={idx} style={reportStyles.mediaThumb}>
              <Image source={{ uri: asset.uri }} style={reportStyles.thumbImage} />
              <TouchableOpacity style={reportStyles.mediaRemove} onPress={() => removeMedia(idx)}>
                <Ionicons name="close-circle" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
          {mediaItems.length < MAX_MEDIA && (
            <TouchableOpacity style={reportStyles.addMediaButton} onPress={showMediaOptions}>
              <Ionicons name="add" size={32} color="#22c55e" />
              <Text style={{ color: '#22c55e', fontSize: 13, marginTop: 4 }}>Add</Text>
            </TouchableOpacity>
          )}
        </View>
        {mediaItems.length === 0 && (
          <Text style={reportStyles.cardErrorText}>At least one photo or video is required.</Text>
        )}
      </View>

      {/* Location Card */}
      <View style={[reportStyles.card, { flexDirection: 'row' }]}>
        <Ionicons name="location-outline" size={24} color="#22c55e" style={{ marginRight: 12 }} />
        <View style={{ flex: 1 }}>
          {locationLoading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#22c55e" />
              <Text style={{ marginLeft: 8, color: '#4b5563' }}>Determining your location...</Text>
            </View>
          ) : location ? (
            <View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>
                📍 Location acquired ({location.lat.toFixed(4)}, {location.lon.toFixed(4)})
              </Text>
              <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                This will be placed on the map.
              </Text>
            </View>
          ) : (
            <View>
              <Text style={{ color: '#ef4444', fontSize: 14, marginBottom: 8 }}>
                {locationError || 'Location unavailable.'}
              </Text>
              <TouchableOpacity
                style={reportStyles.retryLocationButton}
                onPress={fetchLocation}
              >
                <Ionicons name="refresh" size={16} color="#22c55e" />
                <Text style={{ color: '#22c55e', fontSize: 14, fontWeight: '600', marginLeft: 4 }}>
                  Retry Location
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Rate limit */}
      <View style={[reportStyles.card, { flexDirection: 'row' }]}>
        <Ionicons name="information-circle-outline" size={20} color="#6b7280" />
        <Text style={{ fontSize: 13, color: '#4b5563', marginLeft: 8, flex: 1 }}>
          You have submitted {reportCountToday} out of {MAX_REPORTS_PER_DAY} reports today.
        </Text>
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[
          reportStyles.submitButton,
          Platform.OS === 'web' ? reportStyles.submitButtonShadowWeb : reportStyles.submitButtonShadowNative,
          (submitting || reportCountToday >= MAX_REPORTS_PER_DAY || !location) &&
            reportStyles.submitButtonDisabled,
        ]}
        onPress={handleSubmit}
        disabled={submitting || reportCountToday >= MAX_REPORTS_PER_DAY || !location}
        activeOpacity={0.8}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={reportStyles.submitButtonText}>Submit Report</Text>
        )}
      </TouchableOpacity>

      {/* Animal Picker Modal */}
      <Modal visible={showAnimalPicker} animationType="slide" transparent>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={{ padding: 16, borderBottomWidth: 1, borderColor: '#e5e7eb', flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => { setShowAnimalPicker(false); setAnimalSearch(''); }}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
            <TextInput
              style={{ flex: 1, marginLeft: 12, fontSize: 16, color: '#111827' }}
              placeholder="Search animals..."
              placeholderTextColor="#9ca3af"
              value={animalSearch}
              onChangeText={setAnimalSearch}
              autoFocus
            />
          </View>
          <FlatList
            data={filteredAnimals}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={{ paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderColor: '#f0f0f0' }}
                onPress={() => {
                  setAnimalType(item);
                  setShowAnimalPicker(false);
                  setAnimalSearch('');
                }}
              >
                <Text style={{ fontSize: 16, color: '#111827' }}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </ScrollView>
  );
}

const reportStyles = StyleSheet.create({
  modalContent: { padding: 24, flexGrow: 1 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: { fontSize: 22, fontWeight: '700', color: '#111827' },
  label: { fontSize: 15, fontWeight: '600', color: '#374151', marginTop: 20, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    backgroundColor: '#fff',
    color: '#111827',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  cardHint: { fontSize: 13, color: '#6b7280', marginBottom: 12 },
  cardErrorText: { color: '#ef4444', fontSize: 13, marginTop: 8 },
  mediaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  mediaThumb: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
  },
  thumbImage: { width: '100%', height: '100%' },
  mediaRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 11,
  },
  addMediaButton: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#22c55e',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#22c55e',
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 30,
  },
  submitButtonShadowNative: {
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  submitButtonShadowWeb: {
    boxShadow: '0 4px 6px rgba(34,197,94,0.3)',
  },
  submitButtonDisabled: { backgroundColor: '#9ca3af' },
  submitButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});

// ---------------------------------------------------------------------------
// Main Notifications Page
// ---------------------------------------------------------------------------
export default function NotificationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'alerts' | 'outbreaks'>('alerts');
  const [showReportModal, setShowReportModal] = useState(false);

  const initialFetchDone = useRef(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map((n: any) => {
        const { name: iconName, color: iconColor } = getIconProps(n.type);
        return {
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          time: new Date(n.created_at).toLocaleString(),
          read: n.read,
          actionUrl: n.action_url,
          iconName,
          iconColor,
        };
      });
      setNotifications(formatted);
    } catch (err: any) {
      console.error('Failed to load notifications', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && !initialFetchDone.current) {
      fetchNotifications();
      initialFetchDone.current = true;
    }
  }, [user, fetchNotifications]);

  const markAsRead = async (id: string) => {
    if (!user) return;
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id)
        .eq('user_id', user.id);
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const deleteNotification = async (id: string) => {
    if (!user) return;
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const filteredNotifications = filter === 'all' ? notifications : notifications.filter(n => !n.read);

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
  }, [bgScale1, bgScale2, bgX1, bgX2, bgY1, bgY2]);

  const onReportSubmitted = useCallback(() => {
    setShowReportModal(false);
    fetchNotifications();
  }, [fetchNotifications]);

  const bgBlob1Style = useAnimatedStyle(() => ({
    transform: [{ scale: bgScale1.value }, { translateX: bgX1.value }, { translateY: bgY1.value }],
  }));
  const bgBlob2Style = useAnimatedStyle(() => ({
    transform: [{ scale: bgScale2.value }, { translateX: bgX2.value }, { translateY: bgY2.value }],
  }));


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#f0fdf4', '#ffffff', '#ecfdf5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[styles.blob, styles.blob1, bgBlob1Style]} />
      <Animated.View style={[styles.blob, styles.blob2, bgBlob2Style]} />

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'alerts' && styles.activeTab]}
          onPress={() => setActiveTab('alerts')}
        >
          <Ionicons name="notifications" size={20} color={activeTab === 'alerts' ? '#22c55e' : '#9ca3af'} />
          <Text style={[styles.tabText, activeTab === 'alerts' && styles.activeTabText]}>My Alerts</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'outbreaks' && styles.activeTab]}
          onPress={() => setActiveTab('outbreaks')}
        >
          <Ionicons name="map-outline" size={20} color={activeTab === 'outbreaks' ? '#22c55e' : '#9ca3af'} />
          <Text style={[styles.tabText, activeTab === 'outbreaks' && styles.activeTabText]}>Outbreak Map</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'alerts' ? (
          <>
            <Animated.View entering={FadeIn.delay(100)} style={styles.filterContainer}>
              <View style={styles.filterButtons}>
                <TouchableOpacity
                  style={[styles.filterButton, filter === 'all' && styles.filterActive]}
                  onPress={() => setFilter('all')}
                >
                  <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterButton, filter === 'unread' && styles.filterActive]}
                  onPress={() => setFilter('unread')}
                >
                  <Text style={[styles.filterText, filter === 'unread' && styles.filterTextActive]}>
                    Unread ({unreadCount})
                  </Text>
                </TouchableOpacity>
              </View>
              {unreadCount > 0 && (
                <TouchableOpacity onPress={markAllAsRead}>
                  <Text style={styles.markAllText}>Mark all read</Text>
                </TouchableOpacity>
              )}
            </Animated.View>

            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : filteredNotifications.length === 0 ? (
              <Animated.View entering={FadeIn} style={styles.emptyContainer}>
                <GlassCard style={styles.emptyCard}>
                  <View style={styles.emptyIcon}>
                    <Ionicons name="notifications-outline" size={32} color="#22c55e" />
                  </View>
                  <Text style={styles.emptyText}>No notifications yet</Text>
                </GlassCard>
              </Animated.View>
            ) : (
              <View style={styles.notificationsList}>
                {filteredNotifications.map((notification, index) => (
                  <Animated.View
                    key={notification.id}
                    entering={SlideInLeft.delay(index * 50)}
                    exiting={SlideOutRight}
                    layout={Layout.springify()}
                  >
                    <GlassCard style={[styles.notificationCard, !notification.read && styles.unreadCard]}>
                      <View style={styles.notificationContent}>
                        <View style={[styles.iconContainer, { backgroundColor: `${notification.iconColor}20` }]}>
                          <Ionicons name={notification.iconName as any} size={20} color={notification.iconColor} />
                        </View>
                        <View style={styles.textContainer}>
                          <View style={styles.titleRow}>
                            <Text style={[styles.title, !notification.read && styles.titleUnread]}>
                              {notification.title}
                            </Text>
                            <Text style={styles.time}>{notification.time}</Text>
                          </View>
                          <Text style={styles.message} numberOfLines={2}>
                            {notification.message}
                          </Text>
                          <View style={styles.actions}>
                            {!notification.read && (
                              <TouchableOpacity onPress={() => markAsRead(notification.id)}>
                                <Text style={styles.actionText}>Mark as read</Text>
                              </TouchableOpacity>
                            )}
                            {notification.actionUrl && (
                              <Link href={notification.actionUrl as any} asChild>
                                <TouchableOpacity
                                  onPress={() => {
                                    if (Platform.OS === 'web' && typeof document !== 'undefined') {
                                      (document.activeElement as HTMLElement)?.blur?.();
                                    }
                                  }}
                                >
                                  <Text style={styles.actionText}>View</Text>
                                </TouchableOpacity>
                              </Link>
                            )}
                            <TouchableOpacity onPress={() => deleteNotification(notification.id)} style={styles.deleteButton}>
                              <Ionicons name="trash-outline" size={16} color="#9ca3af" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </GlassCard>
                  </Animated.View>
                ))}
              </View>
            )}
          </>
        ) : (
          <View style={styles.outbreakContainer}>
            <OutbreakHeatMap />
            <TouchableOpacity
              style={styles.reportButton}
              onPress={() => setShowReportModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.reportButtonText}>Report an Outbreak</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showReportModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowReportModal(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
          <OutbreakReport onClose={() => setShowReportModal(false)} onSuccess={onReportSubmitted} />
        </SafeAreaView>
      </Modal>

      <TouchableOpacity 
        style={styles.aiFab} 
        onPress={() => router.push('/ai')}
        activeOpacity={0.8}
      >
        <Ionicons name="sparkles" size={24} color="#fff" />
      </TouchableOpacity>

      <BottomNav />
    </View>
  );
}

// ------------------ Styles for Notifications Page ------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  blob: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(34,197,94,0.2)' },
  blob1: { width: 200, height: 200, top: -50, left: -50 },
  blob2: { width: 250, height: 250, bottom: -50, right: -50 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.3)',
  },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#11181C' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, backgroundColor: '#fff' },
  activeTab: { backgroundColor: '#f0fdf4' },
  tabText: { fontSize: 14, fontWeight: '500', color: '#9ca3af' },
  activeTabText: { color: '#22c55e' },
  scrollContent: { flexGrow: 1, paddingBottom: 80 },
  filterContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginTop: 16, marginBottom: 16 },
  filterButtons: { flexDirection: 'row', gap: 8 },
  filterButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.5)' },
  filterActive: { backgroundColor: '#22c55e' },
  filterText: { fontSize: 14, fontWeight: '500', color: '#687076' },
  filterTextActive: { color: 'white' },
  markAllText: { fontSize: 14, fontWeight: '500', color: '#22c55e' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 50 },
  emptyCard: { padding: 24, alignItems: 'center' },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(34,197,94,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyText: { fontSize: 14, color: '#687076' },
  notificationsList: { paddingHorizontal: 16, gap: 12, marginBottom: 16 },
  notificationCard: { padding: 0, overflow: 'hidden' },
   unreadCard: { borderWidth: 1, borderColor: '#22c55e', ...Platform.select({ web: { boxShadow: '0px 0px 4px rgba(34,197,94,0.2)' }, default: { shadowColor: '#22c55e', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.2, shadowRadius: 4 } }) },
  notificationContent: { flexDirection: 'row', padding: 12, gap: 12 },
  iconContainer: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  textContainer: { flex: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { fontSize: 14, fontWeight: '500', color: '#687076' },
  titleUnread: { color: '#11181C', fontWeight: '600' },
  time: { fontSize: 10, color: '#9ca3af' },
  message: { fontSize: 12, color: '#687076', marginBottom: 8, lineHeight: 16 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionText: { fontSize: 11, fontWeight: '500', color: '#22c55e' },
  deleteButton: { marginLeft: 'auto', padding: 4 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  errorText: { fontSize: 14, color: '#ef4444' },
  outbreakContainer: { flex: 1, paddingHorizontal: 0 },
  reportButton: { backgroundColor: '#22c55e', margin: 16, padding: 14, borderRadius: 12, alignItems: 'center' },
  reportButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  aiFab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 100,
  },
});