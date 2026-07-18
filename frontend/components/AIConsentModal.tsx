import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown, ChevronUp, Shield, ExternalLink, X } from 'lucide-react-native';
import { Colors, Fonts } from '@/constants/theme';

const PRIVACY_URL = 'https://recallpeople.com/privacy';

type AIConsentModalProps = {
  onAccept: () => void;
  onDecline: () => void;
  onDismiss: () => void;
};

export function AIConsentModal({ onAccept, onDecline, onDismiss }: AIConsentModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [detailsVisible, setDetailsVisible] = useState(false);

  const openPrivacyPolicy = () => {
    Linking.openURL(PRIVACY_URL);
  };

  return (
    <View style={styles.overlay}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('aiConsent.close')}
        onPress={onDismiss}
        style={styles.backdrop}
      />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Shield size={22} color={Colors.primary} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>{t('aiConsent.title')}</Text>
            <Text style={styles.subtitle}>{t('aiConsent.subtitle')}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('aiConsent.close')}
            hitSlop={12}
            onPress={onDismiss}
            style={styles.closeButton}
          >
            <X size={20} color={Colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.protectionCard}>
            <View style={styles.bulletRow}>
              <Text style={styles.checkmark}>&#10003;</Text>
              <Text style={styles.bulletText}>{t('aiConsent.localFirst')}</Text>
            </View>
            <View style={[styles.bulletRow, styles.bulletRowLast]}>
              <Text style={styles.checkmark}>&#10003;</Text>
              <Text style={styles.bulletText}>{t('aiConsent.noTraining')}</Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: detailsVisible }}
            onPress={() => setDetailsVisible((visible) => !visible)}
            style={styles.detailsToggle}
          >
            <Text style={styles.detailsToggleText}>
              {t(detailsVisible ? 'aiConsent.showLess' : 'aiConsent.learnMore')}
            </Text>
            {detailsVisible ? (
              <ChevronUp size={16} color={Colors.primary} />
            ) : (
              <ChevronDown size={16} color={Colors.primary} />
            )}
          </Pressable>

          {detailsVisible ? (
            <View style={styles.detailsContainer}>
              <Text style={styles.sectionTitle}>{t('aiConsent.whoReceives')}</Text>
              <View style={styles.card}>
                <View style={styles.providerRow}>
                  <Text style={styles.providerName}>Groq Whisper</Text>
                  <Text style={styles.providerPurpose}>{t('aiConsent.providerTranscription')}</Text>
                </View>
                <View style={styles.providerRow}>
                  <Text style={styles.providerName}>Cerebras</Text>
                  <Text style={styles.providerPurpose}>{t('aiConsent.providerAnalysis')}</Text>
                </View>
                <View style={styles.providerRow}>
                  <Text style={styles.providerName}>OpenAI</Text>
                  <Text style={styles.providerPurpose}>{t('aiConsent.providerAvatar')}</Text>
                </View>
                <View style={[styles.providerRow, styles.providerRowLast]}>
                  <Text style={styles.providerName}>xAI</Text>
                  <Text style={styles.providerPurpose}>{t('aiConsent.providerEvaluation')}</Text>
                </View>
              </View>

              <Pressable onPress={openPrivacyPolicy} style={styles.privacyLink}>
                <Text style={styles.privacyLinkText}>{t('aiConsent.readPrivacyPolicy')}</Text>
                <ExternalLink size={13} color={Colors.primary} />
              </Pressable>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.actions}>
          <Pressable style={styles.acceptButton} onPress={onAccept}>
            <Text style={styles.acceptButtonText}>{t('aiConsent.accept')}</Text>
          </Pressable>
          <Pressable style={styles.declineButton} onPress={onDecline}>
            <Text style={styles.declineButtonText}>{t('aiConsent.decline')}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20, 18, 24, 0.42)',
  },
  sheet: {
    maxHeight: '88%',
    backgroundColor: Colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginTop: 10,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 18,
  },
  headerCopy: {
    flex: 1,
  },
  closeButton: {
    paddingTop: 2,
  },
  scrollView: {
    flexShrink: 1,
  },
  scrollContent: {
    paddingBottom: 6,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Fonts.sans.bold,
    fontSize: 21,
    letterSpacing: -0.35,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  protectionCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 14,
    padding: 14,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  bulletRowLast: {
    marginBottom: 0,
  },
  checkmark: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.success,
    width: 16,
  },
  bulletText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceAlt,
  },
  providerRowLast: {
    borderBottomWidth: 0,
  },
  providerName: {
    width: 92,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  providerPurpose: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textMuted,
  },
  privacyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingVertical: 6,
  },
  privacyLinkText: {
    fontSize: 12,
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingVertical: 10,
  },
  detailsToggleText: {
    fontFamily: Fonts.sans.semibold,
    fontSize: 12,
    color: Colors.primary,
  },
  detailsContainer: {
    paddingTop: 4,
  },
  actions: {
    paddingTop: 12,
  },
  acceptButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    borderRadius: 15,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: Colors.textInverse,
    fontSize: 15,
    fontWeight: '700',
  },
  declineButton: {
    marginTop: 4,
    paddingVertical: 11,
    paddingHorizontal: 20,
  },
  declineButtonText: {
    fontFamily: Fonts.sans.semibold,
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
