# Brightspace sync verification

Structured D2L lists are authoritative for each section, including empty lists. The raw copy of a structured page must not create additional tasks. Assignment, quiz and discussion extraction requires an individual item link, with duplicates identified by the D2L item ID. No course-specific item limit is applied.

The scraper prefers course navigation links scoped to the current course and uses Brightspace tool routes otherwise. Inaccessible pages are reported as warnings; the sync notification says incomplete. AI cannot recover content from an inaccessible page. Existing stored coursework is not deleted by this repair.

## Ollama

Set `OLLAMA_MODEL` in `.env.local` to the exact installed model name shown by `ollama list`, then restart Agenda+. The compatibility default is `Budd-ie-Standalone`; it must actually be installed. `OLLAMA_HOST` defaults to `http://127.0.0.1:11434`. All Genkit flows use this shared configuration. Portal AI extraction checks `/api/tags` first and reports missing models with the names available on the server. It never selects an arbitrary replacement model.

Structured portal sync does not require Ollama. An inaccessible section never triggers AI reconstruction, and a structured empty list is not treated as missing coverage.

## Automated checks

Run `node tests/portal-sync-regression.cjs` after installing project dependencies. Browser tests require Chrome at the standard Windows location, or set `CHROME_PATH` to a compatible Chromium executable. The tests use synthetic HTML, a mocked AI client, and mocked model-list responses. They do not access a student account or generate real Ollama completions.

The fixture checks four weekly assignments alongside duplicate links, menu links and repeated raw text. It also checks section boundaries, cross-course duplicates, empty lists, malformed JSON fallback, quiz/discussion/news/grade extraction, partial-sync warnings and unavailable-page failures.

## Live acceptance check still required

Sign in to CSC262 and sync. Compare titles against the four actual weekly assignments; verify quizzes and discussions against their tool lists. Confirm any unavailable sections are named in the sync warning. No live course result is established by the synthetic tests. Do not remove previously imported records until this comparison is complete.
