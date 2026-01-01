# Landing Page Design - Recall People

## Design Principles

- **Tone:** Direct, efficient, no fluff
- **Structure:** Scenario → Revelation → Features
- **Visual:** Mini-demos (GIFs) integrated with copy
- **Language:** English (international audience)

---

## Page Structure

```
1. Hero (pain point + CTA)
2. Scenario (the story)
3. Demo Hero (voice extraction)
4. Feature: Upcoming Feed
5. Feature: Enriched Profiles
6. Feature: Semantic Search
7. Secondary Features (compact)
8. Final CTA
9. Footer
```

---

## Section 1: Hero

**Badge:** `Your social memory, upgraded`

**Headline:**
```
You forget 80% of every conversation.
```

**Subheadline:**
```
Recall remembers everything. Just talk — AI organizes the rest.
```

**CTA Primary:** `Get Started` → App Store / Play Store
**CTA Secondary:** `See how it works` → scroll to demo

**Visual:** Phone mockup with contact list (static image, subtle animation optional)

---

## Section 2: Scenario

**Background:** Slightly different color/texture to set the mood

**Headline:**
```
Sound familiar?
```

**Story (short paragraphs, conversational):**

```
You're at a work event. You meet 10 people in 2 hours.

Names, jobs, stories — you nod along, genuinely interested.

The next morning? Blank.

"What was her name again? Something with an S... She had kids, right? Or was that the other one?"

You've been there. Everyone has.
```

**Plot Twist (larger text, different style):**

```
What if you never forgot again?
```

**Transition text:**
```
Meet Recall — the app that listens so you don't have to remember.
```

---

## Section 3: Demo Hero (Voice Extraction)

**Layout:** Text left, GIF right (or stacked on mobile)

**Headline:**
```
Talk. That's it.
```

**Body:**
```
Record a quick voice note after any conversation.

"Just had coffee with Sarah. She's interviewing at Google next week,
and she's finally moving to that new apartment..."

Recall extracts names, facts, dates, and events — automatically.
No typing. No organizing. Just talking.
```

**Visual:** `demo-voice-extraction.gif`

**Small caption under GIF:** `Voice note → Structured data in seconds`

---

## Section 4: Feature — Upcoming Feed

**Layout:** Text right, GIF left

**Headline:**
```
Never miss what matters.
```

**Body:**
```
Your personal radar for the people you care about.

Sarah's job interview? Tomorrow.
Marcus's marathon? Next week.
Emma's sister's wedding? In 3 days.

Recall sends you a reminder the day before.
Show up prepared. Every time.
```

**Visual:** `demo-feed-upcoming.gif`

**Small caption:** `All upcoming events from your contacts, in one place`

---

## Section 5: Feature — Enriched Profiles

**Layout:** Text left, GIF right

**Headline:**
```
Everything you know. One glance.
```

**Body:**
```
Job, city, partner's name, hobbies, kids — it's all there.

Plus an AI-generated summary that tells you who someone
really is, not just their LinkedIn headline.

You never typed a word. Recall built it from your voice notes.
```

**Visual:** `demo-contact-profile.gif`

**Small caption:** `A complete profile, built from conversations`

---

## Section 6: Feature — Semantic Search

**Layout:** Text right, GIF left

**Headline:**
```
Find anyone with a question.
```

**Body:**
```
"Who works in tech?"
"Contacts who run marathons"
"People I met at the conference"

You don't need to remember names.
Just describe what you're looking for.
```

**Visual:** `demo-semantic-search.gif`

**Small caption:** `Natural language search across all your contacts`

---

## Section 7: Secondary Features

**Layout:** 3-column grid (icons + short text), compact

**Headline:**
```
Built for real life.
```

### Feature A: Private by Default
**Icon:** Lock
**Title:** `Your data stays yours`
**Text:** `Everything is stored locally on your phone. No cloud. No access for anyone but you.`

### Feature B: Works in 5 Languages
**Icon:** Globe
**Title:** `Speaks your language`
**Text:** `English, French, Spanish, German, Italian. Record in any language, Recall understands.`

### Feature C: Lightning Fast
**Icon:** Zap
**Title:** `Capture in seconds`
**Text:** `Open the app, tap record, talk. No menus, no friction. The fastest way to save what matters.`

---

## Section 8: Final CTA

**Background:** Gradient or accent color

**Headline:**
```
Stop forgetting. Start connecting.
```

**Subtext:**
```
Join thousands who never miss a detail again.
```

**CTA Button:** `Download Recall` (large)

**Below CTA:** App Store + Play Store badges

**Small text:** `Free to start. No credit card required.`

---

## Section 9: Footer

**Left:**
```
Recall People
© 2026 Recall People. All rights reserved.
```

**Center (links):**
```
Privacy | Terms | Support
```

**Right:**
```
Made with ♥ in Paris
```

---

## Visual Guidelines

### Colors (keep existing palette)
- Primary: Warm orange/terracotta
- Background: Light cream/beige
- Text: Dark brown/charcoal
- Accents: White cards with subtle shadows

### Typography
- Headlines: Serif (current font), bold
- Body: Sans-serif, regular weight
- Keep generous spacing

### GIF Presentation
- Display in phone mockup frame (rounded corners, white border)
- Subtle shadow
- Max width ~320px on desktop, full width on mobile
- Autoplay, loop, no controls

### Spacing
- Large padding between sections (80-120px)
- Each section should feel like its own "moment"

---

## Implementation Notes

### Files needed:
```
public/images/demos/
├── demo-voice-extraction.gif
├── demo-feed-upcoming.gif
├── demo-contact-profile.gif
└── demo-semantic-search.gif
```

### Component structure:
```
src/components/
├── Hero.tsx (update)
├── Scenario.tsx (new)
├── DemoHero.tsx (new)
├── FeatureSection.tsx (new, reusable)
├── SecondaryFeatures.tsx (new)
├── FinalCTA.tsx (new)
└── Footer.tsx (update)
```

### Mobile considerations:
- Stack all text/GIF sections vertically
- GIFs full width
- Reduce headline sizes
- Keep scenario text readable (not too small)

---

## Copy Checklist

- [x] Hero headline & subheadline
- [x] Scenario story
- [x] Demo hero copy
- [x] Upcoming feed copy
- [x] Enriched profiles copy
- [x] Semantic search copy
- [x] Secondary features (3)
- [x] Final CTA
- [x] Footer

---

## Next Steps

1. Record the 4 demo GIFs (see DEMO-SCENARIOS.md)
2. Place GIFs in `public/images/demos/`
3. Implement new components
4. Update page.tsx with new structure
5. Test on mobile
6. Deploy
