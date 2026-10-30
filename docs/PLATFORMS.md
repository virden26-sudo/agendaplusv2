# Running Agenda+ across platforms

Use Node 22 and npm 10. Run `npm ci` from the repository root. Core planning,
text imports and supported personal-tutor diagnostics work without Ollama.
Imported data stays on the current device; devices do not automatically share it.

| Platform | Build/run command | Output or requirement |
| --- | --- | --- |
| Windows, Linux or macOS desktop | `npm --prefix electron ci`, then `npm start` | Builds frontend/backend and opens the native desktop app |
| Current desktop OS installer | `npm run electron:build` | `electron/dist/`; host selects its own native target |
| Windows installer | `npm run electron:build:windows` | NSIS `.exe`; use Windows for verification |
| Linux installer | `npm run electron:build:linux` | AppImage; use Linux for verification |
| macOS installer | `npm run electron:build:mac` | DMG; requires macOS for supported signing/testing |
| Android | `npm run android:debug` | `android/app/build/outputs/apk/debug/app-debug.apk` |
| iOS | On a Mac, `npm run ios:sync`, then `npm run ios:open` | Creates/syncs an SPM Xcode project; select a simulator/device in Xcode |
| Web development | `npm run dev` | `http://localhost:3000`; no model startup required |
| Production service/web app | `npm run build:server`, then `npm run serve` | Loopback port 3000 by default |

Build on each target OS to get the correct native dependencies. A successful
cross-package is not proof of installation or startup on the target machine.
The iOS workflow creates a simulator app; it does not produce an iPhone-installable
signed IPA or submit to the App Store. Apple signing/notarization and store
submissions remain separate release work. Windows public previews require signing;
Linux/macOS CI artifacts are verification builds, not approved public releases.

## Android checks

Use JDK 21, Android SDK 36 and the committed Gradle wrapper. After
`npm run android:sync`, run in `android/`:

```bash
./gradlew :app:assembleDebug :app:assembleDebugAndroidTest :app:testDebugUnitTest :app:lintDebug --no-daemon
./gradlew :app:connectedDebugAndroidTest --no-daemon
```

The second command needs a running emulator or connected device. App-scoped tasks
avoid building unrelated instrumentation APKs from generated plugin templates.
The Android workflow runs the installed app's tests on an API 36 emulator,
checking that the bundled WebView renders and that storage survives relaunch.
Signed release builds also require that emulator job to pass.
Debug APKs use a development certificate. They cannot necessarily update an
existing installation signed with a different key; back up planner data before
changing installations, and do not uninstall merely to force an update.

## Mobile AI and automatic extraction

Android/iOS packages contain the static frontend, not a Node server or an AI model.
To enable broader tutoring and portal automation, run the service on a computer
or server you control. Desktop packages already include the service.

For connections from another device, configure `AGENDA_HOST`, `AGENDA_PORT` and a
strong `AGENDA_API_TOKEN` in the service environment. The launcher refuses a
non-loopback bind without a token. Put it behind an HTTPS reverse proxy with a
trusted certificate; do not disable mobile transport security. Hosting and DNS are
not provisioned automatically. Only expose this single-user service to devices
and people you trust; it shares one portal browser profile.

In Portal or Personal Tutor, expand **Optional AI and portal service**, enter the
HTTPS URL and access token, then choose **Save and test connection**. The test
checks authenticated access, not just whether a web server responds. The token
lasts only for the app session. Failed connections and denied access are surfaced
instead of being reported as successful empty extractions.

Broader AI teaching additionally needs an available Ollama service and model;
configure `OLLAMA_BASE_URL` and `OLLAMA_MODEL`. Portal automation needs installed
Chrome, Chromium or Edge. Browser discovery covers Windows, macOS and Linux;
`AGENDA_BROWSER_EXECUTABLE` overrides its path. Complete school sign-in/MFA in
the browser on the service computer when required. This is not on-phone automatic
sign-in. Text import and supported diagnostics remain available without a service.

## Desktop checks

```bash
npm run electron:build
npm run test:backend
npm --prefix electron run test:smoke
```

The package includes the standalone backend's dependencies, not just server.js.
An after-pack check rejects missing Next.js runtime/build files. To integration-test
an actual packaged backend, set `AGENDA_BACKEND_DIR` to its resources/backend
folder before running `npm run test:backend`. On Linux, GUI CI uses Xvfb;
`AGENDA_SMOKE_NO_SANDBOX=1` applies only to the disposable test process, never to
normal app launch. Optional `AGENDA_PACKAGED_APP` selects a packaged executable.

## Current verification

The follow-up implementing these paths passed 27 unit/DOM/adapter/platform
regressions, TypeScript, lint, Electron compilation, production static export,
standalone backend build and integration checks against the backend copied from
the Linux package. The Linux AppImage was built with the corrected dependency
copy rule. Android app debug/instrumentation APK builds, app unit tests and app lint passed
with JDK 21/SDK 36/Gradle 8.14.3; the debug APK signature verified. Emulator/device
launch and target-OS installation checks remain outstanding.
Browser tests were attempted here but Chromium failed at socket creation with
`Operation not permitted`; this is not a passing browser test. Windows/macOS/iOS
native execution and production signing are not verified by Linux packaging.
