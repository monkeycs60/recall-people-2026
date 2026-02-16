Regarding Guideline 2.1 - Information Needed:

  1. Yes, our app uses third-party AI services.
  2. We use the following providers:
    - Groq (groq.com) — voice transcription (Whisper model)
    - Cerebras (cerebras.ai) — text extraction, contact summaries, AI assistant, and semantic search
    - Google Gemini (ai.google.dev) — AI avatar generation from text descriptions
  3. Data sent to each provider:
    - Groq: audio recordings for transcription. No personal identifiers attached.
    - Cerebras: transcribed text for analysis, contact detection, summaries, and question answering. No personal identifiers attached.
    - Google Gemini: text descriptions (gender, ethnicity, age range) for avatar image generation. No real photos or personal data are sent.
    - All user data is stored locally on the device. Our backend is stateless and does not persist any user content.
