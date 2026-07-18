# App Store submission — Recall People 1.0.8

Prepared on July 19, 2026. Replace every `[TO COMPLETE]` value before sending the version to App Review.

## What’s New

### English

Stay on top of the people and moments that matter. Recall People now gives you clearer, configurable reminders before events, on the day, and after important moments, with snooze and follow-up actions right from a contact. Voice-note processing is more reliable, and failed notes can be retried without recording again. This update also improves privacy controls, account deletion, avatars, translations, and everyday polish.

### French

Gardez le fil avec les personnes et les moments qui comptent. Recall People propose désormais des rappels plus clairs et configurables avant, le jour même et après un événement, avec report et suivi depuis la fiche du contact. Le traitement des notes vocales est plus fiable et peut être relancé sans réenregistrer. Cette version améliore aussi la confidentialité, la suppression du compte, les avatars, les traductions et plusieurs détails du quotidien.

## App Review Notes

Copy and adapt this block in App Store Connect:

> Recall People is a personal relationship CRM with optional AI features and auto-renewable subscriptions.
>
> Review account: `[TO COMPLETE: email]` / `[TO COMPLETE: password]`
>
> AI consent: no disclosure interrupts sign-in or app launch. When the reviewer first requests an AI feature, a compact contextual sheet explains that the requested action uses external AI processing and asks for permission before any data is shared. “Learn more” expands the same sheet to identify Groq, Cerebras, OpenAI, and xAI and the data used for transcription, text analysis, avatar generation, and optional sampled quality evaluation. The reviewer may choose “Not now”; the request is cancelled and non-AI features remain available. After “Allow and continue” is selected, the original action resumes automatically. The choice and full details remain accessible under Profile → Data → AI data processing.
>
> Account deletion: Profile → Data → Delete Account. Deletion is available inside the app and is not delayed. Apple-linked accounts are asked to reauthenticate so the app can revoke the Sign in with Apple authorization before deleting account data. Active subscribers see an App Store billing warning and may still continue deletion immediately.
>
> Notifications: event, birthday, inactive-contact, post-event, and weekly-digest reminders are scheduled locally on the device. The app asks for notification permission in context.
>
> In-app purchase: open Profile → Upgrade to Pro. Products are loaded through RevenueCat from App Store Connect. `[TO COMPLETE: confirm product IDs and review account/storefront]`
>
> Privacy Policy: https://recallpeople.com/privacy
> Terms of Service: https://recallpeople.com/terms
> Support: support@recallpeople.com

## Recommended App Privacy answers

Confirm these against the production configuration immediately before submission. The current implementation does not perform advertising, sell data, enable PostHog session replay, or track users across other companies’ apps and websites.

| Apple data type | Examples in Recall People | Linked to identity | Main purposes |
| --- | --- | --- | --- |
| Contact Info | Account name/email and contact names, emails, phone numbers, addresses entered by the user | Yes | App Functionality, Account Management |
| User Content | Notes, transcriptions, audio submitted for transcription, photos selected for profile/avatar use, AI questions and generated relationship content | Yes | App Functionality |
| Identifiers | Internal user/account ID and authentication identifiers | Yes | App Functionality, Analytics, Fraud Prevention/Security |
| Purchases | Subscription and entitlement status from Apple/RevenueCat | Yes | App Functionality |
| Usage Data → Product Interaction | Feature events and non-content counters/booleans in PostHog | Yes, by internal user ID in the app/backend | Analytics, App Functionality |
| Diagnostics → Crash Data / Other Diagnostic Data | Exceptions, model/provider, latency, token/cost and reliability metadata with AI prompt/output redaction | May be linked to internal user ID | Analytics, App Functionality |

- Tracking: **No**.
- Third-party advertising: **No**.
- Developer advertising or marketing based on collected app data: **No**, unless production behavior changes.
- Audio recordings: submitted to Groq for transcription and not stored by Recall People after processing.
- AI providers: Groq (transcription), Cerebras (text analysis), OpenAI (avatar generation), and xAI (sampled quality evaluation when enabled).
- Analytics/diagnostics processor: PostHog Cloud EU. No session replay; no relationship content in product events; automated AI prompts/outputs redacted.

## Manual release checklist

- [x] Deploy backend with `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`, and `APPLE_CLIENT_ID` configured.
- [ ] Exercise Apple-linked account deletion in production or a production-equivalent environment and confirm authorization revocation succeeds.
- [x] Publish the updated Privacy Policy and Terms before submitting the binary.
- [ ] Update App Privacy answers using the table above and save the new privacy responses.
- [x] Confirm Privacy Policy and Terms links are reachable without authentication.
- [ ] Verify all in-app purchases are in the correct App Store Connect state and attached to the submitted version when required.
- [ ] Add a functioning review account and test it on a clean device.
- [ ] Create the App Store version 1.0.8 and select Recall People 1.0.8 build 36.
- [ ] Confirm the archive contains required third-party SDK privacy manifests and signatures in Xcode Organizer validation.
- [ ] Run the account-deletion paths for credentials, Google-linked, Apple-linked, free, and active-subscriber accounts.
- [ ] Verify “Not now” cancels the pending AI request while leaving contacts, reminders, export, sync, and account deletion usable.
- [ ] Attach the What’s New text and the Review Notes above, with placeholders replaced.
