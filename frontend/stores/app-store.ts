import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { RecordingState, ExtractionResult } from '@/types';

type AppState = {
  recordingState: RecordingState;
  currentAudioUri: string | null;
  currentTranscription: string | null;
  currentExtraction: ExtractionResult | null;
  preselectedContactId: string | null;
};

type AppActions = {
  setRecordingState: (state: RecordingState) => void;
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
      currentAudioUri: null,
      currentTranscription: null,
      currentExtraction: null,
      preselectedContactId: null,

      setRecordingState: (recordingState) => set({ recordingState }),
      setCurrentAudioUri: (currentAudioUri) => set({ currentAudioUri }),
      setCurrentTranscription: (currentTranscription) => set({ currentTranscription }),
      setCurrentExtraction: (currentExtraction) => set({ currentExtraction }),
      setPreselectedContactId: (preselectedContactId) => set({ preselectedContactId }),
      resetRecording: () =>
        set({
          recordingState: 'idle',
          currentAudioUri: null,
          currentTranscription: null,
          currentExtraction: null,
          preselectedContactId: null,
        }),
    }),
    { name: 'app-store' }
  )
);
