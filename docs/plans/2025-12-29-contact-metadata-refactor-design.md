# Contact Metadata Refactor - Design

**Date:** 2025-12-29
**Status:** Approved

## Problem

Currently, phone, email, and birthday are stored as "facts" with issues:
- `factType: 'contact'` is shared between phone and email - no way to distinguish
- `ContactCard` has to parse `factValue` to guess if it's phone or email (fragile)
- These are contact metadata, not "facts" about the person
- UX is confusing: dropdown to add phone/email opens same factType

## Solution

Move phone, email, and birthday to direct fields on the Contact object.

## Data Model

### Contact Type (updated)

```typescript
type Contact = {
  id: string;
  firstName: string;
  lastName?: string;
  nickname?: string;
  photoUri?: string;
  phone?: string;           // NEW
  email?: string;           // NEW
  birthdayDay?: number;     // NEW (1-31)
  birthdayMonth?: number;   // NEW (1-12)
  birthdayYear?: number;    // NEW (optional)
  highlights: string[];
  aiSummary?: string;
  iceBreakers?: string[];
  lastContactAt?: string;
  createdAt: string;
  updatedAt: string;
};
```

### Database Migration

Add columns to `contacts` table:
- `phone TEXT`
- `email TEXT`
- `birthday_day INTEGER`
- `birthday_month INTEGER`
- `birthday_year INTEGER`

### FactType Changes

Remove `'contact'` and `'birthday'` from the dropdown options when adding new facts.
Keep types in code for backward compatibility with existing data (not migrated).

## UI Components

### Edit Modals (3 separate modals)

1. **PhoneEditModal**
   - TextInput with `keyboardType="phone-pad"`
   - Placeholder: "+33 6 12 34 56 78"
   - Buttons: Cancel / Save
   - Delete button if value exists

2. **EmailEditModal**
   - TextInput with `keyboardType="email-address"`
   - Basic email format validation
   - Placeholder: "email@exemple.com"
   - Buttons: Cancel / Save
   - Delete button if value exists

3. **BirthdayEditModal**
   - Day: Numeric TextInput (1-31)
   - Month: Dropdown picker (January...December)
   - Year: Numeric TextInput (optional, placeholder "Year (optional)")
   - Buttons: Cancel / Save
   - Delete button if value exists

### ContactCard Updates

- Props change from `facts: Fact[]` to direct fields: `phone`, `email`, `birthdayDay`, `birthdayMonth`, `birthdayYear`
- Click on value or "Add..." opens corresponding modal
- Remove all `extractContactInfo()` parsing logic

## LLM Extraction

### ExtractionResult Schema

```typescript
type ExtractionResult = {
  contactIdentified: { ... };
  noteTitle: string;
  contactInfo?: {              // NEW - separate from facts
    phone?: string;
    email?: string;
    birthday?: {
      day: number;
      month: number;
      year?: number;
    };
  };
  facts: ExtractedFact[];      // No longer contains contact/birthday
  hotTopics: ExtractedHotTopic[];
  // ... rest unchanged
};
```

### Review Screen

New section "Detected contact info" displaying:
- Detected phone: `+33 6 12 34 56 78` → [Accept] [Ignore]
- Detected email: `john@mail.com` → [Accept] [Ignore]
- Detected birthday: `March 15, 1990` → [Accept] [Ignore]

Each line appears only if:
1. LLM detected a value
2. Contact doesn't have this info OR value is different

## Migration Strategy

**No migration** - Start fresh. Old facts data remains in database but is no longer displayed in ContactCard. Simpler and no data corruption risk.

## Files Impacted

### Frontend
- `types/index.ts` - Add Contact fields, modify ExtractionResult
- `lib/db.ts` - Migration for new columns
- `services/contact.service.ts` - CRUD with new fields
- `components/contact/ContactCard.tsx` - Refactor props, remove parsing
- `components/contact/PhoneEditModal.tsx` - New
- `components/contact/EmailEditModal.tsx` - New
- `components/contact/BirthdayEditModal.tsx` - New
- `app/contact/[id].tsx` - Integrate modals, pass ContactCard props
- `app/review.tsx` - "Detected contact info" section
- `locales/fr.json` + `en.json` - Modal translations

### Backend
- `src/routes/extract.ts` - Zod schema + LLM prompt for contactInfo

### Langfuse
- Check extraction quality evaluator - adapt if output format changes
