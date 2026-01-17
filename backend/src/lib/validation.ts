/**
 * Common validation schemas for API endpoints
 */

import { z } from 'zod';

// Language enum used across multiple endpoints
export const languageSchema = z.enum(['fr', 'en', 'es', 'it', 'de']);

// Contact schema
export const contactSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional(),
});

// Fact schema
export const factSchema = z.object({
  factType: z.string().min(1, 'Fact type is required'),
  factKey: z.string().min(1, 'Fact key is required'),
  factValue: z.string().min(1, 'Fact value is required'),
});

// Hot topic schema
export const hotTopicSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  context: z.string(),
  status: z.string(),
  eventDate: z.string().nullable().optional(),
  resolution: z.string().nullable().optional(),
  resolvedAt: z.string().nullable().optional(),
});

// Note schema
export const noteSchema = z.object({
  title: z.string(),
  transcription: z.string().min(1, 'Transcription is required'),
  createdAt: z.string(),
});

// Summary request schema
export const summaryRequestSchema = z.object({
  contact: contactSchema,
  facts: z.array(factSchema),
  hotTopics: z.array(hotTopicSchema),
  language: languageSchema.optional(),
});

// Ice breakers request schema
export const iceBreakersRequestSchema = z.object({
  contact: contactSchema,
  facts: z.array(factSchema),
  hotTopics: z.array(hotTopicSchema),
  recentNotes: z.array(noteSchema).optional(),
  language: languageSchema.optional(),
});

// Search request schema
export const searchRequestSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  facts: z.array(
    z.object({
      id: z.string(),
      contactId: z.string(),
      contactName: z.string(),
      factType: z.string(),
      factKey: z.string(),
      factValue: z.string(),
    })
  ),
  memories: z.array(
    z.object({
      id: z.string(),
      contactId: z.string(),
      contactName: z.string(),
      description: z.string(),
      eventDate: z.string().optional(),
    })
  ),
  notes: z.array(
    z.object({
      id: z.string(),
      contactId: z.string(),
      contactName: z.string(),
      transcription: z.string(),
    })
  ),
  language: languageSchema.optional(),
});

// Similarity request schema
export const similarityRequestSchema = z.object({
  facts: z.array(
    z.object({
      factType: z.string().min(1, 'Fact type is required'),
      factValue: z.string().min(1, 'Fact value is required'),
    })
  ).min(1, 'At least one fact is required'),
});
