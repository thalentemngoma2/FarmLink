import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface MockOutbreakHeatMapProps {
  initialFilter?: 'all' | 'cow' | 'chicken' | 'goat';
}

export default function MockOutbreakHeatMap({ initialFilter = 'all' }: MockOutbreakHeatMapProps) {
  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        <TouchableOpacity style={[styles.filterButton, styles.filterActive]}>
          <Text style={[styles.filterText, styles.filterTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterButton}>
          <Text style={styles.filterText}>🐄 Cow</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterButton}>
          <Text style={styles.filterText}>🐔 Chicken</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterButton}>
          <Text style={styles.filterText}>🐐 Goat</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mapFallback}>
        <Ionicons name="map-outline" size={48} color="#22c55e" />
        <Text style={styles.fallbackTitle}>Outbreak Heat Map</Text>
        <Text style={styles.fallbackSubtitle}>
          Available on mobile devices
        </Text>
        <Text style={styles.demoNote}>
          Demo data shows outbreak locations for cow, chicken, and goat diseases.
          Use the mobile app to see interactive map with heat intensity.
        </Text>
      </View>

      {/* Legend (static) */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.severityDot, { backgroundColor: '#ef4444' }]} />
          <Text style={styles.legendText}>High severity (4‑5)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.severityDot, { backgroundColor: '#f97316' }]} />
          <Text style={styles.legendText}>Medium (2‑3)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.severityDot, { backgroundColor: '#eab308' }]} />
          <Text style={styles.legendText}>Low (1)</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  filterActive: { backgroundColor: '#22c55e' },
  filterText: { fontSize: 14, fontWeight: '500', color: '#374151' },
  filterTextActive: { color: '#fff' },
  mapFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
    backgroundColor: '#f9fafb',
    margin: 16,
    borderRadius: 16,
  },
  fallbackTitle: { fontSize: 18, fontWeight: '600', color: '#11181C', marginTop: 12 },
  fallbackSubtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  demoNote: { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 16, lineHeight: 18 },
  legendContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  severityDot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  legendText: { fontSize: 12, color: '#374151' },
});