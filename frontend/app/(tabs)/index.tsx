import { View, Text } from 'react-native';
import { useState as useStateReact } from 'react';
import { useTranslation } from 'react-i18next';
import { RecordButton } from '@/components/RecordButton';
import { useRecording } from '@/hooks/useRecording';
import { useContactsStore } from '@/stores/contacts-store';
import { Colors } from '@/constants/theme';

export default function HomeScreen() {
  const { t } = useTranslation();
  const {
    toggleRecording,
    isRecording,
    isProcessing,
    recordingDuration,
    maxRecordingDuration,
  } = useRecording();
  const { isInitialized, loadContacts } = useContactsStore();
  const [hasLoadedContacts, setHasLoadedContacts] = useStateReact(false);

  // Load contacts on first render
  if (!hasLoadedContacts && !isInitialized) {
    loadContacts();
    setHasLoadedContacts(true);
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: Colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
      }}
    >
      <Text
        style={{
          fontSize: 28,
          fontWeight: 'bold',
          color: Colors.textPrimary,
          marginBottom: 16,
          textAlign: 'center',
        }}
      >
        Recall People
      </Text>

      {isRecording ? (
        <View style={{ alignItems: 'center', marginBottom: 48 }}>
          <Text
            style={{
              fontFamily: 'PlayfairDisplay_500Medium',
              fontSize: 48,
              color: Colors.primary,
              textAlign: 'center',
            }}
          >
            {formatDuration(recordingDuration)}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: Colors.textMuted,
              textAlign: 'center',
            }}
          >
            {formatDuration(maxRecordingDuration - recordingDuration)} {t('record.remaining', { defaultValue: 'restant' })}
          </Text>
        </View>
      ) : isProcessing ? (
        <Text
          style={{
            color: Colors.textSecondary,
            marginBottom: 48,
            textAlign: 'center',
          }}
        >
          {t('home.transcribing')}
        </Text>
      ) : (
        <Text
          style={{
            color: Colors.textSecondary,
            marginBottom: 48,
            textAlign: 'center',
          }}
        >
          {t('home.pressToRecord')}
        </Text>
      )}

      <RecordButton
        onPress={toggleRecording}
        isRecording={isRecording}
        isProcessing={isProcessing}
      />
    </View>
  );
}
