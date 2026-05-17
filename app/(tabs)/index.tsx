import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
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
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Easing,
  Extrapolate,
  FadeIn,
  interpolate,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNav } from '@/components/bottom-nav';
import { MobileHeader } from '@/components/mobile-header';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

// -------------------- Types --------------------
type PlantState = 'undergrowth' | 'overgrowth' | 'disease' | 'healthy';

interface PlantAnalysis {
  state: PlantState;
  cause: string;              // now a detailed explanation
  solution: string;
  preventiveTips: string;     // now a detailed list
  plantName?: string;
}

interface UserScan {
  id: string;
  plantName: string;
  imageUri: string;
  analysis: PlantAnalysis;
  timestamp: string;
  synced: boolean;
}

interface CommunityScan {
  id: string;
  farmerName: string;
  location: string;
  imageUri: string;
  plantName: string;
  analysisState: string;
  timestamp: string;
}

// -------------------- Configuration --------------------
const KINDWISE_API_KEY = process.env.EXPO_PUBLIC_KINDWISE_API_KEY!;
if (!KINDWISE_API_KEY) {
  throw new Error('Missing EXPO_PUBLIC_KINDWISE_API_KEY environment variable');
}

const BASE_URL = process.env.EXPO_PUBLIC_KINDWISE_API_URL || 'https://crop.kindwise.com/api/v1/identification';
const KINDWISE_API_URL = (() => {
  try {
    const url = new URL(BASE_URL);
    url.searchParams.set('details', 'health_assessment');
    return url.toString();
  } catch {
    const separator = BASE_URL.includes('?') ? '&' : '?';
    return `${BASE_URL}${separator}details=health_assessment`;
  }
})();

// -------------------- Helper: convert image URI to base64 (cross‑platform) --------------------
async function imageUriToBase64(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    }).then((dataUrl: string) => {
      const base64Index = dataUrl.indexOf(';base64,');
      if (base64Index !== -1) return dataUrl.substring(base64Index + 8);
      return dataUrl;
    });
  } else {
    return await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }
}

// -------------------- Pure utility functions (outside component) --------------------
const formatRelativeTime = (isoString?: string) => {
  if (!isoString) return 'Just now';
  const date = new Date(isoString);
  if (isNaN(date.getTime()) || date.getFullYear() <= 1970) return 'Just now';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
};

const getStatusColor = (state: PlantState) => {
  switch (state) {
    case 'healthy': return '#22c55e';
    case 'disease': return '#ef4444';
    case 'undergrowth': return '#f97316';
    case 'overgrowth': return '#a855f7';
    default: return '#6b7280';
  }
};

const getStatusEmoji = (state: PlantState) => {
  switch (state) {
    case 'healthy': return '✅';
    case 'disease': return '⚠️';
    case 'undergrowth': return '📉';
    case 'overgrowth': return '📈';
    default: return '🌿';
  }
};

const getCommunityStatusColor = (status: string) => {
  if (status === 'Healthy') return '#22c55e';
  if (status === 'Disease detected') return '#ef4444';
  if (status === 'Undergrowth') return '#f97316';
  if (status === 'Overgrowth') return '#a855f7';
  return '#6b7280';
};

// -------------------- Glassmorphism Card Component --------------------
const GlassCard: React.FC<{
  children: React.ReactNode;
  style?: object;
  intensity?: number;
}> = ({ children, style, intensity = 20 }) => (
  <BlurView intensity={intensity} tint="light" style={[styles.glassCard, style]}>
    {children}
  </BlurView>
);

export default function FarmLinkPage() {
  const { user } = useAuth();
  const [isPlantModalVisible, setIsPlantModalVisible] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [modalStep, setModalStep] = useState<'initial' | 'analyzing' | 'result' | 'error'>('initial');
  const [analysisResult, setAnalysisResult] = useState<PlantAnalysis | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [scanHistory, setScanHistory] = useState<UserScan[]>([]);
  const [communityScans, setCommunityScans] = useState<CommunityScan[]>([]);
  const [loadingCommunity, setLoadingCommunity] = useState(false);
  const [loadingScans, setLoadingScans] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const scanningPulse = useSharedValue(1);
  const hasAutoOpened = useRef(false);
  const isMountedRef = useRef(true);

  const analysisResultRef = useRef<PlantAnalysis | null>(null);
  useEffect(() => {
    analysisResultRef.current = analysisResult;
  }, [analysisResult]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Auto‑open camera on native only
  useEffect(() => {
    if (isPlantModalVisible && modalStep === 'initial' && Platform.OS !== 'web' && !hasAutoOpened.current) {
      hasAutoOpened.current = true;
      const timer = setTimeout(() => {
        openImagePicker(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isPlantModalVisible, modalStep]);

  // Fetch scans
  useEffect(() => {
    const abortController = new AbortController();
    const { signal } = abortController;

    const load = async () => {
      try {
        setLoadingScans(true);
        if (user) {
          await fetchUserScans(user.id, signal);
        }
        await fetchCommunityScans(signal);
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error(error);
        }
      } finally {
        if (isMountedRef.current) {
          setLoadingScans(false);
        }
      }
    };

    load();

    return () => {
      abortController.abort();
    };
  }, [user]);

  const fetchUserScans = async (userId: string, signal?: AbortSignal) => {
    try {
      const { data, error } = await supabase
        .from('plant_scans')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .abortSignal(signal);

      if (error) throw error;
      if (!isMountedRef.current) return;

      setScanHistory(
        (data || []).map((scan: any) => ({
          id: String(scan.id),
          plantName: String(scan.plant_name || ''),
          imageUri: String(scan.image_url || ''),
          analysis: {
            state: scan.analysis_state as PlantState,
            cause: String(scan.analysis_cause || ''),
            solution: String(scan.analysis_solution || ''),
            preventiveTips: String(scan.analysis_preventive || ''),
            plantName: String(scan.plant_name || ''),
          },
          timestamp: String(scan.created_at || ''),
          synced: true,
        }))
      );
    } catch (error: any) {
      if (error.name === 'AbortError' && signal?.aborted) return;
      throw error;
    }
  };

  const fetchCommunityScans = async (signal?: AbortSignal) => {
    setLoadingCommunity(true);
    try {
      const { data: scans, error: scansError } = await supabase
        .from('plant_scans')
        .select('id, user_id, plant_name, image_url, analysis_state, created_at')
        .order('created_at', { ascending: false })
        .limit(10)
        .abortSignal(signal);

      if (scansError) throw scansError;
      if (!isMountedRef.current) return;

      if (!scans || scans.length === 0) {
        setCommunityScans([]);
        return;
      }

      const userIds = [...new Set(scans.map((s) => s.user_id).filter((id): id is string => Boolean(id)))];
      let userMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('user_id, username')
          .in('user_id', userIds)
          .abortSignal(signal);

        if (!usersError && users) {
          users.forEach((u: any) => {
            userMap[String(u.user_id)] = String(u.username || 'Anonymous Farmer');
          });
        }

        userIds.forEach((id) => {
          if (!userMap[id]) userMap[id] = `Farmer_${id.slice(-4)}`;
        });
      }

      setCommunityScans(
        scans.map((scan: any) => ({
          id: String(scan.id),
          farmerName: userMap[scan.user_id] || 'Anonymous Farmer',
          location: 'Unknown Region',
          imageUri: String(scan.image_url || ''),
          plantName: String(scan.plant_name || ''),
          analysisState:
            scan.analysis_state === 'healthy'
              ? 'Healthy'
              : scan.analysis_state === 'disease'
              ? 'Disease detected'
              : scan.analysis_state === 'undergrowth'
              ? 'Undergrowth'
              : scan.analysis_state === 'overgrowth'
              ? 'Overgrowth'
              : 'Unknown',
          timestamp: formatRelativeTime(scan.created_at),
        }))
      );
    } catch (error: any) {
      if (error.name === 'AbortError' && signal?.aborted) return;
      console.error('Failed to load community scans', error);
    } finally {
      if (isMountedRef.current) {
        setLoadingCommunity(false);
      }
    }
  };

  // ---------- Kindwise AI – identification + health ----------
  const analyzeWithKindwise = async (imageUri: string): Promise<PlantAnalysis> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const base64 = await imageUriToBase64(imageUri);

      const response = await fetch(KINDWISE_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Api-Key': KINDWISE_API_KEY },
        body: JSON.stringify({ images: [base64] }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Kindwise API error ${response.status}: ${errText}`);
      }

      const data = await response.json();
      const result = data?.result;

      // Plant detection
      const isPlant = result?.is_plant?.binary ?? true;
      if (!isPlant) {
        throw new Error('No plant detected. Please take a clear photo of a plant leaf.');
      }

      // Crop name
      const cropSuggestions = result?.crop?.suggestions;
      const bestCrop = Array.isArray(cropSuggestions) && cropSuggestions.length > 0
        ? cropSuggestions[0]
        : null;
      const plantName = bestCrop?.name ?? bestCrop?.scientific_name ?? 'Unknown crop';

      // Disease assessment
      const diseaseSuggestions: any[] = result?.disease?.suggestions ?? [];
      const actualDiseases = diseaseSuggestions.filter(
        (s) => s.name?.toLowerCase() !== 'healthy'
      );

      const topDisease = actualDiseases.length > 0 ? actualDiseases[0] : null;
      const isDiseased = topDisease && topDisease.probability > 0.3;

      let state: PlantState = 'healthy';
      let cause = 'No diseases detected.';
      let solution = 'Continue your regular watering and feeding schedule.';
      let preventiveTips = 'Keep an eye on plant health and practice crop rotation.';

      if (isDiseased) {
        state = 'disease';

        // Build a detailed cause using available description fields
        const diseaseName = topDisease.name || 'Unknown disease';
        const scientificName = topDisease.scientific_name && topDisease.scientific_name !== diseaseName
          ? ` (*${topDisease.scientific_name}*)`
          : '';

        let detailedCause = `**${diseaseName}**${scientificName}\n\n`;

        if (topDisease.description) {
          detailedCause += topDisease.description + '\n\n';
        } else {
          detailedCause += 'This disease affects the plant’s health and can reduce crop yield if left untreated.\n\n';
        }

        if (topDisease.treatment) {
          if (topDisease.treatment.chemical && topDisease.treatment.chemical.length > 0) {
            detailedCause += `💊 **Chemical treatment:** ${topDisease.treatment.chemical.join(', ')}\n`;
          }
          if (topDisease.treatment.biological && topDisease.treatment.biological.length > 0) {
            detailedCause += `🧬 **Biological treatment:** ${topDisease.treatment.biological.join(', ')}\n`;
          }
          if (topDisease.treatment.mechanical && topDisease.treatment.mechanical.length > 0) {
            detailedCause += `🔧 **Mechanical treatment:** ${topDisease.treatment.mechanical.join(', ')}\n`;
          }
          if (topDisease.treatment.cultural && topDisease.treatment.cultural.length > 0) {
            detailedCause += `🌾 **Cultural practices:** ${topDisease.treatment.cultural.join(', ')}\n`;
          }
          detailedCause += '\n';
        }

        // Use treatment info as the immediate action
        solution = 'Take the following steps to manage this disease:';
        if (topDisease.treatment?.chemical?.length) {
          solution += `\n- Apply chemical treatments like ${topDisease.treatment.chemical[0]}.`;
        } else if (topDisease.treatment?.biological?.length) {
          solution += `\n- Use biological control: ${topDisease.treatment.biological[0]}.`;
        } else {
          solution += '\n- Consult an agronomist for specific chemical or biological treatment options.';
        }

        // Preventive tips now come directly from the API
        if (topDisease.prevention && topDisease.prevention.length > 0) {
          preventiveTips = topDisease.prevention.map((tip: string) => `• ${tip}`).join('\n');
        } else {
          preventiveTips = '• Use resistant varieties\n• Ensure proper plant spacing\n• Monitor regularly and remove infected plants';
        }

        cause = detailedCause.trim();
      }

      return { state, cause, solution, preventiveTips, plantName };
    } catch (error: any) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        throw new Error('The request timed out. Please check your connection and try again.');
      }
      throw error;
    }
  };

  const uploadAndSaveScan = async (imageUri: string, plant: string, analysis: PlantAnalysis) => {
    if (!user) throw new Error('Not authenticated');

    const response = await fetch(imageUri);
    const blob = await response.blob();

    const extCandidate = imageUri.split('.').pop();
    const ext = (extCandidate && extCandidate.length <= 4 && !extCandidate.includes('/'))
      ? extCandidate
      : 'jpg';
    const path = `scans/${user.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('farmlink')
      .upload(path, blob, { contentType: 'image/jpeg' });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from('farmlink').getPublicUrl(path);
    const imageUrl = urlData.publicUrl;

    const { error: insertError } = await supabase.from('plant_scans').insert({
      user_id: user.id,
      plant_name: plant,
      image_url: imageUrl,
      analysis_state: analysis.state,
      analysis_cause: analysis.cause,
      analysis_solution: analysis.solution,
      analysis_preventive: analysis.preventiveTips,
      created_at: new Date(),
    });

    if (insertError) throw insertError;
  };

  const openImagePicker = async (useCamera: boolean) => {
    if (!user) {
      setErrorMessage('Please log in to scan plants');
      setModalStep('error');
      return;
    }

    let result;
    try {
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          setErrorMessage('Camera access was denied.');
          setModalStep('error');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          quality: 0.8,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          setErrorMessage('Gallery access was denied.');
          setModalStep('error');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          quality: 0.8,
        });
      }
    } catch (e) {
      console.warn('Image picker error:', e);
      setErrorMessage('Something went wrong while opening the camera.');
      setModalStep('error');
      return;
    }

    if (result.canceled || !result.assets?.length) {
      setModalStep('initial');
      return;
    }

    const uri = result.assets[0].uri;
    setSelectedImage(uri);
    setAnalysisResult(null);
    setFeedbackGiven(false);
    startAnalysis(uri);
  };

  const startAnalysis = async (imageUri: string) => {
    setModalStep('analyzing');
    scanningPulse.value = withRepeat(
      withTiming(1.2, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    try {
      const analysis = await analyzeWithKindwise(imageUri);
      if (!isMountedRef.current) return;

      const plantName = analysis.plantName || 'Unknown plant';
      await uploadAndSaveScan(imageUri, plantName, analysis);

      if (!isMountedRef.current) return;
      setAnalysisResult(analysis);

      if (user) {
        await fetchUserScans(user.id);
        await fetchCommunityScans();
      }
      if (!isMountedRef.current) return;
      setModalStep('result');
    } catch (error: any) {
      if (!isMountedRef.current) return;
      console.error('Scan failed', error);
      setErrorMessage(error.message || 'Failed to analyze the plant.');
      setModalStep('error');
    } finally {
      if (isMountedRef.current) {
        scanningPulse.value = 1;
      }
    }
  };

  const handleRateFeedback = async (helpful: boolean) => {
    if (feedbackGiven || !analysisResult) return;
    setFeedbackGiven(true);
    Alert.alert('Thank you', helpful ? "Glad we could help!" : "We'll use your feedback to improve.");
  };

  const resetPlantModal = () => {
    setIsPlantModalVisible(false);
    setSelectedImage(null);
    setAnalysisResult(null);
    setFeedbackGiven(false);
    setModalStep('initial');
    setErrorMessage('');
    hasAutoOpened.current = false;
  };

  const handleTakeAction = () => {
    const result = analysisResultRef.current;
    if (!result) return;
    Alert.alert(
      'Take Action',
      `${result.solution}\n\nFor more detailed guidance, check the Agri‑Advisor in the community section.`
    );
  };

  // Background animations
  const bgScale = useSharedValue(1);
  const bgOpacity = useSharedValue(0.3);
  useEffect(() => {
    bgScale.value = withRepeat(withTiming(1.2, { duration: 8000 }), -1, true);
    bgOpacity.value = withRepeat(withTiming(0.5, { duration: 10000 }), -1, true);
  }, []);
  const bg1Animated = useAnimatedStyle(() => ({
    transform: [{ scale: bgScale.value }],
    opacity: interpolate(bgOpacity.value, [0.3, 0.5], [0.3, 0.5], Extrapolate.CLAMP),
  }));
  const bg2Animated = useAnimatedStyle(() => ({
    transform: [{ scale: bgScale.value }],
    opacity: interpolate(bgOpacity.value, [0.2, 0.4], [0.2, 0.4], Extrapolate.CLAMP),
  }));
  const { width, height } = Dimensions.get('window');

  const scanningRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scanningPulse.value }],
    opacity: interpolate(scanningPulse.value, [1, 1.2], [0.8, 0]),
  }));

  // -------------------- Render --------------------
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <LinearGradient colors={['#f0fdf4', '#ffffff', '#ecfdf5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <Animated.View style={[styles.bgBlob1, { left: -width * 0.2, top: -height * 0.2, width: width * 0.6, height: width * 0.6 }, bg1Animated]}>
          <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} />
        </Animated.View>
        <Animated.View style={[styles.bgBlob2, { right: -width * 0.2, bottom: -height * 0.2, width: width * 0.7, height: width * 0.7 }, bg2Animated]}>
          <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} />
        </Animated.View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <MobileHeader />
          <Animated.View entering={SlideInDown.duration(600)} style={styles.hero}>
            <Animated.View entering={ZoomIn.springify().delay(200)} style={styles.heroIcon}>
              <LinearGradient colors={['#22c55e', '#16a34a']} style={styles.heroIconGradient}>
                <Ionicons name="leaf" size={32} color="white" />
              </LinearGradient>
            </Animated.View>
            <Text style={styles.heroTitle}>AI Plant Monitor</Text>
            <Text style={styles.heroSubtitle}>Identify diseases instantly – no typing needed</Text>
          </Animated.View>

          <Animated.View entering={FadeIn.delay(300)} style={styles.plantMonitorCard}>
            <LinearGradient colors={['rgba(34,197,94,0.12)', 'rgba(34,197,94,0.05)']} style={styles.plantMonitorGradient}>
              <View style={styles.plantMonitorContent}>
                <View style={styles.plantMonitorText}>
                  <Text style={styles.plantMonitorTitle}>🌿 One‑Tap Scanner</Text>
                  <Text style={styles.plantMonitorDesc}>Snap a photo, get diagnosis + plant name instantly</Text>
                </View>
                <TouchableOpacity style={styles.plantMonitorButton} onPress={() => setIsPlantModalVisible(true)} activeOpacity={0.8}>
                  <Ionicons name="camera-outline" size={24} color="white" />
                  <Text style={styles.plantMonitorButtonText}>Scan Now</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </Animated.View>

          <Animated.View entering={FadeIn.delay(400)} style={styles.historySection}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>🌿 Plant Scan History</Text>
              <Text style={styles.historySubtitle}>Your recent scans and community activity</Text>
            </View>

            {loadingScans ? (
              <ActivityIndicator size="large" color="#22c55e" style={{ marginVertical: 24 }} />
            ) : scanHistory.length > 0 ? (
              <View style={styles.historyList}>
                {scanHistory.map((scan, idx) => (
                  <Animated.View key={scan.id} entering={FadeIn.delay(idx * 50)} style={styles.historyCard}>
                    <View style={styles.cardImageContainer}>
                      <Image source={{ uri: scan.imageUri }} style={styles.cardImage} />
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(scan.analysis.state) }]}>
                        <Text style={styles.statusBadgeText}>{getStatusEmoji(scan.analysis.state)} {scan.analysis.state.toUpperCase()}</Text>
                      </View>
                    </View>
                    <View style={styles.cardContent}>
                      <Text style={styles.cardPlantName}>🌱 {scan.plantName}</Text>
                      <Text style={styles.cardTimestamp}>{formatRelativeTime(scan.timestamp)}</Text>
                      <Text style={styles.cardCause} numberOfLines={2}>{scan.analysis.cause}</Text>
                    </View>
                  </Animated.View>
                ))}
              </View>
            ) : (
              <>
                <View style={styles.emptyStateContainer}>
                  <Ionicons name="leaf-outline" size={48} color="#22c55e" />
                  <Text style={styles.emptyStateTitle}>No scans yet – be the first on your farm 🌱</Text>
                </View>
                <View style={styles.communityHeader}>
                  <Text style={styles.communityTitle}>Recent community scans</Text>
                </View>
                {loadingCommunity ? (
                  <ActivityIndicator size="large" color="#22c55e" style={{ marginVertical: 24 }} />
                ) : (
                  <View style={styles.historyList}>
                    {communityScans.map((scan, idx) => (
                      <Animated.View key={scan.id} entering={FadeIn.delay(idx * 50)} style={styles.communityCard}>
                        <View style={styles.communityCardLeft}>
                          <View style={styles.communityAvatar}>
                            <Text style={styles.communityAvatarText}>{scan.farmerName.charAt(0)}</Text>
                          </View>
                          <View style={styles.communityInfo}>
                            <Text style={styles.communityName}>{scan.farmerName} • {scan.location}</Text>
                            <Text style={styles.communityPlant}>🌱 {scan.plantName}</Text>
                            <View style={styles.communityStatusRow}>
                              <View style={[styles.communityStatusDot, { backgroundColor: getCommunityStatusColor(scan.analysisState) }]} />
                              <Text style={styles.communityStatus}>{scan.analysisState}</Text>
                              <Text style={styles.communityTime}>• {scan.timestamp}</Text>
                            </View>
                          </View>
                        </View>
                        <Image source={{ uri: scan.imageUri }} style={styles.communityImage} />
                      </Animated.View>
                    ))}
                  </View>
                )}
              </>
            )}
          </Animated.View>
        </ScrollView>

        <BottomNav />

        <Modal visible={isPlantModalVisible} animationType="slide" transparent={true} onRequestClose={resetPlantModal}>
          <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill}>
            <View style={styles.modalContainer}>
              <Animated.View entering={SlideInDown.springify()} style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>🌿 AI Plant Scanner</Text>
                  <TouchableOpacity onPress={resetPlantModal} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color="#11181C" />
                  </TouchableOpacity>
                </View>

                {modalStep === 'initial' && (
                  <GlassCard style={styles.stepCard}>
                    <View style={styles.cameraPrompt}>
                      <Ionicons name="camera" size={64} color="#22c55e" />
                      {Platform.OS === 'web' ? (
                        <>
                          <Text style={styles.cameraPromptTitle}>Ready to scan</Text>
                          <Text style={styles.cameraPromptSub}>Tap the button below to open your camera.</Text>
                          <TouchableOpacity style={styles.manualRetryButton} onPress={() => openImagePicker(true)}>
                            <Text style={styles.manualRetryText}>Open Camera</Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <>
                          <Text style={styles.cameraPromptTitle}>Opening camera…</Text>
                          <Text style={styles.cameraPromptSub}>Point your device at the plant leaf.{'\n'}The camera will open automatically.</Text>
                          <ActivityIndicator size="small" color="#22c55e" style={{ marginTop: 16 }} />
                          <TouchableOpacity style={styles.manualRetryButton} onPress={() => openImagePicker(true)}>
                            <Text style={styles.manualRetryText}>Open Camera Manually</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </GlassCard>
                )}

                {modalStep === 'analyzing' && (
                  <GlassCard style={styles.stepCard}>
                    <View style={styles.analyzingContainer}>
                      <Animated.View style={[styles.scanningRing, scanningRingStyle]} />
                      <ActivityIndicator size="large" color="#22c55e" style={{ marginBottom: 20 }} />
                      <Text style={styles.analyzingText}>Kindwise AI is identifying & diagnosing…</Text>
                      <Text style={styles.analyzingSubtext}>This takes a few seconds</Text>
                    </View>
                  </GlassCard>
                )}

                {modalStep === 'result' && analysisResult && (
                  <ScrollView style={styles.resultScroll} showsVerticalScrollIndicator={false}>
                    <Image source={{ uri: selectedImage! }} style={styles.resultImage} />
                    <GlassCard style={styles.resultCard}>
                      <Text style={styles.detectedPlantLabel}>🌿 {analysisResult.plantName || 'Plant'}</Text>
                      <View style={[styles.resultBadge, { backgroundColor: getStatusColor(analysisResult.state) + '20' }]}>
                        <Text style={[styles.resultBadgeText, { color: getStatusColor(analysisResult.state) }]}>
                          {getStatusEmoji(analysisResult.state)} {analysisResult.state.toUpperCase()}
                        </Text>
                      </View>

                      <View style={styles.recommendationCard}>
                        <View style={styles.recommendationHeader}>
                          <Ionicons name="bulb-outline" size={22} color="#16a34a" />
                          <Text style={styles.recommendationTitle}>🩺 Recommended Action</Text>
                        </View>
                        <Text style={styles.recommendationText}>
                          {analysisResult.state === 'healthy'
                            ? 'Your plant looks healthy! No action needed.'
                            : analysisResult.solution}
                        </Text>
                        {analysisResult.state !== 'healthy' && (
                          <TouchableOpacity style={styles.takeActionButton} onPress={handleTakeAction}>
                            <Text style={styles.takeActionButtonText}>Take Action</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      <View style={styles.resultSection}>
                        <Text style={styles.resultSectionTitle}>🔍 What’s happening</Text>
                        <Text style={styles.resultText}>{analysisResult.cause}</Text>
                      </View>
                      <View style={styles.resultSection}>
                        <Text style={styles.resultSectionTitle}>🌾 How to prevent this</Text>
                        <Text style={styles.resultText}>{analysisResult.preventiveTips}</Text>
                      </View>

                      <View style={styles.feedbackContainer}>
                        <Text style={styles.feedbackTitle}>Was this helpful?</Text>
                        <View style={styles.feedbackButtons}>
                          <TouchableOpacity style={[styles.feedbackButton, feedbackGiven && styles.feedbackDisabled]} onPress={() => handleRateFeedback(true)} disabled={feedbackGiven}>
                            <Ionicons name="thumbs-up" size={20} color="#16a34a" />
                            <Text style={styles.feedbackButtonText}>Yes</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.feedbackButton, feedbackGiven && styles.feedbackDisabled]} onPress={() => handleRateFeedback(false)} disabled={feedbackGiven}>
                            <Ionicons name="thumbs-down" size={20} color="#dc2626" />
                            <Text style={styles.feedbackButtonText}>No</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                      <TouchableOpacity style={styles.newScanButton} onPress={resetPlantModal}>
                        <Text style={styles.newScanButtonText}>Scan Another Plant</Text>
                      </TouchableOpacity>
                    </GlassCard>
                  </ScrollView>
                )}

                {modalStep === 'error' && (
                  <GlassCard style={styles.stepCard}>
                    <View style={styles.errorContainer}>
                      <Ionicons name="alert-circle" size={48} color="#ef4444" />
                      <Text style={styles.errorTitle}>Oops!</Text>
                      <Text style={styles.errorMessage}>{errorMessage}</Text>
                      <TouchableOpacity
                        style={styles.errorRetryButton}
                        onPress={() => {
                          setErrorMessage('');
                          setModalStep('initial');
                          setTimeout(() => openImagePicker(true), 0);
                        }}
                      >
                        <Text style={styles.errorRetryText}>Try Again</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.errorCloseButton} onPress={resetPlantModal}>
                        <Text style={styles.errorCloseText}>Close</Text>
                      </TouchableOpacity>
                    </View>
                  </GlassCard>
                )}
              </Animated.View>
            </View>
          </BlurView>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

// -------------------- Styles --------------------
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, position: 'relative' },
  scrollContent: { flexGrow: 1, paddingBottom: 80, paddingTop: 90 },
  bgBlob1: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(34,197,94,0.2)', overflow: 'hidden' },
  bgBlob2: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(168,85,247,0.2)', overflow: 'hidden' },
  hero: { alignItems: 'center', marginVertical: 24, paddingHorizontal: 16 },
  heroIcon: { width: 64, height: 64, borderRadius: 32, marginBottom: 16, overflow: 'hidden' },
  heroIconGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 28, fontWeight: 'bold', color: '#11181C', textAlign: 'center', marginBottom: 8 },
  heroSubtitle: { fontSize: 14, color: '#687076', textAlign: 'center', paddingHorizontal: 32, lineHeight: 20 },
  plantMonitorCard: { marginHorizontal: 16, marginTop: 8, marginBottom: 24, borderRadius: 24, overflow: 'hidden', shadowColor: '#22c55e', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
  plantMonitorGradient: { borderRadius: 24, borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)' },
  plantMonitorContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  plantMonitorText: { flex: 1, marginRight: 12 },
  plantMonitorTitle: { fontSize: 18, fontWeight: '700', color: '#166534', marginBottom: 4 },
  plantMonitorDesc: { fontSize: 13, color: '#4b5563' },
  plantMonitorButton: { backgroundColor: '#22c55e', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 40, shadowColor: '#22c55e', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
  plantMonitorButtonText: { color: 'white', fontWeight: '600', fontSize: 14 },
  historySection: { marginHorizontal: 16, marginTop: 8, marginBottom: 24 },
  historyHeader: { marginBottom: 20 },
  historyTitle: { fontSize: 22, fontWeight: '700', color: '#11181C', marginBottom: 6 },
  historySubtitle: { fontSize: 14, color: '#687076' },
  historyList: { gap: 16 },
  historyCard: { backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardImageContainer: { position: 'relative', height: 180 },
  cardImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  statusBadge: { position: 'absolute', top: 12, left: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  cardContent: { padding: 12 },
  cardPlantName: { fontSize: 16, fontWeight: '700', color: '#11181C', marginBottom: 4 },
  cardTimestamp: { fontSize: 12, color: '#6b7280', marginBottom: 6 },
  cardCause: { fontSize: 13, color: '#4b5563' },
  emptyStateContainer: { alignItems: 'center', backgroundColor: 'rgba(34,197,94,0.05)', borderRadius: 24, padding: 24, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' },
  emptyStateTitle: { fontSize: 16, fontWeight: '600', color: '#166534', textAlign: 'center', marginVertical: 12 },
  communityHeader: { marginBottom: 12 },
  communityTitle: { fontSize: 18, fontWeight: '600', color: '#11181C' },
  communityCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)', padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  communityCardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  communityAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center' },
  communityAvatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  communityInfo: { flex: 1 },
  communityName: { fontSize: 14, fontWeight: '600', color: '#11181C' },
  communityPlant: { fontSize: 13, color: '#4b5563', marginTop: 2 },
  communityStatusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  communityStatusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  communityStatus: { fontSize: 12, fontWeight: '500', color: '#374151' },
  communityTime: { fontSize: 12, color: '#9ca3af', marginLeft: 4 },
  communityImage: { width: 60, height: 60, borderRadius: 12, resizeMode: 'cover' },

  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 32, width: '100%', maxHeight: '90%', padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '700', color: '#11181C' },
  closeButton: { padding: 4 },
  glassCard: { borderRadius: 24, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.4)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', padding: 24 },
  stepCard: { marginBottom: 16 },
  cameraPrompt: { alignItems: 'center', paddingVertical: 20 },
  cameraPromptTitle: { fontSize: 20, fontWeight: '700', color: '#166534', marginTop: 16 },
  cameraPromptSub: { fontSize: 14, color: '#4b5563', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  manualRetryButton: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#22c55e', borderRadius: 30 },
  manualRetryText: { color: '#fff', fontWeight: '600' },
  analyzingContainer: { alignItems: 'center', paddingVertical: 30 },
  scanningRing: { position: 'absolute', width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderColor: '#22c55e', opacity: 0.3 },
  analyzingText: { marginTop: 10, fontSize: 18, fontWeight: '600', color: '#166534' },
  analyzingSubtext: { marginTop: 4, fontSize: 14, color: '#6b7280' },
  resultScroll: { flexGrow: 1 },
  resultImage: { width: '100%', height: 220, borderRadius: 20, marginBottom: 16 },
  resultCard: { marginBottom: 16 },
  detectedPlantLabel: { fontSize: 18, fontWeight: '700', color: '#166534', marginBottom: 8 },
  resultBadge: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginBottom: 16 },
  resultBadgeText: { fontSize: 14, fontWeight: '600' },
  recommendationCard: { backgroundColor: 'rgba(34,197,94,0.08)', borderRadius: 20, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)' },
  recommendationHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  recommendationTitle: { fontSize: 18, fontWeight: '700', color: '#166534', marginLeft: 8 },
  recommendationText: { fontSize: 15, color: '#065f46', lineHeight: 22, marginBottom: 12 },
  takeActionButton: { backgroundColor: '#22c55e', borderRadius: 30, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  takeActionButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  resultSection: { marginBottom: 16 },
  resultSectionTitle: { fontSize: 16, fontWeight: '700', color: '#11181C', marginBottom: 6 },
  resultText: { fontSize: 14, color: '#4b5563', lineHeight: 20 },
  feedbackContainer: { marginVertical: 16, alignItems: 'center' },
  feedbackTitle: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 },
  feedbackButtons: { flexDirection: 'row', gap: 16 },
  feedbackButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f3f4f6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 40 },
  feedbackDisabled: { opacity: 0.5 },
  feedbackButtonText: { fontSize: 14, fontWeight: '500' },
  newScanButton: { backgroundColor: '#22c55e', paddingVertical: 14, borderRadius: 40, alignItems: 'center', marginTop: 8, marginBottom: 20 },
  newScanButtonText: { color: 'white', fontWeight: '700', fontSize: 16 },
  errorContainer: { alignItems: 'center', paddingVertical: 20 },
  errorTitle: { fontSize: 20, fontWeight: '700', color: '#ef4444', marginTop: 12 },
  errorMessage: { fontSize: 14, color: '#4b5563', textAlign: 'center', marginTop: 8, marginBottom: 24, lineHeight: 20 },
  errorRetryButton: { backgroundColor: '#22c55e', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 30 },
  errorRetryText: { color: '#fff', fontWeight: '600' },
  errorCloseButton: { marginTop: 12, paddingVertical: 8 },
  errorCloseText: { color: '#6b7280', fontWeight: '500' },
});