- Ne deploy pas le backend sur cloudflare à moins que je te le demande, tu as le droit de deploy sur vercel.

# App Name

The app is called **Recall People** (two words, always together). Never shorten to just "Recall" in user-facing copy. In code identifiers, `recall-people` or `recallPeople` is acceptable.

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

# Mobile Debugging

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