# Progress and Handoff

**Read this first.** It is the running state of the project: what we are building, why,
what is done, and what comes next. It survives context resets — the spec and plan hold the
detail, this holds the intent and the position.

**Update it** when a task completes (check the box), when a phase completes (move the phase
to Done and write a summary), and whenever a decision is made or a surprise is found.
Prefer writing something down over remembering it.

| | |
|---|---|
| **Spec** | [`superpowers/specs/2026-08-22-grandmas-shop-design.md`](superpowers/specs/2026-08-22-grandmas-shop-design.md) |
| **Active plan** | [`superpowers/plans/2026-08-22-foundation.md`](superpowers/plans/2026-08-22-foundation.md) |
| **Last updated** | 2026-08-22 |

---

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
| 0 | Not started | Repo hygiene: `.gitignore`, untrack `node_modules/` and the sqlite db, delete `api/` |
| 1 | Not started | Foundation: Vitest, `domain/` and `data/` layers, test-first |
| 2 | Not planned | Stock core: shelf, add/edit, use one, location-scoped shelf check, empty-jar return |
| 3 | Not planned | Recipes with photos |
| 4 | Not planned | Labels: screen, single print, sheet print, QR |
| 5 | Not planned | Backup, restore, and the backup nudge |
| 6 | Not planned | `vite-plugin-pwa`, offline, persistent storage, deploy, on-device testing |

Phases 2–6 are deliberately unplanned. They call into the interfaces Phase 1 establishes,
so each gets its own plan once the layer beneath it is real and reviewed.

## Current position

**Phase 0, Task 1, not yet started.** Nothing has been implemented. All work so far is
documentation.

### Phase 0 — Repository hygiene

- [ ] Task 1: Repository hygiene — branch `chore/repo-hygiene`

### Phase 1 — Foundation

Branch `feat/foundation`.

- [ ] Task 2: Test infrastructure (Vitest, jsdom, fake-indexeddb)
- [ ] Task 3: Domain — age arithmetic and formatting
- [ ] Task 4: Domain — quality bands
- [ ] Task 5: Domain — count confidence
- [ ] Task 6: Domain — stock validation and jar descriptions
- [ ] Task 7: Data — database schema and seeds
- [ ] Task 8: Data — location and jar type repositories
- [ ] Task 9: Data — stock repository create, read, update
- [ ] Task 10: Data — using a jar and reconciling counts

Expected end state: 95 tests across 9 files, all passing.

## Notes to self

- The MVP's four views under `client/src/views/` still call the deleted `/api` endpoints.
  They are untouched until Phase 2 and **the app will not run** in between. This is expected;
  do not "fix" it by reviving the API.
- `resetDatabaseHandle()` must close the connection, not just null the promise — `deleteDB`
  blocks forever otherwise, and every test hangs. Caught in plan review; do not regress it.
- Seed ids are deterministic slugs (`pint-wide`, `basement-freezer`), not UUIDs, so seeded
  rows stay stable across devices and backup files.
- Domain functions take `now` as an explicit parameter. They never call `new Date()`.

## Open threads

- Nothing blocking. Phases 2–6 each need a plan written when their turn comes.

## Conventions

- **Commits:** Conventional Commits scoped by area — `feat(domain):`, `feat(data):`,
  `chore(repo):`. Claude-authored commits carry a `Co-Authored-By` trailer.
- **Branches:** one per phase, merged to `main` with `--no-ff` once the phase stands alone.
- **TDD:** domain and data layers are written test-first. Write the failing test, watch it
  fail, then implement.
- **Models:** Opus for domain and data layers and for review; Sonnet for view components and
  print CSS from a settled spec. Single session, no agent fan-out — this project is too
  small for it to pay for itself.
