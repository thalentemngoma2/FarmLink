import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
  State,
  TapGestureHandler,
} from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeOut,
  interpolate,
  Layout,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNav } from '@/components/bottom-nav';
import { ChatList } from '@/components/ChatList';
import { ChatScreen } from '@/components/ChatScreen';
import { MobileHeader } from '@/components/mobile-header';
import { GlassCard } from '@/components/ui/glass-card';
import { useAuth } from '@/context/AuthContext';
import { ChatProvider, useChat } from '@/context/ChatContext';
import { supabase } from '@/lib/supabase';

// -----------------------------------------------------------------------------
// Helper: Format post time
// -----------------------------------------------------------------------------
function formatPostTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Now';
  if (diffHours < 1) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// -----------------------------------------------------------------------------
// Helper: Process @mentions
// -----------------------------------------------------------------------------
async function processMentions(
  content: string,
  actorUserId: string,
  postId?: string,
  commentId?: string
) {
  const mentionRegex = /@(\w+)/g;
  let match;
  const usernames = new Set<string>();
  while ((match = mentionRegex.exec(content)) !== null) {
    usernames.add(match[1]);
  }
  for (const username of usernames) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('name', username)
      .single();
    if (profile && profile.id !== actorUserId) {
      await supabase.from('notifications').insert({
        user_id: profile.id,
        type: 'mention',
        title: 'You were mentioned',
        message: `${actorUserId} mentioned you in a ${postId ? 'post' : 'comment'}`,
        action_url: postId ? `/community/post/${postId}` : `/community/comment/${commentId}`,
        created_at: new Date(),
        read: false,
      });
    }
  }
}

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
interface Comment {
  id: string;
  username: string;
  avatar: string;
  comment: string;
  postedDate: string;
  likes: number;
  likedByUser?: boolean;
  userId: string;
  replies: Reply[];
}

interface Reply {
  id: string;
  username: string;
  avatar: string;
  comment: string;
  postedDate: string;
  likes: number;
  likedByUser?: boolean;
}

interface Discussion {
  id: string;
  avatar: string;
  author: string;
  authorId: string;
  timeAgo: string;
  trending: boolean;
  title: string;
  preview: string;
  category: string;
  replies: number;
  likes: number;
  imageUri?: string;
  videoUri?: string;
  mediaType?: 'image' | 'video';
  likedByUser?: boolean;
  isOfficial: boolean;
  comments: Comment[];
}

const categories = ['All', 'Crops', 'Pests', 'Irrigation', 'Soil', 'Market'];

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SNAP_PARTIAL = SCREEN_HEIGHT * 0.4;
const SNAP_EXPANDED = SCREEN_HEIGHT * 0.05;
const BOTTOM_NAV_HEIGHT = 70;

// -----------------------------------------------------------------------------
// Helper: map post – includes liked_by_user check
// FIXED: separate imageUri and videoUri based on media_type
// -----------------------------------------------------------------------------
function mapPost(row: any, likedPostIds: Set<string>, currentUserId?: string): Discussion {
  return {
    id: String(row.id),
    avatar: row.profiles?.avatar ?? '🌱',
    author: row.profiles?.name ?? 'Anonymous',
    authorId: row.user_id,
    timeAgo: formatPostTime(row.created_at),
    trending: false,
    title: row.title ?? '',
    preview: row.preview ?? '',
    category: row.category ?? 'General',
    replies: row.comments_count ?? 0,
    likes: row.likes_count ?? 0,
    imageUri: row.media_type === 'image' ? row.media_urls?.[0] : undefined,
    videoUri: row.media_type === 'video' ? row.media_urls?.[0] : undefined,
    mediaType: row.media_type ?? undefined,
    likedByUser: likedPostIds.has(row.id),
    isOfficial: row.is_official ?? false,
    comments: [],
  };
}

function mapComment(row: any): Comment {
  return {
    id: String(row.id),
    username: row.profiles?.name ?? 'Anonymous',
    avatar: row.profiles?.avatar ?? '🌱',
    comment: row.content,
    postedDate: formatPostTime(row.created_at),
    likes: row.likes_count ?? 0,
    likedByUser: false,
    userId: row.user_id,
    replies: (row.replies ?? []).map((r: any) => mapReply(r)),
  };
}

function mapReply(row: any): Reply {
  return {
    id: String(row.id),
    username: row.profiles?.name ?? 'Anonymous',
    avatar: row.profiles?.avatar ?? '🌱',
    comment: row.content,
    postedDate: formatPostTime(row.created_at),
    likes: row.likes_count ?? 0,
    likedByUser: false,
  };
}

// -----------------------------------------------------------------------------
// TikTok Bottom Sheet (unchanged)
// -----------------------------------------------------------------------------
export interface BottomSheetRef {
  expand: () => void;
}

interface TikTokBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const TikTokBottomSheet = forwardRef<BottomSheetRef, TikTokBottomSheetProps>(
  ({ visible, onClose, children }, ref) => {
    const [isVisible, setIsVisible] = useState(false);
    const translateY = useSharedValue(SCREEN_HEIGHT);
    const context = useSharedValue(0);

    useEffect(() => {
      if (visible) {
        setIsVisible(true);
        translateY.value = withSpring(SNAP_PARTIAL, { damping: 20, stiffness: 200 });
      } else {
        translateY.value = withSpring(SCREEN_HEIGHT, { damping: 20, stiffness: 200 }, () => {
          runOnJS(setIsVisible)(false);
        });
      }
    }, [visible]);

    const expand = useCallback(() => {
      translateY.value = withSpring(SNAP_EXPANDED, { damping: 20, stiffness: 200 });
    }, []);

    useImperativeHandle(ref, () => ({ expand }), [expand]);

    const panGesture = Gesture.Pan()
      .onStart(() => { context.value = translateY.value; })
      .onUpdate((event) => {
        const newY = context.value + event.translationY;
        translateY.value = Math.max(0, Math.min(SCREEN_HEIGHT, newY));
      })
      .onEnd((event) => {
        const velocity = event.velocityY;
        const currentY = translateY.value;
        let targetSnap: number;
        if (velocity > 800 || currentY > SCREEN_HEIGHT * 0.7) {
          targetSnap = SCREEN_HEIGHT;
        } else if (velocity < -500 || currentY < SCREEN_HEIGHT * 0.2) {
          targetSnap = SNAP_EXPANDED;
        } else {
          const distToPartial = Math.abs(currentY - SNAP_PARTIAL);
          const distToExpanded = Math.abs(currentY - SNAP_EXPANDED);
          targetSnap = distToPartial < distToExpanded ? SNAP_PARTIAL : SNAP_EXPANDED;
        }
        if (targetSnap === SCREEN_HEIGHT) {
          runOnJS(onClose)();
        } else {
          translateY.value = withSpring(targetSnap, { damping: 20, stiffness: 200 });
        }
      });

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: translateY.value }],
    }));

    const handleBackdropTap = useCallback((event: any) => {
      if (event.nativeEvent.state === State.END) onClose();
    }, [onClose]);

    if (!isVisible) return null;

    return (
      <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
        <TapGestureHandler onHandlerStateChange={handleBackdropTap}>
          <Animated.View
            style={[styles.backdrop, { opacity: interpolate(translateY.value, [0, SCREEN_HEIGHT], [0.7, 0]) }]}
            pointerEvents="auto"
          >
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          </Animated.View>
        </TapGestureHandler>
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.bottomSheet, animatedStyle]} pointerEvents="auto">
            <View style={styles.handleBar} />
            <View style={styles.bottomSheetContent}>{children}</View>
          </Animated.View>
        </GestureDetector>
      </View>
    );
  }
);

// -----------------------------------------------------------------------------
// Comment Item Component
// -----------------------------------------------------------------------------
interface CommentItemProps {
  comment: Comment;
  onLike: (commentId: string) => void;
  onReply: (commentId: string, username: string) => void;
  currentUserId?: string;
  onDelete?: (commentId: string) => void;
}

const CommentItem: React.FC<CommentItemProps> = ({ comment, onLike, onReply, currentUserId, onDelete }) => {
  const [showReplies, setShowReplies] = useState(false);
  const isOwnComment = currentUserId === comment.userId;

  const handleDelete = () => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete?.(comment.id) }
      ]
    );
  };

  return (
    <View style={styles.commentItem}>
      <View style={styles.commentRow}>
        <View style={styles.commentAvatar}><Text style={styles.commentAvatarText}>{comment.avatar}</Text></View>
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <View>
              <Text style={styles.commentUsername}>@{comment.username}</Text>
              <Text style={styles.commentDate}>{comment.postedDate}</Text>
            </View>
            <View style={styles.commentActions}>
              <TouchableOpacity onPress={() => onLike(comment.id)} style={styles.likeButton}>
                <Ionicons name={comment.likedByUser ? 'heart' : 'heart-outline'} size={20} color={comment.likedByUser ? '#ef4444' : '#6b7280'} />
                <Text style={[styles.likeCount, comment.likedByUser && styles.likeCountActive]}>{comment.likes}</Text>
              </TouchableOpacity>
              {isOwnComment && (
                <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              )}
            </View>
          </View>
          <Text style={styles.commentText}>{comment.comment}</Text>
          <TouchableOpacity style={styles.replyButton} onPress={() => onReply(comment.id, comment.username)}>
            <Text style={styles.replyButtonText}>Reply</Text>
          </TouchableOpacity>
        </View>
      </View>
      {comment.replies.length > 0 && (
        <View style={styles.repliesSection}>
          <TouchableOpacity style={styles.viewRepliesButton} onPress={() => setShowReplies(!showReplies)}>
            <Ionicons name={showReplies ? 'chevron-up' : 'chevron-down'} size={14} color="#6b7280" />
            <Text style={styles.viewRepliesText}>{showReplies ? 'Hide' : 'View'} {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}</Text>
          </TouchableOpacity>
          {showReplies && comment.replies.map((reply) => (
            <View key={reply.id} style={styles.replyItem}>
              <View style={styles.replyAvatar}><Text style={styles.replyAvatarText}>{reply.avatar}</Text></View>
              <View style={styles.replyContent}>
                <View style={styles.replyHeader}>
                  <Text style={styles.replyUsername}>@{reply.username}</Text>
                  <Text style={styles.replyDate}>{reply.postedDate}</Text>
                </View>
                <Text style={styles.replyText}>{reply.comment}</Text>
                <View style={styles.replyActions}>
                  <TouchableOpacity onPress={() => onLike(reply.id)} style={styles.replyLikeButton}>
                    <Ionicons name={reply.likedByUser ? 'heart' : 'heart-outline'} size={14} color={reply.likedByUser ? '#ef4444' : '#9ca3af'} />
                    <Text style={styles.replyLikeCount}>{reply.likes}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

// -----------------------------------------------------------------------------
// Main Community Page Content
// -----------------------------------------------------------------------------
const CommunityPageContent = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [posts, setPosts] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleVideoId, setVisibleVideoId] = useState<string | null>(null);
  const videoRefs = useRef<Map<string, Video>>(new Map());

  const [commentSheetVisible, setCommentSheetVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; username: string } | null>(null);
  const commentInputRef = useRef<TextInput>(null);
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  const [showChatList, setShowChatList] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const { createChat } = useChat();

  // ---------------------------------------------------------------------------
  // Render @mentions as clickable links
  // ---------------------------------------------------------------------------
  const renderMentions = (text: string) => {
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const username = part.slice(1);
        return (
          <Text
            key={i}
            style={styles.mentionLink}
            onPress={() => router.push({ pathname: '/profile/[username]', params: { username } } as any)}
          >
            {part}
          </Text>
        );
      }
      return <Text key={i}>{part}</Text>;
    });
  };

  // ---------------------------------------------------------------------------
  // Fetch posts with like status (left join)
  // ---------------------------------------------------------------------------
  const fetchPosts = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('posts')
        .select(`
          id,
          user_id,
          title,
          preview,
          category,
          created_at,
          media_urls,
          media_type,
          comments_count,
          likes_count,
          is_official,
          profiles (
            name,
            avatar
          )
        `)
        .order('created_at', { ascending: false });

      if (activeCategory !== 'All') {
        query = query.eq('category', activeCategory);
      }

      const { data: postsData, error: postsError } = await query;
      console.log('🔍 Raw posts with profiles:', JSON.stringify(postsData?.slice(0, 2), null, 2));
      if (postsError) throw postsError;

      let likedPostIds = new Set<string>();
      if (user) {
        const { data: likesData, error: likesError } = await supabase
          .from('post_likes')
          .select('post_id')
          .eq('user_id', user.id);
        if (!likesError && likesData) {
          likedPostIds = new Set(likesData.map(like => like.post_id));
        }
      }

      setPosts((postsData ?? []).map((row) => mapPost(row, likedPostIds, user?.id)));
    } catch (err: any) {
      console.error('Failed to fetch posts', err);
      Alert.alert('Error', 'Could not load community posts');
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Fetch comments (left join to profiles)
  // ---------------------------------------------------------------------------
  const fetchComments = async (postId: string): Promise<Comment[]> => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          profiles (
            name,
            avatar
          ),
          replies:comments!parent_comment_id (
            *,
            profiles (
              name,
              avatar
            )
          )
        `)
        .eq('post_id', postId)
        .is('parent_comment_id', null)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => mapComment(row));
    } catch (err) {
      console.error('Failed to fetch comments', err);
      return [];
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [activeCategory]);

  const filteredPosts = useMemo(() => {
    if (!searchQuery) return posts;
    return posts.filter((p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.preview.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [posts, searchQuery]);

  const selectedPost = useMemo(() => posts.find(p => p.id === selectedPostId), [posts, selectedPostId]);

  // ---------------------------------------------------------------------------
  // Like a post – updates local state and persists
  // ---------------------------------------------------------------------------
  const handleLike = async (id: string) => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to like posts', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => router.push('/login') },
      ]);
      return;
    }
    const post = posts.find(p => p.id === id);
    if (!post) return;

    setPosts(prev => prev.map(p =>
      p.id === id
        ? { ...p, likes: p.likedByUser ? p.likes - 1 : p.likes + 1, likedByUser: !p.likedByUser }
        : p
    ));

    try {
      if (post.likedByUser) {
        await supabase.from('post_likes').delete().eq('post_id', id).eq('user_id', user.id);
      } else {
        await supabase.from('post_likes').insert({ post_id: id, user_id: user.id });
      }
    } catch (err) {
      setPosts(prev => prev.map(p =>
        p.id === id
          ? { ...p, likes: post.likes, likedByUser: post.likedByUser }
          : p
      ));
      Alert.alert('Error', 'Failed to like post');
    }
  };

  // ---------------------------------------------------------------------------
  // Delete a comment
  // ---------------------------------------------------------------------------
  const deleteComment = async (commentId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id);
      if (error) throw error;
      if (selectedPostId) {
        const newComments = await fetchComments(selectedPostId);
        setPosts(prev => prev.map(p =>
          p.id === selectedPostId
            ? { ...p, comments: newComments, replies: newComments.length }
            : p
        ));
      }
      Alert.alert('Success', 'Comment deleted');
    } catch (error) {
      console.error('Delete failed', error);
      Alert.alert('Error', 'Could not delete comment');
    }
  };

  // ---------------------------------------------------------------------------
  // Open comment sheet
  // ---------------------------------------------------------------------------
  const handleComment = async (postId: string) => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to comment', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => router.push('/login') },
      ]);
      return;
    }
    setSelectedPostId(postId);
    setReplyingTo(null);
    setCommentText('');
    const comments = await fetchComments(postId);
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments } : p));
    setCommentSheetVisible(true);
  };

  const handleReply = (commentId: string, username: string) => {
    setReplyingTo({ commentId, username });
    setCommentText(`@${username} `);
    bottomSheetRef.current?.expand();
    setTimeout(() => commentInputRef.current?.focus(), 100);
  };

  // ---------------------------------------------------------------------------
  // Submit comment (with mention processing)
  // ---------------------------------------------------------------------------
  const submitComment = async () => {
    if (!commentText.trim() || !selectedPostId) return;
    if (!user) {
      Alert.alert('Login Required', 'Please log in to comment');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: selectedPostId,
          user_id: user.id,
          content: commentText.trim(),
          parent_comment_id: replyingTo?.commentId ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      await processMentions(commentText.trim(), user.id, selectedPostId, data.id);
      const newComments = await fetchComments(selectedPostId);
      setPosts(prev => prev.map(p =>
        p.id === selectedPostId
          ? { ...p, comments: newComments, replies: newComments.length }
          : p
      ));
      setCommentText('');
      setReplyingTo(null);
      Alert.alert('Success', replyingTo ? 'Reply posted!' : 'Comment posted!');
    } catch (err) {
      console.error('Failed to post comment', err);
      Alert.alert('Error', 'Failed to post comment');
    }
  };

  const closeCommentSheet = () => {
    setCommentSheetVisible(false);
    setReplyingTo(null);
    setCommentText('');
    Keyboard.dismiss();
  };

  // ---------------------------------------------------------------------------
  // Video auto‑play
  // ---------------------------------------------------------------------------
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    const visibleVideo = viewableItems.find((item: any) => item.item.mediaType === 'video' && item.item.videoUri);
    if (visibleVideo) {
      const videoId = visibleVideo.item.id;
      setVisibleVideoId(videoId);
      videoRefs.current.forEach((video, id) => { if (id !== videoId) video.pauseAsync?.(); });
      videoRefs.current.get(videoId)?.playAsync?.();
    } else {
      setVisibleVideoId(null);
      videoRefs.current.forEach((video) => video.pauseAsync?.());
    }
  }).current;

  const viewabilityConfig = { viewAreaCoveragePercentThreshold: 50 };

  // Background animations
  const bgScale = useSharedValue(1);
  const bgOpacity = useSharedValue(0.3);
  const bgScale2 = useSharedValue(1.2);
  const bgOpacity2 = useSharedValue(0.2);
  useEffect(() => {
    bgScale.value = withRepeat(withTiming(1.2, { duration: 8000 }), -1, true);
    bgOpacity.value = withRepeat(withTiming(0.5, { duration: 10000 }), -1, true);
    bgScale2.value = withRepeat(withTiming(1, { duration: 10000 }), -1, true);
    bgOpacity2.value = withRepeat(withTiming(0.4, { duration: 10000 }), -1, true);
  }, []);
  const bgBlob1Style = useAnimatedStyle(() => ({ transform: [{ scale: bgScale.value }], opacity: bgOpacity.value }));
  const bgBlob2Style = useAnimatedStyle(() => ({ transform: [{ scale: bgScale2.value }], opacity: bgOpacity2.value }));

  const openChatWithUser = async (userId: string, name: string, avatar: string) => {
    const chatId = await createChat(userId, name, avatar);
    setActiveChatId(chatId);
    setShowChatList(false);
  };

  const { width, height } = Dimensions.get('window');

  const renderItem = ({ item, index }: { item: Discussion; index: number }) => (
    <Animated.View entering={FadeIn.delay(index * 50)} exiting={FadeOut} layout={Layout.springify()} style={styles.columnItem}>
      <View style={styles.cardContainer}>
        <View style={styles.mediaBackground}>
          {item.mediaType === 'video' && item.videoUri ? (
            <Video
              ref={(ref) => { if (ref) videoRefs.current.set(item.id, ref); else videoRefs.current.delete(item.id); }}
              source={{ uri: item.videoUri }}
              style={StyleSheet.absoluteFillObject}
              resizeMode={ResizeMode.COVER}
              shouldPlay={visibleVideoId === item.id}
              isLooping
              useNativeControls={false}
              volume={0}
            />
          ) : item.imageUri ? (
            <Image source={{ uri: item.imageUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          ) : (
            <LinearGradient colors={['#22c55e', '#166534']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          )}
          <View style={styles.mediaOverlay} />
        </View>
        <TouchableOpacity activeOpacity={0.9} onPress={() => console.log('Open discussion', item.id)} style={styles.cardContent}>
          <View style={styles.cardTopSection}>
            <TouchableOpacity onPress={() => openChatWithUser(item.authorId, item.author, item.avatar)}>
              <View style={styles.authorRow}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{item.avatar}</Text></View>
                <View>
                  <View style={styles.authorNameRow}>
                    <Text style={styles.authorName}>{item.author}</Text>
                    {item.isOfficial && (
                      <View style={styles.officialBadge}>
                        <Ionicons name="checkmark-circle" size={12} color="#fff" />
                        <Text style={styles.officialText}>Official</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.timeRow}>
                    <Ionicons name="time-outline" size={12} color="#ddd" />
                    <Text style={styles.timeText}>{item.timeAgo}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </View>
          <View style={styles.cardBottomSection}>
            <Text style={styles.preview} numberOfLines={3}>
              {renderMentions(item.preview)}
            </Text>
            <View style={styles.footer}>
              <View style={styles.categoryBadge}><Text style={styles.categoryText}>{item.category}</Text></View>
              <View style={styles.statsRow}>
                <TouchableOpacity style={styles.stat} onPress={() => handleLike(item.id)}>
                  <Ionicons name={item.likedByUser ? 'heart' : 'heart-outline'} size={16} color={item.likedByUser ? '#ef4444' : '#fff'} />
                  <Text style={styles.statText}>{item.likes}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.stat} onPress={() => handleComment(item.id)}>
                  <Ionicons name="chatbubble-outline" size={16} color="#fff" />
                  <Text style={styles.statText}>{item.replies}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const ListFooterComponent = () => (
    <View style={styles.loadMoreContainer}>
      <Text style={styles.loadMoreText}>↓ Load more posts ↓</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22c55e" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.container}>
          <LinearGradient colors={['#f0fdf4', '#ffffff', '#ecfdf5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <Animated.View style={[styles.bgBlob, { left: -width * 0.2, top: -height * 0.2, width: width * 0.6, height: width * 0.6 }, bgBlob1Style]}><BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} /></Animated.View>
          <Animated.View style={[styles.bgBlob, { right: -width * 0.2, bottom: -height * 0.2, width: width * 0.7, height: width * 0.7 }, bgBlob2Style]}><BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} /></Animated.View>

          <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: BOTTOM_NAV_HEIGHT }]} showsVerticalScrollIndicator={false}>
            <MobileHeader />

            <Animated.View entering={FadeIn.delay(100)} style={styles.searchContainer}>
              <GlassCard style={styles.searchCard}>
                <View style={styles.searchRow}>
                  <Ionicons name="search" size={20} color="#9ca3af" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search discussions..."
                    placeholderTextColor="#9ca3af"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  <TouchableOpacity style={styles.filterButton}><Ionicons name="options-outline" size={18} color="#9ca3af" /></TouchableOpacity>
                </View>
              </GlassCard>
            </Animated.View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[styles.tab, activeCategory === category && styles.tabActive]}
                  onPress={() => setActiveCategory(category)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabText, activeCategory === category && styles.tabTextActive]}>{category}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <FlatList
              data={filteredPosts}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.flatListContainer}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
              ListFooterComponent={ListFooterComponent}
            />
          </ScrollView>

          <BottomNav />
        </View>

        <TouchableOpacity style={styles.messageFab} onPress={() => setShowChatList(true)}>
          <Ionicons name="chatbubbles" size={24} color="#fff" />
        </TouchableOpacity>

        {showChatList && (
          <View style={styles.modalOverlay}>
            <ChatList onClose={() => setShowChatList(false)} onOpenChat={(chatId) => { setActiveChatId(chatId); setShowChatList(false); }} />
          </View>
        )}

        {activeChatId && (
          <View style={styles.modalOverlay}>
            <ChatScreen chatId={activeChatId} onClose={() => setActiveChatId(null)} />
          </View>
        )}

        <TikTokBottomSheet ref={bottomSheetRef} visible={commentSheetVisible} onClose={closeCommentSheet}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            <View style={styles.commentsSheetContainer}>
              {selectedPost && (
                <View style={styles.sheetPostHeader}>
                  <Text style={styles.sheetPostTitle} numberOfLines={2}>{selectedPost.title}</Text>

                  {/* Show media if exists */}
                  {selectedPost.mediaType === 'image' && selectedPost.imageUri && (
                    <Image
                      source={{ uri: selectedPost.imageUri }}
                      style={styles.sheetMedia}
                      resizeMode="cover"
                    />
                  )}
                  {selectedPost.mediaType === 'video' && selectedPost.videoUri && (
                    <Video
                      source={{ uri: selectedPost.videoUri }}
                      style={styles.sheetMedia}
                      resizeMode={ResizeMode.COVER}
                      useNativeControls
                      shouldPlay={false}
                      isLooping={false}
                    />
                  )}

                  {/* Full preview text with mentions */}
                  <Text style={styles.sheetPostContent}>
                    {renderMentions(selectedPost.preview)}
                  </Text>

                  <Text style={styles.sheetPostMeta}>
                    {selectedPost.comments.length} comments • {selectedPost.likes} likes
                  </Text>
                </View>
              )}
              <FlatList
                data={selectedPost?.comments || []}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <CommentItem
                    comment={item}
                    onLike={() => {}}
                    onReply={handleReply}
                    currentUserId={user?.id}
                    onDelete={deleteComment}
                  />
                )}
                ListEmptyComponent={
                  <View style={styles.emptyComments}>
                    <Ionicons name="chatbubbles-outline" size={48} color="#d1d5db" />
                    <Text style={styles.emptyCommentsText}>No comments yet</Text>
                    <Text style={styles.emptyCommentsSubtext}>Be the first to share your thoughts!</Text>
                  </View>
                }
                contentContainerStyle={styles.commentsList}
                style={styles.commentsFlatList}
                keyboardDismissMode="interactive"
              />
              <View style={styles.inputSection}>
                {replyingTo && (
                  <View style={styles.replyingToBanner}>
                    <Text style={styles.replyingToText}>Replying to @{replyingTo.username}</Text>
                    <TouchableOpacity onPress={() => { setReplyingTo(null); setCommentText(''); }}><Ionicons name="close" size={16} color="#6b7280" /></TouchableOpacity>
                  </View>
                )}
                <View style={styles.inputRow}>
                  <View style={styles.inputAvatar}><Text style={styles.inputAvatarText}>ME</Text></View>
                  <TextInput
                    ref={commentInputRef}
                    style={styles.commentInput}
                    placeholder={replyingTo ? "Write a reply..." : "Add comment..."}
                    placeholderTextColor="#9ca3af"
                    value={commentText}
                    onChangeText={setCommentText}
                    multiline
                    maxLength={500}
                    onFocus={() => bottomSheetRef.current?.expand()}
                  />
                  <TouchableOpacity
                    style={[styles.sendButton, !commentText.trim() && styles.sendButtonDisabled]}
                    onPress={submitComment}
                    disabled={!commentText.trim()}
                  >
                    <Ionicons name="send" size={20} color={commentText.trim() ? '#22c55e' : '#9ca3af'} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </TikTokBottomSheet>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------
export default function CommunityPage() {
  return (
    <ChatProvider>
      <CommunityPageContent />
    </ChatProvider>
  );
}

// -----------------------------------------------------------------------------
// Styles (updated with sheetMedia and sheetPostContent)
// -----------------------------------------------------------------------------
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, position: 'relative' },
  scrollContent: { flexGrow: 1, paddingTop: 90 },
  bgBlob: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(34,197,94,0.2)', overflow: 'hidden' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchContainer: { paddingHorizontal: 16, marginBottom: 16, marginTop: 16 },
  searchCard: { padding: 8 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#11181C', paddingVertical: 8 },
  filterButton: { padding: 4 },
  tabsContainer: { paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  tabActive: { backgroundColor: '#22c55e', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  tabText: { fontSize: 14, fontWeight: '500', color: '#687076' },
  tabTextActive: { color: '#fff' },
  flatListContainer: { paddingHorizontal: 16, gap: 16 },
  columnItem: { width: '100%', marginBottom: 16 },
  cardContainer: { borderRadius: 20, overflow: 'hidden', backgroundColor: '#000', minHeight: 280, position: 'relative' },
  mediaBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: '#1e293b' },
  mediaOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.4)' },
  cardContent: { padding: 16, flex: 1, justifyContent: 'space-between' },
  cardTopSection: {},
  cardBottomSection: { gap: 12 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(34,197,94,0.8)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  authorNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  authorName: { fontSize: 15, fontWeight: '600', color: '#fff' },
  officialBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#22c55e', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12, gap: 2 },
  officialText: { fontSize: 10, fontWeight: '600', color: 'white' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { fontSize: 11, color: '#ddd' },
  preview: { fontSize: 14, color: '#e5e7eb', lineHeight: 20 },
  mentionLink: { color: '#22c55e', fontWeight: '500' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' },
  categoryBadge: { backgroundColor: 'rgba(34,197,94,0.9)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  categoryText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { fontSize: 14, color: '#fff', fontWeight: '600' },
  loadMoreContainer: { alignItems: 'center', paddingVertical: 24 },
  loadMoreText: { fontSize: 14, color: '#22c55e', fontWeight: '500' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  bottomSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, height: SCREEN_HEIGHT, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 20 },
  handleBar: { width: 40, height: 5, backgroundColor: '#d1d5db', borderRadius: 3, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  bottomSheetContent: { flex: 1 },
  commentsSheetContainer: { flex: 1, backgroundColor: '#fff' },
  commentsFlatList: { flex: 1 },
  inputSection: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
  },
  sheetPostHeader: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  sheetPostTitle: { fontSize: 16, fontWeight: '600', color: '#11181C', marginBottom: 4 },
  sheetMedia: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: 10,
    marginBottom: 10,
  },
  sheetPostContent: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 8,
  },
  sheetPostMeta: { fontSize: 13, color: '#6b7280' },
  commentsList: { paddingHorizontal: 16, paddingBottom: 20 },
  commentItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  commentRow: { flexDirection: 'row', gap: 12 },
  commentAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center' },
  commentAvatarText: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  commentContent: { flex: 1 },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  commentUsername: { fontSize: 14, fontWeight: '600', color: '#11181C' },
  commentDate: { fontSize: 12, color: '#9ca3af' },
  commentActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  likeButton: { alignItems: 'center' },
  likeCount: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  likeCountActive: { color: '#ef4444' },
  deleteButton: { padding: 4 },
  commentText: { fontSize: 14, color: '#374151', lineHeight: 20, marginBottom: 8 },
  replyButton: { alignSelf: 'flex-start' },
  replyButtonText: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  repliesSection: { marginTop: 12, marginLeft: 52 },
  viewRepliesButton: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  viewRepliesText: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  replyItem: { flexDirection: 'row', gap: 10, marginTop: 12, paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: '#e5e7eb' },
  replyAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#86efac', alignItems: 'center', justifyContent: 'center' },
  replyAvatarText: { fontSize: 10, fontWeight: 'bold', color: '#166534' },
  replyContent: { flex: 1 },
  replyHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 2 },
  replyUsername: { fontSize: 13, fontWeight: '600', color: '#374151' },
  replyDate: { fontSize: 11, color: '#9ca3af' },
  replyText: { fontSize: 13, color: '#4b5563', lineHeight: 18, marginBottom: 4 },
  replyActions: { flexDirection: 'row', alignItems: 'center' },
  replyLikeButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  replyLikeCount: { fontSize: 12, color: '#9ca3af' },
  emptyComments: { alignItems: 'center', paddingVertical: 40 },
  emptyCommentsText: { fontSize: 16, fontWeight: '600', color: '#6b7280', marginTop: 12 },
  emptyCommentsSubtext: { fontSize: 14, color: '#9ca3af', marginTop: 4 },
  replyingToBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f0fdf4', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginBottom: 8 },
  replyingToText: { fontSize: 13, color: '#22c55e', fontWeight: '500' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  inputAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center' },
  inputAvatarText: { fontSize: 12, fontWeight: 'bold', color: '#fff' },
  commentInput: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, color: '#11181C', maxHeight: 100, backgroundColor: '#f9fafb' },
  sendButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center' },
  sendButtonDisabled: { backgroundColor: '#f3f4f6' },
  messageFab: { position: 'absolute', bottom: 90, right: 20, backgroundColor: '#22c55e', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, zIndex: 100 },
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#fff', zIndex: 200 },
});