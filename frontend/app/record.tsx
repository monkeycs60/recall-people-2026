import { View, Text, Pressable } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { RecordButton } from '@/components/RecordButton';
import { useRecording } from '@/hooks/useRecording';
import { useContactsStore } from '@/stores/contacts-store';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
  Easing,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';

const HELPER_PROMPTS = [
  'Citez le nom de la personne...',
  'Parlez de votre rencontre...',
  'Mentionnez des details personnels...',
  'Partagez ce que vous avez appris...',
];

export default function RecordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { toggleRecording, isRecording, isProcessing, recordingDuration } = useRecording();
  const { isInitialized, loadContacts } = useContactsStore();
  const [promptIndex, setPromptIndex] = useState(0);

  useEffect(() => {
    if (!isInitialized) {
      loadContacts();
    }
  }, [isInitialized, loadContacts]);

  useEffect(() => {
    if (!isRecording) {
      const interval = setInterval(() => {
        setPromptIndex((prev) => (prev + 1) % HELPER_PROMPTS.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [isRecording]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleClose = () => {
    if (!isRecording && !isProcessing) {
      router.back();
    }
  };

  return (
    <View
      className="flex-1 bg-background"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <View className="flex-row justify-end px-4 pt-2">
        <Pressable
          onPress={handleClose}
          className="w-10 h-10 items-center justify-center rounded-full"
          style={{ backgroundColor: Colors.surfaceHover }}
          disabled={isRecording || isProcessing}
        >
          <X size={20} color={Colors.textSecondary} />
        </Pressable>
      </View>

      <View className="flex-1 items-center justify-center px-8">
        <Text
          className="text-center mb-2"
          style={{
            fontFamily: 'PlayfairDisplay_700Bold',
            fontSize: 32,
            color: Colors.textPrimary,
          }}
        >
          Recall People
        </Text>

        {isRecording ? (
          <Animated.View entering={FadeIn} exiting={FadeOut}>
            <Text
              className="text-center mb-16"
              style={{
                fontFamily: 'PlayfairDisplay_500Medium',
                fontSize: 48,
                color: Colors.primary,
              }}
            >
              {formatDuration(recordingDuration)}
            </Text>
          </Animated.View>
        ) : isProcessing ? (
          <Animated.Text
            entering={FadeIn}
            className="text-textSecondary text-center mb-16 text-lg"
          >
            {t('home.transcribing')}
          </Animated.Text>
        ) : (
          <Animated.Text
            key={promptIndex}
            entering={FadeIn.duration(500)}
            exiting={FadeOut.duration(300)}
            className="text-textMuted text-center mb-16 text-base italic"
            style={{ minHeight: 24 }}
          >
            {HELPER_PROMPTS[promptIndex]}
          </Animated.Text>
        )}

        <RecordButton
          onPress={toggleRecording}
          isRecording={isRecording}
          isProcessing={isProcessing}
        />

        {isRecording && (
          <Animated.Text
            entering={FadeIn.delay(300)}
            className="text-textMuted text-center mt-8 text-sm"
          >
            Appuyez pour terminer
          </Animated.Text>
        )}
      </View>

      <View className="px-8 pb-8">
        <Text className="text-textMuted text-center text-xs leading-5">
          {t('home.helperText', {
            defaultValue: 'Conseil : mentionnez le nom, le contexte de rencontre, et les details importants sur la personne.',
          })}
        </Text>
      </View>
    </View>
  );
}
