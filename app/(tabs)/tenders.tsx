import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNav } from '@/components/bottom-nav';
import { MobileHeader } from '@/components/mobile-header';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

interface Tender {
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
  retailerName: string;
  retailerCity: string;
  timeAgo: string;
  requirements: { id: string; productName: string; quantity: string; gradeQuality: string }[];
}


const formatTimeAgo = (dateStr: string) => {
  if (!dateStr) return 'Just now';
  const now = new Date().getTime();
  const date = new Date(dateStr).getTime();
  if (isNaN(date) || new Date(dateStr).getFullYear() <= 1970) return 'Just now';
  const diffMins = Math.floor((now - date) / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
};

export default function TendersPage() {
  const { user } = useAuth();
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Vegetables', 'Fruits', 'Grains', 'Dairy', 'Meat', 'Other'];

  const fetchTenders = useCallback(async () => {
    try {
    let query = supabase
        .from('tenders')
        .select('tender_id, title, description, product_category, quantity_needed, budget_range, delivery_location, delivery_date, deadline, status, retailer_id, created_at, tender_requirements(*)')
        .order('created_at', { ascending: false });

      if (selectedCategory !== 'All') {
        query = query.eq('product_category', selectedCategory);
      }
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch tenders first (avoid profiles embed joins that can break PostgREST).
      const tenderRows = data || [];

      // Collect retailer user_ids to look up profiles in a second query.
      const retailerIds = Array.from(
        new Set((tenderRows || []).map((t: any) => t.retailer_id).filter(Boolean))
      );

      let profileById = new Map<string, { name: string | null; location: string | null }>();
      if (retailerIds.length > 0) {
        const { data: retailProfileRows, error: retailProfileError } = await supabase
          .from('retail_profiles')
          .select('user_id, store_name, city')
          .in('user_id', retailerIds);

        if (retailProfileError) throw retailProfileError;

        (retailProfileRows || []).forEach((p: any) => {
          profileById.set(p.user_id, { name: p.store_name, location: p.city });
        });
      }

      const formattedTenders: Tender[] = (tenderRows || []).map((t: any) => {
        const p = profileById.get(t.retailer_id);
        return {
          id: t.tender_id,
          title: t.title,
          description: t.description,
          productCategory: t.product_category,
          quantityNeeded: t.quantity_needed,
          budgetRange: t.budget_range,
          deliveryLocation: t.delivery_location,
          deliveryDate: t.delivery_date,
          deadline: t.deadline,
          status: t.status,
          retailerName: p?.name || 'Unknown Retailer',
          retailerCity: p?.location || '',
          timeAgo: formatTimeAgo(t.created_at),
          requirements: (t.tender_requirements || []).map((r: any) => ({
            id: r.requirement_id,
            productName: r.product_name,
            quantity: r.quantity,
            gradeQuality: r.grade_quality,
          })),
        };
      });

      setTenders(formattedTenders);
    } catch (error: any) {
      if (error.name === 'AbortError' || error.message?.includes('AbortError')) return;
      console.error('Failed to fetch tenders', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, searchQuery]);

  useFocusEffect(
    useCallback(() => {
      fetchTenders();
    }, [fetchTenders])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchTenders();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#22c55e';
      case 'closed': return '#ef4444';
      case 'awarded': return '#3b82f6';
      default: return '#9ca3af';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <LinearGradient colors={['#f0fdf4', '#ffffff', '#ecfdf5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <MobileHeader />

          <Animated.View entering={FadeInUp.duration(400)} style={styles.header}>
            <Text style={styles.headerTitle}>Tender Marketplace</Text>
            <Text style={styles.headerSubtitle}>Find supply contracts from retail stores</Text>
          </Animated.View>

          {/* Search */}
          <Animated.View entering={FadeInUp.delay(100)} style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color="#9ca3af" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search tenders..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={fetchTenders}
              returnKeyType="search"
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity onPress={() => { setSearchQuery(''); fetchTenders(); }}>
                <Ionicons name="close-circle" size={20} color="#9ca3af" />
              </TouchableOpacity>
            ) : null}
          </Animated.View>

          {/* Categories */}
          <Animated.View entering={FadeInUp.delay(200)}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContainer}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text style={[styles.categoryText, selectedCategory === cat && styles.categoryTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>

          {/* Tenders List */}
          <View style={styles.tendersSection}>
            {loading ? (
              <ActivityIndicator size="large" color="#22c55e" style={{ marginTop: 40 }} />
            ) : tenders.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="cart-outline" size={48} color="#22c55e" />
                <Text style={styles.emptyTitle}>No tenders found</Text>
                <Text style={styles.emptySubtitle}>Check back later for new supply opportunities</Text>
              </View>
            ) : (
              tenders.map((tender, idx) => (
                <Animated.View key={tender.id} entering={FadeInUp.delay(idx * 80)}>
                  <TouchableOpacity
                    style={styles.tenderCard}
                    onPress={() => router.push(`/tender/${tender.id}`)}
                    activeOpacity={0.9}
                  >
                    <View style={styles.tenderHeader}>
                      <View style={styles.tenderMeta}>
                        <Text style={styles.retailerName}>{tender.retailerName}</Text>
                        <Text style={styles.retailerLocation}>{tender.retailerCity}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(tender.status) + '20' }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(tender.status) }]}>{tender.status.toUpperCase()}</Text>
                      </View>
                    </View>

                    <Text style={styles.tenderTitle}>{tender.title}</Text>
                    <Text style={styles.tenderDescription} numberOfLines={2}>{tender.description}</Text>

                    <View style={styles.tenderDetails}>
                      {tender.productCategory ? (
                        <View style={styles.detailItem}>
                          <Ionicons name="pricetag-outline" size={14} color="#6b7280" />
                          <Text style={styles.detailText}>{tender.productCategory}</Text>
                        </View>
                      ) : null}
                      {tender.quantityNeeded ? (
                        <View style={styles.detailItem}>
                          <Ionicons name="cube-outline" size={14} color="#6b7280" />
                          <Text style={styles.detailText}>{tender.quantityNeeded}</Text>
                        </View>
                      ) : null}
                      {tender.budgetRange ? (
                        <View style={styles.detailItem}>
                          <Ionicons name="cash-outline" size={14} color="#6b7280" />
                          <Text style={styles.detailText}>{tender.budgetRange}</Text>
                        </View>
                      ) : null}
                    </View>

                    {tender.requirements.length > 0 ? (
                      <View style={styles.requirementsRow}>
                        {tender.requirements.slice(0, 2).map((req) => (
                          <View key={req.id} style={styles.requirementChip}>
                            <Text style={styles.requirementChipText}>{req.productName}</Text>
                          </View>
                        ))}
                         {tender.requirements.length > 2 ? (
                           <Text style={styles.moreText}>+{tender.requirements.length - 2} more</Text>
                         ) : null}
                       </View>
                    ) : null}

                    <View style={styles.tenderFooter}>
                      <View style={styles.deadlineRow}>
                        <Ionicons name="time-outline" size={14} color="#ef4444" />
                        <Text style={styles.deadlineText}>Deadline: {new Date(tender.deadline).toLocaleDateString()}</Text>
                      </View>
                      <Text style={styles.timeAgo}>{tender.timeAgo}</Text>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
))
              )}
            </View>
          </ScrollView>

          <BottomNav />
          {user?.role === 'retailer' ? (
            <TouchableOpacity
              style={styles.fab}
              onPress={() => router.push('/tender/post')}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={28} color="#fff" />
            </TouchableOpacity>
          ) : null}
        </View>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, position: 'relative' },
  scrollContent: { flexGrow: 1, paddingBottom: 100, paddingTop: 90 },
  header: { paddingHorizontal: 16, marginBottom: 16 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#11181C' },
  headerSubtitle: { fontSize: 14, color: '#687076', marginTop: 4 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16, color: '#11181C' },
  categoriesContainer: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  categoryChipActive: { backgroundColor: '#22c55e' },
  categoryText: { fontSize: 13, fontWeight: '500', color: '#4b5563' },
  categoryTextActive: { color: '#fff' },
  tendersSection: { paddingHorizontal: 16, marginTop: 8 },
   tenderCard: {
     backgroundColor: 'rgba(255,255,255,0.9)',
     borderRadius: 20,
     borderWidth: 1,
     borderColor: 'rgba(34,197,94,0.15)',
     padding: 16,
     marginBottom: 12,
     ...Platform.select({ web: { boxShadow: '0px 2px 8px rgba(0,0,0,0.05)' }, default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 } }),
   },
  tenderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  tenderMeta: { flex: 1 },
  retailerName: { fontSize: 14, fontWeight: '700', color: '#11181C' },
  retailerLocation: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: '700' },
  tenderTitle: { fontSize: 17, fontWeight: '700', color: '#11181C', marginBottom: 6 },
  tenderDescription: { fontSize: 13, color: '#4b5563', lineHeight: 18, marginBottom: 10 },
  tenderDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 10 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { fontSize: 12, color: '#4b5563' },
  requirementsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  requirementChip: { backgroundColor: '#f0fdf4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' },
  requirementChipText: { fontSize: 11, color: '#166534', fontWeight: '500' },
  moreText: { fontSize: 11, color: '#9ca3af', alignSelf: 'center' },
  tenderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 10 },
  deadlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  deadlineText: { fontSize: 12, color: '#ef4444', fontWeight: '500' },
  timeAgo: { fontSize: 12, color: '#9ca3af' },
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#11181C', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});
