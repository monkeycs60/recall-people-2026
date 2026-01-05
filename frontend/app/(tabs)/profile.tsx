import { View, Text, ScrollView, Alert, Linking, StyleSheet, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useRef, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  Globe,
  BarChart3,
  Download,
  Trash2,
  Smartphone,
  MessageSquare,
  FileText,
  LogOut,
  BookOpen,
  Shield,
} from 'lucide-react-native';
import { useAuthStore } from '@/stores/auth-store';
import { useSettingsStore } from '@/stores/settings-store';
import { LANGUAGE_NAMES } from '@/types';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { SettingsSection } from '@/components/profile/SettingsSection';
import { SettingsRow } from '@/components/profile/SettingsRow';
import { LanguagePicker } from '@/components/profile/LanguagePicker';
import { StatisticsSheet } from '@/components/profile/StatisticsSheet';
import { ExportDataSheet } from '@/components/profile/ExportDataSheet';
import { LegalNoticesSheet } from '@/components/profile/LegalNoticesSheet';
import { SubscriptionCard } from '@/components/profile/SubscriptionCard';
import { TestProCard } from '@/components/profile/TestProCard';
import { Colors } from '@/constants/theme';
import Constants from 'expo-constants';
import { revenueCatService } from '@/services/revenuecat.service';
import { Paywall } from '@/components/Paywall';
import { canActivateTestPro } from '@/config/pro-whitelist';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const language = useSettingsStore((state) => state.language);
  const setHasSeenOnboarding = useSettingsStore((state) => state.setHasSeenOnboarding);

  const [showPaywall, setShowPaywall] = useState(false);

  const languagePickerRef = useRef<BottomSheetModal>(null);
  const statisticsSheetRef = useRef<BottomSheetModal>(null);
  const exportDataSheetRef = useRef<BottomSheetModal>(null);
  const legalNoticesSheetRef = useRef<BottomSheetModal>(null);

  const handleOpenLanguagePicker = useCallback(() => {
    languagePickerRef.current?.present();
  }, []);

  const handleOpenStatistics = useCallback(() => {
    statisticsSheetRef.current?.present();
  }, []);

  const handleOpenExport = useCallback(() => {
    exportDataSheetRef.current?.present();
  }, []);

  const handleOpenLegal = useCallback(() => {
    legalNoticesSheetRef.current?.present();
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

  const handleRedoTour = () => {
    setHasSeenOnboarding(false);
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

  const appVersion = Constants.expoConfig?.version || '1.0.0';

  const adminEmail = process.env.EXPO_PUBLIC_ADMIN_EMAIL || '';
  const isAdmin = adminEmail && user?.email === adminEmail;
  const showTestProCard = canActivateTestPro(user?.email);

  const handleOpenMonitoring = () => {
    router.push('/admin/monitoring');
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        style={{ paddingTop: insets.top + 16 }}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.screenTitle}>{t('profile.title')}</Text>

        {user && (
          <ProfileHeader
            name={user.name}
            email={user.email}
            provider={user.provider}
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

        <SettingsSection title={t('profile.sections.data')}>
          <SettingsRow
            icon={<BarChart3 size={20} color={Colors.primary} />}
            label={t('profile.data.statistics')}
            onPress={handleOpenStatistics}
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
            icon={<BookOpen size={20} color={Colors.primary} />}
            label={t('onboarding.redoTour')}
            onPress={handleRedoTour}
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
      </ScrollView>

      <LanguagePicker ref={languagePickerRef} />
      <StatisticsSheet ref={statisticsSheetRef} />
      <ExportDataSheet ref={exportDataSheetRef} />
      <LegalNoticesSheet ref={legalNoticesSheetRef} />

      <Modal visible={showPaywall} animationType="slide" presentationStyle="pageSheet">
        <Paywall onClose={() => setShowPaywall(false)} />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 180,
  },
  screenTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 32,
    color: Colors.textPrimary,
    marginBottom: 24,
  },
  subscriptionSection: {
    marginBottom: 24,
  },
  testProSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  logoutSection: {
    marginTop: 8,
    marginBottom: 32,
  },
});
