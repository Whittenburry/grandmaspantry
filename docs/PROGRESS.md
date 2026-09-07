# Progress and Handoff

**Read this first.** It is the running state of the project: what we are building, why,
what is done, and what comes next. It survives context resets — the spec and plan hold the
detail, this holds the intent and the position.

**Update it** when a task completes (check the box), when a phase completes (move the phase
to Done and write a summary), and whenever a decision is made or a surprise is found.
Prefer writing something down over remembering it.

| | |
|---|---|
| **Spec** | [`superpowers/specs/2026-08-22-grandmas-shop-design.md`](superpowers/specs/2026-08-22-grandmas-shop-design.md) — read before designing anything |
| **Active plan** | None. Phase 2 needs one written. |
| **Completed plans** | [`superpowers/plans/2026-08-22-foundation.md`](superpowers/plans/2026-08-22-foundation.md) — phases 0–1, fully executed |
| **Last updated** | 2026-09-06 — paused after phase 1; status screen added |

---

## Start the next session here

The work is paused in a clean, working state. Nothing is half-finished.

**First actions, in order:**

1. `cd client && npm install && npm run test:run` — expect **95 passed**, 9 files. If that
   is not what you see, something drifted; find out what before writing anything.
2. Read the spec (linked above). Several obvious-looking features are deliberately
   excluded and the reasons are not guessable from the code.
3. **Ask the author the batch-splitting question** in Open Threads below. It shapes the
   Phase 2 add-item form and only the author's mother can answer it.
4. **Write the Phase 2 plan** using the `superpowers:writing-plans` skill, modelled on the
   completed foundation plan. Save to `docs/superpowers/plans/`.
5. Only then write Phase 2 code, on a `feat/` branch, test-first.

**Do not** start Phase 2 code before its plan exists — that is the convention this project
has followed for every phase so far.

## The one-paragraph version

Grandma's Shop is a home-canning inventory tracker being rebuilt from a throwaway
Express + SQLite MVP into a free, local-first PWA. **User zero is the author's mother**, an
experienced canner with a Pixel 9 Pro XL and no tracking system at all today. Her jars go
bad rarely, and when they do it is because they sit physically behind other jars with the
date on the lid where she cannot read it. So the app's job is **to be a readable index of
shelves she cannot see into** — not to be an accounting system. It must stay free, which is
why there are no accounts and no server.

## Decisions that are settled

Do not relitigate these without talking to the author first. Each cost a round of
conversation to reach.

| Decision | Why |
|---|---|
| **Local-first, no accounts, no server** | Must stay free at any number of users, and must work with no signal in a basement. Backup is an exported file she keeps in Drive. |
| **The honesty rule** | Counts read "about 6 jars · last checked in March," never a bare "6." She will forget to log usage; an app caught being confidently wrong once is never trusted again. |
| **No safety claims, ever** | The app shows age and USDA quality bands. It never says food is safe or unsafe, and never computes processing times, pressures, or altitude adjustments. That liability tail is botulism, not a bug report. |
| **One unified Stock model** | Canned jars, freezer items, and empty jars are all "a count that goes down when used." One thing to learn, not three. |
| **Locations are first-class** | She stores across a basement freezer, a kitchen fridge/freezer, and wherever there is space. "Which one is it in?" *is* the visibility problem. |
| **Jars are a catalog, not crossed enums** | Size × mouth invents jars that do not exist. The catalog seeds the real Ball lineup and she can extend it. |
| **Skip the canning-companion features** | Recipes with altitude-adjusted times and timers are Jarred's product, and the highest-liability surface in the space. She is an experienced canner who does not need them. |
| **Chrome on Android is the only v1 target** | Both she and the author carry a Pixel 9 Pro XL. Safari's constraints do not shape the design. |

## Phases

| Phase | Status | Content |
|---|---|---|
| 0 | **Done** | Repo hygiene: `.gitignore`, untrack `node_modules/` and the sqlite db, delete `api/` |
| 1 | **Done** | Foundation: Vitest, `domain/` and `data/` layers, test-first |
| 2 | **Next — needs a plan** | Stock core: shelf, add/edit, use one, location-scoped shelf check, empty-jar return |
| 3 | Not planned | Recipes with photos |
| 4 | Not planned | Labels: screen, single print, sheet print, QR |
| 5 | Not planned | Backup, restore, and the backup nudge |
| 6 | Not planned | `vite-plugin-pwa`, offline, persistent storage, deploy, on-device testing |

Phases 2–6 are deliberately unplanned. They call into the interfaces Phase 1 establishes,
so each gets its own plan once the layer beneath it is real and reviewed.

## Current position

**Phase 2 is next, and it needs a plan written before any code.** Phases 0 and 1 are
merged to `main`.

**`npm run dev` works and opens on a status screen** (`client/src/views/Status.vue`) that
restates the phase position and reads live counts from IndexedDB. It is scaffolding, not a
feature: Phase 2 replaces it with the real shelf. The four MVP views it replaced called the
deleted `/api` endpoints and are recoverable at tag `v0-mvp`.

### Phase 0 — Repository hygiene — Done

- [x] Task 1: Repository hygiene — merged as `3937865`

Tracked files went from 2,566 to 16. `node_modules/` and `api/database.sqlite` are
untracked but still on disk; `api/` is deleted and recoverable at tag `v0-mvp`. The client
still builds.

### Phase 1 — Foundation — Done

Merged from `feat/foundation`. **95 tests across 9 files, all passing.** `npm run build`
exits 0.

- [x] Task 2: Test infrastructure (Vitest, jsdom, fake-indexeddb)
- [x] Task 3: Domain — age arithmetic and formatting
- [x] Task 4: Domain — quality bands
- [x] Task 5: Domain — count confidence
- [x] Task 6: Domain — stock validation and jar descriptions
- [x] Task 7: Data — database schema and seeds
- [x] Task 8: Data — location and jar type repositories
- [x] Task 9: Data — stock repository create, read, update
- [x] Task 10: Data — using a jar and reconciling counts

Actual end state: 95 tests across 9 files, all passing.

**What Phase 1 built.** `domain/`: `age.js` (calendar-safe age arithmetic),
`quality.js` (USDA bands), `confidence.js` (the honesty rule), `validation.js`,
`jars.js`, `categories.js`. `data/`: `db.js` (versioned schema, six stores, seeded),
`locations.js`, `jarTypes.js`, `stock.js` (CRUD plus `useOne` and `verifyCount`).

## Notes to self

- `Status.vue` is temporary scaffolding for the gap between phases. Phase 2 replaces it
  with the real shelf view; do not build on it or treat its layout as a design decision.
- **The data layer is verified against real Chrome**, not just `fake-indexeddb`: database
  `grandmas-shop` v1 created, six stores present, ten jar types seeded, no console errors.
  Worth repeating on a Pixel before Phase 6.
- `resetDatabaseHandle()` must close the connection, not just null the promise — `deleteDB`
  blocks forever otherwise, and every test hangs. Caught in plan review; do not regress it.
- Seed ids are deterministic slugs (`pint-wide`, `basement-freezer`), not UUIDs, so seeded
  rows stay stable across devices and backup files.
- Domain functions take `now` as an explicit parameter. They never call `new Date()`.

## Open threads

- **Write the Phase 2 plan** before writing any Phase 2 code. It should cover the shelf
  view, add/edit forms, item detail, and the location-scoped shelf check, and it builds on
  the interfaces listed above.
- **Unanswered question, needed for the Phase 2 add-item form:** does she want to log a
  canning session as one entry or several? Twelve half-pints of jam and six quarts of
  tomatoes in one afternoon is two stock items — but if she splits a single batch across
  jar sizes, the form has to handle that in one pass or she will resent it by the third
  batch. Ask her before designing the form.
- **The Google Fonts CDN link in `client/index.html` must go before Phase 6.** A CDN font
  breaks an offline-first PWA. Self-host Playfair Display and Quicksand instead.
- Phases 3–6 each need their own plan when their turn comes.

## Conventions

- **Commits:** Conventional Commits scoped by area — `feat(domain):`, `feat(data):`,
  `chore(repo):`. Claude-authored commits carry a `Co-Authored-By` trailer.
- **Branches:** one per phase, merged to `main` with `--no-ff` once the phase stands alone.
- **TDD:** domain and data layers are written test-first. Write the failing test, watch it
  fail, then implement.
- **Models:** Opus for domain and data layers and for review; Sonnet for view components and
  print CSS from a settled spec. Single session, no agent fan-out — this project is too
  small for it to pay for itself.
