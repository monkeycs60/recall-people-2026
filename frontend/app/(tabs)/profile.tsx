import { View, Text, ScrollView, Alert, Linking, StyleSheet, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useRef, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  Globe,
  Download,
  Trash2,
  Smartphone,
  MessageSquare,
  FileText,
  LogOut,
  Shield,
  Users,
  Bell,
  UserX,
  CalendarCheck,
  Newspaper,
  UserRound,
  Cloud,
} from 'lucide-react-native';
import { useAuthStore } from '@/stores/auth-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useSubscriptionStore } from '@/stores/subscription-store';
import { LANGUAGE_NAMES } from '@/types';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { SettingsSection } from '@/components/profile/SettingsSection';
import { SettingsRow } from '@/components/profile/SettingsRow';
import { ReminderTimeRows } from '@/components/profile/ReminderTimeRows';
import { LanguagePicker } from '@/components/profile/LanguagePicker';
import { OptionPickerSheet } from '@/components/ui/OptionPickerSheet';
import { ExportDataSheet } from '@/components/profile/ExportDataSheet';
import { LegalNoticesSheet } from '@/components/profile/LegalNoticesSheet';
import { SubscriptionCard } from '@/components/profile/SubscriptionCard';
import { TestProCard } from '@/components/profile/TestProCard';
import { UserAvatarEditModal } from '@/components/profile/UserAvatarEditModal';
import { Colors, Fonts } from '@/constants/theme';
import Constants from 'expo-constants';
import { revenueCatService } from '@/services/revenuecat.service';
import { Paywall } from '@/components/Paywall';
import { canActivateTestPro } from '@/config/pro-whitelist';
import { deleteAccount } from '@/lib/api';
import { deleteDatabase } from '@/lib/db';
import { clearAuth } from '@/lib/auth';
import { ACCOUNT_REMINDER_FREQUENCY_OPTIONS } from '@/lib/reminder-frequency';
import { reminderService } from '@/services/reminder.service';
import { formatLocalizedDate } from '@/utils/dateLocale';
import { useSyncStore } from '@/stores/sync-store';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const language = useSettingsStore((state) => state.language);
  const notSeenThresholdDays = useSettingsStore((state) => state.notSeenThresholdDays);
  const setNotSeenThresholdDays = useSettingsStore((state) => state.setNotSeenThresholdDays);
  const weeklyDigestEnabled = useSettingsStore((state) => state.weeklyDigestEnabled);
  const setWeeklyDigestEnabled = useSettingsStore((state) => state.setWeeklyDigestEnabled);
  const postEventFollowUpEnabled = useSettingsStore((state) => state.postEventFollowUpEnabled);
  const setPostEventFollowUpEnabled = useSettingsStore((state) => state.setPostEventFollowUpEnabled);
  const isTestPro = useSubscriptionStore((state) => state.isTestPro);
  const isPremium = useSubscriptionStore((state) => state.isPremium);
  const isSyncing = useSyncStore((state) => state.isSyncing);
  const lastSyncedAt = useSyncStore((state) => state.lastSyncedAt);
  const syncError = useSyncStore((state) => state.error);

  const [showPaywall, setShowPaywall] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarCacheKey, setAvatarCacheKey] = useState(Date.now().toString());

  const languagePickerRef = useRef<BottomSheetModal>(null);
  const exportDataSheetRef = useRef<BottomSheetModal>(null);
  const legalNoticesSheetRef = useRef<BottomSheetModal>(null);
  const notSeenThresholdSheetRef = useRef<BottomSheetModal>(null);

  const handleOpenLanguagePicker = useCallback(() => {
    languagePickerRef.current?.present();
  }, []);

  const handleOpenExport = useCallback(() => {
    exportDataSheetRef.current?.present();
  }, []);

  const handleOpenLegal = useCallback(() => {
    legalNoticesSheetRef.current?.present();
  }, []);

  const handleEditAvatar = useCallback(() => {
    setShowAvatarModal(true);
  }, []);

  const handleSaveAvatar = useCallback(() => {
    setAvatarCacheKey(Date.now().toString());
  }, []);

  const handleManageSubscription = async () => {
    const url = await revenueCatService.getManagementURL();
    if (url) {
      Linking.openURL(url);
    } else {
      Alert.alert(
        t('subscription.manageTitle'),
        t('subscription.manageDescription'),
        [{ text: t('common.confirm') }]
      );
    }
  };

  const handleUpgrade = () => {
    setShowPaywall(true);
  };

  const handleClearCache = () => {
    Alert.alert(
      t('profile.clearCache.title'),
      t('profile.clearCache.confirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.clear();
            Alert.alert(t('common.success'), t('profile.clearCache.success'));
          },
        },
      ]
    );
  };

  const handleFeedback = () => {
    const subject = encodeURIComponent(t('profile.feedback.subject'));
    const body = encodeURIComponent(t('profile.feedback.body'));
    Linking.openURL(`mailto:support@recall.app?subject=${subject}&body=${body}`);
  };

  const handleLogout = () => {
    Alert.alert(
      t('profile.logout'),
      t('profile.logoutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('profile.deleteAccount'),
      t('profile.deleteAccountWarning'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              t('profile.deleteAccount'),
              t('profile.deleteAccountConfirm'),
              [
                { text: t('common.cancel'), style: 'cancel' },
                {
                  text: t('common.delete'),
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deleteAccount();
                      await clearAuth();
                      await AsyncStorage.clear();
                      await deleteDatabase();
                      useAuthStore.setState({ user: null, isInitialized: false });
                      router.replace('/(auth)/login');
                    } catch {
                      Alert.alert(t('common.error'), t('profile.deleteAccountError'));
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const appVersion = Constants.expoConfig?.version || '1.0.0';

  const adminEmail = process.env.EXPO_PUBLIC_ADMIN_EMAIL || '';
  const isAdmin = adminEmail && user?.email === adminEmail;
  const showTestProCard = canActivateTestPro(user?.email, isTestPro);

  const getNotSeenThresholdLabel = useCallback((days: number): string => {
    if (days === 0) return t('settings.notSeenNever');
    return t('settings.notSeenDays', { count: days });
  }, [t]);

  const notSeenThresholdOptions = ACCOUNT_REMINDER_FREQUENCY_OPTIONS.map((value) => ({
    label: getNotSeenThresholdLabel(value),
    value,
  }));

  const handleChangeNotSeenThreshold = useCallback(() => {
    notSeenThresholdSheetRef.current?.present();
  }, []);

  const handleNotSeenThresholdSelect = useCallback((value: number | null) => {
    if (value !== null) {
      setNotSeenThresholdDays(value);
      reminderService.scheduleNotSeenReminders().catch((error) => {
        console.warn('[profile] Failed to reschedule not-seen reminders:', error);
      });
    }
  }, [setNotSeenThresholdDays]);

  const handleWeeklyDigestToggle = useCallback((enabled: boolean) => {
    setWeeklyDigestEnabled(enabled);
    const operation = enabled
      ? reminderService.scheduleWeeklyDigest()
      : reminderService.cancelWeeklyDigest();

    operation.catch((error) => {
      console.warn('[profile] Failed to update weekly digest reminder:', error);
    });
  }, [setWeeklyDigestEnabled]);

  const handlePostEventFollowUpToggle = useCallback((enabled: boolean) => {
    setPostEventFollowUpEnabled(enabled);
    const operation = enabled
      ? reminderService.schedulePostEventFollowUps()
      : reminderService.cancelPostEventFollowUps();

    operation.catch((error) => {
      console.warn('[profile] Failed to update post-event reminders:', error);
    });
  }, [setPostEventFollowUpEnabled]);

  const handleOpenMonitoring = () => {
    router.push('/admin/monitoring');
  };

  const handleOpenSeed = () => {
    router.push('/admin/seed');
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16 },
        ]}
      >
        <View style={styles.titleRow}>
          <Text style={styles.screenTitle}>{t('profile.title')}</Text>
          <View style={styles.titleIconContainer}>
            <UserRound size={19} color={Colors.primary} strokeWidth={2.1} />
          </View>
        </View>

        {user && (
          <ProfileHeader
            name={user.name}
            email={user.email}
            provider={user.provider}
            avatarUrl={user.avatarUrl}
            avatarCacheKey={avatarCacheKey}
            onAvatarPress={handleEditAvatar}
          />
        )}

        <SettingsSection title={t('profile.sections.language')}>
          <SettingsRow
            icon={<Globe size={20} color={Colors.primary} />}
            label={t('profile.language.appLanguage')}
            value={LANGUAGE_NAMES[language]}
            onPress={handleOpenLanguagePicker}
          />
        </SettingsSection>

        <View style={styles.subscriptionSection}>
          <Text style={styles.sectionTitle}>{t('profile.sections.subscription')}</Text>
          <SubscriptionCard onUpgrade={handleUpgrade} onManage={handleManageSubscription} />
        </View>

        {showTestProCard && (
          <View style={styles.testProSection}>
            <TestProCard />
          </View>
        )}

        <SettingsSection title={t('profile.sections.notifications')}>
          <ReminderTimeRows />
          <SettingsRow
            icon={<Bell size={20} color={Colors.primary} />}
            label={t('settings.notSeenThreshold')}
            description={t('settings.notSeenDescription')}
            value={getNotSeenThresholdLabel(notSeenThresholdDays)}
            onPress={handleChangeNotSeenThreshold}
          />
          <SettingsRow
            icon={<CalendarCheck size={20} color={Colors.primary} />}
            label={t('settings.postEventFollowUp')}
            description={t('settings.postEventFollowUpDescription')}
            toggleValue={postEventFollowUpEnabled}
            onToggle={handlePostEventFollowUpToggle}
          />
          {isPremium && (
            <SettingsRow
              icon={<Newspaper size={20} color={Colors.primary} />}
              label={t('settings.weeklyDigest')}
              description={t('settings.weeklyDigestDescription')}
              toggleValue={weeklyDigestEnabled}
              onToggle={handleWeeklyDigestToggle}
            />
          )}
        </SettingsSection>

        <SettingsSection title={t('profile.sections.data')}>
          <SettingsRow
            icon={<Cloud size={20} color={Colors.primary} />}
            label={t('profile.sync.title')}
            description={syncError ? t('profile.sync.retryDescription') : t('profile.sync.description')}
            value={isSyncing
              ? t('profile.sync.syncing')
              : syncError
                ? t('profile.sync.retrying')
                : lastSyncedAt
                ? t('profile.sync.lastSynced', { date: formatLocalizedDate(lastSyncedAt) })
                : t('profile.sync.enabled')}
            showChevron={false}
          />
          <SettingsRow
            icon={<Download size={20} color={Colors.primary} />}
            label={t('profile.data.export')}
            onPress={handleOpenExport}
          />
          <SettingsRow
            icon={<Trash2 size={20} color={Colors.primary} />}
            label={t('profile.data.clearCache')}
            onPress={handleClearCache}
            showChevron={false}
          />
        </SettingsSection>

        {isAdmin && (
          <SettingsSection title="Admin">
            <SettingsRow
              icon={<Shield size={20} color={Colors.primary} />}
              label="Monitoring & Logs"
              onPress={handleOpenMonitoring}
            />
            <SettingsRow
              icon={<Users size={20} color={Colors.primary} />}
              label="Seed Contacts"
              onPress={handleOpenSeed}
            />
          </SettingsSection>
        )}

        <SettingsSection title={t('profile.sections.about')}>
          <SettingsRow
            icon={<Smartphone size={20} color={Colors.primary} />}
            label={t('profile.about.version')}
            value={appVersion}
            showChevron={false}
          />
          <SettingsRow
            icon={<MessageSquare size={20} color={Colors.primary} />}
            label={t('profile.about.feedback')}
            onPress={handleFeedback}
          />
          <SettingsRow
            icon={<FileText size={20} color={Colors.primary} />}
            label={t('profile.about.legal')}
            onPress={handleOpenLegal}
          />
        </SettingsSection>

        <View style={styles.logoutSection}>
          <SettingsRow
            icon={<LogOut size={20} color={Colors.error} />}
            label={t('profile.logout')}
            onPress={handleLogout}
            showChevron={false}
            destructive
          />
        </View>

        <View style={styles.deleteAccountSection}>
          <SettingsRow
            icon={<UserX size={20} color={Colors.error} />}
            label={t('profile.deleteAccount')}
            onPress={handleDeleteAccount}
            showChevron={false}
            destructive
          />
        </View>
      </ScrollView>

      <LanguagePicker ref={languagePickerRef} />
      <ExportDataSheet ref={exportDataSheetRef} />
      <LegalNoticesSheet ref={legalNoticesSheetRef} />
      <OptionPickerSheet
        ref={notSeenThresholdSheetRef}
        title={t('settings.notSeenThreshold')}
        options={notSeenThresholdOptions}
        selectedValue={notSeenThresholdDays}
        onSelect={handleNotSeenThresholdSelect}
      />

      <Modal visible={showPaywall} animationType="slide" presentationStyle="pageSheet">
        <Paywall onClose={() => setShowPaywall(false)} />
      </Modal>

      {user && (
        <UserAvatarEditModal
          visible={showAvatarModal}
          currentAvatarUrl={user.avatarUrl}
          onSave={handleSaveAvatar}
          onClose={() => setShowAvatarModal(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 180,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },
  screenTitle: {
    fontFamily: Fonts.sans.bold,
    fontSize: 30,
    letterSpacing: -0.8,
    color: Colors.textPrimary,
  },
  titleIconContainer: {
    height: 30,
    justifyContent: 'center',
    transform: [{ translateY: 4 }],
  },
  subscriptionSection: {
    marginBottom: 22,
  },
  testProSection: {
    marginBottom: 22,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  logoutSection: {
    marginTop: 8,
    marginBottom: 8,
  },
  deleteAccountSection: {
    marginBottom: 32,
  },
});
