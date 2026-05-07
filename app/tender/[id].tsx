import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

interface TenderDetail {
  id: string;
  title: string;
  description: string;
  productCategory: string;
  quantityNeeded: string;
  budgetRange: string;
  deliveryLocation: string;
  deliveryDate: string;
  deadline: string;
  status: string;
  retailer: {
    name: string;
    city: string;
    address: string;
    businessType: string;
  };
  requirements: {
    id: string;
    productName: string;
    quantity: string;
    gradeQuality: string;
    notes: string;
  }[];
  createdAt: string;
}

export default function TenderDetailPage() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();

  const [tender, setTender] = useState<TenderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasApplied, setHasApplied] = useState(false);

  const fetchTender = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('tenders')
        .select('*, profiles:retailer_id(name, location, farm_type), tender_requirements(*)')
        .eq('tender_id', id)
        .single();

      if (error) throw error;

      setTender({
        id: data.tender_id,
        title: data.title,
        description: data.description,
        productCategory: data.product_category,
        quantityNeeded: data.quantity_needed,
        budgetRange: data.budget_range,
        deliveryLocation: data.delivery_location,
        deliveryDate: data.delivery_date,
        deadline: data.deadline,
        status: data.status,
          retailer: {
          name: data.profiles?.name || data.profiles?.full_name || 'Unknown',
          city: data.profiles?.location || '',
          address: '',
          businessType: data.profiles?.farm_type || 'Retailer',
        },
        requirements: (data.tender_requirements || []).map((r: any) => ({
          id: r.requirement_id,
          productName: r.product_name,
          quantity: r.quantity,
          gradeQuality: r.grade_quality,
          notes: r.notes,
        })),
        createdAt: data.created_at,
      });

      if (user?.id) {
        const { data: appsData } = await supabase
          .from('tender_applications')
          .select('application_id')
          .eq('tender_id', id)
          .eq('farmer_id', user.id)
          .maybeSingle();
        setHasApplied(!!appsData);
      }

    } catch (error) {
      console.error('Failed to fetch tender', error);
    } finally {
      setLoading(false);
    }
  }, [id, user]);


  useEffect(() => {
    if (id) fetchTender();
  }, [id, fetchTender]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#22c55e';
      case 'closed': return '#ef4444';
      case 'awarded': return '#3b82f6';
      default: return '#9ca3af';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#22c55e" />
        </View>
      </SafeAreaView>
    );
  }

  if (!tender) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <Text>Tender not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isOpen = tender.status === 'open';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#11181C" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tender Details</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInUp}>
            {/* Status & Retailer */}
            <View style={styles.card}>
              <View style={styles.statusRow}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(tender.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(tender.status) }]}>{tender.status.toUpperCase()}</Text>
                </View>
                <Text style={styles.postedDate}>Posted {new Date(tender.createdAt).toLocaleDateString()}</Text>
              </View>

              <Text style={styles.title}>{tender.title}</Text>

              <View style={styles.retailerCard}>
                <View style={styles.retailerIcon}>
                  <Ionicons name="storefront-outline" size={24} color="#22c55e" />
                </View>
                <View style={styles.retailerInfo}>
                  <Text style={styles.retailerName}>{tender.retailer.name}</Text>
                  <Text style={styles.retailerMeta}>{tender.retailer.businessType} • {tender.retailer.city}</Text>
                  {tender.retailer.address && <Text style={styles.retailerAddress}>{tender.retailer.address}</Text>}
                </View>
              </View>
            </View>

            {/* Description */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{tender.description}</Text>
            </View>

            {/* Details Grid */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Details</Text>
              <View style={styles.detailsGrid}>
                {tender.productCategory && (
                  <View style={styles.detailBox}>
                    <Ionicons name="pricetag-outline" size={18} color="#22c55e" />
                    <Text style={styles.detailLabel}>Category</Text>
                    <Text style={styles.detailValue}>{tender.productCategory}</Text>
                  </View>
                )}
                {tender.quantityNeeded && (
                  <View style={styles.detailBox}>
                    <Ionicons name="cube-outline" size={18} color="#22c55e" />
                    <Text style={styles.detailLabel}>Quantity</Text>
                    <Text style={styles.detailValue}>{tender.quantityNeeded}</Text>
                  </View>
                )}
                {tender.budgetRange && (
                  <View style={styles.detailBox}>
                    <Ionicons name="cash-outline" size={18} color="#22c55e" />
                    <Text style={styles.detailLabel}>Budget</Text>
                    <Text style={styles.detailValue}>{tender.budgetRange}</Text>
                  </View>
                )}
                {tender.deliveryLocation && (
                  <View style={styles.detailBox}>
                    <Ionicons name="location-outline" size={18} color="#22c55e" />
                    <Text style={styles.detailLabel}>Delivery</Text>
                    <Text style={styles.detailValue}>{tender.deliveryLocation}</Text>
                  </View>
                )}
              </View>

              <View style={styles.deadlineBox}>
                <Ionicons name="time-outline" size={18} color="#ef4444" />
                <View style={{ marginLeft: 8 }}>
                  <Text style={styles.deadlineLabel}>Application Deadline</Text>
                  <Text style={styles.deadlineValue}>{new Date(tender.deadline).toLocaleDateString()}</Text>
                </View>
              </View>
            </View>

            {/* Requirements */}
            {tender.requirements.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Requirements</Text>
                {tender.requirements.map((req, idx) => (
                  <View key={req.id} style={[styles.requirementRow, idx > 0 && styles.requirementBorder]}>
                    <View style={styles.reqBullet}>
                      <Text style={styles.reqNumber}>{idx + 1}</Text>
                    </View>
                    <View style={styles.reqContent}>
                      <Text style={styles.reqName}>{req.productName}</Text>
                      {req.quantity && <Text style={styles.reqDetail}>Quantity: {req.quantity}</Text>}
                      {req.gradeQuality && <Text style={styles.reqDetail}>Grade: {req.gradeQuality}</Text>}
                      {req.notes && <Text style={styles.reqNotes}>{req.notes}</Text>}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>
        </ScrollView>

        {/* Apply Button */}
        {isOpen && user?.role === 'farmer' && (
          <View style={styles.footer}>
            {hasApplied ? (
              <View style={styles.appliedButton}>
                <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                <Text style={styles.appliedText}>Application Submitted</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => router.push(`/tender/apply/${tender.id}`)}
              >
                <Text style={styles.applyButtonText}>Apply for this Tender</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
   card: {
     backgroundColor: '#fff',
     borderRadius: 16,
     padding: 16,
     marginBottom: 12,
     ...Platform.select({ web: { boxShadow: '0px 1px 4px rgba(0,0,0,0.05)' }, default: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 } }),
   },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: '700' },
  postedDate: { fontSize: 12, color: '#9ca3af' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#11181C', marginBottom: 12 },
  retailerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderRadius: 12, padding: 12 },
  retailerIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center' },
  retailerInfo: { marginLeft: 12, flex: 1 },
  retailerName: { fontSize: 15, fontWeight: '700', color: '#11181C' },
  retailerMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  retailerAddress: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#11181C', marginBottom: 10 },
  description: { fontSize: 14, color: '#4b5563', lineHeight: 22 },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  detailBox: { width: '47%', backgroundColor: '#f9fafb', borderRadius: 12, padding: 12, alignItems: 'center' },
  detailLabel: { fontSize: 11, color: '#9ca3af', marginTop: 6 },
  detailValue: { fontSize: 13, fontWeight: '600', color: '#11181C', marginTop: 2, textAlign: 'center' },
  deadlineBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef2f2', borderRadius: 12, padding: 12, marginTop: 12 },
  deadlineLabel: { fontSize: 11, color: '#ef4444' },
  deadlineValue: { fontSize: 14, fontWeight: '700', color: '#ef4444', marginTop: 2 },
  requirementRow: { flexDirection: 'row', paddingVertical: 10 },
  requirementBorder: { borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  reqBullet: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  reqNumber: { fontSize: 12, fontWeight: '700', color: '#22c55e' },
  reqContent: { flex: 1 },
  reqName: { fontSize: 14, fontWeight: '600', color: '#11181C' },
  reqDetail: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  reqNotes: { fontSize: 12, color: '#9ca3af', marginTop: 4, fontStyle: 'italic' },
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
  applyButton: {
    backgroundColor: '#22c55e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 40,
  },
  applyButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  appliedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 40,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
  },
  appliedText: { color: '#166534', fontSize: 16, fontWeight: '700' },
});
