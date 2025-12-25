import { View, Text, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Globe,
  BarChart3,
  Download,
  Trash2,
  Smartphone,
  MessageSquare,
  FileText,
  LogOut,
} from 'lucide-react-native';
import { useAuthStore } from '@/stores/auth-store';
import { useSettingsStore } from '@/stores/settings-store';
import { LANGUAGE_NAMES } from '@/types';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { SettingsSection } from '@/components/profile/SettingsSection';
import { SettingsRow } from '@/components/profile/SettingsRow';
import { LanguagePicker } from '@/components/profile/LanguagePicker';
import Constants from 'expo-constants';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const language = useSettingsStore((state) => state.language);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

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

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView className="flex-1 px-4">
        <Text className="text-textPrimary text-2xl font-bold mt-4 mb-6">
          {t('profile.title')}
        </Text>

        {user && (
          <ProfileHeader
            name={user.name}
            email={user.email}
            provider="Google"
          />
        )}

        <SettingsSection title={t('profile.sections.language')}>
          <SettingsRow
            icon={<Globe size={20} color="#8b5cf6" />}
            label={t('profile.language.appLanguage')}
            value={LANGUAGE_NAMES[language]}
            onPress={() => setShowLanguagePicker(true)}
          />
        </SettingsSection>

        <SettingsSection title={t('profile.sections.data')}>
          <SettingsRow
            icon={<BarChart3 size={20} color="#8b5cf6" />}
            label={t('profile.data.statistics')}
            onPress={() => {}}
          />
          <SettingsRow
            icon={<Download size={20} color="#8b5cf6" />}
            label={t('profile.data.export')}
            onPress={() => {}}
          />
          <SettingsRow
            icon={<Trash2 size={20} color="#8b5cf6" />}
            label={t('profile.data.clearCache')}
            onPress={() => {}}
            showChevron={false}
          />
        </SettingsSection>

        <SettingsSection title={t('profile.sections.about')}>
          <SettingsRow
            icon={<Smartphone size={20} color="#8b5cf6" />}
            label={t('profile.about.version')}
            value={appVersion}
            showChevron={false}
          />
          <SettingsRow
            icon={<MessageSquare size={20} color="#8b5cf6" />}
            label={t('profile.about.feedback')}
            onPress={() => {}}
          />
          <SettingsRow
            icon={<FileText size={20} color="#8b5cf6" />}
            label={t('profile.about.legal')}
            onPress={() => {}}
          />
        </SettingsSection>

        <View className="mt-2 mb-8">
          <SettingsRow
            icon={<LogOut size={20} color="#ef4444" />}
            label={t('profile.logout')}
            onPress={handleLogout}
            showChevron={false}
            destructive
          />
        </View>
      </ScrollView>

      <LanguagePicker
        visible={showLanguagePicker}
        onClose={() => setShowLanguagePicker(false)}
      />
    </SafeAreaView>
  );
}
