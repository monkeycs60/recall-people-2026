# Research Notes

These notes summarize source-backed ASO and conversion guidance researched in June 2026. Browse again when the user asks for the latest rules or when publishing-critical limits may have changed.

## Sources

Official:

- Apple Developer, Creating your product page: https://developer.apple.com/app-store/product-page/
- Apple Developer, App Store search: https://developer.apple.com/app-store/search/
- Apple Developer, Product page optimization: https://developer.apple.com/app-store/product-page-optimization/
- Apple Developer, Custom product pages: https://developer.apple.com/app-store/custom-product-pages/
- Google Play Console Help, Create and set up your app: https://support.google.com/googleplay/android-developer/answer/9859152
- Google Play Console Help, Best practices for your store listing: https://support.google.com/googleplay/android-developer/answer/13393723
- Google Play Console Help, Metadata policy: https://support.google.com/googleplay/android-developer/answer/9898842
- Google Play Console Help, Custom store listings: https://support.google.com/googleplay/android-developer/answer/9867158

Industry/research:

- AppTweak, ASO guide 2026: https://www.apptweak.com/en/aso-blog/what-is-app-store-optimization-and-why-is-aso-important
- Adjust, ASO 101: https://www.adjust.com/resources/guides/app-store-optimization/
- Storemaven screenshot guide was found in search, but the URL redirected during verification. Treat any Storemaven screenshot numbers as directional unless re-verified from a stable page.

Reddit/search signals:

- Search results from ASO, iOSProgramming, androiddev, and Google Play developer communities repeatedly emphasized that indie apps often over-focus on tiny keyword tweaks and under-focus on clear first screenshots, category clarity, title/short-description usage, and review/traffic limitations.
- Reddit MCP and Tavily MCP were not available in the researched session. Do not claim direct Reddit/Tavily evidence unless those tools are available in the current session.

## Apple App Store Essentials

Apple product page fields and constraints:

- App name: up to 30 characters. It should be simple, memorable, easy to spell, distinctive, and hint at what the app does.
- Subtitle: up to 30 characters. Use it to explain value or typical uses; avoid generic claims.
- Promotional text: up to 170 characters. Can be updated without submitting a new app version. It does not affect search ranking.
- Keywords: 100 characters total, comma-separated with no spaces after commas. Spaces can be used inside keyword phrases.
- Description: first sentence is the most important. Use concise, informative copy and avoid unnecessary keyword stuffing.
- Screenshots: up to 10. If no app preview is present, the first 1-3 screenshots can appear in search results, so they must communicate the essence of the app.
- App previews: up to 3, each up to 30 seconds. They autoplay muted, so the first seconds must work visually.

Apple search and ranking guidance:

- Search relevance includes title, subtitle, keyword field, and primary category.
- User behavior such as downloads, ratings, and reviews also matters.
- Ratings and reviews affect both ranking and conversion.
- Do not include competitor names, trademarks, irrelevant terms, offensive terms, or misleading keywords.
- Avoid duplicate terms, plural variants, category words, `app`, filler words, and special characters unless part of the brand.

Apple testing and segmentation:

- Product Page Optimization can test up to 3 alternate versions against the original for icons, screenshots, and app previews.
- Tests require enough impressions/downloads; low-traffic apps often need bolder variants or longer time to reach confidence.
- Custom product pages can create up to 70 additional pages with different screenshots, app previews, and promotional text. They can be localized, assigned keywords, used with unique URLs, and measured in App Analytics.

## Google Play Essentials

Google Play fields and constraints:

- App name: 30 characters.
- Short description: 80 characters. It should summarize the biggest benefit and not simply repeat the full description.
- Full description: 4000 characters.
- Title, short description, and full description are all important for Google Play ASO; use natural keyword repetition, not spam.

Google policy and creative guidance:

- Descriptions must be clear, well-written, relevant, and not misleading.
- Avoid excessive repetition, irrelevant keywords, ALL CAPS, emojis or special characters that do not belong, ranking claims, price/deal claims, and fake associations.
- Preview graphics and screenshots should minimize text, scale across screen sizes, keep important elements centered, and localize text-containing screenshots per language.
- Screenshots should highlight in-app experiences that make the app special.
- Do not depict unverified real-world contacts or personally identifiable information of non-consenting people.

Google segmentation:

- Custom store listings can tailor copy and graphics by countries, search keywords, unique URLs, Google Ads campaigns, pre-registration users, and some user states.
- Google Play can create many tailored listings; verify current quota before promising an exact number.

## Conversion Heuristics

Use these as working heuristics, not laws:

- Search gets users to the listing; screenshots, icon, ratings, and first-line copy close the install.
- The first 2-3 screenshots should tell the entire "why care" story without needing the description.
- A good store page makes a cold user understand: what it is, who it is for, why now, and why this app instead of Notes/Contacts/CRM.
- Concrete user scenarios beat abstract relationship claims.
- One dominant message per asset converts better than showing every feature.
- For new indie apps, lower-competition and problem-intent keywords are often more useful than huge generic terms.
- When traffic is low, do not overread small pre/post changes. Make larger hypothesis-driven tests and watch directional changes in impressions, product page views, conversion, trial starts, and reviews.

## Useful ASO Field Patterns for Recall People

Apple App name patterns:

- `Recall People: AI Memory`
- `Recall People: Voice Memory`
- `Recall People: People Memory`

Apple subtitle patterns:

- `Names, notes & follow-ups`
- `Remember everyone you meet`
- `Never blank on people`
- `Voice notes to reminders`

Google Play short description patterns:

- `Voice notes into names, reminders, and follow-ups.`
- `Remember names, context, and follow-ups after every meeting.`
- `Say who you met. AI turns it into people memory.`

Keyword seed groups:

- Name recall: `names`, `remember names`, `name reminder`, `faces`, `memory`.
- Relationship memory: `relationships`, `friends`, `people`, `stay in touch`, `birthdays`.
- Personal CRM: `personal crm`, `contacts`, `networking`, `clients`, `follow up`.
- Voice capture: `voice notes`, `transcription`, `notes`, `audio`.
- Reminder intent: `reminders`, `follow-ups`, `events`, `birthdays`.
- AI/search: `ai`, `assistant`, `semantic search`, `summary`.

## Copywriting Principles

- Lead with the user's felt problem, then the mechanism.
- Replace abstract benefits with observable situations: "You met Sarah at a conference; two weeks later you need her name, project, and follow-up."
- Prefer one strong verb over adjective stacks.
- Remove generic AI filler unless it helps search or category clarity.
- Use specificity carefully: times such as 7 PM or 10 AM can feel credible if they match the product.
- Do not make the user feel defective. Relief and preparedness convert better than shame for sensitive memory/social anxiety contexts.
- In French, avoid overly literal translations of English ASO copy. French should sound natural, direct, and slightly less hype-heavy.
