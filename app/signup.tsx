import { GlassCard } from '@/components/ui/glass-card';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
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
  SlideInDown,
  SlideInLeft,
  SlideInRight,
  SlideInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from 'react-native-reanimated';

const userTypes = [
  { id: 'farmer', label: 'Farmer', description: 'I grow crops and raise livestock' },
  { id: 'expert', label: 'Expert', description: 'I provide agricultural advice' },
];

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    location: '',
    password: '',
    confirmPassword: '',
    userType: 'farmer',
    agreeTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const updateFormData = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNextStep = () => {
    setError('');
    if (step === 1) {
      if (!formData.fullName || !formData.email) {
        setError('Please fill in all required fields');
        return;
      }
      setStep(2);
    }
  };

  const handleSignup = async () => {
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (!formData.agreeTerms) {
      setError('Please agree to the terms and conditions');
      return;
    }

    setIsLoading(true);
    try {
      // Call the signup method from AuthContext
      await signup(formData.email, formData.password, formData.fullName);
      // After successful signup, redirect to OTP verification page with email
      router.push(`/verify-otp?email=${encodeURIComponent(formData.email)}`);
    } catch (err: any) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Background animations (same as original)
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
      <LinearGradient colors={['#f0fdf4', '#ffffff', '#ecfdf5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />

      <Animated.View style={[styles.blob, styles.blob1, bgBlob1Style]} />
      <Animated.View style={[styles.blob, styles.blob2, bgBlob2Style]} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Animated.View entering={SlideInDown.duration(600)} style={styles.logoContainer}>
            <Animated.View entering={FadeIn.delay(200)} style={styles.logoWrapper}>
              <LinearGradient colors={['#22c55e', '#16a34a']} style={styles.logoGradient}>
                <Ionicons name="leaf" size={32} color="white" />
              </LinearGradient>
            </Animated.View>
            <Text style={styles.title}>Join FarmLink</Text>
            <Text style={styles.subtitle}>Connect with the farming community</Text>
          </Animated.View>

          <Animated.View entering={FadeIn} style={styles.progressContainer}>
            {[1, 2].map((s) => (
              <View key={s} style={styles.progressStepWrapper}>
                <Animated.View
                  style={[
                    styles.progressCircle,
                    step >= s && styles.progressCircleActive,
                    step === s && styles.progressCircleCurrent,
                  ]}
                >
                  {step > s ? (
                    <Ionicons name="checkmark" size={14} color="white" />
                  ) : (
                    <Text style={[styles.progressNumber, step >= s && styles.progressNumberActive]}>{s}</Text>
                  )}
                </Animated.View>
                {s < 2 && (
                  <View style={styles.progressLine}>
                    <Animated.View
                      style={[
                        styles.progressLineFill,
                        step > s && { width: '100%' },
                      ]}
                    />
                  </View>
                )}
              </View>
            ))}
          </Animated.View>

          <Animated.View entering={SlideInUp.duration(600).delay(200)} style={styles.formWrapper}>
            <GlassCard style={styles.formCard}>
              <View style={styles.header}>
                <Ionicons name="sparkles" size={20} color="#22c55e" />
                <Text style={styles.headerTitle}>
                  {step === 1 ? 'Personal Info' : 'Create Account'}
                </Text>
              </View>

              {error !== '' && (
                <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.errorMessage}>
                  <Text style={styles.errorText}>{error}</Text>
                </Animated.View>
              )}

              {step === 1 ? (
                <Animated.View entering={SlideInLeft} exiting={FadeOut} style={styles.stepContainer}>
                  {/* Full Name */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Full Name *</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="person-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="John Doe"
                        placeholderTextColor="#9ca3af"
                        value={formData.fullName}
                        onChangeText={(val) => updateFormData('fullName', val)}
                      />
                    </View>
                  </View>

                  {/* Email */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email Address *</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="mail-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="you@example.com"
                        placeholderTextColor="#9ca3af"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={formData.email}
                        onChangeText={(val) => updateFormData('email', val)}
                      />
                    </View>
                  </View>

                  {/* Phone */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Phone Number</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="call-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="+255 xxx xxx xxx"
                        placeholderTextColor="#9ca3af"
                        keyboardType="phone-pad"
                        value={formData.phone}
                        onChangeText={(val) => updateFormData('phone', val)}
                      />
                    </View>
                  </View>

                  {/* Location */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Location</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="location-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Arusha, Tanzania"
                        placeholderTextColor="#9ca3af"
                        value={formData.location}
                        onChangeText={(val) => updateFormData('location', val)}
                      />
                    </View>
                  </View>

                  {/* User Type */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>I am a</Text>
                    <View style={styles.userTypesRow}>
                      {userTypes.map((type) => (
                        <TouchableOpacity
                          key={type.id}
                          style={[styles.userTypeCard, formData.userType === type.id && styles.userTypeCardActive]}
                          onPress={() => updateFormData('userType', type.id)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.userTypeLabel, formData.userType === type.id && styles.userTypeLabelActive]}>
                            {type.label}
                          </Text>
                          <Text style={[styles.userTypeDesc, formData.userType === type.id && styles.userTypeDescActive]}>
                            {type.description}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <TouchableOpacity style={styles.nextButton} onPress={handleNextStep} activeOpacity={0.8}>
                    <Text style={styles.nextButtonText}>Continue</Text>
                    <Ionicons name="arrow-forward" size={20} color="white" />
                  </TouchableOpacity>
                </Animated.View>
              ) : (
                <Animated.View entering={SlideInRight} exiting={FadeOut} style={styles.stepContainer}>
                  {/* Password */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Password *</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Create a password"
                        placeholderTextColor="#9ca3af"
                        secureTextEntry={!showPassword}
                        value={formData.password}
                        onChangeText={(val) => updateFormData('password', val)}
                      />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                        <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9ca3af" />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.hintText}>Must be at least 8 characters</Text>
                  </View>

                  {/* Confirm Password */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Confirm Password *</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Confirm your password"
                        placeholderTextColor="#9ca3af"
                        secureTextEntry={!showConfirmPassword}
                        value={formData.confirmPassword}
                        onChangeText={(val) => updateFormData('confirmPassword', val)}
                      />
                      <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                        <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9ca3af" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <TouchableOpacity style={styles.termsRow} onPress={() => updateFormData('agreeTerms', !formData.agreeTerms)} activeOpacity={0.7}>
                    <View style={[styles.checkbox, formData.agreeTerms && styles.checkboxChecked]}>
                      {formData.agreeTerms && <Ionicons name="checkmark" size={12} color="white" />}
                    </View>
                    <Text style={styles.termsText}>
                      I agree to the <Text style={styles.termsLink}>Terms of Service</Text> and <Text style={styles.termsLink}>Privacy Policy</Text>
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.buttonRow}>
                    <TouchableOpacity style={styles.backButton} onPress={() => setStep(1)} activeOpacity={0.7}>
                      <Text style={styles.backButtonText}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.createButton, isLoading && styles.createButtonDisabled]}
                      onPress={handleSignup}
                      disabled={isLoading}
                      activeOpacity={0.8}
                    >
                      {isLoading ? (
                        <Animated.View style={styles.spinner} entering={FadeIn} exiting={FadeOut}>
                          <Ionicons name="reload" size={20} color="white" />
                        </Animated.View>
                      ) : (
                        <Text style={styles.createButtonText}>Create Account</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              )}
            </GlassCard>

            <View style={styles.signinContainer}>
              <Text style={styles.signinText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/login')}>
                <Text style={styles.signinLink}>Sign in</Text>
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
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  content: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 16 },
  blob: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(34,197,94,0.2)' },
  blob1: { width: 200, height: 200, top: -50, left: -50 },
  blob2: { width: 250, height: 250, bottom: -50, right: -50 },
  logoContainer: { alignItems: 'center', marginBottom: 24 },
  logoWrapper: { width: 64, height: 64, borderRadius: 32, overflow: 'hidden', marginBottom: 12 },
  logoGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#11181C', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#687076', textAlign: 'center' },
  progressContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  progressStepWrapper: { flexDirection: 'row', alignItems: 'center' },
  progressCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center' },
  progressCircleActive: { backgroundColor: '#22c55e' },
  progressCircleCurrent: { transform: [{ scale: 1.05 }] },
  progressNumber: { fontSize: 14, fontWeight: '600', color: '#9ca3af' },
  progressNumberActive: { color: 'white' },
  progressLine: { width: 40, height: 2, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 8 },
  progressLineFill: { width: 0, height: '100%', backgroundColor: '#22c55e', borderRadius: 1 },
  formWrapper: { width: '100%', maxWidth: 400 },
  formCard: { padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#11181C' },
  errorMessage: { backgroundColor: 'rgba(239,68,68,0.1)', padding: 12, borderRadius: 12, marginBottom: 16 },
  errorText: { fontSize: 13, color: '#ef4444', textAlign: 'center' },
  stepContainer: { gap: 16 },
  inputGroup: { gap: 6 },
  label: { fontSize: 14, fontWeight: '500', color: '#11181C' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)', borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.5)', paddingHorizontal: 12 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 12, fontSize: 14, color: '#11181C' },
  eyeIcon: { padding: 4 },
  hintText: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  userTypesRow: { flexDirection: 'row', gap: 12 },
  userTypeCard: { flex: 1, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)', borderRadius: 12, padding: 12, backgroundColor: 'rgba(255,255,255,0.5)' },
  userTypeCardActive: { borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.1)' },
  userTypeLabel: { fontSize: 14, fontWeight: '600', color: '#11181C', marginBottom: 2 },
  userTypeLabelActive: { color: '#22c55e' },
  userTypeDesc: { fontSize: 10, color: '#687076' },
  userTypeDescActive: { color: '#22c55e' },
  nextButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#22c55e', borderRadius: 12, paddingVertical: 12, marginTop: 8 },
  nextButtonText: { fontSize: 16, fontWeight: '600', color: 'white' },
  termsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(0,0,0,0.2)', backgroundColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  termsText: { fontSize: 12, color: '#687076', flex: 1 },
  termsLink: { color: '#22c55e' },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  backButton: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)', backgroundColor: 'rgba(255,255,255,0.5)', paddingVertical: 12, alignItems: 'center' },
  backButtonText: { fontSize: 16, fontWeight: '500', color: '#11181C' },
  createButton: { flex: 1, backgroundColor: '#22c55e', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  createButtonDisabled: { opacity: 0.7 },
  createButtonText: { fontSize: 16, fontWeight: '600', color: 'white' },
  spinner: { width: 20, height: 20, borderWidth: 2, borderColor: 'white', borderTopColor: 'transparent', borderRadius: 10 },
  signinContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  signinText: { fontSize: 14, color: '#687076' },
  signinLink: { fontSize: 14, fontWeight: '600', color: '#22c55e' },
});