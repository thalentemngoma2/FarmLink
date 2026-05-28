import { Ionicons } from "@expo/vector-icons";
import { ResizeMode, Video } from "expo-av";
import { BlurView } from "expo-blur";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

// -----------------------------------------------------------------------------
// Context & Lib
// -----------------------------------------------------------------------------
import { useAuth } from "@/context/AuthContext";
import { ChatProvider, useChat } from "@/context/ChatContext";
import { supabase } from "@/lib/supabase";

import { BottomNav } from "@/components/bottom-nav";
import { ChatList } from "@/components/ChatList";
import { ChatScreen } from "@/components/ChatScreen";
import { MobileHeader } from "@/components/mobile-header";
import { GlassCard } from "@/components/ui/glass-card";

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------
function formatPostTime(isoString?: string): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

async function processMentions(
  content: string,
  actorUserId: string,
  postId?: string,
  commentId?: string,
) {
  const mentionRegex = /@(\w+)/g;
  let match;
  const usernames = new Set<string>();
  while ((match = mentionRegex.exec(content)) !== null) usernames.add(match[1]);
  for (const username of usernames) {
    const { data: user } = await supabase
      .from("users")
      .select("user_id")
      .eq("username", username)
      .maybeSingle();
    if (user && user.user_id !== actorUserId) {
      await supabase.from("notifications").insert({
        user_id: user.user_id,
        type: "mention",
        title: "You were mentioned",
        message: `Someone mentioned you in a ${postId ? "post" : "comment"}`,
        action_url: postId
          ? `/community/post/${postId}`
          : `/community/comment/${commentId}`,
        created_at: new Date(),
        read: false,
      });
    }
  }
}

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
interface MediaItem {
  url: string;
  type: "image" | "video";
}
interface Reply {
  id: string;
  username: string;
  avatar: string;
  comment: string;
  postedDate: string;
  likes: number;
  likedByUser?: boolean;
  userId: string;
}
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
interface Discussion {
  id: string;
  avatar: string;
  author: string;
  authorId: string;
  timeAgo: string;
  trending: boolean;
  preview: string;
  category: string;
  replies: number;
  likes: number;
  media: MediaItem[];
  likedByUser?: boolean;
  isOfficial: boolean;
  comments: Comment[];
}

const CATEGORIES = ["All", "Crops", "Pests", "Irrigation", "Soil", "Market"];
const FEED_PAGE_SIZE = 30;
const ADS_PAGE_SIZE = 12;
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BOTTOM_NAV_HEIGHT = 70;
const HEADER_HEIGHT = 100;
const SEARCH_HEIGHT = 52;
const TABS_HEIGHT = 44;
const FIXED_HEADER_TOTAL = HEADER_HEIGHT + SEARCH_HEIGHT + TABS_HEIGHT + 20;

// -----------------------------------------------------------------------------
// Auth Prompt Modal (inline)
// -----------------------------------------------------------------------------
interface AuthPromptModalProps {
  visible: boolean;
  onClose: () => void;
  featureName: string;
}
const AuthPromptModal: React.FC<AuthPromptModalProps> = ({
  visible,
  onClose,
  featureName,
}) => {
  const router = useRouter();
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.authModalContainer}>
          <View style={styles.authModalIcon}>
            <Ionicons name="leaf-outline" size={48} color="#22c55e" />
          </View>
          <Text style={styles.authModalTitle}>Join FarmLink Community</Text>
          <Text style={styles.authModalDescription}>
            Create an account to {featureName} and connect with farmers,
            experts, and agribusinesses.
          </Text>
          <View style={styles.authModalButtons}>
            <TouchableOpacity
              style={[styles.authModalBtn, styles.authModalSignupBtn]}
              onPress={() => {
                onClose();
                router.push("/signup");
              }}
            >
              <Text style={styles.authModalSignupText}>Create account</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.authModalBtn, styles.authModalLoginBtn]}
              onPress={() => {
                onClose();
                router.push("/login");
              }}
            >
              <Text style={styles.authModalLoginText}>Log in</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.authModalCancel}>
              <Text style={styles.authModalCancelText}>Maybe later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// -----------------------------------------------------------------------------
// Full Screen Media Viewer
// -----------------------------------------------------------------------------
interface MediaViewerProps {
  visible: boolean;
  mediaItems: MediaItem[];
  initialIndex: number;
  onClose: () => void;
}
const MediaViewer: React.FC<MediaViewerProps> = ({
  visible,
  mediaItems,
  initialIndex,
  onClose,
}) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const videoRef = useRef<Video>(null);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, visible]);

  if (!visible) return null;

  const currentItem = mediaItems[currentIndex];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.mediaViewerContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <SafeAreaView style={styles.mediaViewerHeader}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.mediaViewerCloseBtn}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.mediaViewerCounter}>
            {currentIndex + 1} / {mediaItems.length}
          </Text>
          <View style={{ width: 40 }} />
        </SafeAreaView>

        <View style={styles.mediaViewerContent}>
          {currentItem.type === "video" ? (
            <View style={styles.mediaViewerVideoWrap}>
              <Video
                ref={videoRef}
                source={{ uri: currentItem.url }}
                style={{ width: screenWidth, height: screenHeight * 0.7 }}
                resizeMode={ResizeMode.CONTAIN}
                useNativeControls
                shouldPlay
                isLooping
              />
            </View>
          ) : (
            <Image
              source={{ uri: currentItem.url }}
              style={{ width: screenWidth, height: screenHeight * 0.7 }}
              resizeMode="contain"
            />
          )}
        </View>

        {mediaItems.length > 1 && (
          <View style={styles.mediaViewerDots}>
            {mediaItems.map((_, i) => (
              <TouchableOpacity key={i} onPress={() => setCurrentIndex(i)}>
                <View
                  style={[
                    styles.mediaViewerDot,
                    i === currentIndex && styles.mediaViewerDotActive,
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {mediaItems.length > 1 && (
          <View style={styles.mediaViewerNav}>
            <TouchableOpacity
              style={[
                styles.mediaViewerArrow,
                currentIndex === 0 && styles.mediaViewerArrowDisabled,
              ]}
              onPress={() =>
                currentIndex > 0 && setCurrentIndex(currentIndex - 1)
              }
              disabled={currentIndex === 0}
            >
              <Ionicons
                name="chevron-back"
                size={32}
                color={currentIndex === 0 ? "#555" : "#fff"}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.mediaViewerArrow,
                currentIndex >= mediaItems.length - 1 &&
                  styles.mediaViewerArrowDisabled,
              ]}
              onPress={() =>
                currentIndex < mediaItems.length - 1 &&
                setCurrentIndex(currentIndex + 1)
              }
              disabled={currentIndex >= mediaItems.length - 1}
            >
              <Ionicons
                name="chevron-forward"
                size={32}
                color={currentIndex >= mediaItems.length - 1 ? "#555" : "#fff"}
              />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
};

// -----------------------------------------------------------------------------
// Reply Item
// -----------------------------------------------------------------------------
interface ReplyItemProps {
  reply: Reply;
  onLike: (replyId: string, parentCommentId: string) => void;
  parentCommentId: string;
  currentUserId?: string;
}
const ReplyItem: React.FC<ReplyItemProps> = ({
  reply,
  onLike,
  parentCommentId,
}) => (
  <Animated.View entering={FadeInDown.duration(200)} style={styles.replyItem}>
    <View style={styles.replyAvatarWrap}>
      <Text style={styles.replyAvatarText}>{reply.avatar}</Text>
    </View>
    <View style={styles.replyBubble}>
      <Text style={styles.replyUsername}>@{reply.username}</Text>
      <Text style={styles.replyText}>{reply.comment}</Text>
      <View style={[styles.replyMeta, { justifyContent: "flex-start" }]}>
        <TouchableOpacity
          style={styles.replyLikeBtn}
          onPress={() => onLike(reply.id, parentCommentId)}
        >
          <Ionicons
            name={reply.likedByUser ? "heart" : "heart-outline"}
            size={13}
            color={reply.likedByUser ? "#ef4444" : "#9ca3af"}
          />
          {reply.likes > 0 && (
            <Text
              style={[
                styles.replyLikeCount,
                reply.likedByUser && { color: "#ef4444" },
              ]}
            >
              {reply.likes}
            </Text>
          )}
        </TouchableOpacity>
        <Text style={styles.replyDate}>{reply.postedDate}</Text>
      </View>
    </View>
  </Animated.View>
);

// -----------------------------------------------------------------------------
// Comment Item
// -----------------------------------------------------------------------------
interface CommentItemProps {
  comment: Comment;
  onLike: (
    commentId: string,
    isReply: boolean,
    parentCommentId?: string,
  ) => void;
  onReply: (commentId: string, username: string) => void;
  currentUserId?: string;
  onDelete: (commentId: string) => void;
}
const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  onLike,
  onReply,
  currentUserId,
  onDelete,
}) => {
  const [showReplies, setShowReplies] = useState(false);
  const isOwn = currentUserId === comment.userId;
  return (
    <Animated.View
      entering={FadeInDown.duration(250)}
      style={styles.commentItem}
    >
      <View style={styles.commentAvatarWrap}>
        <Text style={styles.commentAvatarText}>{comment.avatar}</Text>
      </View>
      <View style={styles.commentBody}>
        <View style={styles.commentBubble}>
          <Text style={styles.commentUsername}>@{comment.username}</Text>
          <Text style={styles.commentText}>{comment.comment}</Text>
        </View>
        <View style={styles.commentActions}>
          <TouchableOpacity
            onPress={() => onLike(comment.id, false)}
            style={styles.commentLikeBtn}
          >
            <Ionicons
              name={comment.likedByUser ? "heart" : "heart-outline"}
              size={14}
              color={comment.likedByUser ? "#ef4444" : "#9ca3af"}
            />
            {comment.likes > 0 && (
              <Text
                style={[
                  styles.commentLikeCount,
                  comment.likedByUser && { color: "#ef4444" },
                ]}
              >
                {comment.likes}
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onReply(comment.id, comment.username)}
          >
            <Text style={styles.replyActionText}>Reply</Text>
          </TouchableOpacity>
          <Text style={styles.commentDate}>{comment.postedDate}</Text>
          {isOwn && (
            <TouchableOpacity onPress={() => onDelete(comment.id)}>
              <Ionicons name="trash-outline" size={14} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>
        {comment.replies.length > 0 && (
          <TouchableOpacity
            style={styles.showRepliesBtn}
            onPress={() => setShowReplies((v) => !v)}
          >
            <View style={styles.showRepliesLine} />
            <Text style={styles.showRepliesText}>
              {showReplies
                ? "Hide replies"
                : `View ${comment.replies.length} ${comment.replies.length === 1 ? "reply" : "replies"}`}
            </Text>
          </TouchableOpacity>
        )}
        {showReplies &&
          comment.replies.map((reply) => (
            <ReplyItem
              key={reply.id}
              reply={reply}
              onLike={(replyId, parentId) => onLike(replyId, true, parentId)}
              parentCommentId={comment.id}
              currentUserId={currentUserId}
            />
          ))}
      </View>
    </Animated.View>
  );
};

// -----------------------------------------------------------------------------
// Comment Screen
// -----------------------------------------------------------------------------
interface CommentScreenProps {
  post: Discussion;
  visible: boolean;
  onClose: () => void;
  currentUserId?: string;
  onCommentLike: (
    commentId: string,
    isReply: boolean,
    parentCommentId?: string,
  ) => void;
  onCommentDelete: (commentId: string) => void;
  onCommentSubmit: (
    text: string,
    replyingTo: { commentId: string; username: string } | null,
  ) => Promise<void>;
}
const CommentScreen: React.FC<CommentScreenProps> = ({
  post,
  visible,
  onClose,
  currentUserId,
  onCommentLike,
  onCommentDelete,
  onCommentSubmit,
}) => {
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<{
    commentId: string;
    username: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const router = useRouter();

  const handleReply = (commentId: string, username: string) => {
    setReplyingTo({ commentId, username });
    setCommentText(`@${username} `);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleSubmit = async () => {
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);
    await onCommentSubmit(commentText.trim(), replyingTo);
    setCommentText("");
    setReplyingTo(null);
    setSubmitting(false);
  };

  const renderMentions = (text: string) => {
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        const username = part.slice(1);
        return (
          <Text
            key={i}
            style={styles.mentionLink}
            onPress={() =>
              router.push({
                pathname: "/profile/[username]",
                params: { username },
              } as any)
            }
          >
            {part}
          </Text>
        );
      }
      return <Text key={i}>{part}</Text>;
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={styles.commentScreen}
        edges={["top", "left", "right"]}
      >
        <View style={styles.commentScreenHeader}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.commentScreenTitle}>Comments</Text>
          <View style={{ width: 40 }} />
        </View>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
          <View style={styles.postSummary}>
            <View style={styles.postSummaryAuthor}>
              <Text style={styles.postSummaryAvatar}>{post.avatar}</Text>
              <View>
                <Text style={styles.postSummaryName}>{post.author}</Text>
                <Text style={styles.postSummaryTime}>{post.timeAgo}</Text>
              </View>
            </View>
            <Text style={styles.postSummaryText} numberOfLines={3}>
              {renderMentions(post.preview)}
            </Text>
            <View style={styles.postSummaryDivider} />
            <View style={styles.postSummaryStats}>
              <View style={styles.postStatItem}>
                <Ionicons name="heart" size={14} color="#ef4444" />
                <Text style={styles.postStatText}>{post.likes} likes</Text>
              </View>
              <Text style={styles.postStatText}>{post.replies} comments</Text>
            </View>
          </View>

          <FlatList
            data={post.comments}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <CommentItem
                comment={item}
                onLike={onCommentLike}
                onReply={handleReply}
                currentUserId={currentUserId}
                onDelete={onCommentDelete}
              />
            )}
            contentContainerStyle={styles.commentsListContent}
            ListEmptyComponent={
              <View style={styles.emptyComments}>
                <Ionicons
                  name="chatbubbles-outline"
                  size={52}
                  color="#d1d5db"
                />
                <Text style={styles.emptyCommentsTitle}>No comments yet</Text>
                <Text style={styles.emptyCommentsSub}>
                  Start the conversation below
                </Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="interactive"
          />

          <View style={styles.inputBar}>
            {replyingTo && (
              <View style={styles.replyingBanner}>
                <Ionicons
                  name="return-down-forward"
                  size={14}
                  color="#22c55e"
                />
                <Text style={styles.replyingBannerText}>
                  Replying to @{replyingTo.username}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setReplyingTo(null);
                    setCommentText("");
                  }}
                  style={styles.replyingCancelBtn}
                >
                  <Ionicons name="close-circle" size={18} color="#9ca3af" />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.inputRow}>
              <View style={styles.inputAvatar}>
                <Text style={styles.inputAvatarText}>🌱</Text>
              </View>
              <View style={styles.inputWrapper}>
                <TextInput
                  ref={inputRef}
                  style={styles.textInput}
                  placeholder={
                    replyingTo
                      ? `Reply to @${replyingTo.username}...`
                      : "Write a comment..."
                  }
                  placeholderTextColor="#9ca3af"
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                  maxLength={500}
                  returnKeyType="default"
                />
              </View>
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  commentText.trim() && !submitting
                    ? styles.sendBtnActive
                    : styles.sendBtnDisabled,
                ]}
                onPress={handleSubmit}
                disabled={!commentText.trim() || submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons
                    name="send"
                    size={16}
                    color={commentText.trim() ? "#fff" : "#9ca3af"}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

// -----------------------------------------------------------------------------
// Create Post Modal
// -----------------------------------------------------------------------------
const POST_CATEGORIES = [
  { id: "Crops", label: "Crops", color: "#22c55e" },
  { id: "Pests", label: "Pests & Disease", color: "#ef4444" },
  { id: "Irrigation", label: "Irrigation", color: "#3b82f6" },
  { id: "Soil", label: "Soil & Fertilizers", color: "#d97706" },
  { id: "Market", label: "Market & Prices", color: "#a855f7" },
];
const MAX_MEDIA = 5;
const MAX_CHARS = 500;
interface PostMediaItem {
  uri: string;
  type: "image" | "video";
}
interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  onPosted: () => void;
  userId: string;
}
const CreatePostModal: React.FC<CreatePostModalProps> = ({
  visible,
  onClose,
  onPosted,
  userId,
}) => {
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [location, setLocation] = useState("");
  const [mediaItems, setMediaItems] = useState<PostMediaItem[]>([]);
  const [mediaTypeLocked, setMediaTypeLocked] = useState<
    "image" | "video" | null
  >(null);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const isValid = description.trim().length >= 10 && selectedCategory !== null;

  const reset = () => {
    setDescription("");
    setSelectedCategory(null);
    setLocation("");
    setMediaItems([]);
    setMediaTypeLocked(null);
    setSubmitting(false);
    setShowSuccess(false);
  };
  const handleClose = () => {
    reset();
    onClose();
  };

  const uploadFile = async (
    uri: string,
    type: "image" | "video",
  ): Promise<string> => {
    const response = await fetch(uri);
    if (!response.ok) throw new Error("Failed to read file for upload");
    const blob = await response.blob();

    const fileExtCandidate = uri.split(".").pop();
    const fileExt =
      fileExtCandidate &&
      fileExtCandidate.length <= 4 &&
      !fileExtCandidate.includes("/")
        ? fileExtCandidate
        : type === "image"
          ? "jpg"
          : "mp4";
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `posts/${userId}/${fileName}`;
    const { error } = await supabase.storage
      .from("farmlink")
      .upload(filePath, blob, {
        contentType: type === "image" ? "image/jpeg" : "video/mp4",
        cacheControl: "3600",
      });
    if (error) throw error;
    const { data: publicUrl } = supabase.storage
      .from("farmlink")
      .getPublicUrl(filePath);
    return publicUrl.publicUrl;
  };

  const handleSubmit = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    try {
      const mediaUrls: string[] = [];
      for (const item of mediaItems) {
        const url = await uploadFile(item.uri, item.type);
        mediaUrls.push(url);
      }
      await supabase.from("posts").insert({
        user_id: userId,
        preview: description.trim(),
        category: selectedCategory,
        media_urls: mediaUrls,
        media_type: mediaTypeLocked,
        created_at: new Date().toISOString(),
      });
      setShowSuccess(true);
      setTimeout(() => {
        reset();
        onClose();
        onPosted();
      }, 1500);
    } catch (err: any) {
      Alert.alert("Upload failed", err.message || "Could not upload media.");
    } finally {
      setSubmitting(false);
    }
  };

  const pickMedia = async (mediaType: "image" | "video") => {
    if (mediaItems.length >= MAX_MEDIA) {
      Alert.alert("Limit Reached", `Max ${MAX_MEDIA} items allowed`);
      return;
    }
    if (mediaTypeLocked && mediaTypeLocked !== mediaType) {
      Alert.alert(
        "Mixed media not allowed",
        "All attachments must be the same type.",
      );
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "Please allow media access");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:
        mediaType === "image"
          ? ImagePicker.MediaTypeOptions.Images
          : ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 0.8,
      videoMaxDuration: 60,
    });
    if (!result.canceled && result.assets[0]) {
      setMediaItems((prev) => [
        ...prev,
        { uri: result.assets[0].uri, type: mediaType },
      ]);
      if (!mediaTypeLocked) setMediaTypeLocked(mediaType);
    }
  };

  const removeMedia = (index: number) => {
    setMediaItems((prev) => {
      const newItems = prev.filter((_, i) => i !== index);
      if (newItems.length === 0) setMediaTypeLocked(null);
      return newItems;
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={cpStyles.screen} edges={["top", "left", "right"]}>
        <View style={cpStyles.header}>
          <TouchableOpacity onPress={handleClose} style={cpStyles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={cpStyles.headerTitle}>Create Post</Text>
          <TouchableOpacity
            style={[
              cpStyles.postBtn,
              (!isValid || submitting) && cpStyles.postBtnDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!isValid || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={cpStyles.postBtnText}>Post</Text>
            )}
          </TouchableOpacity>
        </View>

        {showSuccess ? (
          <View style={cpStyles.successContainer}>
            <Ionicons name="checkmark-circle" size={72} color="#22c55e" />
            <Text style={cpStyles.successTitle}>Posted!</Text>
            <Text style={cpStyles.successSub}>Your post is now live</Text>
          </View>
        ) : (
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <ScrollView
              style={cpStyles.scroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={cpStyles.section}>
                <TextInput
                  style={cpStyles.descInput}
                  placeholder="What's on your mind? Share a question, tip, or update..."
                  placeholderTextColor="#9ca3af"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  textAlignVertical="top"
                  maxLength={MAX_CHARS}
                  autoFocus
                />
                <Text
                  style={[
                    cpStyles.charCount,
                    description.trim().length < 10 &&
                      description.length > 0 &&
                      cpStyles.charCountWarn,
                  ]}
                >
                  {description.length}/{MAX_CHARS}
                  {description.trim().length < 10 && description.length > 0
                    ? " · minimum 10 characters"
                    : ""}
                </Text>
              </View>

              {mediaItems.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={cpStyles.mediaScroll}
                  contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
                >
                  {mediaItems.map((item, idx) => (
                    <View key={idx} style={cpStyles.mediaThumbnail}>
                      <Image
                        source={{ uri: item.uri }}
                        style={cpStyles.mediaImg}
                      />
                      {item.type === "video" && (
                        <View style={cpStyles.videoOverlay}>
                          <Ionicons name="play-circle" size={28} color="#fff" />
                        </View>
                      )}
                      <TouchableOpacity
                        style={cpStyles.removeMedia}
                        onPress={() => removeMedia(idx)}
                      >
                        <Ionicons name="close-circle" size={22} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}

              <View style={cpStyles.actionsBar}>
                <TouchableOpacity
                  style={cpStyles.actionItem}
                  onPress={() => pickMedia("image")}
                  disabled={
                    mediaItems.length >= MAX_MEDIA ||
                    !!(mediaTypeLocked && mediaTypeLocked !== "image")
                  }
                >
                  <View
                    style={[
                      cpStyles.actionIcon,
                      { backgroundColor: "#f0fdf4" },
                    ]}
                  >
                    <Ionicons name="image-outline" size={20} color="#22c55e" />
                  </View>
                  <Text style={cpStyles.actionItemText}>Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={cpStyles.actionItem}
                  onPress={() => pickMedia("video")}
                  disabled={
                    mediaItems.length >= MAX_MEDIA ||
                    !!(mediaTypeLocked && mediaTypeLocked !== "video")
                  }
                >
                  <View
                    style={[
                      cpStyles.actionIcon,
                      { backgroundColor: "#fef3c7" },
                    ]}
                  >
                    <Ionicons
                      name="videocam-outline"
                      size={20}
                      color="#d97706"
                    />
                  </View>
                  <Text style={cpStyles.actionItemText}>Video</Text>
                </TouchableOpacity>
                <View style={cpStyles.locationField}>
                  <Ionicons name="location-outline" size={16} color="#9ca3af" />
                  <TextInput
                    style={cpStyles.locationInput}
                    placeholder="Add location..."
                    placeholderTextColor="#9ca3af"
                    value={location}
                    onChangeText={setLocation}
                  />
                </View>
              </View>

              <View style={cpStyles.divider} />

              <View style={cpStyles.categorySection}>
                <Text style={cpStyles.categoryLabel}>
                  <Ionicons name="pricetag-outline" size={14} color="#374151" />{" "}
                  Category
                  {!selectedCategory && (
                    <Text style={cpStyles.required}> *</Text>
                  )}
                </Text>
                <View style={cpStyles.categoryGrid}>
                  {POST_CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        cpStyles.categoryChip,
                        selectedCategory === cat.id && {
                          backgroundColor: cat.color,
                          borderColor: cat.color,
                        },
                      ]}
                      onPress={() => setSelectedCategory(cat.id)}
                    >
                      <View
                        style={[
                          cpStyles.categoryDot,
                          {
                            backgroundColor:
                              selectedCategory === cat.id ? "#fff" : cat.color,
                          },
                        ]}
                      />
                      <Text
                        style={[
                          cpStyles.categoryChipText,
                          selectedCategory === cat.id && { color: "#fff" },
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={{ height: 40 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const cpStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#111827" },
  postBtn: {
    backgroundColor: "#22c55e",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  postBtnDisabled: { backgroundColor: "#d1d5db" },
  postBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  scroll: { flex: 1 },
  section: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  descInput: {
    fontSize: 16,
    color: "#111827",
    lineHeight: 24,
    minHeight: 120,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "right",
    marginTop: 6,
  },
  charCountWarn: { color: "#ef4444" },
  mediaScroll: { marginBottom: 8 },
  mediaThumbnail: {
    position: "relative",
    width: 90,
    height: 90,
    borderRadius: 12,
    overflow: "hidden",
  },
  mediaImg: { width: 90, height: 90 },
  videoOverlay: {
    ...StyleSheet.absoluteFill,
    opacity: 0.5,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  removeMedia: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 11,
  },
  actionsBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  actionItem: { alignItems: "center", gap: 4 },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  actionItemText: { fontSize: 11, color: "#6b7280", fontWeight: "500" },
  locationField: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f9fafb",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  locationInput: { flex: 1, fontSize: 13, color: "#374151" },
  divider: { height: 8, backgroundColor: "#f3f4f6", marginVertical: 4 },
  categorySection: { paddingHorizontal: 16, paddingVertical: 16 },
  categoryLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  required: { color: "#ef4444" },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f9fafb",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
  },
  categoryDot: { width: 8, height: 8, borderRadius: 4 },
  categoryChipText: { fontSize: 13, fontWeight: "500", color: "#4b5563" },
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  successTitle: { fontSize: 24, fontWeight: "700", color: "#111827" },
  successSub: { fontSize: 14, color: "#9ca3af" },
});

// -----------------------------------------------------------------------------
// Post Card (video auto-play & controls)
// -----------------------------------------------------------------------------
interface PostCardProps {
  post: Discussion;
  onLike: (id: string) => void;
  onComment: (id: string) => void;
  onOpenChat: (userId: string, name: string, avatar: string) => void;
  onReport: (postId: string) => void;
  onDelete: (postId: string) => void;
  onMediaPress: (mediaItems: MediaItem[], index: number) => void;
  videoRefs: React.MutableRefObject<Map<string, Video>>;
  visibleVideoId: string | null;
  renderMentions: (text: string) => React.ReactNode;
  index: number;
  currentUserId?: string;
}
const PostCard: React.FC<PostCardProps> = ({
  post,
  onLike,
  onComment,
  onOpenChat,
  onReport,
  onDelete,
  onMediaPress,
  videoRefs,
  visibleVideoId,
  renderMentions,
  index,
  currentUserId,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = screenWidth - 32;
  const mediaStyle = { width: cardWidth, height: cardWidth * 0.75 };

  const [mediaIndex, setMediaIndex] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const [muted, setMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const hideControlsTimeout = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const isMounted = useRef(true);

  const loadAndPlayVideo = useCallback(async () => {
    const video = videoRefs.current.get(post.id);
    if (!video) return;
    try {
      const status = await video.getStatusAsync();
      if (!status.isLoaded) {
        await video.loadAsync(
          { uri: post.media[0].url },
          { shouldPlay: true, isLooping: true, isMuted: muted },
        );
      } else {
        await video.playAsync();
      }
      setIsPlaying(true);
      setShowControls(true);
    } catch (e) {
      console.warn("Video load/play error:", e);
    }
  }, [post.id, post.media, muted, videoRefs]);

  useEffect(() => {
    if (visibleVideoId === post.id) {
      const timer = setTimeout(() => {
        loadAndPlayVideo();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      const video = videoRefs.current.get(post.id);
      if (video && typeof (video as any).stopAsync === "function") {
        (video as any).stopAsync().catch(() => {});
      }
      videoRefs.current.delete(post.id);
      setIsPlaying(false);
    }
  }, [visibleVideoId, post.id, loadAndPlayVideo, videoRefs]);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const toggleControls = () => {
    setShowControls((prev) => !prev);
    if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current);
    hideControlsTimeout.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  const handlePlayPause = async () => {
    const video = videoRefs.current.get(post.id);
    if (!video) return;
    try {
      const status = await video.getStatusAsync();
      if (status.isLoaded) {
        if (status.isPlaying) {
          await video.pauseAsync();
          setIsPlaying(false);
        } else {
          await video.playAsync();
          setIsPlaying(true);
        }
        setShowControls(true);
      }
    } catch (e: any) {
      console.warn("Video toggle error:", e);
    }
  };

  const handleMuteToggle = async () => {
    const video = videoRefs.current.get(post.id);
    if (!video) return;
    const newMuted = !muted;
    setMuted(newMuted);
    await video.setStatusAsync({ isMuted: newMuted });
  };

  const isAvatarUrl =
    post.avatar &&
    (post.avatar.startsWith("http") || post.avatar.startsWith("file"));

  return (
    <Animated.View entering={FadeIn.delay(index * 60)} style={styles.card}>
      <View style={styles.cardHeader}>
        <TouchableOpacity
          style={styles.authorRow}
          onPress={() => onOpenChat(post.authorId, post.author, post.avatar)}
          activeOpacity={0.7}
        >
          <View style={styles.authorAvatar}>
            {isAvatarUrl ? (
              <Image
                source={{ uri: post.avatar }}
                style={styles.authorAvatarImage}
              />
            ) : (
              <Text style={styles.authorAvatarText}>{post.avatar}</Text>
            )}
          </View>
          <View style={styles.authorInfo}>
            <View style={styles.authorNameRow}>
              <Text style={styles.authorName}>{post.author}</Text>
              {post.isOfficial && (
                <View style={styles.officialBadge}>
                  <Ionicons name="checkmark-circle" size={12} color="#fff" />
                  <Text style={styles.officialText}>Official</Text>
                </View>
              )}
            </View>
            <Text style={styles.authorTime}>{post.timeAgo}</Text>
          </View>
        </TouchableOpacity>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TouchableOpacity
            onPress={() => onReport(post.id)}
            style={styles.iconBtn}
          >
            <Ionicons name="flag-outline" size={16} color="#9ca3af" />
          </TouchableOpacity>
          {currentUserId === post.authorId && (
            <TouchableOpacity
              onPress={() => onDelete(post.id)}
              style={styles.iconBtn}
            >
              <Ionicons name="trash-outline" size={16} color="#ef4444" />
            </TouchableOpacity>
          )}
          <View style={styles.categoryPill}>
            <Text style={styles.categoryPillText}>{post.category}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.cardText}>{renderMentions(post.preview)}</Text>

      {post.media.length > 0 && (
        <View style={styles.mediaContainer}>
          <FlatList
            data={post.media}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => `${post.id}_m_${i}`}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / cardWidth);
              setMediaIndex(idx);
            }}
            renderItem={({ item, index: mi }) => {
              if (item.type === "video") {
                return (
                  <TouchableOpacity
                    activeOpacity={1}
                    onPress={toggleControls}
                    onLongPress={() => onMediaPress(post.media, mi)}
                    style={[styles.mediaItem, mediaStyle]}
                  >
                    <View style={styles.videoWrapper}>
                      <Video
                        ref={(ref) => {
                          if (ref && isMounted.current) {
                            videoRefs.current.set(post.id, ref);
                          }
                        }}
                        source={{ uri: item.url }}
                        style={styles.mediaVideo}
                        resizeMode={ResizeMode.COVER}
                        shouldPlay={false}
                        isLooping
                        useNativeControls={false}
                        volume={1}
                        isMuted={muted}
                        onPlaybackStatusUpdate={(status) => {
                          if (status.isLoaded) {
                            setIsPlaying(status.isPlaying);
                            if (status.didJustFinish) {
                              videoRefs.current.get(post.id)?.setStatusAsync({
                                shouldPlay: false,
                                positionMillis: 0,
                              });
                            }
                          }
                        }}
                      />
                    </View>
                    <View style={styles.videoControlsOverlay}>
                      <TouchableOpacity
                        style={styles.playPauseButton}
                        onPress={handlePlayPause}
                      >
                        <Ionicons
                          name={isPlaying ? "pause" : "play"}
                          size={40}
                          color="#fff"
                        />
                      </TouchableOpacity>
                    </View>
                    {showControls && (
                      <View style={styles.videoControlBar}>
                        <TouchableOpacity
                          style={styles.muteButton}
                          onPress={handleMuteToggle}
                        >
                          <Ionicons
                            name={muted ? "volume-mute" : "volume-high"}
                            size={22}
                            color="#fff"
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.fullscreenButton}
                          onPress={() => onMediaPress(post.media, mi)}
                        >
                          <Ionicons name="expand" size={20} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }
              return (
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={() => onMediaPress(post.media, mi)}
                  style={[styles.mediaItem, mediaStyle]}
                >
                  <Image
                    source={{ uri: item.url }}
                    style={styles.mediaImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              );
            }}
            snapToInterval={cardWidth}
            decelerationRate="fast"
          />
          {post.media.length > 1 && (
            <View style={styles.mediaDots}>
              {post.media.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.mediaDot,
                    i === mediaIndex && styles.mediaDotActive,
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      )}

      <View style={styles.reactionSummary}>
        <View style={styles.reactionItem}>
          {post.likes > 0 && (
            <>
              <View style={styles.reactionIconBg}>
                <Ionicons name="heart" size={10} color="#fff" />
              </View>
              <Text style={styles.reactionCount}>{post.likes}</Text>
            </>
          )}
        </View>
        <Text style={styles.reactionComments}>
          {post.replies > 0
            ? `${post.replies} ${post.replies === 1 ? "comment" : "comments"}`
            : ""}
        </Text>
      </View>

      <View style={styles.actionDivider} />
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => onLike(post.id)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={post.likedByUser ? "heart" : "heart-outline"}
            size={20}
            color={post.likedByUser ? "#ef4444" : "#6b7280"}
          />
          <Text
            style={[
              styles.actionBtnText,
              post.likedByUser && styles.actionBtnTextActive,
            ]}
          >
            Like
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => onComment(post.id)}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubble-outline" size={20} color="#6b7280" />
          <Text style={styles.actionBtnText}>Comment</Text>
        </TouchableOpacity>
      </View>

      {post.comments.length > 0 && (
        <TouchableOpacity
          style={styles.latestComment}
          onPress={() => onComment(post.id)}
          activeOpacity={0.7}
        >
          <View style={styles.latestCommentAvatar}>
            <Text style={{ fontSize: 12 }}>{post.comments[0].avatar}</Text>
          </View>
          <View style={styles.latestCommentBubble}>
            <Text style={styles.latestCommentUsername}>
              {post.comments[0].username}
            </Text>
            <Text style={styles.latestCommentText} numberOfLines={2}>
              {post.comments[0].comment}
            </Text>
          </View>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

// -----------------------------------------------------------------------------
// Main Community Content
// -----------------------------------------------------------------------------
const CommunityPageContent = () => {
  const { user } = useAuth();
  const router = useRouter();
  const { openChatId } = useLocalSearchParams<{ openChatId?: string }>();

  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [posts, setPosts] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleVideoId, setVisibleVideoId] = useState<string | null>(null);
  const videoRefs = useRef<Map<string, Video>>(new Map());

  const [commentModalPost, setCommentModalPost] = useState<Discussion | null>(
    null,
  );
  const [showChatList, setShowChatList] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { createChat } = useChat();

  const [ads, setAds] = useState<any[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const [reportPostId, setReportPostId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [showBugReport, setShowBugReport] = useState(false);
  const [bugDescription, setBugDescription] = useState("");
  const [submittingBug, setSubmittingBug] = useState(false);

  const [mediaViewerVisible, setMediaViewerVisible] = useState(false);
  const [mediaViewerItems, setMediaViewerItems] = useState<MediaItem[]>([]);
  const [mediaViewerIndex, setMediaViewerIndex] = useState(0);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingAction, setPendingAction] = useState("");

  const requireAuth = useCallback(
    (action?: string) => {
      if (!user) {
        setPendingAction(action || "interact with the community");
        setShowAuthModal(true);
        return false;
      }
      return true;
    },
    [user],
  );

  useEffect(() => {
    const chatId = Array.isArray(openChatId) ? openChatId[0] : openChatId;
    if (!chatId || !user) return;
    setActiveChatId(chatId);
    setShowChatList(false);
  }, [openChatId, user]);

  const channelRef = useRef<any>(null);
  const notifChannelRef = useRef<any>(null);

  const fetchUnreadCounts = useCallback(async () => {
    if (!user) return;

    const [{ data: chatsData }, { count: notifCount }] = await Promise.all([
      supabase
        .from("chats")
        .select("id")
        .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`),
      supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false),
    ]);

    if (chatsData) {
      const chatIds = chatsData.map((c) => c.id);
      if (chatIds.length > 0) {
        const { count: msgCount } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .in("chat_id", chatIds)
          .eq("is_read", false)
          .neq("sender_id", user.id);
        setUnreadMessages(msgCount || 0);
      }
    }
    setUnreadNotifications(notifCount || 0);
  }, [user]);

  useEffect(() => {
    if (!user) return;

    fetchUnreadCounts();

    if (!channelRef.current) {
      const channel = supabase
        .channel(`messages-counts-${user.id}-${Date.now()}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          () => {
            fetchUnreadCounts();
          },
        )
        .subscribe();
      channelRef.current = channel;
    }

    if (!notifChannelRef.current) {
      const notifChannel = supabase
        .channel(`notifications-counts-${user.id}-${Date.now()}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications" },
          () => {
            fetchUnreadCounts();
          },
        )
        .subscribe();
      notifChannelRef.current = notifChannel;
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (notifChannelRef.current) {
        supabase.removeChannel(notifChannelRef.current);
        notifChannelRef.current = null;
      }
    };
  }, [user, fetchUnreadCounts]);

  const fetchPromotedProducts = useCallback(async () => {
    const planPriority: { [key: string]: number } = {
      Premium: 3,
      Growth: 2,
      Basic: 1,
      "Pay-Per-Post": 0,
    };

    const { data: ads } = await supabase
      .from("marketplace_ads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(ADS_PAGE_SIZE);
    if (!ads || ads.length === 0) {
      setAds([]);
      return;
    }

    const userIds = [...new Set(ads.map((ad) => ad.user_id).filter(Boolean))];
    let userMap: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from("users")
        .select("user_id, username, avatar")
        .in("user_id", userIds);
      (users || []).forEach((u) => {
        userMap[u.user_id] = u;
      });
    }

    const adsWithSeller = ads.map((ad) => ({
      ...ad,
      seller: userMap[ad.user_id] || { username: "Unknown", avatar: "🌾" },
    }));

    const sorted = adsWithSeller.sort((a, b) => {
      const priorityA = planPriority[a.plan_name] || 0;
      const priorityB = planPriority[b.plan_name] || 0;
      if (priorityB !== priorityA) return priorityB - priorityA;
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });

    setAds(sorted);
  }, []);

  useEffect(() => {
    fetchPromotedProducts();
  }, [fetchPromotedProducts]);

  const AdCard = ({ ad }: { ad: any }) => {
    const sellerUsername = ad.seller?.username || "Seller";
    const sellerAvatar = ad.seller?.avatar || "🌾";
    const isSellerAvatarUrl =
      sellerAvatar &&
      (sellerAvatar.startsWith("http") || sellerAvatar.startsWith("file"));
    return (
      <View style={styles.adCard}>
        <View style={styles.adBadge}>
          <Text style={styles.adBadgeText}>AD</Text>
        </View>
        <Image
          source={{ uri: ad.images?.[0] || "https://via.placeholder.com/300" }}
          style={styles.adImage}
          resizeMode="cover"
        />
        <View style={styles.adContent}>
          <Text style={styles.adProductName}>{ad.product_name}</Text>
          <Text style={styles.adDescription} numberOfLines={2}>
            {ad.description}
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              marginBottom: 8,
            }}
          >
            {isSellerAvatarUrl ? (
              <Image
                source={{ uri: sellerAvatar }}
                style={{ width: 20, height: 20, borderRadius: 10 }}
              />
            ) : (
              <Text style={{ fontSize: 16 }}>{sellerAvatar}</Text>
            )}
            <Text style={styles.adSeller}>by @{sellerUsername}</Text>
          </View>
          <View style={styles.adFooter}>
            <Text style={styles.adPrice}>R{ad.price}</Text>
            <TouchableOpacity
              style={styles.adCtaButton}
              onPress={() => {
                if (!requireAuth("contact this seller")) return;
                openChatWithUser(
                  ad.user_id,
                  sellerUsername,
                  sellerAvatar,
                  `Hello ${sellerUsername}, is this deal still available? I'm interested in buying.`,
                );
              }}
            >
              <Text style={styles.adCtaText}>View Deal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const bgScale = useSharedValue(1);
  const bgScale2 = useSharedValue(1.2);
  useEffect(() => {
    bgScale.value = withRepeat(withTiming(1.15, { duration: 8000 }), -1, true);
    bgScale2.value = withRepeat(withTiming(1, { duration: 10000 }), -1, true);
  }, [bgScale, bgScale2]);
  const bgBlob1Style = useAnimatedStyle(() => ({
    transform: [{ scale: bgScale.value }],
    opacity: 0.35,
  }));
  const bgBlob2Style = useAnimatedStyle(() => ({
    transform: [{ scale: bgScale2.value }],
    opacity: 0.25,
  }));

  const renderMentions = useCallback(
    (text: string) => {
      const parts = text.split(/(@\w+)/g);
      return parts.map((part, i) => {
        if (part.startsWith("@")) {
          const username = part.slice(1);
          return (
            <Text
              key={i}
              style={styles.mentionLink}
              onPress={() => {
                if (!requireAuth("view this profile")) return;
                router.push({
                  pathname: "/profile/[username]",
                  params: { username },
                } as any);
              }}
            >
              {part}
            </Text>
          );
        }
        return <Text key={i}>{part}</Text>;
      });
    },
    [router, requireAuth],
  );

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("posts")
        .select(
          "id, user_id, preview, category, created_at, comments_count, likes_count, is_official, media_urls, media_type",
        )
        .order("created_at", { ascending: false })
        .limit(FEED_PAGE_SIZE);
      if (activeCategory !== "All")
        query = query.eq("category", activeCategory);
      const { data: postsData, error } = await query;
      if (error) throw error;
      if (!postsData || postsData.length === 0) {
        setPosts([]);
        setLoading(false);
        return;
      }

      const userIds = [
        ...new Set(postsData.map((p) => p.user_id).filter(Boolean)),
      ];
      let userMap: Record<string, { username: string; avatar: string }> = {};
      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from("users")
          .select("user_id, username, avatar")
          .in("user_id", userIds);
        if (usersData) {
          userMap = Object.fromEntries(
            usersData.map((u) => [
              u.user_id,
              { username: u.username, avatar: u.avatar || "🌾" },
            ]),
          );
        }
      }

      let likedPostIds = new Set<string>();
      if (user) {
        const { data: likesData } = await supabase
          .from("post_likes")
          .select("post_id")
          .eq("user_id", user.id);
        if (likesData) likedPostIds = new Set(likesData.map((l) => l.post_id));
      }

      const mapped: Discussion[] = postsData.map((row) => {
        const userInfo = userMap[row.user_id] || {
          username: "Farmer",
          avatar: "🌾",
        };
        let media: MediaItem[] = [];
        if (Array.isArray(row.media_urls) && row.media_urls.length > 0) {
          media = row.media_urls
            .filter((url: string) => url && !url.includes("your-storage-url"))
            .map((url: string) => ({
              url:
                Platform.OS === "web" ? `${url}?bypass_sw=${Date.now()}` : url,
              type: row.media_type === "video" ? "video" : "image",
            }));
        }
        return {
          id: String(row.id),
          avatar: userInfo.avatar,
          author: userInfo.username,
          authorId: row.user_id,
          timeAgo: formatPostTime(row.created_at),
          trending: false,
          preview: row.preview ?? "",
          category: row.category ?? "General",
          replies: row.comments_count ?? 0,
          likes: row.likes_count ?? 0,
          media,
          likedByUser: likedPostIds.has(row.id),
          isOfficial: row.is_official ?? false,
          comments: [],
        };
      });
      setPosts(mapped);
    } catch (err: any) {
      if (err.name === "AbortError" || err.message?.includes("AbortError"))
        return;
      console.error("Failed to fetch posts", err);
      Alert.alert("Error", "Could not load posts");
    } finally {
      setLoading(false);
    }
  }, [activeCategory, user]);

  useEffect(() => {
    fetchPosts();
  }, [activeCategory, fetchPosts]);

  const combinedFeed = useMemo(() => {
    const feed: any[] = [];
    let adIndex = 0;
    posts.forEach((post, index) => {
      feed.push(post);
      if ((index + 1) % 3 === 0 && adIndex < ads.length) {
        feed.push({ type: "ad", data: ads[adIndex] });
        adIndex++;
      }
    });
    return feed;
  }, [posts, ads]);

  const fetchComments = useCallback(
    async (postId: string): Promise<Comment[]> => {
      try {
        const { data, error } = await supabase
          .from("comments")
          .select(
            `id, user_id, content, created_at, likes_count,
          replies:comments!parent_comment_id(id, user_id, content, created_at, likes_count)`,
          )
          .eq("post_id", postId)
          .is("parent_comment_id", null)
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (!data || data.length === 0) return [];

        const allUserIds = new Set<string>();
        data.forEach((c: any) => {
          if (c.user_id) allUserIds.add(c.user_id);
          (c.replies ?? []).forEach((r: any) => {
            if (r.user_id) allUserIds.add(r.user_id);
          });
        });
        let userMap: Record<string, string> = {};
        if (allUserIds.size > 0) {
          const { data: usersData } = await supabase
            .from("users")
            .select("user_id, username")
            .in("user_id", [...allUserIds]);
          if (usersData)
            userMap = Object.fromEntries(
              usersData.map((u) => [u.user_id, u.username]),
            );
        }
        const allCommentIds: string[] = [];
        data.forEach((c: any) => {
          allCommentIds.push(c.id);
          (c.replies ?? []).forEach((r: any) => allCommentIds.push(r.id));
        });
        let likedCommentIds = new Set<string>();
        if (user && allCommentIds.length > 0) {
          const { data: likesData } = await supabase
            .from("comment_likes")
            .select("comment_id")
            .eq("user_id", user.id)
            .in("comment_id", allCommentIds);
          if (likesData)
            likedCommentIds = new Set(likesData.map((l) => l.comment_id));
        }

        return data.map((c: any) => ({
          id: String(c.id),
          username: userMap[c.user_id] ?? "Farmer",
          avatar: "🌾",
          comment: c.content,
          postedDate: formatPostTime(c.created_at),
          likes: c.likes_count ?? 0,
          likedByUser: likedCommentIds.has(c.id),
          userId: c.user_id,
          replies: (c.replies ?? []).map((r: any) => ({
            id: String(r.id),
            username: userMap[r.user_id] ?? "Farmer",
            avatar: "🌾",
            comment: r.content,
            postedDate: formatPostTime(r.created_at),
            likes: r.likes_count ?? 0,
            likedByUser: likedCommentIds.has(r.id),
            userId: r.user_id,
          })),
        }));
      } catch (err) {
        console.error("fetchComments error", err);
        return [];
      }
    },
    [user],
  );

  const handleComment = useCallback(
    async (postId: string) => {
      if (!requireAuth("comment")) return;
      const comments = await fetchComments(postId);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, comments } : p)),
      );
      const post = posts.find((p) => p.id === postId);
      if (post) setCommentModalPost({ ...post, comments });
    },
    [fetchComments, posts, requireAuth],
  );

  const handleLike = useCallback(
    async (id: string) => {
      if (!requireAuth("like posts")) return;
      const post = posts.find((p) => p.id === id);
      if (!post) return;
      setPosts((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                likes: p.likedByUser ? p.likes - 1 : p.likes + 1,
                likedByUser: !p.likedByUser,
              }
            : p,
        ),
      );
      if (commentModalPost?.id === id) {
        setCommentModalPost((prev) =>
          prev
            ? {
                ...prev,
                likes: prev.likedByUser ? prev.likes - 1 : prev.likes + 1,
                likedByUser: !prev.likedByUser,
              }
            : prev,
        );
      }
      try {
        if (post.likedByUser) {
          await supabase
            .from("post_likes")
            .delete()
            .eq("post_id", id)
            .eq("user_id", user!.id);
          await supabase.rpc("decrement_post_likes", { post_id: id });
        } else {
          await supabase
            .from("post_likes")
            .insert({ post_id: id, user_id: user!.id });
          await supabase.rpc("increment_post_likes", { post_id: id });
        }
      } catch {
        Alert.alert("Error", "Failed to like post");
      }
    },
    [user, posts, commentModalPost, requireAuth],
  );

  const handleCommentLike = useCallback(
    async (commentId: string, isReply: boolean, parentCommentId?: string) => {
      if (!requireAuth("like comments") || !commentModalPost) return;
      const updateComments = (comments: Comment[]): Comment[] =>
        comments.map((c) => {
          if (isReply && c.id === parentCommentId) {
            return {
              ...c,
              replies: c.replies.map((r) =>
                r.id === commentId
                  ? {
                      ...r,
                      likes: r.likedByUser ? r.likes - 1 : r.likes + 1,
                      likedByUser: !r.likedByUser,
                    }
                  : r,
              ),
            };
          }
          if (!isReply && c.id === commentId) {
            return {
              ...c,
              likes: c.likedByUser ? c.likes - 1 : c.likes + 1,
              likedByUser: !c.likedByUser,
            };
          }
          return c;
        });
      setCommentModalPost((prev) =>
        prev ? { ...prev, comments: updateComments(prev.comments) } : prev,
      );
      setPosts((prev) =>
        prev.map((p) =>
          p.id === commentModalPost.id
            ? { ...p, comments: updateComments(p.comments) }
            : p,
        ),
      );
      try {
        const { data: existing } = await supabase
          .from("comment_likes")
          .select("id")
          .eq("comment_id", commentId)
          .eq("user_id", user!.id)
          .maybeSingle();
        if (existing) {
          await supabase.from("comment_likes").delete().eq("id", existing.id);
        } else {
          await supabase
            .from("comment_likes")
            .insert({ comment_id: commentId, user_id: user!.id });
        }
      } catch {
        Alert.alert("Error", "Could not like comment");
      }
    },
    [user, commentModalPost, requireAuth],
  );

  const handleCommentDelete = useCallback(
    async (commentId: string) => {
      if (!requireAuth("delete comments") || !commentModalPost) return;
      try {
        await supabase
          .from("comments")
          .delete()
          .eq("id", commentId)
          .eq("user_id", user!.id);
        const newComments = await fetchComments(commentModalPost.id);
        setCommentModalPost((prev) =>
          prev
            ? { ...prev, comments: newComments, replies: newComments.length }
            : prev,
        );
        setPosts((prev) =>
          prev.map((p) =>
            p.id === commentModalPost.id
              ? { ...p, comments: newComments, replies: newComments.length }
              : p,
          ),
        );
      } catch {
        Alert.alert("Error", "Could not delete comment");
      }
    },
    [user, commentModalPost, fetchComments, requireAuth],
  );

  const handleCommentSubmit = useCallback(
    async (
      text: string,
      replyingTo: { commentId: string; username: string } | null,
    ) => {
      if (!requireAuth("post comments") || !commentModalPost) return;
      try {
        const { data, error } = await supabase
          .from("comments")
          .insert({
            post_id: commentModalPost.id,
            user_id: user!.id,
            content: text,
            parent_comment_id: replyingTo?.commentId ?? null,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (error) throw error;
        await processMentions(text, user!.id, commentModalPost.id, data.id);
        await supabase.rpc("increment_post_replies", {
          post_id: commentModalPost.id,
        });
        const newComments = await fetchComments(commentModalPost.id);
        setCommentModalPost((prev) =>
          prev
            ? { ...prev, comments: newComments, replies: newComments.length }
            : prev,
        );
        setPosts((prev) =>
          prev.map((p) =>
            p.id === commentModalPost.id
              ? { ...p, comments: newComments, replies: newComments.length }
              : p,
          ),
        );
      } catch {
        Alert.alert("Error", "Failed to post comment");
      }
    },
    [user, commentModalPost, fetchComments, requireAuth],
  );

  const handleDeletePost = async (postId: string) => {
    if (!requireAuth("delete posts")) return;
    Alert.alert(
      "Delete post",
      "Are you sure you want to delete this post? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("posts")
                .delete()
                .eq("id", postId);
              if (error) throw error;
              setPosts((prev) => prev.filter((p) => p.id !== postId));
            } catch {
              Alert.alert("Error", "Failed to delete post");
            }
          },
        },
      ],
    );
  };

  const handleReportSubmit = async () => {
    if (!requireAuth("report posts") || !reportPostId || !reportReason) return;
    try {
      await supabase.from("post_reports").insert({
        post_id: reportPostId,
        reported_by: user!.id,
        reason: reportReason,
        created_at: new Date().toISOString(),
      });
      Alert.alert("Reported", "Thank you for reporting this post.");
      setReportPostId(null);
      setReportReason("");
    } catch {
      Alert.alert("Error", "Could not submit report");
    }
  };

  const handleBugSubmit = async () => {
    if (!bugDescription.trim()) return;
    setSubmittingBug(true);
    try {
      await supabase.from("bug_reports").insert({
        user_id: user?.id || null,
        description: bugDescription.trim(),
        created_at: new Date().toISOString(),
      });
      Alert.alert("Thank you", "Bug report submitted.");
      setShowBugReport(false);
      setBugDescription("");
    } catch {
      Alert.alert("Error", "Could not submit bug report");
    } finally {
      setSubmittingBug(false);
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    videoRefs.current.forEach((video) => {
      if (typeof (video as any).pauseAsync === "function") {
        (video as any).pauseAsync().catch(() => {});
      }
    });
    const videoItem = viewableItems.find(
      (item: any) =>
        item.item?.media &&
        item.item.media.some((m: MediaItem) => m.type === "video"),
    );
    if (videoItem) {
      setVisibleVideoId(videoItem.item.id);
    } else {
      setVisibleVideoId(null);
    }
  }).current;

  const openChatWithUser = async (
    userId: string,
    name: string,
    avatar: string,
    initialMessage?: string,
  ) => {
    if (!requireAuth("start a conversation")) return;
    try {
      let chatId: string | null = null;
      if (typeof createChat === "function") {
        try {
          chatId = await createChat(userId, name, avatar, initialMessage);
        } catch (ctxErr) {
          console.warn(
            "createChat from context failed, falling back to Supabase",
            ctxErr,
          );
        }
      }
      if (!chatId) {
        const { data: existingChat } = await supabase
          .from("chats")
          .select("id")
          .or(
            `and(participant1_id.eq.${user!.id},participant2_id.eq.${userId}),and(participant1_id.eq.${userId},participant2_id.eq.${user!.id})`,
          )
          .maybeSingle();
        if (existingChat) {
          chatId = existingChat.id;
        } else {
          const { data } = await supabase
            .from("chats")
            .insert({
              participant1_id: user!.id,
              participant2_id: userId,
              created_at: new Date().toISOString(),
            })
            .select("id")
            .single();
          if (!data || !data.id) throw new Error("Could not create chat");
          chatId = data.id;
        }
        if (initialMessage && chatId) {
          await supabase.from("messages").insert({
            chat_id: chatId,
            sender_id: user!.id,
            content: initialMessage,
            created_at: new Date().toISOString(),
            is_read: false,
          });
        }
      }
      if (chatId) {
        setActiveChatId(chatId);
        setShowChatList(false);
      }
    } catch (err: any) {
      Alert.alert("Chat Error", err.message || "Could not open chat");
    }
  };

  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setUserSearchResults([]);
      return;
    }
    const { data } = await supabase
      .from("users")
      .select("user_id, username")
      .ilike("username", `%${query.trim()}%`)
      .limit(20);
    setUserSearchResults(data || []);
  }, []);

  useEffect(() => {
    if (!showChatList) return;
    const handler = setTimeout(() => {
      searchUsers(chatSearchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [chatSearchQuery, searchUsers, showChatList]);

  const handleMediaPress = (mediaItems: MediaItem[], index: number) => {
    setMediaViewerItems(mediaItems);
    setMediaViewerIndex(index);
    setMediaViewerVisible(true);
  };

  const handleChatClose = () => {
    setActiveChatId(null);
    setShowChatList(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22c55e" />
          <Text style={styles.loadingText}>Loading community...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.safeArea}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <View style={styles.container}>
          <LinearGradient
            colors={["#f0fdf4", "#ffffff", "#ecfdf5"]}
            style={StyleSheet.absoluteFill}
          />
          <Animated.View style={[styles.bgBlob, styles.bgBlob1, bgBlob1Style]}>
            <BlurView
              intensity={40}
              tint="light"
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
          <Animated.View style={[styles.bgBlob, styles.bgBlob2, bgBlob2Style]}>
            <BlurView
              intensity={40}
              tint="light"
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          <View style={styles.fixedHeader}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <MobileHeader />
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <TouchableOpacity
                  onPress={() => {
                    if (!requireAuth("view notifications")) return;
                    Alert.alert(
                      "Notifications",
                      "Notifications page coming soon.",
                    );
                  }}
                  style={styles.notifBtn}
                >
                  <Ionicons
                    name="notifications-outline"
                    size={22}
                    color="#6b7280"
                  />
                  {unreadNotifications > 0 && (
                    <View style={styles.notifBadge}>
                      <Text style={styles.notifBadgeText}>
                        {unreadNotifications > 99 ? "99+" : unreadNotifications}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowBugReport(true)}
                  style={styles.bugReportBtn}
                >
                  <Ionicons name="bug-outline" size={22} color="#6b7280" />
                </TouchableOpacity>
              </View>
            </View>
            <Animated.View
              entering={FadeIn.delay(100)}
              style={styles.searchWrap}
            >
              <GlassCard style={styles.searchCard}>
                <View style={styles.searchRow}>
                  <TouchableOpacity
                    style={styles.addPostBtn}
                    onPress={() => {
                      if (!requireAuth("create a post")) return;
                      setShowCreateModal(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add-circle" size={24} color="#22c55e" />
                  </TouchableOpacity>
                  <Ionicons name="search" size={18} color="#9ca3af" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search posts..."
                    placeholderTextColor="#9ca3af"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery("")}>
                      <Ionicons name="close-circle" size={18} color="#9ca3af" />
                    </TouchableOpacity>
                  )}
                </View>
              </GlassCard>
            </Animated.View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsRow}
            >
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.tab,
                    activeCategory === cat && styles.tabActive,
                  ]}
                  onPress={() => setActiveCategory(cat)}
                >
                  <Text
                    style={[
                      styles.tabText,
                      activeCategory === cat && styles.tabTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <FlatList
            data={combinedFeed}
            keyExtractor={(item, index) =>
              item.type === "ad"
                ? `ad-${item.data.id}-${index}`
                : `post-${item.id}`
            }
            renderItem={({ item, index }) => {
              if (item.type === "ad") {
                return <AdCard ad={item.data} />;
              }
              return (
                <PostCard
                  post={item}
                  onLike={handleLike}
                  onComment={handleComment}
                  onOpenChat={openChatWithUser}
                  onReport={(postId) => {
                    if (!requireAuth("report posts")) return;
                    setReportPostId(postId);
                    setReportReason("");
                  }}
                  onDelete={handleDeletePost}
                  onMediaPress={handleMediaPress}
                  videoRefs={videoRefs}
                  visibleVideoId={visibleVideoId}
                  renderMentions={renderMentions}
                  index={index}
                  currentUserId={user?.id}
                />
              );
            }}
            contentContainerStyle={{
              paddingTop: FIXED_HEADER_TOTAL,
              paddingBottom: BOTTOM_NAV_HEIGHT + 16,
            }}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyFeed}>
                <Ionicons name="leaf-outline" size={64} color="#d1d5db" />
                <Text style={styles.emptyFeedTitle}>Nothing here yet</Text>
                <Text style={styles.emptyFeedSub}>
                  Be the first to share something with the community!
                </Text>
              </View>
            }
          />
          <BottomNav />
        </View>

        <View style={styles.fabContainer}>
          <TouchableOpacity
            style={[styles.fab, styles.aiFab]}
            onPress={() => router.push("/(tabs)/ai_scan_index")}
          >
            <Ionicons name="sparkles" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.fab}
            onPress={() => {
              if (!requireAuth("open messages")) return;
              setShowChatList(true);
            }}
          >
            <Ionicons name="chatbubbles" size={24} color="#fff" />
            {unreadMessages > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {unreadMessages > 99 ? "99+" : unreadMessages}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {showChatList && !activeChatId && (
          <View style={styles.modalOverlay}>
            <SafeAreaView style={styles.chatListModal}>
              <View style={styles.chatSearchBar}>
                <Ionicons name="search" size={18} color="#9ca3af" />
                <TextInput
                  style={styles.chatSearchInput}
                  placeholder="Search messages or users..."
                  placeholderTextColor="#9ca3af"
                  value={chatSearchQuery}
                  onChangeText={setChatSearchQuery}
                  autoCorrect={false}
                />
                {chatSearchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setChatSearchQuery("");
                      setUserSearchResults([]);
                    }}
                  >
                    <Ionicons name="close-circle" size={18} color="#9ca3af" />
                  </TouchableOpacity>
                )}
              </View>

              {chatSearchQuery.trim().length > 0 ? (
                <FlatList
                  data={userSearchResults}
                  keyExtractor={(item) => item.user_id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.userSearchItem}
                      onPress={() =>
                        openChatWithUser(item.user_id, item.username, "🌾")
                      }
                    >
                      <View style={styles.userSearchAvatar}>
                        <Text style={styles.userSearchAvatarText}>🌾</Text>
                      </View>
                      <Text style={styles.userSearchName}>{item.username}</Text>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <View style={styles.emptySearch}>
                      <Text style={styles.emptySearchText}>No users found</Text>
                    </View>
                  }
                />
              ) : (
                <ChatList
                  onClose={() => {
                    setShowChatList(false);
                    setChatSearchQuery("");
                    setUserSearchResults([]);
                  }}
                  onOpenChat={(chatId) => {
                    setActiveChatId(chatId);
                    setShowChatList(false);
                    setChatSearchQuery("");
                    setUserSearchResults([]);
                  }}
                />
              )}
            </SafeAreaView>
          </View>
        )}

        {activeChatId && (
          <View style={styles.modalOverlay}>
            <ChatScreen chatId={activeChatId} onClose={handleChatClose} />
          </View>
        )}

        {commentModalPost && (
          <CommentScreen
            post={commentModalPost}
            visible={!!commentModalPost}
            onClose={() => setCommentModalPost(null)}
            currentUserId={user?.id}
            onCommentLike={handleCommentLike}
            onCommentDelete={handleCommentDelete}
            onCommentSubmit={handleCommentSubmit}
          />
        )}

        {showCreateModal && (
          <CreatePostModal
            visible={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onPosted={() => {
              setShowCreateModal(false);
              fetchPosts();
            }}
            userId={user?.id || ""}
          />
        )}

        <MediaViewer
          visible={mediaViewerVisible}
          mediaItems={mediaViewerItems}
          initialIndex={mediaViewerIndex}
          onClose={() => setMediaViewerVisible(false)}
        />

        <AuthPromptModal
          visible={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          featureName={pendingAction}
        />

        {reportPostId && (
          <Modal visible transparent animationType="fade">
            <View style={styles.reportOverlay}>
              <View style={styles.reportModal}>
                <Text style={styles.reportModalTitle}>Report Post</Text>
                {[
                  "Spam",
                  "Inappropriate content",
                  "Harassment",
                  "False information",
                  "Other",
                ].map((reason) => (
                  <TouchableOpacity
                    key={reason}
                    style={[
                      styles.reportOption,
                      reportReason === reason && styles.reportOptionSelected,
                    ]}
                    onPress={() => setReportReason(reason)}
                  >
                    <Text
                      style={
                        reportReason === reason
                          ? styles.reportOptionTextSelected
                          : undefined
                      }
                    >
                      {reason}
                    </Text>
                  </TouchableOpacity>
                ))}
                <View style={styles.reportActions}>
                  <TouchableOpacity onPress={() => setReportPostId(null)}>
                    <Text style={styles.reportCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleReportSubmit}
                    disabled={!reportReason}
                    style={[
                      styles.reportSubmitBtn,
                      !reportReason && styles.reportSubmitBtnDisabled,
                    ]}
                  >
                    <Text style={styles.reportSubmitText}>Submit</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}

        <Modal visible={showBugReport} transparent animationType="fade">
          <View style={styles.reportOverlay}>
            <View style={styles.reportModal}>
              <Text style={styles.reportModalTitle}>Report a Bug</Text>
              <TextInput
                style={styles.bugInput}
                placeholder="Describe the issue..."
                placeholderTextColor="#9ca3af"
                multiline
                value={bugDescription}
                onChangeText={setBugDescription}
              />
              <View style={styles.reportActions}>
                <TouchableOpacity onPress={() => setShowBugReport(false)}>
                  <Text style={styles.reportCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleBugSubmit}
                  disabled={!bugDescription.trim() || submittingBug}
                  style={[
                    styles.reportSubmitBtn,
                    (!bugDescription.trim() || submittingBug) &&
                      styles.reportSubmitBtnDisabled,
                  ]}
                >
                  {submittingBug ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.reportSubmitText}>Submit</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
};

export default function CommunityPage() {
  return (
    <ChatProvider>
      <CommunityPageContent />
    </ChatProvider>
  );
}

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f3f4f6" },
  container: { flex: 1 },
  bgBlob: { position: "absolute", borderRadius: 999, overflow: "hidden" },
  bgBlob1: {
    left: -SCREEN_WIDTH * 0.2,
    top: -100,
    width: SCREEN_WIDTH * 0.6,
    height: SCREEN_WIDTH * 0.6,
    backgroundColor: "rgba(34,197,94,0.15)",
  },
  bgBlob2: {
    right: -SCREEN_WIDTH * 0.2,
    bottom: 100,
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_WIDTH * 0.7,
    backgroundColor: "rgba(16,185,129,0.12)",
  },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { fontSize: 14, color: "#9ca3af" },
  fixedHeader: {
    position: "absolute",
    paddingTop: 0,
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: "#f0fdf4",
  },
  notifBtn: { padding: 8, position: "relative" },
  notifBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "#3b82f6",
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  notifBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },
  bugReportBtn: { marginRight: 16, padding: 8 },
  searchWrap: { paddingHorizontal: 16, marginBottom: 12, marginTop: 8 },
  searchCard: { padding: 6 },
  searchRow: { flexDirection: "row", alignItems: "center" },
  addPostBtn: { padding: 4, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: "#111827", paddingVertical: 8 },
  tabsRow: { paddingHorizontal: 16, marginBottom: 8 },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  tabActive: { backgroundColor: "#22c55e", borderColor: "#16a34a" },
  tabText: { fontSize: 13, fontWeight: "500", color: "#6b7280" },
  tabTextActive: { color: "#fff", fontWeight: "600" },
  card: {
    backgroundColor: "#fff",
    marginBottom: 8,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    overflow: "hidden",
    marginHorizontal: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  authorRow: { flexDirection: "row", alignItems: "center", flex: 1 },
  authorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  authorAvatarText: { fontSize: 22 },
  authorAvatarImage: { width: 44, height: 44, borderRadius: 22 },
  authorInfo: { flex: 1 },
  authorNameRow: { flexDirection: "row", alignItems: "center" },
  authorName: { fontSize: 15, fontWeight: "700", color: "#111827" },
  officialBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 6,
    backgroundColor: "#22c55e",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  officialText: { fontSize: 10, fontWeight: "600", color: "#fff" },
  authorTime: { fontSize: 12, color: "#9ca3af", marginTop: 1 },
  categoryPill: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryPillText: { fontSize: 11, fontWeight: "600", color: "#16a34a" },
  iconBtn: { padding: 4 },
  cardText: {
    fontSize: 15,
    color: "#374151",
    lineHeight: 22,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  mentionLink: { color: "#16a34a", fontWeight: "600" },
  mediaContainer: { marginBottom: 4 },
  mediaItem: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  mediaImage: { width: "100%", height: "100%" },
  mediaVideo: { width: "100%", height: "100%" },
  videoWrapper: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  videoControlsOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    alignItems: "center",
  },
  playPauseButton: {
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 30,
    padding: 12,
  },
  videoControlBar: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  muteButton: {
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    padding: 8,
  },
  fullscreenButton: {
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    padding: 8,
  },
  mediaDots: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 8,
  },
  mediaDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#d1d5db",
  },
  mediaDotActive: { backgroundColor: "#22c55e", width: 18 },
  mediaViewerContainer: { flex: 1, backgroundColor: "#000" },
  mediaViewerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  mediaViewerCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  mediaViewerCounter: { color: "#fff", fontSize: 14, fontWeight: "600" },
  mediaViewerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  mediaViewerVideoWrap: { justifyContent: "center", alignItems: "center" },
  mediaViewerDots: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 16,
    position: "absolute",
    bottom: 80,
    left: 0,
    right: 0,
  },
  mediaViewerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.4)",
    marginHorizontal: 4,
  },
  mediaViewerDotActive: { backgroundColor: "#fff", width: 20 },
  mediaViewerNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    position: "absolute",
    top: "40%",
    left: 0,
    right: 0,
  },
  mediaViewerArrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  mediaViewerArrowDisabled: { opacity: 0.3 },
  reactionSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  reactionItem: { flexDirection: "row", alignItems: "center" },
  reactionIconBg: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  reactionCount: { fontSize: 13, color: "#6b7280" },
  reactionComments: { fontSize: 13, color: "#6b7280" },
  actionDivider: {
    height: 1,
    backgroundColor: "#f3f4f6",
    marginHorizontal: 16,
  },
  actionBar: { flexDirection: "row", paddingVertical: 4 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnText: { fontSize: 14, fontWeight: "500", color: "#6b7280" },
  actionBtnTextActive: { color: "#ef4444" },
  latestComment: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  latestCommentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
  },
  latestCommentBubble: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 8,
  },
  latestCommentUsername: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  latestCommentText: { fontSize: 13, color: "#4b5563", lineHeight: 18 },
  emptyFeed: { alignItems: "center", paddingVertical: 60 },
  emptyFeedTitle: { fontSize: 18, fontWeight: "700", color: "#6b7280" },
  emptyFeedSub: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
    paddingHorizontal: 32,
  },
  fabContainer: {
    position: "absolute",
    bottom: BOTTOM_NAV_HEIGHT + 16,
    right: 20,
    alignItems: "center",
    gap: 16,
    zIndex: 100,
  },
  fab: {
    backgroundColor: "#22c55e",
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  aiFab: { backgroundColor: "#3b82f6" },
  unreadBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#ef4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#fff",
  },
  unreadBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  modalOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#fff",
    zIndex: 200,
  },
  chatListModal: { flex: 1 },
  chatSearchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  chatSearchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    paddingVertical: 8,
  },
  userSearchItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  userSearchAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  userSearchAvatarText: { fontSize: 22 },
  userSearchName: { fontSize: 16, fontWeight: "500", color: "#111827" },
  emptySearch: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptySearchText: { fontSize: 14, color: "#9ca3af" },
  commentScreen: { flex: 1, backgroundColor: "#fff" },
  commentScreenHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    backgroundColor: "#fff",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  commentScreenTitle: { fontSize: 17, fontWeight: "700", color: "#111827" },
  postSummary: {
    backgroundColor: "#f9fafb",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  postSummaryAuthor: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  postSummaryAvatar: {
    fontSize: 28,
    width: 44,
    height: 44,
    textAlign: "center",
    textAlignVertical: "center",
    backgroundColor: "#dcfce7",
    borderRadius: 22,
    overflow: "hidden",
  },
  postSummaryName: { fontSize: 15, fontWeight: "700", color: "#111827" },
  postSummaryTime: { fontSize: 12, color: "#9ca3af" },
  postSummaryText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
    marginBottom: 10,
  },
  postSummaryDivider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginBottom: 8,
  },
  postSummaryStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  postStatItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  postStatText: { fontSize: 13, color: "#6b7280" },
  commentsListContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 4,
  },
  commentItem: { flexDirection: "row", marginVertical: 8 },
  commentAvatarWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
  },
  commentAvatarText: { fontSize: 18 },
  commentBody: { flex: 1 },
  commentBubble: {
    backgroundColor: "#f3f4f6",
    borderRadius: 18,
    borderTopLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  commentUsername: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 3,
  },
  commentText: { fontSize: 14, color: "#374151", lineHeight: 19 },
  commentActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 5,
    paddingLeft: 6,
  },
  commentDate: { fontSize: 12, color: "#9ca3af" },
  commentLikeBtn: { flexDirection: "row", alignItems: "center", gap: 3 },
  commentLikeCount: { fontSize: 12, color: "#9ca3af" },
  replyActionText: { fontSize: 12, fontWeight: "600", color: "#6b7280" },
  showRepliesBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    paddingLeft: 2,
  },
  showRepliesLine: { width: 24, height: 1, backgroundColor: "#d1d5db" },
  showRepliesText: { fontSize: 12, fontWeight: "600", color: "#6b7280" },
  replyItem: { flexDirection: "row", gap: 8, marginTop: 10, paddingLeft: 10 },
  replyAvatarWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#bbf7d0",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  replyAvatarText: { fontSize: 14 },
  replyBubble: {
    flex: 1,
    backgroundColor: "#f9fafb",
    borderRadius: 14,
    borderTopLeftRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  replyUsername: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  replyText: { fontSize: 13, color: "#374151", lineHeight: 18 },
  replyMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  replyDate: { fontSize: 11, color: "#9ca3af" },
  replyLikeBtn: { flexDirection: "row", alignItems: "center", gap: 3 },
  replyLikeCount: { fontSize: 11, color: "#9ca3af" },
  emptyComments: { alignItems: "center", paddingVertical: 48, gap: 10 },
  emptyCommentsTitle: { fontSize: 16, fontWeight: "600", color: "#6b7280" },
  emptyCommentsSub: { fontSize: 13, color: "#9ca3af" },
  inputBar: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 24 : 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 10,
  },
  replyingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#22c55e",
  },
  replyingBannerText: {
    flex: 1,
    fontSize: 13,
    color: "#16a34a",
    fontWeight: "500",
  },
  replyingCancelBtn: { padding: 2 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  inputAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  inputAvatarText: { fontSize: 18 },
  inputWrapper: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxHeight: 120,
  },
  textInput: { fontSize: 14, color: "#111827", minHeight: 22, maxHeight: 100 },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sendBtnActive: { backgroundColor: "#22c55e" },
  sendBtnDisabled: { backgroundColor: "#e5e7eb" },
  adCard: {
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.2)",
    marginBottom: 16,
    overflow: "hidden",
    position: "relative",
    marginHorizontal: 16,
  },
  adBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#f97316",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    zIndex: 1,
  },
  adBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  adImage: { width: "100%", aspectRatio: 16 / 9 },
  adContent: { padding: 16 },
  adProductName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#11181C",
    marginBottom: 8,
  },
  adDescription: { fontSize: 14, color: "#4b5563", marginBottom: 12 },
  adSeller: { fontSize: 12, color: "#6b7280" },
  adFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  adPrice: { fontSize: 20, fontWeight: "700", color: "#16a34a" },
  adCtaButton: {
    backgroundColor: "#22c55e",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  adCtaText: { color: "#fff", fontWeight: "600" },
  reportOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  reportModal: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 340,
  },
  reportModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
    textAlign: "center",
  },
  reportOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#f9fafb",
    marginBottom: 8,
  },
  reportOptionSelected: {
    backgroundColor: "#dcfce7",
    borderWidth: 1,
    borderColor: "#22c55e",
  },
  reportOptionTextSelected: { fontWeight: "600", color: "#16a34a" },
  reportActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  reportCancelText: { fontSize: 14, color: "#6b7280", paddingVertical: 8 },
  reportSubmitBtn: {
    backgroundColor: "#22c55e",
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
  },
  reportSubmitBtnDisabled: { backgroundColor: "#d1d5db" },
  reportSubmitText: { color: "#fff", fontWeight: "600" },
  bugInput: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: "#111827",
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 8,
  },
  // Auth Modal
  authModalContainer: {
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
  },
  authModalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  authModalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  authModalDescription: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  authModalButtons: { width: "100%", gap: 12 },
  authModalBtn: { paddingVertical: 12, borderRadius: 30, alignItems: "center" },
  authModalSignupBtn: { backgroundColor: "#22c55e" },
  authModalSignupText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  authModalLoginBtn: {
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  authModalLoginText: { color: "#374151", fontWeight: "600", fontSize: 16 },
  authModalCancel: { marginTop: 8 },
  authModalCancelText: { color: "#9ca3af", fontSize: 14 },
});
