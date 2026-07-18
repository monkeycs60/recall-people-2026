# App Store submission — Recall People 1.0.7

Prepared on July 17, 2026. Replace every `[TO COMPLETE]` value before sending the version to App Review.

## What’s New

### English

Keep the conversation going after important moments. Recall People can now remind you to check in after an event, then lets you mark it resolved or record what happened directly from the contact profile. Event reminders are clearer, configurable, and available on the free plan. This update also improves privacy controls and account deletion.

### French

Garde le lien après les moments importants. Recall People peut désormais te rappeler de prendre des nouvelles après un événement, puis te permet de le marquer comme résolu ou de raconter ce qui s’est passé depuis la fiche du contact. Les rappels sont plus clairs, configurables et inclus dans l’offre gratuite. Cette version améliore aussi les contrôles de confidentialité et la suppression du compte.

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
- [ ] In App Store Connect, select the uploaded Recall People 1.0.7 build 33 for submission.
- [ ] Confirm the archive contains required third-party SDK privacy manifests and signatures in Xcode Organizer validation.
- [ ] Run the account-deletion paths for credentials, Google-linked, Apple-linked, free, and active-subscriber accounts.
- [ ] Verify “Not now” cancels the pending AI request while leaving contacts, reminders, export, sync, and account deletion usable.
- [ ] Attach the What’s New text and the Review Notes above, with placeholders replaced.
