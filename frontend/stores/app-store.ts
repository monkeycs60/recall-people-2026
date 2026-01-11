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
  pendingAvatarGenerations: Set<string>;
};

type AppActions = {
  setRecordingState: (state: RecordingState) => void;
  setProcessingStep: (step: ProcessingStep) => void;
  setCurrentAudioUri: (uri: string | null) => void;
  setCurrentTranscription: (text: string | null) => void;
  setCurrentExtraction: (extraction: ExtractionResult | null) => void;
  setPreselectedContactId: (contactId: string | null) => void;
  resetRecording: () => void;
  addPendingAvatarGeneration: (contactId: string) => void;
  removePendingAvatarGeneration: (contactId: string) => void;
  isAvatarGenerating: (contactId: string) => boolean;
};

export const useAppStore = create<AppState & AppActions>()(
  devtools(
    (set, get) => ({
      recordingState: 'idle',
      processingStep: null,
      currentAudioUri: null,
      currentTranscription: null,
      currentExtraction: null,
      preselectedContactId: null,
      pendingAvatarGenerations: new Set<string>(),

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
      addPendingAvatarGeneration: (contactId) =>
        set((state) => ({
          pendingAvatarGenerations: new Set(state.pendingAvatarGenerations).add(contactId),
        })),
      removePendingAvatarGeneration: (contactId) =>
        set((state) => {
          const newSet = new Set(state.pendingAvatarGenerations);
          newSet.delete(contactId);
          return { pendingAvatarGenerations: newSet };
        }),
      isAvatarGenerating: (contactId) => get().pendingAvatarGenerations.has(contactId),
    }),
    { name: 'app-store' }
  )
);
