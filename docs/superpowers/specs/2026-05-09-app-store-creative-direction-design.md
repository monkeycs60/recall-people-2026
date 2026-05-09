# Recall People App Store Creative Direction

Date: 2026-05-09

## Goal

Create a stronger App Store media set for Recall People: one 30-second App Preview video plus a screenshot sequence that tells a clear story.

The creative direction is **Product Story Strip**: bright, modern, premium, and centered on the core flow:

1. Capture a quick voice note.
2. Let AI extract contact context, events, and follow-ups.
3. Open a rich contact profile.
4. Follow up at the right moment.
5. Ask the assistant questions from your own notes.

This differentiates Recall People from competitors that lean either into generic contact management or broad relationship journaling. Recall People should own the promise: **remember people without doing admin work**.

## Competitive Positioning

### RecallVerse

RecallVerse appears closer to a business/networking contact manager: professional network, business card/contact organization, and search. We should avoid looking like a heavy CRM or address book.

### Recall - Remember People

Recall - Remember People appears closer to a people-memory app. We should avoid being only emotional or journal-like. The differentiator is the operational flow: voice note -> AI review -> reminders -> assistant.

## Visual Direction

Use the Recall People palette:

- Lavender / off-white background.
- Strong purple primary.
- Soft peach and amber accents for follow-up cards.
- Real app screenshots inside clean phone mockups.
- Light avatar/relationship touches, but the UI remains the hero.

Do not overuse abstract AI visuals. The product should feel human, practical, and private, not like a generic AI SaaS template.

## Screenshot Sequence

Use five core screenshots first. Additional screenshots can exist, but the first five should be the main conversion story.

### 1. Remember everyone you meet

Source screen: contacts list.

Subcopy: `Your network, organized from quick notes.`

Purpose: establish the product category instantly. This is not a normal address book; contacts have events, memories, avatars, and context.

### 2. Capture a note in seconds

Source screen: voice capture ready state.

Subcopy: `Speak naturally after a meeting, call, dinner, or event.`

Purpose: show the low-friction input. This is the main differentiator versus manual CRMs.

### 3. AI finds what matters

Source screen: review screen after creating Maya Brooks.

Subcopy: `Names, events, reminders, and follow-ups stay under your control.`

Purpose: show the “magic moment” while reassuring that the user reviews extracted info before saving.

### 4. Follow up at the right time

Source screen: Upcoming / News tab.

Subcopy: `Birthdays, trips, launches, meetings, and moments worth remembering.`

Purpose: show the practical retention loop. The app is useful after capture, not only during note-taking.

### 5. Ask your network anything

Source screen: assistant answer about Romain.

Subcopy: `Get answers from your own relationship notes.`

Purpose: show semantic retrieval and the value of accumulated notes.

### Optional 6. Know what to ask next

Source screen: Romain profile.

Subcopy: `Meeting context, essentials, and a natural next action.`

Purpose: this can be used if App Store layout benefits from an extra feature screenshot, or as a custom product page variant focused on follow-up quality.

## App Preview Video

The video should be 30 seconds, portrait, built mostly from real app UI footage. Text overlays are allowed for clarity, but the video should remain a product demonstration.

Apple states that app previews can be up to 30 seconds, should demonstrate features, functionality, and UI, and autoplay muted, so the first seconds must work visually without sound.

### Timeline

0-3s: Hook

- Overlay: `Met someone important?`
- Visual: app opens on Recall People capture screen or contacts screen.

3-8s: Voice-first capture

- Overlay: `Capture a note in seconds`
- Visual: voice note screen, then short text note equivalent if needed for clarity.

8-15s: AI review

- Overlay: `AI finds names, events, and follow-ups`
- Visual: review screen with Maya Brooks, two extracted news items, reminder date.

15-22s: Contact memory

- Overlay: `Turn it into relationship memory`
- Visual: Romain profile with meeting context, next action, and essentials.

22-27s: Assistant

- Overlay: `Ask your network anything`
- Visual: assistant answer sourced from notes.

27-30s: Closing

- Overlay: `Recall People`
- Subcopy: `Remember everyone you meet.`
- Visual: logo + quick montage of contact/upcoming/assistant.

## App Preview Technical Guardrails

Follow Apple’s current App Preview requirements:

- Length: 15-30 seconds.
- Max file size: 500 MB.
- H.264 or ProRes 422 HQ.
- Max frame rate: 30 fps.
- Audio track: stereo AAC or PCM, even if the preview is designed to work muted.
- Accepted extensions include `.mov`, `.m4v`, `.mp4` for H.264.

## Copy Tone

Keep copy short and direct. Avoid generic “AI-powered productivity” phrasing.

Good:

- `Capture a note in seconds`
- `AI finds what matters`
- `Follow up at the right time`
- `Ask your network anything`

Avoid:

- `Unlock relationship intelligence`
- `Supercharge your networking`
- `AI-powered contact management`

## Production Plan

1. Use the existing targeted screenshots as the raw in-app footage:
   - `/tmp/recall-app-store-screenshots/01-contacts-list.png`
   - `/tmp/recall-app-store-screenshots/02-news-upcoming.png`
   - `/tmp/recall-app-store-screenshots/03-romain-detail.png`
   - `/tmp/recall-app-store-screenshots/04-assistant-romain-answer.png`
   - `/tmp/recall-app-store-screenshots/05-voice-capture-ready.png`
   - `/tmp/recall-app-store-screenshots/06-review-new-contact.png`
2. Build App Launchpad-style screenshot compositions with the Product Story Strip direction.
3. Keep the phone screenshots real and readable; use backgrounds, captions, and light decorative elements around them.
4. Produce a 30-second App Preview using real app screen recording or a faithful animation of the real screenshots.
5. Export using App Store device presets.

## Open Decision

Primary language for the first production set: English.

French and other localizations can reuse the layout later, but the first version should target the international store positioning.
