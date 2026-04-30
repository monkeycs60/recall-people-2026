---
name: seed-emulator-contacts
description: Use when asked to populate the Recall People Android emulator with many local contacts, notes, groups, hot topics, demo events, or realistic seed data.
---

# Seed Emulator Contacts

## Overview

Populate the running Recall People Android emulator by editing the app's local SQLite database. Prefer the bundled script over manual UI entry because this flow has fragile ADB, `run-as`, and SQLite WAL details.

## Quick Start

From the project root:

```bash
python3 .codex/skills/seed-emulator-contacts/scripts/seed_recall_people.py
```

Useful options:

- `--serial emulator-5554` when more than one ADB device is attached.
- `--count 45` to generate more contacts.
- `--keep-old-seed` to keep previous synthetic rows instead of replacing `seed-%` rows.
- `--no-launch` to seed without reopening the app.
- `--keep-temp` to retain the local pulled DB and backup for debugging.

Default behavior:

- Package: `com.monkeycs60.recallpeople2026`
- DB: `files/SQLite/recall_people.db`
- Dataset: 30 contacts, 90 notes, about 220 hot topics/events, 8 groups
- Preservation: keeps real/non-seed data, replaces only rows whose IDs start with `seed-`

## Workflow

1. Confirm an emulator is connected with `adb devices`.
2. Run the script from the project root.
3. Read the script output. It prints local and pushed DB counts after `PRAGMA integrity_check`.
4. If needed, verify the UI with:

```bash
adb -s emulator-5554 exec-out uiautomator dump /dev/tty > /tmp/recall-ui.xml
rg "30 personnes|Suivi refactor auth|Point refactor auth" /tmp/recall-ui.xml
```

## Failure Notes

- Stop the app before editing the DB. The script calls `am force-stop` first.
- Do not rely on emulator-side `sqlite3`; it is often missing.
- Pull `recall_people.db`, `recall_people.db-wal`, and `recall_people.db-shm` together when inspecting locally. SQLite may need WAL sidecars to see the latest schema/data.
- Avoid complex `adb shell run-as ... sh -c 'cmd; cmd'` quoting. In this project it produced `cp: Needs 1 argument`. Use separate `run-as` commands, as the script does.
- Push to `/data/local/tmp`, `chmod 644`, then copy with `run-as` into `files/SQLite`. Direct host writes into app private storage are not available.
- Remove app-side `recall_people.db-wal` and `recall_people.db-shm` after replacing the base DB so the app opens the seeded DB cleanly.

## Script

Use `scripts/seed_recall_people.py`. It creates schema if needed, backs up the pulled DB in a temp directory, seeds local SQLite, checkpoints WAL, pushes the DB back, verifies counts from the pushed app DB, and relaunches the app.
