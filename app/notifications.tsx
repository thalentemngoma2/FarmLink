import { BottomNav } from '@/components/bottom-nav';
import { GlassCard } from '@/components/ui/glass-card';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { Link, useRouter } from 'expo-router';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Keyboard,
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
  Easing,
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

// ---------- Map imports (safe for web) ----------
let MapView: any = null;
let Marker: any = null;
let Callout: any = null;

if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  Callout = Maps.Callout;
}

// ---------- Types ----------
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
  isOutbreak?: boolean;
}

interface OutbreakMarker {
  id: string;
  latitude: number;
  longitude: number;
  disease: string;
  animal: string;
  status: 'pending' | 'verified' | 'resolved';
  reportDate: string;
  evidenceUrls: string[];
  description?: string;
}

// ---------- Constants ----------
const MAX_MEDIA = 5;
const MAX_REPORTS_PER_DAY = 3;
const MIN_DISEASE_LENGTH = 3;
const MIN_DESCRIPTION_LENGTH = 20;

// Sightengine API (from .env)
const SIGHTENGINE_API_USER = process.env.EXPO_PUBLIC_SIGHTENGINE_API_USER;
const SIGHTENGINE_API_SECRET = process.env.EXPO_PUBLIC_SIGHTENGINE_API_SECRET;

const getIconProps = (type: string) => {
  const mapping: { [key: string]: { name: string; color: string } } = {
    reply: { name: 'chatbubble-outline', color: '#3b82f6' },
    like: { name: 'heart-outline', color: '#ec489a' },
    follow: { name: 'person-add-outline', color: '#8b5cf6' },
    achievement: { name: 'trophy-outline', color: '#f59e0b' },
    alert: { name: 'alert-circle-outline', color: '#ef4444' },
    system: { name: 'checkmark-circle-outline', color: '#22c55e' },
    outbreak_alert: { name: 'warning', color: '#ef4444' },
  };
  return mapping[type] || { name: 'notifications-outline', color: '#9ca3af' };
};

// ---------- Helper: AI Content Detection ----------
const checkAIContent = async (text: string): Promise<boolean> => {
  if (!SIGHTENGINE_API_USER || !SIGHTENGINE_API_SECRET) {
    console.warn('Sightengine keys missing – skipping AI detection');
    return false;
  }

  try {
    const response = await fetch('https://api.sightengine.com/1.0/text/check.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        text,
        api_user: SIGHTENGINE_API_USER,
        api_secret: SIGHTENGINE_API_SECRET,
        mode: 'standard',
        categories: 'ai_generated',
      }).toString(),
    });
    const data = await response.json();
    return data?.type?.ai_generated > 0.8;
  } catch (error) {
    console.error('AI content check failed:', error);
    return false;
  }
};

// ---------- Animal list ----------
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

// ---------- Web Map Fallback ----------
function WebMapFallback() {
  return (
    <View style={styles.webMapPlaceholder}>
      <Ionicons name="globe-outline" size={48} color="#9ca3af" />
      <Text style={styles.webMapText}>Map not available on web</Text>
      <Text style={styles.webMapSubText}>Outbreak data is still active</Text>
    </View>
  );
}

// ---------- Pulsing Marker Component ----------
const PulsingMarker = React.memo(({ status }: { status: OutbreakMarker['status'] }) => {
  const pulseAnim = useSharedValue(1);
  useEffect(() => {
    pulseAnim.value = withRepeat(
      withTiming(1.2, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const color =
    status === 'verified' ? '#ef4444' :
    status === 'resolved' ? '#22c55e' :
    '#f97316';

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
    opacity: 0.8,
  }));

  return (
    <View style={styles.markerContainer}>
      <Animated.View style={[styles.markerPulse, { backgroundColor: color }, animatedStyle]} />
      <View style={[styles.markerIcon, { backgroundColor: color }]}>
        <Ionicons name="warning" size={18} color="#fff" />
      </View>
    </View>
  );
});

// ---------- Outbreak Detail Modal ----------
function OutbreakDetailModal({
  marker,
  visible,
  onClose,
}: {
  marker: OutbreakMarker | null;
  visible: boolean;
  onClose: () => void;
}) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  if (!marker) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.detailOverlay}>
          <View style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>{marker.disease}</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.detailRow}>
                <Ionicons name="paw" size={18} color="#6b7280" />
                <Text style={styles.detailLabel}>Animal: {marker.animal}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="flag" size={18} color={
                  marker.status === 'verified' ? '#ef4444' :
                  marker.status === 'resolved' ? '#22c55e' : '#f97316'
                } />
                <Text style={styles.detailLabel}>
                  Status: {marker.status.charAt(0).toUpperCase() + marker.status.slice(1)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="location" size={18} color="#6b7280" />
                <Text style={styles.detailLabel}>
                  Coordinates: {marker.latitude.toFixed(4)}, {marker.longitude.toFixed(4)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="calendar" size={18} color="#6b7280" />
                <Text style={styles.detailLabel}>Reported: {marker.reportDate}</Text>
              </View>
              {marker.description ? (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Description</Text>
                  <Text style={styles.detailText}>{marker.description}</Text>
                </View>
              ) : null}

              {marker.evidenceUrls.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Evidence ({marker.evidenceUrls.length})</Text>
                  <FlatList
                    data={marker.evidenceUrls}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(_, i) => `ev-${i}`}
                    renderItem={({ item, index }) => (
                      <TouchableOpacity onPress={() => setSelectedImageIndex(index)}>
                        <Image
                          source={{ uri: item }}
                          style={styles.evidenceThumb}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    )}
                  />
                </View>
              )}
            </ScrollView>

            {/* Fullscreen image viewer */}
            {selectedImageIndex !== null && (
              <Modal visible transparent>
                <View style={styles.imageViewer}>
                  <TouchableOpacity
                    style={styles.closeViewer}
                    onPress={() => setSelectedImageIndex(null)}
                  >
                    <Ionicons name="close-circle" size={32} color="#fff" />
                  </TouchableOpacity>
                  <Image
                    source={{ uri: marker.evidenceUrls[selectedImageIndex] }}
                    style={styles.fullImage}
                    resizeMode="contain"
                  />
                </View>
              </Modal>
            )}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ---------- Outbreak Report Form ----------
function OutbreakReport({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) {
  const { user } = useAuth();
  const [animalType, setAnimalType] = useState('');
  const [diseaseName, setDiseaseName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [location, setLocationState] = useState<{ lat: number; lon: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState('');
  const [mediaItems, setMediaItems] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [reportCountToday, setReportCountToday] = useState(0);
  const [showAnimalPicker, setShowAnimalPicker] = useState(false);
  const [animalSearch, setAnimalSearch] = useState('');
  const [aiChecking, setAiChecking] = useState(false);

  // Daily report count
  useEffect(() => {
    const checkRateLimit = async () => {
      if (!user) return;
      const today = new Date().toISOString().split('T')[0];
      const { count } = await supabase
        .from('outbreak_reports')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', today)
        .lt('created_at', new Date(new Date(today).getTime() + 86400000).toISOString());
      if (count != null) setReportCountToday(count);
    };
    checkRateLimit();
  }, [user]);

  // Fetch location
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

  useEffect(() => { fetchLocation(); }, [fetchLocation]);

  const filteredAnimals = ANIMAL_TYPES.filter(a =>
    a.toLowerCase().includes(animalSearch.toLowerCase())
  );

  // Media pickers
  const takePhoto = async () => {
    if (mediaItems.length >= MAX_MEDIA) {
      Alert.alert('Limit reached', `Max ${MAX_MEDIA} files allowed.`);
      return;
    }
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera permission required');
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
      Alert.alert('Limit reached');
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
    Alert.alert('Add Evidence', 'Choose method', [
      { text: 'Take Photo', onPress: takePhoto },
      { text: 'Choose from Gallery', onPress: pickFromGallery },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const removeMedia = (index: number) => {
    setMediaItems(prev => prev.filter((_, i) => i !== index));
  };

  // Upload helper
  const uploadEvidence = async (uri: string, type: 'image' | 'video'): Promise<string> => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const fileExt = uri.split('.').pop()?.toLowerCase() || (type === 'image' ? 'jpg' : 'mp4');
    const fileName = `outbreaks/${user?.id}/${Date.now()}_${Math.random().toString(36).substr(2)}.${fileExt}`;
    const { error } = await supabase.storage
      .from('farmlink')
      .upload(fileName, blob, {
        contentType: type === 'image' ? 'image/jpeg' : 'video/mp4',
        cacheControl: '3600',
      });
    if (error) throw new Error(`Upload failed: ${error.message}`);
    const { data } = supabase.storage.from('farmlink').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();
    if (!user) {
      Alert.alert('Authentication required');
      return;
    }
    if (!animalType || diseaseName.trim().length < MIN_DISEASE_LENGTH) {
      Alert.alert('Disease name required', `Minimum ${MIN_DISEASE_LENGTH} characters.`);
      return;
    }
    if (description.trim().length < MIN_DESCRIPTION_LENGTH) {
      Alert.alert('Description required', `Minimum ${MIN_DESCRIPTION_LENGTH} characters.`);
      return;
    }
    if (mediaItems.length === 0) {
      Alert.alert('Evidence required', 'Add at least one photo or video.');
      return;
    }
    if (!location) {
      Alert.alert('Location required', 'Please wait or retry location.');
      return;
    }
    if (reportCountToday >= MAX_REPORTS_PER_DAY) {
      Alert.alert('Daily limit', `Already submitted ${MAX_REPORTS_PER_DAY} reports today.`);
      return;
    }

    // AI content check
    setAiChecking(true);
    try {
      const contentToCheck = `${diseaseName} ${description}`;
      const isAiGenerated = await checkAIContent(contentToCheck);
      if (isAiGenerated) {
        Alert.alert('AI Content Detected', 'AI‑generated outbreak reports are not allowed.');
        return;
      }
    } catch (err) {
      Alert.alert('AI Check Failed', 'Could not verify content authenticity. Proceed with caution.');
    } finally {
      setAiChecking(false);
    }

    // Submit report
    setSubmitting(true);
    try {
      const evidenceUrls: string[] = [];
      for (const asset of mediaItems) {
        const type = asset.type === 'video' ? 'video' : 'image';
        const url = await uploadEvidence(asset.uri, type);
        evidenceUrls.push(url);
      }

      const { error } = await supabase
        .from('outbreak_reports')
        .insert({
          user_id: user.id,
          animal_type: animalType.toLowerCase(),
          disease_name: diseaseName.trim(),
          description: description.trim(),
          location: `${location.lat},${location.lon}`,
          latitude: location.lat,
          longitude: location.lon,
          status: 'pending',
          evidence_urls: evidenceUrls,
          evidence_count: evidenceUrls.length,
        })
        .select('id')
        .single();

      if (error) throw error;

      setReportCountToday(prev => prev + 1);
      onSuccess?.();
      Alert.alert('Report submitted', 'Thank you for helping the community!');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#fff' }}
      contentContainerStyle={reportStyles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={reportStyles.header}>
        <TouchableOpacity onPress={onClose} hitSlop={10}>
          <Ionicons name="close" size={26} color="#111827" />
        </TouchableOpacity>
        <Text style={reportStyles.title}>Report Outbreak</Text>
        <View style={{ width: 26 }} />
      </View>

      <Text style={reportStyles.label}>Animal *</Text>
      <TouchableOpacity style={reportStyles.input} onPress={() => setShowAnimalPicker(true)}>
        <Text style={{ color: animalType ? '#111827' : '#9ca3af' }}>
          {animalType || 'Tap to select animal'}
        </Text>
      </TouchableOpacity>

      <Text style={reportStyles.label}>Disease Name *</Text>
      <TextInput
        style={reportStyles.input}
        placeholder="e.g., Foot and Mouth Disease"
        placeholderTextColor="#9ca3af"
        value={diseaseName}
        onChangeText={setDiseaseName}
        maxLength={80}
      />

      <Text style={reportStyles.label}>Description *</Text>
      <TextInput
        style={[reportStyles.input, reportStyles.textArea]}
        multiline
        textAlignVertical="top"
        placeholder="Describe symptoms, how many animals affected, etc."
        placeholderTextColor="#9ca3af"
        value={description}
        onChangeText={setDescription}
        maxLength={500}
      />

      {/* Evidence */}
      <View style={reportStyles.card}>
        <View style={reportStyles.cardHeader}>
          <Ionicons name="camera-outline" size={20} color="#374151" />
          <Text style={reportStyles.cardTitle}>Evidence *</Text>
        </View>
        <Text style={reportStyles.hint}>Add up to {MAX_MEDIA} photos/videos.</Text>
        <View style={reportStyles.mediaRow}>
          {mediaItems.map((asset, idx) => (
            <View key={idx} style={reportStyles.mediaThumb}>
              <Image source={{ uri: asset.uri }} style={reportStyles.thumbImage} />
              <TouchableOpacity
                style={reportStyles.mediaRemove}
                onPress={() => removeMedia(idx)}
              >
                <Ionicons name="close-circle" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
          {mediaItems.length < MAX_MEDIA && (
            <TouchableOpacity style={reportStyles.addMedia} onPress={showMediaOptions}>
              <Ionicons name="add" size={32} color="#22c55e" />
              <Text style={{ color: '#22c55e', fontSize: 12, marginTop: 4 }}>Add</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Location */}
      <View style={reportStyles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="location-outline" size={24} color="#22c55e" style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            {locationLoading ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#22c55e" />
                <Text style={{ marginLeft: 8, color: '#4b5563' }}>Getting location...</Text>
              </View>
            ) : location ? (
              <View>
                <Text style={{ fontWeight: '600', color: '#111827' }}>📍 Location acquired</Text>
                <Text style={{ fontSize: 12, color: '#6b7280' }}>
                  This will be visible on the outbreak map.
                </Text>
              </View>
            ) : (
              <View>
                <Text style={{ color: '#ef4444', marginBottom: 8 }}>
                  {locationError || 'Location unavailable.'}
                </Text>
                <TouchableOpacity
                  style={reportStyles.retryButton}
                  onPress={fetchLocation}
                >
                  <Ionicons name="refresh" size={16} color="#22c55e" />
                  <Text style={{ color: '#22c55e', fontWeight: '600', marginLeft: 4 }}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Rate limit */}
      <View style={reportStyles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="information-circle-outline" size={20} color="#6b7280" />
          <Text style={{ fontSize: 13, color: '#4b5563', marginLeft: 8, flex: 1 }}>
            {reportCountToday} / {MAX_REPORTS_PER_DAY} reports submitted today.
          </Text>
        </View>
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[
          reportStyles.submitButton,
          Platform.OS === 'web' && reportStyles.submitWebShadow,
          (!animalType || diseaseName.length < MIN_DISEASE_LENGTH || description.length < MIN_DESCRIPTION_LENGTH || mediaItems.length === 0 || !location || submitting || aiChecking) &&
            reportStyles.submitDisabled,
        ]}
        onPress={handleSubmit}
        disabled={!animalType || diseaseName.length < MIN_DISEASE_LENGTH || description.length < MIN_DESCRIPTION_LENGTH || mediaItems.length === 0 || !location || submitting || aiChecking}
      >
        {submitting || aiChecking ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={reportStyles.submitText}>
              {aiChecking ? 'Checking authenticity...' : 'Submitting...'}
            </Text>
          </View>
        ) : (
          <Text style={reportStyles.submitText}>Send Report</Text>
        )}
      </TouchableOpacity>

      {/* Animal Picker Modal */}
      <Modal visible={showAnimalPicker} animationType="slide" transparent>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={reportStyles.pickerHeader}>
            <TouchableOpacity
              onPress={() => {
                setShowAnimalPicker(false);
                setAnimalSearch('');
              }}
            >
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
            <TextInput
              style={reportStyles.pickerSearchInput}
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
                style={reportStyles.animalItem}
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
  content: { padding: 24, flexGrow: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  label: { fontSize: 15, fontWeight: '600', color: '#374151', marginTop: 20, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, padding: 14, fontSize: 15, backgroundColor: '#fff', color: '#111827' },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginTop: 16, borderWidth: 1, borderColor: '#e5e7eb', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  hint: { fontSize: 13, color: '#6b7280', marginBottom: 12 },
  mediaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  mediaThumb: { position: 'relative', width: 80, height: 80, borderRadius: 12, overflow: 'hidden' },
  thumbImage: { width: '100%', height: '100%' },
  mediaRemove: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 11 },
  addMedia: { width: 80, height: 80, borderRadius: 12, borderWidth: 2, borderColor: '#22c55e', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  retryButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#22c55e', marginTop: 8 },
  submitButton: { backgroundColor: '#22c55e', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 30 },
  submitWebShadow: { boxShadow: '0 4px 6px rgba(34,197,94,0.3)' },
  submitDisabled: { backgroundColor: '#9ca3af' },
  submitText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#e5e7eb' },
  pickerSearchInput: { flex: 1, marginLeft: 12, fontSize: 16, color: '#111827' },
  animalItem: { paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderColor: '#f0f0f0' },
});

// ---------- Outbreak Heat Map ----------
function OutbreakHeatMap({ onMarkerPress }: { onMarkerPress: (marker: OutbreakMarker) => void }) {
  const [markers, setMarkers] = useState<OutbreakMarker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarkers();
  }, []);

  const fetchMarkers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('outbreak_reports')
        .select('id, location, disease_name, animal_type, status, created_at, evidence_urls, description')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map((item: any) => {
        const [lat, lon] = item.location ? item.location.split(',').map(Number) : [0, 0];
        return {
          id: item.id,
          latitude: lat,
          longitude: lon,
          disease: item.disease_name || 'Unknown',
          animal: item.animal_type,
          status: item.status,
          reportDate: new Date(item.created_at).toLocaleDateString(),
          evidenceUrls: item.evidence_urls || [],
          description: item.description,
        };
      });
      setMarkers(mapped);
    } catch (err) {
      console.error('Failed to load outbreak markers:', err);
    } finally {
      setLoading(false);
    }
  };

  const memoMarkers = useMemo(() => markers, [markers]);

  if (loading) {
    return (
      <View style={styles.mapLoading}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  if (!MapView) {
    return <WebMapFallback />;
  }

  return (
    <MapView
      style={styles.map}
      initialRegion={{
        latitude: -29.0,
        longitude: 24.0,
        latitudeDelta: 10,
        longitudeDelta: 10,
      }}
    >
      {memoMarkers.map((marker) => (
        <Marker
          key={marker.id}
          coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
          onPress={() => onMarkerPress(marker)}
        >
          <PulsingMarker status={marker.status} />
          <Callout tooltip onPress={() => onMarkerPress(marker)}>
            <View style={styles.callout}>
              <Text style={styles.calloutTitle}>{marker.disease}</Text>
              <Text style={styles.calloutText}>{marker.animal} – {marker.status}</Text>
              <Text style={styles.calloutText}>📅 {marker.reportDate}</Text>
              <Text style={styles.calloutMore}>Tap for details →</Text>
            </View>
          </Callout>
        </Marker>
      ))}
    </MapView>
  );
}

// ---------- Main Notifications Page ----------
export default function NotificationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'alerts' | 'outbreaks'>('alerts');
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<OutbreakMarker | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const hasFetchedRef = useRef(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setError('');
      return;
    }

    setLoading(true);
    setError('');
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
          iconName: n.type === 'outbreak_alert' ? 'warning' : iconName,
          iconColor: n.type === 'outbreak_alert' ? '#ef4444' : iconColor,
          isOutbreak: n.type === 'outbreak_alert',
        };
      });

      const sorted = formatted.sort((a, b) => {
        if (a.isOutbreak && !b.isOutbreak) return -1;
        if (!a.isOutbreak && b.isOutbreak) return 1;
        return 0;
      });

      setNotifications(sorted);
    } catch (err) {
      console.error('Failed to load notifications', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchNotifications();
    }
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    if (!user) return;
    try {
      await supabase.from('notifications').update({ read: true }).eq('id', id).eq('user_id', user.id);
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const deleteNotification = async (id: string) => {
    if (!user) return;
    try {
      await supabase.from('notifications').delete().eq('id', id).eq('user_id', user.id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const filteredNotifications = filter === 'all' ? notifications : notifications.filter(n => !n.read);

  // Background animation
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

  const onReportSubmitted = useCallback(() => {
    setShowReportModal(false);
    fetchNotifications();
  }, [fetchNotifications]);

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

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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

            {loading ? (
              <ActivityIndicator size="large" color="#22c55e" style={{ marginTop: 50 }} />
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : filteredNotifications.length === 0 ? (
              <Animated.View entering={FadeIn} style={styles.emptyContainer}>
                <GlassCard style={styles.emptyCard}>
                  <View style={styles.emptyIcon}>
                    <Ionicons name="notifications-outline" size={32} color="#22c55e" />
                  </View>
                  <Text style={styles.emptyText}>
                    {user ? 'No notifications yet' : 'Log in to see your alerts'}
                  </Text>
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
                          <Ionicons
                            name={notification.iconName as any}
                            size={20}
                            color={notification.iconColor}
                          />
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
                                <TouchableOpacity>
                                  <Text style={styles.actionText}>View</Text>
                                </TouchableOpacity>
                              </Link>
                            )}
                            <TouchableOpacity
                              onPress={() => deleteNotification(notification.id)}
                              style={styles.deleteButton}
                            >
                              <Ionicons name="trash-outline" size={16} color="#9ca3af" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                      {notification.isOutbreak && (
                        <View style={styles.outbreakBadge}>
                          <Ionicons name="warning" size={12} color="#fff" />
                          <Text style={styles.outbreakBadgeText}>OUTBREAK</Text>
                        </View>
                      )}
                    </GlassCard>
                  </Animated.View>
                ))}
              </View>
            )}
          </>
        ) : (
          <View style={styles.outbreakContainer}>
            <OutbreakHeatMap
              onMarkerPress={(marker) => {
                setSelectedMarker(marker);
                setShowDetailModal(true);
              }}
            />
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

      <OutbreakDetailModal
        marker={selectedMarker}
        visible={showDetailModal}
        onClose={() => setShowDetailModal(false)}
      />

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

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  blob: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(34,197,94,0.2)' },
  blob1: { width: 200, height: 200, top: -50, left: -50 },
  blob2: { width: 250, height: 250, bottom: -50, right: -50 },
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
  unreadCard: { borderWidth: 1, borderColor: '#22c55e', shadowColor: '#22c55e', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.2, shadowRadius: 4 },
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
  map: { width: '100%', height: 350 },
  mapLoading: { height: 350, justifyContent: 'center', alignItems: 'center' },
  webMapPlaceholder: { height: 350, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 12, marginHorizontal: 16 },
  webMapText: { marginTop: 8, color: '#6b7280', fontSize: 14 },
  webMapSubText: { color: '#9ca3af', fontSize: 12, marginTop: 4 },
  markerContainer: { alignItems: 'center', justifyContent: 'center' },
  markerPulse: { position: 'absolute', width: 30, height: 30, borderRadius: 15, opacity: 0.5 },
  markerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  callout: { width: 180, backgroundColor: 'white', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  calloutTitle: { fontWeight: '700', fontSize: 14, marginBottom: 2 },
  calloutText: { fontSize: 12, color: '#374151' },
  calloutMore: { fontSize: 11, color: '#22c55e', marginTop: 4 },
  detailOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  detailCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, width: '100%', maxWidth: 400, maxHeight: '80%' },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  detailTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  detailLabel: { fontSize: 15, color: '#374151', flex: 1 },
  detailSection: { marginTop: 16 },
  detailSectionTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 8 },
  detailText: { fontSize: 14, color: '#4b5563', lineHeight: 20 },
  evidenceThumb: { width: 80, height: 80, borderRadius: 8, marginRight: 8 },
  imageViewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  closeViewer: { position: 'absolute', top: 40, right: 20, zIndex: 1 },
  fullImage: { width: Dimensions.get('window').width, height: '80%' },
  outbreakBadge: { position: 'absolute', top: 0, right: 0, flexDirection: 'row', alignItems: 'center', backgroundColor: '#ef4444', paddingHorizontal: 8, paddingVertical: 2, borderBottomLeftRadius: 8 },
  outbreakBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700', marginLeft: 4 },
});