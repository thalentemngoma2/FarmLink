// app/(tabs)/profile.tsx
import { BottomNav } from "@/components/bottom-nav";
import { GlassCard } from "@/components/ui/glass-card";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { AuthPromptModal } from "@/components/AuthPromptModal";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, {
    FadeIn,
    SlideInDown,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

// Types
interface ProfileData {
  id: string;
  name: string;
  avatar: string;
  location: string;
  join_date: string;
  farm_size: string;
  main_crops: string;
  farming_type: string;
  questions_count: number;
  answers_count: number;
  likes_count: number;
  isRetailer?: boolean;
}

interface Achievement {
  achievement_id: string;
  earned_at: string;
}

// Static menu items
const menuItems = [
  { icon: "notifications-outline", label: "Notifications", badge: 3 },
  { icon: "settings-outline", label: "Settings" },
  { icon: "help-circle-outline", label: "Help & Support" },
  { icon: "log-out-outline", label: "Log Out", danger: true },
];

const achievementsList = [
  { id: "first_question", icon: "chatbubble-outline", label: "First Question" },
  { id: "helpful_answer", icon: "heart-outline", label: "Helpful Answer" },
  { id: "top_contributor", icon: "trophy-outline", label: "Top Contributor" },
  { id: "farming_expert", icon: "leaf-outline", label: "Farming Expert" },
];

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, logout, isLoading: authLoading } = useAuth();
  // Auth modal state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingAction, setPendingAction] = useState("");

  // Determine user role from AuthContext
  const userRole = user?.role || "farmer";

  const requireAuth = useCallback(
    (action?: string) => {
      if (!user) {
        setPendingAction(action || "access this feature");
        setShowAuthModal(true);
        return false;
      }
      return true;
    },
    [user]
  );

  useEffect(() => {
    if (!user) {
      setShowAuthModal(true);
      setPendingAction("access profile");
    } else {
      setShowAuthModal(false);
    }
  }, [user]);

  // ---------------------------------------------------------------------------
  // Load user & stats (with auto‑creation of missing user)
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Load user & stats (with auto‑creation of missing user)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        // Try to fetch farmer profile first
        const { data: farmerData } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (farmerData) {
          setProfile({
            id: farmerData.user_id,
            name: farmerData.full_name || user.name || "Farmer",
            avatar: (farmerData.full_name || user.name || "F")
              .charAt(0)
              .toUpperCase(),
            location:
              farmerData.location || user.location || "Location not set",
            join_date:
              farmerData.created_at ||
              user.createdAt ||
              new Date().toISOString(),
            farm_size: farmerData.farm_size || "Not set",
            main_crops: farmerData.main_crops || "Not set",
            farming_type: farmerData.farm_type || "Not set",
            questions_count: 0,
            answers_count: 0,
            likes_count: 0,
            isRetailer: false,
          });
        } else {
          // Try to fetch retail profile if farmer isn't found
          const { data: retailData } = await supabase
            .from("retail_profiles")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();
          if (retailData) {
            setProfile({
              id: retailData.user_id,
              name: retailData.store_name || user.name || "Retailer",
              avatar: (retailData.store_name || user.name || "R")
                .charAt(0)
                .toUpperCase(),
              location: retailData.city || user.location || "Location not set",
              join_date:
                retailData.created_at ||
                user.createdAt ||
                new Date().toISOString(),
              farm_size: "N/A",
              main_crops: "N/A",
              farming_type: retailData.business_type || "Not set",
              questions_count: 0,
              answers_count: 0,
              likes_count: 0,
              isRetailer: true,
            });
          }
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  // Helper: check if an achievement is earned
  const isEarned = (achievementId: string) => {
    return achievements.some((a) => a.achievement_id === achievementId);
  };

  const handleLogout = async () => {
    const executeLogout = async () => {
      try {
        if (logout) await logout();
        router.replace("/login");
      } catch (error) {
        console.error("Logout error", error);
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to log out?")) {
        await executeLogout();
      }
    } else {
      Alert.alert(
        "Log Out",
        "Are you sure you want to log out?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Log Out", style: "destructive", onPress: executeLogout },
        ],
        { cancelable: true },
      );
    }
  };

  // Background animation (same as before)
  const bgScale = useSharedValue(1);
  const bgOpacity = useSharedValue(0.3);
  const bgScale2 = useSharedValue(1.2);
  const bgOpacity2 = useSharedValue(0.2);

  React.useEffect(() => {
    bgScale.value = withRepeat(withTiming(1.2, { duration: 8000 }), -1, true);
    bgOpacity.value = withRepeat(
      withTiming(0.5, { duration: 10000 }),
      -1,
      true,
    );
    bgScale2.value = withRepeat(withTiming(1, { duration: 10000 }), -1, true);
    bgOpacity2.value = withRepeat(
      withTiming(0.4, { duration: 10000 }),
      -1,
      true,
    );
  }, [bgOpacity, bgOpacity2, bgScale, bgScale2]);

  const bgBlob1Style = useAnimatedStyle(() => ({
    transform: [{ scale: bgScale.value }],
    opacity: bgOpacity.value,
  }));
  const bgBlob2Style = useAnimatedStyle(() => ({
    transform: [{ scale: bgScale2.value }],
    opacity: bgOpacity2.value,
  }));

  const { width, height } = Dimensions.get("window");

  if (loading || authLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22c55e" />
        </View>
      </SafeAreaView>
    );
  }

  // Guest view
  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.container}>
          <LinearGradient
            colors={["#f0fdf4", "#ffffff", "#ecfdf5"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              padding: 20,
            }}
          >
            <Ionicons name="person-circle-outline" size={64} color="#9ca3af" />
            <Text
              style={{
                fontSize: 20,
                fontWeight: "bold",
                color: "#11181C",
                marginTop: 16,
              }}
            >
              Not Signed In
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#687076",
                textAlign: "center",
                marginTop: 8,
                marginBottom: 24,
              }}
            >
              Log in or create an account to view and manage your profile.
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: "#22c55e",
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 20,
              }}
              onPress={() => router.push("/login")}
            >
              <Text
                style={{ color: "white", fontWeight: "bold", fontSize: 16 }}
              >
                Go to Login
              </Text>
            </TouchableOpacity>
          </View>
         <BottomNav />
       </View>
     </SafeAreaView>
   );

   {/* Auth Prompt Modal */}
   {showAuthModal && (
     <AuthPromptModal
       visible={showAuthModal}
       onClose={() => setShowAuthModal(false)}
       featureName={pendingAction}
     />
   )}
 }

  // Fallback if profile not loaded
  const displayProfile = profile || {
    name: user?.name || "New User",
    avatar: (user?.name || "U").charAt(0).toUpperCase(),
    location: user?.location || "Location not set",
    join_date: user?.createdAt || new Date().toISOString(),
    farm_size: "Not set",
    main_crops: "Not set",
    farming_type: "Not set",
    questions_count: 0,
    answers_count: 0,
    likes_count: 0,
    isRetailer: userRole === "retailer",
  };

  const joinDate = new Date(displayProfile.join_date).toLocaleDateString(
    "en-US",
    { year: "numeric", month: "long" },
  );

  // Role label and color
  const getRoleLabel = () => {
    switch (userRole) {
      case "retailer":
        return { label: "Retailer", color: "#3b82f6" };
      case "extension_officer":
        return { label: "Extension Officer", color: "#f59e0b" };
      default:
        return { label: "Farmer", color: "#22c55e" };
    }
  };
  const roleInfo = getRoleLabel();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        {/* Background (unchanged) */}
        <LinearGradient
          colors={["#f0fdf4", "#ffffff", "#ecfdf5"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          style={[
            styles.bgBlob,
            {
              left: -width * 0.2,
              top: -height * 0.2,
              width: width * 0.6,
              height: width * 0.6,
            },
            bgBlob1Style,
          ]}
        >
          <BlurView
            intensity={50}
            tint="light"
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.bgBlob,
            {
              right: -width * 0.2,
              bottom: -height * 0.2,
              width: width * 0.7,
              height: width * 0.7,
            },
            bgBlob2Style,
          ]}
        >
          <BlurView
            intensity={50}
            tint="light"
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#11181C" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            entering={SlideInDown.duration(500)}
            style={styles.section}
          >
            <GlassCard style={styles.profileCard}>
              <View style={styles.profileRow}>
                <View style={styles.avatarContainer}>
                  <LinearGradient
                    colors={["#22c55e", "#16a34a"]}
                    style={styles.avatarGradient}
                  >
                    <Text style={styles.avatarText}>
                      {displayProfile.avatar ||
                        displayProfile.name.charAt(0).toUpperCase()}
                    </Text>
                  </LinearGradient>
                  <TouchableOpacity
                    style={styles.editAvatar}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="pencil" size={14} color="#22c55e" />
                  </TouchableOpacity>
                </View>
                <View style={styles.profileInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.profileName}>
                      {displayProfile.name}
                    </Text>
                    <View
                      style={[
                        styles.roleBadge,
                        { backgroundColor: roleInfo.color + "20" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.roleBadgeText,
                          { color: roleInfo.color },
                        ]}
                      >
                        {roleInfo.label}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons
                      name="location-outline"
                      size={12}
                      color="#9ca3af"
                    />
                    <Text style={styles.infoText}>
                      {displayProfile.location || "Location not set"}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons
                      name="calendar-outline"
                      size={12}
                      color="#9ca3af"
                    />
                    <Text style={styles.infoText}>Joined {joinDate}</Text>
                  </View>
                </View>
              </View>

              {/* Stats from API */}
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {displayProfile.questions_count}
                  </Text>
                  <Text style={styles.statLabel}>Questions</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {displayProfile.answers_count}
                  </Text>
                  <Text style={styles.statLabel}>Answers</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {displayProfile.likes_count}
                  </Text>
                  <Text style={styles.statLabel}>Likes</Text>
                </View>
              </View>
            </GlassCard>
          </Animated.View>

          {/* Achievements – dynamic earned status */}
          <Animated.View entering={FadeIn.delay(100)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="trophy-outline" size={18} color="#22c55e" />
              <Text style={styles.sectionTitle}>Achievements</Text>
            </View>
            <GlassCard style={styles.achievementsCard}>
              <View style={styles.achievementsGrid}>
                {achievementsList.map((item, idx) => {
                  const earned = isEarned(item.id);
                  return (
                    <Animated.View
                      key={item.label}
                      entering={FadeIn.delay(200 + idx * 50)}
                      style={styles.achievementItem}
                    >
                      <View
                        style={[
                          styles.achievementIcon,
                          earned
                            ? styles.achievementEarned
                            : styles.achievementLocked,
                        ]}
                      >
                        <Ionicons
                          name={item.icon as any}
                          size={20}
                          color={earned ? "#22c55e" : "#9ca3af"}
                        />
                      </View>
                      <Text
                        style={[
                          styles.achievementLabel,
                          earned
                            ? styles.achievementLabelEarned
                            : styles.achievementLabelLocked,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </Animated.View>
                  );
                })}
              </View>
            </GlassCard>
          </Animated.View>

          {/* Farm info – dynamic */}
          <Animated.View entering={FadeIn.delay(150)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name={
                  displayProfile.isRetailer
                    ? "storefront-outline"
                    : "leaf-outline"
                }
                size={18}
                color="#22c55e"
              />
              <Text style={styles.sectionTitle}>
                {displayProfile.isRetailer ? "My Business" : "My Farm"}
              </Text>
            </View>
            <GlassCard style={styles.farmCard}>
              {displayProfile.isRetailer ? (
                <View style={styles.farmRow}>
                  <Text style={styles.farmLabel}>Business Type</Text>
                  <Text style={styles.farmValue}>
                    {displayProfile.farming_type || "Not specified"}
                  </Text>
                </View>
              ) : (
                <>
                  <View style={styles.farmRow}>
                    <Text style={styles.farmLabel}>Farm Size</Text>
                    <Text style={styles.farmValue}>
                      {displayProfile.farm_size || "Not specified"}
                    </Text>
                  </View>
                  <View style={styles.farmRow}>
                    <Text style={styles.farmLabel}>Main Crops</Text>
                    <Text style={styles.farmValue}>
                      {displayProfile.main_crops || "Not specified"}
                    </Text>
                  </View>
                  <View style={styles.farmRow}>
                    <Text style={styles.farmLabel}>Farming Type</Text>
                    <Text style={styles.farmValue}>
                      {displayProfile.farming_type || "Not specified"}
                    </Text>
                  </View>
                </>
              )}
              <TouchableOpacity
                style={styles.editFarmButton}
                activeOpacity={0.8}
              >
                <Text style={styles.editFarmText}>
                  Edit {displayProfile.isRetailer ? "Business" : "Farm"} Details
                </Text>
              </TouchableOpacity>
            </GlassCard>
          </Animated.View>

          <Animated.View entering={FadeIn.delay(200)} style={styles.section}>
            <GlassCard style={styles.menuCard}>
              {menuItems.map((item, idx) => (
                <TouchableOpacity
                  key={item.label}
                  style={[
                    styles.menuItem,
                    idx === menuItems.length - 1 && styles.menuItemLast,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (item.label === "Log Out") {
                      handleLogout();
                    } else {
                      console.log(item.label);
                    }
                  }}
                >
                  <View style={styles.menuLeft}>
                    <Ionicons
                      name={item.icon as any}
                      size={20}
                      color={item.danger ? "#ef4444" : "#9ca3af"}
                    />
                    <Text
                      style={[
                        styles.menuLabel,
                        item.danger && styles.menuLabelDanger,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </View>
                  <View style={styles.menuRight}>
                    {item.badge && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.badge}</Text>
                      </View>
                    )}
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="#9ca3af"
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </GlassCard>
          </Animated.View>

          <Text style={styles.version}>FarmLink v1.0.0</Text>
        </ScrollView>

         <BottomNav />
       </View>
     </SafeAreaView>
   );
 
   {/* Auth Prompt Modal */}
   {showAuthModal && (
     <AuthPromptModal
       visible={showAuthModal}
       onClose={() => setShowAuthModal(false)}
       featureName={pendingAction}
     />
   )}
 }

// Styles (unchanged)
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, position: "relative" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: "transparent",
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "600", color: "#11181C" },
  scrollContent: { flexGrow: 1, paddingBottom: 80, paddingTop: 0 },
  bgBlob: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(34,197,94,0.2)",
    overflow: "hidden",
  },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  profileCard: { padding: 16 },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  avatarContainer: { position: "relative" },
  avatarGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 32, fontWeight: "bold", color: "white" },
  editAvatar: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      web: { boxShadow: "0px 2px 2px rgba(0,0,0,0.1)" },
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
      },
    }),
  },
  profileInfo: { flex: 1 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
    flexWrap: "wrap",
  },
  profileName: { fontSize: 18, fontWeight: "bold", color: "#11181C" },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  roleBadgeText: { fontSize: 11, fontWeight: "600" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  infoText: { fontSize: 12, color: "#9ca3af" },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  statItem: { alignItems: "center" },
  statNumber: { fontSize: 20, fontWeight: "bold", color: "#11181C" },
  statLabel: { fontSize: 10, color: "#9ca3af", marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: "#e5e7eb" },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 14, fontWeight: "600", color: "#11181C" },
  achievementsCard: { padding: 12 },
  achievementsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  achievementItem: { width: "25%", alignItems: "center", marginBottom: 12 },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  achievementEarned: { backgroundColor: "rgba(34,197,94,0.1)" },
  achievementLocked: { backgroundColor: "rgba(156,163,175,0.1)" },
  achievementLabel: { fontSize: 9, textAlign: "center" },
  achievementLabelEarned: { color: "#11181C" },
  achievementLabelLocked: { color: "#9ca3af" },
  farmCard: { padding: 16 },
  farmRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  farmLabel: { fontSize: 14, color: "#687076" },
  farmValue: { fontSize: 14, fontWeight: "500", color: "#11181C" },
  editFarmButton: {
    marginTop: 16,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  editFarmText: { fontSize: 14, fontWeight: "600", color: "#16a34a" },
  menuCard: { overflow: "hidden" },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  menuItemLast: { borderBottomWidth: 0 },
  menuLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  menuLabel: { fontSize: 14, color: "#11181C" },
  menuLabelDanger: { color: "#ef4444" },
  menuRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: {
    backgroundColor: "#22c55e",
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: "center",
  },
  badgeText: { fontSize: 10, fontWeight: "600", color: "white" },
  version: {
    textAlign: "center",
    fontSize: 10,
    color: "#9ca3af",
    marginVertical: 24,
  },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
});
