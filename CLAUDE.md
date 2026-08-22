# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Grandma's Shop — a home-canning inventory tracker. Two independent npm packages, no monorepo tooling:

- `api/` — Express + sqlite3, ESM (`"type": "module"`), port 3001
- `client/` — Vue 3 (`<script setup>` SFCs) + vue-router + Vite, port 5173

## Commands

Both packages must be installed and run separately; there is no root package.json.

```bash
cd api && npm install && npm run dev        # node --watch index.js  → :3001
cd client && npm install && npm run dev     # vite                   → :5173
cd client && npm run build                  # production bundle to client/dist
```

There is no test suite, no linter, and no formatter configured. If you add tests, you are choosing the runner — nothing is pinned yet.

Vite proxies `/api/*` → `http://localhost:3001`, so the client always uses relative `fetch('/api/...')` paths. Both servers must be running for anything to work.

## Architecture

### Data model and the jar lifecycle

`api/db.js` creates the whole schema inline at import time via `CREATE TABLE IF NOT EXISTS`, then seeds three `EmptyJar` rows. **There is no migration system.** Adding or changing a column on an existing table will silently do nothing against an existing `database.sqlite` — you must write an explicit `ALTER TABLE` or delete the db file.

Four tables: `RawIngredient`, `CannedBatch`, `EmptyJar`, `Recipe`.

The central domain invariant is jar conservation, implemented in `api/index.js`:

- `POST /api/canned-batches` — decrements `EmptyJar.quantity` for that size, then inserts the batch
- `POST /api/canned-batches/:id/use` — decrements the batch by 1 and increments `EmptyJar` back by 1
- `DELETE /api/canned-batches/:id` — does **not** return jars to inventory (asymmetry to be aware of)

`EmptyJar` is keyed by the `size` string (`UNIQUE`), not by id — all jar updates look up by size. The jar-size enum (`Half-Pint`, `Pint`, `Quart`) is duplicated in `api/db.js` (seed array) and `client/src/views/Pantry.vue` (the `<select>`); adding a size means editing both.

### Frontend structure

`client/src/main.js` holds the router (4 lazy-loaded routes). Each view in `client/src/views/` is self-contained: it calls `fetch` directly in `onMounted`, and re-fetches the entire collection after every mutation. There is no store, no shared API client, and no loading/error handling beyond `Dashboard.vue`. If you add a fifth view, follow that pattern or introduce a proper API layer deliberately — don't half-migrate.

`Dashboard.vue` derives its stats client-side by fetching all three collections and counting rows; there is no stats endpoint.

### Styling

`client/src/assets/main.css` is the design system: CSS custom properties (the "Orchard & Garden" palette), plus global `.glass-card` and `.btn-primary` utilities used by every view. Views add `<style scoped>` on top. Fonts (Playfair Display for headings, Quicksand for body) load from the Google Fonts CDN in `client/index.html`.

The glassmorphism look depends on `backdrop-filter` plus two animated blurred blobs on `body::before/::after`. Modal markup and its scoped CSS are copy-pasted across `Pantry.vue`, `RawGoods.vue`, and `Recipes.vue` — change one and check the other two.

## Repo state to know about

- **`node_modules/` and `api/database.sqlite` are committed to git and there is no `.gitignore`.** Expect noisy diffs; the sqlite binary shows up as modified any time the app runs.
- `Recipe.imagePath` and `CannedBatch.expirationDate` columns exist but nothing writes them — the Pantry form never sets an expiration date.
- No update or delete endpoints for recipes; no update for raw ingredients.
- No request validation and no real transactions — `db.serialize()` orders the statements but errors in the first `db.run` are unhandled, so a failed batch insert still leaves jars decremented, and jar counts can go negative.
