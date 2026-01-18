import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type QuestionHistoryEntry = {
	id: string;
	question: string;
	answerSummary: string;
	date: string;
	relatedContactId?: string;
	relatedContactName?: string;
};

type QuestionHistoryState = {
	entries: QuestionHistoryEntry[];
	isHydrated: boolean;
};

type QuestionHistoryActions = {
	addEntry: (entry: Omit<QuestionHistoryEntry, 'id' | 'date'>) => void;
	removeEntry: (entryId: string) => void;
	clearHistory: () => void;
	setHydrated: (hydrated: boolean) => void;
};

const MAX_HISTORY_ENTRIES = 50;

const generateId = (): string => {
	return `qh_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

const truncateAnswer = (answer: string, maxLength = 150): string => {
	if (answer.length <= maxLength) return answer;
	return answer.substring(0, maxLength).trim() + '...';
};

export const useQuestionHistoryStore = create<QuestionHistoryState & QuestionHistoryActions>()(
	devtools(
		persist(
			(set) => ({
				entries: [],
				isHydrated: false,

				addEntry: (entry) =>
					set((state) => {
						const newEntry: QuestionHistoryEntry = {
							id: generateId(),
							question: entry.question,
							answerSummary: truncateAnswer(entry.answerSummary),
							date: new Date().toISOString(),
							relatedContactId: entry.relatedContactId,
							relatedContactName: entry.relatedContactName,
						};

						const updatedEntries = [newEntry, ...state.entries].slice(0, MAX_HISTORY_ENTRIES);

						return { entries: updatedEntries };
					}),

				removeEntry: (entryId) =>
					set((state) => ({
						entries: state.entries.filter((entry) => entry.id !== entryId),
					})),

				clearHistory: () => set({ entries: [] }),

				setHydrated: (isHydrated) => set({ isHydrated }),
			}),
			{
				name: 'question-history-store',
				storage: createJSONStorage(() => AsyncStorage),
				onRehydrateStorage: () => (state) => {
					state?.setHydrated(true);
				},
				partialize: (state) => ({
					entries: state.entries,
				}),
			}
		),
		{ name: 'question-history-store' }
	)
);
