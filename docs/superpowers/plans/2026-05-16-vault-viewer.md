# Vault Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

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

- [ ] Add Vite/React scripts and dependencies.
- [ ] Add `.viewer-data/` to `.gitignore`.
- [ ] Implement vault scanner that reads `source.yaml`, Markdown files, artifacts, topic indexes, and notebooks mapping.
- [ ] Generate `.viewer-data/sessions.json`, `.viewer-data/topics.json`, and `.viewer-data/health.json`.
- [ ] Run `npm install`.
- [ ] Run `npm run build:data`; expected: three JSON files written and health findings visible.

### Task 2: React Data Model And Routing

**Files:**
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/types.ts`
- Create: `src/data.ts`
- Create: `src/router.ts`

- [ ] Load the three `.viewer-data/*.json` files at runtime.
- [ ] Implement hash-route parsing for `#/`, `#/sessions`, `#/sessions/<id>`, `#/topics`, `#/topics/<id>`, and `#/health`.
- [ ] Add stable not-found handling for missing session/topic IDs.
- [ ] Run `npm run build`; expected: TypeScript and Vite build pass.

### Task 3: Workbench UI

**Files:**
- Create: `src/styles.css`
- Modify: `src/App.tsx`

- [ ] Implement app shell with left navigation, main content, and right snapshot rail.
- [ ] Implement overview with vault snapshot, recent learning, topic growth, reread candidates, and health summary.
- [ ] Implement sessions list with search and topic/health/artifact filters.
- [ ] Implement session detail grouped as Reading, NotebookLM, Notes, Practice.
- [ ] Implement topics list and topic detail from approved-topic projection.
- [ ] Implement health page grouped by real finding type.
- [ ] Keep long reading at about `65ch`, Chinese `17px`, `line-height >= 1.75`, non-white reading background, serif reading stack, no frontmatter display.
- [ ] Run `npm run build`; expected: build pass.

### Task 4: Artifact Rendering

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/types.ts`
- Modify: `src/styles.css`

- [ ] Render flashcards as readable cards from `{title,cards}`.
- [ ] Render quiz as question/answer blocks from `{title,questions}`.
- [ ] Render mindmap as a nested tree from `{name,children}`.
- [ ] Hide unknown JSON schemas and surface schema warnings in health.
- [ ] Run `npm run build:data && npm run build`; expected: no raw JSON `<pre>` artifact UI.

### Task 5: Browser Verification

**Files:**
- Create: `scripts/smoke-viewer.mjs`

- [ ] Start dev server with `npm run dev -- --host 127.0.0.1`.
- [ ] Use Playwright to visit desktop and mobile viewports.
- [ ] Verify required routes render, search/filter works, frontmatter is hidden, artifact cards render, and no horizontal overflow on mobile.
- [ ] Capture screenshots for desktop overview, session detail, and mobile session list.
- [ ] Run `npm run smoke`; expected: all checks pass and screenshots written under `.viewer-data/screenshots/`.
