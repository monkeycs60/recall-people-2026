---
name: recall-people-deployment
description: Use when deploying Recall People to iOS App Store/App Review/TestFlight or preparing Android Google Play internal testing releases, especially local Android AAB builds, versionCode/buildNumber bumps, EAS Submit, and Play Console upload errors.
---

# Recall People Deployment

Use this skill for Recall People release work: iOS App Store submission, iOS build number bumps, Android local store builds, Google Play internal testing, and release validation.

## Principles

- For Android, prefer a local `.aab` build. Avoid EAS Build quota unless the user explicitly asks for a remote build.
- EAS Submit is not EAS Build quota, but prefer manual Play Console upload when the user wants full control.
- For Android Play uploads, never use an `.apk` for store/internal testing releases. Use an Android App Bundle `.aab`.
- Preserve unrelated dirty worktree changes. Check `git status --short --branch` before changing release files.
- When native `android/` or `ios/` folders exist, store upload metadata may come from native files, not only `app.config.js`.

## Versioning

Android:

- `versionName` is the visible version, for example `1.0.3`.
- `versionCode` is the monotonically increasing Play Store integer. Every uploaded Android artifact must use a new `versionCode`.
- If Play Console says `Le code de version X a deja ete utilise`, bump only Android `versionCode` to the next integer and rebuild.
- Keep these files aligned:
  - `frontend/app.config.js`: `expo.android.versionCode`
  - `frontend/app.json`: `expo.android.versionCode`
  - `frontend/android/app/build.gradle`: `defaultConfig.versionCode`
  - `frontend/android/app/build.gradle`: `defaultConfig.versionName`

iOS:

- `version` / `CFBundleShortVersionString` is the visible version.
- `buildNumber` / `CFBundleVersion` must increase for each App Store Connect upload.
- Keep Expo config and native iOS project files aligned when native folders are present.

Known state as of 2026-05-07:

- Android visible version was `1.0.3`.
- Android `versionCode 6` was already used, so the next manual Play upload used `versionCode 7`.
- iOS App Store app id is `6757320179`.

Always verify current files before assuming these numbers are still current:

```bash
rg -n "versionCode|versionName|buildNumber|runtimeVersion|version:" frontend/app.config.js frontend/app.json frontend/android/app/build.gradle frontend/android/app/src/main/res/values/strings.xml frontend/ios frontend/package.json
```

## Android Local AAB Build

From the repo root, edit the Android version code if needed. For example, when moving from `6` to `7`, update `frontend/app.config.js`, `frontend/app.json`, and `frontend/android/app/build.gradle`.

Build locally from `frontend/`:

```bash
ANDROID_HOME=/home/clement/Android/Sdk \
ANDROID_SDK_ROOT=/home/clement/Android/Sdk \
ANDROID_NDK_HOME=/home/clement/Android/Sdk/ndk/27.1.12297006 \
npx eas-cli@latest build -p android --profile local-android-store --local --non-interactive
```

This uses the `local-android-store` profile in `frontend/eas.json`, which should produce an Android App Bundle:

```json
"local-android-store": {
  "extends": "production",
  "android": {
    "buildType": "app-bundle",
    "autoIncrement": false
  }
}
```

Copy the generated artifact to a stable path:

```bash
mkdir -p /home/clement/Desktop/recall-people-2026-builds
artifact=$(ls -t frontend/build-*.aab | head -1)
cp "$artifact" /home/clement/Desktop/recall-people-2026-builds/recall-people-android-<version>-vc<versionCode>.aab
```

If multiple `build-*.aab` files exist, use the newest one:

```bash
ls -lt frontend/build-*.aab
```

## Android Validation

Check the expected version files:

```bash
rg -n "versionCode|versionName|runtimeVersion" frontend/app.config.js frontend/app.json frontend/android/app/build.gradle frontend/android/app/src/main/res/values/strings.xml
```

Inspect the generated bundle:

```bash
rm -rf /tmp/recall-aab-check
mkdir -p /tmp/recall-aab-check
unzip -q /home/clement/Desktop/recall-people-2026-builds/recall-people-android-<version>-vc<versionCode>.aab -d /tmp/recall-aab-check
strings /tmp/recall-aab-check/base/manifest/AndroidManifest.xml | rg "versionCode|versionName|<version>|<versionCode>|com.monkeycs60.recallpeople2026"
grep -aohE 'https://api\.recallpeople\.com|http://192\.168\.[0-9.]+:8787|http://localhost:8787' /tmp/recall-aab-check/base/assets/index.android.bundle | sort | uniq -c
```

Expected API result for a store build:

```text
1 https://api.recallpeople.com
```

No `192.168.x.x:8787` or `localhost:8787` should be embedded in the store bundle.

## Android Play Console

In Google Play Console internal testing:

- Use **Importer** under **App bundles**.
- Select the stable `.aab` path from `/home/clement/Desktop/recall-people-2026-builds/`.
- If the UI rejects the upload with a used version code, bump `versionCode`, rebuild locally, and upload the new `.aab`.

Optional EAS Submit, only when appropriate:

```bash
cd frontend
npx eas-cli@latest submit -p android --profile production --path /home/clement/Desktop/recall-people-2026-builds/recall-people-android-<version>-vc<versionCode>.aab --non-interactive
```

The production submit profile targets the `internal` track using `frontend/google-service-account.json`. If the CLI reaches “Scheduled Android submission” and then waits for completion, the local wait can be stopped after recording the Expo submission URL; confirm final status in Play Console.

## iOS App Store Flow

Check release-sensitive config first:

```bash
git diff -- frontend/app.config.js frontend/app.json frontend/ios frontend/eas.json
rg -n "buildNumber|CFBundleVersion|CFBundleShortVersionString|bundleIdentifier|appleId|ascAppId|appleTeamId" frontend/app.config.js frontend/app.json frontend/ios frontend/eas.json
```

Use the project’s EAS production profile for iOS submission:

```bash
cd frontend
npx eas-cli@latest build -p ios --profile production --submit
```

Before sending to App Review, check:

- The uploaded iOS build is selected in App Store Connect.
- Subscriptions/products required by the release are in the expected status.
- App privacy and permission declarations still match the code.
- No new camera/photo/microphone/location permission was added without matching review/privacy text.
- Current Android config intentionally blocks camera permission; do not reintroduce camera unless the product and privacy copy need it.

If browser login is needed for App Store Connect or Play Console, use a non-headless browser so the user can authenticate.

## Common Pitfalls

- Uploading an APK to Play Console store/internal testing release: use `.aab`.
- Reusing Android `versionCode`: bump to the next integer and rebuild.
- Updating only `app.config.js` while native folders exist: also update native Gradle/iOS files.
- Confusing visible version with upload counters: Android `versionName` can stay `1.0.3` while `versionCode` moves from `6` to `7`.
- Trusting a local IP log from `app.config.js`: verify the final JS bundle contains the production API URL.
- Seeing `app.config.js` print a local API URL during EAS local build does not necessarily mean the store bundle uses it. The `EXPO_PUBLIC_API_URL` from the build profile should win; verify the final bundle anyway.
- Treating `expo doctor` warnings as fatal during a known-good release build: read them, but Gradle success and artifact validation are decisive for this upload.
