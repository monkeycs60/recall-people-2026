# Recall People App Store raw asset brief

Date: 2026-05-10

This folder is intentionally raw material for App Launchpad / App Store composition, not final exported screenshots.

## Structure

- `screens/`: real Android emulator screenshots from the app.
- `characters-cutout/`: transparent full-body characters generated in the app avatar style.
- `screens-contact-sheet.png`: quick overview of captured app screens.
- `characters-contact-sheet.png`: quick overview of character assets.
- `04-processing-error-do-not-use.png`: diagnostic capture only, not a marketing asset.
- `10-onboarding-language-blocked-splash.png`: diagnostic capture only. The app stayed on the splash screen after forcing `hasSeenOnboarding=false`.

## Recommended App Store order

1. Capture note
   - Source screen: `screens/02-capture-note-ready.png` or `screens/03-text-note-filled.png`
   - Suggested headline: `Say it once`
   - Supporting copy: `Mention the person, the moment, and what matters. Recall People organizes the rest.`
   - Visual direction: large tilted phone, one cutout character on the side, no extra icons except subtle voice/memory shapes.

2. AI turns notes into useful next steps
   - Source screen: `screens/04-review-ai-existing-capture.png`
   - Suggested headline: `Your notes become next steps`
   - Supporting copy: `AI sorts the details, suggests reminders, and keeps you in control before saving.`
   - Visual direction: emphasize checked extracted items and the Save button. Avoid wording like "Review what AI found"; sell the benefit.

3. Contact profile
   - Source screen: `screens/05-contact-romain-profile.png`
   - Suggested headline: `Know what to say next`
   - Supporting copy: `Meeting context, key details, and a natural follow-up live on every profile.`
   - Visual direction: crop around Romain's profile so `Meeting context`, `Next action`, and `Essentials` are legible.

4. Upcoming events
   - Source screen: `screens/06-news-upcoming.png`
   - Suggested headline: `Follow up at the right time`
   - Supporting copy: `Birthdays, trips, launches, and promises surface before they matter.`
   - Visual direction: show the upcoming list big enough to read several contact moments.

5. Assistant
   - Source screen: `screens/07-assistant-romain-answer.png`
   - Suggested headline: `Ask your network`
   - Supporting copy: `Find the right person or next question from your own notes.`
   - Visual direction: highlight the question and answer card, not the input box alone.

6. Languages
   - Source screen: `screens/08-language-picker-real.png`
   - Suggested headline: `Built for international networks`
   - Supporting copy: `Use Recall People in English, French, Spanish, Italian, and German.`
   - Visual direction: this is the real language picker from the app. If App Store requires an onboarding-style screen, recapture it once the splash issue is fixed.

## Character usage

Use the cutout characters as secondary storytelling elements around the phone mockups. They should not hold objects or replace the app UI. Keep them smaller than the phone and avoid covering actionable UI.

Suggested pairing:

- `01-curly-founder.png`: capture note or profile.
- `02-auburn-networker.png`: capture note or assistant.
- `03-bob-operator.png`: AI sorting / review.
- `04-sage-builder.png`: upcoming events.
- `05-wavy-creator.png`: contact profile.
- `06-salt-pepper-mentor.png`: languages or assistant.

## Notes from capture

- The text-note flow failed on the emulator with `ReferenceError: Property 'DOMException' doesn't exist`; this is captured in `04-processing-error-do-not-use.png`.
- Because that blocked a fresh review capture, `screens/04-review-ai-existing-capture.png` uses the latest clean existing review screen from the previously captured app screenshot set.
- Forcing onboarding by setting `settings-store.hasSeenOnboarding=false` left the app on the splash screen in this dev build, so `screens/08-language-picker-real.png` is currently the usable real language UI capture.
