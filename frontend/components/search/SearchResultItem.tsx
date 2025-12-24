import { View, Text, Pressable } from 'react-native';
import { User, FileText, Brain, MessageSquare, ChevronRight } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withDelay,
  FadeInDown,
} from 'react-native-reanimated';
import { SemanticSearchResult, SearchSourceType } from '@/types';

type SearchResultItemProps = {
  result: SemanticSearchResult;
  index: number;
  onPress: () => void;
};

const SOURCE_CONFIG: Record<SearchSourceType, { icon: typeof FileText; color: string; label: string }> = {
  fact: { icon: Brain, color: '#8b5cf6', label: 'Profil' },
  memory: { icon: MessageSquare, color: '#22c55e', label: 'Souvenir' },
  note: { icon: FileText, color: '#f59e0b', label: 'Note' },
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
      ? '#22c55e'
      : result.relevanceScore >= 60
        ? '#f59e0b'
        : '#71717a';

  return (
    <AnimatedPressable
      entering={FadeInDown.delay(index * 80).springify()}
      style={pressStyle}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      className="bg-surface rounded-2xl overflow-hidden mb-3"
    >
      <View className="p-4">
        <View className="flex-row items-start">
          <View
            className="w-12 h-12 rounded-xl items-center justify-center mr-3"
            style={{ backgroundColor: `${config.color}20` }}
          >
            <User size={22} color={config.color} />
          </View>

          <View className="flex-1">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-textPrimary font-semibold text-lg">
                {result.contactName}
              </Text>
              <View className="flex-row items-center">
                <Text
                  className="text-sm font-medium mr-1"
                  style={{ color: scoreColor }}
                >
                  {result.relevanceScore}%
                </Text>
                <ChevronRight size={16} color="#52525b" />
              </View>
            </View>

            <Text className="text-textPrimary text-base leading-relaxed mb-2">
              {result.answer}
            </Text>

            <View className="flex-row items-center">
              <View
                className="flex-row items-center rounded-full px-2.5 py-1"
                style={{ backgroundColor: `${config.color}15` }}
              >
                <IconComponent size={12} color={config.color} />
                <Text
                  className="text-xs font-medium ml-1.5"
                  style={{ color: config.color }}
                >
                  {config.label}
                </Text>
              </View>
              <Text className="text-textMuted text-sm ml-2 flex-1" numberOfLines={1}>
                {result.reference}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View
        className="h-1"
        style={{
          backgroundColor: config.color,
          opacity: 0.6,
        }}
      />
    </AnimatedPressable>
  );
}
