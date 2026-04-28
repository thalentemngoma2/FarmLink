// components/OutbreakReport.tsx
import { GlassCard } from '@/components/ui/glass-card';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const animalTypes = ['cow', 'chicken', 'goat', 'sheep', 'pig', 'other'];

interface CardMessage {
  type: 'success' | 'error' | 'info';
  message: string;
}

export default function OutbreakReport({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [animalType, setAnimalType] = useState('');
  const [diseaseName, setDiseaseName] = useState('');
  const [description, setDescription] = useState('');
  const [mediaUris, setMediaUris] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [card, setCard] = useState<CardMessage | null>(null);

  const getLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Location is required for outbreak reporting');
      return;
    }
    const loc = await Location.getCurrentPositionAsync({});
    setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
  };

  const pickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your media');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0].uri) {
      setMediaUris([...mediaUris, result.assets[0].uri]);
    }
  };

  const submitReport = async () => {
    if (!user) return Alert.alert('Login required');
    if (!animalType) return Alert.alert('Animal type required');
    if (mediaUris.length === 0) return Alert.alert('At least one photo/video required');
    if (!location) await getLocation();
    if (!location) return Alert.alert('Location not available');

    setLoading(true);
    setCard(null);
    try {
      const formData = new FormData();
      formData.append('animalType', animalType);
      formData.append('diseaseName', diseaseName || '');
      formData.append('description', description || '');
      formData.append('location', `POINT(${location.lng} ${location.lat})`);
      for (const uri of mediaUris) {
        const filename = uri.split('/').pop() || 'image.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        formData.append('media', { uri, name: filename, type } as any);
      }

      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const API_URL = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'web' ? 'http://localhost:3000' : 'http://192.168.8.143:3000');
      const response = await fetch(`${API_URL}/outbreak/report`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Submission failed');

      if (result.card) {
        setCard({ type: result.card.type, message: result.card.message });
      }
      if (result.verificationStatus === 'verified') {
        setTimeout(() => onClose(), 3000);
      }
    } catch (err: any) {
      setCard({ type: 'error', message: err.message || 'Something went wrong' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.modalContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#11181C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Outbreak</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {card && (
          <GlassCard style={[styles.card, card.type === 'success' ? styles.successCard : styles.errorCard]}>
            <Text style={styles.cardText}>{card.message}</Text>
          </GlassCard>
        )}

        <GlassCard style={styles.formCard}>
          <Text style={styles.title}>Report Animal Disease Outbreak</Text>

          <View style={styles.typeContainer}>
            {animalTypes.map(type => (
              <TouchableOpacity
                key={type}
                style={[styles.typeButton, animalType === type && styles.typeButtonActive]}
                onPress={() => setAnimalType(type)}
              >
                <Text style={[styles.typeText, animalType === type && styles.typeTextActive]}>
                  {type.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            placeholder="Disease name (optional)"
            placeholderTextColor="#9ca3af"
            value={diseaseName}
            onChangeText={setDiseaseName}
            style={styles.input}
          />
          <TextInput
            placeholder="Description"
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
            style={[styles.input, styles.textArea]}
          />

          <TouchableOpacity onPress={pickMedia} style={styles.addButton}>
            <Ionicons name="camera-outline" size={20} color="#22c55e" />
            <Text style={styles.addButtonText}>Add Photo / Video</Text>
          </TouchableOpacity>
          {mediaUris.map((uri, i) => (
            <View key={i} style={styles.fileItem}>
              <Ionicons name="document-attach-outline" size={16} color="#22c55e" />
              <Text style={styles.fileName}>{uri.split('/').pop()}</Text>
            </View>
          ))}

          <TouchableOpacity onPress={getLocation} style={styles.locationButton}>
            <Ionicons name="location-outline" size={20} color="#22c55e" />
            <Text style={styles.locationText}>
              {location ? '✓ Location captured' : '📍 Get current location'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={submitReport}
            style={[styles.submitButton, loading && styles.submitDisabled]}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitText}>Submit Report</Text>}
          </TouchableOpacity>
        </GlassCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#11181C' },
  scrollContent: { padding: 16, paddingBottom: 32 },
  card: { padding: 16, marginBottom: 16, borderRadius: 12 },
  successCard: { backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 1, borderColor: '#22c55e' },
  errorCard: { backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: '#ef4444' },
  cardText: { fontSize: 14, color: '#11181C', textAlign: 'center' },
  formCard: { padding: 16, borderRadius: 20, overflow: 'hidden' },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: '#11181C' },
  typeContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  typeButton: { backgroundColor: 'rgba(255,255,255,0.5)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, margin: 4 },
  typeButtonActive: { backgroundColor: '#22c55e' },
  typeText: { fontSize: 12, fontWeight: '500', color: '#687076' },
  typeTextActive: { color: '#fff' },
  input: { backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#11181C', marginBottom: 12, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  textArea: { height: 80, textAlignVertical: 'top' },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(34,197,94,0.1)', paddingVertical: 12, borderRadius: 12, marginBottom: 12 },
  addButtonText: { fontSize: 14, fontWeight: '500', color: '#22c55e' },
  fileItem: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6, paddingHorizontal: 8 },
  fileName: { fontSize: 12, color: '#687076' },
  locationButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(34,197,94,0.1)', paddingVertical: 12, borderRadius: 12, marginBottom: 16 },
  locationText: { fontSize: 14, fontWeight: '500', color: '#22c55e' },
  submitButton: { backgroundColor: '#22c55e', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  submitDisabled: { opacity: 0.7 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});