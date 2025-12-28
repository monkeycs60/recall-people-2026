# E2E Testing Strategy

Strategy for end-to-end testing of the Recall People mobile app using Maestro.

## Overview

### Why Maestro?

- **Simple setup**: No native configuration required, works with Expo
- **YAML-based**: Readable test flows
- **Real device/emulator**: Tests actual user experience
- **API calls supported**: Can execute JS scripts for setup/teardown

### What We Test

```
┌──────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Audio fixture    │ ──▶ │ /api/transcribe │ ──▶ │ /api/extract    │
│ (.m4a file)      │     │ (real Deepgram) │     │ (real XAI)      │
└──────────────────┘     └─────────────────┘     └─────────────────┘
         │                                                │
         └────────────────────────────────────────────────┘
                    Full E2E with real backend
```

| Layer | Tested | How |
|-------|--------|-----|
| Recording UI | ✅ | Simulated via fixture |
| Audio upload | ✅ | Real file sent to API |
| Transcription | ✅ | Real Deepgram/Groq |
| Extraction | ✅ | Real XAI/Cerebras |
| Contact detection | ✅ | Real LLM |
| Review screen | ✅ | UI assertions |
| SQLite persistence | ✅ | Data verification |

---

## Setup

### 1. Install Maestro

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

### 2. Project Structure

```
frontend/
├── assets/
│   └── fixtures/
│       ├── test-meeting-fr.m4a    # French: "J'ai vu Marie, elle travaille chez Google"
│       └── test-meeting-en.m4a    # English: "I met John, he's moving to Berlin"
├── maestro/
│   ├── flows/
│   │   ├── recording-flow.yaml
│   │   ├── contact-creation.yaml
│   │   └── fact-update.yaml
│   └── config.yaml
├── lib/
│   ├── db.ts                      # Modified for E2E support
│   └── e2e-seed.ts                # Test data seeding
└── hooks/
    └── useRecording.ts            # Modified for E2E support
```

---

## Code Modifications

### 1. Database (lib/db.ts)

Add E2E mode support with isolated test database and automatic reset:

```typescript
import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';

const isE2ETest = process.env.EXPO_PUBLIC_E2E_TEST === 'true';

let db: SQLite.SQLiteDatabase | null = null;

const getDbName = () => isE2ETest ? 'recall_people_test.db' : 'recall_people.db';

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (!db) {
    const dbName = getDbName();

    // In E2E mode, reset database on each app launch
    if (isE2ETest) {
      await resetTestDatabase(dbName);
    }

    db = await SQLite.openDatabaseAsync(dbName);
    await db.execAsync('PRAGMA journal_mode = WAL');
    await db.execAsync('PRAGMA foreign_keys = ON');
  }
  return db;
};

const resetTestDatabase = async (dbName: string) => {
  const dbPath = `${FileSystem.documentDirectory}SQLite/${dbName}`;
  const fileInfo = await FileSystem.getInfoAsync(dbPath);

  if (fileInfo.exists) {
    await FileSystem.deleteAsync(dbPath);
    console.log('[E2E] Test database reset');
  }
};

export const initDatabase = async () => {
  const database = await getDatabase();

  // ... existing table creation code ...

  // Seed test data in E2E mode
  if (isE2ETest) {
    await seedE2EData(database);
  }
};
```

### 2. E2E Seed Data (lib/e2e-seed.ts)

```typescript
import type { SQLiteDatabase } from 'expo-sqlite';

export const seedE2EData = async (db: SQLiteDatabase) => {
  console.log('[E2E] Seeding test data...');

  // Test contacts with known IDs for assertions
  await db.runAsync(`
    INSERT INTO contacts (id, first_name, last_name, created_at)
    VALUES
      ('e2e-marie-001', 'Marie', 'Dupont', datetime('now')),
      ('e2e-jean-001', 'Jean', 'Martin', datetime('now')),
      ('e2e-john-001', 'John', 'Smith', datetime('now'))
  `);

  // Existing facts for update scenarios
  await db.runAsync(`
    INSERT INTO facts (id, contact_id, fact_type, fact_key, fact_value, created_at)
    VALUES
      ('e2e-fact-001', 'e2e-marie-001', 'company', 'Entreprise', 'Startup XYZ', datetime('now')),
      ('e2e-fact-002', 'e2e-jean-001', 'location', 'Ville', 'Paris', datetime('now'))
  `);

  // Active hot topic for resolution scenario
  await db.runAsync(`
    INSERT INTO hot_topics (id, contact_id, title, context, status, created_at)
    VALUES
      ('e2e-topic-001', 'e2e-marie-001', 'Recherche emploi', 'Elle cherche un nouveau job', 'active', datetime('now'))
  `);

  console.log('[E2E] Test data seeded');
};
```

### 3. Recording Hook (hooks/useRecording.ts)

Add fixture injection for E2E mode:

```typescript
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';

const isE2ETest = process.env.EXPO_PUBLIC_E2E_TEST === 'true';

// Load fixture asset to local filesystem
const getE2EFixtureUri = async (): Promise<string> => {
  const asset = Asset.fromModule(require('@/assets/fixtures/test-meeting-fr.m4a'));
  await asset.downloadAsync();
  return asset.localUri!;
};

export const useRecording = () => {
  // ... existing code ...

  const stopRecording = async () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    try {
      setRecordingState('processing');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      let uri: string;

      if (isE2ETest) {
        // Use fixture instead of real recording
        uri = await getE2EFixtureUri();
        console.log('[E2E] Using fixture audio:', uri);
      } else {
        await audioRecorder.stop();
        uri = audioRecorder.uri!;
      }

      if (!uri) throw new Error('No audio URI');

      setCurrentAudioUri(uri);

      // ... rest of existing code (transcription, extraction, navigation) ...
    } catch (error) {
      // ... error handling ...
    }
  };

  // ... rest of hook ...
};
```

---

## Audio Fixtures

### Creating Test Fixtures

Record short audio files with predictable content for assertions:

| Fixture | Language | Content | Expected Extraction |
|---------|----------|---------|---------------------|
| `test-meeting-fr.m4a` | French | "J'ai vu Marie aujourd'hui, elle m'a dit qu'elle travaille chez Google maintenant" | Contact: Marie, Fact: company=Google |
| `test-meeting-en.m4a` | English | "I met John yesterday, he told me he's moving to Berlin next month" | Contact: John, Fact: location=Berlin |
| `test-update-fr.m4a` | French | "Marie a trouvé un job, elle est développeuse chez Meta" | Update: company=Meta, Resolve: job search topic |
| `test-new-contact-fr.m4a` | French | "J'ai rencontré Sophie, elle est médecin à Lyon" | New contact: Sophie, Facts: work=médecin, location=Lyon |

### Recording Tips

- Keep recordings **5-10 seconds** for fast tests
- Speak clearly with **minimal background noise**
- Use **specific names** that match seed data
- Include **actionable facts** (job, location, company)

---

## Maestro Flows

### 1. Basic Recording Flow (maestro/flows/recording-flow.yaml)

```yaml
appId: com.recallpeople.app
tags:
  - recording
  - smoke
---
- launchApp:
    clearState: true
    permissions:
      microphone: allow
    arguments:
      EXPO_PUBLIC_E2E_TEST: "true"

# Start recording
- tapOn: "Enregistrer"
- assertVisible: "Enregistrement..."
- extendedWaitUntil:
    visible: "Arrêter"
    timeout: 3000

# Stop and process
- tapOn: "Arrêter"
- assertVisible: "Traitement..."

# Wait for transcription + extraction
- extendedWaitUntil:
    visible: "Marie"
    timeout: 30000

# Verify extraction results
- assertVisible: "Google"
- assertVisible: "Entreprise"

# Save the note
- tapOn: "Enregistrer"
- assertVisible: "Note enregistrée"
```

### 2. Contact Update Flow (maestro/flows/fact-update.yaml)

```yaml
appId: com.recallpeople.app
tags:
  - facts
  - update
---
- launchApp:
    clearState: true
    permissions:
      microphone: allow
    arguments:
      EXPO_PUBLIC_E2E_TEST: "true"
      EXPO_PUBLIC_E2E_FIXTURE: "test-update-fr"

# Navigate to existing contact
- tapOn: "Marie Dupont"
- assertVisible: "Startup XYZ"  # Current company fact

# Record update
- tapOn: "Enregistrer une note"
- tapOn: "Arrêter"

# Wait for extraction
- extendedWaitUntil:
    visible: "Meta"
    timeout: 30000

# Verify update detected
- assertVisible: "Mise à jour"
- assertVisible: "Startup XYZ → Meta"

# Verify hot topic resolution
- assertVisible: "Résolu"
- assertVisible: "Recherche emploi"

# Save
- tapOn: "Enregistrer"
- assertVisible: "Meta"  # Updated fact
```

### 3. New Contact Creation (maestro/flows/contact-creation.yaml)

```yaml
appId: com.recallpeople.app
tags:
  - contacts
  - creation
---
- launchApp:
    clearState: true
    permissions:
      microphone: allow
    arguments:
      EXPO_PUBLIC_E2E_TEST: "true"
      EXPO_PUBLIC_E2E_FIXTURE: "test-new-contact-fr"

# Record about new person
- tapOn: "Enregistrer"
- tapOn: "Arrêter"

# Wait for extraction
- extendedWaitUntil:
    visible: "Nouveau contact"
    timeout: 30000

# Verify new contact detection
- assertVisible: "Sophie"
- assertVisible: "médecin"
- assertVisible: "Lyon"

# Create contact
- tapOn: "Créer le contact"
- tapOn: "Enregistrer"

# Verify contact created
- tapOn: "Contacts"
- assertVisible: "Sophie"
```

---

## Running Tests

### Local Development

```bash
# Start Expo dev server
cd frontend
EXPO_PUBLIC_E2E_TEST=true npx expo start

# Run single flow
maestro test maestro/flows/recording-flow.yaml

# Run all flows
maestro test maestro/flows/

# Run with tags
maestro test maestro/flows/ --include-tags=smoke
```

### Debug Mode

```bash
# Interactive mode - step through flow
maestro test maestro/flows/recording-flow.yaml --debug

# Record new flow
maestro record
```

### CI/CD (GitHub Actions)

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:

jobs:
  e2e:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: |
          cd frontend
          npm ci

      - name: Install Maestro
        run: |
          curl -Ls "https://get.maestro.mobile.dev" | bash
          echo "$HOME/.maestro/bin" >> $GITHUB_PATH

      - name: Start iOS Simulator
        run: |
          xcrun simctl boot "iPhone 15"

      - name: Build Expo Dev Client
        run: |
          cd frontend
          npx expo prebuild --platform ios
          npx expo run:ios --configuration Release

      - name: Run E2E Tests
        env:
          EXPO_PUBLIC_E2E_TEST: "true"
        run: |
          cd frontend
          maestro test maestro/flows/ --format junit --output e2e-results.xml

      - name: Upload Results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: e2e-results
          path: frontend/e2e-results.xml
```

---

## Test Scenarios Matrix

| Scenario | Fixture | Seed Data | Assertions |
|----------|---------|-----------|------------|
| New recording | `test-meeting-fr` | Marie exists | Contact detected, fact extracted |
| Fact update | `test-update-fr` | Marie + company fact | Update detected, old→new shown |
| Hot topic resolution | `test-update-fr` | Marie + active topic | Topic marked resolved |
| New contact | `test-new-contact-fr` | None matching | New contact prompt shown |
| Disambiguation | `test-ambiguous-fr` | Marie D + Marie L | Disambiguation UI shown |
| AI search | - | Marie@Google, Jean@Paris | Search "Google" → Marie found |
| AI summary update | `test-update-fr` | Marie + existing summary | Summary changed after note |
| Profile facts | - | Marie + facts | Display, edit, delete facts |
| Profile hot topics | - | Marie + active topic | Display, manual resolution |

---

## Testing LLM-Generated Content

LLM outputs (summaries, ice breakers, search results) are non-deterministic. We can't assert exact content, but we can test behavior.

### Strategy: Delta Testing

Instead of testing exact content, test that **content changes** when it should.

### Required testIDs

Add these to your components for E2E assertions:

```typescript
// components/AiSummary.tsx
<Text testID="ai-summary">{summary}</Text>

// components/IceBreakers.tsx
<View testID="ice-breakers-container">
  {iceBreakers.map((ib, i) => (
    <Text key={i} testID={`ice-breaker-${i}`}>{ib}</Text>
  ))}
</View>

// components/SearchResults.tsx
<View testID="search-results">
  {results.map((r) => (
    <Text key={r.id} testID={`search-result-${r.id}`}>{r.name}</Text>
  ))}
</View>
```

### 4. AI Summary Update Flow (maestro/flows/summary-update.yaml)

Tests that adding a note regenerates the AI summary with different content.

```yaml
appId: com.recallpeople.app
tags:
  - ai
  - summary
  - delta
---
- launchApp:
    clearState: true
    permissions:
      microphone: allow
    arguments:
      EXPO_PUBLIC_E2E_TEST: "true"

# Navigate to Marie's profile (has existing summary from seed)
- tapOn: "Marie Dupont"
- extendedWaitUntil:
    visible:
      id: "ai-summary"
    timeout: 5000

# 1. Capture the old summary
- evalScript: |
    const summaryEl = document.querySelector('[data-testid="ai-summary"]');
    if (!summaryEl) throw new Error('Summary element not found');

    output.oldSummary = summaryEl.textContent;
    output.oldLength = summaryEl.textContent.length;
    console.log('[E2E] Old summary captured:', output.oldLength, 'chars');

# 2. Record a new note with new information
- tapOn:
    id: "record-note-button"
- extendedWaitUntil:
    visible: "Enregistrement..."
    timeout: 3000
- tapOn:
    id: "stop-recording-button"

# 3. Wait for processing and save
- extendedWaitUntil:
    visible: "Enregistrer"
    timeout: 30000
- tapOn: "Enregistrer"

# 4. Wait for summary regeneration
- extendedWaitUntil:
    notVisible:
      id: "summary-loading"
    timeout: 60000

# 5. Verify summary has changed
- evalScript: |
    const summaryEl = document.querySelector('[data-testid="ai-summary"]');
    if (!summaryEl) throw new Error('Summary element not found after update');

    const newSummary = summaryEl.textContent;
    const newLength = newSummary.length;

    console.log('[E2E] New summary:', newLength, 'chars');

    // Assertion 1: Summary is not empty and has minimum length
    if (newLength < 50) {
      throw new Error(`Summary too short: ${newLength} chars (min: 50)`);
    }

    // Assertion 2: Summary has changed
    if (newSummary === output.oldSummary) {
      throw new Error('Summary did not change after adding new note');
    }

    // Assertion 3: Summary contains contact name (basic relevance check)
    if (!newSummary.toLowerCase().includes('marie')) {
      throw new Error('Summary does not mention the contact name');
    }

    console.log('[E2E] ✓ Summary updated:', output.oldLength, '→', newLength, 'chars');
```

### 5. AI Search Flow (maestro/flows/ai-search.yaml)

Tests semantic search functionality.

```yaml
appId: com.recallpeople.app
tags:
  - ai
  - search
---
- launchApp:
    clearState: true
    arguments:
      EXPO_PUBLIC_E2E_TEST: "true"

# Go to contacts list
- tapOn: "Contacts"

# Type semantic search query
- tapOn:
    id: "search-input"
- inputText: "qui travaille dans la tech"

# Wait for AI search results
- extendedWaitUntil:
    visible:
      id: "search-results"
    timeout: 15000

# Verify Marie appears (she works at Startup XYZ from seed data)
- assertVisible: "Marie"

# Verify search understood the query (not just text matching)
- evalScript: |
    const results = document.querySelectorAll('[data-testid^="search-result-"]');
    if (results.length === 0) {
      throw new Error('No search results found');
    }
    console.log('[E2E] Found', results.length, 'search results');
```

### 6. Profile Screen Tests (maestro/flows/profile-tests.yaml)

```yaml
appId: com.recallpeople.app
tags:
  - profile
  - facts
---
- launchApp:
    clearState: true
    arguments:
      EXPO_PUBLIC_E2E_TEST: "true"

# Navigate to Marie's profile
- tapOn: "Marie Dupont"

# ===== FACTS SECTION =====
- assertVisible: "Startup XYZ"  # Seeded company fact

# Edit a fact
- longPressOn: "Startup XYZ"
- tapOn: "Modifier"
- clearInput:
    id: "fact-value-input"
- inputText: "Google"
- tapOn: "Enregistrer"
- assertVisible: "Google"
- assertNotVisible: "Startup XYZ"

# Delete a fact
- longPressOn: "Google"
- tapOn: "Supprimer"
- tapOn: "Confirmer"
- assertNotVisible: "Google"

# ===== HOT TOPICS SECTION =====
- scrollUntilVisible:
    element: "Recherche emploi"
    direction: DOWN

# Manually resolve hot topic
- tapOn: "Recherche emploi"
- tapOn: "Marquer comme résolu"
- inputText: "Elle a trouvé un poste chez Meta"
- tapOn: "Confirmer"
- assertVisible: "Résolu"

# ===== NOTES SECTION =====
- scrollUntilVisible:
    element: "Notes"
    direction: DOWN
- tapOn: "Notes"

# Verify notes list (empty initially, or with seeded note)
- assertVisible:
    id: "notes-list"
```

### Assertion Strategies for LLM Content

| What to Test | How | Example |
|--------------|-----|---------|
| Content exists | `assertVisible: { id: "ai-summary" }` | Summary container is rendered |
| Not empty | `evalScript` with length check | `text.length > 50` |
| Changed after action | Compare old vs new value | `newSummary !== oldSummary` |
| Contains expected entity | Fuzzy check in evalScript | `summary.includes('Marie')` |
| No error state | `assertNotVisible` | `assertNotVisible: "Erreur"` |
| Loading completed | `extendedWaitUntil: { notVisible }` | Wait for spinner to disappear |

### Seed Data for AI Tests

Update `lib/e2e-seed.ts` to include existing summary:

```typescript
export const seedE2EData = async (db: SQLiteDatabase) => {
  // Contact with existing AI summary for delta testing
  await db.runAsync(`
    INSERT INTO contacts (id, first_name, last_name, ai_summary, created_at)
    VALUES (
      'e2e-marie-001',
      'Marie',
      'Dupont',
      'Marie travaille dans une startup tech appelée Startup XYZ. Elle est actuellement en recherche d''un nouveau poste.',
      datetime('now')
    )
  `);

  // Facts for search testing
  await db.runAsync(`
    INSERT INTO facts (id, contact_id, fact_type, fact_key, fact_value, created_at)
    VALUES
      ('e2e-fact-001', 'e2e-marie-001', 'company', 'Entreprise', 'Startup XYZ', datetime('now')),
      ('e2e-fact-002', 'e2e-marie-001', 'work', 'Métier', 'Développeuse', datetime('now')),
      ('e2e-fact-003', 'e2e-jean-001', 'location', 'Ville', 'Paris', datetime('now'))
  `);

  // Hot topic for resolution testing
  await db.runAsync(`
    INSERT INTO hot_topics (id, contact_id, title, context, status, created_at)
    VALUES (
      'e2e-topic-001',
      'e2e-marie-001',
      'Recherche emploi',
      'Elle cherche un nouveau poste dans la tech',
      'active',
      datetime('now')
    )
  `);
};
```

---

## Troubleshooting

### Common Issues

**Test DB not resetting**
- Check `EXPO_PUBLIC_E2E_TEST` env var is set
- Verify `clearState: true` in Maestro flow

**Fixture not loading**
- Ensure file is in `assets/fixtures/`
- Check metro bundler includes `.m4a` files
- Verify `expo-asset` is properly configured

**Transcription timeout**
- Increase `extendedWaitUntil` timeout
- Check backend API is running
- Verify API keys are configured

**Flaky assertions**
- Use `extendedWaitUntil` instead of `assertVisible` for async content
- Add `waitForAnimationToEnd` after navigation
- Increase timeouts for LLM responses (can take 10-20s)

### Debug Commands

```bash
# Check Maestro connection
maestro doctor

# View app hierarchy
maestro hierarchy

# Screenshot current state
maestro screenshot
```

---

## Best Practices

1. **Isolate test data**: Always use `clearState: true` and E2E database
2. **Deterministic fixtures**: Use consistent audio content for predictable extractions
3. **Generous timeouts**: LLM calls can be slow, use 30s+ timeouts
4. **Tag flows**: Use tags for smoke/regression/full suites
5. **Fail fast**: Put critical assertions early in flows
6. **Clean seed data**: Use predictable IDs (`e2e-*`) for easy debugging
