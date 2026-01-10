import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { RecordingState, ExtractionResult, ProcessingStep } from '@/types';

type AppState = {
  recordingState: RecordingState;
  processingStep: ProcessingStep;
  currentAudioUri: string | null;
  currentTranscription: string | null;
  currentExtraction: ExtractionResult | null;
  preselectedContactId: string | null;
};

type AppActions = {
  setRecordingState: (state: RecordingState) => void;
  setProcessingStep: (step: ProcessingStep) => void;
  setCurrentAudioUri: (uri: string | null) => void;
  setCurrentTranscription: (text: string | null) => void;
  setCurrentExtraction: (extraction: ExtractionResult | null) => void;
  setPreselectedContactId: (contactId: string | null) => void;
  resetRecording: () => void;
};

export const useAppStore = create<AppState & AppActions>()(
  devtools(
    (set) => ({
      recordingState: 'idle',
      processingStep: null,
      currentAudioUri: null,
      currentTranscription: null,
      currentExtraction: null,
      preselectedContactId: null,

      setRecordingState: (recordingState) => set({ recordingState }),
      setProcessingStep: (processingStep) => set({ processingStep }),
      setCurrentAudioUri: (currentAudioUri) => set({ currentAudioUri }),
      setCurrentTranscription: (currentTranscription) => set({ currentTranscription }),
      setCurrentExtraction: (currentExtraction) => set({ currentExtraction }),
      setPreselectedContactId: (preselectedContactId) => set({ preselectedContactId }),
      resetRecording: () =>
        set({
          recordingState: 'idle',
          processingStep: null,
          currentAudioUri: null,
          currentTranscription: null,
          currentExtraction: null,
          preselectedContactId: null,
        }),
    }),
    { name: 'app-store' }
  )
);
