import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Mic, PencilLine } from 'lucide-react-native';
import { Colors, Fonts, Shadows } from '@/constants/theme';
import { FirstNoteIllustration } from '@/components/contact/FirstNoteIllustration';

type FirstNotePromptProps = {
  firstName: string;
  onVoiceNote: () => void;
  onTextNote: () => void;
};

export function FirstNotePrompt({ firstName, onVoiceNote, onTextNote }: FirstNotePromptProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.illustration}>
        <FirstNoteIllustration size={74} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{t('contact.firstNotePrompt.title')}</Text>
        <Text style={styles.description}>
          {t('contact.firstNotePrompt.description', { firstName })}
        </Text>
      </View>
      <View style={styles.actions}>
        <Pressable style={styles.primaryButton} onPress={onVoiceNote}>
          <Mic size={15} color={Colors.textInverse} strokeWidth={2.2} />
          <Text style={styles.primaryButtonText}>{t('contact.firstNotePrompt.voiceCta')}</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={onTextNote}>
          <PencilLine size={15} color={Colors.primary} strokeWidth={2.2} />
          <Text style={styles.secondaryButtonText}>{t('contact.firstNotePrompt.textCta')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.hairline,
    padding: 14,
    ...Shadows.card,
  },
  illustration: {
    width: 74,
    height: 74,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    paddingBottom: 32,
  },
  title: {
    fontFamily: Fonts.sans.bold,
    fontSize: 15,
    lineHeight: 20,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  description: {
    fontSize: 12.5,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  actions: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    flexDirection: 'row',
    gap: 8,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primary,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  primaryButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primaryLight,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  secondaryButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
});
