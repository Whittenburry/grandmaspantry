# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Start here

**Read [`docs/PROGRESS.md`](docs/PROGRESS.md) before doing anything else.** It carries the
current position, the decisions already settled and why, and notes left for whoever picks
the work up next. The design spec and the active implementation plan are linked from it.

## What this is

Grandma's Shop — a home-canning inventory tracker, mid-rewrite from an Express + SQLite MVP
into a **free, local-first PWA**. One npm package (`client/`); there is no root
`package.json` and no backend. The original `api/` was deleted in phase 0 and is recoverable
at the `v0-mvp` tag.

**Read the spec before designing anything.** Several obvious-looking features are
deliberately excluded, and the reasons are not guessable from the code.

## Commands

```bash
cd client && npm install
npm run dev        # vite → :5173
npm run test       # vitest, watch mode
npm run test:run   # vitest, single run
npm run build      # production bundle → client/dist
```

There is no linter or formatter configured.

**`npm run dev` currently shows a broken app.** The four MVP views under `client/src/views/`
still `fetch('/api/...')` against the deleted backend. They are replaced in phase 2. This is
expected — do not fix it by reviving the API.

## Architecture

Three layers with a hard, one-way dependency: `views/ → data/ → domain/`.

### `src/domain/` — pure functions, no I/O

Every product rule lives here, which is what makes them testable without a database.

- `age.js` — `daysBetween`, `monthsBetween`, `formatAge`. Normalises to local midnight, so
  a DST transition cannot shift a result by a day.
- `quality.js` — `qualityBand`, `qualityLabel`, `bandForItem`. USDA-derived bands for canned
  goods: good under 12 months, use soon 12–18 inclusive, past best beyond.
- `confidence.js` — `countConfidence`, `formatCount`. The honesty rule (see below).
- `validation.js` — `validateStockInput` returns **every** problem, not just the first.
- `categories.js`, `jars.js` — category constants and jar descriptions.

Two invariants enforced by convention and checked in review:

- **The domain layer never imports from `data/`.**
- **Functions that need the current time take `now` as a parameter.** They never call
  `new Date()` themselves, which is what makes the date-sensitive rules testable.

### `src/data/` — the only code that touches IndexedDB

- `db.js` — `openDatabase`, `resetDatabaseHandle`, `DB_NAME`, `DB_VERSION`. Six object
  stores: `stock`, `recipes`, `photos`, `locations`, `jarTypes`, `meta`.
- `stock.js` — `createStock`, `getStock`, `listStock`, `updateStock`, `useOne`,
  `verifyCount`.
- `locations.js`, `jarTypes.js` — `listLocations`/`addLocation`,
  `listJarTypes`/`getJarType`/`addJarType`.

**Schema changes need a new `DB_VERSION` and their own `if (oldVersion < n)` block** in
`db.js`. Blocks run in order for a user upgrading across several versions, so each must
stand alone and must never be edited after shipping. (The MVP had no migration story at all
— `CREATE TABLE IF NOT EXISTS` silently ignored every change.)

`resetDatabaseHandle()` **must close the connection**, not just null the cached promise.
`deleteDB` blocks forever while any connection is open, so every data-layer test hangs
otherwise.

### The unified Stock model

Canned jars, freezer items, and empty jars are all one `StockItem` — a count that goes down
when used — distinguished by `category` (`canned` / `freezer` / `supply`). One model, one
"use one" interaction. Jar sizes are a **seeded catalog** (`pint-regular`, `pint-wide`, …),
not a size enum crossed with a mouth enum, because crossing them invents jars that do not
exist.

`useOne` on a canned item also returns an empty jar of the same `jarTypeId` to supplies,
both writes in one transaction. Seed ids are deterministic slugs, not UUIDs, so they stay
stable across devices and backup files.

## Two rules that constrain the product

**The honesty rule.** Counts render as `"about 6 jars · last checked in March 2026"` once
stale (90 days), never a bare number. User zero will sometimes forget to log usage, and an
app caught being confidently wrong once is never trusted again. `formatCount` implements
this; don't route around it.

**No safety claims, ever.** The app shows age and quality bands only. It never says food is
safe or unsafe to eat, and never computes processing times, pressures, or altitude
adjustments. `quality.test.js` asserts the labels against a forbidden-words regex to keep
this from eroding. The liability here is botulism, not a bug report.

## Testing

Vitest + jsdom, with `fake-indexeddb/auto` in `vitest.setup.js` giving the data layer a real
IndexedDB in tests. **95 tests across 9 files.** Domain and data layers are written
test-first; the tests encode the design decisions above, so a failing test may be telling
you a rule was violated rather than that the test is wrong.

## Styling

`client/src/assets/main.css` holds the design system: CSS custom properties (the "Orchard &
Garden" palette) plus `.glass-card` and `.btn-primary`. Fonts load from the Google Fonts CDN
in `client/index.html` — **this needs to change before phase 6**, since a CDN font breaks an
offline-first PWA.

The glassmorphism look depends on `backdrop-filter` plus two animated blurred blobs on
`body::before/::after`. Target platform is Chrome on Android; the app is mobile-first.

## Conventions

- Conventional Commits scoped by area: `feat(domain):`, `feat(data):`, `chore(repo):`.
- One branch per phase, merged to `main` with `--no-ff` once the phase stands alone.
- Write the phase plan before writing the phase's code. Plans live in
  `docs/superpowers/plans/`.
