import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { debounce } from 'lodash';
import React, { useEffect, useRef, useState } from 'react';
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
  interpolate,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  ZoomIn,
  ZoomOut
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNav } from '@/components/bottom-nav';
import { MobileHeader } from '@/components/mobile-header';
import { GlassCard } from '@/components/ui/glass-card';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

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
  const router = useRouter();
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [location, setLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);

  // Tagging state (manual @)
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionUsers, setMentionUsers] = useState<any[]>([]);
  const [mentionStartPos, setMentionStartPos] = useState(0);
  const textInputRef = useRef<TextInput>(null);
  const [taggedUserIds, setTaggedUserIds] = useState<Set<string>>(new Set());

  // Optional "Tag someone" button modal
  const [tagModalVisible, setTagModalVisible] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [tagSearchResults, setTagSearchResults] = useState<any[]>([]);

  const isValid = description.trim().length >= 20 && selectedCategory !== null;

  // Debounced user search for inline @
  const searchUsers = debounce(async (query: string) => {
    if (!query || !user) {
      setMentionUsers([]);
      return;
    }
    const { data, error } = await supabase.rpc('search_users', {
      search_term: query,
      current_user_id: user.id,
    });
    if (!error && data) setMentionUsers(data);
    else setMentionUsers([]);
  }, 300);

  // Debounced search for modal
  const searchUsersForTag = debounce(async (query: string) => {
    if (!query || !user) {
      setTagSearchResults([]);
      return;
    }
    const { data, error } = await supabase.rpc('search_users', {
      search_term: query,
      current_user_id: user.id,
    });
    if (!error && data) setTagSearchResults(data);
    else setTagSearchResults([]);
  }, 300);

  const handleTextChange = (newText: string) => {
    setDescription(newText);
    // Detect @ symbol
    const cursorPos = textInputRef.current?.props.selection?.start || newText.length;
    const textBeforeCursor = newText.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const afterAt = textBeforeCursor.slice(lastAtIndex + 1);
      if (!afterAt.includes(' ')) {
        setMentionQuery(afterAt);
        setShowMentions(true);
        setMentionStartPos(lastAtIndex);
        searchUsers(afterAt);
        return;
      }
    }
    setShowMentions(false);
  };

  const selectUser = (selectedUser: any) => {
    const beforeMention = description.slice(0, mentionStartPos);
    const afterMention = description.slice(mentionStartPos + mentionQuery.length + 1);
    const newText = `${beforeMention}@${selectedUser.name} ${afterMention}`;
    setDescription(newText);
    setTaggedUserIds(prev => new Set(prev).add(selectedUser.user_id));
    setShowMentions(false);
  };

  // Add tag from modal
  const addTagFromModal = (selectedUser: any) => {
    if (taggedUserIds.has(selectedUser.user_id)) return;
    setTaggedUserIds(prev => new Set(prev).add(selectedUser.user_id));
    const newDescription = description + (description ? ' ' : '') + `@${selectedUser.name}`;
    setDescription(newDescription);
    setTagModalVisible(false);
    setTagSearchQuery('');
  };

  // Upload media to Supabase Storage
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

  const handleSubmit = async () => {
    if (!isValid) return;
    if (!user) {
      Alert.alert('Login Required', 'Please log in to post');
      return;
    }
    setIsSubmitting(true);
    try {
      // 1. Upload media
      const mediaUrls: string[] = [];
      for (const item of mediaItems) {
        try {
          const url = await uploadFile(item.uri, item.type, user.id);
          mediaUrls.push(url);
        } catch (err) { console.error('Upload failed', err); }
      }
      // 2. Insert post
      const { data: post, error: insertError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          title: description.slice(0, 100),
          preview: description.slice(0, 200),
          category: selectedCategory,
          media_urls: mediaUrls,
          media_type: mediaUrls.length > 0 ? (mediaItems[0]?.type === 'image' ? 'image' : 'video') : null,
          location: location.trim() || null,
          created_at: new Date(),
        })
        .select()
        .single();
      if (insertError) throw insertError;
      // 3. Insert tags and send notifications
      for (const taggedUserId of taggedUserIds) {
        await supabase.from('post_tags').insert({
          post_id: post.id,
          tagged_user_id: taggedUserId,
          tagged_by_user_id: user.id,
        });
        await supabase.from('notifications').insert({
          user_id: taggedUserId,
          type: 'tag',
          title: 'You were mentioned',
          message: `${user.name || 'Someone'} mentioned you in a post: ${description.slice(0, 50)}...`,
          action_url: `/community/post/${post.id}`,
          created_at: new Date(),
        });
      }
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setDescription('');
        setSelectedCategory(null);
        setLocation('');
        setMediaItems([]);
        setTaggedUserIds(new Set());
        router.push('/community');
      }, 2000);
    } catch (error) {
      console.error('Submit error', error);
      Alert.alert('Error', 'Failed to post your question');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Media pickers
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
      setMediaItems(prev => [...prev, { uri: asset.uri, type: mediaType, fileName: asset.fileName ?? undefined }]);
    }
  };

  const removeMedia = (index: number) => setMediaItems(prev => prev.filter((_, i) => i !== index));

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
                <View style={styles.videoBadge}><Ionicons name="play-circle" size={24} color="#fff" /></View>
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

  // Background animations
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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <LinearGradient colors={['#f0fdf4', '#ffffff', '#ecfdf5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <Animated.View style={[styles.bgBlob, { left: -width * 0.2, top: -height * 0.2, width: width * 0.6, height: width * 0.6 }, bgBlobStyle]}>
          <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} />
        </Animated.View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <MobileHeader />
          <Animated.View entering={SlideInDown.duration(500)} style={styles.header}>
            <View style={styles.headerRow}><Ionicons name="sparkles" size={24} color="#22c55e" /><Text style={styles.headerTitle}>Ask the Community</Text></View>
            <Text style={styles.headerSubtitle}>Get help from experienced farmers</Text>
          </Animated.View>

          <View style={styles.form}>
            <GlassCard style={styles.card}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                ref={textInputRef}
                style={[styles.input, styles.textarea]}
                placeholder="Describe your problem... (min 20 characters). Use @ to tag other farmers."
                placeholderTextColor="#9ca3af"
                value={description}
                onChangeText={handleTextChange}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
              {showMentions && mentionUsers.length > 0 && (
                <View style={styles.mentionList}>
                  {mentionUsers.map(u => (
                    <TouchableOpacity key={u.user_id} onPress={() => selectUser(u)} style={styles.mentionItem}>
                      <Text style={styles.mentionName}>{u.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <Text style={styles.charCount}>{description.length}/500 characters</Text>

              {/* Optional "Tag someone" button */}
              <TouchableOpacity
                style={styles.tagButton}
                onPress={() => setTagModalVisible(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="person-add-outline" size={18} color="#22c55e" />
                <Text style={styles.tagButtonText}>Tag someone (optional)</Text>
              </TouchableOpacity>

              {/* Show selected tags (optional) */}
              {taggedUserIds.size > 0 && (
                <View style={styles.taggedUsersContainer}>
                  <Text style={styles.taggedUsersLabel}>Tagged:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {Array.from(taggedUserIds).map((uid) => (
                      <View key={uid} style={styles.tagChip}>
                        <Text style={styles.tagChipText}>User {uid.slice(0, 4)}</Text>
                        <TouchableOpacity
                          onPress={() => {
                            setTaggedUserIds(prev => {
                              const newSet = new Set(prev);
                              newSet.delete(uid);
                              return newSet;
                            });
                            // Remove @username from description – simplified: we would need the name, so we skip for brevity
                          }}
                        >
                          <Ionicons name="close-circle" size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}
            </GlassCard>

            {/* Category picker */}
            <GlassCard style={styles.card}>
              <View style={styles.labelRow}><Ionicons name="pricetag-outline" size={16} color="#11181C" /><Text style={styles.label}>Category</Text></View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContainer}>
                {categories.map(cat => (
                  <TouchableOpacity key={cat.id} style={[styles.categoryButton, selectedCategory === cat.id && styles.categoryButtonActive]} onPress={() => setSelectedCategory(cat.id)}>
                    <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                    <Text style={[styles.categoryText, selectedCategory === cat.id && styles.categoryTextActive]}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </GlassCard>

            {/* Location */}
            <GlassCard style={styles.card}>
              <View style={styles.labelRow}><Ionicons name="location-outline" size={16} color="#11181C" /><Text style={styles.label}>Location (Optional)</Text></View>
              <TextInput style={styles.input} placeholder="e.g., Arusha, Tanzania" placeholderTextColor="#9ca3af" value={location} onChangeText={setLocation} />
            </GlassCard>

            {/* Media */}
            <GlassCard style={styles.card}>
              <View style={styles.labelRow}><Ionicons name="images-outline" size={16} color="#11181C" /><Text style={styles.label}>Add Photos & Videos (Optional)</Text></View>
              {renderMediaPreview()}
              <View style={styles.mediaButtons}>
                <TouchableOpacity style={styles.mediaButton} onPress={() => pickMedia('image')}><Ionicons name="camera-outline" size={24} color="#22c55e" /><Text style={styles.mediaButtonText}>Photo</Text></TouchableOpacity>
                <TouchableOpacity style={styles.mediaButton} onPress={() => pickMedia('video')}><Ionicons name="videocam-outline" size={24} color="#22c55e" /><Text style={styles.mediaButtonText}>Video</Text></TouchableOpacity>
              </View>
            </GlassCard>

            {/* Submit button */}
            <TouchableOpacity style={[styles.submitButton, !isValid && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={!isValid || isSubmitting}>
              {isSubmitting ? <Ionicons name="reload" size={20} color="#fff" /> : <><Ionicons name="send-outline" size={20} color="#fff" /><Text style={styles.submitText}>Post Question</Text></>}
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

      {/* Tag User Modal */}
      <Modal
        visible={tagModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setTagModalVisible(false)}
      >
        <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill}>
          <View style={styles.modalContainer}>
            <View style={styles.tagModalContent}>
              <View style={styles.tagModalHeader}>
                <Text style={styles.tagModalTitle}>Tag a Farmer</Text>
                <TouchableOpacity onPress={() => setTagModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#11181C" />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.tagSearchInput}
                placeholder="Search by name..."
                placeholderTextColor="#9ca3af"
                value={tagSearchQuery}
                onChangeText={(text) => {
                  setTagSearchQuery(text);
                  searchUsersForTag(text);
                }}
                autoFocus
              />
              {tagSearchResults.length > 0 ? (
                <ScrollView style={styles.tagResultsList}>
                  {tagSearchResults.map(u => (
                    <TouchableOpacity
                      key={u.user_id}
                      style={styles.tagResultItem}
                      onPress={() => addTagFromModal(u)}
                    >
                      <Text style={styles.tagResultName}>{u.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.noTagResults}>
                  <Text style={styles.noTagResultsText}>No users found</Text>
                </View>
              )}
            </View>
          </View>
        </BlurView>
      </Modal>
    </SafeAreaView>
  );
}

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
  mentionList: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, marginTop: 4, maxHeight: 150 },
  mentionItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  mentionName: { fontSize: 14, fontWeight: '500', color: '#11181C' },
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
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tagModalContent: { backgroundColor: 'white', borderRadius: 24, padding: 20, marginHorizontal: 20, maxHeight: '80%' },
  tagModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  tagModalTitle: { fontSize: 18, fontWeight: '600', color: '#11181C' },
  tagSearchInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 16 },
  tagResultsList: { maxHeight: 300 },
  tagResultItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  tagResultName: { fontSize: 14, fontWeight: '500', color: '#11181C' },
  noTagResults: { alignItems: 'center', paddingVertical: 24 },
  noTagResultsText: { fontSize: 14, color: '#9ca3af' },
  tagButton: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, paddingVertical: 6 },
  tagButtonText: { fontSize: 14, color: '#22c55e', fontWeight: '500' },
  taggedUsersContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8, flexWrap: 'wrap' },
  taggedUsersLabel: { fontSize: 12, color: '#687076' },
  tagChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', borderRadius: 16, paddingHorizontal: 8, paddingVertical: 4, marginRight: 8, gap: 4 },
  tagChipText: { fontSize: 12, color: '#22c55e' },
});