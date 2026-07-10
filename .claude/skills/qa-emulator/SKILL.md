---
name: qa-emulator
description: QA de Recall People sur l'émulateur Android — démarrage fiable de l'environnement complet (émulateur, backend :8787, Metro :8082, dev-client), fix "Unable to load script", interaction via adb, test des notifications locales. Utiliser quand on doit tester l'app sur l'émulateur, lancer une session QA, ou quand le dev-client affiche un écran rouge "Unable to load script".
---

# QA émulateur — Recall People

Recette validée le 2026-07-10 (QA du chantier notifications). Compte de test : voir "QA Test Account" dans le CLAUDE.md racine. Règle d'or : créer les données via l'UI, jamais par seed/SQL.

## 1. Démarrage de l'environnement (dans l'ordre)

```bash
# Émulateur (si absent de `adb devices`)
nohup ~/Android/Sdk/emulator/emulator -avd Pixel_8_API_35 -no-snapshot-save > /tmp/emulator-qa.log 2>&1 &
until [ "$(adb -s emulator-5554 shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; do sleep 5; done

# Backend local — ATTENTION: défaut = port 3000, il FAUT 8787
cd backend && (export PORT=8787; npm run dev > /tmp/backend-qa.log 2>&1 &)
# vérifier: curl -s http://localhost:8787/ → 200

# Metro — utiliser ./node_modules/.bin/expo, PAS `npx expo` (le hook RTK le réécrit en `npm expo` qui échoue)
cd frontend && export EXPO_NO_DOTENV=1 EXPO_PUBLIC_API_URL=http://10.0.2.2:8787 REACT_NATIVE_PACKAGER_HOSTNAME=10.0.2.2
./node_modules/.bin/expo start --dev-client --port 8082 > /tmp/metro-qa.log 2>&1 &

# Reverses (à REFAIRE après chaque reboot émulateur)
adb -s emulator-5554 reverse tcp:8081 tcp:8082
adb -s emulator-5554 reverse tcp:8082 tcp:8082
```

## 2. Connecter le dev-client à Metro (fix "Unable to load script")

Le deep link `recall-people://expo-development-client/?url=...` et le tap sur la ligne serveur du dev launcher ne suffisent PAS toujours. **Le chemin fiable** est la pref RN `debug_http_host` (build debug → `run-as` possible) :

```bash
printf '<?xml version="1.0" encoding="utf-8" standalone="yes" ?>\n<map>\n    <string name="debug_http_host">10.0.2.2:8082</string>\n</map>\n' > /tmp/rn_prefs.xml
adb -s emulator-5554 push /tmp/rn_prefs.xml /data/local/tmp/rn_prefs.xml
adb -s emulator-5554 shell "run-as com.monkeycs60.recallpeople2026 cp /data/local/tmp/rn_prefs.xml shared_prefs/com.monkeycs60.recallpeople2026_preferences.xml"
adb -s emulator-5554 shell am force-stop com.monkeycs60.recallpeople2026
adb -s emulator-5554 shell monkey -p com.monkeycs60.recallpeople2026 -c android.intent.category.LAUNCHER 1
```

La pref persiste sur le disque AVD (survit aux reboots). Premier bundle ≈ 20 s + 5000 modules ; surveiller `grep Bundled /tmp/metro-qa.log`.

## 3. Gotchas connus

- **`am force-stop` annule les alarmes Android planifiées** de l'app. Après un force-stop pendant un test de notifications, relancer l'app : la passe de replanification au lancement les recrée.
- **Réseau émulateur cassé** (wifi « ! », DNS mort, erreurs binder `RECOMMEND_NETWORKS` en boucle dans logcat) : `adb -s emulator-5554 reboot` répare. Les IP directes (10.0.2.2) marchent souvent même quand le DNS est mort — l'app affiche « Mode hors-ligne » mais backend local et notifications locales fonctionnent.
- **`pkill -f "<pattern>"`** : si le pattern apparaît dans ta propre ligne de commande composée, pkill te tue toi-même. Utiliser le bracket trick : `pkill -f "tsx watch --env-file=[.]dev.vars"`.
- **Attentes longues** : jamais de `sleep N` nu ni de commande bloquante > 4 min (watchdog). Boucles bornées : `for i in $(seq 1 40); do [ $(date +%s) -ge $TARGET ] && break; sleep 8; done`.
- Les timestamps de `dumpsys alarm` sont en heure locale device. Les alarmes expo-notifications sont **inexactes** (`window=+1h`) : 1-2 min de latence observée sur émulateur.

## 4. Interaction UI via adb

```bash
# Screenshot (puis LIRE l'image avec l'outil Read avant d'agir)
adb -s emulator-5554 exec-out screencap -p > shot.png
# Coordonnées précises d'un élément
adb -s emulator-5554 shell uiautomator dump /sdcard/window_dump.xml
adb -s emulator-5554 shell cat /sdcard/window_dump.xml | grep -o 'text="Cible"[^>]*bounds="[^"]*"'
# Tap / texte / scroll / retour
adb -s emulator-5554 shell input tap X Y
adb -s emulator-5554 shell input text 'foo%sbar'   # %s = espace
adb -s emulator-5554 shell input swipe 540 1800 540 800 400
adb -s emulator-5554 shell input keyevent KEYCODE_BACK  # HOME, ENTER...
# Barre de notifications
adb -s emulator-5554 shell cmd statusbar expand-notifications   # / collapse
```

**Time picker Material** : passer en mode clavier (bouton `content-desc="Switch to text input mode..."` en bas à gauche du dialog), puis taper dans `android:id/input_hour` / `input_minute` (tap sur le champ → `input text "14"`), puis OK.

## 5. Tester une notification locale en réel

Régler l'heure de rappel concernée (Profile → Rappels du soir/matin) à now+3 min via le picker → la replanification est immédiate. Aller au home (`keyevent KEYCODE_HOME`), attendre l'heure (+60-90 s de marge, alarmes inexactes), `expand-notifications`, screencap. Un événement daté de demain déclenche sa veille aujourd'hui à l'heure du soir ; un événement daté d'aujourd'hui déclenche le jour J à l'heure du matin ; un anniversaire à J+7 déclenche la notif 🎁 à l'heure du matin.
