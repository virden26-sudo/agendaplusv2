# AGENTS.md

## Cursor Cloud specific instructions

### Project Overview

Agenda+ is a Next.js 16 student planner web app (TypeScript, Tailwind CSS, shadcn/ui). All data is stored client-side in `localStorage` — there is no database or backend persistence layer.

### Running the Dev Server

```bash
npm run dev
```

Starts on port **9002** (not the default 3000). Uses Webpack bundler explicitly.

### Key Commands

| Task | Command |
|------|---------|
| Dev server | `npm run dev` (port 9002) |
| Lint | `npm run lint` |
| Typecheck | `npm run typecheck` |
| Build | `npm run build` |
| Genkit AI dev UI | `npm run ai` |

### Known Issues

- The lockfile (`package-lock.json`) may be out of sync with `package.json`. Use `npm install --legacy-peer-deps` instead of `npm ci`.
- `react-markdown` is imported in `src/app/tutor/page.tsx` but not listed in `package.json`, causing a typecheck error. This is a pre-existing issue.
- The AI features (natural-language assignment input, tutor) require a local Ollama server at `http://127.0.0.1:11434` with model `GenesisAi-Standalone`. These are not required for the core app functionality.
- Next.js warns about a duplicate page: `src/app/page.jsx` and `src/app/page.tsx` both resolve to `/`. This is cosmetic.

### Playwright E2E Tests

The Playwright config (`playwright.config.ts`) expects:
- `npm run prod:build` and `npm run prod:serve` scripts (for production static build testing)
- Base URL: `http://localhost:3000` (production mode)
- Install browsers first: `npx playwright install --with-deps chromium`

### Architecture Notes

- Client-side only (localStorage for data persistence)
- No external database or API keys needed for core functionality
- AI features use Genkit + Ollama (optional, not required to run the app)
- Electron and Android/Capacitor wrappers exist but are optional
