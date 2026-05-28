import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
    Dimensions,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

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
    // Ignore if not installed
  }
}

// ---------- Mock Data ----------
// Types
interface MockOutbreakPoint {
  id: string;
  disease_name: string;
  livestock_type: "cow" | "chicken" | "goat";
  latitude: number;
  longitude: number;
  severity: number; // 1-5
  location_name: string;
  reported_at: string;
}

// Mock outbreak reports – diverse locations across South Africa (or your demo region)
const mockOutbreaks: MockOutbreakPoint[] = [
  // Cow diseases
  {
    id: "mock_1",
    disease_name: "Foot-and-Mouth Disease",
    livestock_type: "cow",
    latitude: -26.2041,
    longitude: 28.0473,
    severity: 5,
    location_name: "Johannesburg, Gauteng",
    reported_at: "2025-04-20T10:00:00Z",
  },
  {
    id: "mock_2",
    disease_name: "Lumpy Skin Disease",
    livestock_type: "cow",
    latitude: -29.8587,
    longitude: 31.0218,
    severity: 4,
    location_name: "Durban, KwaZulu-Natal",
    reported_at: "2025-04-18T14:30:00Z",
  },
  {
    id: "mock_3",
    disease_name: "Bovine Tuberculosis",
    livestock_type: "cow",
    latitude: -33.9249,
    longitude: 18.4241,
    severity: 3,
    location_name: "Cape Town, Western Cape",
    reported_at: "2025-04-15T09:00:00Z",
  },
  {
    id: "mock_4",
    disease_name: "Mastitis",
    livestock_type: "cow",
    latitude: -25.7479,
    longitude: 28.2293,
    severity: 2,
    location_name: "Pretoria, Gauteng",
    reported_at: "2025-04-22T16:45:00Z",
  },
  // Chicken diseases
  {
    id: "mock_5",
    disease_name: "Newcastle Disease",
    livestock_type: "chicken",
    latitude: -26.2041,
    longitude: 28.0473,
    severity: 5,
    location_name: "Johannesburg, Gauteng",
    reported_at: "2025-04-21T11:20:00Z",
  },
  {
    id: "mock_6",
    disease_name: "Avian Influenza (H5N1)",
    livestock_type: "chicken",
    latitude: -29.8587,
    longitude: 31.0218,
    severity: 5,
    location_name: "Durban, KwaZulu-Natal",
    reported_at: "2025-04-19T08:15:00Z",
  },
  {
    id: "mock_7",
    disease_name: "Coccidiosis",
    livestock_type: "chicken",
    latitude: -33.9249,
    longitude: 18.4241,
    severity: 2,
    location_name: "Cape Town, Western Cape",
    reported_at: "2025-04-17T13:00:00Z",
  },
  {
    id: "mock_8",
    disease_name: "Marek's Disease",
    livestock_type: "chicken",
    latitude: -25.7479,
    longitude: 28.2293,
    severity: 3,
    location_name: "Pretoria, Gauteng",
    reported_at: "2025-04-16T12:10:00Z",
  },
  // Goat diseases
  {
    id: "mock_9",
    disease_name: "Peste des Petits Ruminants (PPR)",
    livestock_type: "goat",
    latitude: -26.2041,
    longitude: 28.0473,
    severity: 5,
    location_name: "Johannesburg, Gauteng",
    reported_at: "2025-04-22T09:30:00Z",
  },
  {
    id: "mock_10",
    disease_name: "Goat Pox",
    livestock_type: "goat",
    latitude: -29.8587,
    longitude: 31.0218,
    severity: 4,
    location_name: "Durban, KwaZulu-Natal",
    reported_at: "2025-04-20T14:00:00Z",
  },
  {
    id: "mock_11",
    disease_name: "Caprine Arthritis Encephalitis (CAE)",
    livestock_type: "goat",
    latitude: -33.9249,
    longitude: 18.4241,
    severity: 2,
    location_name: "Cape Town, Western Cape",
    reported_at: "2025-04-14T10:45:00Z",
  },
  {
    id: "mock_12",
    disease_name: "Contagious Caprine Pleuropneumonia",
    livestock_type: "goat",
    latitude: -25.7479,
    longitude: 28.2293,
    severity: 4,
    location_name: "Pretoria, Gauteng",
    reported_at: "2025-04-18T15:30:00Z",
  },
  // Additional scattered points for heatmap density
  {
    id: "mock_13",
    disease_name: "Foot Rot (goat)",
    livestock_type: "goat",
    latitude: -26.23,
    longitude: 28.07,
    severity: 3,
    location_name: "Johannesburg outskirts",
    reported_at: "2025-04-21T08:00:00Z",
  },
  {
    id: "mock_14",
    disease_name: "Infectious Bronchitis (chicken)",
    livestock_type: "chicken",
    latitude: -26.19,
    longitude: 28.03,
    severity: 3,
    location_name: "Johannesburg East",
    reported_at: "2025-04-20T11:00:00Z",
  },
];

// Helper functions (mirror real component)
const getSeverityColor = (severity: number): string => {
  if (severity >= 4) return "#ef4444"; // red
  if (severity >= 2) return "#f97316"; // orange
  return "#eab308"; // yellow
};

const getMarkerRadius = (severity: number): number => {
  return 8 + severity * 2;
};

// Livestock icon mapping (for marker labels)
const getLivestockIcon = (type: "cow" | "chicken" | "goat"): string => {
  switch (type) {
    case "cow":
      return "🐄";
    case "chicken":
      return "🐔";
    case "goat":
      return "🐐";
    default:
      return "⚠️";
  }
};

interface MockOutbreakHeatMapProps {
  // Optional: filter by livestock type – can be used for demos
  initialFilter?: "all" | "cow" | "chicken" | "goat";
}

export default function MockOutbreakHeatMap({
  initialFilter = "all",
}: MockOutbreakHeatMapProps) {
  const [filter, setFilter] = useState<"all" | "cow" | "chicken" | "goat">(
    initialFilter,
  );
  const [selectedOutbreak, setSelectedOutbreak] =
    useState<MockOutbreakPoint | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const filteredOutbreaks = mockOutbreaks.filter(
    (point) => filter === "all" || point.livestock_type === filter,
  );

  // Heatmap points: each point gets weight = severity/5
  const heatmapPoints = filteredOutbreaks.map((point) => ({
    latitude: point.latitude,
    longitude: point.longitude,
    weight: point.severity / 5,
  }));

  // Center of South Africa (general demo region)
  const initialRegion = {
    latitude: -28.0,
    longitude: 24.0,
    latitudeDelta: 8.0,
    longitudeDelta: 8.0,
  };

  const handleMarkerPress = (outbreak: MockOutbreakPoint) => {
    setSelectedOutbreak(outbreak);
  };

  const formatDate = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (Platform.OS === "web" || !MapView) {
    return (
      <View
        style={[
          styles.container,
          {
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#f3f4f6",
          },
        ]}
      >
        <Ionicons name="globe-outline" size={48} color="#9ca3af" />
        <Text style={{ marginTop: 8, color: "#6b7280" }}>
          Map not available on web
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter buttons */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === "all" && styles.filterActive]}
          onPress={() => setFilter("all")}
        >
          <Text
            style={[
              styles.filterText,
              filter === "all" && styles.filterTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === "cow" && styles.filterActive]}
          onPress={() => setFilter("cow")}
        >
          <Text
            style={[
              styles.filterText,
              filter === "cow" && styles.filterTextActive,
            ]}
          >
            🐄 Cow
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === "chicken" && styles.filterActive,
          ]}
          onPress={() => setFilter("chicken")}
        >
          <Text
            style={[
              styles.filterText,
              filter === "chicken" && styles.filterTextActive,
            ]}
          >
            🐔 Chicken
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === "goat" && styles.filterActive,
          ]}
          onPress={() => setFilter("goat")}
        >
          <Text
            style={[
              styles.filterText,
              filter === "goat" && styles.filterTextActive,
            ]}
          >
            🐐 Goat
          </Text>
        </TouchableOpacity>
      </View>

      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={initialRegion}
        onMapReady={() => setMapReady(true)}
        showsUserLocation={false}
        showsMyLocationButton={false}
      >
        {/* Heatmap layer */}
        {mapReady && heatmapPoints.length > 0 && (
          <Heatmap
            points={heatmapPoints}
            radius={40}
            opacity={0.6}
            gradient={{
              colors: ["#fef08a", "#f97316", "#ef4444"],
              startPoints: [0.1, 0.5, 0.9],
              colorMapSize: 256,
            }}
          />
        )}

        {/* Markers with custom severity circles */}
        {filteredOutbreaks.map((point) => (
          <Marker
            key={point.id}
            coordinate={{
              latitude: point.latitude,
              longitude: point.longitude,
            }}
            title={point.disease_name}
            description={`${point.location_name} • Severity ${point.severity}/5`}
            onPress={() => handleMarkerPress(point)}
          >
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
                {getLivestockIcon(point.livestock_type)}
              </Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Legend / Info overlay */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.severityDot, { backgroundColor: "#ef4444" }]} />
          <Text style={styles.legendText}>High severity (4‑5)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.severityDot, { backgroundColor: "#f97316" }]} />
          <Text style={styles.legendText}>Medium (2‑3)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.severityDot, { backgroundColor: "#eab308" }]} />
          <Text style={styles.legendText}>Low (1)</Text>
        </View>
      </View>

      {/* Modal to show outbreak details on tap */}
      <Modal
        visible={selectedOutbreak !== null}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSelectedOutbreak(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedOutbreak(null)}
            >
              <Ionicons name="close" size={24} color="#11181C" />
            </TouchableOpacity>
            {selectedOutbreak && (
              <>
                <View style={styles.modalIcon}>
                  <Text style={styles.modalIconText}>
                    {getLivestockIcon(selectedOutbreak.livestock_type)}
                  </Text>
                </View>
                <Text style={styles.modalTitle}>
                  {selectedOutbreak.disease_name}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {selectedOutbreak.location_name}
                </Text>
                <View style={styles.modalSeverity}>
                  <Text style={styles.modalSeverityLabel}>Severity:</Text>
                  <Text
                    style={[
                      styles.modalSeverityValue,
                      { color: getSeverityColor(selectedOutbreak.severity) },
                    ]}
                  >
                    {selectedOutbreak.severity}/5
                  </Text>
                </View>
                <Text style={styles.modalDate}>
                  Reported: {formatDate(selectedOutbreak.reported_at)}
                </Text>
                <View style={styles.modalFooter}>
                  <Text style={styles.modalFooterText}>
                    This is a demonstration dataset.
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Demo notice banner */}
      <View style={styles.demoBanner}>
        <Ionicons name="information-circle" size={18} color="#1f2937" />
        <Text style={styles.demoBannerText}>
          Demo data – shows how outbreak heat map will work
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    position: "relative",
  },
  filterContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    zIndex: 10,
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
  },
  filterActive: {
    backgroundColor: "#22c55e",
  },
  filterText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  filterTextActive: {
    color: "#fff",
  },
  map: {
    flex: 1,
    width: Dimensions.get("window").width,
  },
  legendContainer: {
    position: "absolute",
    bottom: 20,
    left: 16,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    ...Platform.select({
      web: { boxShadow: "0px 2px 4px rgba(0,0,0,0.1)" },
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  severityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: "#374151",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
    ...Platform.select({
      web: { boxShadow: "0px 2px 4px rgba(0,0,0,0.25)" },
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
      },
    }),
  },
  closeButton: {
    position: "absolute",
    top: 12,
    right: 12,
    padding: 4,
  },
  modalIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#f0fdf4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  modalIconText: {
    fontSize: 32,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#11181C",
    marginBottom: 4,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 12,
  },
  modalSeverity: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  modalSeverityLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginRight: 8,
  },
  modalSeverityValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  modalDate: {
    fontSize: 12,
    color: "#9ca3af",
    marginBottom: 16,
  },
  modalFooter: {
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    paddingTop: 12,
    width: "100%",
    alignItems: "center",
  },
  modalFooterText: {
    fontSize: 12,
    color: "#22c55e",
  },
  demoBanner: {
    position: "absolute",
    bottom: 20,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    ...Platform.select({
      web: { boxShadow: "0px 2px 4px rgba(0,0,0,0.1)" },
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
  },
  demoBannerText: {
    fontSize: 10,
    color: "#fff",
  },
});
