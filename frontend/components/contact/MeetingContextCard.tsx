import { View, Text, StyleSheet } from 'react-native';
import { MapPin, NotebookText } from 'lucide-react-native';
import { Colors, Fonts } from '@/constants/theme';

type MeetingContextCardProps = {
  context: string;
  sourceTitle?: string;
};

export function MeetingContextCard({ context, sourceTitle }: MeetingContextCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <MapPin size={17} color={Colors.primary} strokeWidth={2.2} />
      </View>
      <View style={styles.content}>
        <Text style={styles.label}>Contexte de rencontre</Text>
        <Text style={styles.contextText}>{context}</Text>
        {sourceTitle ? (
          <View style={styles.sourceRow}>
            <NotebookText size={12} color={Colors.textMuted} strokeWidth={2} />
            <Text style={styles.sourceText}>{sourceTitle}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.hairline,
    padding: 15,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: Colors.textMuted,
    marginBottom: 5,
  },
  contextText: {
    fontFamily: Fonts.sans.semibold,
    fontSize: 15,
    lineHeight: 21,
    color: Colors.textPrimary,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 9,
  },
  sourceText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textMuted,
  },
});
