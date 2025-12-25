# Recall People - UI/UX Redesign

**Date:** 2025-12-25
**Status:** Approved

## Overview

Complete UI/UX redesign of Recall People app to move away from generic "AI slop" aesthetics toward a distinctive, premium, and memorable visual identity.

## Design Direction

### Positioning
**Luxe & Refined with Human Warmth**

Recall People is a personal CRM for human relationships. The design must convey:
- Trust and seriousness (handling personal information)
- Warmth and humanity (it's about relationships, not data)
- Premium quality (justifies subscription pricing)
- Timelessness (memories, legacy)

### Key Differentiators
- Light mode only (most premium apps default to dark - we stand out)
- Terracotta/Amber accent (rare in tech, warm, memorable)
- Serif typography for titles (editorial, magazine-like feel)
- Minimalist zen approach (quality over feature density)

---

## Design System

### Color Palette

```
// Backgrounds
background:        #FAF7F2  // Warm cream/ivory
surface:           #FFFFFF  // Pure white (cards, inputs)
surfaceElevated:   #FFFFFF  // Elevated surfaces with shadow

// Text
textPrimary:       #1A1612  // Warm black
textSecondary:     #6B5E54  // Warm gray
textMuted:         #A69B8F  // Muted/disabled
textInverse:       #FFFFFF  // Text on dark backgrounds

// Accent - Terracotta/Amber
primary:           #C67C4E  // Main terracotta
primaryLight:      #E8D5C4  // Light amber (backgrounds, highlights)
primaryDark:       #A65D2E  // Darker terracotta (pressed states)

// Semantic
success:           #5D8C5A  // Sage green
warning:           #D4A34A  // Golden amber
error:             #C45C4A  // Terracotta red
info:              #5C7A8C  // Muted blue-gray

// Borders & Dividers
border:            #E8E2DB  // Subtle warm gray
borderLight:       #F2EDE6  // Very subtle
```

### Typography

**Title Font:** Playfair Display (serif)
- Used for: Screen titles, headings, brand elements
- Weights: 400 (regular), 600 (semibold), 700 (bold)

**Body Font:** System default (SF Pro on iOS, Roboto on Android)
- Used for: Body text, labels, buttons
- Weights: 400, 500, 600

**Type Scale:**
```
displayLarge:   32px / Playfair Display Bold
displayMedium:  28px / Playfair Display SemiBold
headlineLarge:  24px / Playfair Display SemiBold
headlineMedium: 20px / Playfair Display Medium
titleLarge:     18px / System SemiBold
titleMedium:    16px / System Medium
bodyLarge:      16px / System Regular
bodyMedium:     14px / System Regular
bodySmall:      12px / System Regular
labelLarge:     14px / System Medium
labelMedium:    12px / System Medium
labelSmall:     10px / System Medium (uppercase for tags)
```

### Spacing Scale

```
xs:   4px
sm:   8px
md:   16px
lg:   24px
xl:   32px
2xl:  48px
3xl:  64px
```

### Border Radius

```
sm:   8px   // Buttons, small elements
md:   12px  // Cards, inputs
lg:   16px  // Modals, large cards
xl:   24px  // Pills, FAB
full: 9999px // Circular elements
```

### Shadows

```
sm:   0 1px 2px rgba(26, 22, 18, 0.05)
md:   0 4px 12px rgba(26, 22, 18, 0.08)
lg:   0 8px 24px rgba(26, 22, 18, 0.12)
xl:   0 16px 48px rgba(26, 22, 18, 0.16)
```

---

## Screen Specifications

### 1. Login Screen

**Layout:** Immersive branding experience

**Components:**
- Top 40%: Decorative illustration/pattern area
  - Abstract warm gradient mesh or geometric pattern
  - App logo "Recall People" in Playfair Display
  - Tagline: "N'oubliez jamais ce qui compte"
- Bottom 60%: Authentication form
  - Email input with warm border
  - Password input
  - Primary CTA: "Se connecter" (terracotta filled)
  - Divider with "ou"
  - Google Sign-in button (outlined)
  - Link: "Pas de compte ? Creer un compte"

**Animations:**
- Subtle parallax on decorative area
- Inputs focus with smooth border color transition

---

### 2. Home Screen (Recording)

**Layout:** Minimalist zen with pedagogical helper

**Components:**
- Top: App wordmark "Recall People" (Playfair, centered)
- Center: Large record button
  - Circular, terracotta fill
  - White microphone icon
  - Subtle shadow
  - Outer ring that animates when recording
- Below button: Helper text (cycling prompts)
  - "Citez le nom de la personne..."
  - "Parlez de votre rencontre..."
  - "Mentionnez des details personnels..."
  - Subtle fade transition between prompts
- Recording state:
  - Button pulses with ring animation
  - Timer appears above button
  - Waveform visualization below
  - "Appuyez pour terminer" label

**No header, no extra elements** - pure focus on the action.

---

### 3. Contacts Screen

**Layout:** List of enriched contact cards

**Header:**
- Title: "Contacts" (Playfair Display)
- Search icon (opens search overlay)

**Search Bar:**
- Integrated at top, subtle cream background
- Placeholder: "Rechercher un contact..."

**Filter Pills:**
- Horizontal scroll
- "Tous" (selected by default, filled terracotta)
- Group names as pills (outlined)

**Contact Cards:**
- White background, subtle shadow
- Left: Avatar (initials in terracotta circle or photo)
- Content:
  - Name (titleMedium, bold)
  - 2 key facts as subtle tags: "Boucher" "Bordeaux"
  - Hot topic badge if exists: "Debut aviron" with amber dot
- Right: Chevron or last contact date
- Tap: Navigate to contact detail

**Empty State:**
- Illustration
- "Aucun contact"
- "Enregistrez votre premiere note pour commencer"

---

### 4. Contact Detail Screen

**Header:**
- Back arrow
- "Contact" label

**Hero Section:**
- Large avatar (centered, with terracotta ring)
- Name (displayMedium, Playfair)
- Edit icon next to name
- Groups as pills below name

**Quick Actions:**
- "Ajouter une note" button (terracotta, full width)

**AI Summary Card:**
- Cream background
- AI-generated summary text
- Subtle sparkle icon

**Sections (collapsible):**
1. **Actualites / Hot Topics**
   - Cards with amber indicator dot
   - Topic text + context
   - Tap to expand

2. **Profil / Facts**
   - List of facts with category labels
   - Icon per category (briefcase for job, map-pin for city, etc.)
   - Delete action (swipe or icon)

3. **Souvenirs / Memories**
   - Timeline of past notes
   - Date + snippet

**Animations:**
- Sections expand/collapse with spring animation
- Cards have subtle scale on press

---

### 5. Search Screen (AI Search)

**Layout:** Search-first with results

**Header:**
- Title: "Recherche" (Playfair)

**Search Input:**
- Large, prominent
- AI sparkle icon
- Placeholder: "Posez une question sur vos contacts..."
- Send button (terracotta)

**Suggestions (when empty):**
- "Exemples :"
- Tappable suggestion chips:
  - "Qui fait de la musique ?"
  - "Contacts qui aiment le sport"
  - "Qui travaille dans la tech ?"

**Results:**
- List of contact cards matching query
- Highlighted relevant facts
- AI explanation of why they matched

---

### 6. Profile Screen

**Header:**
- Title: "Profil" (Playfair)

**User Section:**
- Avatar (large)
- Username
- Email (muted)

**Settings Groups:**
- Section headers in labelSmall uppercase
- Rows with icon + label + value/chevron

**Sections:**
1. LANGUE
   - Langue de l'app (Francais >)

2. DONNEES
   - Statistiques (>)
   - Exporter mes donnees (>)
   - Vider le cache (>)

3. A PROPOS
   - Version (1.0.0)
   - Donner un feedback (>)
   - Mentions legales (>)

4. COMPTE
   - Se deconnecter (red text)

---

### 7. Navigation (Tab Bar + FAB)

**Structure:** 2 tabs + central FAB

**Tabs:**
- Left: Contacts (icon: users)
- Right: Profil (icon: user)

**Center FAB:**
- Large terracotta circle
- White microphone icon
- Elevated with shadow
- Always visible, always accessible
- Tap: Navigate to recording screen (or trigger recording modal)

**Tab Bar Style:**
- White background
- Subtle top border
- Icons: terracotta when active, warm gray when inactive
- Labels below icons

---

## Animations (React Native Reanimated)

### Global Transitions
- Screen transitions: Shared element transitions where possible
- Lists: Staggered fade-in on mount

### Component-Specific

**Record Button:**
- Idle: Subtle shadow pulse (very slow, barely noticeable)
- Press: Scale down to 0.95 with spring
- Recording: Outer ring expands/contracts rhythmically

**Contact Cards:**
- Press: Scale to 0.98, opacity to 0.9
- Release: Spring back

**FAB:**
- Press: Scale to 0.9
- Icon rotates slightly on press

**Inputs:**
- Focus: Border color transition (200ms ease)
- Label: Slides up when focused (if using floating labels)

**Bottom Sheets:**
- Spring animation on open/close
- Backdrop fade

**Success States:**
- Checkmark draws in with SVG animation
- Subtle confetti or particle burst (optional, for key moments)

---

## Implementation Priority

1. Design System (tailwind config, fonts, constants)
2. Navigation restructure (3 tabs + FAB)
3. Login screen
4. Home/Recording screen
5. Contacts list
6. Contact detail
7. Search screen
8. Profile screen
9. Polish & animations

---

## Technical Notes

- Framework: React Native + Expo
- Styling: NativeWind (Tailwind CSS)
- Animations: react-native-reanimated
- Fonts: expo-google-fonts for Playfair Display
- Icons: lucide-react-native (existing)

### Font Setup
```bash
npx expo install @expo-google-fonts/playfair-display expo-font
```

### Tailwind Config Updates
- New color palette
- Custom font family
- Updated spacing/radius if needed
