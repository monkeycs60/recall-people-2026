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
      style={{
        flex: 1,
        backgroundColor: Colors.background,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 8 }}>
        <Pressable
          onPress={handleClose}
          style={{
            width: 40,
            height: 40,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 20,
            backgroundColor: Colors.surfaceHover,
          }}
          disabled={isRecording || isProcessing}
        >
          <X size={20} color={Colors.textSecondary} />
        </Pressable>
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <Text
          style={{
            fontFamily: 'PlayfairDisplay_700Bold',
            fontSize: 32,
            color: Colors.textPrimary,
            textAlign: 'center',
            marginBottom: 8,
          }}
        >
          Recall People
        </Text>

        {isRecording ? (
          <Animated.View entering={FadeIn} exiting={FadeOut}>
            <Text
              style={{
                fontFamily: 'PlayfairDisplay_500Medium',
                fontSize: 48,
                color: Colors.primary,
                textAlign: 'center',
                marginBottom: 64,
              }}
            >
              {formatDuration(recordingDuration)}
            </Text>
          </Animated.View>
        ) : isProcessing ? (
          <Animated.Text
            entering={FadeIn}
            style={{
              color: Colors.textSecondary,
              textAlign: 'center',
              marginBottom: 64,
              fontSize: 18,
            }}
          >
            {t('home.transcribing')}
          </Animated.Text>
        ) : (
          <Animated.Text
            key={promptIndex}
            entering={FadeIn.duration(500)}
            exiting={FadeOut.duration(300)}
            style={{
              color: Colors.textMuted,
              textAlign: 'center',
              marginBottom: 64,
              fontSize: 16,
              fontStyle: 'italic',
              minHeight: 24,
            }}
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
            style={{
              color: Colors.textMuted,
              textAlign: 'center',
              marginTop: 32,
              fontSize: 14,
            }}
          >
            Appuyez pour terminer
          </Animated.Text>
        )}
      </View>

      <View style={{ paddingHorizontal: 32, paddingBottom: 32 }}>
        <Text style={{ color: Colors.textMuted, textAlign: 'center', fontSize: 12, lineHeight: 20 }}>
          {t('home.helperText', {
            defaultValue: 'Conseil : mentionnez le nom, le contexte de rencontre, et les details importants sur la personne.',
          })}
        </Text>
      </View>
    </View>
  );
}
