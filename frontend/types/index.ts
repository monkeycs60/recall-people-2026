// ============================================
// Enums et types de base
// ============================================

export type Tag = 'client' | 'prospect' | 'ami' | 'famille' | 'collegue' | 'autre';

export type FactType =
  | 'work'        // Poste, métier, profession
  | 'company'     // Entreprise, société
  | 'hobby'       // Loisirs, passions
  | 'sport'       // Sports pratiqués
  | 'relationship'// Relations (fils, fille, frère, ami, collègue)
  | 'partner'     // Conjoint, compagnon, femme, mari
  | 'location'    // Ville, pays, adresse
  | 'education'   // École, diplôme, formation
  | 'birthday'    // Date d'anniversaire
  | 'contact'     // Téléphone, email
  | 'other';      // Autres infos importantes structurées

export type FactAction = 'add' | 'update';

export type PendingFactStatus = 'pending' | 'applied' | 'rejected';

export type RecordingState = 'idle' | 'recording' | 'processing' | 'reviewing';

export type Confidence = 'high' | 'medium' | 'low';

// ============================================
// Entités principales
// ============================================

export type Contact = {
  id: string;
  firstName: string;
  lastName?: string;
  nickname?: string;
  photoUri?: string;
  tags: Tag[];
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
  sourceNoteId?: string;
  createdAt: string;
  updatedAt: string;
};

export type Note = {
  id: string;
  contactId: string;
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

export type ExtractionResult = {
  contactIdentified: {
    id: string | null;
    firstName: string;
    lastName?: string;
    confidence: Confidence;
    needsDisambiguation: boolean;
    suggestedMatches?: string[];
  };
  facts: ExtractedFact[];
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
