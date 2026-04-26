import { View, Text, Pressable, StyleSheet, ScrollView, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Shield, ExternalLink } from 'lucide-react-native';
import { Colors, Fonts } from '@/constants/theme';

const PRIVACY_URL = 'https://recall-people-2026.vercel.app/privacy';

type AIConsentModalProps = {
  onAccept: () => void;
};

export function AIConsentModal({ onAccept }: AIConsentModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const openPrivacyPolicy = () => {
    Linking.openURL(PRIVACY_URL);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, 16) }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconContainer}>
          <Shield size={40} color={Colors.primary} />
        </View>

        <Text style={styles.title}>{t('aiConsent.title')}</Text>
        <Text style={styles.subtitle}>{t('aiConsent.subtitle')}</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('aiConsent.whatWeShare')}</Text>

          <View style={styles.bulletRow}>
            <Text style={styles.bullet}>1.</Text>
            <Text style={styles.bulletText}>{t('aiConsent.voiceData')}</Text>
          </View>
          <View style={styles.bulletRow}>
            <Text style={styles.bullet}>2.</Text>
            <Text style={styles.bulletText}>{t('aiConsent.textData')}</Text>
          </View>
          <View style={styles.bulletRow}>
            <Text style={styles.bullet}>3.</Text>
            <Text style={styles.bulletText}>{t('aiConsent.avatarData')}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('aiConsent.whoReceives')}</Text>

          <View style={styles.providerRow}>
            <Text style={styles.providerName}>Groq Whisper</Text>
            <Text style={styles.providerPurpose}>{t('aiConsent.providerTranscription')}</Text>
          </View>
          <View style={styles.providerRow}>
            <Text style={styles.providerName}>Cerebras</Text>
            <Text style={styles.providerPurpose}>{t('aiConsent.providerAnalysis')}</Text>
          </View>
          <View style={styles.providerRow}>
            <Text style={styles.providerName}>OpenAI GPT Image 2</Text>
            <Text style={styles.providerPurpose}>{t('aiConsent.providerAvatar')}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('aiConsent.protections')}</Text>

          <View style={styles.bulletRow}>
            <Text style={styles.checkmark}>&#10003;</Text>
            <Text style={styles.bulletText}>{t('aiConsent.noTraining')}</Text>
          </View>
          <View style={styles.bulletRow}>
            <Text style={styles.checkmark}>&#10003;</Text>
            <Text style={styles.bulletText}>{t('aiConsent.noStorage')}</Text>
          </View>
          <View style={styles.bulletRow}>
            <Text style={styles.checkmark}>&#10003;</Text>
            <Text style={styles.bulletText}>{t('aiConsent.localFirst')}</Text>
          </View>
        </View>

        <Pressable onPress={openPrivacyPolicy} style={styles.privacyLink}>
          <Text style={styles.privacyLinkText}>{t('aiConsent.readPrivacyPolicy')}</Text>
          <ExternalLink size={14} color={Colors.primary} />
        </Pressable>

        <Pressable style={styles.acceptButton} onPress={onAccept}>
          <Text style={styles.acceptButtonText}>{t('aiConsent.accept')}</Text>
        </Pressable>
      </ScrollView>
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
    paddingHorizontal: 24,
    alignItems: 'center',
    paddingBottom: 24,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: Fonts.sans.bold,
    fontSize: 24,
    letterSpacing: -0.5,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  card: {
    alignSelf: 'stretch',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 8,
  },
  bullet: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    width: 18,
  },
  checkmark: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.success,
    width: 18,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  providerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceAlt,
  },
  providerName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  providerPurpose: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  privacyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 24,
    marginTop: 4,
  },
  privacyLinkText: {
    fontSize: 14,
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  acceptButton: {
    alignSelf: 'stretch',
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: Colors.textInverse,
    fontSize: 17,
    fontWeight: '700',
  },
});
