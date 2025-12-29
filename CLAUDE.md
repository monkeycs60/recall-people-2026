<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# Architecture Principles

## User-First Data Privacy (SQLite Local)

This app follows a **local-first architecture** for user privacy and data control:

- **User data is stored on the device** in SQLite, not in backend databases
- The backend is **stateless for user content** — it processes requests (transcription, extraction, AI) but does NOT persist user data
- Examples: contacts, notes, facts, memories, AI summaries → all stored locally on the phone
- This gives users **full control** over their data and enables offline access

When implementing features:
- New user-facing data fields belong in the **local SQLite schema** (frontend)
- Backend endpoints should **receive and return data**, not store it
- Think "API as a service" not "API as a database"