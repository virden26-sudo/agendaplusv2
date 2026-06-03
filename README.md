# Agenda+

Agenda+ is a student planner built with **Next.js 16**, **TypeScript**, **Tailwind CSS**, and **shadcn/ui**. The core app stores assignments and settings in the browser (`**localStorage`**); there is no hosted database for day-to-day use.

Optional targets:

- **Web** — dev server on port **9002**
- **Android** — Capacitor wrapper (`android/`)
- **Desktop** — Electron wrapper (`electron/`)
- **AI** — Genkit + local Ollama (optional)

---

## Table of contents

1. [Prerequisites](#prerequisites)
2. [Install and run (web)](#install-and-run-web)
3. [Project scripts](#project-scripts)
4. [Android build (APK)](#android-build-apk)
5. [Release signing and keystore](#release-signing-and-keystore)
6. [Security](#security)
7. [AI features (optional)](#ai-features-optional)
8. [Electron (optional)](#electron-optional)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites


| Tool               | Purpose                                                                        |
| ------------------ | ------------------------------------------------------------------------------ |
| **Node.js 20+**    | Web app and Capacitor CLI                                                      |
| **npm**            | Dependencies (`npm install --legacy-peer-deps` if the lockfile is out of sync) |
| **Android Studio** | Android SDK, emulator, and bundled JDK (JBR)                                   |
| **Git**            | Source control                                                                 |


For Android CLI builds on Windows you also need:

- Android SDK (default: `%LOCALAPPDATA%\Android\Sdk`)
- JDK at `C:\Program Files\Android\Android Studio\jbr` (or set `JAVA_HOME` yourself)

---

## Install and run (web)

```bash
git clone <your-repo-url>
cd AgendaPlusv2.0
npm install --legacy-peer-deps
npm run dev
```

Open **[http://localhost:9002](http://localhost:9002)** (not 3000).

Other useful commands:

```bash
npm run lint
npm run typecheck
npm run build
```

### Static export for Capacitor

Capacitor copies the web bundle from the `**out/**` directory (`webDir` in `capacitor.config.ts`). After `npm run build`, confirm that `out/index.html` exists before syncing to Android. If `out/` is empty, add static export to `next.config.mjs`:

```js
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
};
```

**Note:** Static export does not ship Next.js **API routes** inside the APK; those features need a network backend or in-app alternatives.

---

## Project scripts


| Script                    | Description                                   |
| ------------------------- | --------------------------------------------- |
| `npm run dev`             | Next.js dev server (port 9002, Webpack)       |
| `npm run build`           | Production web build                          |
| `npm run cap:sync`        | Capacitor sync (all platforms)                |
| `npm run android:sync`    | `build` + `cap sync android`                  |
| `npm run android:apk`     | Sync web assets + `assembleRelease` APK       |
| `npm run android:install` | Install release APK via `adb` (USB debugging) |
| `npm run ai`              | Genkit dev UI (optional)                      |


Helper scripts (PowerShell, run from repo root):


| Script                                  | Description                                                           |
| --------------------------------------- | --------------------------------------------------------------------- |
| `.\scripts\setup-android-env.ps1`       | Set `ANDROID_HOME`, `JAVA_HOME`, PATH, and `android/local.properties` |
| `.\scripts\create-android-keystore.ps1` | Create release keystore + `keystore.properties` (once)                |


---

## Android build (APK)

The `android/` project is already added. Do **not** run `npx cap init` again unless you know you need a fresh native project.

### 1. One-time environment setup (Windows)

From the **repository root** (not `android/`):

```powershell
.\scripts\setup-android-env.ps1
```

Then **open a new terminal** so `ANDROID_HOME` and `JAVA_HOME` apply.

This sets:

- `ANDROID_HOME` / `ANDROID_SDK_ROOT` → `%LOCALAPPDATA%\Android\Sdk`
- `JAVA_HOME` → Android Studio JBR
- `android/local.properties` → `sdk.dir=...` (machine-specific, gitignored)

### 2. One-time release keystore

See [Release signing and keystore](#release-signing-and-keystore).

### 3. Build and install

From the **repository root**:

```powershell
npm run android:apk
```

Output APK:

```text

```

```text
android/app/build/outputs/apk/release/app-release.apk
```

Install on a connected device:

```powershell
npm run android:install
```

Or copy the APK to the phone (enable “Install unknown apps” for your file manager).

### Command-line Gradle (Windows)

```powershell
cd android
.\gradlew.bat assembleRelease
```

Use `.\gradlew.bat`, not `./gradlew` or `/gradlew.bat`.

### Android Studio

```bash
npx cap open android
```

Then **Build → Build Bundle(s) / APK(s)**. Prefer the same release signing config Gradle uses (see keystore section).

### Capacitor sync

Always sync from the **repo root**:

```bash
npm run android:sync
```

Running `npx cap sync android` inside `android/` fails with “platform has not been added”.

---

## Release signing and keystore

Release APKs must be **signed**. Unsigned or debug-signed builds may fail to install or cannot be uploaded to Google Play with a production key.

### Create the keystore (first time only)

```powershell
.\scripts\create-android-keystore.ps1
```

This creates (all **gitignored**):


| File                                  | Purpose                                       |
| ------------------------------------- | --------------------------------------------- |
| `android/agendaplus-release.keystore` | PKCS12 keystore, RSA 2048, alias `agendaplus` |
| `android/keystore.properties`         | Passwords and paths for Gradle                |
| `android/keystore.credentials.txt`    | Human-readable backup of credentials          |


Template for manual setup: `android/keystore.properties.example`.

Gradle (`android/app/build.gradle`) uses the release keystore when `keystore.properties` exists; otherwise it falls back to **debug** signing for local testing only.

### Rebuild after keystore exists

```powershell
npm run android:apk
```

Verify signing (optional):

```powershell
# Certificate should show CN=Agenda Plus, not "Android Debug"
& "$env:LOCALAPPDATA\Android\Sdk\build-tools\<version>\apksigner.bat" verify --print-certs android\app\build\outputs\apk\release\app-release.apk
```

### Play Store / long-term signing

- **Back up** `agendaplus-release.keystore` and passwords in a password manager or encrypted backup.
- **Never commit** the keystore, `keystore.properties`, or `keystore.credentials.txt`.
- Losing the keystore means you **cannot** publish updates to the same Play listing with the same app identity.
- For Play Console, you may also use **Play App Signing**; Google still requires an upload key—treat your keystore as critical either way.
- To replace a lost key you must create a new app listing or follow Google’s key reset process (not guaranteed).

### Install issues


| Symptom                  | What to do                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------ |
| “App not installed”      | Rebuild with signing enabled; uninstall old APK first                                |
| Signature conflict       | Uninstall previous `com.example.agendaplus` (debug vs release key)                   |
| `SDK location not found` | Run `.\scripts\setup-android-env.ps1` or set `sdk.dir` in `android/local.properties` |


---

## Security

### What stays on the device

- Assignments, calendar data, and most preferences live in `**localStorage`** in the browser/WebView.
- Portal session convenience flags use `**localStorage**` (see `src/lib/portal-auth-storage.ts`).
- No central Agenda+ cloud database is required for core features.

Treat the device as the trust boundary: anyone with unlocked phone or backup access can read that data.

### Secrets and files you must not commit


| Item                   | Location                                            | Notes                      |
| ---------------------- | --------------------------------------------------- | -------------------------- |
| Environment secrets    | `.env`, `.env*.local`                               | API keys, credentials      |
| Android SDK path       | `android/local.properties`                          | Machine-specific           |
| Release keystore       | `android/*.keystore`, `android/keystore.properties` | Signing identity           |
| Keystore passwords     | `android/keystore.credentials.txt`                  | Backup only, local         |
| Portal browser profile | `.portal-browser-profile/`                          | Scraper cache/session data |
| Built APKs/AABs        | `android/**/build/`                                 | Artifacts                  |


Root `.gitignore` and `android/.gitignore` exclude these patterns. **Do not** force-add them to git.

### Environment variables


| Variable       | Typical value (Windows)                       | Sensitive?             |
| -------------- | --------------------------------------------- | ---------------------- |
| `ANDROID_HOME` | `%LOCALAPPDATA%\Android\Sdk`                  | No                     |
| `JAVA_HOME`    | `C:\Program Files\Android\Android Studio\jbr` | No                     |
| `.env` vars    | Project-specific                              | **Yes** — never commit |


Run `.\scripts\setup-android-env.ps1` only on your own machine; it writes user-level env vars and `local.properties`.

### Portal scraping and credentials

- Portal login flows may use **Puppeteer** and a local profile directory (`.portal-browser-profile/`).
- Do not commit that folder; it can contain session-like state.
- Only sign in to portals you are allowed to access; credentials typed into the app stay in client memory / local storage unless you add a backend—review `src/lib/scraper.ts` and portal-related API routes before deploying.

### API routes (web server)

When running `npm run dev` or a hosted Next.js server, routes under `src/app/api/` execute on the server. They are **not** included in a static Capacitor `out/` bundle. Do not expose dev servers to the public internet without authentication and rate limiting.

### Android app identity

- Application ID: `com.example.agendaplus` (change before production branding/store listing).
- Release builds should use the **release keystore**, not debug signing, for distribution.

### Dependency and supply chain

```bash
npm install --legacy-peer-deps
npm audit
```

Review high-severity issues before release; pinning and updates are your responsibility.

### Reporting security issues

Do not open public issues for undisclosed vulnerabilities. Contact the maintainers privately with steps to reproduce and impact.

---

## AI features (optional)

Natural-language assignment parsing, tutor, and portal AI helpers use **Genkit** and a local **Ollama** server:

- URL: `http://127.0.0.1:11434`
- Model: `GenesisAi-Standalone` (per project docs)

```bash
npm run ai
```

AI is **not** required for calendar, assignments, or offline use. Without Ollama, AI routes fail gracefully or return empty results depending on the feature.

---

## Electron (optional)

Desktop packaging lives under `electron/`:

```bash
npm start
npm run electron:start-live
```

See `electron/package.json` for Electron-specific scripts and build steps.

---

## Troubleshooting


| Problem                               | Fix                                                                         |
| ------------------------------------- | --------------------------------------------------------------------------- |
| `npm ci` fails                        | Use `npm install --legacy-peer-deps`                                        |
| Capacitor version mismatch warning    | Align `@capacitor/core` and `@capacitor/android` versions in `package.json` |
| `JAVA_HOME is not set`                | Run `.\scripts\setup-android-env.ps1`, new terminal                         |
| `SDK location not found`              | Same as above; check `android/local.properties`                             |
| `android platform has not been added` | Run Capacitor commands from **repo root**, not `android/`                   |
| APK won’t install                     | Use signed release build; uninstall old app; check signature                |
| Blank WebView in APK                  | Ensure `out/` has static files after `npm run build`                        |
| Typecheck: `react-markdown`           | Known pre-existing issue in some branches; add dependency or fix import     |


---

## Architecture (short)

```text
Browser / WebView / Electron
        │
        ▼
   Next.js UI (React)
        │
        ├── localStorage (assignments, settings)
        ├── Optional: Ollama via Genkit (AI)
        └── Optional: API routes when Next server is running
```

Capacitor Android loads the static site from `android/app/src/main/assets/public` after `cap sync`.

---

## License

Private project (`"private": true` in `package.json`). Add your license terms here if you open-source or distribute the app.