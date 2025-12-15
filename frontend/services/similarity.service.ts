import * as Crypto from 'expo-crypto';
import { getDatabase } from '@/lib/db';
import { apiCall } from '@/lib/api';
import { FactType, SimilarityScore } from '@/types';

const CACHE_DURATION_DAYS = 7;

type SimilarityCacheRow = {
  id: string;
  fact_value_1: string;
  fact_value_2: string;
  fact_type: string;
  similarity_score: number;
  created_at: string;
  expires_at: string;
};

type BatchSimilarityResponse = {
  success: boolean;
  similarities: Array<{
    value1: string;
    value2: string;
    factType: string;
    score: number;
  }>;
};

export const similarityService = {
  getCachedSimilarities: async (): Promise<SimilarityScore[]> => {
    const db = await getDatabase();
    const now = new Date().toISOString();

    const rows = await db.getAllAsync<SimilarityCacheRow>(
      'SELECT * FROM similarity_cache WHERE expires_at > ?',
      [now]
    );

    return rows.map((row) => ({
      factValue1: row.fact_value_1,
      factValue2: row.fact_value_2,
      factType: row.fact_type as FactType,
      score: row.similarity_score,
    }));
  },

  isCacheValid: async (): Promise<boolean> => {
    const db = await getDatabase();
    const now = new Date().toISOString();

    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM similarity_cache WHERE expires_at > ?',
      [now]
    );

    return (result?.count ?? 0) > 0;
  },

  clearExpiredCache: async (): Promise<void> => {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync('DELETE FROM similarity_cache WHERE expires_at <= ?', [now]);
  },

  clearAllCache: async (): Promise<void> => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM similarity_cache');
  },

  saveSimilaritiesToCache: async (similarities: SimilarityScore[]): Promise<void> => {
    const db = await getDatabase();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + CACHE_DURATION_DAYS * 24 * 60 * 60 * 1000);

    for (const similarity of similarities) {
      const id = Crypto.randomUUID();
      await db.runAsync(
        `INSERT OR REPLACE INTO similarity_cache
         (id, fact_value_1, fact_value_2, fact_type, similarity_score, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          similarity.factValue1.toLowerCase().trim(),
          similarity.factValue2.toLowerCase().trim(),
          similarity.factType,
          similarity.score,
          now.toISOString(),
          expiresAt.toISOString(),
        ]
      );
    }
  },

  getSimilarityScore: async (
    factType: FactType,
    value1: string,
    value2: string
  ): Promise<number | null> => {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const normalizedV1 = value1.toLowerCase().trim();
    const normalizedV2 = value2.toLowerCase().trim();

    // Check exact match first
    if (normalizedV1 === normalizedV2) {
      return 1.0;
    }

    // Check cache (both directions)
    const row = await db.getFirstAsync<{ similarity_score: number }>(
      `SELECT similarity_score FROM similarity_cache
       WHERE fact_type = ?
       AND ((fact_value_1 = ? AND fact_value_2 = ?) OR (fact_value_1 = ? AND fact_value_2 = ?))
       AND expires_at > ?`,
      [factType, normalizedV1, normalizedV2, normalizedV2, normalizedV1, now]
    );

    return row?.similarity_score ?? null;
  },

  calculateSimilarities: async (
    facts: Array<{ factType: FactType; factValue: string }>
  ): Promise<SimilarityScore[]> => {
    if (facts.length === 0) {
      return [];
    }

    // First, check what we already have in cache
    const cachedSimilarities = await similarityService.getCachedSimilarities();
    const cachedPairs = new Set(
      cachedSimilarities.map(
        (similarity) => `${similarity.factType}:${similarity.factValue1}:${similarity.factValue2}`
      )
    );

    // Group facts by type
    const factsByType: Record<string, Set<string>> = {};
    for (const fact of facts) {
      if (!factsByType[fact.factType]) {
        factsByType[fact.factType] = new Set();
      }
      factsByType[fact.factType].add(fact.factValue.toLowerCase().trim());
    }

    // Find pairs that need calculation
    const factsToCalculate: Array<{ factType: string; factValue: string }> = [];
    for (const [factType, values] of Object.entries(factsByType)) {
      const valueArray = Array.from(values);
      if (valueArray.length < 2) continue;

      for (let firstIndex = 0; firstIndex < valueArray.length; firstIndex++) {
        for (let secondIndex = firstIndex + 1; secondIndex < valueArray.length; secondIndex++) {
          const pairKey1 = `${factType}:${valueArray[firstIndex]}:${valueArray[secondIndex]}`;
          const pairKey2 = `${factType}:${valueArray[secondIndex]}:${valueArray[firstIndex]}`;

          if (!cachedPairs.has(pairKey1) && !cachedPairs.has(pairKey2)) {
            // Need to calculate this pair - add both values to the request
            if (!factsToCalculate.some((f) => f.factType === factType && f.factValue === valueArray[firstIndex])) {
              factsToCalculate.push({ factType, factValue: valueArray[firstIndex] });
            }
            if (!factsToCalculate.some((f) => f.factType === factType && f.factValue === valueArray[secondIndex])) {
              factsToCalculate.push({ factType, factValue: valueArray[secondIndex] });
            }
          }
        }
      }
    }

    // If nothing new to calculate, return cached
    if (factsToCalculate.length < 2) {
      return cachedSimilarities;
    }

    // Call API for new similarities
    const response = await apiCall<BatchSimilarityResponse>('/api/similarity/batch', {
      method: 'POST',
      body: { facts: factsToCalculate },
    });

    if (!response.success || !response.similarities) {
      return cachedSimilarities;
    }

    // Convert and save new similarities
    const newSimilarities: SimilarityScore[] = response.similarities.map((similarity) => ({
      factValue1: similarity.value1,
      factValue2: similarity.value2,
      factType: similarity.factType as FactType,
      score: similarity.score,
    }));

    await similarityService.saveSimilaritiesToCache(newSimilarities);

    // Return combined results
    return [...cachedSimilarities, ...newSimilarities];
  },

  forceRecalculate: async (
    facts: Array<{ factType: FactType; factValue: string }>
  ): Promise<SimilarityScore[]> => {
    await similarityService.clearAllCache();
    return similarityService.calculateSimilarities(facts);
  },
};
