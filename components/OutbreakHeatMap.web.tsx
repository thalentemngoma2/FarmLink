// components/OutbreakHeatMap.web.tsx
import { supabase } from '@/lib/supabase';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function OutbreakHeatMap() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    supabase
      .from('outbreak_reports')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'verified')
      .then(({ count: c }) => setCount(c ?? 0));
  }, []);

  return (
    <View style={styles.webFallback}>
      <Text style={styles.fallbackText}>🌍 Outbreak Map</Text>
      <Text style={styles.fallbackSubtext}>{count} active outbreak reports</Text>
      <Text style={styles.note}>Map view is available on mobile devices</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  webFallback: {
    height: 300,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    margin: 16,
  },
  fallbackText: { fontSize: 18, fontWeight: '600', color: '#22c55e', marginBottom: 8 },
  fallbackSubtext: { fontSize: 14, color: '#374151' },
  note: { fontSize: 12, color: '#9ca3af', marginTop: 12 },
});