# Manual Contact Creation

## Overview

Add ability to manually create contacts from the contacts list screen via a simple modal.

## Entry Points

1. **Header button "+"**: Next to the AI button, opens the creation modal
2. **Empty state button**: "Ajouter un contact" button below the illustration when contact list is empty

## Modal: CreateContactModal

### Fields
- **Prénom** (firstName): Required, auto-focused on open
- **Nom** (lastName): Optional

### Behavior
- Semi-transparent backdrop, centered card
- Close on backdrop tap or "Annuler" button
- "Créer" button disabled when firstName is empty
- On create:
  1. Call `contactService.create({ firstName, lastName })`
  2. Invalidate contacts query cache
  3. Close modal
  4. Navigate to `/contact/{newContactId}`

## UI Details

### Header "+" Button
- Position: Left of AI button
- Style: Same size as AI button, `Colors.primary` background
- Icon: `Plus` from lucide-react-native

### Empty State
- Keep existing illustration and text
- Add button below: "Ajouter un contact" with `UserPlus` icon

## Files to Modify

- `frontend/app/(tabs)/contacts.tsx`: Add button in header, button in empty state, modal state
- `frontend/components/contact/CreateContactModal.tsx`: New modal component
- `frontend/locales/en.json`: Add translations
- `frontend/locales/fr.json`: Add translations
