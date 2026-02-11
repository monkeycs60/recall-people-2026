# Freemium Model Redesign — Recall People

## Problem Statement

The current freemium model uses one-time credits (10 notes, 10 AI questions, 5 avatars) that exhaust quickly and never renew. Users find the app "cool but not worth paying for" — the free tier is too limited to create habit, and the perceived value isn't strong enough to justify $5.99/month.

Core feedback: **"Nice to have, but not indispensable."**

## Strategy: Reverse Trial + Contact Limit + Proactive Features

Inspired by reverse trial benchmarks (7-21% conversion vs 3-15% traditional freemium — source: Elena Verna, ex-Miro/Amplitude) and competitor analysis (Covve personal CRM: 20 contacts free at $9.99/month).

The model is built on three pillars:
1. **Reverse trial** — 14 days full access to hook users
2. **Contact-based limit** — simple, progressive, natural upgrade trigger
3. **Proactive features** — free tier gives a taste, premium gives full assistant

---

## Pricing Tiers

### Trial (14 days)

First-time users get full access for 14 days to experience the complete app.

| Feature | Limit |
|---|---|
| Contacts | 15 max |
| Notes | Unlimited |
| Avatars | 20 (15 for contacts + 5 bonus for modifications) |
| AI questions | Unlimited |
| Recording duration | 3 minutes |
| Proactive reminders | All (digest, smart reminders, post-event follow-up) |

**Goal:** User builds a contact base, experiences AI value, gets hooked on proactive reminders.

**Cost per trial user:** max $0.60 (20 avatars x $0.03).

### Free (post-trial)

After 14 days, automatic downgrade. All existing data stays accessible.

| Feature | Limit |
|---|---|
| Contacts | 15 max |
| Notes | Unlimited (on existing contacts) |
| Avatars | 5/month (new contacts + modifications) |
| AI questions | 10/month |
| Recording duration | 60 seconds |
| Proactive reminders | Basic only ("not seen in X days" with global threshold) |

**Design principles:**
- **Notes stay unlimited** — the core experience per contact is complete, no artificial friction
- **Avatars 5/month renews monthly** — covers both new contact creation and avatar modifications. If a user only created 5 contacts during trial, they use their monthly budget for the remaining 10 slots
- **AI questions 10/month** — enough to demonstrate value, not enough for daily use
- **Single proactive feature** — demonstrates the concept, creates desire for more

**Cost per free user:** max $0.15/month (5 avatars x $0.03).

### Premium — $4.99/month or $39.99/year

| Feature | Limit |
|---|---|
| Contacts | Unlimited |
| Notes | Unlimited |
| Avatars | Unlimited |
| AI questions | Unlimited |
| Recording duration | 3 minutes |
| Proactive reminders | All (digest, smart reminders, per-contact frequency, post-event follow-up) |
| Data export | JSON, CSV |
| Priority support | Yes |

**Price rationale:**
- $4.99 < psychological $5 barrier (current $5.99 perceived as "too much" for a "nice to have")
- $39.99/year = $3.33/month — obvious value vs monthly
- Covve charges $9.99/month — we undercut significantly while offering AI features

---

## Proactive Features (Lever 1)

### Free: "Not seen in X days" (basic)

**How it works:**
- Uses existing `last_contact_at` field on contacts
- User sets a global threshold in settings (default: 60 days)
- Local notification when a contact hasn't been updated in > threshold days
- Notification: "Tu n'as pas eu de nouvelles de [Contact] depuis [X] jours"
- Tapping navigates to contact page

**Implementation:** Local notifications only, no API cost, no backend changes.

### Premium: Full Proactive Suite

#### 1. Weekly Digest
- Every Monday at 9:00 AM (configurable)
- Local notification with summary:
  - Upcoming events this week (from hot topics)
  - Contacts not seen in a long time
  - Birthdays coming up
- Creates weekly habit of opening the app

#### 2. Per-Contact Reminder Frequency
- Each contact can have a custom reminder frequency:
  - "Every 2 weeks", "Every month", "Every 3 months", "Never"
- Replaces the global threshold for that contact
- UI: setting on contact detail page
- Storage: new field `reminder_frequency_days` on contacts table (local SQLite)

#### 3. Post-Event Follow-Up
- When a hot topic with `event_date` has passed and `status` is not "resolved":
  - Notification 2 days after the event date
  - "L'entretien de [Contact] c'etait cette semaine, prends des nouvelles ?"
- Leverages existing hot topic data, minimal new logic
- User can dismiss or mark hot topic as resolved

---

## Migration from Current Model

### What changes

| Current | New |
|---|---|
| 10 one-time note trials | Unlimited notes (contact-limited) |
| 10 one-time ask trials | 10/month renewable |
| 5 one-time avatar trials | 5/month renewable |
| No contact limit | 15 contacts free |
| $5.99/month | $4.99/month |
| $??/year | $39.99/year |
| No reverse trial | 14-day trial on first install |
| No proactive features | Basic reminder (free) + full suite (premium) |

### Existing users

- Users who already have > 15 contacts: grandfather them (keep existing contacts, no new ones until under limit or premium)
- Users who already have one-time trials remaining: convert to the new monthly system
- Premium users: no change (everything unlimited)

---

## Key Metrics to Track

- **Trial-to-paid conversion rate** (target: 10-15%)
- **Trial-to-free conversion rate** (target: 60-70%)
- **Free-to-paid conversion rate** (target: 5-10%)
- **Time to hit contact limit** (ideal: 2-4 weeks after trial ends)
- **Monthly avatar/AI usage per free user** (cost monitoring)
- **Notification opt-in rate** (critical for proactive features)
- **Weekly digest open rate** (premium engagement)

---

## Implementation Notes

### Backend Changes
- New trial tracking: `trial_start_date`, `trial_end_date` on User table
- Monthly avatar/AI question counters with auto-reset (replace one-time trials)
- Contact count enforcement endpoint
- Grandfathering logic for existing users

### Frontend Changes
- Trial countdown UI (days remaining banner)
- Contact limit enforcement (block creation at 15, show upgrade prompt)
- Monthly usage counters in subscription store
- Reminder frequency setting on contact page
- Global "not seen" threshold in settings
- Weekly digest notification scheduling
- Post-event follow-up notification logic

### No Backend Cost for Proactive Features
All proactive features use local notifications only. No push notification infrastructure needed. No API calls. The only recurring cost is the monthly avatar budget ($0.15/month/free user max).
