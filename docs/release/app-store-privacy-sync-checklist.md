# App Store Connect / Google Play Data Safety Sync Checklist

Use this checklist when submitting the account-based secure sync release. It aligns the store disclosures with the current product position: relationship data syncs through the user's account, sensitive relationship content is encrypted in the database, personal data is not sold, and personal data is not used to train AI models.

## Product Privacy Position

- Relationship data syncs through the user's account so contacts, notes, reminders, groups, tags, events, summaries, and relationship context can be available across devices.
- Sensitive relationship content is encrypted in the database and transmitted over HTTPS.
- Personal data is not sold.
- Personal data is not used to train AI models.
- Third-party AI processing is disabled until the user gives explicit, versioned consent; declining leaves non-AI features available.
- AI providers process content only as needed for requested features such as transcription, extraction, summaries, assistant answers, semantic search, and avatar generation.
- Product analytics and error diagnostics use PostHog Cloud EU. Session replay is disabled and product events do not contain relationship content.
- Deleting the app from one device does not automatically delete synced account data; account deletion must remove account-associated data subject to legal, billing, security, and abuse-prevention retention needs.

## App Store Connect Privacy Nutrition Label

- Confirm the app collects contact info:
  - Name
  - Email address
  - Phone number, when users add it to contacts
  - Physical address, when users add it to contacts
  - Other user contact info, when users add it to contacts
- Confirm the app collects user content:
  - Notes and memories
  - Voice recordings submitted for transcription
  - Transcriptions
  - AI-generated summaries, reminders, events, groups, tags, and relationship context
  - Avatar generation prompts or descriptions
- Confirm the app collects identifiers:
  - User ID / account ID
  - Authentication identifiers or tokens
- Confirm the app collects purchases:
  - Subscription status and entitlement metadata through RevenueCat / stores
- Confirm the app collects usage data and diagnostics where applicable:
  - Feature usage counters and plan-limit usage
  - Security, abuse-prevention, debugging, and reliability logs
  - Product and website interaction analytics through PostHog Cloud EU
- For each collected category, mark purposes that apply:
  - App functionality
  - Analytics, only for aggregate product or website usage where implemented
  - Developer communications, only if email/account messaging is used
  - Fraud prevention, security, and compliance
- Do not mark data as sold or used for third-party advertising.
- Do not claim data is restricted to device storage.
- Do not claim stronger encryption or restore guarantees than the implemented account sync supports.
- Verify third-party processor entries match current implementation:
  - Groq for speech-to-text transcription
  - Cerebras for AI analysis, extraction, summaries, search, and assistant features
  - OpenAI GPT Image 2 for avatar generation
  - xAI Grok for sampled AI response quality evaluation when enabled
  - RevenueCat for subscription entitlement management
  - Apple Sign-In / Google Sign-In for authentication where enabled
  - PostHog Cloud EU for product analytics, error diagnostics, reliability, and redacted AI operational telemetry

## Google Play Data Safety

- Mark data collection as required for core app functionality when needed for account sync and relationship features.
- Declare account and profile data:
  - Email address
  - Name, if provided
  - User IDs / account IDs
- Declare contacts / personal info users enter about others:
  - Names
  - Phone numbers
  - Email addresses
  - Birthdays, events, addresses, companies, roles, and relationship details when entered
- Declare app activity / user content:
  - Notes and memories
  - Voice recordings submitted for transcription
  - Transcriptions
  - Assistant prompts and responses
  - AI-generated summaries, reminders, tags, groups, events, and avatars
- Declare financial data only if Google Play requires subscription purchase / entitlement metadata to be represented there; otherwise disclose under purchases/subscriptions as store-managed data.
- Declare diagnostics / security logs:
  - Crash or debug logs, if collected
  - IP address, user agent, action type, and success/failure status where retained for security
- For each data type, select purposes that apply:
  - App functionality
  - Account management
  - Analytics, only for aggregate usage where implemented
  - Fraud prevention, security, and compliance
  - Developer communications, only if used
- Mark data as encrypted in transit.
- Mark users can request data deletion.
- Do not mark data as sold.
- Do not claim data is only processed on the user's device.
- Do not claim data is used for advertising or AI model training.

## Release Verification

- Backend deployment has `SYNC_ENCRYPTION_KEY` configured as a base64-encoded 32-byte secret before the first synced user writes data.
- Backend deployment has `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`, and `APPLE_CLIENT_ID` configured so Sign in with Apple authorization is revoked during account deletion.
- Prisma migration `20260509000000_add_account_sync` has been applied before releasing clients that call `/api/sync/*`.
- Release counters are aligned to iOS 1.0.8 build 34 and Android 1.0.8 versionCode 14.
- No new OS permissions are required for account sync; it uses authenticated HTTPS API calls.
- Privacy Policy says relationship data syncs through the account.
- Privacy Policy says sensitive data is encrypted in the database.
- Privacy Policy says personal data is not sold.
- Privacy Policy says personal data is not used to train AI models.
- Privacy Policy identifies PostHog and all third-party AI providers, describes the data sent, and explains the explicit AI choice.
- Mobile and landing PostHog session replay remain disabled; AI observability keeps prompt and output content redacted.
- Account deletion is tested with credentials, Google-linked, and Apple-linked accounts; active subscribers receive a billing warning without being prevented from deleting immediately.
- Terms do not tell users they are solely responsible for preserving single-device data.
- Landing page and FAQ do not mention single-device storage, unsupported restore methods, or stronger encryption claims than implemented.
- Store screenshots, onboarding copy, paywall copy, and support macros match this account-sync position before submission.
