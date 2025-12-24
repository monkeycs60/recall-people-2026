# Design: Profile Tab & Internationalization

**Date:** 2025-12-24
**Status:** Approved

## Overview

Add a Profile tab to the bottom navigation with user settings, and implement full internationalization (i18n) supporting 5 languages. The language setting controls both the app UI and AI services (Deepgram transcription, Grok extraction).

## Decisions

| Aspect | Decision |
|--------|----------|
| Profile layout | Scrollable sections with cards |
| Sections | Account (no avatar), Language, Data, About, Logout |
| Languages | FR, EN, ES, IT, DE |
| Detection | Auto (device) + fallback EN + manual override |
| i18n library | i18next + react-i18next + expo-localization |
| Language storage | Zustand local + backend sync (hybrid) |
| Backend | `preferredLanguage` on User + PATCH endpoint |
| Deepgram | Dynamic language passed as parameter |
| Grok | Prompts with explicit output language instructions |

## Architecture

### Language Detection Flow

```
App Start
└─> Load settingsStore (local)
    ├─> Saved language exists → Use it
    └─> No saved language
        └─> expo-localization.getLocales()
            ├─> Device lang supported (fr/en/es/it/de) → Use it
            └─> Not supported → Fallback to 'en'
```

### Hybrid Storage Flow

```
┌─────────────────────────────────────────────────────────┐
│  APP START                                              │
│  └─> settingsStore (local) → immediate language        │
├─────────────────────────────────────────────────────────┤
│  AFTER LOGIN                                            │
│  └─> Fetch user profile → sync local with backend      │
├─────────────────────────────────────────────────────────┤
│  CHANGE IN PROFILE                                      │
│  └─> Update local + PATCH backend /api/user/settings   │
└─────────────────────────────────────────────────────────┘
```

## File Structure

### Frontend (New Files)

```
frontend/
├── app/(tabs)/profile.tsx          # Profile page
├── components/profile/
│   ├── ProfileHeader.tsx           # Header with name/email
│   ├── SettingsSection.tsx         # Settings group
│   ├── SettingsRow.tsx             # Clickable row
│   └── LanguagePicker.tsx          # Language selection modal
├── stores/settingsStore.ts         # Preferences (language)
├── locales/
│   ├── fr.json                     # French (source)
│   ├── en.json                     # English
│   ├── es.json                     # Spanish
│   ├── it.json                     # Italian
│   └── de.json                     # German
└── lib/i18n.ts                     # i18next configuration
```

### Backend (Modifications)

```
backend/
├── src/routes/settings.ts          # NEW: PATCH /api/user/settings
├── src/routes/transcribe.ts        # MOD: Accept language param
├── src/routes/extract.ts           # MOD: Language output instructions
├── src/routes/summary.ts           # MOD: Language output instructions
├── src/routes/search.ts            # MOD: Language for explanations
└── prisma/schema.prisma            # MOD: + preferredLanguage on User
```

## UI Design

```
┌─────────────────────────────────────────┐
│  ← Profil                    (header)   │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  Jean Dupont                    │    │
│  │  jean@email.com                 │    │
│  │  Connecté via Google      ✓     │    │
│  └─────────────────────────────────┘    │
│                                         │
│  LANGUE                                 │
│  ┌─────────────────────────────────┐    │
│  │  🌐 Langue de l'app        FR ▶ │    │
│  │     (App + transcription IA)    │    │
│  └─────────────────────────────────┘    │
│                                         │
│  DONNÉES                                │
│  ┌─────────────────────────────────┐    │
│  │  📊 Statistiques            ▶   │    │
│  │  📤 Exporter mes données    ▶   │    │
│  │  🗑️ Vider le cache              │    │
│  └─────────────────────────────────┘    │
│                                         │
│  À PROPOS                               │
│  ┌─────────────────────────────────┐    │
│  │  📱 Version              1.0.0  │    │
│  │  💬 Donner un feedback      ▶   │    │
│  │  📄 Mentions légales        ▶   │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  🚪 Se déconnecter              │    │
│  └─────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

## Technical Details

### Dependencies to Add

```json
{
  "i18next": "^24.x",
  "react-i18next": "^15.x",
  "expo-localization": "~16.x"
}
```

### settingsStore (Zustand)

```typescript
interface SettingsState {
  language: 'fr' | 'en' | 'es' | 'it' | 'de';
  setLanguage: (lang: Language) => void;
}
// Persisted via zustand/middleware + AsyncStorage
```

### Prisma Schema Update

```prisma
model User {
  // ... existing fields
  preferredLanguage String @default("fr")
}
```

### Grok Language Instructions

```typescript
const languageInstructions = {
  fr: 'Réponds en français uniquement.',
  en: 'Respond in English only.',
  es: 'Responde solo en español.',
  it: 'Rispondi solo in italiano.',
  de: 'Antworte nur auf Deutsch.',
};

// Added to all prompts
const systemPrompt = `
${basePrompt}

IMPORTANT: The transcription is in ${language}.
You MUST respond in ${language} for all extracted content:
- noteTitle: in ${language}
- facts.value: in ${language}
- hotTopics.title/details: in ${language}
- memories.title/description: in ${language}
- note.summary/keyPoints: in ${language}

${languageInstructions[language]}
`;
```

## Implementation Phases

### Phase 1: i18n Foundations
1. Install dependencies (i18next, react-i18next, expo-localization)
2. Create `lib/i18n.ts` + `settingsStore.ts`
3. Create `locales/*.json` files (FR complete, others empty initially)
4. Wrap app with `I18nextProvider`

### Phase 2: Profile Page
1. Add Profile tab in `(tabs)/_layout.tsx`
2. Create `profile.tsx` with sections
3. Create components (`ProfileHeader`, `SettingsSection`, `SettingsRow`)
4. Implement `LanguagePicker` with language switching

### Phase 3: Backend Sync
1. Add `preferredLanguage` to Prisma schema + migration
2. Create route `PATCH /api/user/settings`
3. Modify `/api/transcribe` to accept dynamic language
4. Modify `/api/extract`, `/api/summary`, `/api/search` with language instructions
5. Sync language on login/logout

### Phase 4: Translations
1. Extract all hardcoded FR strings
2. Migrate to `t('key')` everywhere
3. Translate to EN, ES, IT, DE
