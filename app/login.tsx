import { GlassCard } from "@/components/ui/glass-card";
import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as LocalAuthentication from "expo-local-authentication";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

const IS_WEB = Platform.OS === "web" || typeof window !== "undefined";

const secureGet = async (key: string): Promise<string | null> => {
  if (IS_WEB) return null;
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
};

const secureSet = async (key: string, value: string): Promise<void> => {
  if (IS_WEB) return;
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {}
};

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const params = useLocalSearchParams<{ verified?: string }>();
  const isVerified = params.verified === "true";
  const [showVerifiedMessage, setShowVerifiedMessage] = useState(isVerified);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [hasSavedCredentials, setHasSavedCredentials] = useState(false);

  useEffect(() => {
    if (showVerifiedMessage) {
      const timer = setTimeout(() => setShowVerifiedMessage(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showVerifiedMessage]);

  useEffect(() => {
    checkBiometricSupport();
    loadSavedCredentials();
  }, []);

  // Background animations (same as before, omitted for brevity)
  const bgScale1 = useSharedValue(1);
  const bgX1 = useSharedValue(0);
  const bgY1 = useSharedValue(0);
  const bgScale2 = useSharedValue(1.2);
  const bgX2 = useSharedValue(0);
  const bgY2 = useSharedValue(0);
  const bgScale3 = useSharedValue(1);
  const bgY3 = useSharedValue(0);

  useEffect(() => {
    bgScale1.value = withRepeat(withTiming(1.3, { duration: 20000 }), -1, true);
    bgX1.value = withRepeat(withTiming(50, { duration: 20000 }), -1, true);
    bgY1.value = withRepeat(withTiming(-30, { duration: 20000 }), -1, true);
    bgScale2.value = withRepeat(withTiming(1, { duration: 25000 }), -1, true);
    bgX2.value = withRepeat(withTiming(-40, { duration: 25000 }), -1, true);
    bgY2.value = withRepeat(withTiming(40, { duration: 25000 }), -1, true);
    bgY3.value = withRepeat(withTiming(-20, { duration: 15000 }), -1, true);
  }, [bgScale1, bgScale2, bgScale3, bgX1, bgX2, bgY1, bgY2, bgY3]);

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
  const bgBlob3Style = useAnimatedStyle(() => ({
    transform: [{ scale: bgScale3.value }, { translateY: bgY3.value }],
  }));

  const checkBiometricSupport = async () => {
    if (IS_WEB) {
      setIsBiometricAvailable(false);
      return;
    }
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setIsBiometricAvailable(compatible && enrolled);
    } catch {
      setIsBiometricAvailable(false);
    }
  };

  const loadSavedCredentials = async () => {
    try {
      if (IS_WEB) {
        const saved = localStorage.getItem("biometric_credentials");
        setHasSavedCredentials(!!saved);
        return;
      }
      const saved = await secureGet("biometric_credentials");
      setHasSavedCredentials(!!saved);
    } catch {
      setHasSavedCredentials(false);
    }
  };

  const handleLogin = async () => {
    setError("");
    setIsLoading(true);
    try {
      let loginEmail = email;
      let loginPassword = password;

      // Enforce biometric authentication on native devices.
      // User can only proceed if biometrics succeeds.
      if (!IS_WEB) {
        // If biometrics is not available on this device, block login.
        if (!isBiometricAvailable) {
          setIsLoading(false);
          setError("Biometric authentication is not available on this device.");
          return;
        }

        // If the user didn't manually type credentials, check for saved ones
        if (!loginEmail || !loginPassword) {
          if (!hasSavedCredentials) {
            setError("Please enter your email and password.");
            setIsLoading(false);
            return;
          }
        }

        // Prompt for biometric identity verification
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: "Verify identity to sign in",
          disableDeviceFallback: false,
        });

        if (!result.success) {
          setIsLoading(false); // User cancelled or failed authentication
          return;
        }

        // If no credentials were typed, retrieve the saved ones
        if (!loginEmail || !loginPassword) {
          const savedCredentials = await secureGet("biometric_credentials");
          if (savedCredentials) {
            const parsed = JSON.parse(savedCredentials);
            loginEmail = parsed.email;
            loginPassword = parsed.password;
          }
        }
      } else {
        // Web platform or device without biometrics fallback
        if (!loginEmail || !loginPassword) {
          if (IS_WEB && hasSavedCredentials) {
            const savedStr = localStorage.getItem("biometric_credentials");
            if (savedStr) {
              const parsed = JSON.parse(savedStr);
              loginEmail = parsed.email;
              loginPassword = parsed.password;
            } else {
              setError("Please enter your email and password.");
              setIsLoading(false);
              return;
            }
          } else {
            setError("Please enter your email and password.");
            setIsLoading(false);
            return;
          }
        }
      }

      // Execute the login request
      await login(loginEmail, loginPassword);

      // Save the credentials securely for the next sign-in
      if (!IS_WEB && isBiometricAvailable) {
        await secureSet(
          "biometric_credentials",
          JSON.stringify({ email: loginEmail, password: loginPassword }),
        );
        setHasSavedCredentials(true);
      }

      router.replace("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <LinearGradient
        colors={["#f0fdf4", "#ffffff", "#ecfdf5"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[styles.blob, styles.blob1, bgBlob1Style]} />
      <Animated.View style={[styles.blob, styles.blob2, bgBlob2Style]} />
      <Animated.View style={[styles.blob, styles.blob3, bgBlob3Style]} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Animated.View
            entering={SlideInDown.duration(600)}
            style={styles.logoContainer}
          >
            <Animated.View
              entering={FadeIn.delay(200)}
              style={styles.logoWrapper}
            >
              <LinearGradient
                colors={["#22c55e", "#16a34a"]}
                style={styles.logoGradient}
              >
                <Ionicons name="leaf" size={40} color="white" />
              </LinearGradient>
            </Animated.View>
            <Text style={styles.title}>FarmLink</Text>
            <Text style={styles.subtitle}>
              Your AI-powered farming assistant
            </Text>
          </Animated.View>

          <Animated.View
            entering={SlideInUp.duration(600).delay(200)}
            style={styles.formWrapper}
          >
            <GlassCard style={styles.formCard}>
              <View style={styles.header}>
                <Ionicons name="sparkles" size={20} color="#22c55e" />
                <Text style={styles.headerTitle}>Welcome Back</Text>
              </View>

              {showVerifiedMessage && (
                <Animated.View
                  entering={FadeIn}
                  exiting={FadeOut}
                  style={styles.successMessage}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                  <Text style={styles.successText}>
                    Email verified successfully! You can now sign in.
                  </Text>
                </Animated.View>
              )}

              {error !== "" && (
                <Animated.View
                  entering={FadeIn}
                  exiting={FadeOut}
                  style={styles.errorMessage}
                >
                  <Text style={styles.errorText}>{error}</Text>
                </Animated.View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color="#9ca3af"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="you@example.com"
                    placeholderTextColor="#9ca3af"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color="#9ca3af"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your password"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="#9ca3af"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => router.push("/forgot-password")}
                style={styles.forgotLink}
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={[
                  styles.loginButton,
                  isLoading && styles.loginButtonDisabled,
                ]}
                onPress={handleLogin}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <Animated.View
                    entering={FadeIn}
                    exiting={FadeOut}
                    style={styles.spinner}
                  >
                    <Ionicons name="reload" size={20} color="white" />
                  </Animated.View>
                ) : (
                  <>
                    {!IS_WEB &&
                    isBiometricAvailable &&
                    hasSavedCredentials &&
                    !email &&
                    !password ? (
                      <>
                        <Text style={styles.loginButtonText}>
                          Unlock with Biometrics
                        </Text>
                        <Ionicons name="finger-print" size={20} color="white" />
                      </>
                    ) : (
                      <>
                        <Text style={styles.loginButtonText}>Sign In</Text>
                        <Ionicons
                          name="arrow-forward"
                          size={20}
                          color="white"
                        />
                      </>
                    )}
                  </>
                )}
              </TouchableOpacity>
            </GlassCard>

            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>
                Don&apos;t have an account?{" "}
              </Text>
              <TouchableOpacity onPress={() => router.push("/signup")}>
                <Text style={styles.signupLink}>Sign up</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: "center" },
  content: { alignItems: "center", padding: 16, paddingVertical: 40 },
  blob: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(34,197,94,0.2)",
    width: 200,
    height: 200,
  },
  blob1: { top: -50, left: -50 },
  blob2: { bottom: -50, right: -50, width: 250, height: 250 },
  blob3: { top: "30%", left: "50%" },
  logoContainer: { alignItems: "center", marginBottom: 32 },
  logoWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: "hidden",
    marginBottom: 16,
  },
  logoGradient: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "bold", color: "#11181C" },
  subtitle: { fontSize: 14, color: "#687076", marginTop: 4 },
  formWrapper: { width: "100%", maxWidth: 400 },
  formCard: {
    padding: 24,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    gap: 8,
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#11181C" },
  successMessage: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#dcfce7",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  successText: { color: "#166534", fontSize: 14 },
  errorMessage: {
    backgroundColor: "#fee2e2",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: { color: "#b91c1c", fontSize: 14, textAlign: "center" },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: "#f9fafb",
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, height: 48, fontSize: 16, color: "#11181C" },
  eyeIcon: { padding: 8 },
  forgotLink: { alignSelf: "flex-end", marginBottom: 24 },
  forgotText: { color: "#22c55e", fontSize: 14, fontWeight: "500" },
  divider: { flexDirection: "row", alignItems: "center", marginVertical: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#d1d5db" },
  dividerText: { marginHorizontal: 16, color: "#6b7280", fontSize: 14 },
  loginButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#22c55e",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  loginButtonDisabled: { opacity: 0.7 },
  loginButtonText: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
  spinner: { alignItems: "center", justifyContent: "center" },
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  signupText: { color: "#6b7280", fontSize: 14 },
  signupLink: { color: "#22c55e", fontSize: 14, fontWeight: "600" },
});
