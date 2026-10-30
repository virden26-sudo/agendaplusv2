# Release completion work

Code is based on the existing native-build repair branch plus the coursework/tutor fixes in this change. The published v0.1.0 tag is unchanged.

## Implemented

- Section-aware extraction with course-scoped deduplication, preserved instructions, short structured titles, discussions and exams.
- Shared import path for portal, rescan and syllabus imports. Reimports retain assignment completion state and unrelated courses.
- Explicit dates only; unknown deadlines persist without being placed on a calendar or marked overdue.
- D2L shadow-root and iframe extraction, course-card discovery, read-only pagination, and description-page collection without entering quiz attempts.
- Personal diagnostic, feedback, application retests, saved topic progress, notes, and optional conversational AI teaching.
- Lightweight validated Ollama integration replaces the vulnerable Genkit dependency tree; JSON date coercion fixes tutor requests over HTTP.
- Native build repairs from the previous branch, matching 0.1.1 platform versions, reproducible lockfiles and gated preview release workflow with checksums.

## Verified locally

TypeScript checks, ESLint, 18 unit/DOM/AI-adapter regression tests, frontend export, backend build and backend integration checks. Production dependency audits have zero findings for both root and Electron packages at verification time. See the PR for the final test count.

## Verification blocked in this environment

- GitHub CI jobs cannot start because GitHub reports an account billing lock. No account or payment settings were changed.
- Installed JDK 21 / SDK 36 / Gradle 8.14.3 locally; Gradle dependency resolution fails with `Network is unreachable` when accessing Google/Maven repositories. This is not a successful Android compilation.
- Chromium was downloaded but cannot launch: `process_singleton_posix.cc ... socket() failed: Operation not permitted`. Browser test files are provided but are not reported as passed.
- Windows cross-packaging exposed and fixed an invalid ICO file. Packaging then stopped because Wine is absent on this Linux host; no installable Windows release is claimed.
- No connected Android device, clean Windows account, production Android keystore, Windows signing certificate or live school session was available for final acceptance.

Run the existing Android, Windows and production workflows when GitHub Actions is available. Configure production Android signing secrets before running `Verified public preview`; it refuses to publish if any required build fails or an installer is missing. A billing fix or signing material is not a source-code change and cannot be manufactured by this PR.

## Windows publication signing gate

The public-preview Windows job now requires production signing credentials, runs
packaging with forceCodeSigning enabled, and verifies Authenticode signatures on
the installer and packaged executable before upload. Ordinary PR Windows builds
remain unsigned verification artifacts. Workflow structure and package-script
checks do not establish successful Windows signing or native acceptance; the
production CI job must still run with real credentials after Actions is available.

## Cross-platform follow-up (October 26, 2026)

- Desktop packaging now selects the host platform, with explicit Windows/Linux/macOS commands and native CI verification jobs. iOS has an SPM project setup command and macOS simulator build/launch workflow.
- Corrected desktop window-show event registration and opening HTTP(S) portal links in the system browser.
- Fixed an observed packaging failure: electron-builder omitted the backend's root node_modules. The resource rule now retains it, and afterPack rejects missing runtime/build files. A backend copied from the Linux package passed startup, authentication and coursework extraction checks outside the checkout.
- Mobile service configuration now applies to readiness checks and requests. Added authenticated connection testing, preserved HTTP errors, and removed fabricated successful empty scans and phone-localhost discovery.
- Chrome/Chromium/Edge discovery supports Windows, macOS and Linux. The production service launcher supports explicit network binding with required access tokens; development no longer waits for Ollama before opening the app.
- 27 unit/DOM/adapter/platform tests, TypeScript, lint, Electron compilation, static frontend/backend production builds, workflow actionlint checks, and Linux AppImage packaging passed locally.
- Android app debug APK and instrumentation APK compilation, app unit tests and app lint passed locally. The debug APK signature verifies. App-scoped instrumentation build tasks avoid unrelated generated plugin test APKs with conflicting legacy Kotlin dependencies. The existing Android package-context test now checks the actual application ID.
- Android compilation is no longer blocked in this session: the configured network proxy allowed SDK and Maven dependency downloads. The earlier environment's network failure remains historical, not a present compiler finding.
- Android emulator/device acceptance remains unrun here (no emulator/device). The emulator job must pass before signed Android releases. Chromium production tests were attempted but stopped at socket creation with Operation not permitted. Linux graphical smoke testing did not produce a passing result. Windows/macOS/iOS native execution, production signing, clean installation and live school-session acceptance remain unverified.
- No public release or store submission was performed. See docs/PLATFORMS.md for commands and feature boundaries; mobile automatic portal extraction still requires the connected service and school sign-in on its computer.
