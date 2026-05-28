import { BottomNav } from "@/components/bottom-nav";
import { MobileHeader } from "@/components/mobile-header";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

interface Application {
  id: string;
  tenderId: string;
  tenderTitle: string;
  farmerId: string;
  farmerName: string;
  farmerLocation: string;
  proposedPrice: string;
  message: string;
  status: string;
  createdAt: string;
}

export default function SuppliersPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchApplications = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      // 1. Fetch the logged-in retailer's tenders
      const { data: tenders } = await supabase
        .from("tenders")
        .select("tender_id, title")
        .eq("retailer_id", user.id);

      if (!tenders || tenders.length === 0) {
        setApplications([]);
        return;
      }

      const tenderIds = tenders.map((t) => t.tender_id);
      const tenderMap = new Map(tenders.map((t) => [t.tender_id, t.title]));

      // 2. Fetch applications for these tenders
      const { data: appsData, error } = await supabase
        .from("tender_applications")
        .select("*")
        .in("tender_id", tenderIds)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!appsData || appsData.length === 0) {
        setApplications([]);
        return;
      }

      // 3. Fetch farmer profiles to get applicant names/locations
      const farmerIds = [...new Set(appsData.map((a) => a.farmer_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, location")
        .in("user_id", farmerIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

      const { data: usersData } = await supabase
        .from("users")
        .select("user_id, username")
        .in("user_id", farmerIds);

      const userMap = new Map(usersData?.map((u) => [u.user_id, u]) || []);

      const formattedApps: Application[] = appsData.map((a) => ({
        id: a.application_id,
        tenderId: a.tender_id,
        tenderTitle: tenderMap.get(a.tender_id) || "Unknown Tender",
        farmerId: a.farmer_id,
        farmerName:
          profileMap.get(a.farmer_id)?.full_name ||
          userMap.get(a.farmer_id)?.username ||
          "Anonymous",
        farmerLocation: profileMap.get(a.farmer_id)?.location || "",
        proposedPrice: a.proposed_price,
        message: a.message,
        status: a.status,
        createdAt: a.created_at,
      }));

      setApplications(formattedApps);
    } catch (err) {
      console.error("Error fetching applications:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchApplications();
    }, [fetchApplications]),
  );

  const updateStatus = async (applicationId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("tender_applications")
        .update({ status: newStatus })
        .eq("application_id", applicationId);

      if (error) throw error;

      setApplications((prev) =>
        prev.map((app) =>
          app.id === applicationId ? { ...app, status: newStatus } : app,
        ),
      );

      if (Platform.OS === "web") {
        window.alert(`Application ${newStatus} successfully`);
      } else {
        Alert.alert("Success", `Application ${newStatus} successfully`);
      }
    } catch (err: any) {
      if (Platform.OS === "web") {
        window.alert(err.message || "Failed to update status");
      } else {
        Alert.alert("Error", err.message || "Failed to update status");
      }
    }
  };

  const renderItem = ({
    item,
    index,
  }: {
    item: Application;
    index: number;
  }) => (
    <Animated.View entering={FadeInUp.delay(index * 50)} style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.farmerName}>{item.farmerName}</Text>
          {item.farmerLocation ? (
            <Text style={styles.farmerLocation}>{item.farmerLocation}</Text>
          ) : null}
        </View>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                item.status === "pending"
                  ? "#fef3c7"
                  : item.status === "accepted"
                    ? "#dcfce7"
                    : "#fef2f2",
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              {
                color:
                  item.status === "pending"
                    ? "#d97706"
                    : item.status === "accepted"
                      ? "#166534"
                      : "#991b1b",
              },
            ]}
          >
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <Text style={styles.tenderTitle}>For: {item.tenderTitle}</Text>

      <View style={styles.priceContainer}>
        <Ionicons name="pricetag-outline" size={16} color="#22c55e" />
        <Text style={styles.priceText}>{item.proposedPrice}</Text>
      </View>

      <Text style={styles.messageText}>&quot;{item.message}&quot;</Text>
      <Text style={styles.dateText}>
        Applied: {new Date(item.createdAt).toLocaleDateString()}
      </Text>

      {item.status === "pending" && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.rejectBtn]}
            onPress={() => updateStatus(item.id, "rejected")}
          >
            <Ionicons name="close" size={16} color="#ef4444" />
            <Text style={styles.rejectText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.acceptBtn]}
            onPress={() => updateStatus(item.id, "accepted")}
          >
            <Ionicons name="checkmark" size={16} color="#fff" />
            <Text style={styles.acceptText}>Accept</Text>
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        <LinearGradient
          colors={["#f0fdf4", "#ffffff", "#ecfdf5"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <MobileHeader />

        <View style={styles.content}>
          <Text style={styles.pageTitle}>Suppliers</Text>
          <Text style={styles.pageSubtitle}>
            Manage applications from farmers for your tenders
          </Text>

          {loading ? (
            <ActivityIndicator
              size="large"
              color="#22c55e"
              style={{ marginTop: 40 }}
            />
          ) : applications.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyTitle}>No Applications Yet</Text>
              <Text style={styles.emptySubtitle}>
                When farmers apply to your tenders, they will appear here.
              </Text>
            </View>
          ) : (
            <FlatList
              data={applications}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        <BottomNav />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, position: "relative" },
  content: { flex: 1, paddingTop: 80, paddingBottom: 80 },
  pageTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#11181C",
    paddingHorizontal: 16,
  },
  pageSubtitle: {
    fontSize: 14,
    color: "#687076",
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 16,
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      web: { boxShadow: "0px 2px 8px rgba(0,0,0,0.05)" },
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
      },
    }),
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  farmerName: { fontSize: 16, fontWeight: "700", color: "#11181C" },
  farmerLocation: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: "700" },
  tenderTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4b5563",
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  priceText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#166534",
    marginLeft: 6,
  },
  messageText: {
    fontSize: 14,
    color: "#374151",
    fontStyle: "italic",
    marginBottom: 12,
    lineHeight: 20,
  },
  dateText: { fontSize: 11, color: "#9ca3af", marginBottom: 12 },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    paddingTop: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  rejectBtn: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fca5a5",
  },
  acceptBtn: { backgroundColor: "#22c55e" },
  rejectText: { color: "#ef4444", fontWeight: "600", fontSize: 14 },
  acceptText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#11181C",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#687076",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
});
