import { GlassCard } from '@/components/ui/glass-card';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

export default function VerifyOTPPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const { verifyOTP } = useAuth();
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    setError('');
    if (!otp || otp.length < 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }
    if (!params.email) {
      setError('Email address is missing. Please go back and try again.');
      return;
    }

    setIsLoading(true);
    try {
      await verifyOTP(params.email, otp);
      router.replace('/login?verified=true');
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check your code.');
    } finally {
      setIsLoading(false);
    }
  };

  // Background animations
  const bgScale1 = useSharedValue(1);
  const bgX1 = useSharedValue(0);
  const bgY1 = useSharedValue(0);
  const bgScale2 = useSharedValue(1.2);
  const bgX2 = useSharedValue(0);
  const bgY2 = useSharedValue(0);

  React.useEffect(() => {
    bgScale1.value = withRepeat(withTiming(1.3, { duration: 20000 }), -1, true);
    bgX1.value = withRepeat(withTiming(50, { duration: 20000 }), -1, true);
    bgY1.value = withRepeat(withTiming(-30, { duration: 20000 }), -1, true);
    bgScale2.value = withRepeat(withTiming(1, { duration: 25000 }), -1, true);
    bgX2.value = withRepeat(withTiming(-40, { duration: 25000 }), -1, true);
    bgY2.value = withRepeat(withTiming(40, { duration: 25000 }), -1, true);
  }, []);

  const bgBlob1Style = useAnimatedStyle(() => ({
    transform: [{ scale: bgScale1.value }, { translateX: bgX1.value }, { translateY: bgY1.value }],
  }));
  const bgBlob2Style = useAnimatedStyle(() => ({
    transform: [{ scale: bgScale2.value }, { translateX: bgX2.value }, { translateY: bgY2.value }],
  }));

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <LinearGradient
        colors={['#f0fdf4', '#ffffff', '#ecfdf5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View style={[styles.blob, styles.blob1, bgBlob1Style]} />
      <Animated.View style={[styles.blob, styles.blob2, bgBlob2Style]} />

      <Animated.View entering={FadeIn} style={styles.backButtonContainer}>
        <TouchableOpacity onPress={() => router.push('/signup')} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#11181C" />
        </TouchableOpacity>
      </Animated.View>

      <View style={styles.content}>
        <Animated.View entering={SlideInDown.duration(600)} style={styles.logoContainer}>
          <Animated.View entering={FadeIn.delay(200)} style={styles.logoWrapper}>
            <LinearGradient colors={['#22c55e', '#16a34a']} style={styles.logoGradient}>
              <Ionicons name="leaf" size={40} color="white" />
            </LinearGradient>
          </Animated.View>
          <Text style={styles.title}>Verify Email</Text>
          <Text style={styles.subtitle}>
            We've sent a verification code to{' '}
            <Text style={styles.emailText}>{params.email || 'your email'}</Text>
          </Text>
        </Animated.View>

        <Animated.View entering={SlideInUp.duration(600).delay(200)} style={styles.formWrapper}>
          <GlassCard style={styles.formCard}>
            <View style={styles.header}>
              <Ionicons name="mail-outline" size={20} color="#22c55e" />
              <Text style={styles.headerTitle}>Verification Code</Text>
            </View>

            {error !== '' && (
              <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.errorMessage}>
                <Text style={styles.errorText}>{error}</Text>
              </Animated.View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Enter 6-digit code</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="key-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="000000"
                  placeholderTextColor="#9ca3af"
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.verifyButton, isLoading && styles.verifyButtonDisabled]}
              onPress={handleVerify}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <Animated.View style={styles.spinner} entering={FadeIn} exiting={FadeOut}>
                  <Ionicons name="reload" size={20} color="white" />
                </Animated.View>
              ) : (
                <>
                  <Text style={styles.verifyButtonText}>Verify Email</Text>
                  <Ionicons name="arrow-forward" size={20} color="white" />
                </>
              )}
            </TouchableOpacity>

            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Didn't receive the code? </Text>
              <TouchableOpacity onPress={() => { /* resend logic can be added later */ }}>
                <Text style={styles.resendLink}>Resend</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already verified? </Text>
            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text style={styles.loginLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  blob: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(34,197,94,0.2)' },
  blob1: { width: 200, height: 200, top: -50, left: -50 },
  blob2: { width: 250, height: 250, bottom: -50, right: -50 },
  backButtonContainer: { position: 'absolute', top: 16, left: 16, zIndex: 20 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  logoContainer: { alignItems: 'center', marginBottom: 32 },
  logoWrapper: { width: 80, height: 80, borderRadius: 40, overflow: 'hidden', marginBottom: 16 },
  logoGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#11181C' },
  subtitle: { fontSize: 14, color: '#687076', textAlign: 'center', marginTop: 8 },
  emailText: { fontWeight: '600', color: '#22c55e' },
  formWrapper: { width: '100%', maxWidth: 400 },
  formCard: { padding: 24 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  headerTitle: { fontSize: 20, fontWeight: '600', color: '#11181C' },
  errorMessage: { backgroundColor: 'rgba(239,68,68,0.1)', padding: 12, borderRadius: 12, marginBottom: 16 },
  errorText: { fontSize: 13, color: '#ef4444', textAlign: 'center' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '500', color: '#11181C', marginBottom: 6 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)', borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.5)', paddingHorizontal: 12 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 12, fontSize: 14, color: '#11181C' },
  verifyButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#22c55e', borderRadius: 12, paddingVertical: 12, shadowColor: '#22c55e', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
  verifyButtonDisabled: { opacity: 0.7 },
  verifyButtonText: { fontSize: 16, fontWeight: '600', color: 'white' },
  spinner: { width: 20, height: 20, borderWidth: 2, borderColor: 'white', borderTopColor: 'transparent', borderRadius: 10 },
  resendContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  resendText: { fontSize: 13, color: '#687076' },
  resendLink: { fontSize: 13, fontWeight: '600', color: '#22c55e' },
  loginContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  loginText: { fontSize: 14, color: '#687076' },
  loginLink: { fontSize: 14, fontWeight: '600', color: '#22c55e' },
});