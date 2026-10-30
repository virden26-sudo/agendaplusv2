# Android and Electron build audit — October 24, 2026

## Result and scope

`main` remains at `95f225b` (July 22, 2026, UTC). The repository is public,
not archived, and the GitHub releases API returned no releases. That does not
prove no APK has ever been built locally. No working Android or Windows release
was verified in this audit.

The existing draft [PR #4](https://github.com/virden26-sudo/agendaplusv2/pull/4)
already contains build repairs on `fix/production-build-pipelines` (`b46356b`
before this follow-up). This audit continues that branch. Those repairs must not
be mistaken for changes already present on `main`.

## Repository and release paths

| Area | Authoritative files | Build output |
| --- | --- | --- |
| Web frontend | `src/app`, `src/components`, `src/context`, `next.config.mjs`, `scripts/build-static.js` | `out/` |
| Backend | `src/app/api`, `src/ai`, `src/lib/scraper.ts`, `scripts/build-server.js` | `.next-server/standalone/`, copied to `electron/backend/` |
| Android | `capacitor.config.ts`, `android/settings.gradle`, `android/build.gradle`, `android/variables.gradle`, `android/app/build.gradle`, Gradle wrapper | `android/app/build/outputs/apk/debug/app-debug.apk`; signed release APK under `apk/release/`; AAB under `bundle/release/` |
| Electron | `electron/package.json`, `electron/src/index.ts`, `electron/src/setup.ts`, `electron/electron-builder.config.json` | `electron/dist/`, Windows NSIS installer and `win-unpacked/` |
| Automation | `.github/workflows/android.yml`, `electron.yml`, `production-test.yml`; `azure-pipelines.yml` | GitHub workflow artifacts; Azure frontend checks |

The unrelated Kotlin tree under `src/main/` is not the Capacitor Android app.
The real launcher is `android/app/src/main/java/com/example/agendaplus/MainActivity.java`.
Do not combine those source trees to repair the APK.

## Prioritized blockers and exact next actions

### P0 — CI cannot start platform verification

The [Android run](https://github.com/virden26-sudo/agendaplusv2/actions/runs/39361082205)
has a check annotation stating the account is locked due to a billing issue.
The job did not start. The [Windows run](https://github.com/virden26-sudo/agendaplusv2/actions/runs/39361082276)
and [frontend run](https://github.com/virden26-sudo/agendaplusv2/actions/runs/39361082216)
also failed before providing useful build logs. Their red checks do not identify
compiler failures. Azure reports a failed check too, but its error cause was not
retrieved; do not assume it is the same billing issue.

Resolve the GitHub account billing lock, then rerun platform checks on the latest
PR #4 commit. Do not change Gradle in response to an infrastructure-only failure.
Alternatively, use the documented local commands on a configured build machine.

### P0 — Main still has incompatible or incomplete build entry points

On `main`, Android CI runs Gradle without installing npm dependencies or syncing
Capacitor assets; JDK 17 conflicts with generated Java 21 compilation settings and
a JetBrains JDK 21 daemon request. Capacitor CLI 7 is mixed with core/native 8.
The default static build includes server API routes. Electron's installer relies
on finding an external source checkout and launching a development backend.

PR #4 supplies locked Capacitor 8.5.3 packages, Node 22, JDK 21, SDK 36,
AGP 8.13.0 / Gradle 8.14.3, isolated frontend export, a standalone backend packaged
with Electron, and platform workflows that upload artifacts. Review and validate
that branch before merging. This follow-up also records executable bits on the
Unix launchers and limits Windows shell execution to batch files, so Node paths
containing spaces are passed directly to the process launcher.

### P1 — Produce and exercise actual platform artifacts

From the repair branch, with Node 22/npm 10 and JDK 21/SDK 36 installed:

```sh
npm ci
npm run android:debug
cd android
./gradlew testDebugUnitTest lintDebug --no-daemon
```

Use `gradlew.bat` for direct Gradle calls on Windows. Install the debug APK on a
real device with `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`.
Verify first launch, navigation, task creation/completion, persistence after app
restart, file import, and operation without backend connectivity.

On Windows, from the repository root:

```sh
npm ci
npm --prefix electron ci
npm run electron:build
npm run test:backend
npm --prefix electron run test:smoke
```

The smoke check tests the packaged executable, preload bridge, and backend.
Also install/uninstall the NSIS installer on a clean Windows account without
Node/npm or a source checkout. Verify data persistence and upgrade behavior.
An unpacked Linux package is not proof that the Windows installer works.

### P1 — Separate optional services from core app acceptance

The APK contains the static frontend, not the Next.js API backend. Phone
`127.0.0.1` addresses the phone. AI and portal operations require a reachable,
properly secured backend; Ollama/model availability and browser automation need
their own end-to-end verification. Electron packages its backend but still needs
the optional model and a compatible Chrome/Edge installation for those features.
Do not call extraction/tutoring verified based on a successful installer build.

### P2 — Signing, identity, advisories, and publication

Android release tasks now reject missing signing configuration. Configure all
four signing secrets listed in [RELEASING.md](RELEASING.md), run Android CI with
`release=true`, and verify APK signatures. Confirm `com.example.agendaplus` before
first store publication and increment `versionCode` for subsequent uploads.
Configure Windows code signing before public distribution. A fresh production
dependency audit reports 1 critical, 17 high, and 57 moderate findings in the
root package, and zero in the Electron package. The critical package is Next.js
16.3.8; npm reports 16.4.3 as a non-major fix. Update Next.js and its matching
ESLint configuration, regenerate the lockfile, inspect the advisory applicability,
then rerun frontend, backend, and platform checks before public release. These
counts describe dependency advisories, not verified exploitability. Review
licensing too. The workflows upload verification artifacts;
they do not create a GitHub release or submit to either store. Add versioned
release publication only after the same commit passes platform acceptance.

## Validation in this follow-up

The root locked dependency install (with lifecycle scripts disabled), normal
Electron dependency install, six unit regressions, root TypeScript checks,
ESLint, Electron TypeScript compilation, static frontend build, standalone backend
build, backend startup/authentication outside the checkout, and Android and
Electron Capacitor sync all passed. Checks ran on Node 24.22.1/npm 11.9.0; the
documented Node 22/npm 10 CI environment still needs its own passing run.
Sync prints dependency-discovery warnings
for non-plugin packages; that is not a native compile result.

Playwright Chromium download repeatedly returned truncated archives, so browser
tests could not run. The local environment has JDK 17 and no `sdkmanager`; Android
compilation is unverified. Windows execution is unavailable on this Linux host.
The new Windows launcher adjustment still requires Windows CI execution.
