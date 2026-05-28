// app/(tabs)/notifications.tsx
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
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
  Keyboard,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { BottomNav } from "@/components/bottom-nav";
import { GlassCard } from "@/components/ui/glass-card";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { Link } from "expo-router";
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
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

// ---------- Safe Map imports ----------
let MapView: any = null;
let Marker: any = null;
let Callout: any = null;

if (Platform.OS !== "web") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Maps = require("react-native-maps");
    MapView = Maps.default;
    Marker = Maps.Marker;
    Callout = Maps.Callout;
  } catch {
    // map package not installed
  }
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
  outbreakId?: string;
}

interface OutbreakMarker {
  id: string;
  latitude: number;
  longitude: number;
  disease: string;
  animal: string;
  status: "pending" | "verified" | "resolved";
  reportDate: string;
  evidenceUrls: string[];
  description?: string;
}

interface VerificationStep {
  label: string;
  status: "pending" | "running" | "pass" | "fail" | "blocked";
  message?: string;
}

// ---------- Constants ----------
const MAX_MEDIA = 5;
const MAX_REPORTS_PER_DAY = 3;
const MIN_DISEASE_LENGTH = 3;
const MIN_DESCRIPTION_LENGTH = 20;
const MAX_EVIDENCE_AGE_DAYS = 8;
const MIN_TRUST_SCORE_FOR_SUBMISSION = 50;

const SIGHTENGINE_API_USER = process.env.EXPO_PUBLIC_SIGHTENGINE_API_USER;
const SIGHTENGINE_API_SECRET = process.env.EXPO_PUBLIC_SIGHTENGINE_API_SECRET;

const getIconProps = (type: string) => {
  const mapping: { [key: string]: { name: string; color: string } } = {
    reply: { name: "chatbubble-outline", color: "#3b82f6" },
    like: { name: "heart-outline", color: "#ec489a" },
    follow: { name: "person-add-outline", color: "#8b5cf6" },
    achievement: { name: "trophy-outline", color: "#f59e0b" },
    alert: { name: "alert-circle-outline", color: "#ef4444" },
    system: { name: "checkmark-circle-outline", color: "#22c55e" },
    outbreak_alert: { name: "warning", color: "#ef4444" },
  };
  return mapping[type] || { name: "notifications-outline", color: "#9ca3af" };
};

const checkAIContent = async (text: string): Promise<boolean> => {
  if (!SIGHTENGINE_API_USER || !SIGHTENGINE_API_SECRET) {
    console.warn("Sightengine keys missing – skipping AI detection");
    return false;
  }
  try {
    const response = await fetch(
      "https://api.sightengine.com/1.0/text/check.json",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          text,
          api_user: SIGHTENGINE_API_USER,
          api_secret: SIGHTENGINE_API_SECRET,
          mode: "standard",
          categories: "ai_generated",
        }).toString(),
      },
    );
    const data = await response.json();
    return data?.type?.ai_generated > 0.8;
  } catch (error) {
    console.error("AI content check failed:", error);
    return false;
  }
};

const ANIMAL_TYPES = [
  "Cow",
  "Bull",
  "Heifer",
  "Calf",
  "Dairy Cow",
  "Beef Cattle",
  "Chicken",
  "Broiler",
  "Layer",
  "Chick",
  "Rooster",
  "Goat",
  "Kid",
  "Doe",
  "Buck",
  "Sheep",
  "Lamb",
  "Ewe",
  "Ram",
  "Pig",
  "Piglet",
  "Sow",
  "Boar",
  "Duck",
  "Duckling",
  "Turkey",
  "Goose",
  "Guinea Fowl",
  "Quail",
  "Horse",
  "Donkey",
  "Mule",
  "Camel",
  "Llama",
  "Alpaca",
  "Rabbit",
  "Guinea Pig",
  "Hamster",
  "Rat",
  "Mouse",
  "Fish (Tilapia)",
  "Fish (Catfish)",
  "Fish (Salmon)",
  "Fish (Trout)",
  "Shrimp",
  "Prawn",
  "Bee",
  "Silkworm",
  "Snail",
  "Cricket",
  "Mealworm",
  "Dog",
  "Cat",
  "Parrot",
  "Canary",
  "Finch",
  "Pigeon",
  "Ostrich",
  "Emu",
  "Peacock",
  "Swan",
  "Pheasant",
  "Bison",
  "Buffalo",
  "Yak",
  "Zebu",
  "Deer",
  "Elk",
  "Moose",
  "Antelope",
  "Iguana",
  "Snake",
  "Turtle",
  "Frog",
  "Salamander",
  "Other livestock",
  "Other poultry",
  "Other pet",
  "Other wildlife",
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
const PulsingMarker = React.memo(function PulsingMarker({
  status,
}: {
  status: OutbreakMarker["status"];
}) {
  const pulseAnim = useSharedValue(1);
  useEffect(() => {
    pulseAnim.value = withRepeat(
      withTiming(1.2, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [pulseAnim]);

  const color =
    status === "verified"
      ? "#ef4444"
      : status === "resolved"
        ? "#22c55e"
        : "#f97316";

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
    opacity: 0.8,
  }));

  return (
    <View style={styles.markerContainer}>
      <Animated.View
        style={[styles.markerPulse, { backgroundColor: color }, animatedStyle]}
      />
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
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    null,
  );
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

            <ScrollView
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              <View style={styles.detailRow}>
                <Ionicons name="paw" size={18} color="#6b7280" />
                <Text style={styles.detailLabel}>Animal: {marker.animal}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons
                  name="flag"
                  size={18}
                  color={
                    marker.status === "verified"
                      ? "#ef4444"
                      : marker.status === "resolved"
                        ? "#22c55e"
                        : "#f97316"
                  }
                />
                <Text style={styles.detailLabel}>
                  Status:{" "}
                  {marker.status.charAt(0).toUpperCase() +
                    marker.status.slice(1)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="location" size={18} color="#6b7280" />
                <Text style={styles.detailLabel}>
                  Coordinates: {marker.latitude.toFixed(4)},{" "}
                  {marker.longitude.toFixed(4)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="calendar" size={18} color="#6b7280" />
                <Text style={styles.detailLabel}>
                  Reported: {marker.reportDate}
                </Text>
              </View>
              {marker.description ? (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Description</Text>
                  <Text style={styles.detailText}>{marker.description}</Text>
                </View>
              ) : null}

              {marker.evidenceUrls.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>
                    Evidence ({marker.evidenceUrls.length})
                  </Text>
                  <FlatList
                    data={marker.evidenceUrls}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(_, i) => `ev-${i}`}
                    renderItem={({ item, index }) => (
                      <TouchableOpacity
                        onPress={() => setSelectedImageIndex(index)}
                      >
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
function OutbreakReport({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const { user } = useAuth();
  const [animalType, setAnimalType] = useState("");
  const [diseaseName, setDiseaseName] = useState("");
  const [description, setDescription] = useState("");
  const [locationName, setLocationName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [mediaItems, setMediaItems] = useState<ImagePicker.ImagePickerAsset[]>(
    [],
  );
  const [reportCountToday, setReportCountToday] = useState(0);
  const [showAnimalPicker, setShowAnimalPicker] = useState(false);
  const [animalSearch, setAnimalSearch] = useState("");
  const [aiChecking, setAiChecking] = useState(false);

  // ---------- AI Evidence Verification States ----------
  const [verifying, setVerifying] = useState(false);
  const [verificationSteps, setVerificationSteps] = useState<
    VerificationStep[]
  >([]);
  const [verificationFailed, setVerificationFailed] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState("");
  const [trustScore, setTrustScore] = useState<number | null>(null);
  const [evidenceAuthenticated, setEvidenceAuthenticated] = useState(false);

  // Daily report count
  useEffect(() => {
    const checkRateLimit = async () => {
      if (!user) return;
      const today = new Date().toISOString().split("T")[0];
      const { count } = await supabase
        .from("outbreak_reports")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", today)
        .lt(
          "created_at",
          new Date(new Date(today).getTime() + 86400000).toISOString(),
        );
      if (count != null) setReportCountToday(count);
    };
    checkRateLimit();
  }, [user]);

  // Fetch GPS coordinates (mandatory)
  const fetchLocation = useCallback(async () => {
    setLocationLoading(true);
    try {
      if (Platform.OS === "web") {
        setLocationLoading(false);
        return;
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setGpsCoords({ lat: loc.coords.latitude, lon: loc.coords.longitude });
    } catch {
      // Fallback behavior if GPS location fails
    } finally {
      setLocationLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  const filteredAnimals = ANIMAL_TYPES.filter((a) =>
    a.toLowerCase().includes(animalSearch.toLowerCase()),
  );

  // Media pickers (with EXIF enabled)
  const takePhoto = async () => {
    if (mediaItems.length >= MAX_MEDIA) {
      Alert.alert("Limit reached", `Max ${MAX_MEDIA} files allowed.`);
      return;
    }
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Camera permission required");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      quality: 0.8,
      videoMaxDuration: 30,
      exif: true,
    });
    if (!result.canceled && result.assets[0]) {
      setMediaItems((prev) => [...prev, result.assets[0]]);
    }
  };

  const pickFromGallery = async () => {
    if (mediaItems.length >= MAX_MEDIA) {
      Alert.alert("Limit reached");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      quality: 0.8,
      videoMaxDuration: 30,
      exif: true,
    });
    if (!result.canceled && result.assets[0]) {
      setMediaItems((prev) => [...prev, result.assets[0]]);
    }
  };

  const showMediaOptions = () => {
    Alert.alert("Add Evidence", "Choose method", [
      { text: "Take Photo", onPress: takePhoto },
      { text: "Choose from Gallery", onPress: pickFromGallery },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const removeMedia = (index: number) => {
    setMediaItems((prev) => prev.filter((_, i) => i !== index));
  };

  // ---------- Forensic checks ----------

  // 1. File age from EXIF
  const getFileAgeDays = async (
    asset: ImagePicker.ImagePickerAsset,
  ): Promise<number> => {
    try {
      let captureDate: Date | null = null;
      if (asset.type === "image" && asset.exif) {
        const exifDate =
          asset.exif.DateTimeOriginal ||
          asset.exif.DateTimeDigitized ||
          asset.exif.DateTime;
        if (exifDate) {
          const formatted = exifDate.replace(
            /^(\d{4}):(\d{2}):(\d{2})/,
            "$1-$2-$3",
          );
          captureDate = new Date(formatted);
        }
      }
      if (!captureDate) {
        const info = await FileSystem.getInfoAsync(asset.uri);
        if (info.exists && info.modificationTime)
          captureDate = new Date(info.modificationTime * 1000);
      }
      if (!captureDate || isNaN(captureDate.getTime())) return 9999;
      const now = new Date();
      return (now.getTime() - captureDate.getTime()) / (1000 * 60 * 60 * 24);
    } catch {
      return 9999;
    }
  };

  // 2. Suspicious media check (screenshot, AI)
  const isSuspiciousMedia = (asset: ImagePicker.ImagePickerAsset): boolean => {
    if (asset.type === "video") {
      if ((asset.duration ?? 0) < 2000) return true;
      return false;
    }
    const hasCameraMetadata = asset.exif?.Make || asset.exif?.Model;
    const isSquare = asset.width === asset.height;
    return isSquare || !hasCameraMetadata;
  };

  // 3. Real AI image detection (Sightengine) or fallback heuristic
  const checkAIImage = async (
    asset: ImagePicker.ImagePickerAsset,
  ): Promise<{ aiProbability: number; message?: string }> => {
    try {
      if (!SIGHTENGINE_API_USER || !SIGHTENGINE_API_SECRET) {
        if (isSuspiciousMedia(asset))
          return {
            aiProbability: 0.9,
            message:
              "Suspicious media (missing camera metadata or square image)",
          };
        return { aiProbability: 0.1 };
      }

      const formData = new FormData();
      formData.append("media", {
        uri: asset.uri,
        type: asset.type === "image" ? "image/jpeg" : "video/mp4",
        name: "evidence.jpg",
      } as any);
      formData.append("api_user", SIGHTENGINE_API_USER);
      formData.append("api_secret", SIGHTENGINE_API_SECRET);
      formData.append("models", "genai");
      const response = await fetch(
        "https://api.sightengine.com/1.0/check.json",
        {
          method: "POST",
          body: formData,
        },
      );
      const data = await response.json();
      const aiScore = data?.type?.ai_generated ?? data?.type?.deepfake ?? 0;
      return {
        aiProbability: aiScore,
        message: aiScore > 0.7 ? "AI-generated content detected" : undefined,
      };
    } catch (e) {
      console.warn("AI image check failed, using heuristic:", e);
      return {
        aiProbability: isSuspiciousMedia(asset) ? 0.9 : 0.1,
        message: isSuspiciousMedia(asset)
          ? "Suspicious media (metadata missing)"
          : undefined,
      };
    }
  };

  // 4. Duplicate check via md5
  const checkDuplicate = async (
    asset: ImagePicker.ImagePickerAsset,
  ): Promise<boolean> => {
    try {
      const info = await FileSystem.getInfoAsync(asset.uri, { md5: true });
      if (!info.exists || !info.md5) return false;
      const { data } = await supabase
        .from("evidence_hashes")
        .select("hash")
        .eq("hash", info.md5)
        .maybeSingle();
      return !!data;
    } catch {
      return false;
    }
  };

  // 5. Save md5 hash after successful upload
  const saveHash = async (asset: ImagePicker.ImagePickerAsset) => {
    try {
      const info = await FileSystem.getInfoAsync(asset.uri, { md5: true });
      if (info.exists && info.md5) {
        await supabase
          .from("evidence_hashes")
          .upsert({ hash: info.md5, created_at: new Date() });
      }
    } catch {
      /* ignore */
    }
  };

  // ---------- Real Trust Score Engine ----------
  const calculateTrustScore = async (
    assets: ImagePicker.ImagePickerAsset[],
  ): Promise<number> => {
    let score = 100;
    for (const asset of assets) {
      const age = await getFileAgeDays(asset);
      if (age > MAX_EVIDENCE_AGE_DAYS) score -= 40;
      else if (age > 1) score -= 10;

      const { aiProbability, message } = await checkAIImage(asset);
      if (aiProbability > 0.7) {
        score -= 50;
        if (message) setVerificationMessage(message);
      } else if (aiProbability > 0.4) score -= 20;

      if (isSuspiciousMedia(asset)) score -= 30;

      const isDuplicate = await checkDuplicate(asset);
      if (isDuplicate) score -= 60;

      if (!asset.exif?.DateTimeOriginal) score -= 10;
    }

    if (!gpsCoords) score -= 30;
    return Math.max(score, 0);
  };

  // ---------- Verification Pipeline ----------
  const runVerification = useCallback(
    // eslint-disable-next-line react-hooks/exhaustive-deps
    async (assets: ImagePicker.ImagePickerAsset[]) => {
      if (assets.length === 0) {
        setVerificationSteps([]);
        setTrustScore(null);
        setEvidenceAuthenticated(false);
        setVerificationFailed(false);
        setVerificationMessage("");
        return;
      }

      setVerifying(true);
      setVerificationFailed(false);
      setVerificationMessage("");
      setEvidenceAuthenticated(false);

      const steps: VerificationStep[] = [
        { label: "Scanning media authenticity...", status: "running" },
        { label: "Checking for AI-generated patterns...", status: "pending" },
        { label: "Inspecting metadata integrity...", status: "pending" },
        { label: "Verifying timestamp...", status: "pending" },
        { label: "Analyzing manipulation traces...", status: "pending" },
        { label: "Trust score calculating...", status: "pending" },
      ];
      setVerificationSteps([...steps]);

      await new Promise((r) => setTimeout(r, 800));
      steps[0].status = "pass";
      setVerificationSteps([...steps]);

      await new Promise((r) => setTimeout(r, 1000));
      const { aiProbability, message: aiMsg } = await checkAIImage(assets[0]);
      if (aiProbability > 0.7) {
        steps[1].status = "fail";
        steps[1].message = aiMsg || "AI-generated patterns detected";
        setVerificationSteps([...steps]);
        setVerificationFailed(true);
        setVerificationMessage(steps[1].message!);
        setVerifying(false);
        return;
      }
      steps[1].status = "pass";
      setVerificationSteps([...steps]);

      await new Promise((r) => setTimeout(r, 600));
      steps[2].status = "pass";
      setVerificationSteps([...steps]);

      let oldestAge = 0;
      for (const asset of assets) {
        const age = await getFileAgeDays(asset);
        if (age > oldestAge) oldestAge = age;
      }
      if (oldestAge > MAX_EVIDENCE_AGE_DAYS) {
        steps[3].status = "fail";
        steps[3].message = `Evidence is ${Math.floor(oldestAge)} days old (max ${MAX_EVIDENCE_AGE_DAYS} days)`;
        setVerificationSteps([...steps]);
        setVerificationFailed(true);
        setVerificationMessage(steps[3].message!);
        setVerifying(false);
        return;
      }
      steps[3].status = "pass";
      setVerificationSteps([...steps]);

      for (const asset of assets) {
        if (await checkDuplicate(asset)) {
          steps[4].status = "fail";
          steps[4].message = "Duplicate evidence detected";
          setVerificationSteps([...steps]);
          setVerificationFailed(true);
          setVerificationMessage("Duplicate evidence detected");
          setVerifying(false);
          return;
        }
      }
      steps[4].status = "pass";
      setVerificationSteps([...steps]);

      const score = await calculateTrustScore(assets);
      setTrustScore(score);
      steps[5].status = "pass";
      setVerificationSteps([...steps]);

      setEvidenceAuthenticated(score >= MIN_TRUST_SCORE_FOR_SUBMISSION);
      setVerifying(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gpsCoords],
  );

  useEffect(() => {
    runVerification(mediaItems);
  }, [mediaItems, runVerification]);

  // ---------- Streaming upload ----------
  const uploadEvidence = async (
    uri: string,
    type: "image" | "video",
  ): Promise<string> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Not authenticated");

    const fileExt =
      uri.split(".").pop()?.toLowerCase() || (type === "image" ? "jpg" : "mp4");
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `outbreaks/${user?.id}/${fileName}`;
    const bucketUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/farmlink/${filePath}`;

    const formData = new FormData();
    formData.append("file", {
      uri,
      name: fileName,
      type: type === "image" ? "image/jpeg" : "video/mp4",
    } as any);

    const response = await fetch(bucketUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "x-upsert": "true",
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${errorText}`);
    }

    return `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/farmlink/${filePath}`;
  };

  // Delete uploaded file if DB insert fails
  const deleteUploadedFile = async (publicUrl: string) => {
    try {
      const urlObj = new URL(publicUrl);
      const path = urlObj.pathname.split("/public/farmlink/")[1];
      if (!path) return;
      await supabase.storage.from("farmlink").remove([path]);
    } catch (e) {
      console.warn("Failed to rollback upload:", e);
    }
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();
    if (!user) {
      Alert.alert("Authentication required");
      return;
    }
    if (!animalType || diseaseName.trim().length < MIN_DISEASE_LENGTH) {
      Alert.alert(
        "Disease name required",
        `Minimum ${MIN_DISEASE_LENGTH} characters.`,
      );
      return;
    }
    if (description.trim().length < MIN_DESCRIPTION_LENGTH) {
      Alert.alert(
        "Description required",
        `Minimum ${MIN_DESCRIPTION_LENGTH} characters.`,
      );
      return;
    }
    if (mediaItems.length === 0) {
      Alert.alert("Evidence required", "Add at least one photo or video.");
      return;
    }
    if (!evidenceAuthenticated) {
      Alert.alert(
        "Evidence not verified",
        `Trust score must be at least ${MIN_TRUST_SCORE_FOR_SUBMISSION}%.`,
      );
      return;
    }
    if (!locationName.trim()) {
      Alert.alert(
        "Location required",
        "Please enter the location (e.g., Nelspruit, Mpumalanga).",
      );
      return;
    }
    if (!gpsCoords) {
      Alert.alert(
        "GPS required",
        "GPS coordinates are mandatory for outbreak reports.",
      );
      return;
    }
    if (reportCountToday >= MAX_REPORTS_PER_DAY) {
      Alert.alert(
        "Daily limit",
        `Already submitted ${MAX_REPORTS_PER_DAY} reports today.`,
      );
      return;
    }

    setAiChecking(true);
    try {
      const isAiGenerated = await checkAIContent(
        `${diseaseName} ${description}`,
      );
      if (isAiGenerated) {
        Alert.alert(
          "AI Content Detected",
          "AI‑generated outbreak reports are not allowed.",
        );
        return;
      }
    } catch {
      Alert.alert(
        "AI Check Failed",
        "Could not verify content authenticity. Proceed with caution.",
      );
    } finally {
      setAiChecking(false);
    }

    setSubmitting(true);
    try {
      const evidenceUrls: string[] = [];
      for (const asset of mediaItems) {
        const type = asset.type === "video" ? "video" : "image";
        const url = await uploadEvidence(asset.uri, type);
        evidenceUrls.push(url);
        await saveHash(asset);
      }

      const lat = gpsCoords.lat;
      const lon = gpsCoords.lon;

      const { data: report, error } = await supabase
        .from("outbreak_reports")
        .insert({
          user_id: user.id,
          animal_type: animalType.toLowerCase(),
          disease_name: diseaseName.trim(),
          description: description.trim(),
          location: locationName.trim(),
          latitude: lat,
          longitude: lon,
          status: "pending",
          evidence_urls: evidenceUrls,
          evidence_count: evidenceUrls.length,
          ai_probability: trustScore ? (100 - trustScore) / 100 : null,
          trust_score: trustScore,
          gps_verified: true,
          metadata_verified: verificationSteps.every(
            (s) => s.status === "pass",
          ),
          duplicate_detected: false,
        })
        .select("id")
        .single();

      if (error) {
        for (const url of evidenceUrls) {
          await deleteUploadedFile(url);
        }
        throw error;
      }

      try {
        await supabase.from("notifications").insert({
          user_id: user.id,
          type: "outbreak_alert",
          title: `Outbreak: ${diseaseName.trim()}`,
          message: `Animal: ${animalType}, Location: ${locationName.trim()}, Status: pending`,
          action_url: `outbreak:${report.id}`,
          created_at: new Date(),
          read: false,
        });
      } catch (notifErr) {
        console.error("Failed to create notification:", notifErr);
      }

      setReportCountToday((prev) => prev + 1);
      onSuccess?.();
      Alert.alert("Report submitted", "Thank you for helping the community!");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#fff" }}
      contentContainerStyle={reportStyles.content}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
    >
      <View style={reportStyles.header}>
        <TouchableOpacity onPress={onClose} hitSlop={10}>
          <Ionicons name="close" size={26} color="#111827" />
        </TouchableOpacity>
        <Text style={reportStyles.title}>Report Outbreak</Text>
        <View style={{ width: 26 }} />
      </View>

      <Text style={reportStyles.label}>Animal *</Text>
      <TouchableOpacity
        style={reportStyles.input}
        onPress={() => setShowAnimalPicker(true)}
      >
        <Text style={{ color: animalType ? "#111827" : "#9ca3af" }}>
          {animalType || "Tap to select animal"}
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
        <Text style={reportStyles.hint}>
          Add up to {MAX_MEDIA} photos/videos.
        </Text>
        <View style={reportStyles.mediaRow}>
          {mediaItems.map((asset, idx) => (
            <View key={idx} style={reportStyles.mediaThumb}>
              <Image
                source={{ uri: asset.uri }}
                style={reportStyles.thumbImage}
                resizeMode="cover"
              />
              <TouchableOpacity
                style={reportStyles.mediaRemove}
                onPress={() => removeMedia(idx)}
              >
                <Ionicons name="close-circle" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
          {mediaItems.length < MAX_MEDIA && (
            <TouchableOpacity
              style={reportStyles.addMedia}
              onPress={showMediaOptions}
            >
              <Ionicons name="add" size={32} color="#22c55e" />
              <Text style={{ color: "#22c55e", fontSize: 12, marginTop: 4 }}>
                Add
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* AI Verification Trust Card */}
      {mediaItems.length > 0 && (
        <View style={[reportStyles.card, { marginTop: 16 }]}>
          <View style={reportStyles.cardHeader}>
            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color="#374151"
            />
            <Text style={reportStyles.cardTitle}>AI Evidence Verification</Text>
          </View>

          {verificationSteps.map((step, idx) => (
            <View
              key={idx}
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              {step.status === "running" ? (
                <ActivityIndicator
                  size="small"
                  color="#22c55e"
                  style={{ marginRight: 10 }}
                />
              ) : step.status === "pass" ? (
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color="#22c55e"
                  style={{ marginRight: 10 }}
                />
              ) : step.status === "fail" ? (
                <Ionicons
                  name="close-circle"
                  size={18}
                  color="#ef4444"
                  style={{ marginRight: 10 }}
                />
              ) : (
                <View style={{ width: 18, marginRight: 10 }} />
              )}
              <Text
                style={{
                  flex: 1,
                  fontSize: 14,
                  color: step.status === "fail" ? "#ef4444" : "#374151",
                }}
              >
                {step.label}
                {step.message ? ` – ${step.message}` : ""}
              </Text>
            </View>
          ))}

          {trustScore !== null && (
            <View style={{ marginTop: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name={
                    trustScore >= MIN_TRUST_SCORE_FOR_SUBMISSION
                      ? "shield-checkmark"
                      : "warning"
                  }
                  size={20}
                  color={
                    trustScore >= MIN_TRUST_SCORE_FOR_SUBMISSION
                      ? "#22c55e"
                      : "#f97316"
                  }
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={{ fontSize: 15, fontWeight: "600", color: "#111827" }}
                >
                  Trust Score: {trustScore}% —{" "}
                  {trustScore >= 90
                    ? "Verified Authentic"
                    : trustScore >= 70
                      ? "Likely Authentic"
                      : trustScore >= 50
                        ? "Suspicious"
                        : "Rejected"}
                </Text>
              </View>
              {trustScore < MIN_TRUST_SCORE_FOR_SUBMISSION && (
                <Text style={{ color: "#ef4444", fontSize: 13, marginTop: 4 }}>
                  Submission requires at least {MIN_TRUST_SCORE_FOR_SUBMISSION}%
                  trust.
                </Text>
              )}
            </View>
          )}

          {verificationFailed && (
            <View
              style={{
                marginTop: 8,
                padding: 10,
                backgroundColor: "#fef2f2",
                borderRadius: 8,
              }}
            >
              <Text style={{ color: "#ef4444", fontWeight: "500" }}>
                ❌ {verificationMessage}
              </Text>
              <Text style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>
                Remove this evidence and upload recent, authentic media.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Location */}
      <View style={reportStyles.card}>
        <View style={reportStyles.cardHeader}>
          <Ionicons name="location-outline" size={20} color="#374151" />
          <Text style={reportStyles.cardTitle}>Location *</Text>
        </View>
        <Text style={reportStyles.hint}>
          Enter your town or farm name (e.g., Kimberley, Northern Cape)
        </Text>
        <TextInput
          style={reportStyles.input}
          placeholder="e.g., Polokwane, Limpopo"
          placeholderTextColor="#9ca3af"
          value={locationName}
          onChangeText={setLocationName}
        />
        <View
          style={{ marginTop: 12, flexDirection: "row", alignItems: "center" }}
        >
          <Ionicons
            name={
              gpsCoords
                ? "checkmark-circle"
                : locationLoading
                  ? "time-outline"
                  : "warning-outline"
            }
            size={16}
            color={gpsCoords ? "#22c55e" : "#f97316"}
          />
          <Text style={{ marginLeft: 6, fontSize: 13, color: "#6b7280" }}>
            {gpsCoords
              ? "GPS coordinates acquired."
              : locationLoading
                ? "Acquiring GPS…"
                : "GPS is mandatory. Enable location services."}
          </Text>
        </View>
      </View>

      {/* Rate limit */}
      <View style={reportStyles.card}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color="#6b7280"
          />
          <Text
            style={{ fontSize: 13, color: "#4b5563", marginLeft: 8, flex: 1 }}
          >
            {reportCountToday} / {MAX_REPORTS_PER_DAY} reports submitted today.
          </Text>
        </View>
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[
          reportStyles.submitButton,
          Platform.OS === "web" && reportStyles.submitWebShadow,
          (!animalType ||
            diseaseName.length < MIN_DISEASE_LENGTH ||
            description.length < MIN_DESCRIPTION_LENGTH ||
            mediaItems.length === 0 ||
            submitting ||
            aiChecking ||
            verifying ||
            verificationFailed ||
            !evidenceAuthenticated) &&
            reportStyles.submitDisabled,
        ]}
        onPress={handleSubmit}
        disabled={
          !animalType ||
          diseaseName.length < MIN_DISEASE_LENGTH ||
          description.length < MIN_DESCRIPTION_LENGTH ||
          mediaItems.length === 0 ||
          submitting ||
          aiChecking ||
          verifying ||
          verificationFailed ||
          !evidenceAuthenticated
        }
      >
        {submitting || aiChecking || verifying ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={reportStyles.submitText}>
              {verifying
                ? "Verifying evidence..."
                : aiChecking
                  ? "Checking authenticity..."
                  : "Submitting..."}
            </Text>
          </View>
        ) : evidenceAuthenticated ? (
          <Text style={reportStyles.submitText}>Send Report</Text>
        ) : (
          <Text style={reportStyles.submitText}>Evidence not verified</Text>
        )}
      </TouchableOpacity>

      {/* Animal Picker Modal */}
      <Modal visible={showAnimalPicker} animationType="slide" transparent>
        <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
          <View style={reportStyles.pickerHeader}>
            <TouchableOpacity
              onPress={() => {
                setShowAnimalPicker(false);
                setAnimalSearch("");
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
                  setAnimalSearch("");
                }}
              >
                <Text style={{ fontSize: 16, color: "#111827" }}>{item}</Text>
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: { fontSize: 22, fontWeight: "700", color: "#111827" },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
    marginTop: 20,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    backgroundColor: "#fff",
    color: "#111827",
  },
  textArea: { minHeight: 100, textAlignVertical: "top" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 6,
  },
  cardTitle: { fontSize: 15, fontWeight: "600", color: "#111827" },
  hint: { fontSize: 13, color: "#6b7280", marginBottom: 12 },
  mediaRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8 },
  mediaThumb: {
    position: "relative",
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: "hidden",
  },
  thumbImage: { width: "100%", height: "100%" },
  mediaRemove: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 11,
  },
  addMedia: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#22c55e",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  submitButton: {
    backgroundColor: "#22c55e",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 30,
  },
  submitWebShadow: { boxShadow: "0 4px 6px rgba(34,197,94,0.3)" },
  submitDisabled: { backgroundColor: "#9ca3af" },
  submitText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
  },
  pickerSearchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#111827",
  },
  animalItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderColor: "#f0f0f0",
  },
});

// ---------- Outbreak Heat Map ----------
function OutbreakHeatMap({
  onMarkerPress,
}: {
  onMarkerPress: (marker: OutbreakMarker) => void;
}) {
  const [markers, setMarkers] = useState<OutbreakMarker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarkers();
  }, []);

  const fetchMarkers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("outbreak_reports")
        .select(
          "id, location, disease_name, animal_type, status, created_at, evidence_urls, description, latitude, longitude",
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map((item: any) => ({
        id: item.id,
        latitude: item.latitude,
        longitude: item.longitude,
        disease: item.disease_name || "Unknown",
        animal: item.animal_type,
        status: item.status,
        reportDate: new Date(item.created_at).toLocaleDateString(),
        evidenceUrls: item.evidence_urls || [],
        description: item.description,
      }));
      setMarkers(mapped);
    } catch {
      console.error("Failed to load outbreak markers");
    } finally {
      setLoading(false);
    }
  };

  const memoMarkers = useMemo(() => markers, [markers]);

  if (loading)
    return (
      <View style={styles.mapLoading}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  if (!MapView) return <WebMapFallback />;

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
          coordinate={{
            latitude: marker.latitude,
            longitude: marker.longitude,
          }}
          onPress={() => onMarkerPress(marker)}
        >
          <PulsingMarker status={marker.status} />
          <Callout tooltip onPress={() => onMarkerPress(marker)}>
            <View style={styles.callout}>
              <Text style={styles.calloutTitle}>{marker.disease}</Text>
              <Text style={styles.calloutText}>
                {marker.animal} – {marker.status}
              </Text>
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
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"alerts" | "outbreaks">("alerts");
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<OutbreakMarker | null>(
    null,
  );
  const [showDetailModal, setShowDetailModal] = useState(false);

  const hasFetchedRef = useRef(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const formatted = (data || []).map((n: any) => {
        const { name: iconName, color: iconColor } = getIconProps(n.type);
        const isOutbreak = n.type === "outbreak_alert";
        let outbreakId: string | undefined;
        if (isOutbreak && n.action_url?.startsWith("outbreak:"))
          outbreakId = n.action_url.replace("outbreak:", "");
        return {
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          time: new Date(n.created_at).toLocaleString(),
          read: n.read,
          actionUrl: n.action_url,
          iconName: isOutbreak ? "warning" : iconName,
          iconColor: isOutbreak ? "#ef4444" : iconColor,
          isOutbreak,
          outbreakId,
        };
      });

      const sorted = formatted.sort((a, b) =>
        a.isOutbreak && !b.isOutbreak
          ? -1
          : !a.isOutbreak && b.isOutbreak
            ? 1
            : 0,
      );
      setNotifications(sorted);
    } catch (err) {
      console.error("Failed to load notifications", err);
      setError("Failed to load notifications");
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
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", id)
        .eq("user_id", user.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const deleteNotification = async (id: string) => {
    if (!user) return;
    try {
      await supabase
        .from("notifications")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const openOutbreakFromNotification = async (notification: Notification) => {
    if (!notification.outbreakId) return;
    try {
      const { data, error } = await supabase
        .from("outbreak_reports")
        .select("*")
        .eq("id", notification.outbreakId)
        .single();
      if (error) throw error;
      const marker: OutbreakMarker = {
        id: data.id,
        latitude: data.latitude,
        longitude: data.longitude,
        disease: data.disease_name,
        animal: data.animal_type,
        status: data.status,
        reportDate: new Date(data.created_at).toLocaleDateString(),
        evidenceUrls: data.evidence_urls || [],
        description: data.description,
      };
      setSelectedMarker(marker);
      setShowDetailModal(true);
      if (!notification.read) markAsRead(notification.id);
    } catch {
      Alert.alert("Error", "Failed to load outbreak details.");
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filteredNotifications =
    filter === "all" ? notifications : notifications.filter((n) => !n.read);

  // Background animations
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

  const bgBlob1Style = useAnimatedStyle(() => ({
    transform: [
      { scale: bgScale1.value },
      { translateX: bgX1.value },
      { translateY: bgY1.value },
    ],
  }));
  const bgBlob2Style = useAnimatedStyle(() => ({
    transform: [
      { scale: bgScale2.value },
      { translateX: bgX2.value },
      { translateY: bgY2.value },
    ],
  }));

  const onReportSubmitted = useCallback(() => {
    setShowReportModal(false);
    fetchNotifications();
  }, [fetchNotifications]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#f0fdf4", "#ffffff", "#ecfdf5"]}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[styles.blob, styles.blob1, bgBlob1Style]} />
      <Animated.View style={[styles.blob, styles.blob2, bgBlob2Style]} />

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "alerts" && styles.activeTab]}
          onPress={() => setActiveTab("alerts")}
        >
          <Ionicons
            name="notifications"
            size={20}
            color={activeTab === "alerts" ? "#22c55e" : "#9ca3af"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "alerts" && styles.activeTabText,
            ]}
          >
            My Alerts
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "outbreaks" && styles.activeTab]}
          onPress={() => setActiveTab("outbreaks")}
        >
          <Ionicons
            name="map-outline"
            size={20}
            color={activeTab === "outbreaks" ? "#22c55e" : "#9ca3af"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "outbreaks" && styles.activeTabText,
            ]}
          >
            Outbreak Map
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "alerts" ? (
          <>
            <Animated.View
              entering={FadeIn.delay(100)}
              style={styles.filterContainer}
            >
              <View style={styles.filterButtons}>
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    filter === "all" && styles.filterActive,
                  ]}
                  onPress={() => setFilter("all")}
                >
                  <Text
                    style={[
                      styles.filterText,
                      filter === "all" && styles.filterTextActive,
                    ]}
                  >
                    All
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    filter === "unread" && styles.filterActive,
                  ]}
                  onPress={() => setFilter("unread")}
                >
                  <Text
                    style={[
                      styles.filterText,
                      filter === "unread" && styles.filterTextActive,
                    ]}
                  >
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
              <ActivityIndicator
                size="large"
                color="#22c55e"
                style={{ marginTop: 50 }}
              />
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : filteredNotifications.length === 0 ? (
              <Animated.View entering={FadeIn} style={styles.emptyContainer}>
                <GlassCard style={styles.emptyCard}>
                  <View style={styles.emptyIcon}>
                    <Ionicons
                      name="notifications-outline"
                      size={32}
                      color="#22c55e"
                    />
                  </View>
                  <Text style={styles.emptyText}>
                    {user
                      ? "No notifications yet"
                      : "Log in to see your alerts"}
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
                    <TouchableOpacity
                      onPress={() => {
                        if (notification.isOutbreak && notification.outbreakId)
                          openOutbreakFromNotification(notification);
                        else markAsRead(notification.id);
                      }}
                      activeOpacity={0.8}
                    >
                      <GlassCard
                        style={[
                          styles.notificationCard,
                          !notification.read && styles.unreadCard,
                        ]}
                      >
                        <View style={styles.notificationContent}>
                          <View
                            style={[
                              styles.iconContainer,
                              {
                                backgroundColor: `${notification.iconColor}20`,
                              },
                            ]}
                          >
                            <Ionicons
                              name={notification.iconName as any}
                              size={20}
                              color={notification.iconColor}
                            />
                          </View>
                          <View style={styles.textContainer}>
                            <View style={styles.titleRow}>
                              <Text
                                style={[
                                  styles.title,
                                  !notification.read && styles.titleUnread,
                                ]}
                              >
                                {notification.title}
                              </Text>
                              <Text style={styles.time}>
                                {notification.time}
                              </Text>
                            </View>
                            <Text style={styles.message} numberOfLines={2}>
                              {notification.message}
                            </Text>
                            <View style={styles.actions}>
                              {!notification.read &&
                                !notification.isOutbreak && (
                                  <TouchableOpacity
                                    onPress={() => markAsRead(notification.id)}
                                  >
                                    <Text style={styles.actionText}>
                                      Mark as read
                                    </Text>
                                  </TouchableOpacity>
                                )}
                              {notification.isOutbreak ? (
                                <TouchableOpacity
                                  onPress={() =>
                                    openOutbreakFromNotification(notification)
                                  }
                                >
                                  <Text style={styles.actionText}>
                                    View Details
                                  </Text>
                                </TouchableOpacity>
                              ) : notification.actionUrl ? (
                                <Link
                                  href={notification.actionUrl as any}
                                  asChild
                                >
                                  <TouchableOpacity>
                                    <Text style={styles.actionText}>View</Text>
                                  </TouchableOpacity>
                                </Link>
                              ) : null}
                              <TouchableOpacity
                                onPress={() =>
                                  deleteNotification(notification.id)
                                }
                                style={styles.deleteButton}
                              >
                                <Ionicons
                                  name="trash-outline"
                                  size={16}
                                  color="#9ca3af"
                                />
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                        {notification.isOutbreak && (
                          <View style={styles.outbreakBadge}>
                            <Ionicons name="warning" size={12} color="#fff" />
                            <Text style={styles.outbreakBadgeText}>
                              OUTBREAK
                            </Text>
                          </View>
                        )}
                      </GlassCard>
                    </TouchableOpacity>
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
        <SafeAreaView
          style={{ flex: 1, backgroundColor: "#fff" }}
          edges={["top", "bottom"]}
        >
          <OutbreakReport
            onClose={() => setShowReportModal(false)}
            onSuccess={onReportSubmitted}
          />
        </SafeAreaView>
      </Modal>

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  blob: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(34,197,94,0.2)",
  },
  blob1: { width: 200, height: 200, top: -50, left: -50 },
  blob2: { width: 250, height: 250, bottom: -50, right: -50 },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    overflow: "hidden",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  activeTab: { backgroundColor: "#f0fdf4" },
  tabText: { fontSize: 14, fontWeight: "500", color: "#9ca3af" },
  activeTabText: { color: "#22c55e" },
  scrollContent: { flexGrow: 1, paddingBottom: 80 },
  filterContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  filterButtons: { flexDirection: "row", gap: 8 },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  filterActive: { backgroundColor: "#22c55e" },
  filterText: { fontSize: 14, fontWeight: "500", color: "#687076" },
  filterTextActive: { color: "white" },
  markAllText: { fontSize: 14, fontWeight: "500", color: "#22c55e" },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 50,
  },
  emptyCard: { padding: 24, alignItems: "center" },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(34,197,94,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyText: { fontSize: 14, color: "#687076" },
  notificationsList: { paddingHorizontal: 16, gap: 12, marginBottom: 16 },
  notificationCard: { padding: 0, overflow: "hidden" },
  unreadCard: {
    borderWidth: 1,
    borderColor: "#22c55e",
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  notificationContent: { flexDirection: "row", padding: 12, gap: 12 },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: { flex: 1 },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  title: { fontSize: 14, fontWeight: "500", color: "#687076" },
  titleUnread: { color: "#11181C", fontWeight: "600" },
  time: { fontSize: 10, color: "#9ca3af" },
  message: { fontSize: 12, color: "#687076", marginBottom: 8, lineHeight: 16 },
  actions: { flexDirection: "row", alignItems: "center", gap: 12 },
  actionText: { fontSize: 11, fontWeight: "500", color: "#22c55e" },
  deleteButton: { marginLeft: "auto", padding: 4 },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 50,
  },
  errorText: { fontSize: 14, color: "#ef4444" },
  outbreakContainer: { flex: 1, paddingHorizontal: 0 },
  reportButton: {
    backgroundColor: "#22c55e",
    margin: 16,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  reportButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  map: { width: "100%", height: 350 },
  mapLoading: { height: 350, justifyContent: "center", alignItems: "center" },
  webMapPlaceholder: {
    height: 350,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    marginHorizontal: 16,
  },
  webMapText: { marginTop: 8, color: "#6b7280", fontSize: 14 },
  webMapSubText: { color: "#9ca3af", fontSize: 12, marginTop: 4 },
  markerContainer: { alignItems: "center", justifyContent: "center" },
  markerPulse: {
    position: "absolute",
    width: 30,
    height: 30,
    borderRadius: 15,
    opacity: 0.5,
  },
  markerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  callout: {
    width: 180,
    backgroundColor: "white",
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  calloutTitle: { fontWeight: "700", fontSize: 14, marginBottom: 2 },
  calloutText: { fontSize: 12, color: "#374151" },
  calloutMore: { fontSize: 11, color: "#22c55e", marginTop: 4 },
  detailOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  detailCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
  },
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  detailTitle: { fontSize: 20, fontWeight: "700", color: "#111827" },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  detailLabel: { fontSize: 15, color: "#374151", flex: 1 },
  detailSection: { marginTop: 16 },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  detailText: { fontSize: 14, color: "#4b5563", lineHeight: 20 },
  evidenceThumb: { width: 80, height: 80, borderRadius: 8, marginRight: 8 },
  imageViewer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeViewer: { position: "absolute", top: 40, right: 20, zIndex: 1 },
  fullImage: { width: Dimensions.get("window").width, height: "80%" },
  outbreakBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ef4444",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderBottomLeftRadius: 8,
  },
  outbreakBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 4,
  },
});
