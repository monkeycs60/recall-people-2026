import { View, TextInput, Pressable } from 'react-native';
import { X, Sparkles, SendHorizonal } from 'lucide-react-native';
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

  const animatedBorderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      borderColorProgress.value,
      [0, 1],
      ['#27272a', '#8b5cf6']
    ),
  }));

  const canSubmit = value.trim().length > 0 && !isLoading;

  return (
    <Animated.View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#18181b',
          borderRadius: 16,
          paddingLeft: 16,
          paddingRight: 8,
          height: 56,
          borderWidth: 2,
        },
        animatedBorderStyle,
      ]}
    >
      <View style={{ marginRight: 12 }}>
        {isLoading ? (
          <Sparkles size={22} color="#8b5cf6" />
        ) : (
          <Sparkles size={22} color="#71717a" />
        )}
      </View>

      <TextInput
        style={{
          flex: 1,
          color: '#fafafa',
          fontSize: 16,
          height: '100%',
        }}
        placeholder="Posez une question..."
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
          style={{
            marginLeft: 4,
            width: 32,
            height: 32,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={18} color="#71717a" />
        </Pressable>
      )}

      <Pressable
        onPress={onSubmit}
        disabled={!canSubmit}
        style={{
          marginLeft: 4,
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: canSubmit ? '#8b5cf6' : '#27272a',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <SendHorizonal size={20} color={canSubmit ? '#fafafa' : '#52525b'} />
      </Pressable>
    </Animated.View>
  );
}
