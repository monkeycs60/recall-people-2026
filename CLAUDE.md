- Le backend de production tourne en Node sur le VPS via Coolify. Tout déploiement Coolify ou toute autre mutation de la production nécessite une demande explicite.

# Analytics / PostHog

Recall People est instrumenté avec **PostHog** : analytics produit (events **par utilisateur** : `contact_created`,
`note_created`, etc.), **observabilité IA** (`$ai_generation` sur tous les appels LLM du backend — coût/tokens/latence/erreur),
error tracking. Le session replay et l'autocapture des interactions sont désactivés.
**Avant de modifier une feature user-facing OU un appel LLM, lis [`POSTHOG.md`](./POSTHOG.md)** : il décrit
ce qui est observé (landing / mobile / backend) + la règle — si tu modifies le produit, mets à jour
l'instrumentation (events / `$ai_generation`) **ET** `POSTHOG.md`.

# App Name

The app is called **Recall People** (two words, always together). Never shorten to just "Recall" in user-facing copy. In code identifiers, `recall-people` or `recallPeople` is acceptable.

# QA Test Account

Use this shared credentials account for Android emulator and local/dev QA:

- Email: `qa@recall-people.app`
- Password: `RecallPeopleQA2026`
- Display name: `QA Recall`
- Backend user id (local dev DB): `cmr18f4ie0006ixuwmxzbcska` (recreated 2026-07-01 via `POST /auth/register`; the id is regenerated whenever the local dev DB is refreshed and the account recreated)

This account is only for repeatable QA and seed data. Do not put personal contacts, real private notes, or production user data in it.

Because account sync is server-side, keep using this same account when testing the emulator. Once seeded, contacts should come back after logout/login, reinstall, or switching devices, as long as the same account is used and the backend points to the same database.

# Architecture Principles

## User-First Data Privacy (SQLite Local + Account Sync)

This app follows a **local-first architecture** with account-based sync for user privacy, continuity, and cross-device usage:

- **User data is stored locally** in SQLite for offline access and fast UX.
- **Each authenticated account has its own local SQLite database** on the device.
- **Account sync stores encrypted user content on the backend**, so users can restore contacts after reinstalling the app or changing phones.
- Multiple accounts may exist on the same phone, but their local databases must stay isolated.
- Logging out must clear auth/session state, not delete the local account database.

When implementing features:
- New user-facing data fields belong in the **local SQLite schema** and in the **account sync payload/schema** when they need to persist across devices.
- Backend sync endpoints may persist encrypted user content, but regular AI/transcription endpoints should still avoid storing private user content unless explicitly required.
- Existing fully local users need migration into their account database and then account sync.

# Mobile Debugging

## ASO Screenshots Sans Barre Android

Pour les captures App Store / ASO, ne pas masquer la barre Android en post-traitement : le rendu est visible et fait cheap dans un mockup iPhone. Utiliser le mode screenshot natif de l'app.

Le code supporte un mode capture via variables d'environnement :

- `EXPO_PUBLIC_SCREENSHOT_MODE=true` : bypass auth avec un utilisateur local de capture.
- `EXPO_PUBLIC_SCREENSHOT_DB_HASH=3c53b5a3` : ouvre la DB locale seedée pour les contacts ASO (`recall_people_3c53b5a3.db`).
- `EXPO_PUBLIC_HIDE_STATUS_BAR=true` : masque la status bar Android nativement, ET (via le flag `screenshotMode` de `lib/config.ts`) masque les boutons flottants (New note / sparkle) de la fiche contact. Peut s'utiliser **seul** (sans `SCREENSHOT_MODE`) pour capturer un vrai compte (ex. QA) au lieu de la DB seedée.
- `EXPO_PUBLIC_API_URL=http://10.0.2.2:8787` : permet à l'émulateur Android d'appeler le backend local.

### Barres : enlever le système, garder notre tab bar

Objectif des captures : supprimer la **status bar** (haut) ET la **barre de navigation Android** (bas), mais **garder notre tab bar in-app** (Contacts / News / Assistant / Profile) et masquer les **FABs flottants** de la fiche contact.

- **Status bar (haut)** : masquée nativement via `NativeStatusBar.setHidden(...)` quand `screenshotMode` est actif. ✅
- **FABs fiche contact (New note / sparkle)** : masqués via `{!screenshotMode && (...)}` dans `app/contact/[id]/index.tsx`. ✅
- **Barre de navigation Android (bas)** : ✅ masquée nativement via `expo-navigation-bar` (`NavigationBar.setVisibilityAsync('hidden')` + `setBehaviorAsync('overlay-swipe')`) dans le bloc `screenshotMode` de `app/_layout.tsx`. ⚠️ C'est un **module natif** : après son ajout, le dev-client doit être **rebuild** (`cd android && ./gradlew assembleDebug` puis `adb install -r app/build/outputs/apk/debug/app-debug.apk`). Au 1er lancement, Android affiche un toast système « Viewing full screen » → taper **Got it** une fois (il ne réapparaît plus).
- `adb shell ... policy_control immersive.*` NE marche PAS sur cet émulateur (status ET nav restent dans `screencap`).

### États par écran (fiche contact)

- Déplier **The Essentials** (bouton « Show more ») avant la capture — tout tient à l'écran.
- Scroller légèrement vers le bas pour faire apparaître la carte **Loves** en entier et masquer le haut.
- Pour cliquer précisément (boutons RN petits) : `adb shell uiautomator dump` puis lire les `bounds="[x1,y1][x2,y2]"` du `text="..."` visé.

Commande de lancement recommandée depuis `frontend/` :

```bash
EXPO_NO_DOTENV=1 \
EXPO_PUBLIC_API_URL=http://10.0.2.2:8787 \
EXPO_PUBLIC_SCREENSHOT_MODE=true \
EXPO_PUBLIC_SCREENSHOT_DB_HASH=3c53b5a3 \
EXPO_PUBLIC_HIDE_STATUS_BAR=true \
npx expo start --android --dev-client --clear
```

Après le démarrage Metro, forcer un reload (`r` dans Metro ou dev menu Android) pour être certain que les `EXPO_PUBLIC_*` sont bien injectées dans le bundle. Vérifier dans les logs :

```text
[config] API_URL: http://10.0.2.2:8787
[_layout] Starting DB initialization for account: screenshot-user
```

Capture ADB :

```bash
adb -s emulator-5554 exec-out screencap -p > "/home/clement/Desktop/Recall People ASO native screenshots - no status/full-phone/screen.png"
```

Gotchas :

- `adb shell settings put global policy_control immersive.status=...` ne suffit pas sur cet émulateur : la status bar reste dans `screencap`.
- `expo-status-bar` seul ne suffit pas non plus ; le mode capture utilise aussi `NativeStatusBar.setHidden(...)`.
- Le bandeau dev "Open debugger to view warnings" est masqué par `LogBox.ignoreAllLogs(true)` en mode screenshot.
- Si l'app revient au login, relancer avec `EXPO_PUBLIC_SCREENSHOT_MODE=true` puis faire un reload Metro.
- À la fin, supprimer toute policy immersive ADB éventuelle :

```bash
adb -s emulator-5554 shell settings delete global policy_control
```

Les derniers dossiers utiles générés sur le Desktop :

- Captures natives propres : `/home/clement/Desktop/Recall People ASO native screenshots - no status`
- Mockups iPhone 17 propres : `/home/clement/Desktop/Recall People iPhone 17 mockups - native no status`

## Notification réelle pour capture ASO

Une notification Android réelle peut être déclenchée depuis l'app debug avec le deep link suivant :

```bash
adb -s emulator-5554 shell am start \
  -a android.intent.action.VIEW \
  -d "recall-people-dev://debug/notification?ts=$(date +%s)" \
  com.monkeycs60.recallpeople2026.dev
```

Le build debug porte le suffixe `.dev` (id, nom et scheme de deep link distincts), donc l'app de
dev et celle du Play Store cohabitent sur le même téléphone.

Le hook est dev-only (`__DEV__`) et passe par `notificationService.scheduleCaptureDemoNotification()`. Il crée un canal Android haute priorité puis planifie la bannière 2 secondes plus tard. Pour capturer la bannière au-dessus du launcher :

```bash
adb -s emulator-5554 shell input keyevent KEYCODE_HOME
sleep 2
adb -s emulator-5554 exec-out screencap -p > /tmp/recall-notification.png
```

Captures de référence déjà générées :

- Full screen : `/home/clement/Desktop/recall-people-2026/screenshots/notification-capture/recall-people-android-real-notification.png`
- Crop bannière : `/home/clement/Desktop/recall-people-2026/screenshots/notification-capture/recall-people-android-real-notification-crop.png`

## Visualiser l'écran Android dans Chrome

Pour débuguer l'app React Native avec un feedback visuel direct, tu peux afficher l'écran du smartphone/émulateur Android dans un onglet Chrome.

### Lancer ws-scrcpy

```bash
ws-scrcpy
```

Ou manuellement :
```bash
cd ~/Desktop/ws-scrcpy/dist && source ~/.nvm/nvm.sh && nvm use 20 && node index.js
```

### Accéder au stream

1. Ouvre http://localhost:8000 dans Chrome
2. Clique sur un des décodeurs (Broadway.js, H264 Converter, etc.)
3. L'écran du device s'affiche dans le navigateur

### Interaction

- **Clics** : Clique directement sur l'écran du téléphone dans le navigateur
- **Scroll** : Molette de souris ou touchpad
- **Clavier** : Les événements clavier sont capturés
- **Multi-touch** : CTRL pour simuler depuis le centre, SHIFT+CTRL depuis le point actuel

### Pour Claude Code

Quand tu débugues l'app mobile, utilise ws-scrcpy + les outils Chrome (mcp__claude-in-chrome) pour :
- Prendre des screenshots de l'app en cours d'exécution
- Voir les erreurs visuelles directement
- Vérifier le comportement de l'UI sans que l'utilisateur doive décrire

#### Interagir avec l'émulateur

**IMPORTANT** : Le clavier physique via ws-scrcpy ne fonctionne pas. Alternatives par ordre de préférence :

1. **Clics via ws-scrcpy dans Chrome** (fonctionne bien) :
   - Utiliser `mcp__claude-in-chrome__computer` avec `action: left_click` et les coordonnées du navigateur
   - Les clics sont correctement relayés au device Android
   - Exemple : cliquer sur un bouton visible dans le stream

2. **ADB shell input text** (pour le texte) :
```bash
# Taper du texte dans un champ (le champ doit être focus)
adb shell input text "ton_texte_ici"
```

3. **Cliquer sur les touches du clavier virtuel Android** (dernier recours) :
   - Prendre un screenshot pour voir le clavier
   - Cliquer sur chaque touche une par une via les coordonnées du navigateur

4. **Autres commandes ADB utiles** :
```bash
# Cliquer à des coordonnées (x, y)
adb shell input tap 500 800

# Swipe (x1, y1, x2, y2, durée_ms)
adb shell input swipe 500 1000 500 300 300

# Appuyer sur une touche (back, home, enter, etc.)
adb shell input keyevent KEYCODE_BACK
adb shell input keyevent KEYCODE_HOME
adb shell input keyevent KEYCODE_ENTER
```
