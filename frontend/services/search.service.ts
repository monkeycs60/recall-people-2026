import { apiCall } from '@/lib/api';
import { SearchRequest, SearchResponse, SemanticSearchResult } from '@/types';

export const searchService = {
  semanticSearch: async (request: SearchRequest): Promise<SemanticSearchResult[]> => {
    if (!request.query.trim()) {
      return [];
    }

    const hasData =
      request.facts.length > 0 ||
      request.memories.length > 0 ||
      request.notes.length > 0;

    if (!hasData) {
      return [];
    }

    const response = await apiCall<SearchResponse>('/api/search', {
      method: 'POST',
      body: request,
    });

    return response.results;
  },
};
