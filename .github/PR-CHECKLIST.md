<!-- PR: Checklist for next steps to stabilize local dev and CI -->
# Checklist: Dev & CI follow-ups (chore/pr-checklist-next-steps)

Description
-----------
This PR contains a concise checklist and suggested small changes to improve local developer experience, test reliability, and CI readiness. It does not change application code; instead it provides a roadmap and suggested commands/commit messages to apply when creating the actual PR branch.

Suggested branch name
---------------------
- `chore/pr-checklist-next-steps`

High-level checklist
-------------------
- [ ] Update `cypress` baseUrl for local development (or document override)
  - Suggestion: update `cypress.config.js` to read `process.env.CYPRESS_BASE_URL || 'http://localhost:8080'`
  - Verification: `CYPRESS_BASE_URL=http://localhost:8080 npx cypress run --spec 'cypress/e2e/basic-ui.cy.js'`
- [ ] Add a CI-friendly static server script and update `package.json`
  - Suggestion: add `serve-static` script using `npx serve -s . -l 8080` or add lightweight `http-server` as devDependency.
  - Verification: `npm run serve:bg` should start server in background in CI-friendly way
- [ ] Remove committed `.env` from repository and ensure `.env` is in `.gitignore`
  - Commands: `git rm --cached .env && git commit -m "chore: remove .env from repo (#ID)"`
  - Update: ensure `.env.example` documents required keys
- [ ] Document AI proxy usage and local test flow in `TESTING.md`
  - Add short instructions showing how to run `server/` or `ai-proxy.php` for `parse-job` flows
- [ ] Stabilize visual tests or mark them flaky
  - Make `visual-regression.cy.js` opt-in or add retry/stabilization steps
- [ ] Quick security sweep
  - Scan repo for any accidental keys, remove them, update README with guidance for keys

Recommended small commits (one-liners)
------------------------------------
- `chore: make cypress baseUrl overridable for local dev`
- `chore: add ci-friendly static server script`
- `chore: remove committed .env and update .gitignore`
- `docs: add AI proxy testing instructions to TESTING.md`
- `test: mark visual tests as optional / flaky` (if applicable)

Verification steps (local)
-------------------------
- Start server: `npm run serve` (or `npm run serve:bg`). Confirm site at `http://localhost:8080`.
- Run a single e2e spec: `npx cypress run --spec 'cypress/e2e/basic-ui.cy.js'`
- Run headless full suite (CI): `npm run test:headless`

Notes
-----
- This file is a draft checklist and does not apply any code changes. After you approve the checklist I can open a branch and create the actual PR with the small commits described above.

Maintainers: please review and tell me which items you want implemented automatically.

