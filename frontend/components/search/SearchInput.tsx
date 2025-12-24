import { View, TextInput, Pressable } from 'react-native';
import { Search, X, Sparkles } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { useEffect } from 'react';

type SearchInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  isLoading: boolean;
};

const AnimatedView = Animated.createAnimatedComponent(View);

export function SearchInput({
  value,
  onChangeText,
  onSubmit,
  onClear,
  isLoading,
}: SearchInputProps) {
  const borderColorProgress = useSharedValue(0);

  useEffect(() => {
    if (isLoading) {
      borderColorProgress.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 800 }),
          withTiming(0, { duration: 800 })
        ),
        -1,
        true
      );
    } else {
      borderColorProgress.value = withTiming(0, { duration: 300 });
    }
  }, [isLoading, borderColorProgress]);

  const containerStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      borderColorProgress.value,
      [0, 1],
      ['#27272a', '#8b5cf6']
    ),
  }));

  return (
    <AnimatedView
      style={containerStyle}
      className="flex-row items-center bg-surface rounded-2xl px-4 h-14 border-2"
    >
      <View className="mr-3">
        {isLoading ? (
          <Sparkles size={22} color="#8b5cf6" />
        ) : (
          <Search size={22} color="#71717a" />
        )}
      </View>

      <TextInput
        className="flex-1 text-textPrimary text-base h-full"
        placeholder="Rechercher dans vos contacts..."
        placeholderTextColor="#52525b"
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        returnKeyType="search"
        editable={!isLoading}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {value.length > 0 && !isLoading && (
        <Pressable
          onPress={onClear}
          className="ml-2 w-8 h-8 rounded-full bg-surfaceHover items-center justify-center"
        >
          <X size={16} color="#a1a1aa" />
        </Pressable>
      )}
    </AnimatedView>
  );
}
