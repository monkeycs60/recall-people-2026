import { useState, useRef } from 'react';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/stores/app-store';
import { transcribeAudio, extractInfo } from '@/lib/api';
import { useContacts } from './useContacts';

export const useRecording = () => {
  const recordingRef = useRef<Audio.Recording | null>(null);
  const router = useRouter();
  const { contacts, loadContacts } = useContacts();
  const {
    recordingState,
    setRecordingState,
    setCurrentAudioUri,
    setCurrentTranscription,
    setCurrentExtraction,
  } = useAppStore();

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Permission micro refusée');
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      setRecordingState('recording');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return null;

    try {
      setRecordingState('processing');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) throw new Error('No audio URI');

      setCurrentAudioUri(uri);

      // Load contacts for context
      await loadContacts();

      // 1. Transcription via API backend
      const transcriptionResult = await transcribeAudio(uri);
      setCurrentTranscription(transcriptionResult.transcript);

      // 2. Préparer les contacts pour l'extraction
      const contactsForExtraction = contacts.map((contact) => ({
        id: contact.id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        tags: contact.tags,
      }));

      // 3. Extraction IA via API backend
      const { extraction } = await extractInfo({
        transcription: transcriptionResult.transcript,
        existingContacts: contactsForExtraction,
      });

      setCurrentExtraction(extraction);
      setRecordingState('reviewing');

      // 4. Navigation based on extraction result
      if (extraction.contactIdentified.needsDisambiguation) {
        // Multiple contacts match - need disambiguation
        const possibleContacts = contacts.filter((contact) =>
          extraction.contactIdentified.suggestedMatches?.includes(contact.id)
        );

        router.push({
          pathname: '/disambiguation',
          params: {
            audioUri: uri,
            transcription: transcriptionResult.transcript,
            extraction: JSON.stringify(extraction),
            possibleContacts: JSON.stringify(possibleContacts),
          },
        });
      } else {
        // Single contact or new contact - go to review
        router.push({
          pathname: '/review',
          params: {
            contactId: extraction.contactIdentified.id || 'new',
            audioUri: uri,
            transcription: transcriptionResult.transcript,
            extraction: JSON.stringify(extraction),
          },
        });
      }

      return {
        uri,
        transcription: transcriptionResult.transcript,
        extraction,
      };
    } catch (error) {
      console.error('Failed to process recording:', error);
      setRecordingState('idle');
      throw error;
    }
  };

  const cancelRecording = async () => {
    if (recordingRef.current) {
      await recordingRef.current.stopAndUnloadAsync();
      recordingRef.current = null;
    }
    setRecordingState('idle');
  };

  return {
    recordingState,
    startRecording,
    stopRecording,
    cancelRecording,
    isRecording: recordingState === 'recording',
    isProcessing: recordingState === 'processing',
  };
};
