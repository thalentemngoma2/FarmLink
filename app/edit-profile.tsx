import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EditProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState<string>('farmer');

  // Common fields
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');

  // Farmer-specific fields
  const [farmType, setFarmType] = useState('');
  const [bio, setBio] = useState('');

  // Retailer-specific fields
  const [storeName, setStoreName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [businessType, setBusinessType] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get role
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      const userRole = userData?.role || 'farmer';
      setRole(userRole);

      if (userRole === 'retailer') {
        const { data } = await supabase
          .from('retail_profiles')
          .select('store_name, registration_number, address, city, business_type')
          .eq('user_id', user.id)
          .maybeSingle();
        if (data) {
          setStoreName(data.store_name || '');
          setRegistrationNumber(data.registration_number || '');
          setAddress(data.address || '');
          setCity(data.city || '');
          setBusinessType(data.business_type || '');
        }
        // Also load common profile fields
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, location')
          .eq('user_id', user.id)
          .maybeSingle();
        if (profileData) {
          setName(profileData.full_name || user.user_metadata?.name || '');
          setLocation(profileData.location || user.user_metadata?.location || '');
        } else {
          setName(user.user_metadata?.name || '');
          setLocation(user.user_metadata?.location || '');
        }
      } else {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, location, farm_type, bio')
          .eq('user_id', user.id)
          .maybeSingle();
        if (data) {
          setName(data.full_name || user.user_metadata?.name || '');
          setLocation(data.location || user.user_metadata?.location || '');
          setFarmType(data.farm_type || '');
          setBio(data.bio || '');
        } else {
          setName(user.user_metadata?.name || '');
          setLocation(user.user_metadata?.location || '');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (role === 'retailer') {
        // Upsert common profile
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({ user_id: user.id, full_name: name, location });
        if (profileError) throw profileError;

        const { error: retailError } = await supabase
          .from('retail_profiles')
          .upsert({
            user_id: user.id,
            store_name: storeName,
            registration_number: registrationNumber,
            address,
            city,
            business_type: businessType,
            updated_at: new Date(),
          });
        if (retailError) throw retailError;
      } else {
        const { error: farmerError } = await supabase
          .from('profiles')
          .upsert({ user_id: user.id, full_name: name, location, farm_type: farmType, bio });
        if (farmerError) throw farmerError;
      }

      Alert.alert('Success', 'Profile updated successfully');
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#22c55e" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Edit Profile</Text>
          <Text style={styles.roleBadge}>{role === 'retailer' ? 'Retailer Account' : 'Farmer Account'}</Text>

          {/* Common Fields */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            <TextInput
              style={styles.input}
              placeholder={role === 'retailer' ? 'Contact Person Name' : 'Full Name'}
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder="Location (City, Country)"
              value={location}
              onChangeText={setLocation}
            />
          </View>

          {role === 'retailer' ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Business Details</Text>
              <TextInput
                style={styles.input}
                placeholder="Store / Business Name *"
                value={storeName}
                onChangeText={setStoreName}
              />
              <TextInput
                style={styles.input}
                placeholder="Business Type (e.g. Supermarket, Restaurant)"
                value={businessType}
                onChangeText={setBusinessType}
              />
              <TextInput
                style={styles.input}
                placeholder="Registration Number"
                value={registrationNumber}
                onChangeText={setRegistrationNumber}
              />
              <TextInput
                style={styles.input}
                placeholder="Street Address"
                value={address}
                onChangeText={setAddress}
              />
              <TextInput
                style={styles.input}
                placeholder="City"
                value={city}
                onChangeText={setCity}
              />
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Farm Details</Text>
              <TextInput
                style={styles.input}
                placeholder="Farm Type (e.g. Crop, Livestock, Mixed)"
                value={farmType}
                onChangeText={setFarmType}
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Bio / About your farm"
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          )}

          <TouchableOpacity style={styles.button} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Save Profile</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#11181C', marginBottom: 4 },
  roleBadge: { fontSize: 13, color: '#22c55e', fontWeight: '600', marginBottom: 20, textTransform: 'capitalize' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#11181C', marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#11181C',
    backgroundColor: '#f9fafb',
    marginBottom: 12,
  },
  textArea: { minHeight: 80, paddingTop: 12 },
  button: { backgroundColor: '#22c55e', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  buttonText: { color: 'white', fontWeight: '700', fontSize: 16 },
});
