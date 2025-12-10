# Repository Guidelines

## Project Structure & Modules
- `js/`: Core modules (`core.js`, `ui.js`, `jobs.js`, import/export, storage, utils).
- `components/`: Web components (migrated `*-migrated.js`) and helpers.
- `cypress/`: E2E tests (`e2e/*.cy.js`), fixtures, reports, screenshots, videos.
- `tests/`: Manual/demo HTML and small JS utilities for in-browser checks.
- `server/`: Optional local services and API shims (Node.js).
- Entry points: `app.html` (symlinked by `index.html`). Static assets: `styles.css`, `logo.svg`.

## Build, Test, and Dev Commands
- `npm run serve`: Serve static site at `http://localhost:8080`.
- `npm test` / `npm run test:headless`: Run Cypress E2E.
- `npm run test:open`: Open Cypress runner for local debugging.
- `npm run test:ci`: Start server in background then run headless tests.
- `npm run clean:reports`: Remove Cypress reports/screenshots/videos.
- Reports: `npm run test:report` merges JSON and generates HTML under `cypress/reports/html`.

## Coding Style & Naming
- JavaScript: 4‑space indentation, semicolons, single quotes, camelCase for vars/functions.
- Files: kebab-case; components live in `components/` with clear suffix (e.g., `resume-viewer-migrated.js`).
- Keep modules small, pure where possible; side effects in `core.js`/managers.
- No secrets in code; load config via `.env`/`ai-proxy.php` when applicable.

## Testing Guidelines
- Framework: Cypress 13 (E2E). Specs in `cypress/e2e/*.cy.js`.
- Name tests by feature (e.g., `import-job-button.cy.js`).
- Add data via `cy.task('seedTestData')` if needed; base URL is `http://localhost:8080`.
- Visuals: `visual-regression.cy.js` exists—add screenshots only when assertions are stable.

## Commit & Pull Requests
- Commits: Imperative present tense, concise scope (e.g., "Fix Import Job button...").
- Reference issues with `#ID` when relevant. Group related changes.
- PRs: Clear summary, rationale, screenshots (UI changes), test plan (`npm run serve:bg && npm run test:headless`), and affected files.

## Security & Configuration
- Do not commit `.env` or keys. Use `.env.example` as a template.
- Local services in `server/` may require Node ≥14; run separately when testing integrations.

## Agent-Specific Tips
- Prefer minimal, focused diffs; match existing patterns.
- Update `README.md`/`TESTING.md` if behavior or commands change.
