import { View, Text } from 'react-native';
import { RecordButton } from '@/components/RecordButton';
import { useRecording } from '@/hooks/useRecording';

export default function HomeScreen() {
  const { startRecording, stopRecording, isRecording, isProcessing } = useRecording();

  return (
    <View className="flex-1 bg-background items-center justify-center px-6">
      <Text className="text-3xl font-bold text-textPrimary mb-4 text-center">
        Recall People
      </Text>

      <Text className="text-textSecondary mb-12 text-center">
        {isRecording
          ? 'Enregistrement en cours...'
          : isProcessing
          ? 'Analyse en cours...'
          : 'Maintenez pour enregistrer'}
      </Text>

      <RecordButton
        onPressIn={startRecording}
        onPressOut={stopRecording}
        isRecording={isRecording}
        isProcessing={isProcessing}
      />

      {isProcessing && (
        <Text className="text-textMuted mt-8 text-center">
          Transcription et analyse IA...
        </Text>
      )}
    </View>
  );
}
