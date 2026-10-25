# Agenda+ development

Agenda+ uses Next.js 16, TypeScript, and localStorage for core planner persistence.
Optional Ollama AI and portal services run in a separate Next.js backend. Android and
Electron consume the static frontend. Read docs/RELEASING.md for platform builds.

Use Node 22 and npm 10. Install with `npm ci`; `.npmrc` records the legacy peer
resolution needed by the current dependency graph. Electron has its own lockfile:
`npm --prefix electron ci`.

- `npm run dev`: start development services on port 3000.
- `npm run test:unit`, `npm run typecheck`, `npm run lint`: source checks.
- `npm run build`: static export in out/, built from an isolated copy without API routes.
- `npm run test:prod`: Playwright production tests (build first; install Chromium).
- `npm run build:server`, `npm run test:backend`: standalone backend and integration check.
- `npm run android:debug`: Android debug build (JDK 21 and SDK 36 required).
- `npm run electron:build`: Windows installer with packaged backend.

Keep the root capacitor.config.ts authoritative; Electron sync generates its local
copy. Do not edit generated native configs to fight dependency toolchain changes.
Never commit credentials, browser profiles, uploaded user files, keystores, or build
outputs. Release signing must fail closed when credentials are missing.

The AI adapter in src/ai/genkit.ts calls Ollama directly; its filename is retained
for import compatibility. Do not reintroduce Genkit or a browser-side server SDK.
Tutor diagnostics must preserve source references, grade actual practice answers,
and never turn missing deadlines into guessed dates. Unknown dueDate is optional
through storage, calendar filters and display components.
