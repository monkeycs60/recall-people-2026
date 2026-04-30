import type { Note } from '@/types';

export type MeetingContext = {
  context: string;
  sourceTitle?: string;
  source: 'structured' | 'legacy';
};

const MEETING_CONTEXT_PATTERNS = [
  /contexte de rencontre\s*:\s*([^.!?\n]{3,140})/i,
  /(?:rencontr[ée]?\s+(?:à|au|aux|chez|pendant|lors de|via|gr[aâ]ce à|par|en)\s+)([^.!?\n]{3,140})/i,
  /(?:on s['’]est rencontr[ée]s?\s+(?:à|au|aux|chez|pendant|lors de|via|gr[aâ]ce à|par|en)\s+)([^.!?\n]{3,140})/i,
  /(?:we\s+)?(?:met|meet)\s+(?:at|during|through|via|in|on)\s+([^.!?\n]{3,140})/i,
  /(?:nos conocimos|lo conocí|la conocí|conocí a [^.!?\n]{2,40})\s+(?:en|durante|a través de|por|via)\s+([^.!?\n]{3,140})/i,
  /(?:ci siamo conosciut[ie]|l'ho conosciut[ao]|conosciut[ao])\s+(?:a|al|alla|durante|tramite|via|attraverso)\s+([^.!?\n]{3,140})/i,
  /(?:kennengelernt|getroffen)\s+(?:bei|auf|in|über|durch|während)\s+([^.!?\n]{3,140})/i,
  /(?:bei|auf|in|über|durch|während)\s+([^.!?\n]{3,140})\s+(?:kennengelernt|getroffen)/i,
];

function cleanMeetingContext(value: string): string {
  const cleaned = value.trim().replace(/\s+/g, ' ').replace(/[,:;]+$/, '');
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function getLegacyMeetingContext(notes: Note[]): MeetingContext | null {
  const chronologicalNotes = notes
    .filter((note) => note.transcription.trim().length > 0)
    .slice()
    .sort((first, second) => new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime());

  for (const note of chronologicalNotes) {
    for (const pattern of MEETING_CONTEXT_PATTERNS) {
      const match = note.transcription.match(pattern);
      if (match?.[1]) {
        return {
          context: cleanMeetingContext(match[1]),
          sourceTitle: note.title,
          source: 'legacy',
        };
      }
    }
  }

  return null;
}

export function getMeetingContext(
  notes: Note[],
  structuredContext?: string | null
): MeetingContext | null {
  const cleanedStructuredContext = structuredContext?.trim();
  if (cleanedStructuredContext) {
    return {
      context: cleanedStructuredContext,
      source: 'structured',
    };
  }

  return getLegacyMeetingContext(notes);
}

export function shouldApplyExtractedMeetingContext(
  extractedContext?: string | null,
  existingContext?: string | null
): boolean {
  return Boolean(extractedContext?.trim()) && !existingContext?.trim();
}
