import { GlassCard } from '@/components/ui/glass-card';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from 'react-native-reanimated';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const params = useLocalSearchParams<{ verified?: string }>();
  const isVerified = params.verified === 'true';
  const [showVerifiedMessage, setShowVerifiedMessage] = useState(isVerified);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (showVerifiedMessage) {
      const timer = setTimeout(() => setShowVerifiedMessage(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showVerifiedMessage]);

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
  }, []);

  const bgBlob1Style = useAnimatedStyle(() => ({
    transform: [{ scale: bgScale1.value }, { translateX: bgX1.value }, { translateY: bgY1.value }],
  }));
  const bgBlob2Style = useAnimatedStyle(() => ({
    transform: [{ scale: bgScale2.value }, { translateX: bgX2.value }, { translateY: bgY2.value }],
  }));
  const bgBlob3Style = useAnimatedStyle(() => ({
    transform: [{ scale: bgScale3.value }, { translateY: bgY3.value }],
  }));

  const handleLogin = async () => {
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
      router.replace('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <LinearGradient colors={['#f0fdf4', '#ffffff', '#ecfdf5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Animated.View style={[styles.blob, styles.blob1, bgBlob1Style]} />
      <Animated.View style={[styles.blob, styles.blob2, bgBlob2Style]} />
      <Animated.View style={[styles.blob, styles.blob3, bgBlob3Style]} />

      <View style={styles.content}>
        <Animated.View entering={SlideInDown.duration(600)} style={styles.logoContainer}>
          <Animated.View entering={FadeIn.delay(200)} style={styles.logoWrapper}>
            <LinearGradient colors={['#22c55e', '#16a34a']} style={styles.logoGradient}>
              <Ionicons name="leaf" size={40} color="white" />
            </LinearGradient>
          </Animated.View>
          <Text style={styles.title}>FarmLink</Text>
          <Text style={styles.subtitle}>Your AI-powered farming assistant</Text>
        </Animated.View>

        <Animated.View entering={SlideInUp.duration(600).delay(200)} style={styles.formWrapper}>
          <GlassCard style={styles.formCard}>
            <View style={styles.header}>
              <Ionicons name="sparkles" size={20} color="#22c55e" />
              <Text style={styles.headerTitle}>Welcome Back</Text>
            </View>

            {showVerifiedMessage && (
              <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.successMessage}>
                <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                <Text style={styles.successText}>Email verified successfully! You can now sign in.</Text>
              </Animated.View>
            )}

            {error !== '' && (
              <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.errorMessage}>
                <Text style={styles.errorText}>{error}</Text>
              </Animated.View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="you@example.com" placeholderTextColor="#9ca3af" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Enter your password" placeholderTextColor="#9ca3af" secureTextEntry={!showPassword} value={password} onChangeText={setPassword} autoCapitalize="none" />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9ca3af" />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity onPress={() => router.push('/forgot-password')} style={styles.forgotLink}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.loginButton, isLoading && styles.loginButtonDisabled]} onPress={handleLogin} disabled={isLoading} activeOpacity={0.8}>
              {isLoading ? (
                <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.spinner}>
                  <Ionicons name="reload" size={20} color="white" />
                </Animated.View>
              ) : (
                <>
                  <Text style={styles.loginButtonText}>Sign In</Text>
                  <Ionicons name="arrow-forward" size={20} color="white" />
                </>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialRow}>
              <TouchableOpacity style={styles.socialButton} activeOpacity={0.7}>
                <Ionicons name="logo-google" size={20} color="#11181C" />
                <Text style={styles.socialText}>Google</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialButton} activeOpacity={0.7}>
                <Ionicons name="logo-facebook" size={20} color="#11181C" />
                <Text style={styles.socialText}>Facebook</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>

          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/signup')}>
              <Text style={styles.signupLink}>Sign up</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(34,197,94,0.2)',
    width: 200,
    height: 200,
  },
  blob1: { top: -50, left: -50 },
  blob2: { bottom: -50, right: -50, width: 250, height: 250 },
  blob3: { top: '30%', left: '50%', marginLeft: -100, width: 200, height: 200, opacity: 0.5 },
  logoContainer: { alignItems: 'center', marginBottom: 32 },
  logoWrapper: { width: 80, height: 80, borderRadius: 40, overflow: 'hidden', marginBottom: 16 },
  logoGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#11181C', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#687076', textAlign: 'center' },
  formWrapper: { width: '100%', maxWidth: 400 },
  formCard: { padding: 24 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  headerTitle: { fontSize: 20, fontWeight: '600', color: '#11181C' },
  successMessage: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(34,197,94,0.1)', padding: 12, borderRadius: 12, marginBottom: 16 },
  successText: { fontSize: 13, color: '#22c55e', flex: 1 },
  errorMessage: { backgroundColor: 'rgba(239,68,68,0.1)', padding: 12, borderRadius: 12, marginBottom: 16 },
  errorText: { fontSize: 13, color: '#ef4444', textAlign: 'center' },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', color: '#11181C', marginBottom: 6 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)', borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.5)', paddingHorizontal: 12 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 12, fontSize: 14, color: '#11181C' },
  eyeIcon: { padding: 4 },
  forgotLink: { alignSelf: 'flex-end', marginBottom: 20 },
  forgotText: { fontSize: 13, color: '#22c55e', fontWeight: '500' },
  loginButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#22c55e', borderRadius: 12, paddingVertical: 12, shadowColor: '#22c55e', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
  loginButtonDisabled: { opacity: 0.7 },
  loginButtonText: { fontSize: 16, fontWeight: '600', color: 'white' },
  spinner: { width: 20, height: 20, borderWidth: 2, borderColor: 'white', borderTopColor: 'transparent', borderRadius: 10 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  dividerText: { fontSize: 12, color: '#9ca3af' },
  socialRow: { flexDirection: 'row', gap: 12 },
  socialButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)', borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.5)', paddingVertical: 12 },
  socialText: { fontSize: 14, fontWeight: '500', color: '#11181C' },
  signupContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  signupText: { fontSize: 14, color: '#687076' },
  signupLink: { fontSize: 14, fontWeight: '600', color: '#22c55e' },
});