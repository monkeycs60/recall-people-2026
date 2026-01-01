# Demo Scenarios for Landing Page

## Technical Setup

**Tool:** Peek (installed)
- Run `peek` from terminal
- Resize window over Android Studio emulator
- Preferences: Format GIF, 15fps, High quality
- Ideal duration: 5-10 sec per demo

**Output:** Save GIFs in `landing-page/public/images/demos/`

**Language:** App must be set to ENGLISH for all demos

---

## Pre-requisites: Contacts & Data Setup

Before recording, you need realistic contacts with rich data. Here's what to set up:

### Contact 1: Sarah Chen
**Role:** Tech professional, main demo contact
**Groups:** Work, Tech

**Facts to have:**
- Job: Product Manager at Spotify
- City: Berlin
- Partner: James (works in finance)
- Hobby: Rock climbing, photography
- Origin: San Francisco

**Hot Topics (with dates):**
- "Job interview at Google" → in 5 days
- "Moving to a new apartment" → in 2 weeks

**AI Summary example:**
"Sarah is a Product Manager at Spotify based in Berlin. Originally from San Francisco, she moved to Europe 3 years ago. She's passionate about rock climbing and photography. Currently interviewing at Google and planning to move apartments soon. Lives with James who works in finance."

---

### Contact 2: Marcus Johnson
**Role:** Networking contact
**Groups:** Networking, Sports

**Facts to have:**
- Job: Founder at a fintech startup
- City: London
- Children: 2 kids (Emma, 7 and Lucas, 4)
- Hobby: Marathon running, chess
- Partner: Lisa (pediatrician)

**Hot Topics (with dates):**
- "Running the Berlin Marathon" → in 10 days
- "Series A fundraising" → in 3 weeks

---

### Contact 3: Emma Rodriguez
**Role:** Friend of a friend
**Groups:** Friends

**Facts to have:**
- Job: UX Designer at Airbnb
- City: Barcelona
- Hobby: Salsa dancing, cooking
- Pet: Dog named Coco

**Hot Topics (with dates):**
- "Sister's wedding in Mexico" → in 1 week

---

## Voice Note Scripts

Record these voice notes to populate the app with realistic data BEFORE recording the demos.

### Script 1: For Sarah Chen (to create rich profile)

> "Just had coffee with Sarah. She's still at Spotify as a Product Manager, really enjoying Berlin. She mentioned she's interviewing at Google next week, seems pretty excited about it. She's also looking for a new apartment, wants something closer to her climbing gym. Oh and I finally met James, her boyfriend - nice guy, works in finance at Deutsche Bank. She showed me some amazing photos from her recent trip to Portugal, she's really getting into photography."

---

### Script 2: For Marcus Johnson (networking contact)

> "Met Marcus at the tech meetup tonight. He's the founder of a fintech startup, been running it for 2 years. Based in London but travels a lot. He's running the Berlin Marathon in about 10 days, been training like crazy. Has two kids, Emma who's 7 and Lucas who's 4. His wife Lisa is a pediatrician. They're also in the middle of raising their Series A, should close in a few weeks."

---

### Script 3: For Emma Rodriguez (casual contact)

> "Ran into Emma at the party, she's a UX Designer at Airbnb now, moved to Barcelona last year. She's super into salsa dancing, goes three times a week. Her sister is getting married next week in Mexico so she's flying out soon. Oh and she has the cutest dog, a golden retriever named Coco."

---

### Script 4: For Demo 1 - LIVE recording (voice extraction demo)

This is the script you'll actually record DURING the demo to show the extraction:

> "Quick update on Sarah. Her Google interview went really well, she made it to the final round. Also she found an apartment, signing the lease next Monday. She invited me to her housewarming party in two weeks."

---

## Demo 1: Voice Capture → AI Extraction

**File:** `demo-voice-extraction.gif`
**Duration:** 8-10 sec
**Story:** Show the magic of automatic extraction

**Setup:**
- Have Sarah Chen's contact open
- App in English

**Actions:**
1. Start on Sarah's contact screen
2. Tap "Add a note" (mic button)
3. Recording starts → say Script 4 (or pretend to speak for 3 sec)
4. Stop → Review screen appears
5. Show the extracted facts/hot topics
6. End on the extracted info clearly visible

**What it demonstrates:** You talk, AI structures. Zero effort.

---

## Demo 2: Upcoming Events Feed

**File:** `demo-feed-upcoming.gif`
**Duration:** 5-7 sec
**Story:** Your fairy godmother reminding you of everything

**Setup:**
- Have 4-5 dated events from different contacts
- Events spread across: Today, Tomorrow, This week, Next week

**Actions:**
1. Open the "Upcoming" tab (events feed)
2. Scroll slowly to show events grouped by date
3. Show events like "Sarah - Google interview", "Marcus - Berlin Marathon"

**What it demonstrates:** Never forget an important event again.

---

## Demo 3: Enriched Profile

**File:** `demo-contact-profile.gif`
**Duration:** 6-8 sec
**Story:** Everything you know about someone, at a glance

**Setup:**
- Sarah Chen's profile fully populated
- Has: AI summary, facts, hot topics, tags

**Actions:**
1. Open Sarah's contact
2. Scroll slowly to reveal:
   - AI Summary at top
   - Profile info (job, city, partner, hobbies)
   - Active hot topics / news
   - Tags (Work, Tech)
3. Pause on the AI summary

**What it demonstrates:** A complete profile without ever typing a line.

---

## Demo 4: Semantic Search

**File:** `demo-semantic-search.gif`
**Duration:** 5-6 sec
**Story:** Find anyone with a natural question

**Setup:**
- Multiple contacts with varied jobs/hobbies
- At least one in tech, one in finance, one who does sports

**Actions:**
1. On contacts screen, tap the AI search button
2. Type: "Who works in tech?" or "Contacts who like sports"
3. Show results appearing (Sarah for tech, Marcus for sports)

**What it demonstrates:** No need to remember names, just what you're looking for.

---

## Recording Order (recommended)

1. **Demo 3** (Profile) - Easiest, just scrolling
2. **Demo 2** (Feed) - Easy, just navigation
3. **Demo 4** (Search) - Type + results
4. **Demo 1** (Voice) - Most complex, requires actual recording

---

## Pre-recording Checklist

- [ ] Emulator in portrait mode, clean (no random notifications)
- [ ] Realistic test data (credible names, not "Test User")
- [ ] Clean status bar (normal time, battery OK)
- [ ] App language set to ENGLISH
- [ ] Peek configured: GIF, 15fps, High quality
- [ ] Record voice notes (Scripts 1-3) to populate data first
- [ ] Verify Upcoming feed has 4-5 events visible
- [ ] Verify Sarah's profile is fully populated with AI summary

---

## Output Files

Save all GIFs to: `landing-page/public/images/demos/`

```
demos/
├── demo-voice-extraction.gif
├── demo-feed-upcoming.gif
├── demo-contact-profile.gif
└── demo-semantic-search.gif
```
