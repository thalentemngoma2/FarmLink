import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  interpolate,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  ZoomIn,
  ZoomOut,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNav } from '@/components/bottom-nav';
import { MobileHeader } from '@/components/mobile-header';
import { GlassCard } from '@/components/ui/glass-card';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

// Categories data
const categories = [
  { id: 'crops', label: 'Crops', color: '#22c55e' },
  { id: 'pests', label: 'Pests & Disease', color: '#ef4444' },
  { id: 'irrigation', label: 'Irrigation', color: '#3b82f6' },
  { id: 'soil', label: 'Soil & Fertilizers', color: '#d97706' },
  { id: 'market', label: 'Market & Prices', color: '#a855f7' },
  { id: 'livestock', label: 'Livestock', color: '#f97316' },
];

interface MediaItem {
  uri: string;
  type: 'image' | 'video';
  fileName?: string;
}

export default function AskPage() {
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [location, setLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);

  // Validate form
  const isValid = description.trim().length >= 20 && selectedCategory !== null;

  // Animated background (unchanged)
  const bgScale = useSharedValue(1);
  const bgOpacity = useSharedValue(0.3);
  useEffect(() => {
    bgScale.value = withRepeat(withTiming(1.2, { duration: 8000 }), -1, true);
    bgOpacity.value = withRepeat(withTiming(0.5, { duration: 10000 }), -1, true);
  }, []);
  const bgBlobStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bgScale.value }],
    opacity: interpolate(bgOpacity.value, [0.3, 0.5], [0.3, 0.5]),
  }));
  const { width, height } = Dimensions.get('window');

  // ---------------------------------------------------------------------------
  // Helper: Upload a file to Supabase Storage
  // ---------------------------------------------------------------------------
  const uploadFile = async (uri: string, type: 'image' | 'video', userId: string): Promise<string> => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const fileExt = uri.split('.').pop() || (type === 'image' ? 'jpg' : 'mp4');
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `posts/${userId}/${fileName}`;

    const { error } = await supabase.storage
      .from('farmlink')
      .upload(filePath, blob, { contentType: type === 'image' ? 'image/jpeg' : 'video/mp4' });
    if (error) throw error;

    const { data: publicUrl } = supabase.storage.from('farmlink').getPublicUrl(filePath);
    return publicUrl.publicUrl;
  };

  // ---------------------------------------------------------------------------
  // Submit post
  // ---------------------------------------------------------------------------
  const handleSubmit = async () => {
    if (!isValid) return;
    if (!user) {
      Alert.alert('Login Required', 'Please log in to post a question');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Upload all media files
      const mediaUrls: string[] = [];
      for (const item of mediaItems) {
        try {
          const url = await uploadFile(item.uri, item.type, user.id);
          mediaUrls.push(url);
        } catch (err) {
          console.error('Failed to upload media:', err);
        }
      }

      // 2. Insert post into 'posts' table
      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          title: description.slice(0, 100), // optional title from first 100 chars
          preview: description.slice(0, 200),
          category: selectedCategory,
          media_urls: mediaUrls,
          media_type: mediaUrls.length > 0 ? (mediaItems[0]?.type === 'image' ? 'image' : 'video') : null,
          location: location.trim() || null,
          created_at: new Date(),
        });

      if (error) throw error;

      // 3. Show success modal and reset form
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setDescription('');
        setSelectedCategory(null);
        setLocation('');
        setMediaItems([]);
      }, 2000);
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Error', 'Failed to post your question. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Media picker
  // ---------------------------------------------------------------------------
  const pickMedia = async (mediaType: 'image' | 'video') => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', `Please allow access to your ${mediaType}s.`);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: mediaType === 'image' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 0.8,
      videoMaxDuration: 60,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setMediaItems(prev => [...prev, {
        uri: asset.uri,
        type: mediaType,
        fileName: asset.fileName ?? undefined,
      }]);
    }
  };

  const removeMedia = (index: number) => {
    setMediaItems(prev => prev.filter((_, i) => i !== index));
  };

  const renderMediaPreview = () => {
    if (mediaItems.length === 0) return null;
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaPreviewScroll}>
        {mediaItems.map((item, idx) => (
          <View key={idx} style={styles.mediaPreviewItem}>
            {item.type === 'image' ? (
              <Image source={{ uri: item.uri }} style={styles.mediaPreviewImage} />
            ) : (
              <View>
                <Image source={{ uri: item.uri }} style={styles.mediaPreviewImage} />
                <View style={styles.videoBadge}>
                  <Ionicons name="play-circle" size={24} color="#fff" />
                </View>
              </View>
            )}
            <TouchableOpacity style={styles.removeMediaBtn} onPress={() => removeMedia(idx)}>
              <Ionicons name="close-circle" size={24} color="#ef4444" />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    );
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
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
          style={[styles.bgBlob, { left: -width * 0.2, top: -height * 0.2, width: width * 0.6, height: width * 0.6 }, bgBlobStyle]}
        >
          <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} />
        </Animated.View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <MobileHeader />

          <Animated.View entering={SlideInDown.duration(500)} style={styles.header}>
            <View style={styles.headerRow}>
              <Ionicons name="sparkles" size={24} color="#22c55e" />
              <Text style={styles.headerTitle}>Ask the Community</Text>
            </View>
            <Text style={styles.headerSubtitle}>Get help from experienced farmers</Text>
          </Animated.View>

          <View style={styles.form}>
            {/* Description */}
            <GlassCard style={styles.card}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="Describe your problem in detail. Include your crop, symptoms, what you've tried... (minimum 20 characters)"
                placeholderTextColor="#9ca3af"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{description.length}/500 characters</Text>
            </GlassCard>

            {/* Categories */}
            <GlassCard style={styles.card}>
              <View style={styles.labelRow}>
                <Ionicons name="pricetag-outline" size={16} color="#11181C" />
                <Text style={styles.label}>Category</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContainer}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryButton, selectedCategory === cat.id && styles.categoryButtonActive]}
                    onPress={() => setSelectedCategory(cat.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                    <Text style={[styles.categoryText, selectedCategory === cat.id && styles.categoryTextActive]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </GlassCard>

            {/* Location (optional) */}
            <GlassCard style={styles.card}>
              <View style={styles.labelRow}>
                <Ionicons name="location-outline" size={16} color="#11181C" />
                <Text style={styles.label}>Location (Optional)</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="e.g., Arusha, Tanzania"
                placeholderTextColor="#9ca3af"
                value={location}
                onChangeText={setLocation}
              />
            </GlassCard>

            {/* Media section */}
            <GlassCard style={styles.card}>
              <View style={styles.labelRow}>
                <Ionicons name="images-outline" size={16} color="#11181C" />
                <Text style={styles.label}>Add Photos & Videos (Optional)</Text>
              </View>
              {renderMediaPreview()}
              <View style={styles.mediaButtons}>
                <TouchableOpacity style={styles.mediaButton} onPress={() => pickMedia('image')} activeOpacity={0.7}>
                  <Ionicons name="camera-outline" size={24} color="#22c55e" />
                  <Text style={styles.mediaButtonText}>Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.mediaButton} onPress={() => pickMedia('video')} activeOpacity={0.7}>
                  <Ionicons name="videocam-outline" size={24} color="#22c55e" />
                  <Text style={styles.mediaButtonText}>Video</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>

            {/* Submit button */}
            <TouchableOpacity
              style={[styles.submitButton, !isValid && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!isValid || isSubmitting}
              activeOpacity={0.7}
            >
              {isSubmitting ? (
                <Animated.View entering={FadeIn} exiting={FadeOut}>
                  <Ionicons name="reload" size={20} color="#fff" />
                </Animated.View>
              ) : (
                <>
                  <Ionicons name="send-outline" size={20} color="#fff" />
                  <Text style={styles.submitText}>Post Question</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>

        <BottomNav />
      </View>

      {/* Success Modal */}
      <Modal transparent visible={showSuccess} animationType="none">
        <View style={styles.modalOverlay}>
          <Animated.View entering={ZoomIn.springify()} exiting={ZoomOut} style={styles.modalCard}>
            <View style={styles.modalContent}>
              <Ionicons name="checkmark-circle" size={64} color="#22c55e" />
              <Text style={styles.modalTitle}>Question Posted!</Text>
              <Text style={styles.modalText}>The community will respond soon</Text>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Styles (unchanged from your original file)
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, position: 'relative' },
  scrollContent: { flexGrow: 1, paddingBottom: 80, paddingTop: 90 },
  bgBlob: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(34,197,94,0.2)', overflow: 'hidden' },
  header: { paddingHorizontal: 16, marginTop: 16, marginBottom: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#11181C' },
  headerSubtitle: { fontSize: 14, color: '#687076' },
  form: { paddingHorizontal: 16, gap: 16 },
  card: { padding: 16 },
  label: { fontSize: 14, fontWeight: '500', color: '#11181C', marginBottom: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  input: { fontSize: 14, color: '#11181C', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  textarea: { minHeight: 100, textAlignVertical: 'top' },
  charCount: { fontSize: 12, color: '#9ca3af', marginTop: 4, textAlign: 'right' },
  categoriesContainer: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  categoryButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 24, backgroundColor: 'rgba(156,163,175,0.2)' },
  categoryButtonActive: { backgroundColor: '#22c55e' },
  categoryDot: { width: 8, height: 8, borderRadius: 4 },
  categoryText: { fontSize: 12, fontWeight: '500', color: '#687076' },
  categoryTextActive: { color: '#fff' },
  mediaButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  mediaButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingVertical: 12, backgroundColor: 'rgba(156,163,175,0.05)' },
  mediaButtonText: { fontSize: 14, color: '#22c55e', fontWeight: '500' },
  mediaPreviewScroll: { marginBottom: 12 },
  mediaPreviewItem: { position: 'relative', marginRight: 12 },
  mediaPreviewImage: { width: 80, height: 80, borderRadius: 12 },
  videoBadge: { position: 'absolute', top: '50%', left: '50%', marginLeft: -12, marginTop: -12 },
  removeMediaBtn: { position: 'absolute', top: -8, right: -8, backgroundColor: '#fff', borderRadius: 12 },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#22c55e', borderRadius: 12, paddingVertical: 12, marginTop: 8, marginBottom: 24 },
  submitButtonDisabled: { backgroundColor: '#e5e7eb' },
  submitText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { width: Dimensions.get('window').width * 0.8, backgroundColor: '#fff', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  modalContent: { alignItems: 'center', gap: 12 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#11181C' },
  modalText: { fontSize: 14, color: '#687076', textAlign: 'center' },
});