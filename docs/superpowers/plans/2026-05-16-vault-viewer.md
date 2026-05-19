# Vault Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Status 2026-05-19:** Implemented on `main`. This file is now a historical execution plan; current behavior is documented in `README.md`, `docs/pipeline.md`, `docs/vault-schema.md`, and `docs/experiment-plan.md`.

**Goal:** Build a local personal knowledge workbench over `vault/` without reusing old web output or mutating session/topic truth files.

**Architecture:** `vault/` remains the private truth layer. `scripts/build-viewer-data.mjs` reads the vault and writes `.viewer-data/` JSON projections. A Vite React app consumes only `.viewer-data/` and renders hash routes for overview, sessions, topics, session detail, topic detail, and health.

**Tech Stack:** Node.js, Vite, React, TypeScript, `js-yaml`, `marked`, `lucide-react`, Playwright smoke verification.

---

### Task 1: Project Shell And Data Builder

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `scripts/build-viewer-data.mjs`
- Modify: `.gitignore`

- [x] Add Vite/React scripts and dependencies.
- [x] Add `.viewer-data/` to `.gitignore`.
- [x] Implement vault scanner that reads `source.yaml`, Markdown files, artifacts, topic indexes, and notebooks mapping.
- [x] Generate `.viewer-data/sessions.json`, `.viewer-data/topics.json`, and `.viewer-data/health.json`.
- [x] Run `npm install`.
- [x] Run `npm run build:data`; expected: three JSON files written and health findings visible.

### Task 2: React Data Model And Routing

**Files:**
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/types.ts`
- Create: `src/data.ts`
- Create: `src/router.ts`

- [x] Load the three `.viewer-data/*.json` files at runtime.
- [x] Implement hash-route parsing for `#/`, `#/sessions`, `#/sessions/<id>`, `#/topics`, `#/topics/<id>`, and `#/health`.
- [x] Add stable not-found handling for missing session/topic IDs.
- [x] Run `npm run build`; expected: TypeScript and Vite build pass.

### Task 3: Workbench UI

**Files:**
- Create: `src/styles.css`
- Modify: `src/App.tsx`

- [x] Implement app shell with left navigation, main content, and right snapshot rail.
- [x] Implement overview with vault snapshot, recent learning, topic growth, reread candidates, and health summary.
- [x] Implement sessions list with search and topic/health/artifact filters.
- [x] Implement session detail grouped as Reading, NotebookLM, Notes, Practice.
- [x] Implement topics list and topic detail from approved-topic projection.
- [x] Implement health page grouped by real finding type.
- [x] Keep long reading at about `65ch`, Chinese `17px`, `line-height >= 1.75`, non-white reading background, serif reading stack, no frontmatter display.
- [x] Run `npm run build`; expected: build pass.

### Task 4: Artifact Rendering

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/types.ts`
- Modify: `src/styles.css`

- [x] Render flashcards as readable cards from `{title,cards}`.
- [x] Render quiz as question/answer blocks from `{title,questions}`.
- [x] Render mindmap as a nested tree from `{name,children}`.
- [x] Hide unknown JSON schemas and surface schema warnings in health.
- [x] Run `npm run build:data && npm run build`; expected: no raw JSON `<pre>` artifact UI.

### Task 5: Browser Verification

**Files:**
- Create: `scripts/smoke-viewer.mjs`

- [x] Start dev server with `npm run dev -- --host 127.0.0.1`.
- [x] Use Playwright to visit desktop and mobile viewports.
- [x] Verify required routes render, search/filter works, frontmatter is hidden, artifact cards render, and no horizontal overflow on mobile.
- [x] Capture screenshots for desktop overview, session detail, and mobile session list.
- [x] Run `npm run smoke`; expected: all checks pass and screenshots written under `.viewer-data/screenshots/`.
