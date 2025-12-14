import { View, Text } from 'react-native';
import { useState as useStateReact } from 'react';
import { RecordButton } from '@/components/RecordButton';
import { useRecording } from '@/hooks/useRecording';
import { useContactsStore } from '@/stores/contacts-store';

export default function HomeScreen() {
  const { toggleRecording, isRecording, isProcessing } = useRecording();
  const { isInitialized, loadContacts } = useContactsStore();
  const [hasLoadedContacts, setHasLoadedContacts] = useStateReact(false);

  // Load contacts on first render
  if (!hasLoadedContacts && !isInitialized) {
    loadContacts();
    setHasLoadedContacts(true);
  }

  return (
    <View className="flex-1 bg-background items-center justify-center px-6">
      <Text className="text-3xl font-bold text-textPrimary mb-4 text-center">
        Recall People
      </Text>

      <Text className="text-textSecondary mb-12 text-center">
        {isRecording
          ? 'Appuie pour arrêter'
          : isProcessing
          ? 'Analyse en cours...'
          : 'Appuie pour enregistrer'}
      </Text>

      <RecordButton
        onPress={toggleRecording}
        isRecording={isRecording}
        isProcessing={isProcessing}
      />

      {isProcessing && (
        <Text className="text-textMuted mt-8 text-center">
          Transcription en cours...
        </Text>
      )}
    </View>
  );
}
