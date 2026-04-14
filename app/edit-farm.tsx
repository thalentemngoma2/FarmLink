import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EditFarmScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [farmSize, setFarmSize] = useState('');
  const [mainCrops, setMainCrops] = useState('');
  const [farmingType, setFarmingType] = useState('');

  useEffect(() => {
    loadFarm();
  }, []);

  const loadFarm = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('profiles').select('farm_size, main_crops, farming_type').eq('id', user.id).single();
    if (data) {
      setFarmSize(data.farm_size || '');
      setMainCrops(data.main_crops || '');
      setFarmingType(data.farming_type || '');
    }
  };

  const handleSave = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from('profiles')
      .update({ farm_size: farmSize, main_crops: mainCrops, farming_type: farmingType })
      .eq('id', user.id);
    setLoading(false);
    if (error) Alert.alert('Error', error.message);
    else {
      Alert.alert('Success', 'Farm details updated');
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Edit Farm</Text>
      <TextInput
        style={styles.input}
        placeholder="Farm Size (e.g., 10 acres)"
        value={farmSize}
        onChangeText={setFarmSize}
      />
      <TextInput
        style={styles.input}
        placeholder="Main Crops (e.g., Maize, Wheat)"
        value={mainCrops}
        onChangeText={setMainCrops}
      />
      <TextInput
        style={styles.input}
        placeholder="Farming Type (e.g., Organic, Conventional)"
        value={farmingType}
        onChangeText={setFarmingType}
      />
      <TouchableOpacity style={styles.button} onPress={handleSave} disabled={loading}>
        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Save</Text>}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16 },
  button: { backgroundColor: '#22c55e', padding: 14, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: '600', fontSize: 16 },
});