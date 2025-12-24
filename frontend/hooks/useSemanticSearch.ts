import { useState, useCallback } from 'react';
import { useContactsStore } from '@/stores/contacts-store';
import { contactService } from '@/services/contact.service';
import { searchService } from '@/services/search.service';
import { SemanticSearchResult, SearchRequest, FactType } from '@/types';

type UseSemanticSearchResult = {
  results: SemanticSearchResult[];
  isLoading: boolean;
  error: string | null;
  search: (query: string) => Promise<void>;
  clearResults: () => void;
};

export const useSemanticSearch = (): UseSemanticSearchResult => {
  const { contacts } = useContactsStore();
  const [results, setResults] = useState<SemanticSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const searchRequest: SearchRequest = {
          query,
          facts: [],
          memories: [],
          notes: [],
        };

        for (const contact of contacts) {
          const details = await contactService.getById(contact.id);
          if (!details) continue;

          const contactName = details.lastName
            ? `${details.firstName} ${details.lastName}`
            : details.firstName;

          for (const fact of details.facts) {
            searchRequest.facts.push({
              id: fact.id,
              contactId: contact.id,
              contactName,
              factType: fact.factType as FactType,
              factKey: fact.factKey,
              factValue: fact.factValue,
            });
          }

          for (const memory of details.memories) {
            searchRequest.memories.push({
              id: memory.id,
              contactId: contact.id,
              contactName,
              description: memory.description,
              eventDate: memory.eventDate,
            });
          }

          for (const note of details.notes) {
            if (note.transcription) {
              searchRequest.notes.push({
                id: note.id,
                contactId: contact.id,
                contactName,
                transcription: note.transcription,
              });
            }
          }
        }

        const searchResults = await searchService.semanticSearch(searchRequest);
        setResults(searchResults);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors de la recherche');
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [contacts]
  );

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return {
    results,
    isLoading,
    error,
    search,
    clearResults,
  };
};
