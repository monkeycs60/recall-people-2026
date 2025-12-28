# Contact Enhancements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add contact card (phone/email/birthday), improve "other" facts with title+description, and move delete to menu.

**Architecture:** Frontend-only changes for UI, plus SQLite schema migration for title field on facts. LLM extraction prompt updated for "other" facts.

**Tech Stack:** React Native, Expo SQLite, TypeScript, lucide-react-native icons

---

## Task 1: Add `title` column to facts table

**Files:**
- Modify: `frontend/lib/db.ts:153-258`

**Step 1: Add migration for title column**

In `runMigrations` function, add after line 219:

```typescript
  // Check if title column exists on facts (for "other" fact types)
  const hasFactTitle = factsInfo.some((col) => col.name === 'title');
  if (!hasFactTitle) {
    await database.execAsync("ALTER TABLE facts ADD COLUMN title TEXT");
  }
```

**Step 2: Verify migration**

Run the app and check that the facts table has the new column.

**Step 3: Commit**

```bash
git add frontend/lib/db.ts
git commit -m "feat(db): add title column to facts table for other fact types"
```

---

## Task 2: Update Fact type and service

**Files:**
- Modify: `frontend/types/index.ts:56-66`
- Modify: `frontend/services/fact.service.ts`

**Step 1: Update Fact type**

In `frontend/types/index.ts`, update the Fact type (around line 56):

```typescript
export type Fact = {
  id: string;
  contactId: string;
  factType: FactType;
  factKey: string;
  factValue: string;
  title?: string;  // Only used for factType 'other'
  previousValues: string[];
  sourceNoteId?: string;
  createdAt: string;
  updatedAt: string;
};
```

**Step 2: Update ExtractedFact type**

In `frontend/types/index.ts`, update ExtractedFact (around line 126):

```typescript
export type ExtractedFact = {
  factType: FactType;
  factKey: string;
  factValue: string;
  title?: string;  // Only for factType 'other'
  action: FactAction;
  previousValue?: string;
};
```

**Step 3: Update fact.service.ts getByContact**

In `frontend/services/fact.service.ts`, update the SELECT and mapping:

```typescript
  getByContact: async (contactId: string): Promise<Fact[]> => {
    const db = await getDatabase();
    const result = await db.getAllAsync<{
      id: string;
      contact_id: string;
      fact_type: string;
      fact_key: string;
      fact_value: string;
      title: string | null;
      previous_values: string | null;
      source_note_id: string | null;
      created_at: string;
      updated_at: string;
    }>('SELECT * FROM facts WHERE contact_id = ?', [contactId]);

    return result.map((row) => ({
      id: row.id,
      contactId: row.contact_id,
      factType: row.fact_type as FactType,
      factKey: row.fact_key,
      factValue: row.fact_value,
      title: row.title || undefined,
      previousValues: JSON.parse(row.previous_values || '[]'),
      sourceNoteId: row.source_note_id || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },
```

**Step 4: Update fact.service.ts create**

Update the create function to handle title:

```typescript
  create: async (data: {
    contactId: string;
    factType: FactType;
    factKey: string;
    factValue: string;
    title?: string;
    sourceNoteId?: string;
  }): Promise<Fact> => {
    const db = await getDatabase();
    const id = Crypto.randomUUID();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO facts (id, contact_id, fact_type, fact_key, fact_value, title, previous_values, source_note_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.contactId,
        data.factType,
        data.factKey,
        data.factValue,
        data.title || null,
        JSON.stringify([]),
        data.sourceNoteId || null,
        now,
        now,
      ]
    );

    return {
      id,
      contactId: data.contactId,
      factType: data.factType,
      factKey: data.factKey,
      factValue: data.factValue,
      title: data.title,
      previousValues: [],
      sourceNoteId: data.sourceNoteId,
      createdAt: now,
      updatedAt: now,
    };
  },
```

**Step 5: Update fact.service.ts update**

Update the update function to handle title:

```typescript
  update: async (id: string, data: { factKey?: string; factValue?: string; title?: string }): Promise<void> => {
    const db = await getDatabase();
    const updates: string[] = [];
    const values: (string | null)[] = [];

    if (data.factKey !== undefined) {
      updates.push('fact_key = ?');
      values.push(data.factKey);
    }
    if (data.factValue !== undefined) {
      updates.push('fact_value = ?');
      values.push(data.factValue);
    }
    if (data.title !== undefined) {
      updates.push('title = ?');
      values.push(data.title || null);
    }

    if (updates.length === 0) return;

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await db.runAsync(
      `UPDATE facts SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
  },
```

**Step 6: Commit**

```bash
git add frontend/types/index.ts frontend/services/fact.service.ts
git commit -m "feat(facts): add title field support for other fact types"
```

---

## Task 3: Update LLM extraction for "other" facts

**Files:**
- Modify: `backend/src/routes/extract.ts`

**Step 1: Update extraction schema**

In `backend/src/routes/extract.ts`, update the facts array schema (around line 58):

```typescript
  facts: z.array(
    z.object({
      factType: z.enum([
        'work', 'company', 'education', 'location', 'origin', 'partner',
        'children', 'hobby', 'sport', 'language', 'pet', 'birthday',
        'how_met', 'where_met', 'shared_ref', 'trait', 'gift_idea',
        'gift_given', 'contact', 'relationship', 'other',
      ]),
      factKey: z.string().describe('Label lisible en français'),
      factValue: z.string().describe('La valeur extraite (description pour type "other")'),
      title: z.string().nullable().describe('Titre court pour type "other" uniquement (ex: "Allergie", "Régime"). Null pour les autres types.'),
      action: z.enum(['add', 'update']),
      previousValue: z.string().nullable(),
    })
  ),
```

**Step 2: Update extraction prompt**

In `buildExtractionPrompt`, add after line 335 (after gift_given):

```typescript
   - contact: coordonnées (factKey="Contact")
   - other: information diverse (factKey="Autre", title=titre court obligatoire, factValue=description détaillée)
     IMPORTANT pour "other": title ET factValue sont OBLIGATOIRES
     Exemple: { factType: "other", title: "Allergie", factKey: "Autre", factValue: "Ne mange pas de fruits de mer, allergie sévère" }
```

**Step 3: Commit**

```bash
git add backend/src/routes/extract.ts
git commit -m "feat(extract): add title field for other fact types in LLM extraction"
```

---

## Task 4: Add translations

**Files:**
- Modify: `frontend/locales/fr.json`
- Modify: `frontend/locales/en.json`

**Step 1: Add French translations**

In `frontend/locales/fr.json`, add in the "contact" section:

```json
    "contactCard": {
      "phone": "Téléphone",
      "email": "Email",
      "birthday": "Anniversaire",
      "addPhone": "+ Ajouter téléphone",
      "addEmail": "+ Ajouter email",
      "addBirthday": "+ Ajouter anniversaire",
      "call": "Appeler",
      "whatsapp": "WhatsApp",
      "sms": "SMS",
      "copy": "Copier",
      "openMail": "Ouvrir mail",
      "copied": "Copié !",
      "inDays": "Dans {{count}} jour !",
      "inDays_other": "Dans {{count}} jours !",
      "years": "{{count}} an",
      "years_other": "{{count}} ans"
    },
    "menu": {
      "options": "Options",
      "delete": "Supprimer le contact"
    },
    "deleteDialog": {
      "title": "Supprimer ce contact ?",
      "message": "Cette action est irréversible. Toutes les notes, souvenirs et informations de {{name}} seront supprimés.",
      "cancel": "Annuler",
      "confirm": "Supprimer"
    },
    "otherFact": {
      "titleLabel": "Titre *",
      "titlePlaceholder": "Ex: Allergie, Régime...",
      "descriptionLabel": "Description *",
      "descriptionPlaceholder": "Détails..."
    },
```

**Step 2: Add English translations**

In `frontend/locales/en.json`, add equivalent translations.

**Step 3: Commit**

```bash
git add frontend/locales/fr.json frontend/locales/en.json
git commit -m "feat(i18n): add translations for contact card, menu and delete dialog"
```

---

## Task 5: Create ContactCard component

**Files:**
- Create: `frontend/components/contact/ContactCard.tsx`

**Step 1: Create the component**

```typescript
import { View, Text, Pressable, StyleSheet, Linking, Alert } from 'react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Phone, Mail, Cake, Plus, ChevronDown } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { Fact, FactType } from '@/types';
import { Colors } from '@/constants/theme';
import { toast } from 'sonner-native';

type ContactCardProps = {
  facts: Fact[];
  onAddFact: (factType: FactType) => void;
};

type ContactInfo = {
  phone?: string;
  email?: string;
  birthday?: string;
  birthdayFact?: Fact;
};

export function ContactCard({ facts, onAddFact }: ContactCardProps) {
  const { t } = useTranslation();
  const [phoneMenuOpen, setPhoneMenuOpen] = useState(false);
  const [emailMenuOpen, setEmailMenuOpen] = useState(false);

  const extractContactInfo = (): ContactInfo => {
    const contactFacts = facts.filter((fact) => fact.factType === 'contact');
    const birthdayFact = facts.find((fact) => fact.factType === 'birthday');

    let phone: string | undefined;
    let email: string | undefined;

    for (const fact of contactFacts) {
      const value = fact.factValue.toLowerCase();
      if (value.includes('@')) {
        email = fact.factValue;
      } else if (/[\d\s+()-]{6,}/.test(fact.factValue)) {
        phone = fact.factValue;
      }
    }

    return {
      phone,
      email,
      birthday: birthdayFact?.factValue,
      birthdayFact,
    };
  };

  const info = extractContactInfo();

  const formatBirthday = (dateString: string): { display: string; countdown?: string } => {
    const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
                    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

    // Try to parse date (formats: "15 mars", "15/03", "1990-03-15", "15 mars 1990")
    let day: number | null = null;
    let month: number | null = null;
    let year: number | null = null;

    // Format: "15 mars" or "15 mars 1990"
    const frenchMatch = dateString.match(/(\d{1,2})\s+(\w+)(?:\s+(\d{4}))?/i);
    if (frenchMatch) {
      day = parseInt(frenchMatch[1]);
      const monthName = frenchMatch[2].toLowerCase();
      month = months.findIndex((m) => m.startsWith(monthName));
      year = frenchMatch[3] ? parseInt(frenchMatch[3]) : null;
    }

    // Format: "15/03" or "15/03/1990"
    const slashMatch = dateString.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/);
    if (slashMatch) {
      day = parseInt(slashMatch[1]);
      month = parseInt(slashMatch[2]) - 1;
      year = slashMatch[3] ? parseInt(slashMatch[3]) : null;
    }

    // Format: "1990-03-15"
    const isoMatch = dateString.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      year = parseInt(isoMatch[1]);
      month = parseInt(isoMatch[2]) - 1;
      day = parseInt(isoMatch[3]);
    }

    if (day === null || month === null || month < 0) {
      return { display: dateString };
    }

    const displayDate = `${day} ${months[month]}`;
    let ageStr = '';
    let countdown: string | undefined;

    if (year) {
      const today = new Date();
      const thisYearBirthday = new Date(today.getFullYear(), month, day);
      let age = today.getFullYear() - year;
      if (today < thisYearBirthday) {
        age--;
      }
      ageStr = ` (${t('contact.contactCard.years', { count: age })})`;
    }

    // Calculate countdown
    const today = new Date();
    const thisYear = today.getFullYear();
    let nextBirthday = new Date(thisYear, month, day);
    if (nextBirthday < today) {
      nextBirthday = new Date(thisYear + 1, month, day);
    }
    const diffTime = nextBirthday.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 30 && diffDays > 0) {
      countdown = t('contact.contactCard.inDays', { count: diffDays });
    }

    return {
      display: `${displayDate}${ageStr}`,
      countdown,
    };
  };

  const handlePhoneAction = (action: 'call' | 'whatsapp' | 'sms' | 'copy') => {
    if (!info.phone) return;
    const cleanPhone = info.phone.replace(/\s/g, '');

    switch (action) {
      case 'call':
        Linking.openURL(`tel:${cleanPhone}`);
        break;
      case 'whatsapp':
        Linking.openURL(`whatsapp://send?phone=${cleanPhone.replace('+', '')}`);
        break;
      case 'sms':
        Linking.openURL(`sms:${cleanPhone}`);
        break;
      case 'copy':
        Clipboard.setStringAsync(info.phone);
        toast.success(t('contact.contactCard.copied'));
        break;
    }
    setPhoneMenuOpen(false);
  };

  const handleEmailAction = (action: 'open' | 'copy') => {
    if (!info.email) return;

    switch (action) {
      case 'open':
        Linking.openURL(`mailto:${info.email}`);
        break;
      case 'copy':
        Clipboard.setStringAsync(info.email);
        toast.success(t('contact.contactCard.copied'));
        break;
    }
    setEmailMenuOpen(false);
  };

  const birthdayInfo = info.birthday ? formatBirthday(info.birthday) : null;

  return (
    <View style={styles.container}>
      {/* Phone */}
      <View style={styles.row}>
        <Phone size={18} color={Colors.primary} />
        {info.phone ? (
          <View style={styles.valueContainer}>
            <Pressable
              style={styles.valueButton}
              onPress={() => setPhoneMenuOpen(!phoneMenuOpen)}
            >
              <Text style={styles.value}>{info.phone}</Text>
              <ChevronDown size={16} color={Colors.textSecondary} />
            </Pressable>
            {phoneMenuOpen && (
              <View style={styles.menu}>
                <Pressable style={styles.menuItem} onPress={() => handlePhoneAction('call')}>
                  <Text style={styles.menuItemText}>{t('contact.contactCard.call')}</Text>
                </Pressable>
                <Pressable style={styles.menuItem} onPress={() => handlePhoneAction('whatsapp')}>
                  <Text style={styles.menuItemText}>{t('contact.contactCard.whatsapp')}</Text>
                </Pressable>
                <Pressable style={styles.menuItem} onPress={() => handlePhoneAction('sms')}>
                  <Text style={styles.menuItemText}>{t('contact.contactCard.sms')}</Text>
                </Pressable>
                <Pressable style={styles.menuItem} onPress={() => handlePhoneAction('copy')}>
                  <Text style={styles.menuItemText}>{t('contact.contactCard.copy')}</Text>
                </Pressable>
              </View>
            )}
          </View>
        ) : (
          <Pressable style={styles.addButton} onPress={() => onAddFact('contact')}>
            <Text style={styles.addButtonText}>{t('contact.contactCard.addPhone')}</Text>
          </Pressable>
        )}
      </View>

      {/* Email */}
      <View style={styles.row}>
        <Mail size={18} color={Colors.primary} />
        {info.email ? (
          <View style={styles.valueContainer}>
            <Pressable
              style={styles.valueButton}
              onPress={() => setEmailMenuOpen(!emailMenuOpen)}
            >
              <Text style={styles.value}>{info.email}</Text>
              <ChevronDown size={16} color={Colors.textSecondary} />
            </Pressable>
            {emailMenuOpen && (
              <View style={styles.menu}>
                <Pressable style={styles.menuItem} onPress={() => handleEmailAction('open')}>
                  <Text style={styles.menuItemText}>{t('contact.contactCard.openMail')}</Text>
                </Pressable>
                <Pressable style={styles.menuItem} onPress={() => handleEmailAction('copy')}>
                  <Text style={styles.menuItemText}>{t('contact.contactCard.copy')}</Text>
                </Pressable>
              </View>
            )}
          </View>
        ) : (
          <Pressable style={styles.addButton} onPress={() => onAddFact('contact')}>
            <Text style={styles.addButtonText}>{t('contact.contactCard.addEmail')}</Text>
          </Pressable>
        )}
      </View>

      {/* Birthday */}
      <View style={styles.row}>
        <Cake size={18} color={Colors.primary} />
        {birthdayInfo ? (
          <View style={styles.birthdayContainer}>
            <Text style={styles.value}>{birthdayInfo.display}</Text>
            {birthdayInfo.countdown && (
              <Text style={styles.countdown}>{birthdayInfo.countdown} 🎂</Text>
            )}
          </View>
        ) : (
          <Pressable style={styles.addButton} onPress={() => onAddFact('birthday')}>
            <Text style={styles.addButtonText}>{t('contact.contactCard.addBirthday')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    gap: 12,
  },
  valueContainer: {
    flex: 1,
  },
  valueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  value: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  birthdayContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countdown: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  addButton: {
    flex: 1,
  },
  addButtonText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  menu: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  menuItemText: {
    fontSize: 15,
    color: Colors.textPrimary,
  },
});
```

**Step 2: Commit**

```bash
git add frontend/components/contact/ContactCard.tsx
git commit -m "feat(contact): create ContactCard component with phone/email/birthday"
```

---

## Task 6: Update ProfileCard to filter contact/birthday facts

**Files:**
- Modify: `frontend/components/contact/ProfileCard.tsx`

**Step 1: Add filter for contact card facts**

In `ProfileCard.tsx`, update the `validFacts` filtering (around line 54):

```typescript
  // Filter out facts shown in ContactCard (contact, birthday) and empty values
  const CONTACT_CARD_TYPES: FactType[] = ['contact', 'birthday'];
  const validFacts = facts.filter(
    (fact) => fact.factValue && fact.factValue.trim() !== '' && !CONTACT_CARD_TYPES.includes(fact.factType)
  );
```

**Step 2: Update renderCumulativeGroup for "other" facts with title**

Update the `renderCumulativeGroup` function to handle title for "other" facts:

```typescript
  const renderCumulativeGroup = (group: GroupedFacts) => {
    const hasHighlightedFact = group.facts.some((fact) => fact.id === highlightId);
    const isExpanded = expandedType === group.type || hasHighlightedFact;

    // For "other" type with titles, display differently
    if (group.type === 'other') {
      return (
        <View key={group.type} style={styles.otherSection}>
          {group.facts.map((fact) => (
            <View
              key={fact.id}
              style={[
                styles.otherCard,
                fact.id === highlightId && styles.factCardHighlighted,
              ]}
            >
              <Pressable
                style={styles.otherContent}
                onPress={() => onEditFact(fact)}
              >
                <View style={styles.factTextContainer}>
                  {fact.title && (
                    <Text style={styles.otherTitle}>{fact.title}</Text>
                  )}
                  <Text style={styles.otherDescription}>{fact.factValue}</Text>
                </View>
                <Pressable style={styles.deleteButton} onPress={() => onDeleteFact(fact)}>
                  <Trash2 size={16} color={Colors.error} />
                </Pressable>
              </Pressable>
            </View>
          ))}
        </View>
      );
    }

    // Original implementation for other cumulative types
    const values = group.facts.map((fact) => fact.factValue);
    // ... rest of original code
```

**Step 3: Add styles for other facts**

Add these styles:

```typescript
  otherSection: {
    gap: 8,
  },
  otherCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  otherContent: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  otherTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  otherDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
```

**Step 4: Commit**

```bash
git add frontend/components/contact/ProfileCard.tsx
git commit -m "feat(profile): filter contact card facts and improve other facts display"
```

---

## Task 7: Create DeleteContactDialog component

**Files:**
- Create: `frontend/components/contact/DeleteContactDialog.tsx`

**Step 1: Create the component**

```typescript
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ContactAvatar } from '@/components/contact/ContactAvatar';
import { Colors } from '@/constants/theme';

type DeleteContactDialogProps = {
  visible: boolean;
  contactName: string;
  contactFirstName: string;
  contactLastName?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteContactDialog({
  visible,
  contactName,
  contactFirstName,
  contactLastName,
  onCancel,
  onConfirm,
}: DeleteContactDialogProps) {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <View style={styles.avatarContainer}>
            <ContactAvatar
              firstName={contactFirstName}
              lastName={contactLastName}
              size="medium"
            />
          </View>
          <Text style={styles.title}>{t('contact.deleteDialog.title')}</Text>
          <Text style={styles.contactName}>{contactName}</Text>
          <Text style={styles.message}>
            {t('contact.deleteDialog.message', { name: contactName })}
          </Text>
          <View style={styles.buttonRow}>
            <Pressable style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>
                {t('contact.deleteDialog.cancel')}
              </Text>
            </Pressable>
            <Pressable style={styles.deleteButton} onPress={onConfirm}>
              <Text style={styles.deleteButtonText}>
                {t('contact.deleteDialog.confirm')}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.error,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: Colors.textInverse,
    fontSize: 15,
    fontWeight: '600',
  },
});
```

**Step 2: Commit**

```bash
git add frontend/components/contact/DeleteContactDialog.tsx
git commit -m "feat(contact): create DeleteContactDialog component"
```

---

## Task 8: Update contact detail page with menu and ContactCard

**Files:**
- Modify: `frontend/app/contact/[id].tsx`

**Step 1: Add imports**

Add at the top of the file:

```typescript
import { MoreVertical } from 'lucide-react-native';
import { ContactCard } from '@/components/contact/ContactCard';
import { DeleteContactDialog } from '@/components/contact/DeleteContactDialog';
```

**Step 2: Add state for menu and dialog**

After line 129 (after `const [showFactTypeDropdown, setShowFactTypeDropdown] = useState(false);`):

```typescript
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
```

**Step 3: Replace handleDelete function**

Replace the existing `handleDelete` function (lines 157-175):

```typescript
  const handleDelete = async () => {
    if (contact) {
      await deleteContactMutation.mutateAsync(contact.id);
      router.replace('/(tabs)/contacts');
    }
  };

  const handleDeletePress = () => {
    setShowOptionsMenu(false);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    setShowDeleteDialog(false);
    await handleDelete();
  };
```

**Step 4: Add handler for adding contact card facts**

After `handleAddFact`:

```typescript
  const handleAddContactCardFact = (factType: FactType) => {
    setNewFactType(factType);
    setIsAddingFact(true);
  };
```

**Step 5: Add menu button in hero section**

After the `heroSection` View opening (around line 398), add:

```typescript
          {/* Options menu button */}
          <View style={styles.menuButtonContainer}>
            <Pressable
              style={styles.menuButton}
              onPress={() => setShowOptionsMenu(!showOptionsMenu)}
            >
              <MoreVertical size={24} color={Colors.textSecondary} />
            </Pressable>
            {showOptionsMenu && (
              <View style={styles.optionsMenu}>
                <Pressable style={styles.optionsMenuItem} onPress={handleDeletePress}>
                  <Trash2 size={18} color={Colors.error} />
                  <Text style={styles.optionsMenuItemTextDanger}>
                    {t('contact.menu.delete')}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
```

**Step 6: Add ContactCard in Profile section**

In the Profile section (around line 628), after the section header and before `isAddingFact`:

```typescript
          {/* Contact Card */}
          <ContactCard
            facts={contact.facts}
            onAddFact={handleAddContactCardFact}
          />
```

**Step 7: Remove delete button at bottom**

Remove the entire "Delete button" section (lines 862-868):

```typescript
        {/* Delete button */}
        <Animated.View entering={FadeInDown.delay(350).duration(300)} style={styles.section}>
          <Pressable style={styles.deleteButton} onPress={handleDelete}>
            <Trash2 size={18} color={Colors.error} />
            <Text style={styles.deleteButtonText}>{t('contact.deleteContact')}</Text>
          </Pressable>
        </Animated.View>
```

**Step 8: Add DeleteContactDialog**

Before the closing `</KeyboardAvoidingView>`:

```typescript
        <DeleteContactDialog
          visible={showDeleteDialog}
          contactName={`${contact.firstName} ${contact.lastName || ''}`}
          contactFirstName={contact.firstName}
          contactLastName={contact.lastName}
          onCancel={() => setShowDeleteDialog(false)}
          onConfirm={handleConfirmDelete}
        />
```

**Step 9: Add styles**

Add these styles:

```typescript
  menuButtonContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 10,
  },
  menuButton: {
    padding: 8,
  },
  optionsMenu: {
    position: 'absolute',
    top: 40,
    right: 0,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  optionsMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  optionsMenuItemTextDanger: {
    fontSize: 15,
    color: Colors.error,
    fontWeight: '500',
  },
```

**Step 10: Remove old deleteButton styles**

Remove these styles (they're no longer needed):

```typescript
  deleteButton: { ... },
  deleteButtonText: { ... },
```

**Step 11: Commit**

```bash
git add frontend/app/contact/[id].tsx
git commit -m "feat(contact): add options menu, contact card, and delete dialog"
```

---

## Task 9: Update form for adding "other" facts with title

**Files:**
- Modify: `frontend/app/contact/[id].tsx`

**Step 1: Add state for new fact title**

After `const [newFactValue, setNewFactValue] = useState('');`:

```typescript
  const [newFactTitle, setNewFactTitle] = useState('');
```

**Step 2: Update the add fact form**

In the `isAddingFact` section, after the fact type dropdown and before the factValue input (around line 674):

```typescript
              {newFactType === 'other' && (
                <>
                  <Text style={styles.inputLabel}>{t('contact.otherFact.titleLabel')}</Text>
                  <TextInput
                    style={styles.input}
                    value={newFactTitle}
                    onChangeText={setNewFactTitle}
                    placeholder={t('contact.otherFact.titlePlaceholder')}
                    placeholderTextColor={Colors.textMuted}
                  />
                </>
              )}
```

**Step 3: Update handleAddFact**

Update the `handleAddFact` function to include title:

```typescript
  const handleAddFact = async () => {
    if (!newFactType || !newFactValue.trim()) return;
    if (newFactType === 'other' && !newFactTitle.trim()) return;

    await factService.create({
      contactId,
      factType: newFactType,
      factKey: getFactTypeLabel(t, newFactType),
      factValue: newFactValue.trim(),
      title: newFactType === 'other' ? newFactTitle.trim() : undefined,
    });

    setNewFactType(null);
    setNewFactValue('');
    setNewFactTitle('');
    setIsAddingFact(false);
    invalidate();
  };
```

**Step 4: Update cancel handler**

In the cancel button onPress, add:

```typescript
                  onPress={() => {
                    setIsAddingFact(false);
                    setNewFactType(null);
                    setNewFactValue('');
                    setNewFactTitle('');
                    setShowFactTypeDropdown(false);
                  }}
```

**Step 5: Commit**

```bash
git add frontend/app/contact/[id].tsx
git commit -m "feat(contact): add title field when creating other fact type"
```

---

## Task 10: Final testing and cleanup

**Step 1: Test the features**

Run the app and test:
- [ ] Contact card displays phone/email/birthday
- [ ] Phone menu works (call, WhatsApp, SMS, copy)
- [ ] Email menu works (open mail, copy)
- [ ] Birthday shows age and countdown
- [ ] Adding contact/birthday facts works from placeholders
- [ ] "Other" facts show with title + description
- [ ] Adding "other" fact requires both title and description
- [ ] Options menu appears with delete option
- [ ] Delete confirmation dialog shows contact info
- [ ] Delete works and redirects to contacts list
- [ ] Old delete button at bottom is removed

**Step 2: Final commit**

```bash
git add -A
git commit -m "feat(contact): complete contact enhancements (card, other facts, delete menu)"
```

---

## Summary of Files Changed

| File | Action | Description |
|------|--------|-------------|
| `frontend/lib/db.ts` | Modify | Add title column migration |
| `frontend/types/index.ts` | Modify | Add title to Fact and ExtractedFact types |
| `frontend/services/fact.service.ts` | Modify | Handle title in CRUD |
| `backend/src/routes/extract.ts` | Modify | Update schema and prompt for other facts |
| `frontend/locales/fr.json` | Modify | Add translations |
| `frontend/locales/en.json` | Modify | Add translations |
| `frontend/components/contact/ContactCard.tsx` | Create | New component |
| `frontend/components/contact/DeleteContactDialog.tsx` | Create | New component |
| `frontend/components/contact/ProfileCard.tsx` | Modify | Filter facts, improve other display |
| `frontend/app/contact/[id].tsx` | Modify | Integrate all changes |
