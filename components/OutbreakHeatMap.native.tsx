// components/OutbreakHeatMap.tsx
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MockOutbreakHeatMap from "./MockOutbreakHeatMap";

import { supabase } from "@/lib/supabase";

// react-native-maps is optional in this repo; if it's not installed we render a mock map.
let MapView: any = null;
let Heatmap: any = null;
let Marker: any = null;
let PROVIDER_GOOGLE: any = null;

if (Platform.OS !== "web") {
  try {
    const RNMaps = require("react-native-maps");
    MapView = RNMaps.default;
    Heatmap = RNMaps.Heatmap;
    Marker = RNMaps.Marker;
    PROVIDER_GOOGLE = RNMaps.PROVIDER_GOOGLE;
  } catch {
    // ignore - we'll render MockOutbreakHeatMap
  }
}

// Types
interface OutbreakPoint {
  id: string;
  disease_name: string;
  latitude: number;
  longitude: number;
  severity: number; // 1-5, 5 most severe
  reported_at: string;
  location_name?: string;
}

// Helper: color based on severity
const getSeverityColor = (severity: number): string => {
  if (severity >= 4) return "#ef4444"; // red
  if (severity >= 2) return "#f97316"; // orange
  return "#eab308"; // yellow
};

// Helper: radius based on severity (for marker size)
const getMarkerRadius = (severity: number): number => {
  return 8 + severity * 2; // 10 to 18
};

export default function OutbreakHeatMap() {
  const [outbreaks, setOutbreaks] = useState<OutbreakPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // South Africa center
  const initialRegion = {
    latitude: -28.0,
    longitude: 24.0,
    latitudeDelta: 8.0,
    longitudeDelta: 8.0,
  };

  // Fetch outbreak data
  const fetchOutbreaks = async () => {
    setLoading(true);
    try {
      // Adjust table name to your actual Supabase table (e.g., 'outbreaks')
      const { data, error } = await supabase
        .from("outbreak_reports")
        .select(
          "id, disease_name, latitude, longitude, animal_type, created_at",
        )
        .eq("status", "verified") // only verified reports
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formatted: OutbreakPoint[] = (data || []).map((item: any) => ({
        id: item.id,
        disease_name: item.disease_name || "Unknown Disease",
        latitude: item.latitude || 0,
        longitude: item.longitude || 0,
        severity: 4, // Default high severity for heatmap points
        reported_at: item.created_at,
        location_name: item.animal_type
          ? `Animal: ${item.animal_type}`
          : "Outbreak Area",
      }));
      setOutbreaks(formatted);
    } catch (err: any) {
      console.error("Failed to fetch outbreaks", err);
      setError("Could not load outbreak data");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOutbreaks();
    }, []),
  );

  // Build heatmap points (for Heatmap layer)
  // Heatmap expects an array of { latitude, longitude, weight }
  const heatmapPoints = outbreaks.map((point) => ({
    latitude: point.latitude,
    longitude: point.longitude,
    weight: point.severity / 5, // normalize 0-1
  }));

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  // If react-native-maps isn't available, fall back to the mock map.
  if (!MapView) {
    return <MockOutbreakHeatMap />;
  }

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE} // better heatmap support on Android/iOS
        style={styles.map}
        initialRegion={initialRegion}
        onMapReady={() => setMapReady(true)}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {/* Heatmap layer (if enough points) */}
        {mapReady && heatmapPoints.length > 0 && (
          <Heatmap
            points={heatmapPoints}
            radius={40}
            opacity={0.7}
            gradient={{
              colors: ["#fef08a", "#f97316", "#ef4444"],
              startPoints: [0.1, 0.5, 0.9],
              colorMapSize: 256,
            }}
          />
        )}

        {/* Markers with disease labels */}
        {outbreaks.map((point) => (
          <Marker
            key={point.id}
            coordinate={{
              latitude: point.latitude,
              longitude: point.longitude,
            }}
            title={point.disease_name}
            description={point.location_name || `Severity: ${point.severity}/5`}
            pinColor={getSeverityColor(point.severity)}
          >
            {/* Optional custom marker with severity circle */}
            <View
              style={{
                width: getMarkerRadius(point.severity),
                height: getMarkerRadius(point.severity),
                borderRadius: getMarkerRadius(point.severity) / 2,
                backgroundColor: getSeverityColor(point.severity),
                borderWidth: 2,
                borderColor: "white",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{ color: "white", fontSize: 10, fontWeight: "bold" }}
              >
                {point.disease_name.charAt(0)}
              </Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {outbreaks.length === 0 && !loading && (
        <View style={styles.emptyOverlay}>
          <Ionicons name="leaf-outline" size={38} color="#9ca3af" />
          <Text style={styles.emptyText}>No outbreaks reported yet</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  map: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height - 200, // adjust based on layout
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 14,
    color: "#ef4444",
    textAlign: "center",
  },
  emptyOverlay: {
    position: "absolute",
    top: "40%",
    left: 0,
    right: 0,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.8)",
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 40,
  },
  emptyText: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 8,
  },
});
