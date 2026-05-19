# App Store Assets Production Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce the approved Product Story Strip App Store screenshot set and a first 30-second App Preview video draft.

**Architecture:** A deterministic Python/Pillow generator will compose the existing real app screenshots into Apple-compatible marketing screenshots. The same generator will emit video frames that ffmpeg converts into an App Preview draft.

**Tech Stack:** Python 3, Pillow, ffmpeg, existing app screenshots, Plus Jakarta Sans font files from the Expo Google Fonts package.

---

### Task 1: Create The Asset Generator

**Files:**
- Create: `tools/app_store_assets/generate_assets.py`
- Output: `screenshots/appstore-story-strip/`

- [ ] **Step 1: Create a Python generator**

Use Pillow to create:

- 6 portrait screenshots at `1320 x 2868`.
- 1 app preview draft at `886 x 1920`, 30 seconds, 30 fps.
- A contact sheet preview.

The generator reads screenshots from `/tmp/recall-app-store-screenshots` by default and falls back to `screenshots/appstore-final` where possible.

- [ ] **Step 2: Run the generator**

Run:

```bash
python3 tools/app_store_assets/generate_assets.py
```

Expected output:

```text
Wrote screenshots/appstore-story-strip/6.9/01-remember-everyone.png
...
Wrote screenshots/appstore-story-strip/video/recall-people-preview-draft.mp4
```

### Task 2: Verify Output Formats

**Files:**
- Read: `screenshots/appstore-story-strip/`

- [ ] **Step 1: Check dimensions**

Run:

```bash
python3 tools/app_store_assets/generate_assets.py --verify-only
```

Expected:

```text
OK screenshots: 6 files at 1320x2868
OK preview: 886x1920, 30fps, <=30s
```

- [ ] **Step 2: Inspect with ffprobe**

Run:

```bash
ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate,duration -of default=nw=1 screenshots/appstore-story-strip/video/recall-people-preview-draft.mp4
```

Expected: width `886`, height `1920`, frame rate `30/1`, duration around `30`.

### Task 3: Visual Check

**Files:**
- Read: `screenshots/appstore-story-strip/contact-sheet.png`

- [ ] **Step 1: Open the contact sheet**

Use the local image viewer to inspect `screenshots/appstore-story-strip/contact-sheet.png`.

- [ ] **Step 2: Fix obvious layout issues**

If text overlaps, screenshots are unreadable, or the phone composition feels cramped, adjust the generator constants and rerun Task 1.
