// ============================================
// Enums et types de base
// ============================================

export type FactType =
  | 'work'        // Métier
  | 'company'     // Entreprise
  | 'education'   // Formation
  | 'location'    // Lieu de vie
  | 'origin'      // Origine / Nationalité
  | 'partner'     // Conjoint
  | 'children'    // Enfants
  | 'hobby'       // Loisirs
  | 'sport'       // Sports
  | 'language'    // Langues parlées
  | 'pet'         // Animaux
  | 'birthday'    // Anniversaire
  | 'how_met'     // Comment connu
  | 'where_met'   // Lieu de rencontre
  | 'shared_ref'  // Références communes
  | 'trait'       // Signe distinctif
  | 'gift_idea'   // Idées cadeaux
  | 'gift_given'  // Cadeaux faits
  | 'contact'     // Téléphone, email
  | 'relationship'// Relations familiales (legacy)
  | 'other';

export type FactAction = 'add' | 'update';

export type PendingFactStatus = 'pending' | 'applied' | 'rejected';

export type RecordingState = 'idle' | 'recording' | 'processing' | 'reviewing';

export type Confidence = 'high' | 'medium' | 'low';

export type HotTopicStatus = 'active' | 'resolved';

// ============================================
// Entités principales
// ============================================

export type Contact = {
  id: string;
  firstName: string;
  lastName?: string;
  nickname?: string;
  photoUri?: string;
  highlights: string[];
  aiSummary?: string;
  iceBreakers?: string[];
  lastContactAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type Fact = {
  id: string;
  contactId: string;
  factType: FactType;
  factKey: string;
  factValue: string;
  previousValues: string[];
  sourceNoteId?: string;
  createdAt: string;
  updatedAt: string;
};

export type Note = {
  id: string;
  contactId: string;
  title?: string;
  audioUri?: string;
  audioDurationMs?: number;
  transcription?: string;
  summary?: string;
  createdAt: string;
};

export type PendingFact = {
  id: string;
  noteId: string;
  contactId: string;
  factType: FactType;
  factKey: string;
  factValue: string;
  action: FactAction;
  previousValue?: string;
  status: PendingFactStatus;
  createdAt: string;
};

export type HotTopic = {
  id: string;
  contactId: string;
  title: string;
  context?: string;
  resolution?: string;
  status: HotTopicStatus;
  sourceNoteId?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
};

export type Memory = {
  id: string;
  contactId: string;
  description: string;
  eventDate?: string;
  isShared: boolean;
  sourceNoteId?: string;
  createdAt: string;
};

export type Group = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

// ============================================
// Résultats d'extraction IA
// ============================================

export type ExtractedFact = {
  factType: FactType;
  factKey: string;
  factValue: string;
  action: FactAction;
  previousValue?: string;
};

export type ExtractedHotTopic = {
  title: string;
  context: string;
  resolvesExisting?: string;
};

export type ResolvedTopic = {
  id: string;
  resolution: string;
};

export type ExtractedMemory = {
  description: string;
  eventDate?: string;
  isShared: boolean;
};

export type SuggestedGroup = {
  name: string;
  isNew: boolean;
  existingId?: string;
  sourceFactType: FactType;
};

export type ExtractionResult = {
  contactIdentified: {
    id: string | null;
    firstName: string;
    lastName?: string;
    confidence: Confidence;
    needsDisambiguation: boolean;
    suggestedMatches?: string[];
    suggestedNickname?: string;
  };
  noteTitle: string;
  facts: ExtractedFact[];
  hotTopics: ExtractedHotTopic[];
  resolvedTopics: ResolvedTopic[];
  memories: ExtractedMemory[];
  suggestedGroups?: SuggestedGroup[];
  note: {
    summary: string;
    keyPoints: string[];
  };
};

// ============================================
// Pour les écrans
// ============================================

export type ContactWithDetails = Contact & {
  facts: Fact[];
  notes: Note[];
  hotTopics: HotTopic[];
  memories: Memory[];
};

export type ContactWithGroups = Contact & {
  groups: Group[];
};

export type DisambiguationOption = {
  contact: Contact;
  isNew: boolean;
};

export type SearchResult = {
  contactId: string;
  contact: Contact;
  matchedNote?: Note;
  matchedFact?: Fact;
  relevanceScore: number;
  highlightedText: string;
};

// ============================================
// Navigation params
// ============================================

export type ReviewScreenParams = {
  contactId: string;
  audioUri: string;
  transcription: string;
  extraction: ExtractionResult;
};

export type DisambiguationScreenParams = {
  audioUri: string;
  transcription: string;
  extraction: ExtractionResult;
  possibleContacts: Contact[];
};

export type ContactDetailParams = {
  id: string;
};

// ============================================
// Semantic Search
// ============================================

export type SearchSourceType = 'fact' | 'memory' | 'note';

export type SemanticSearchResult = {
  contactId: string;
  contactName: string;
  answer: string;
  reference: string;
  sourceType: SearchSourceType;
  sourceId: string;
  relevanceScore: number;
};

export type SearchRequest = {
  query: string;
  facts: Array<{
    id: string;
    contactId: string;
    contactName: string;
    factType: FactType;
    factKey: string;
    factValue: string;
  }>;
  memories: Array<{
    id: string;
    contactId: string;
    contactName: string;
    description: string;
    eventDate?: string;
  }>;
  notes: Array<{
    id: string;
    contactId: string;
    contactName: string;
    transcription: string;
  }>;
};

export type SearchResponse = {
  results: SemanticSearchResult[];
  processingTimeMs: number;
};

// ============================================
// Network / Clusters (Réseau)
// ============================================

export type SimilarityScore = {
  factValue1: string;
  factValue2: string;
  factType: FactType;
  score: number;
};

export type Cluster = {
  id: string;
  factType: FactType;
  label: string;
  contacts: Contact[];
  color: string;
  emoji: string;
};

export type ClusterData = {
  clusters: Cluster[];
  unconnected: Contact[];
};

export * from './i18n';
