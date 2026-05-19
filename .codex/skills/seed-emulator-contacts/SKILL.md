---
name: seed-emulator-contacts
description: Use when asked to populate the Recall People Android emulator with realistic contacts by driving the app UI/API flow through ADB.
---

# Seed Emulator Contacts

## Overview

Populate a running Recall People Android emulator by driving the app UI with ADB. Do not write SQLite directly for QA seed data: direct DB injection bypasses contact detection, AI extraction, review, sync queueing, and avatar-generation states.

## Quick Start

From the project root:

```bash
python3 .codex/skills/seed-emulator-contacts/scripts/seed_recall_people.py --serial emulator-5554
```

Useful options:

- `--dry-run` to print the six seed notes without touching the emulator.
- `--name-x`, `--name-y`, `--create-x`, `--create-y`, `--save-x`, `--save-y` if the emulator resolution differs from Pixel-style 1440x3120. Current Pixel defaults target the select-contact input around `410,760` and the Create button around `1220,760`.
- `--only "Thomas Nguyen,Romain Gauthier"` to create a subset without duplicating contacts that already exist.
- `--wait-review-seconds` if backend extraction is slower than usual; keep this conservative because a premature Save tap is ignored.
- `--skip-avatar-generation` only for QA cases where initials/placeholders are desired. By default, seeded contacts generate avatars through the normal app flow.
- `--wait-after-save-seconds` defaults to a conservative delay because the review UI may remain on `Saving...` while notifications, sync, and avatar startup finish.

Default behavior:

- Package: `com.monkeycs60.recallpeople2026`
- Activity: `com.monkeycs60.recallpeople2026/.MainActivity`
- Route: opens `recall-people://select-contact?transcription=...`
- Dataset: 6 international English-speaking contacts with distinct backgrounds and notes
- Creation path: name entry -> Create new contact -> backend extraction -> review save
- Avatar generation: enabled by default, using the app's normal AI avatar flow. Disable it only with `--skip-avatar-generation`.
- Reliability: the script uses UIAutomator labels and only taps enabled/clickable `Create` and `Save` buttons. It should fail loudly instead of silently skipping contacts.
- Between contacts, the script force-stops the app, launches `MainActivity`, then sends the deep link while the app is warm. Cold-start deep links can be ignored by Expo Router in this dev build.
- The script verifies that `Select contact` / `Who is this about?` is visible before tapping the name input, so it does not accidentally operate on the Contacts tab.

## Workflow

1. Confirm an emulator is connected with `adb devices`.
2. Confirm the app is installed, running, logged in, and past language onboarding.
3. Run the script from the project root.
4. Watch the emulator. It should create each contact through the review flow.
5. If needed, verify the UI with:

```bash
adb -s emulator-5554 exec-out uiautomator dump /dev/tty > /tmp/recall-ui.xml
rg "Thomas Nguyen|Nadia Benali|Romain Gauthier|Sofia Garcia|Mehdi Kara|Clara Simon" /tmp/recall-ui.xml
```

## Failure Notes

- If names are not entered or the Create button remains disabled, re-dump the UI and check the input coordinates. The script intentionally avoids tapping disabled labels.
- If the script gets stuck, the app is usually not logged in, backend dev server is unavailable, or button coordinates changed.
- Use `--dry-run` first when editing the seed notes.
- Keep the dataset small. Six high-signal contacts are enough for QA; large artificial datasets hide API/prompt problems.
- Avoid accents and shell-hostile punctuation in the typed contact names. Notes can contain accents because they are passed in the deep link URL.
- Do not add a fallback that writes `contacts`, `notes`, or `hot_topics` directly. That recreates the old bug this skill exists to prevent.

## Script

Use `scripts/seed_recall_people.py`. It creates six contacts by opening the select-contact route with a realistic note, typing the proposed contact name, tapping Create, waiting for backend extraction, then tapping Save on the review screen.
