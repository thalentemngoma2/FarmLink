import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
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
import Animated, { FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

interface Requirement {
  productName: string;
  quantity: string;
  gradeQuality: string;
  notes: string;
}

export default function PostTenderPage() {
  const { session, user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [quantityNeeded, setQuantityNeeded] = useState('');
  const [budgetRange, setBudgetRange] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [requirements, setRequirements] = useState<Requirement[]>([
    { productName: '', quantity: '', gradeQuality: '', notes: '' },
  ]);
  const [submitting, setSubmitting] = useState(false);

  // Support Request State (for farmers)
  const [supportTitle, setSupportTitle] = useState('');
  const [supportDesc, setSupportDesc] = useState('');
  const [supportUrgency, setSupportUrgency] = useState('Medium');

  const addRequirement = () => {
    setRequirements([...requirements, { productName: '', quantity: '', gradeQuality: '', notes: '' }]);
  };

  const updateRequirement = (index: number, field: keyof Requirement, value: string) => {
    const updated = [...requirements];
    updated[index][field] = value;
    setRequirements(updated);
  };

  const removeRequirement = (index: number) => {
    if (requirements.length <= 1) return;
    setRequirements(requirements.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim() || !deadline.trim()) {
      Alert.alert('Error', 'Title, description, and deadline are required');
      return;
    }

    const validRequirements = requirements.filter(r => r.productName.trim());

    setSubmitting(true);
    try {
      const currentUserId = user?.id || session?.user?.id;

      // Auto-fix: Ensure the user exists in the public "users" table 
      // to prevent Foreign Key constraint (23503) errors when inserting the tender.
      if (currentUserId) {
        const { data: userCheck } = await supabase
          .from('users')
          .select('user_id')
          .eq('user_id', currentUserId)
          .maybeSingle();

        if (!userCheck) {
          // Ensure all NOT NULL fields from the users schema are provided
          const email = user?.email ?? session?.user?.email ?? `user_${currentUserId}@placeholder.com`;
          const { error: userInsertError } = await supabase.from('users').insert({
            user_id: currentUserId,
            username: user?.name || 'Retailer',
            email: email,
            phone_number: '',
            password_hash: '',
            role: user?.role || 'farmer',
          });
          
          if (userInsertError && userInsertError.code !== '23505') {
            console.error('Users Table Insert Error:', userInsertError);
            throw new Error(`User profile creation failed: ${userInsertError.message}`);
          }
        }
      }

      const { data: tender, error } = await supabase
        .from('tenders')
        .insert({
          retailer_id: currentUserId,
          title,
          description,
          product_category: productCategory,
          quantity_needed: quantityNeeded,
          budget_range: budgetRange,
          delivery_location: deliveryLocation,
          delivery_date: deliveryDate,
          deadline,
          status: 'open',
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase Tenders Insert Error:', error);
        throw error;
      }

      if (validRequirements.length > 0) {
        const reqs = validRequirements.map(r => ({
          tender_id: tender.tender_id,
          product_name: r.productName,
          quantity: r.quantity,
          grade_quality: r.gradeQuality,
          notes: r.notes,
        }));
        const { error: reqError } = await supabase.from('tender_requirements').insert(reqs);
        if (reqError) {
          console.error('Supabase Requirements Insert Error:', reqError);
          throw reqError;
        }
      }

      Alert.alert('Success', 'Your tender has been posted!', [
        { text: 'OK', onPress: () => router.replace('/tenders') },
      ]);
    } catch (error: any) {
      console.error('Full Error Object:', error);

      if (error.code === '23503') {
        Alert.alert(
          'Profile Missing',
          'Your account is missing a profile record in the database. Please ensure your user account is fully set up in the "users" table before posting a tender.'
        );
      } else {
        const details = error.details || error.hint || '';
        const msg = error.message || 'Failed to post tender';
        const code = error.code ? `\nCode: ${error.code}` : '';
        Alert.alert('Database Error', `${msg}\n${details}${code}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (user && user.role === 'extension_officer') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#11181C" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Farmer Requests</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Ionicons name="documents-outline" size={40} color="#22c55e" />
          </View>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#11181C', marginBottom: 8 }}>No Active Requests</Text>
          <Text style={{ fontSize: 14, color: '#687076', textAlign: 'center', lineHeight: 20 }}>
            When farmers in your area request agricultural support, their cases will appear here for you to review and assist.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (user && user.role !== 'retailer' && user.role !== 'admin') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#11181C" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Request Support</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Animated.View entering={FadeInUp}>
              <View style={{ alignItems: 'center', marginBottom: 24, paddingHorizontal: 16 }}>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <Ionicons name="people-outline" size={32} color="#22c55e" />
                </View>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#11181C', textAlign: 'center', marginBottom: 6 }}>Need Expert Advice?</Text>
                <Text style={{ fontSize: 14, color: '#687076', textAlign: 'center', lineHeight: 20 }}>
                  Connect with an agricultural extension officer in your area for guidance, farm visits, and crop support.
                </Text>
              </View>

              <View style={styles.formCard}>
                <View style={styles.field}>
                  <Text style={styles.label}>What do you need help with? *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Crop disease, Soil testing"
                    placeholderTextColor="#9ca3af"
                    value={supportTitle}
                    onChangeText={setSupportTitle}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Detailed Description *</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Provide details so the officer can prepare before reaching out..."
                    placeholderTextColor="#9ca3af"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    value={supportDesc}
                    onChangeText={setSupportDesc}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Urgency</Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                    {['Low', 'Medium', 'High'].map((urgency) => {
                      const isActive = supportUrgency === urgency;
                      let borderColor = '#e5e7eb';
                      let bgColor = '#f9fafb';
                      let textColor = '#4b5563';

                      if (isActive) {
                        if (urgency === 'Low') { borderColor = '#22c55e'; bgColor = '#f0fdf4'; textColor = '#166534'; }
                        else if (urgency === 'Medium') { borderColor = '#f59e0b'; bgColor = '#fffbeb'; textColor = '#b45309'; }
                        else if (urgency === 'High') { borderColor = '#ef4444'; bgColor = '#fef2f2'; textColor = '#b91c1c'; }
                      }

                      return (
                        <TouchableOpacity 
                          key={urgency} 
                          style={{ 
                            flex: 1, 
                            paddingVertical: 10, 
                            borderRadius: 8, 
                            borderWidth: 1, 
                            borderColor: borderColor, 
                            alignItems: 'center', 
                            backgroundColor: bgColor 
                          }}
                          onPress={() => setSupportUrgency(urgency)}
                        >
                          <Text style={{ 
                            fontSize: 13, 
                            color: textColor, 
                            fontWeight: isActive ? '600' : '500' 
                          }}>
                            {urgency}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            </Animated.View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.submitButton, (!supportTitle.trim() || !supportDesc.trim()) && styles.submitButtonDisabled]}
              disabled={!supportTitle.trim() || !supportDesc.trim() || submitting}
              onPress={() => {
                Alert.alert('Request Sent', 'An extension officer will review your request and get back to you shortly.', [
                  { text: 'OK', onPress: () => { setSupportTitle(''); setSupportDesc(''); router.back(); } }
                ]);
              }}
            >
              <Text style={styles.submitButtonText}>Send Request</Text>
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#11181C" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post a Tender</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInUp}>
            <Text style={styles.subtitle}>Create a new supply contract opportunity for farmers.</Text>

            <View style={styles.formCard}>
              {/* Title */}
              <View style={styles.field}>
                <Text style={styles.label}>Tender Title *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Supply of Fresh Tomatoes - 6 Months"
                  placeholderTextColor="#9ca3af"
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              {/* Description */}
              <View style={styles.field}>
                <Text style={styles.label}>Description *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Describe what you're looking for, quality standards, delivery schedule..."
                  placeholderTextColor="#9ca3af"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              {/* Category */}
              <View style={styles.field}>
                <Text style={styles.label}>Product Category</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Vegetables, Fruits, Grains"
                  placeholderTextColor="#9ca3af"
                  value={productCategory}
                  onChangeText={setProductCategory}
                />
              </View>

              {/* Quantity & Budget */}
              <View style={styles.row}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>Quantity Needed</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 500 kg"
                    placeholderTextColor="#9ca3af"
                    value={quantityNeeded}
                    onChangeText={setQuantityNeeded}
                  />
                </View>
                <View style={[styles.field, { flex: 1, marginLeft: 10 }]}>
                  <Text style={styles.label}>Budget Range</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. R10 000"
                    placeholderTextColor="#9ca3af"
                    value={budgetRange}
                    onChangeText={setBudgetRange}
                  />
                </View>
              </View>

              {/* Delivery Location & Date */}
              <View style={styles.row}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>Delivery Location</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Johannesburg CBD"
                    placeholderTextColor="#9ca3af"
                    value={deliveryLocation}
                    onChangeText={setDeliveryLocation}
                  />
                </View>
                <View style={[styles.field, { flex: 1, marginLeft: 10 }]}>
                  <Text style={styles.label}>Delivery Date</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#9ca3af"
                    value={deliveryDate}
                    onChangeText={setDeliveryDate}
                  />
                </View>
              </View>

              {/* Deadline */}
              <View style={styles.field}>
                <Text style={styles.label}>Application Deadline *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#9ca3af"
                  value={deadline}
                  onChangeText={setDeadline}
                />
              </View>
            </View>

            {/* Requirements */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Product Requirements</Text>
              <TouchableOpacity onPress={addRequirement} style={styles.addButton}>
                <Ionicons name="add-circle" size={22} color="#22c55e" />
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>

            {requirements.map((req, idx) => (
              <View key={idx} style={styles.reqCard}>
                <View style={styles.reqHeader}>
                  <Text style={styles.reqTitle}>Item {idx + 1}</Text>
                  {requirements.length > 1 && (
                    <TouchableOpacity onPress={() => removeRequirement(idx)}>
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
                <TextInput
                  style={styles.reqInput}
                  placeholder="Product name *"
                  placeholderTextColor="#9ca3af"
                  value={req.productName}
                  onChangeText={(v) => updateRequirement(idx, 'productName', v)}
                />
                <View style={styles.row}>
                  <TextInput
                    style={[styles.reqInput, { flex: 1 }]}
                    placeholder="Quantity"
                    placeholderTextColor="#9ca3af"
                    value={req.quantity}
                    onChangeText={(v) => updateRequirement(idx, 'quantity', v)}
                  />
                  <TextInput
                    style={[styles.reqInput, { flex: 1, marginLeft: 8 }]}
                    placeholder="Grade/Quality"
                    placeholderTextColor="#9ca3af"
                    value={req.gradeQuality}
                    onChangeText={(v) => updateRequirement(idx, 'gradeQuality', v)}
                  />
                </View>
                <TextInput
                  style={[styles.reqInput, styles.textArea]}
                  placeholder="Additional notes..."
                  placeholderTextColor="#9ca3af"
                  value={req.notes}
                  onChangeText={(v) => updateRequirement(idx, 'notes', v)}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />
              </View>
            ))}
          </Animated.View>
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.submitButtonText}>Post Tender</Text>
                <Ionicons name="send" size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#11181C' },
  scrollContent: { padding: 16, paddingBottom: 100 },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 16, lineHeight: 20 },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  field: { marginBottom: 14 },
  label: { fontSize: 14, fontWeight: '600', color: '#11181C', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#11181C',
    backgroundColor: '#f9fafb',
  },
  textArea: { minHeight: 80, paddingTop: 12 },
  row: { flexDirection: 'row' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#11181C' },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addButtonText: { fontSize: 14, fontWeight: '600', color: '#22c55e' },
  reqCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  reqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  reqTitle: { fontSize: 14, fontWeight: '700', color: '#11181C' },
  reqInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#11181C',
    backgroundColor: '#f9fafb',
    marginBottom: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 24,
  },
  submitButton: {
    backgroundColor: '#22c55e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 40,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
