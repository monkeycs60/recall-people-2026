import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, Users, Activity, AlertTriangle, TrendingUp, Shield, Clock } from 'lucide-react-native';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';
import { Colors } from '@/constants/theme';

interface AdminStats {
  users: {
    total: number;
    newToday: number;
    activeToday: number;
    activeThisWeek: number;
  };
  activity: {
    totalActions: number;
    actionsToday: number;
    errorsToday: number;
    errorRatePercent: number;
  };
  topActions: Array<{
    action: string;
    count: number;
  }>;
}

interface SuspiciousIP {
  ipAddress: string;
  failedAttempts: number;
  lastAttempt: string;
}

export default function MonitoringScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const token = useAuthStore((state) => state.token);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [suspiciousIPs, setSuspiciousIPs] = useState<SuspiciousIP[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) return;

    try {
      const [statsRes, securityRes] = await Promise.all([
        api.get('/admin/stats', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        api.get('/admin/security/suspicious-ips', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setStats(statsRes.data);
      setSuspiciousIPs(securityRes.data.suspiciousIPs || []);
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Monitoring</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Statistiques Utilisateurs */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Users size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Utilisateurs</Text>
          </View>
          <View style={styles.statsGrid}>
            <StatCard label="Total" value={stats?.users.total || 0} />
            <StatCard label="Nouveaux (24h)" value={stats?.users.newToday || 0} />
            <StatCard label="Actifs (24h)" value={stats?.users.activeToday || 0} />
            <StatCard label="Actifs (7j)" value={stats?.users.activeThisWeek || 0} />
          </View>
        </View>

        {/* Activité */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Activity size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Activité</Text>
          </View>
          <View style={styles.statsGrid}>
            <StatCard label="Actions (24h)" value={stats?.activity.actionsToday || 0} />
            <StatCard label="Erreurs (24h)" value={stats?.activity.errorsToday || 0} color={Colors.error} />
            <StatCard
              label="Taux d'erreur"
              value={`${stats?.activity.errorRatePercent.toFixed(2) || 0}%`}
              color={
                (stats?.activity.errorRatePercent || 0) > 5
                  ? Colors.error
                  : (stats?.activity.errorRatePercent || 0) > 2
                  ? '#F59E0B'
                  : Colors.success
              }
            />
            <StatCard label="Total" value={stats?.activity.totalActions || 0} />
          </View>
        </View>

        {/* Sécurité */}
        {suspiciousIPs.length > 0 && (
          <View style={[styles.section, styles.alertSection]}>
            <View style={styles.sectionHeader}>
              <AlertTriangle size={20} color={Colors.error} />
              <Text style={[styles.sectionTitle, { color: Colors.error }]}>
                Alertes Sécurité ({suspiciousIPs.length})
              </Text>
            </View>
            {suspiciousIPs.map((ip, index) => (
              <View key={index} style={styles.alertCard}>
                <View style={styles.alertHeader}>
                  <Text style={styles.alertIP}>{ip.ipAddress}</Text>
                  <View style={styles.alertBadge}>
                    <Text style={styles.alertBadgeText}>{ip.failedAttempts} tentatives</Text>
                  </View>
                </View>
                <View style={styles.alertFooter}>
                  <Clock size={12} color={Colors.textSecondary} />
                  <Text style={styles.alertTime}>
                    Dernière tentative: {new Date(ip.lastAttempt).toLocaleString('fr-FR')}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Top Actions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Top Actions (7 jours)</Text>
          </View>
          {stats?.topActions.map((action, index) => (
            <View key={index} style={styles.actionRow}>
              <View style={styles.actionRank}>
                <Text style={styles.actionRankText}>{index + 1}</Text>
              </View>
              <Text style={styles.actionName}>{action.action}</Text>
              <Text style={styles.actionCount}>{action.count.toLocaleString()}</Text>
            </View>
          ))}
        </View>

        {/* Info */}
        <View style={styles.infoSection}>
          <Shield size={16} color={Colors.textSecondary} />
          <Text style={styles.infoText}>
            Données actualisées en temps réel. Tirez pour rafraîchir.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function StatCard({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color: color || Colors.primary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 20,
    color: Colors.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'System',
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 8,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontFamily: 'System',
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
  },
  alertSection: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  alertCard: {
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.error,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertIP: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  alertBadge: {
    backgroundColor: Colors.error,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  alertBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.surface,
  },
  alertFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  alertTime: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  actionRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionRankText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.surface,
  },
  actionName: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    textTransform: 'capitalize',
  },
  actionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: Colors.surface,
    borderRadius: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
