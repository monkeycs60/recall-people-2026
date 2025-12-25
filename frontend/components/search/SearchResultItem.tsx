import { View, Text, Pressable, StyleSheet } from 'react-native';
import { User, FileText, Brain, MessageSquare, ChevronRight } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeInDown,
} from 'react-native-reanimated';
import { SemanticSearchResult, SearchSourceType } from '@/types';
import { Colors } from '@/constants/theme';

type SearchResultItemProps = {
  result: SemanticSearchResult;
  index: number;
  onPress: () => void;
};

const SOURCE_CONFIG: Record<SearchSourceType, { icon: typeof FileText; color: string; label: string }> = {
  fact: { icon: Brain, color: Colors.primary, label: 'Profil' },
  memory: { icon: MessageSquare, color: Colors.success, label: 'Souvenir' },
  note: { icon: FileText, color: Colors.warning, label: 'Note' },
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function SearchResultItem({ result, index, onPress }: SearchResultItemProps) {
  const scale = useSharedValue(1);
  const config = SOURCE_CONFIG[result.sourceType];
  const IconComponent = config.icon;

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const scoreColor =
    result.relevanceScore >= 80
      ? Colors.success
      : result.relevanceScore >= 60
        ? Colors.warning
        : Colors.textMuted;

  return (
    <AnimatedPressable
      entering={FadeInDown.delay(index * 80).springify()}
      style={[pressStyle, styles.card]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <View style={styles.content}>
        <View style={styles.row}>
          <View style={[styles.avatar, { backgroundColor: `${config.color}20` }]}>
            <User size={22} color={config.color} />
          </View>

          <View style={styles.textContainer}>
            <View style={styles.header}>
              <Text style={styles.contactName}>{result.contactName}</Text>
              <View style={styles.scoreContainer}>
                <Text style={[styles.score, { color: scoreColor }]}>
                  {result.relevanceScore}%
                </Text>
                <ChevronRight size={16} color={Colors.textMuted} />
              </View>
            </View>

            <Text style={styles.answer}>{result.answer}</Text>

            <View style={styles.metaRow}>
              <View style={[styles.typeBadge, { backgroundColor: `${config.color}15` }]}>
                <IconComponent size={12} color={config.color} />
                <Text style={[styles.typeLabel, { color: config.color }]}>
                  {config.label}
                </Text>
              </View>
              <Text style={styles.reference} numberOfLines={1}>
                {result.reference}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={[styles.accentBar, { backgroundColor: config.color }]} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  content: {
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  contactName: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  score: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
  answer: {
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 22,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },
  reference: {
    fontSize: 13,
    color: Colors.textMuted,
    marginLeft: 8,
    flex: 1,
  },
  accentBar: {
    height: 3,
    opacity: 0.6,
  },
});
