import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
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
  cause: string;
  solution: string;
  preventiveTips: string;
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

// -------------------- AI Configuration --------------------
const HF_API_KEY = process.env.EXPO_PUBLIC_HF_API_KEY || '';
const USE_REAL_AI = HF_API_KEY.length > 0;
const API_URL = 'https://api-inference.huggingface.co/models/Dhiryashil/farm-disease-detection';

// List of common crop names for mismatch detection
const COMMON_PLANTS = [
  'maize', 'corn', 'tomato', 'avocado', 'wheat', 'rice', 'potato',
  'soybean', 'coffee', 'tea', 'cassava', 'banana', 'orange', 'mango',
  'cocoa', 'cotton', 'sugarcane', 'grape', 'apple', 'pepper', 'onion'
];

// Helper: Check if analysis mentions a different plant than the user entered
const doesAnalysisMatchPlant = (analysis: PlantAnalysis, userPlant: string): boolean => {
  const lowerUserPlant = userPlant.toLowerCase().trim();
  const combinedText = `${analysis.cause} ${analysis.solution} ${analysis.preventiveTips}`.toLowerCase();
  
  for (const plant of COMMON_PLANTS) {
    if (plant !== lowerUserPlant && combinedText.includes(plant)) {
      return false;
    }
  }
  return true;
};

export default function FarmLinkPage() {
  const { user } = useAuth();
  const [isPlantModalVisible, setIsPlantModalVisible] = useState(false);
  const [plantName, setPlantName] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<PlantAnalysis | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [scanHistory, setScanHistory] = useState<UserScan[]>([]);
  const [communityScans, setCommunityScans] = useState<CommunityScan[]>([]);
  const [loadingCommunity, setLoadingCommunity] = useState(false);

  // Request permissions
  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') Alert.alert('Permission needed', 'Camera access is required.');
      const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (mediaStatus !== 'granted') Alert.alert('Permission needed', 'Gallery access is required.');
    })();
  }, []);

  // Fetch scans
  useEffect(() => {
    if (user) fetchUserScans(user.id);
    fetchCommunityScans();
  }, [user]);

  const fetchUserScans = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('plant_scans')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const scans: UserScan[] = (data || []).map((scan: any) => ({
        id: scan.id,
        plantName: scan.plant_name,
        imageUri: scan.image_url,
        analysis: {
          state: scan.analysis_state,
          cause: scan.analysis_cause,
          solution: scan.analysis_solution,
          preventiveTips: scan.analysis_preventive,
        },
        timestamp: scan.created_at,
        synced: true,
      }));
      setScanHistory(scans);
    } catch (error) {
      console.error('Failed to load scans', error);
      Alert.alert('Error', 'Could not load your scan history');
    }
  };

  const fetchCommunityScans = async () => {
    setLoadingCommunity(true);
    try {
      let query = supabase
        .from('plant_scans')
        .select(`
          id,
          plant_name,
          image_url,
          analysis_state,
          created_at,
          profiles!inner (name, location)
        `)
        .order('created_at', { ascending: false })
        .limit(10);
      if (user) query = query.neq('user_id', user.id);
      const { data, error } = await query;
      if (error) throw error;
      const community: CommunityScan[] = (data || []).map((scan: any) => ({
        id: scan.id,
        farmerName: scan.profiles?.name || 'Anonymous Farmer',
        location: scan.profiles?.location || 'Unknown Region',
        imageUri: scan.image_url,
        plantName: scan.plant_name,
        analysisState:
          scan.analysis_state === 'healthy' ? 'Healthy' :
          scan.analysis_state === 'disease' ? 'Disease detected' :
          scan.analysis_state === 'undergrowth' ? 'Undergrowth' : 'Overgrowth',
        timestamp: formatRelativeTime(scan.created_at),
      }));
      setCommunityScans(community);
    } catch (error) {
      console.error('Failed to load community scans', error);
    } finally {
      setLoadingCommunity(false);
    }
  };

  // Real AI analysis via Hugging Face
  const analyzeWithRealAI = async (imageUri: string): Promise<PlantAnalysis> => {
    const response = await fetch(imageUri);
    const blob = await response.blob();
    const reader = new FileReader();
    const imageBase64 = await new Promise<string>((resolve) => {
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(blob);
    });
    const result = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: `data:image/jpeg;base64,${imageBase64}` }),
    });
    if (!result.ok) throw new Error(`API error ${result.status}`);
    const aiResult = await result.json();
    const diseaseName = aiResult.disease || aiResult.label || 'Unknown issue';
    const confidence = aiResult.confidence || 0.8;
    let state: PlantState = 'healthy';
    if (diseaseName.toLowerCase().includes('rust') ||
        diseaseName.toLowerCase().includes('blight') ||
        diseaseName.toLowerCase().includes('mildew')) {
      state = 'disease';
    } else if (diseaseName.toLowerCase().includes('nutrient') ||
               diseaseName.toLowerCase().includes('deficiency')) {
      state = 'undergrowth';
    } else if (diseaseName.toLowerCase().includes('overgrowth')) {
      state = 'overgrowth';
    }
    return {
      state,
      cause: `Detected: ${diseaseName} (confidence ${(confidence * 100).toFixed(0)}%)`,
      solution: aiResult.recommendation || aiResult.treatment ||
                'Consult a local agricultural expert for specific treatment.',
      preventiveTips: aiResult.prevention || 'Regular monitoring and proper crop rotation.',
    };
  };

  const mockAnalyzePlant = (): PlantAnalysis => {
    const states: PlantState[] = ['healthy', 'disease', 'undergrowth', 'overgrowth'];
    const randomState = states[Math.floor(Math.random() * states.length)];
    const analysisMap: Record<PlantState, PlantAnalysis> = {
      healthy: {
        state: 'healthy',
        cause: 'No issues detected.',
        solution: 'Continue current care routine.',
        preventiveTips: 'Maintain consistent watering and mulching.',
      },
      disease: {
        state: 'disease',
        cause: 'Fungal infection or pest damage.',
        solution: 'Apply neem oil or copper fungicide.',
        preventiveTips: 'Water at base, ensure good airflow.',
      },
      undergrowth: {
        state: 'undergrowth',
        cause: 'Nutrient deficiency or low sunlight.',
        solution: 'Apply balanced fertilizer, increase light exposure.',
        preventiveTips: 'Soil test before planting, rotate crops.',
      },
      overgrowth: {
        state: 'overgrowth',
        cause: 'Excessive nitrogen or lack of pruning.',
        solution: 'Reduce nitrogen fertilizer, prune overcrowded parts.',
        preventiveTips: 'Follow fertilizer schedules, space plants properly.',
      },
    };
    return analysisMap[randomState];
  };

  const uploadAndSaveScan = async (imageUri: string, plantName: string, analysis: PlantAnalysis) => {
    if (!user) throw new Error('User not authenticated');
    const response = await fetch(imageUri);
    const blob = await response.blob();
    const fileExt = imageUri.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `scans/${user.id}/${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from('farmlink')
      .upload(filePath, blob, { contentType: 'image/jpeg' });
    if (uploadError) throw uploadError;
    const { data: publicUrlData } = supabase.storage.from('farmlink').getPublicUrl(filePath);
    const imageUrl = publicUrlData.publicUrl;
    const { error: insertError } = await supabase
      .from('plant_scans')
      .insert({
        user_id: user.id,
        plant_name: plantName,
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
      Alert.alert('Login Required', 'Please log in to scan plants', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => router.push('/login') },
      ]);
      return;
    }
    if (!plantName.trim()) {
      Alert.alert('Missing Plant Name', 'Please enter the plant name before scanning.');
      return;
    }

    let result;
    if (useCamera) {
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
    }

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      setSelectedImage(uri);
      setAnalysisResult(null);
      setFeedbackGiven(false);
      setIsAnalyzing(true);

      try {
        let analysis: PlantAnalysis;
        let usingMock = false;

        if (USE_REAL_AI) {
          try {
            analysis = await analyzeWithRealAI(uri);
            // Check if the analysis mentions a different plant
            if (!doesAnalysisMatchPlant(analysis, plantName.trim())) {
              Alert.alert(
                'Plant Mismatch',
                `The AI detected a different plant (not "${plantName.trim()}"). Please create a new scan specifically for ${plantName.trim()} and try again.`,
                [{ text: 'OK', onPress: () => resetPlantModal() }]
              );
              setIsAnalyzing(false);
              setSelectedImage(null);
              return;
            }
          } catch (aiError) {
            console.error('Real AI failed, falling back to mock:', aiError);
            analysis = mockAnalyzePlant();
            usingMock = true;
            Alert.alert('AI Service Unavailable', 'Using mock data for this scan. Please try again later.');
          }
        } else {
          analysis = mockAnalyzePlant();
          usingMock = true;
          // In mock mode, we still warn about plant mismatch (optional)
          if (!doesAnalysisMatchPlant(analysis, plantName.trim())) {
            Alert.alert(
              'Mock Data Warning',
              `The simulated analysis suggests a different plant than "${plantName.trim()}". In production, the AI would reject this. Please ensure you scan the correct plant.`,
              [{ text: 'Continue Anyway', style: 'cancel' }, { text: 'Cancel Scan', onPress: () => resetPlantModal() }],
              { cancelable: false }
            );
            // We'll continue but user was warned
          }
        }

        await uploadAndSaveScan(uri, plantName.trim(), analysis);
        setAnalysisResult(analysis);
        await fetchUserScans(user.id);
      } catch (error) {
        console.error('Scan failed', error);
        Alert.alert('Error', 'Failed to analyze plant. Please try again.');
      } finally {
        setIsAnalyzing(false);
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
    setPlantName('');
    setSelectedImage(null);
    setAnalysisResult(null);
    setIsAnalyzing(false);
    setFeedbackGiven(false);
  };

  // Background animations (unchanged)
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

  const formatRelativeTime = (isoString: string) => {
    const date = new Date(isoString);
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
            <Text style={styles.heroSubtitle}>Scan your plants to detect health issues, get solutions, and track history</Text>
          </Animated.View>

          <Animated.View entering={FadeIn.delay(300)} style={styles.plantMonitorCard}>
            <LinearGradient colors={['rgba(34,197,94,0.12)', 'rgba(34,197,94,0.05)']} style={styles.plantMonitorGradient}>
              <View style={styles.plantMonitorContent}>
                <View style={styles.plantMonitorText}>
                  <Text style={styles.plantMonitorTitle}>🌿 New Scan</Text>
                  <Text style={styles.plantMonitorDesc}>Take a photo or upload from gallery</Text>
                </View>
                <TouchableOpacity style={styles.plantMonitorButton} onPress={() => setIsPlantModalVisible(true)} activeOpacity={0.8}>
                  <Ionicons name="camera-outline" size={24} color="white" />
                  <Text style={styles.plantMonitorButtonText}>Scan Plant</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </Animated.View>

          <Animated.View entering={FadeIn.delay(400)} style={styles.historySection}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>🌿 Plant Scan History</Text>
              <Text style={styles.historySubtitle}>Track your crop health and see how other farmers use AI</Text>
            </View>
            {scanHistory.length > 0 ? (
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
                      <Text style={styles.cardCause} numberOfLines={1}>{scan.analysis.cause}</Text>
                    </View>
                  </Animated.View>
                ))}
              </View>
            ) : (
              <>
                <View style={styles.emptyStateContainer}>
                  <Ionicons name="leaf-outline" size={48} color="#22c55e" />
                  <Text style={styles.emptyStateTitle}>Be the first on your farm to scan a plant 🌱</Text>
                  <TouchableOpacity style={styles.emptyStateButton} onPress={() => setIsPlantModalVisible(true)}>
                    <Text style={styles.emptyStateButtonText}>Start First Scan</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.communityHeader}>
                  <Text style={styles.communityTitle}>How other farmers are using FarmLink</Text>
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
                  <Text style={styles.modalTitle}>🌿 AI Plant Monitor</Text>
                  <TouchableOpacity onPress={resetPlantModal} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color="#11181C" />
                  </TouchableOpacity>
                </View>

                {!selectedImage && !isAnalyzing && !analysisResult && (
                  <View style={styles.nameInputContainer}>
                    <Text style={styles.nameInputLabel}>🌱 What plant are you scanning?</Text>
                    <Text style={styles.nameInputSubtitle}>
                      Enter the crop or plant name. The AI will focus only on this plant.
                    </Text>
                    <TextInput
                      style={styles.nameInput}
                      placeholder="e.g. Avocado, Tomato, Maize"
                      placeholderTextColor="#9ca3af"
                      value={plantName}
                      onChangeText={setPlantName}
                      autoFocus
                    />
                    {plantName.trim() !== '' && (
                      <View style={styles.targetPlantBadge}>
                        <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                        <Text style={styles.targetPlantText}>Scanning for: {plantName.trim()}</Text>
                      </View>
                    )}
                    <View style={styles.pickerContainer}>
                      {!USE_REAL_AI && (
                        <View style={styles.mockBadgeContainer}>
                          <Text style={styles.mockBadgeText}>⚠️ Mock Data Mode – AI service not configured</Text>
                        </View>
                      )}
                      <TouchableOpacity
                        style={[styles.pickerButton, !plantName.trim() && styles.pickerButtonDisabled]}
                        onPress={() => openImagePicker(true)}
                        disabled={!plantName.trim()}
                      >
                        <Ionicons name="camera" size={32} color={plantName.trim() ? '#22c55e' : '#9ca3af'} />
                        <Text style={[styles.pickerButtonText, !plantName.trim() && styles.pickerButtonTextDisabled]}>Take a photo</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.pickerButton, !plantName.trim() && styles.pickerButtonDisabled]}
                        onPress={() => openImagePicker(false)}
                        disabled={!plantName.trim()}
                      >
                        <Ionicons name="images" size={32} color={plantName.trim() ? '#22c55e' : '#9ca3af'} />
                        <Text style={[styles.pickerButtonText, !plantName.trim() && styles.pickerButtonTextDisabled]}>Choose from gallery</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {selectedImage && !isAnalyzing && !analysisResult && (
                  <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                    <ActivityIndicator size="large" color="#22c55e" style={styles.analyzingSpinner} />
                    <Text style={styles.analyzingText}>Analyzing plant...</Text>
                  </View>
                )}

                {isAnalyzing && (
                  <View style={styles.analyzingContainer}>
                    <ActivityIndicator size="large" color="#22c55e" />
                    <Text style={styles.analyzingText}>Our AI is examining your plant...</Text>
                    <Text style={styles.analyzingSubtext}>This may take a few seconds</Text>
                  </View>
                )}

                {analysisResult && (
                  <ScrollView style={styles.resultContainer} showsVerticalScrollIndicator={false}>
                    <Image source={{ uri: selectedImage! }} style={styles.resultImage} />
                    <Text style={styles.detectedPlantLabel}>🌿 Plant: {plantName}</Text>
                    <View style={[styles.resultBadge, { backgroundColor: getStatusColor(analysisResult.state) + '20' }]}>
                      <Text style={[styles.resultBadgeText, { color: getStatusColor(analysisResult.state) }]}>
                        {getStatusEmoji(analysisResult.state)} {analysisResult.state.toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.resultSection}>
                      <Text style={styles.resultSectionTitle}>🔍 Likely Cause</Text>
                      <Text style={styles.resultText}>{analysisResult.cause}</Text>
                    </View>
                    <View style={styles.resultSection}>
                      <Text style={styles.resultSectionTitle}>🛠️ Suggested Solution</Text>
                      <Text style={styles.resultText}>{analysisResult.solution}</Text>
                    </View>
                    <View style={styles.resultSection}>
                      <Text style={styles.resultSectionTitle}>🌾 Preventive Tips</Text>
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
                  </ScrollView>
                )}
              </Animated.View>
            </View>
          </BlurView>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

// Styles (unchanged except added targetPlantBadge and targetPlantText)
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
  emptyStateButton: { backgroundColor: '#22c55e', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 40, marginTop: 8 },
  emptyStateButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },

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
  nameInputContainer: { marginBottom: 20 },
  nameInputLabel: { fontSize: 18, fontWeight: '600', color: '#11181C', marginBottom: 8 },
  nameInputSubtitle: { fontSize: 14, color: '#687076', marginBottom: 16 },
  nameInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, backgroundColor: '#f9fafb', color: '#11181C' },
  targetPlantBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f0fdf4', padding: 8, borderRadius: 12, marginTop: 8 },
  targetPlantText: { fontSize: 14, fontWeight: '500', color: '#22c55e' },
  pickerContainer: { gap: 16, marginTop: 16 },
  pickerButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#f0fdf4', padding: 16, borderRadius: 24, borderWidth: 1, borderColor: '#22c55e' },
  pickerButtonDisabled: { opacity: 0.5, borderColor: '#d1d5db', backgroundColor: '#f3f4f6' },
  pickerButtonText: { fontSize: 16, fontWeight: '500', color: '#166534' },
  pickerButtonTextDisabled: { color: '#9ca3af' },
  mockBadgeContainer: { backgroundColor: '#fef3c7', padding: 8, borderRadius: 12, marginBottom: 8 },
  mockBadgeText: { fontSize: 12, color: '#d97706', textAlign: 'center' },
  imagePreviewContainer: { alignItems: 'center' },
  previewImage: { width: '100%', height: 250, borderRadius: 20, marginBottom: 16 },
  analyzingContainer: { alignItems: 'center', paddingVertical: 40 },
  analyzingText: { marginTop: 16, fontSize: 16, color: '#374151', fontWeight: '500' },
  analyzingSubtext: { marginTop: 8, fontSize: 14, color: '#6b7280' },
  analyzingSpinner: { position: 'absolute', top: '40%', alignSelf: 'center' },
  resultContainer: { marginTop: 8 },
  resultImage: { width: '100%', height: 200, borderRadius: 20, marginBottom: 16 },
  detectedPlantLabel: { fontSize: 18, fontWeight: '700', color: '#166534', marginBottom: 8, textAlign: 'center' },
  resultBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 16 },
  resultBadgeText: { fontSize: 14, fontWeight: '600' },
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
});