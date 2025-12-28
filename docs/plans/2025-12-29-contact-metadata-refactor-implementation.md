# Contact Metadata Refactor - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move phone, email, and birthday from facts system to direct Contact fields with dedicated edit modals.

**Architecture:** Add columns to contacts table, create 3 edit modal components, update ContactCard to use direct props instead of parsing facts, update LLM extraction to output contactInfo object separately.

**Tech Stack:** Expo/React Native, SQLite (expo-sqlite), TypeScript, react-i18next, Zod (backend)

---

## Task 1: Database Migration

**Files:**
- Modify: `frontend/lib/db.ts:167-210` (runMigrations function)

**Step 1: Add migration for contact metadata columns**

In `runMigrations()`, after the existing migrations (around line 209), add:

```typescript
  // Check if phone/email/birthday columns exist on contacts
  const hasPhone = contactsInfo.some((col) => col.name === 'phone');
  if (!hasPhone) {
    await database.execAsync("ALTER TABLE contacts ADD COLUMN phone TEXT");
  }

  const hasEmail = contactsInfo.some((col) => col.name === 'email');
  if (!hasEmail) {
    await database.execAsync("ALTER TABLE contacts ADD COLUMN email TEXT");
  }

  const hasBirthdayDay = contactsInfo.some((col) => col.name === 'birthday_day');
  if (!hasBirthdayDay) {
    await database.execAsync("ALTER TABLE contacts ADD COLUMN birthday_day INTEGER");
    await database.execAsync("ALTER TABLE contacts ADD COLUMN birthday_month INTEGER");
    await database.execAsync("ALTER TABLE contacts ADD COLUMN birthday_year INTEGER");
  }
```

**Step 2: Commit**

```bash
git add frontend/lib/db.ts
git commit -m "feat(db): add phone/email/birthday columns to contacts table"
```

---

## Task 2: Update Contact Type

**Files:**
- Modify: `frontend/types/index.ts:42-54` (Contact type)

**Step 1: Add new fields to Contact type**

Update the Contact type to add the new optional fields:

```typescript
export type Contact = {
  id: string;
  firstName: string;
  lastName?: string;
  nickname?: string;
  photoUri?: string;
  phone?: string;
  email?: string;
  birthdayDay?: number;
  birthdayMonth?: number;
  birthdayYear?: number;
  highlights: string[];
  aiSummary?: string;
  iceBreakers?: string[];
  lastContactAt?: string;
  createdAt: string;
  updatedAt: string;
};
```

**Step 2: Commit**

```bash
git add frontend/types/index.ts
git commit -m "feat(types): add phone/email/birthday fields to Contact type"
```

---

## Task 3: Update Contact Service

**Files:**
- Modify: `frontend/services/contact.service.ts`

**Step 1: Update getAll query and mapping**

In `getAll()` (lines 6-31), update the SELECT query type and mapping to include new fields:

```typescript
getAll: async (): Promise<Contact[]> => {
  const db = await getDatabase();
  const result = await db.getAllAsync<{
    id: string;
    first_name: string;
    last_name: string | null;
    nickname: string | null;
    photo_uri: string | null;
    phone: string | null;
    email: string | null;
    birthday_day: number | null;
    birthday_month: number | null;
    birthday_year: number | null;
    highlights: string | null;
    last_contact_at: string | null;
    created_at: string;
    updated_at: string;
  }>('SELECT * FROM contacts ORDER BY last_contact_at DESC');

  return result.map((row) => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name || undefined,
    nickname: row.nickname || undefined,
    photoUri: row.photo_uri || undefined,
    phone: row.phone || undefined,
    email: row.email || undefined,
    birthdayDay: row.birthday_day || undefined,
    birthdayMonth: row.birthday_month || undefined,
    birthdayYear: row.birthday_year || undefined,
    highlights: JSON.parse(row.highlights || '[]'),
    lastContactAt: row.last_contact_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
},
```

**Step 2: Update getById query and mapping**

In `getById()` (lines 33-154), update the SELECT query type to include new fields and add them to the returned contact object:

Add to the type (around line 35):
```typescript
phone: string | null;
email: string | null;
birthday_day: number | null;
birthday_month: number | null;
birthday_year: number | null;
```

Add to the contact object mapping (around line 103):
```typescript
phone: contactRow.phone || undefined,
email: contactRow.email || undefined,
birthdayDay: contactRow.birthday_day || undefined,
birthdayMonth: contactRow.birthday_month || undefined,
birthdayYear: contactRow.birthday_year || undefined,
```

**Step 3: Update update() method**

In `update()` (lines 190-244), add handling for the new fields:

```typescript
if (data.phone !== undefined) {
  updates.push('phone = ?');
  values.push(data.phone || null);
}
if (data.email !== undefined) {
  updates.push('email = ?');
  values.push(data.email || null);
}
if (data.birthdayDay !== undefined) {
  updates.push('birthday_day = ?');
  values.push(data.birthdayDay || null);
}
if (data.birthdayMonth !== undefined) {
  updates.push('birthday_month = ?');
  values.push(data.birthdayMonth || null);
}
if (data.birthdayYear !== undefined) {
  updates.push('birthday_year = ?');
  values.push(data.birthdayYear || null);
}
```

Also update the function signature to include new fields in the Partial type.

**Step 4: Commit**

```bash
git add frontend/services/contact.service.ts
git commit -m "feat(contact): add phone/email/birthday CRUD in contact service"
```

---

## Task 4: Add Translations

**Files:**
- Modify: `frontend/locales/fr.json`
- Modify: `frontend/locales/en.json`

**Step 1: Add French translations**

Add under `contact` key:

```json
"phoneModal": {
  "title": "Téléphone",
  "placeholder": "+33 6 12 34 56 78",
  "save": "Enregistrer",
  "cancel": "Annuler",
  "delete": "Supprimer"
},
"emailModal": {
  "title": "Email",
  "placeholder": "email@exemple.com",
  "invalidFormat": "Format email invalide",
  "save": "Enregistrer",
  "cancel": "Annuler",
  "delete": "Supprimer"
},
"birthdayModal": {
  "title": "Anniversaire",
  "day": "Jour",
  "month": "Mois",
  "year": "Année (optionnel)",
  "yearPlaceholder": "Année",
  "months": ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"],
  "save": "Enregistrer",
  "cancel": "Annuler",
  "delete": "Supprimer"
},
"contactInfoReview": {
  "title": "Coordonnées détectées",
  "phone": "Téléphone",
  "email": "Email",
  "birthday": "Anniversaire",
  "accept": "Accepter",
  "ignore": "Ignorer"
}
```

**Step 2: Add English translations**

Add under `contact` key:

```json
"phoneModal": {
  "title": "Phone",
  "placeholder": "+1 555 123 4567",
  "save": "Save",
  "cancel": "Cancel",
  "delete": "Delete"
},
"emailModal": {
  "title": "Email",
  "placeholder": "email@example.com",
  "invalidFormat": "Invalid email format",
  "save": "Save",
  "cancel": "Cancel",
  "delete": "Delete"
},
"birthdayModal": {
  "title": "Birthday",
  "day": "Day",
  "month": "Month",
  "year": "Year (optional)",
  "yearPlaceholder": "Year",
  "months": ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  "save": "Save",
  "cancel": "Cancel",
  "delete": "Delete"
},
"contactInfoReview": {
  "title": "Detected contact info",
  "phone": "Phone",
  "email": "Email",
  "birthday": "Birthday",
  "accept": "Accept",
  "ignore": "Ignore"
}
```

**Step 3: Commit**

```bash
git add frontend/locales/fr.json frontend/locales/en.json
git commit -m "feat(i18n): add translations for contact metadata modals"
```

---

## Task 5: Create PhoneEditModal Component

**Files:**
- Create: `frontend/components/contact/PhoneEditModal.tsx`

**Step 1: Create the component**

```typescript
import { View, Text, TextInput, Pressable, StyleSheet, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react-native';
import { Colors } from '@/constants/theme';

type PhoneEditModalProps = {
  visible: boolean;
  initialValue?: string;
  onSave: (value: string | null) => void;
  onClose: () => void;
};

export function PhoneEditModal({ visible, initialValue, onSave, onClose }: PhoneEditModalProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState(initialValue || '');

  useEffect(() => {
    if (visible) {
      setValue(initialValue || '');
    }
  }, [visible, initialValue]);

  const handleSave = () => {
    onSave(value.trim() || null);
    onClose();
  };

  const handleDelete = () => {
    onSave(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>{t('contact.phoneModal.title')}</Text>

          <TextInput
            style={styles.input}
            value={value}
            onChangeText={setValue}
            placeholder={t('contact.phoneModal.placeholder')}
            placeholderTextColor={Colors.textMuted}
            keyboardType="phone-pad"
            autoFocus
          />

          <View style={styles.buttonRow}>
            {initialValue && (
              <Pressable style={styles.deleteButton} onPress={handleDelete}>
                <Trash2 size={20} color={Colors.error} />
              </Pressable>
            )}
            <View style={styles.spacer} />
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>{t('contact.phoneModal.cancel')}</Text>
            </Pressable>
            <Pressable style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>{t('contact.phoneModal.save')}</Text>
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
  modal: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteButton: {
    padding: 10,
  },
  spacer: {
    flex: 1,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
  saveButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  saveButtonText: {
    color: Colors.textInverse,
    fontSize: 15,
    fontWeight: '600',
  },
});
```

**Step 2: Commit**

```bash
git add frontend/components/contact/PhoneEditModal.tsx
git commit -m "feat(contact): create PhoneEditModal component"
```

---

## Task 6: Create EmailEditModal Component

**Files:**
- Create: `frontend/components/contact/EmailEditModal.tsx`

**Step 1: Create the component**

```typescript
import { View, Text, TextInput, Pressable, StyleSheet, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react-native';
import { Colors } from '@/constants/theme';

type EmailEditModalProps = {
  visible: boolean;
  initialValue?: string;
  onSave: (value: string | null) => void;
  onClose: () => void;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EmailEditModal({ visible, initialValue, onSave, onClose }: EmailEditModalProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState(initialValue || '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setValue(initialValue || '');
      setError(null);
    }
  }, [visible, initialValue]);

  const handleSave = () => {
    const trimmed = value.trim();
    if (trimmed && !EMAIL_REGEX.test(trimmed)) {
      setError(t('contact.emailModal.invalidFormat'));
      return;
    }
    onSave(trimmed || null);
    onClose();
  };

  const handleDelete = () => {
    onSave(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>{t('contact.emailModal.title')}</Text>

          <TextInput
            style={[styles.input, error && styles.inputError]}
            value={value}
            onChangeText={(text) => {
              setValue(text);
              setError(null);
            }}
            placeholder={t('contact.emailModal.placeholder')}
            placeholderTextColor={Colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
          />
          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.buttonRow}>
            {initialValue && (
              <Pressable style={styles.deleteButton} onPress={handleDelete}>
                <Trash2 size={20} color={Colors.error} />
              </Pressable>
            )}
            <View style={styles.spacer} />
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>{t('contact.emailModal.cancel')}</Text>
            </Pressable>
            <Pressable style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>{t('contact.emailModal.save')}</Text>
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
  modal: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  inputError: {
    borderColor: Colors.error,
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  deleteButton: {
    padding: 10,
  },
  spacer: {
    flex: 1,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
  saveButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  saveButtonText: {
    color: Colors.textInverse,
    fontSize: 15,
    fontWeight: '600',
  },
});
```

**Step 2: Commit**

```bash
git add frontend/components/contact/EmailEditModal.tsx
git commit -m "feat(contact): create EmailEditModal component"
```

---

## Task 7: Create BirthdayEditModal Component

**Files:**
- Create: `frontend/components/contact/BirthdayEditModal.tsx`

**Step 1: Create the component**

```typescript
import { View, Text, TextInput, Pressable, StyleSheet, Modal, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, ChevronDown } from 'lucide-react-native';
import { Colors } from '@/constants/theme';

type BirthdayEditModalProps = {
  visible: boolean;
  initialDay?: number;
  initialMonth?: number;
  initialYear?: number;
  onSave: (day: number | null, month: number | null, year: number | null) => void;
  onClose: () => void;
};

export function BirthdayEditModal({
  visible,
  initialDay,
  initialMonth,
  initialYear,
  onSave,
  onClose,
}: BirthdayEditModalProps) {
  const { t } = useTranslation();
  const [day, setDay] = useState(initialDay?.toString() || '');
  const [month, setMonth] = useState<number | null>(initialMonth || null);
  const [year, setYear] = useState(initialYear?.toString() || '');
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const months: string[] = t('contact.birthdayModal.months', { returnObjects: true });

  useEffect(() => {
    if (visible) {
      setDay(initialDay?.toString() || '');
      setMonth(initialMonth || null);
      setYear(initialYear?.toString() || '');
      setShowMonthPicker(false);
    }
  }, [visible, initialDay, initialMonth, initialYear]);

  const handleSave = () => {
    const dayNum = parseInt(day, 10);
    const yearNum = year ? parseInt(year, 10) : null;

    if (!day || !month || isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
      return;
    }

    onSave(dayNum, month, yearNum);
    onClose();
  };

  const handleDelete = () => {
    onSave(null, null, null);
    onClose();
  };

  const hasInitialValue = initialDay && initialMonth;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>{t('contact.birthdayModal.title')}</Text>

          <View style={styles.row}>
            <View style={styles.dayContainer}>
              <Text style={styles.label}>{t('contact.birthdayModal.day')}</Text>
              <TextInput
                style={styles.dayInput}
                value={day}
                onChangeText={(text) => setDay(text.replace(/[^0-9]/g, '').slice(0, 2))}
                placeholder="15"
                placeholderTextColor={Colors.textMuted}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>

            <View style={styles.monthContainer}>
              <Text style={styles.label}>{t('contact.birthdayModal.month')}</Text>
              <Pressable
                style={styles.monthButton}
                onPress={() => setShowMonthPicker(!showMonthPicker)}
              >
                <Text style={month ? styles.monthText : styles.monthPlaceholder}>
                  {month ? months[month - 1] : t('contact.birthdayModal.month')}
                </Text>
                <ChevronDown size={16} color={Colors.textSecondary} />
              </Pressable>
            </View>
          </View>

          {showMonthPicker && (
            <ScrollView style={styles.monthPicker} nestedScrollEnabled>
              {months.map((monthName, index) => (
                <Pressable
                  key={index}
                  style={[styles.monthOption, month === index + 1 && styles.monthOptionSelected]}
                  onPress={() => {
                    setMonth(index + 1);
                    setShowMonthPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.monthOptionText,
                      month === index + 1 && styles.monthOptionTextSelected,
                    ]}
                  >
                    {monthName}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          <View style={styles.yearContainer}>
            <Text style={styles.label}>{t('contact.birthdayModal.year')}</Text>
            <TextInput
              style={styles.yearInput}
              value={year}
              onChangeText={(text) => setYear(text.replace(/[^0-9]/g, '').slice(0, 4))}
              placeholder={t('contact.birthdayModal.yearPlaceholder')}
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
              maxLength={4}
            />
          </View>

          <View style={styles.buttonRow}>
            {hasInitialValue && (
              <Pressable style={styles.deleteButton} onPress={handleDelete}>
                <Trash2 size={20} color={Colors.error} />
              </Pressable>
            )}
            <View style={styles.spacer} />
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>{t('contact.birthdayModal.cancel')}</Text>
            </Pressable>
            <Pressable
              style={[styles.saveButton, (!day || !month) && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={!day || !month}
            >
              <Text style={styles.saveButtonText}>{t('contact.birthdayModal.save')}</Text>
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
  modal: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 20,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  dayContainer: {
    width: 70,
  },
  dayInput: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    textAlign: 'center',
  },
  monthContainer: {
    flex: 1,
  },
  monthButton: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  monthPlaceholder: {
    fontSize: 16,
    color: Colors.textMuted,
  },
  monthPicker: {
    maxHeight: 200,
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  monthOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  monthOptionSelected: {
    backgroundColor: Colors.primaryLight,
  },
  monthOptionText: {
    fontSize: 15,
    color: Colors.textPrimary,
  },
  monthOptionTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  yearContainer: {
    marginBottom: 20,
  },
  yearInput: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteButton: {
    padding: 10,
  },
  spacer: {
    flex: 1,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
  saveButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: Colors.textInverse,
    fontSize: 15,
    fontWeight: '600',
  },
});
```

**Step 2: Commit**

```bash
git add frontend/components/contact/BirthdayEditModal.tsx
git commit -m "feat(contact): create BirthdayEditModal component"
```

---

## Task 8: Refactor ContactCard Component

**Files:**
- Modify: `frontend/components/contact/ContactCard.tsx`

**Step 1: Update props and remove fact parsing**

Replace the entire component with the new version that uses direct props:

```typescript
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Phone, Mail, Cake, ChevronDown } from 'lucide-react-native';
import { Linking } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Colors } from '@/constants/theme';
import { toast } from 'sonner-native';

type ContactCardProps = {
  phone?: string;
  email?: string;
  birthdayDay?: number;
  birthdayMonth?: number;
  birthdayYear?: number;
  onEditPhone: () => void;
  onEditEmail: () => void;
  onEditBirthday: () => void;
};

export function ContactCard({
  phone,
  email,
  birthdayDay,
  birthdayMonth,
  birthdayYear,
  onEditPhone,
  onEditEmail,
  onEditBirthday,
}: ContactCardProps) {
  const { t } = useTranslation();
  const [phoneMenuOpen, setPhoneMenuOpen] = useState(false);
  const [emailMenuOpen, setEmailMenuOpen] = useState(false);

  const months: string[] = t('contact.birthdayModal.months', { returnObjects: true });

  const formatBirthday = (): { display: string; countdown?: string } | null => {
    if (!birthdayDay || !birthdayMonth) return null;

    const displayDate = `${birthdayDay} ${months[birthdayMonth - 1].toLowerCase()}`;
    let ageStr = '';
    let countdown: string | undefined;

    if (birthdayYear) {
      const today = new Date();
      const thisYearBirthday = new Date(today.getFullYear(), birthdayMonth - 1, birthdayDay);
      let age = today.getFullYear() - birthdayYear;
      if (today < thisYearBirthday) {
        age--;
      }
      ageStr = ` (${t('contact.contactCard.years', { count: age })})`;
    }

    const today = new Date();
    const thisYear = today.getFullYear();
    let nextBirthday = new Date(thisYear, birthdayMonth - 1, birthdayDay);
    if (nextBirthday < today) {
      nextBirthday = new Date(thisYear + 1, birthdayMonth - 1, birthdayDay);
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
    if (!phone) return;
    const cleanPhone = phone.replace(/\s/g, '');

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
        Clipboard.setStringAsync(phone);
        toast.success(t('contact.contactCard.copied'));
        break;
    }
    setPhoneMenuOpen(false);
  };

  const handleEmailAction = (action: 'open' | 'copy') => {
    if (!email) return;

    switch (action) {
      case 'open':
        Linking.openURL(`mailto:${email}`);
        break;
      case 'copy':
        Clipboard.setStringAsync(email);
        toast.success(t('contact.contactCard.copied'));
        break;
    }
    setEmailMenuOpen(false);
  };

  const birthdayInfo = formatBirthday();

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Phone size={18} color={Colors.primary} />
        {phone ? (
          <View style={styles.valueContainer}>
            <Pressable
              style={styles.valueButton}
              onPress={() => setPhoneMenuOpen(!phoneMenuOpen)}
              onLongPress={onEditPhone}
            >
              <Text style={styles.value}>{phone}</Text>
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
                <Pressable style={[styles.menuItem, styles.menuItemLast]} onPress={onEditPhone}>
                  <Text style={styles.menuItemTextEdit}>{t('contact.menu.edit')}</Text>
                </Pressable>
              </View>
            )}
          </View>
        ) : (
          <Pressable style={styles.addButton} onPress={onEditPhone}>
            <Text style={styles.addButtonText}>{t('contact.contactCard.addPhone')}</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.row}>
        <Mail size={18} color={Colors.primary} />
        {email ? (
          <View style={styles.valueContainer}>
            <Pressable
              style={styles.valueButton}
              onPress={() => setEmailMenuOpen(!emailMenuOpen)}
              onLongPress={onEditEmail}
            >
              <Text style={styles.value}>{email}</Text>
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
                <Pressable style={[styles.menuItem, styles.menuItemLast]} onPress={onEditEmail}>
                  <Text style={styles.menuItemTextEdit}>{t('contact.menu.edit')}</Text>
                </Pressable>
              </View>
            )}
          </View>
        ) : (
          <Pressable style={styles.addButton} onPress={onEditEmail}>
            <Text style={styles.addButtonText}>{t('contact.contactCard.addEmail')}</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.row}>
        <Cake size={18} color={Colors.primary} />
        {birthdayInfo ? (
          <Pressable style={styles.birthdayContainer} onPress={onEditBirthday}>
            <Text style={styles.value}>{birthdayInfo.display}</Text>
            {birthdayInfo.countdown && (
              <Text style={styles.countdown}>{birthdayInfo.countdown}</Text>
            )}
          </Pressable>
        ) : (
          <Pressable style={styles.addButton} onPress={onEditBirthday}>
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
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemText: {
    fontSize: 15,
    color: Colors.textPrimary,
  },
  menuItemTextEdit: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '500',
  },
});
```

**Step 2: Commit**

```bash
git add frontend/components/contact/ContactCard.tsx
git commit -m "refactor(contact): update ContactCard to use direct props instead of facts"
```

---

## Task 9: Update Contact Detail Page

**Files:**
- Modify: `frontend/app/contact/[id].tsx`

**Step 1: Add imports for new modals**

Add at the top with other imports:

```typescript
import { PhoneEditModal } from '@/components/contact/PhoneEditModal';
import { EmailEditModal } from '@/components/contact/EmailEditModal';
import { BirthdayEditModal } from '@/components/contact/BirthdayEditModal';
```

**Step 2: Add modal state variables**

After the existing state declarations (around line 134), add:

```typescript
const [showPhoneModal, setShowPhoneModal] = useState(false);
const [showEmailModal, setShowEmailModal] = useState(false);
const [showBirthdayModal, setShowBirthdayModal] = useState(false);
```

**Step 3: Add save handlers for contact metadata**

Add after the existing handlers:

```typescript
const handleSavePhone = async (value: string | null) => {
  await contactService.update(contactId, { phone: value || undefined });
  invalidate();
};

const handleSaveEmail = async (value: string | null) => {
  await contactService.update(contactId, { email: value || undefined });
  invalidate();
};

const handleSaveBirthday = async (day: number | null, month: number | null, year: number | null) => {
  await contactService.update(contactId, {
    birthdayDay: day || undefined,
    birthdayMonth: month || undefined,
    birthdayYear: year || undefined,
  });
  invalidate();
};
```

**Step 4: Update ContactCard usage**

Find the ContactCard component in the JSX and replace with:

```typescript
<ContactCard
  phone={contact.phone}
  email={contact.email}
  birthdayDay={contact.birthdayDay}
  birthdayMonth={contact.birthdayMonth}
  birthdayYear={contact.birthdayYear}
  onEditPhone={() => setShowPhoneModal(true)}
  onEditEmail={() => setShowEmailModal(true)}
  onEditBirthday={() => setShowBirthdayModal(true)}
/>
```

**Step 5: Remove handleAddContactCardFact function**

Delete the `handleAddContactCardFact` function as it's no longer needed.

**Step 6: Filter out contact/birthday from fact type dropdown**

Update `getAvailableFactTypes()` to exclude these types:

```typescript
const getAvailableFactTypes = (): FactType[] => {
  if (!contact) return [];

  // Exclude contact and birthday - they are now on Contact directly
  const excludedTypes: FactType[] = ['contact', 'birthday'];

  const existingSingularTypes = new Set(
    contact.facts
      .filter(fact => FACT_TYPE_CONFIG[fact.factType].singular)
      .map(fact => fact.factType)
  );

  return (Object.keys(FACT_TYPE_CONFIG) as FactType[]).filter(
    type => !existingSingularTypes.has(type) && !excludedTypes.includes(type)
  );
};
```

**Step 7: Add modals before closing KeyboardAvoidingView**

Add before the closing `</KeyboardAvoidingView>`:

```typescript
<PhoneEditModal
  visible={showPhoneModal}
  initialValue={contact?.phone}
  onSave={handleSavePhone}
  onClose={() => setShowPhoneModal(false)}
/>

<EmailEditModal
  visible={showEmailModal}
  initialValue={contact?.email}
  onSave={handleSaveEmail}
  onClose={() => setShowEmailModal(false)}
/>

<BirthdayEditModal
  visible={showBirthdayModal}
  initialDay={contact?.birthdayDay}
  initialMonth={contact?.birthdayMonth}
  initialYear={contact?.birthdayYear}
  onSave={handleSaveBirthday}
  onClose={() => setShowBirthdayModal(false)}
/>
```

**Step 8: Commit**

```bash
git add frontend/app/contact/[id].tsx
git commit -m "feat(contact): integrate metadata edit modals in contact detail page"
```

---

## Task 10: Update ExtractionResult Type

**Files:**
- Modify: `frontend/types/index.ts`

**Step 1: Add ContactInfo type and update ExtractionResult**

Add new type before ExtractionResult:

```typescript
export type ExtractedContactInfo = {
  phone?: string;
  email?: string;
  birthday?: {
    day: number;
    month: number;
    year?: number;
  };
};
```

Update ExtractionResult to include contactInfo:

```typescript
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
  contactInfo?: ExtractedContactInfo;  // NEW
  facts: ExtractedFact[];
  // ... rest unchanged
};
```

**Step 2: Commit**

```bash
git add frontend/types/index.ts
git commit -m "feat(types): add ExtractedContactInfo to ExtractionResult"
```

---

## Task 11: Update Backend Extraction

**Files:**
- Modify: `backend/src/routes/extract.ts`

**Step 1: Update Zod schema**

Add contactInfo to the extraction schema (after noteTitle, around line 62):

```typescript
contactInfo: z.object({
  phone: z.string().nullable().describe('Numéro de téléphone si mentionné'),
  email: z.string().nullable().describe('Adresse email si mentionnée'),
  birthday: z.object({
    day: z.number().describe('Jour du mois (1-31)'),
    month: z.number().describe('Mois (1-12)'),
    year: z.number().nullable().describe('Année si mentionnée'),
  }).nullable().describe('Date d\'anniversaire si mentionnée'),
}).describe('Coordonnées de contact détectées'),
```

**Step 2: Remove contact/birthday from factType enum**

Update the factType enum to remove 'contact' and 'birthday':

```typescript
factType: z.enum([
  'work', 'company', 'education', 'location', 'origin', 'partner',
  'children', 'hobby', 'sport', 'language', 'pet',
  'how_met', 'where_met', 'shared_ref', 'trait', 'gift_idea',
  'gift_given', 'relationship', 'other',
]),
```

**Step 3: Update LLM prompt**

Find the `buildExtractionPrompt` function and add instructions for contactInfo extraction:

```typescript
// Add to the prompt instructions:
`
## Coordonnées (contactInfo)
- phone: numéro de téléphone si mentionné (format international de préférence)
- email: adresse email si mentionnée
- birthday: { day, month, year } si une date d'anniversaire est mentionnée (year peut être null)

NE PAS créer de facts pour téléphone, email ou anniversaire - utilise uniquement contactInfo.
`
```

**Step 4: Update response formatting**

In the response formatting section (around line 231), add contactInfo:

```typescript
const formattedExtraction = {
  contactIdentified: { ... },
  noteTitle: extraction.noteTitle,
  contactInfo: {
    phone: extraction.contactInfo.phone || undefined,
    email: extraction.contactInfo.email || undefined,
    birthday: extraction.contactInfo.birthday ? {
      day: extraction.contactInfo.birthday.day,
      month: extraction.contactInfo.birthday.month,
      year: extraction.contactInfo.birthday.year || undefined,
    } : undefined,
  },
  facts: filteredFacts,
  // ... rest
};
```

**Step 5: Commit**

```bash
git add backend/src/routes/extract.ts
git commit -m "feat(extract): add contactInfo extraction for phone/email/birthday"
```

---

## Task 12: Update Review Screen

**Files:**
- Modify: `frontend/app/review.tsx`

**Step 1: Add state for contact info acceptance**

After existing state declarations, add:

```typescript
const [acceptedContactInfo, setAcceptedContactInfo] = useState<{
  phone: boolean;
  email: boolean;
  birthday: boolean;
}>({
  phone: !!extraction.contactInfo?.phone,
  email: !!extraction.contactInfo?.email,
  birthday: !!extraction.contactInfo?.birthday,
});
```

**Step 2: Add contact info section in the render**

Add a new section before the facts section:

```typescript
{/* Contact Info Section */}
{extraction.contactInfo && (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{t('contact.contactInfoReview.title')}</Text>

    {extraction.contactInfo.phone && (
      <View style={styles.contactInfoRow}>
        <View style={styles.contactInfoContent}>
          <Text style={styles.contactInfoLabel}>{t('contact.contactInfoReview.phone')}</Text>
          <Text style={styles.contactInfoValue}>{extraction.contactInfo.phone}</Text>
        </View>
        <View style={styles.contactInfoActions}>
          <Pressable
            style={[styles.actionButton, acceptedContactInfo.phone && styles.actionButtonActive]}
            onPress={() => setAcceptedContactInfo(prev => ({ ...prev, phone: true }))}
          >
            <Text style={[styles.actionButtonText, acceptedContactInfo.phone && styles.actionButtonTextActive]}>
              {t('contact.contactInfoReview.accept')}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, !acceptedContactInfo.phone && styles.actionButtonActive]}
            onPress={() => setAcceptedContactInfo(prev => ({ ...prev, phone: false }))}
          >
            <Text style={[styles.actionButtonText, !acceptedContactInfo.phone && styles.actionButtonTextActive]}>
              {t('contact.contactInfoReview.ignore')}
            </Text>
          </Pressable>
        </View>
      </View>
    )}

    {extraction.contactInfo.email && (
      <View style={styles.contactInfoRow}>
        <View style={styles.contactInfoContent}>
          <Text style={styles.contactInfoLabel}>{t('contact.contactInfoReview.email')}</Text>
          <Text style={styles.contactInfoValue}>{extraction.contactInfo.email}</Text>
        </View>
        <View style={styles.contactInfoActions}>
          <Pressable
            style={[styles.actionButton, acceptedContactInfo.email && styles.actionButtonActive]}
            onPress={() => setAcceptedContactInfo(prev => ({ ...prev, email: true }))}
          >
            <Text style={[styles.actionButtonText, acceptedContactInfo.email && styles.actionButtonTextActive]}>
              {t('contact.contactInfoReview.accept')}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, !acceptedContactInfo.email && styles.actionButtonActive]}
            onPress={() => setAcceptedContactInfo(prev => ({ ...prev, email: false }))}
          >
            <Text style={[styles.actionButtonText, !acceptedContactInfo.email && styles.actionButtonTextActive]}>
              {t('contact.contactInfoReview.ignore')}
            </Text>
          </Pressable>
        </View>
      </View>
    )}

    {extraction.contactInfo.birthday && (
      <View style={styles.contactInfoRow}>
        <View style={styles.contactInfoContent}>
          <Text style={styles.contactInfoLabel}>{t('contact.contactInfoReview.birthday')}</Text>
          <Text style={styles.contactInfoValue}>
            {`${extraction.contactInfo.birthday.day}/${extraction.contactInfo.birthday.month}${extraction.contactInfo.birthday.year ? `/${extraction.contactInfo.birthday.year}` : ''}`}
          </Text>
        </View>
        <View style={styles.contactInfoActions}>
          <Pressable
            style={[styles.actionButton, acceptedContactInfo.birthday && styles.actionButtonActive]}
            onPress={() => setAcceptedContactInfo(prev => ({ ...prev, birthday: true }))}
          >
            <Text style={[styles.actionButtonText, acceptedContactInfo.birthday && styles.actionButtonTextActive]}>
              {t('contact.contactInfoReview.accept')}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, !acceptedContactInfo.birthday && styles.actionButtonActive]}
            onPress={() => setAcceptedContactInfo(prev => ({ ...prev, birthday: false }))}
          >
            <Text style={[styles.actionButtonText, !acceptedContactInfo.birthday && styles.actionButtonTextActive]}>
              {t('contact.contactInfoReview.ignore')}
            </Text>
          </Pressable>
        </View>
      </View>
    )}
  </View>
)}
```

**Step 3: Update handleSave to include contact info**

In the handleSave function, add contact info update after contact creation/update:

```typescript
// After getting the finalContactId, add:
if (extraction.contactInfo) {
  const contactInfoUpdate: Partial<{
    phone: string;
    email: string;
    birthdayDay: number;
    birthdayMonth: number;
    birthdayYear: number;
  }> = {};

  if (acceptedContactInfo.phone && extraction.contactInfo.phone) {
    contactInfoUpdate.phone = extraction.contactInfo.phone;
  }
  if (acceptedContactInfo.email && extraction.contactInfo.email) {
    contactInfoUpdate.email = extraction.contactInfo.email;
  }
  if (acceptedContactInfo.birthday && extraction.contactInfo.birthday) {
    contactInfoUpdate.birthdayDay = extraction.contactInfo.birthday.day;
    contactInfoUpdate.birthdayMonth = extraction.contactInfo.birthday.month;
    if (extraction.contactInfo.birthday.year) {
      contactInfoUpdate.birthdayYear = extraction.contactInfo.birthday.year;
    }
  }

  if (Object.keys(contactInfoUpdate).length > 0) {
    await contactService.update(finalContactId, contactInfoUpdate);
  }
}
```

**Step 4: Add styles**

Add to the StyleSheet:

```typescript
contactInfoRow: {
  backgroundColor: Colors.surface,
  borderRadius: 12,
  padding: 12,
  marginBottom: 8,
},
contactInfoContent: {
  marginBottom: 8,
},
contactInfoLabel: {
  fontSize: 12,
  color: Colors.textSecondary,
  marginBottom: 2,
},
contactInfoValue: {
  fontSize: 15,
  color: Colors.textPrimary,
  fontWeight: '500',
},
contactInfoActions: {
  flexDirection: 'row',
  gap: 8,
},
actionButton: {
  paddingVertical: 6,
  paddingHorizontal: 12,
  borderRadius: 8,
  backgroundColor: Colors.background,
  borderWidth: 1,
  borderColor: Colors.border,
},
actionButtonActive: {
  backgroundColor: Colors.primaryLight,
  borderColor: Colors.primary,
},
actionButtonText: {
  fontSize: 13,
  color: Colors.textSecondary,
},
actionButtonTextActive: {
  color: Colors.primary,
  fontWeight: '500',
},
```

**Step 5: Commit**

```bash
git add frontend/app/review.tsx
git commit -m "feat(review): add contact info acceptance section"
```

---

## Task 13: Final Cleanup and Testing

**Files:**
- Review all modified files

**Step 1: Run TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Fix any type errors.

**Step 2: Test the flow manually**

1. Open a contact detail page
2. Click on "Ajouter téléphone" → verify modal opens
3. Enter a phone number → verify it saves and displays
4. Long-press on the phone → verify edit modal opens
5. Repeat for email and birthday
6. Record a new note mentioning phone/email/birthday
7. Verify the review screen shows the "Coordonnées détectées" section
8. Accept/ignore and verify the data is saved correctly

**Step 3: Final commit**

```bash
git add -A
git commit -m "chore: cleanup and verify contact metadata refactor"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Database migration | `lib/db.ts` |
| 2 | Update Contact type | `types/index.ts` |
| 3 | Update Contact service | `services/contact.service.ts` |
| 4 | Add translations | `locales/fr.json`, `locales/en.json` |
| 5 | Create PhoneEditModal | `components/contact/PhoneEditModal.tsx` |
| 6 | Create EmailEditModal | `components/contact/EmailEditModal.tsx` |
| 7 | Create BirthdayEditModal | `components/contact/BirthdayEditModal.tsx` |
| 8 | Refactor ContactCard | `components/contact/ContactCard.tsx` |
| 9 | Update contact detail page | `app/contact/[id].tsx` |
| 10 | Update ExtractionResult type | `types/index.ts` |
| 11 | Update backend extraction | `backend/src/routes/extract.ts` |
| 12 | Update review screen | `app/review.tsx` |
| 13 | Final cleanup and testing | All files |
