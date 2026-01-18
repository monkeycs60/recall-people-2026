// ============================================
// Enums et types de base
// ============================================

export type RecordingState = 'idle' | 'recording' | 'processing' | 'reviewing';

export type ProcessingStep = 'transcribing' | 'detecting' | 'extracting' | null;

export type Confidence = 'high' | 'medium' | 'low';

export type HotTopicStatus = 'active' | 'resolved';

export type Gender = 'male' | 'female' | 'unknown';

export type RelationshipType = 'ami' | 'collegue' | 'famille' | 'connaissance';

// ============================================
// DEPRECATED TYPES (V1 - Will be removed)
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

// ============================================
// Entités principales (V2)
// ============================================

export type Contact = {
  id: string;
  firstName: string;
  lastName?: string;
  nickname?: string;
  gender?: Gender;

  // Contact info
  phone?: string;
  email?: string;
  birthdayDay?: number;
  birthdayMonth?: number;
  birthdayYear?: number;

  // Relationship
  relationshipType?: RelationshipType;

  // Avatar
  photoUri?: string;
  avatarUrl?: string;

  // AI-generated (regenerated after each note)
  aiSummary?: string;
  suggestedQuestions?: string[]; // JSON array of max 3 questions
  highlights?: string[]; // JSON array of key highlights

  // Meta
  lastContactAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type Note = {
  id: string;
  contactId: string;

  // Content
  title?: string; // 2-4 words, AI-generated
  transcription: string; // EDITABLE by user

  // Audio (optional)
  audioUri?: string;
  audioDurationMs?: number;

  // Meta
  createdAt: string;
  updatedAt: string;
};

export type HotTopic = {
  id: string;
  contactId: string;

  // Content
  title: string; // Short: "Google Interview", "Lyon Move"
  context?: string; // 1-2 sentences of context

  // Event date (optional, for reminders)
  eventDate?: string; // ISO format: 2026-01-25

  // Status
  status: HotTopicStatus; // active, resolved
  resolution?: string; // What happened (when resolved)
  resolvedAt?: string;

  // Meta
  sourceNoteId?: string;
  createdAt: string;
  updatedAt: string;

  // Legacy fields for birthday events
  notifiedAt?: string;
  birthdayContactId?: string;
};

export type Group = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

// ============================================
// DEPRECATED ENTITIES (V1 - Will be removed)
// ============================================

/** @deprecated V1 - Facts are replaced by free-form notes in V2 */
export type Fact = {
  id: string;
  contactId: string;
  factType: FactType;
  factKey: string;
  factValue: string;
  title?: string;
  previousValues: string[];
  sourceNoteId?: string;
  createdAt: string;
  updatedAt: string;
};

/** @deprecated V1 - PendingFacts are no longer used in V2 */
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

/** @deprecated V1 - Memories are replaced by notes in V2 */
export type Memory = {
  id: string;
  contactId: string;
  description: string;
  eventDate?: string;
  isShared: boolean;
  sourceNoteId?: string;
  createdAt: string;
};

// ============================================
// Résultats d'extraction IA (V2)
// ============================================

export type ExtractedHotTopic = {
  title: string; // Short title (3-5 words)
  context: string; // 1-2 sentences with important details
  eventDate?: string; // ISO format: YYYY-MM-DD or null
};

export type ResolvedTopic = {
  existingTopicId: string;
  id: string; // Alias for existingTopicId (used in review.tsx)
  resolution: string; // Concrete description of what happened
};

export type ExtractedContactInfo = {
  phone?: string;
  email?: string;
  birthday?: {
    day: number;
    month: number;
    year?: number;
  };
};

export type AvatarHints = {
  physical: string | null;
  personality: string | null;
  interest: string | null;
  context: string | null;
};

export type ExtractedHotTopicV1 = ExtractedHotTopic & {
  suggestedDate?: string; // V1 compatibility: date in DD/MM/YYYY format
};

export type ExtractionResult = {
  contactIdentified: {
    id: string | null;
    firstName: string;
    lastName?: string;
    gender?: Gender;
    confidence: Confidence;
    needsDisambiguation: boolean;
    suggestedMatches?: string[];
    suggestedNickname?: string;
    avatarHints?: AvatarHints | null;
  };
  noteTitle: string; // 2-4 words summarizing the note
  contactInfo?: ExtractedContactInfo;
  // V2 property name (matches backend)
  newHotTopics: ExtractedHotTopic[];
  // V1 compatibility - backend returns this name
  hotTopics?: ExtractedHotTopicV1[];
  resolvedTopics: ResolvedTopic[];
  // V1 compatibility properties (deprecated but used by review.tsx)
  facts?: ExtractedFact[];
  memories?: ExtractedMemory[];
  suggestedGroups?: SuggestedGroup[];
  note?: {
    summary?: string;
  };
};

// ============================================
// DEPRECATED EXTRACTION TYPES (V1)
// ============================================

/** @deprecated V1 - Facts extraction is no longer used in V2 */
export type ExtractedFact = {
  factType: FactType;
  factKey: string;
  factValue: string;
  title?: string;
  action: FactAction;
  previousValue?: string;
};

/** @deprecated V1 - Memories extraction is no longer used in V2 */
export type ExtractedMemory = {
  description: string;
  eventDate?: string;
  isShared: boolean;
};

/** @deprecated V1 - Group suggestions are no longer used in V2 */
export type SuggestedGroup = {
  name: string;
  isNew: boolean;
  existingId?: string;
  sourceFactType?: FactType;
};

// ============================================
// Pour les écrans (V2)
// ============================================

export type ContactWithDetails = Contact & {
  notes: Note[];
  hotTopics: HotTopic[];
  facts: Fact[];
  memories: Memory[];
};

export type ContactWithGroups = Contact & {
  groups: Group[];
};

/** @deprecated V1 - Use ContactWithDetails instead */
export type ContactWithDetailsV1 = Contact & {
  facts: Fact[];
  notes: Note[];
  hotTopics: HotTopic[];
  memories: Memory[];
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
