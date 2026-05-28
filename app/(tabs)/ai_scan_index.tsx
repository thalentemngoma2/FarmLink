import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as FileSystem from "expo-file-system/legacy";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
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
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

type PlantState = "undergrowth" | "overgrowth" | "disease" | "healthy";
type PaymentDuration = "once" | "day" | "15days" | "month";

interface PlantAnalysis {
  state: PlantState;
  cause: string;
  solution: string;
  preventiveTips: string;
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

interface PaymentPlan {
  id: string;
  name: string;
  price: number;
  description: string;
  duration: PaymentDuration;
}

const rawKindwiseApiKey = process.env.EXPO_PUBLIC_KINDWISE_API_KEY;

if (!rawKindwiseApiKey) {
  throw new Error("Missing EXPO_PUBLIC_KINDWISE_API_KEY environment variable");
}

const KINDWISE_API_KEY = rawKindwiseApiKey;

const BASE_URL =
  process.env.EXPO_PUBLIC_KINDWISE_API_URL ||
  "https://crop.kindwise.com/api/v1/identification";

const KINDWISE_API_URL = (() => {
  try {
    const url = new URL(BASE_URL);
    url.searchParams.set("details", "health_assessment");
    return url.toString();
  } catch {
    const separator = BASE_URL.includes("?") ? "&" : "?";
    return `${BASE_URL}${separator}details=health_assessment`;
  }
})();

const PAYMENT_PLANS: PaymentPlan[] = [
  {
    id: "1",
    name: "Single Scan",
    price: 10,
    description: "One extra scan",
    duration: "once",
  },
  {
    id: "2",
    name: "Day Pass",
    price: 100,
    description: "10 scans for today",
    duration: "day",
  },
  {
    id: "3",
    name: "15 Day Pass",
    price: 250,
    description: "Unlimited scans for 15 days",
    duration: "15days",
  },
  {
    id: "4",
    name: "1 Month Pass",
    price: 1500,
    description: "Unlimited scans for one month",
    duration: "month",
  },
];

const GATEWAYS = [
  { id: "ozow", name: "Ozow", icon: "wallet-outline" },
  { id: "ikhokha", name: "iKhokha", icon: "card-outline" },
  { id: "yoco", name: "Yoco", icon: "cash-outline" },
];

async function imageUriToBase64(uri: string): Promise<string> {
  if (Platform.OS === "web") {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    }).then((dataUrl) => {
      const base64Index = dataUrl.indexOf(";base64,");
      return base64Index !== -1 ? dataUrl.substring(base64Index + 8) : dataUrl;
    });
  }

  return await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

const formatRelativeTime = (isoString?: string) => {
  if (!isoString) return "Just now";

  const date = new Date(isoString);
  if (Number.isNaN(date.getTime()) || date.getFullYear() <= 1970) {
    return "Just now";
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }

  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
};

const getStatusColor = (state: PlantState) => {
  switch (state) {
    case "healthy":
      return "#22c55e";
    case "disease":
      return "#ef4444";
    case "undergrowth":
      return "#f97316";
    case "overgrowth":
      return "#a855f7";
    default:
      return "#6b7280";
  }
};

const getStatusEmoji = (state: PlantState) => {
  switch (state) {
    case "healthy":
      return "✅";
    case "disease":
      return "⚠️";
    case "undergrowth":
      return "📉";
    case "overgrowth":
      return "📈";
    default:
      return "🌿";
  }
};

const getCommunityStatusColor = (status: string) => {
  if (status === "Healthy") return "#22c55e";
  if (status === "Disease detected") return "#ef4444";
  if (status === "Undergrowth") return "#f97316";
  if (status === "Overgrowth") return "#a855f7";
  return "#6b7280";
};

const isAbortError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;
  const maybeError = error as { name?: string; message?: string };
  return (
    maybeError.name === "AbortError" ||
    (typeof maybeError.message === "string" &&
      maybeError.message.toLowerCase().includes("abort"))
  );
};

const GlassCard = ({
  children,
  style,
  intensity = 20,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
}) => (
  <BlurView
    intensity={intensity}
    tint="light"
    style={[styles.glassCard, style]}
  >
    {children}
  </BlurView>
);

export default function FarmLinkPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [scanVisible, setScanVisible] = useState(false);
  const [scanStage, setScanStage] = useState<
    | "idle"
    | "searching"
    | "detected"
    | "hold"
    | "capturing"
    | "analyzing"
    | "result"
    | "error"
  >("idle");
  const [scanError, setScanError] = useState("");
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<PlantAnalysis | null>(
    null,
  );
  const [feedbackGiven, setFeedbackGiven] = useState(false);

  const [scanHistory, setScanHistory] = useState<UserScan[]>([]);
  const [communityScans, setCommunityScans] = useState<CommunityScan[]>([]);
  const [loadingCommunity, setLoadingCommunity] = useState(false);
  const [loadingScans, setLoadingScans] = useState(false);

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const isMountedRef = useRef(true);

  const [todayScanCount, setTodayScanCount] = useState(0);
  const [, setFreeLimitReached] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedGateway, setSelectedGateway] = useState<string | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [unlimitedUntil, setUnlimitedUntil] = useState<Date | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchTodayScanCount = useCallback(async () => {
    if (!user) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count, error } = await supabase
      .from("plant_scans")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", today.toISOString());

    if (!error && count !== null) {
      setTodayScanCount(count);
      setFreeLimitReached(
        count >= 3 && (!unlimitedUntil || unlimitedUntil < new Date()),
      );
    }
  }, [unlimitedUntil, user]);

  const fetchUserScans = useCallback(
    async (userId: string, signal?: AbortSignal) => {
      try {
        let query = supabase
          .from("plant_scans")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (signal) query = query.abortSignal(signal);

        const { data, error } = await query;
        if (error) throw error;
        if (!isMountedRef.current) return;

        setScanHistory(
          (data || []).map((scan: any) => ({
            id: String(scan.id),
            plantName: String(scan.plant_name || ""),
            imageUri: String(scan.image_url || ""),
            analysis: {
              state: scan.analysis_state as PlantState,
              cause: String(scan.analysis_cause || ""),
              solution: String(scan.analysis_solution || ""),
              preventiveTips: String(scan.analysis_preventive || ""),
              plantName: String(scan.plant_name || ""),
            },
            timestamp: String(scan.created_at || ""),
            synced: true,
          })),
        );
      } catch (error) {
        if (isAbortError(error)) return;
        throw error;
      }
    },
    [],
  );

  const fetchCommunityScans = useCallback(async (signal?: AbortSignal) => {
    setLoadingCommunity(true);

    try {
      let scansQuery = supabase
        .from("plant_scans")
        .select(
          "id, user_id, plant_name, image_url, analysis_state, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(10);

      if (signal) scansQuery = scansQuery.abortSignal(signal);

      const { data: scans, error } = await scansQuery;
      if (error) throw error;
      if (!isMountedRef.current) return;
      if (!scans || scans.length === 0) {
        setCommunityScans([]);
        return;
      }

      const userIds = [...new Set(scans.map((s) => s.user_id).filter(Boolean))];
      const userMap: Record<string, string> = {};

      userIds.forEach((id) => {
        userMap[id] = `Farmer_${id.slice(-4)}`;
      });

      if (userIds.length > 0) {
        try {
          let usersQuery = supabase
            .from("users")
            .select("user_id, username")
            .in("user_id", userIds);

          if (signal) usersQuery = usersQuery.abortSignal(signal);

          const { data: users, error: usersError } = await usersQuery;
          if (!usersError && users) {
            users.forEach((profile: any) => {
              userMap[String(profile.user_id)] = String(
                profile.username || userMap[profile.user_id],
              );
            });
          }
        } catch (error) {
          if (!isAbortError(error)) {
            console.warn("Could not fetch usernames - using fallback");
          }
        }
      }

      setCommunityScans(
        scans.map((scan: any) => ({
          id: String(scan.id),
          farmerName: userMap[scan.user_id] || "Anonymous Farmer",
          location: "Unknown Region",
          imageUri: String(scan.image_url || ""),
          plantName: String(scan.plant_name || ""),
          analysisState:
            scan.analysis_state === "healthy"
              ? "Healthy"
              : scan.analysis_state === "disease"
                ? "Disease detected"
                : scan.analysis_state === "undergrowth"
                  ? "Undergrowth"
                  : scan.analysis_state === "overgrowth"
                    ? "Overgrowth"
                    : "Unknown",
          timestamp: formatRelativeTime(scan.created_at),
        })),
      );
    } catch (error) {
      if (!isAbortError(error)) {
        console.error("Failed to load community scans:", error);
      }
    } finally {
      if (isMountedRef.current) setLoadingCommunity(false);
    }
  }, []);

  useEffect(() => {
    const abortController = new AbortController();

    const load = async () => {
      try {
        setLoadingScans(true);
        if (user) {
          await fetchUserScans(user.id, abortController.signal);
          await fetchTodayScanCount();
        }
        await fetchCommunityScans(abortController.signal);
      } catch (error) {
        if (!isAbortError(error)) {
          console.error("Scan loading error:", error);
        }
      } finally {
        if (isMountedRef.current) setLoadingScans(false);
      }
    };

    load();
    return () => abortController.abort();
  }, [fetchCommunityScans, fetchTodayScanCount, fetchUserScans, user]);

  const analyzeWithKindwise = useCallback(
    async (imageUri: string): Promise<PlantAnalysis> => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      try {
        const base64 = await imageUriToBase64(imageUri);
        const response = await fetch(KINDWISE_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Api-Key": KINDWISE_API_KEY,
          },
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
        const isPlant = result?.is_plant?.binary ?? true;

        if (!isPlant) {
          throw new Error(
            "No plant detected. Please try a clearer image of a leaf.",
          );
        }

        const cropSuggestions = result?.crop?.suggestions;
        const bestCrop =
          Array.isArray(cropSuggestions) && cropSuggestions.length > 0
            ? cropSuggestions[0]
            : null;
        const plantName =
          bestCrop?.name ?? bestCrop?.scientific_name ?? "Unknown crop";

        const diseaseSuggestions: any[] = result?.disease?.suggestions ?? [];
        const actualDiseases = diseaseSuggestions.filter(
          (suggestion) => suggestion.name?.toLowerCase() !== "healthy",
        );
        const topDisease = actualDiseases.length > 0 ? actualDiseases[0] : null;
        const isDiseased = topDisease && topDisease.probability > 0.3;

        let state: PlantState = "healthy";
        let cause = "No diseases detected.";
        let solution = "Continue your regular watering and feeding schedule.";
        let preventiveTips =
          "Keep an eye on plant health and practice crop rotation.";

        if (isDiseased) {
          state = "disease";
          const diseaseName = topDisease.name || "Unknown disease";
          const scientificName =
            topDisease.scientific_name &&
            topDisease.scientific_name !== diseaseName
              ? ` (*${topDisease.scientific_name}*)`
              : "";

          let detailedCause = `**${diseaseName}**${scientificName}\n\n`;

          if (topDisease.description) {
            detailedCause += topDisease.description + "\n\n";
          } else {
            detailedCause +=
              "This disease affects the plant's health and can reduce crop yield if left untreated.\n\n";
          }

          if (topDisease.treatment) {
            if (topDisease.treatment.chemical?.length) {
              detailedCause += `💊 **Chemical treatment:** ${topDisease.treatment.chemical.join(", ")}\n`;
            }
            if (topDisease.treatment.biological?.length) {
              detailedCause += `🧬 **Biological treatment:** ${topDisease.treatment.biological.join(", ")}\n`;
            }
            if (topDisease.treatment.mechanical?.length) {
              detailedCause += `🔧 **Mechanical treatment:** ${topDisease.treatment.mechanical.join(", ")}\n`;
            }
            if (topDisease.treatment.cultural?.length) {
              detailedCause += `🌾 **Cultural practices:** ${topDisease.treatment.cultural.join(", ")}\n`;
            }
            detailedCause += "\n";
          }

          solution = "Take the following steps to manage this disease:";

          if (topDisease.treatment?.chemical?.length) {
            solution += `\n- Apply chemical treatments like ${topDisease.treatment.chemical[0]}.`;
          } else if (topDisease.treatment?.biological?.length) {
            solution += `\n- Use biological control: ${topDisease.treatment.biological[0]}.`;
          } else {
            solution +=
              "\n- Consult an agronomist for specific chemical or biological treatment options.";
          }

          preventiveTips = topDisease.prevention?.length
            ? topDisease.prevention.map((tip: string) => `• ${tip}`).join("\n")
            : "• Use resistant varieties\n• Ensure proper plant spacing\n• Monitor regularly and remove infected plants";
          cause = detailedCause.trim();
        }

        return { state, cause, solution, preventiveTips, plantName };
      } catch (error: any) {
        clearTimeout(timeout);
        if (error.name === "AbortError") {
          throw new Error(
            "The request timed out. Please check your connection and try again.",
          );
        }
        throw error;
      }
    },
    [],
  );

  const uploadAndSaveScan = useCallback(
    async (imageUri: string, plant: string, analysis: PlantAnalysis) => {
      if (!user) throw new Error("Not authenticated");

      try {
        const response = await fetch(imageUri);
        if (!response.ok) throw new Error("Failed to read image file");

        const blob = await response.blob();
        const extCandidate = imageUri.split(".").pop();
        const ext =
          extCandidate &&
          extCandidate.length <= 4 &&
          !extCandidate.includes("/")
            ? extCandidate
            : "jpg";
        const path = `scans/${user.id}/${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("farmlink")
          .upload(path, blob, { contentType: "image/jpeg" });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("farmlink")
          .getPublicUrl(path);

        const { error: insertError } = await supabase
          .from("plant_scans")
          .insert({
            user_id: user.id,
            plant_name: plant,
            image_url: urlData.publicUrl,
            analysis_state: analysis.state,
            analysis_cause: analysis.cause,
            analysis_solution: analysis.solution,
            analysis_preventive: analysis.preventiveTips,
            created_at: new Date(),
          });

        if (insertError) throw insertError;
      } catch {
        Alert.alert(
          "Storage unavailable",
          "The scan could not be saved to your history, but your diagnosis is ready below.\n\n" +
            'Please ensure the "farmlink" bucket exists and the RLS policy for authenticated uploads is in place.',
        );
      }
    },
    [user],
  );

  const canScanNow = useCallback(() => {
    if (unlimitedUntil && unlimitedUntil > new Date()) return true;

    if (todayScanCount >= 3) {
      setShowPaywall(true);
      return false;
    }

    return true;
  }, [todayScanCount, unlimitedUntil]);

  const handlePayment = async () => {
    if (!selectedPlan || !selectedGateway) {
      Alert.alert(
        "Selection required",
        "Please select a plan and payment method.",
      );
      return;
    }

    setPaymentProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      const plan = PAYMENT_PLANS.find((item) => item.id === selectedPlan);
      if (!plan) throw new Error("Invalid plan");

      let newUnlimitedUntil: Date | null = null;

      if (plan.duration === "day") {
        newUnlimitedUntil = new Date();
        newUnlimitedUntil.setHours(23, 59, 59, 999);
      } else if (plan.duration === "15days") {
        newUnlimitedUntil = new Date();
        newUnlimitedUntil.setDate(newUnlimitedUntil.getDate() + 15);
      } else if (plan.duration === "month") {
        newUnlimitedUntil = new Date();
        newUnlimitedUntil.setMonth(newUnlimitedUntil.getMonth() + 1);
      }

      if (plan.duration === "once") {
        setFreeLimitReached(false);
        setTodayScanCount(2);
      } else {
        setUnlimitedUntil(newUnlimitedUntil);
      }

      await supabase.from("payments").insert({
        user_id: user?.id,
        plan: plan.name,
        gateway: selectedGateway,
        amount: plan.price,
        created_at: new Date(),
      });

      Alert.alert("Payment Successful", `You now have ${plan.description}.`);
      setShowPaywall(false);
      setSelectedPlan(null);
      setSelectedGateway(null);
    } catch (error: any) {
      Alert.alert("Payment failed", error.message || "Something went wrong.");
    } finally {
      setPaymentProcessing(false);
    }
  };

  const startScan = useCallback(async () => {
    setScanError("");

    if (!canScanNow()) return;

    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        setScanError("Camera permission is required.");
        setScanStage("error");
        return;
      }
    }

    setScanVisible(true);
    setScanStage("searching");
  }, [canScanNow, permission, requestPermission]);

  const handleAnalysis = useCallback(
    async (imageUri: string) => {
      setScanStage("analyzing");

      try {
        const analysis = await analyzeWithKindwise(imageUri);
        if (!isMountedRef.current) return;

        const plantName = analysis.plantName || "Unknown plant";
        await uploadAndSaveScan(imageUri, plantName, analysis).catch(() => {});
        if (!isMountedRef.current) return;

        setAnalysisResult(analysis);

        if (user) {
          await fetchUserScans(user.id);
          await fetchTodayScanCount();
        }

        setScanStage("result");
      } catch (error: any) {
        if (!isMountedRef.current) return;

        if (error.message?.includes("No plant detected")) {
          Alert.alert(
            "No plant found",
            "Please point the camera at a clear plant leaf and hold steady.",
          );
          setScanStage("searching");
        } else {
          console.error("Scan failed", error);
          setScanError(error.message || "Failed to analyze the plant.");
          setScanStage("error");
        }
      }
    },
    [
      analyzeWithKindwise,
      fetchTodayScanCount,
      fetchUserScans,
      uploadAndSaveScan,
      user,
    ],
  );

  useEffect(() => {
    if (scanStage === "searching") {
      const timer = setTimeout(() => {
        if (isMountedRef.current) setScanStage("detected");
      }, 1800);
      return () => clearTimeout(timer);
    }

    if (scanStage === "detected") {
      const timer = setTimeout(() => {
        if (isMountedRef.current) setScanStage("hold");
      }, 1200);
      return () => clearTimeout(timer);
    }

    if (scanStage === "hold") {
      const timer = setTimeout(async () => {
        if (!isMountedRef.current || !cameraRef.current) return;

        setScanStage("capturing");

        try {
          const photo = await cameraRef.current.takePictureAsync({
            quality: 0.8,
            base64: false,
          });

          if (!isMountedRef.current) return;
          setCapturedPhotoUri(photo.uri);
          handleAnalysis(photo.uri);
        } catch (error) {
          console.warn("Capture failed", error);
          setScanError("Could not capture photo. Please try again.");
          setScanStage("error");
        }
      }, 2000);

      return () => clearTimeout(timer);
    }

    return undefined;
  }, [handleAnalysis, scanStage]);

  const handleRateFeedback = async (helpful: boolean) => {
    if (feedbackGiven || !analysisResult) return;

    setFeedbackGiven(true);
    Alert.alert(
      "Thank you",
      helpful ? "Glad we could help!" : "We'll use your feedback to improve.",
    );
  };

  const handleTakeAction = () => {
    if (!analysisResult) return;

    Alert.alert(
      "Take Action",
      `${analysisResult.solution}\n\nFor more detailed guidance, check the Agri-Advisor in the community section.`,
    );
  };

  const closeScanner = () => {
    setScanVisible(false);
    setScanStage("idle");
    setCapturedPhotoUri(null);
    setAnalysisResult(null);
    setFeedbackGiven(false);
    setScanError("");
  };

  const bgScale = useSharedValue(1);
  const bgOpacity = useSharedValue(0.3);

  useEffect(() => {
    bgScale.value = withRepeat(withTiming(1.2, { duration: 8000 }), -1, true);
    bgOpacity.value = withRepeat(
      withTiming(0.5, { duration: 10000 }),
      -1,
      true,
    );
  }, [bgOpacity, bgScale]);

  const bg1Animated = useAnimatedStyle(() => ({
    transform: [{ scale: bgScale.value }],
    opacity: interpolate(
      bgOpacity.value,
      [0.3, 0.5],
      [0.3, 0.5],
      Extrapolate.CLAMP,
    ),
  }));

  const bg2Animated = useAnimatedStyle(() => ({
    transform: [{ scale: bgScale.value }],
    opacity: interpolate(
      bgOpacity.value,
      [0.2, 0.4],
      [0.2, 0.4],
      Extrapolate.CLAMP,
    ),
  }));

  const { width, height } = Dimensions.get("window");

  const scanRing = useSharedValue(1);

  useEffect(() => {
    if (
      scanStage === "searching" ||
      scanStage === "detected" ||
      scanStage === "hold"
    ) {
      scanRing.value = withRepeat(
        withTiming(1.2, {
          duration: 800,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true,
      );
    } else {
      scanRing.value = 1;
    }
  }, [scanRing, scanStage]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scanRing.value }],
    opacity: interpolate(
      scanRing.value,
      [1, 1.2],
      [0.4, 0.1],
      Extrapolate.CLAMP,
    ),
  }));

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <LinearGradient
          colors={["#f0fdf4", "#ffffff", "#ecfdf5"]}
          style={StyleSheet.absoluteFill}
        />

        <Animated.View
          style={[
            styles.bgBlob1,
            {
              left: -width * 0.2,
              top: -height * 0.2,
              width: width * 0.6,
              height: width * 0.6,
            },
            bg1Animated,
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
            styles.bgBlob2,
            {
              right: -width * 0.2,
              bottom: -height * 0.2,
              width: width * 0.7,
              height: width * 0.7,
            },
            bg2Animated,
          ]}
        >
          <BlurView
            intensity={50}
            tint="light"
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            entering={SlideInDown.duration(600)}
            style={styles.hero}
          >
            <Animated.View
              entering={ZoomIn.springify().delay(200)}
              style={styles.heroIcon}
            >
              <LinearGradient
                colors={["#22c55e", "#16a34a"]}
                style={styles.heroIconGradient}
              >
                <Ionicons name="leaf" size={32} color="white" />
              </LinearGradient>
            </Animated.View>

            <Text style={styles.heroTitle}>AI Plant Monitor</Text>
            <Text style={styles.heroSubtitle}>
              Identify diseases instantly - no typing needed
            </Text>
            <Text style={styles.scanLimitText}>
              {todayScanCount}/3 free scans today
              {unlimitedUntil &&
                unlimitedUntil > new Date() &&
                " (Premium active)"}
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeIn.delay(300)}
            style={styles.plantMonitorCard}
          >
            <LinearGradient
              colors={["rgba(34,197,94,0.12)", "rgba(34,197,94,0.05)"]}
              style={styles.plantMonitorGradient}
            >
              <View style={styles.plantMonitorContent}>
                <View style={styles.plantMonitorText}>
                  <Text style={styles.plantMonitorTitle}>
                    🌿 One-Tap Scanner
                  </Text>
                  <Text style={styles.plantMonitorDesc}>
                    {"Point your camera - we'll do the rest"}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.plantMonitorButton}
                  onPress={startScan}
                  activeOpacity={0.8}
                >
                  <Ionicons name="camera-outline" size={24} color="white" />
                  <Text style={styles.plantMonitorButtonText}>Scan Now</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </Animated.View>

          <Modal visible={showPaywall} transparent animationType="slide">
            <View style={styles.paywallOverlay}>
              <View style={styles.paywallContainer}>
                <Text style={styles.paywallTitle}>Scan limit reached</Text>
                <Text style={styles.paywallSubtitle}>
                  Choose a plan to continue scanning
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.planScroll}
                >
                  {PAYMENT_PLANS.map((plan) => (
                    <TouchableOpacity
                      key={plan.id}
                      style={[
                        styles.planCard,
                        selectedPlan === plan.id && styles.planCardActive,
                      ]}
                      onPress={() => setSelectedPlan(plan.id)}
                    >
                      <Text style={styles.planName}>{plan.name}</Text>
                      <Text style={styles.planPrice}>R{plan.price}</Text>
                      <Text style={styles.planDesc}>{plan.description}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <Text style={styles.gatewayTitle}>Pay with</Text>
                <View style={styles.gatewayRow}>
                  {GATEWAYS.map((gateway) => (
                    <TouchableOpacity
                      key={gateway.id}
                      style={[
                        styles.gatewayButton,
                        selectedGateway === gateway.id &&
                          styles.gatewayButtonActive,
                      ]}
                      onPress={() => setSelectedGateway(gateway.id)}
                    >
                      <Ionicons
                        name={gateway.icon as any}
                        size={22}
                        color={
                          selectedGateway === gateway.id ? "#fff" : "#16a34a"
                        }
                      />
                      <Text
                        style={[
                          styles.gatewayText,
                          selectedGateway === gateway.id &&
                            styles.gatewayTextActive,
                        ]}
                      >
                        {gateway.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.paywallActions}>
                  <TouchableOpacity
                    onPress={() => setShowPaywall(false)}
                    style={styles.paywallCancelBtn}
                  >
                    <Text style={styles.paywallCancelText}>Maybe later</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handlePayment}
                    style={[
                      styles.paywallPayBtn,
                      (!selectedPlan || !selectedGateway) &&
                        styles.paywallPayBtnDisabled,
                    ]}
                    disabled={
                      !selectedPlan || !selectedGateway || paymentProcessing
                    }
                  >
                    {paymentProcessing ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.paywallPayText}>Pay Now</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          <Animated.View
            entering={FadeIn.delay(400)}
            style={styles.historySection}
          >
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>🌿 Plant Scan History</Text>
              <Text style={styles.historySubtitle}>
                Your recent scans and community activity
              </Text>
            </View>

            {loadingScans ? (
              <ActivityIndicator
                size="large"
                color="#22c55e"
                style={{ marginVertical: 24 }}
              />
            ) : scanHistory.length > 0 ? (
              <View style={styles.historyList}>
                {scanHistory.map((scan, index) => (
                  <Animated.View
                    key={scan.id}
                    entering={FadeIn.delay(index * 50)}
                    style={styles.historyCard}
                  >
                    <View style={styles.cardImageContainer}>
                      <Image
                        source={{ uri: scan.imageUri }}
                        style={styles.cardImage}
                      />
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: getStatusColor(
                              scan.analysis.state,
                            ),
                          },
                        ]}
                      >
                        <Text style={styles.statusBadgeText}>
                          {getStatusEmoji(scan.analysis.state)}{" "}
                          {scan.analysis.state.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.cardContent}>
                      <Text style={styles.cardPlantName}>
                        🌱 {scan.plantName}
                      </Text>
                      <Text style={styles.cardTimestamp}>
                        {formatRelativeTime(scan.timestamp)}
                      </Text>
                      <Text style={styles.cardCause} numberOfLines={2}>
                        {scan.analysis.cause}
                      </Text>
                    </View>
                  </Animated.View>
                ))}
              </View>
            ) : (
              <>
                <View style={styles.emptyStateContainer}>
                  <Ionicons name="leaf-outline" size={48} color="#22c55e" />
                  <Text style={styles.emptyStateTitle}>
                    No scans yet - be the first on your farm 🌱
                  </Text>
                </View>
                <View style={styles.communityHeader}>
                  <Text style={styles.communityTitle}>
                    Recent community scans
                  </Text>
                </View>
                {loadingCommunity ? (
                  <ActivityIndicator
                    size="large"
                    color="#22c55e"
                    style={{ marginVertical: 24 }}
                  />
                ) : (
                  <View style={styles.historyList}>
                    {communityScans.map((scan, index) => (
                      <Animated.View
                        key={scan.id}
                        entering={FadeIn.delay(index * 50)}
                        style={styles.communityCard}
                      >
                        <View style={styles.communityCardLeft}>
                          <View style={styles.communityAvatar}>
                            <Text style={styles.communityAvatarText}>
                              {scan.farmerName.charAt(0)}
                            </Text>
                          </View>
                          <View style={styles.communityInfo}>
                            <Text style={styles.communityName}>
                              {scan.farmerName} • {scan.location}
                            </Text>
                            <Text style={styles.communityPlant}>
                              🌱 {scan.plantName}
                            </Text>
                            <View style={styles.communityStatusRow}>
                              <View
                                style={[
                                  styles.communityStatusDot,
                                  {
                                    backgroundColor: getCommunityStatusColor(
                                      scan.analysisState,
                                    ),
                                  },
                                ]}
                              />
                              <Text style={styles.communityStatus}>
                                {scan.analysisState}
                              </Text>
                              <Text style={styles.communityTime}>
                                • {scan.timestamp}
                              </Text>
                            </View>
                          </View>
                        </View>
                        <Image
                          source={{ uri: scan.imageUri }}
                          style={styles.communityImage}
                        />
                      </Animated.View>
                    ))}
                  </View>
                )}
              </>
            )}
          </Animated.View>
        </ScrollView>

        <Modal
          visible={scanVisible}
          animationType="slide"
          onRequestClose={closeScanner}
        >
          <View style={styles.cameraContainer}>
            {scanStage !== "result" && scanStage !== "error" ? (
              <CameraView
                ref={cameraRef}
                style={StyleSheet.absoluteFill}
                facing="back"
                ratio="16:9"
              />
            ) : null}

            {scanStage !== "result" && (
              <TouchableOpacity
                style={styles.closeCameraButton}
                onPress={closeScanner}
              >
                <Ionicons name="close" size={28} color="white" />
              </TouchableOpacity>
            )}

            {scanStage !== "result" && (
              <BlurView intensity={80} tint="dark" style={styles.cameraOverlay}>
                <View style={styles.overlayContent}>
                  {scanStage === "searching" && (
                    <>
                      <Animated.View style={[styles.scanRing, ringStyle]} />
                      <Ionicons name="leaf-outline" size={48} color="#22c55e" />
                      <Text style={styles.overlayTitle}>
                        Searching for plant...
                      </Text>
                      <Text style={styles.overlaySubtitle}>
                        Hold your phone steady
                      </Text>
                    </>
                  )}
                  {scanStage === "detected" && (
                    <>
                      <Animated.View style={[styles.scanRing, ringStyle]} />
                      <Ionicons name="leaf" size={48} color="#22c55e" />
                      <Text style={styles.overlayTitle}>Plant detected 🌿</Text>
                      <Text style={styles.overlaySubtitle}>
                        Keep the leaf in focus
                      </Text>
                    </>
                  )}
                  {scanStage === "hold" && (
                    <>
                      <Animated.View style={[styles.scanRing, ringStyle]} />
                      <Ionicons
                        name="hand-left-outline"
                        size={48}
                        color="#22c55e"
                      />
                      <Text style={styles.overlayTitle}>Hold steady...</Text>
                      <Text style={styles.overlaySubtitle}>
                        Capturing in a moment
                      </Text>
                    </>
                  )}
                  {scanStage === "capturing" && (
                    <ActivityIndicator size="large" color="#fff" />
                  )}
                  {scanStage === "analyzing" && (
                    <>
                      <ActivityIndicator
                        size="large"
                        color="#22c55e"
                        style={{ marginBottom: 16 }}
                      />
                      <Text style={styles.overlayTitle}>
                        Analyzing leaf health...
                      </Text>
                      <Text style={styles.overlaySubtitle}>
                        Kindwise AI is identifying & diagnosing
                      </Text>
                    </>
                  )}
                  {scanStage === "error" && (
                    <>
                      <Ionicons name="alert-circle" size={48} color="#ef4444" />
                      <Text style={styles.overlayTitle}>
                        Something went wrong
                      </Text>
                      <Text style={styles.overlaySubtitle}>{scanError}</Text>
                      <TouchableOpacity
                        style={styles.overlayButton}
                        onPress={closeScanner}
                      >
                        <Text style={styles.overlayButtonText}>Close</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </BlurView>
            )}

            {scanStage === "result" && analysisResult && capturedPhotoUri && (
              <ScrollView
                style={styles.resultScroll}
                contentContainerStyle={{ padding: 20 }}
              >
                <Image
                  source={{ uri: capturedPhotoUri }}
                  style={styles.resultImage}
                />
                <GlassCard style={styles.resultCard}>
                  <Text style={styles.detectedPlantLabel}>
                    🌿 {analysisResult.plantName || "Plant"}
                  </Text>
                  <View
                    style={[
                      styles.resultBadge,
                      {
                        backgroundColor:
                          getStatusColor(analysisResult.state) + "20",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.resultBadgeText,
                        { color: getStatusColor(analysisResult.state) },
                      ]}
                    >
                      {getStatusEmoji(analysisResult.state)}{" "}
                      {analysisResult.state.toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.recommendationCard}>
                    <View style={styles.recommendationHeader}>
                      <Ionicons name="bulb-outline" size={22} color="#16a34a" />
                      <Text style={styles.recommendationTitle}>
                        🩺 Recommended Action
                      </Text>
                    </View>
                    <Text style={styles.recommendationText}>
                      {analysisResult.state === "healthy"
                        ? "Your plant looks healthy! No action needed."
                        : analysisResult.solution}
                    </Text>
                    {analysisResult.state !== "healthy" && (
                      <TouchableOpacity
                        style={styles.takeActionButton}
                        onPress={handleTakeAction}
                      >
                        <Text style={styles.takeActionButtonText}>
                          Take Action
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.resultSection}>
                    <Text style={styles.resultSectionTitle}>
                      {"🔍 What's happening"}
                    </Text>
                    <Text style={styles.resultText}>
                      {analysisResult.cause}
                    </Text>
                  </View>
                  <View style={styles.resultSection}>
                    <Text style={styles.resultSectionTitle}>
                      🌾 How to prevent this
                    </Text>
                    <Text style={styles.resultText}>
                      {analysisResult.preventiveTips}
                    </Text>
                  </View>

                  <View style={styles.feedbackContainer}>
                    <Text style={styles.feedbackTitle}>Was this helpful?</Text>
                    <View style={styles.feedbackButtons}>
                      <TouchableOpacity
                        style={[
                          styles.feedbackButton,
                          feedbackGiven && styles.feedbackDisabled,
                        ]}
                        onPress={() => handleRateFeedback(true)}
                        disabled={feedbackGiven}
                      >
                        <Ionicons name="thumbs-up" size={20} color="#16a34a" />
                        <Text style={styles.feedbackButtonText}>Yes</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.feedbackButton,
                          feedbackGiven && styles.feedbackDisabled,
                        ]}
                        onPress={() => handleRateFeedback(false)}
                        disabled={feedbackGiven}
                      >
                        <Ionicons
                          name="thumbs-down"
                          size={20}
                          color="#dc2626"
                        />
                        <Text style={styles.feedbackButtonText}>No</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.newScanButton}
                    onPress={closeScanner}
                  >
                    <Text style={styles.newScanButtonText}>
                      Scan Another Plant
                    </Text>
                  </TouchableOpacity>
                </GlassCard>
              </ScrollView>
            )}
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, position: "relative" },
  backButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 16 : 12,
    left: 16,
    zIndex: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 20,
    padding: 8,
  },
  scrollContent: { flexGrow: 1, paddingBottom: 80, paddingTop: 20 },
  bgBlob1: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(34,197,94,0.2)",
    overflow: "hidden",
  },
  bgBlob2: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(168,85,247,0.2)",
    overflow: "hidden",
  },
  hero: { alignItems: "center", marginVertical: 24, paddingHorizontal: 16 },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 16,
    overflow: "hidden",
  },
  heroIconGradient: { flex: 1, alignItems: "center", justifyContent: "center" },
  heroTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#11181C",
    textAlign: "center",
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: "#687076",
    textAlign: "center",
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  scanLimitText: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 6,
    textAlign: "center",
  },
  plantMonitorCard: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 24,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  plantMonitorGradient: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.3)",
  },
  plantMonitorContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  plantMonitorText: { flex: 1, marginRight: 12 },
  plantMonitorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#166534",
    marginBottom: 4,
  },
  plantMonitorDesc: { fontSize: 13, color: "#4b5563" },
  plantMonitorButton: {
    backgroundColor: "#22c55e",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 40,
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  plantMonitorButtonText: { color: "white", fontWeight: "600", fontSize: 14 },
  historySection: { marginHorizontal: 16, marginTop: 8, marginBottom: 24 },
  historyHeader: { marginBottom: 20 },
  historyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#11181C",
    marginBottom: 6,
  },
  historySubtitle: { fontSize: 14, color: "#687076" },
  historyList: { gap: 16 },
  historyCard: {
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.2)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardImageContainer: { position: "relative", height: 180 },
  cardImage: { width: "100%", height: "100%", resizeMode: "cover" },
  statusBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  cardContent: { padding: 12 },
  cardPlantName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#11181C",
    marginBottom: 4,
  },
  cardTimestamp: { fontSize: 12, color: "#6b7280", marginBottom: 6 },
  cardCause: { fontSize: 13, color: "#4b5563" },
  emptyStateContainer: {
    alignItems: "center",
    backgroundColor: "rgba(34,197,94,0.05)",
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.2)",
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#166534",
    textAlign: "center",
    marginVertical: 12,
  },
  communityHeader: { marginBottom: 12 },
  communityTitle: { fontSize: 18, fontWeight: "600", color: "#11181C" },
  communityCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.2)",
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  communityCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  communityAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
  },
  communityAvatarText: { color: "#fff", fontSize: 20, fontWeight: "700" },
  communityInfo: { flex: 1 },
  communityName: { fontSize: 14, fontWeight: "600", color: "#11181C" },
  communityPlant: { fontSize: 13, color: "#4b5563", marginTop: 2 },
  communityStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  communityStatusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  communityStatus: { fontSize: 12, fontWeight: "500", color: "#374151" },
  communityTime: { fontSize: 12, color: "#9ca3af", marginLeft: 4 },
  communityImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    resizeMode: "cover",
  },
  glassCard: {
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.4)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    padding: 24,
  },
  cameraContainer: { flex: 1, backgroundColor: "#000" },
  closeCameraButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 20,
    right: 20,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    padding: 8,
  },
  cameraOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  overlayContent: { alignItems: "center", padding: 40 },
  scanRing: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: "#22c55e",
    opacity: 0.2,
  },
  overlayTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    marginTop: 20,
    textAlign: "center",
  },
  overlaySubtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
    marginTop: 8,
    textAlign: "center",
  },
  overlayButton: {
    marginTop: 20,
    backgroundColor: "#ef4444",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 30,
  },
  overlayButtonText: { color: "#fff", fontWeight: "600" },
  resultScroll: { flex: 1 },
  resultImage: {
    width: "100%",
    height: 220,
    borderRadius: 20,
    marginBottom: 16,
  },
  resultCard: { marginBottom: 16 },
  detectedPlantLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#166534",
    marginBottom: 8,
  },
  resultBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  resultBadgeText: { fontSize: 14, fontWeight: "600" },
  recommendationCard: {
    backgroundColor: "rgba(34,197,94,0.08)",
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.3)",
  },
  recommendationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  recommendationTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#166534",
    marginLeft: 8,
  },
  recommendationText: {
    fontSize: 15,
    color: "#065f46",
    lineHeight: 22,
    marginBottom: 12,
  },
  takeActionButton: {
    backgroundColor: "#22c55e",
    borderRadius: 30,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  takeActionButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  resultSection: { marginBottom: 16 },
  resultSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#11181C",
    marginBottom: 6,
  },
  resultText: { fontSize: 14, color: "#4b5563", lineHeight: 20 },
  feedbackContainer: { marginVertical: 16, alignItems: "center" },
  feedbackTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  feedbackButtons: { flexDirection: "row", gap: 16 },
  feedbackButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 40,
  },
  feedbackDisabled: { opacity: 0.5 },
  feedbackButtonText: { fontSize: 14, fontWeight: "500" },
  newScanButton: {
    backgroundColor: "#22c55e",
    paddingVertical: 14,
    borderRadius: 40,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  newScanButtonText: { color: "white", fontWeight: "700", fontSize: 16 },
  paywallOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  paywallContainer: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  paywallTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#11181C",
    textAlign: "center",
    marginBottom: 6,
  },
  paywallSubtitle: {
    fontSize: 14,
    color: "#687076",
    textAlign: "center",
    marginBottom: 20,
  },
  planScroll: { maxHeight: 180, marginBottom: 20 },
  planCard: {
    backgroundColor: "#f3f4f6",
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    width: 130,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  planCardActive: { borderColor: "#22c55e", backgroundColor: "#f0fdf4" },
  planName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#11181C",
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 22,
    fontWeight: "800",
    color: "#16a34a",
    marginBottom: 4,
  },
  planDesc: { fontSize: 12, color: "#4b5563", textAlign: "center" },
  gatewayTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#11181C",
    marginBottom: 10,
  },
  gatewayRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  gatewayButton: {
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: "transparent",
  },
  gatewayButtonActive: { backgroundColor: "#22c55e", borderColor: "#16a34a" },
  gatewayText: {
    fontSize: 12,
    marginTop: 4,
    color: "#16a34a",
    fontWeight: "600",
  },
  gatewayTextActive: { color: "#fff" },
  paywallActions: { flexDirection: "row", justifyContent: "flex-end", gap: 12 },
  paywallCancelBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  paywallCancelText: { fontSize: 14, color: "#6b7280", fontWeight: "500" },
  paywallPayBtn: {
    backgroundColor: "#22c55e",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  paywallPayBtnDisabled: { backgroundColor: "#d1d5db" },
  paywallPayText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
