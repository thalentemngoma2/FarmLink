// app/(tabs)/notifications.tsx
import { BottomNav } from '@/components/bottom-nav';
// import OutbreakHeatMap from '@/components/OutbreakHeatMap';        // real version (requires backend data)
import MockOutbreakHeatMap from '@/components/MockOutbreakHeatMap'; // demo version with mock data
import OutbreakReport from '@/components/OutbreakReport';
import { GlassCard } from '@/components/ui/glass-card';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  Layout,
  SlideInLeft,
  SlideOutRight,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
interface Notification {
  id: string;
  type: 'reply' | 'like' | 'follow' | 'achievement' | 'alert' | 'system' | 'outbreak_alert';
  title: string;
  message: string;
  time: string;
  read: boolean;
  actionUrl?: string;
  iconName: string;
  iconColor: string;
}

const getIconProps = (type: string) => {
  const mapping: Record<string, { name: string; color: string }> = {
    reply: { name: 'chatbubble-outline', color: '#3b82f6' },
    like: { name: 'heart-outline', color: '#ec489a' },
    follow: { name: 'person-add-outline', color: '#8b5cf6' },
    achievement: { name: 'trophy-outline', color: '#f59e0b' },
    alert: { name: 'alert-circle-outline', color: '#ef4444' },
    system: { name: 'checkmark-circle-outline', color: '#22c55e' },
    outbreak_alert: { name: 'warning-outline', color: '#f97316' },
  };
  return mapping[type] || { name: 'notifications-outline', color: '#9ca3af' };
};

export default function NotificationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'alerts' | 'outbreaks'>('alerts');
  const [showReportModal, setShowReportModal] = useState(false);
  const { width, height } = Dimensions.get('window');

  const initialFetchDone = useRef(false);

  const fetchNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map((n: any) => {
        const { name: iconName, color: iconColor } = getIconProps(n.type);
        return {
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          time: new Date(n.created_at).toLocaleString(),
          read: n.read,
          actionUrl: n.action_url,
          iconName,
          iconColor,
        };
      });
      setNotifications(formatted);
    } catch (err: any) {
      console.error('Failed to load notifications', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && !initialFetchDone.current) {
      fetchNotifications();
      initialFetchDone.current = true;
    }
  }, [user]);

  const markAsRead = async (id: string) => {
    if (!user) return;
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id)
        .eq('user_id', user.id);
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const deleteNotification = async (id: string) => {
    if (!user) return;
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const filteredNotifications = filter === 'all' ? notifications : notifications.filter(n => !n.read);

  const bgScale1 = useSharedValue(1);
  const bgX1 = useSharedValue(0);
  const bgY1 = useSharedValue(0);
  const bgScale2 = useSharedValue(1.2);
  const bgX2 = useSharedValue(0);
  const bgY2 = useSharedValue(0);

  useEffect(() => {
    bgScale1.value = withRepeat(withTiming(1.3, { duration: 20000 }), -1, true);
    bgX1.value = withRepeat(withTiming(30, { duration: 20000 }), -1, true);
    bgY1.value = withRepeat(withTiming(-20, { duration: 20000 }), -1, true);
    bgScale2.value = withRepeat(withTiming(1, { duration: 25000 }), -1, true);
    bgX2.value = withRepeat(withTiming(-30, { duration: 25000 }), -1, true);
    bgY2.value = withRepeat(withTiming(30, { duration: 25000 }), -1, true);
  }, []);

  const bgBlob1Style = useAnimatedStyle(() => ({
    transform: [{ scale: bgScale1.value }, { translateX: bgX1.value }, { translateY: bgY1.value }],
  }));
  const bgBlob2Style = useAnimatedStyle(() => ({
    transform: [{ scale: bgScale2.value }, { translateX: bgX2.value }, { translateY: bgY2.value }],
  }));

  const renderNotificationsList = () => (
    <>
      <Animated.View entering={FadeIn.delay(100)} style={styles.filterContainer}>
        <View style={styles.filterButtons}>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'all' && styles.filterActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'unread' && styles.filterActive]}
            onPress={() => setFilter('unread')}
          >
            <Text style={[styles.filterText, filter === 'unread' && styles.filterTextActive]}>
              Unread ({unreadCount})
            </Text>
          </TouchableOpacity>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : filteredNotifications.length === 0 ? (
        <Animated.View entering={FadeIn} style={styles.emptyContainer}>
          <GlassCard style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="notifications-outline" size={32} color="#22c55e" />
            </View>
            <Text style={styles.emptyText}>No notifications yet</Text>
          </GlassCard>
        </Animated.View>
      ) : (
        <View style={styles.notificationsList}>
          {filteredNotifications.map((notification, index) => (
            <Animated.View
              key={notification.id}
              entering={SlideInLeft.delay(index * 50)}
              exiting={SlideOutRight}
              layout={Layout.springify()}
            >
              <GlassCard style={[styles.notificationCard, !notification.read && styles.unreadCard]}>
                <View style={styles.notificationContent}>
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: `${notification.iconColor}20` },
                    ]}
                  >
                    <Ionicons name={notification.iconName as any} size={20} color={notification.iconColor} />
                  </View>
                  <View style={styles.textContainer}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.title, !notification.read && styles.titleUnread]}>
                        {notification.title}
                      </Text>
                      <Text style={styles.time}>{notification.time}</Text>
                    </View>
                    <Text style={styles.message} numberOfLines={2}>
                      {notification.message}
                    </Text>
                    <View style={styles.actions}>
                      {!notification.read && (
                        <TouchableOpacity onPress={() => markAsRead(notification.id)}>
                          <Text style={styles.actionText}>Mark as read</Text>
                        </TouchableOpacity>
                      )}
                      {notification.actionUrl && (
                        <Link href={notification.actionUrl as any} asChild>
                          <TouchableOpacity>
                            <Text style={styles.actionText}>View</Text>
                          </TouchableOpacity>
                        </Link>
                      )}
                      <TouchableOpacity
                        onPress={() => deleteNotification(notification.id)}
                        style={styles.deleteButton}
                      >
                        <Ionicons name="trash-outline" size={16} color="#9ca3af" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </GlassCard>
            </Animated.View>
          ))}
        </View>
      )}
    </>
  );

  const renderOutbreakTab = () => (
    <View style={styles.outbreakContainer}>
      {/* Use the mock heat map for demo – replace with OutbreakHeatMap when real data is ready */}
      <MockOutbreakHeatMap initialFilter="all" />
      <TouchableOpacity
        style={styles.reportButton}
        onPress={() => setShowReportModal(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.reportButtonText}>Report an Outbreak</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#f0fdf4', '#ffffff', '#ecfdf5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[styles.blob, styles.blob1, bgBlob1Style]} />
      <Animated.View style={[styles.blob, styles.blob2, bgBlob2Style]} />

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'alerts' && styles.activeTab]}
          onPress={() => setActiveTab('alerts')}
        >
          <Ionicons name="notifications" size={20} color={activeTab === 'alerts' ? '#22c55e' : '#9ca3af'} />
          <Text style={[styles.tabText, activeTab === 'alerts' && styles.activeTabText]}>My Alerts</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'outbreaks' && styles.activeTab]}
          onPress={() => setActiveTab('outbreaks')}
        >
          <Ionicons name="map-outline" size={20} color={activeTab === 'outbreaks' ? '#22c55e' : '#9ca3af'} />
          <Text style={[styles.tabText, activeTab === 'outbreaks' && styles.activeTabText]}>Outbreak Map</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'alerts' ? renderNotificationsList() : renderOutbreakTab()}
      </ScrollView>

      <Modal
        visible={showReportModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowReportModal(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <OutbreakReport onClose={() => setShowReportModal(false)} />
        </SafeAreaView>
      </Modal>

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  blob: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(34,197,94,0.2)' },
  blob1: { width: 200, height: 200, top: -50, left: -50 },
  blob2: { width: 250, height: 250, bottom: -50, right: -50 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.3)',
  },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#11181C' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, backgroundColor: '#fff' },
  activeTab: { backgroundColor: '#f0fdf4' },
  tabText: { fontSize: 14, fontWeight: '500', color: '#9ca3af' },
  activeTabText: { color: '#22c55e' },
  scrollContent: { flexGrow: 1, paddingBottom: 80 },
  filterContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginTop: 16, marginBottom: 16 },
  filterButtons: { flexDirection: 'row', gap: 8 },
  filterButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.5)' },
  filterActive: { backgroundColor: '#22c55e' },
  filterText: { fontSize: 14, fontWeight: '500', color: '#687076' },
  filterTextActive: { color: 'white' },
  markAllText: { fontSize: 14, fontWeight: '500', color: '#22c55e' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 50 },
  emptyCard: { padding: 24, alignItems: 'center' },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(34,197,94,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyText: { fontSize: 14, color: '#687076' },
  notificationsList: { paddingHorizontal: 16, gap: 12, marginBottom: 16 },
  notificationCard: { padding: 0, overflow: 'hidden' },
  unreadCard: { borderWidth: 1, borderColor: '#22c55e', shadowColor: '#22c55e', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.2, shadowRadius: 4 },
  notificationContent: { flexDirection: 'row', padding: 12, gap: 12 },
  iconContainer: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  textContainer: { flex: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { fontSize: 14, fontWeight: '500', color: '#687076' },
  titleUnread: { color: '#11181C', fontWeight: '600' },
  time: { fontSize: 10, color: '#9ca3af' },
  message: { fontSize: 12, color: '#687076', marginBottom: 8, lineHeight: 16 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionText: { fontSize: 11, fontWeight: '500', color: '#22c55e' },
  deleteButton: { marginLeft: 'auto', padding: 4 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  errorText: { fontSize: 14, color: '#ef4444' },
  outbreakContainer: { flex: 1, paddingHorizontal: 0 },
  reportButton: { backgroundColor: '#22c55e', margin: 16, padding: 14, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  reportButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});