# Contact Enhancements Design

**Date:** 2025-12-27

## Overview

Three enhancements to the contact detail page:
1. Contact card with phone, email, birthday in profile header
2. Improved "other" facts with title + description
3. Delete contact via menu with confirmation

---

## 1. Contact Card (Phone, Email, Birthday)

### Positioning
- Located at the **top of the Profile section**, above other facts
- Visually differentiated (card/business card style)
- Always visible (even when empty, to encourage completion)

### Fields

| Field | Display | Interaction |
|-------|---------|-------------|
| Phone | Phone number | Dropdown menu: Appeler, WhatsApp, SMS, Copier |
| Email | Email address | Dropdown menu: Ouvrir mail, Copier |
| Birthday | "15 mars (32 ans)" + countdown if < 30 days | Read-only display |

### Birthday Display Logic
- Format: "DD mois (XX ans)"
- If birthday within 30 days: append "Dans X jours !"
- Calculate age from birth year (if available)

### Empty State
- Each missing field shows clickable placeholder: "+ Ajouter téléphone", "+ Ajouter email", "+ Ajouter anniversaire"
- Clicking opens the fact creation flow with pre-selected type

### Data Source
- Uses existing facts: `factType: 'contact'` for phone/email, `factType: 'birthday'` for birthday
- No new fields on Contact model

### Anti-Duplication
- Facts of type `birthday` and `contact` are **filtered out** from the regular ProfileCard facts list
- They appear ONLY in the contact card header
- Other facts (work, hobby, etc.) display normally below

---

## 2. Improved "Other" Section

### Problem
Currently, "other" facts only have a `value` field, which is too imprecise for miscellaneous information.

### Solution
Add a **title** field (required) alongside the existing **value** (renamed conceptually to "description").

### Schema Changes

```sql
-- Add title column to facts table
ALTER TABLE facts ADD COLUMN title VARCHAR(255) NULL;
```

- `title`: string, nullable (only used for `factType: 'other'`)
- Existing "other" facts: `title = null`, can be completed manually or left as-is

### LLM Extraction Changes

Update the extraction prompt to generate title + description for "other" facts:

```json
{
  "factType": "other",
  "title": "Allergie alimentaire",
  "value": "Ne mange pas de fruits de mer, allergie sévère"
}
```

### UI Display

Each "other" fact displays as a mini-card:
- **Title** in bold at top
- **Description** below in regular text
- Vertical list of these mini-cards in the "Autre" section

### Validation
- Both title and description required when creating/editing "other" facts
- Form validation enforces this

---

## 3. Delete Contact

### Menu Placement
- Three-dot menu icon (...) in top-right of header
- Opens dropdown with "Supprimer le contact" option
- Extensible for future actions

### Confirmation Dialog
- **Title:** "Supprimer ce contact ?"
- **Body:**
  - Contact photo + name
  - "Cette action est irréversible. Toutes les notes, souvenirs et informations seront supprimés."
- **Buttons:**
  - "Annuler" (secondary)
  - "Supprimer" (destructive, red)

### Cleanup
- Remove existing delete button at bottom of page
- After deletion: redirect to contacts list

### API
- Use existing `DELETE /contacts/:id` endpoint
- Backend handles cascade deletion: facts, notes, memories, hot topics

---

## Implementation Order

1. **Schema migration** - Add `title` column to facts
2. **Backend** - Update fact creation/update to handle title
3. **LLM prompt** - Update extraction for "other" facts with title
4. **Contact Card component** - New component for phone/email/birthday
5. **ProfileCard update** - Filter out contact/birthday facts, add ContactCard header
6. **Other facts UI** - Update display for title + description
7. **Delete menu** - Add three-dot menu with delete option
8. **Delete dialog** - Confirmation with contact info
9. **Cleanup** - Remove bottom delete button

---

## Files to Modify

### Backend
- `backend/prisma/schema.prisma` - Add title field
- `backend/src/routes/facts.ts` - Handle title in CRUD
- `backend/src/services/extraction/` - Update LLM prompt for "other" facts

### Frontend
- `frontend/components/contact/ContactCard.tsx` - New component
- `frontend/components/contact/ProfileCard.tsx` - Filter facts, integrate ContactCard
- `frontend/app/contact/[id].tsx` - Add menu, remove bottom delete button
- `frontend/components/contact/DeleteContactDialog.tsx` - New component
