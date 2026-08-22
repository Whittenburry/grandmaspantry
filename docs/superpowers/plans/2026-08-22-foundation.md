# Grandma's Shop Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean the repository and build a fully tested pure-domain layer and IndexedDB data layer that every later phase of the local-first rewrite calls into.

**Architecture:** Two layers with a hard boundary. `client/src/domain/` holds pure functions with no I/O — age arithmetic, quality bands, count confidence, validation — so every rule in the product is unit-testable without a database. `client/src/data/` is the only code permitted to touch IndexedDB; it exposes repository functions and owns a versioned schema with a real upgrade path. Views (a later phase) call the data layer and never touch storage directly.

**Tech Stack:** Vue 3, Vite 5, `idb` for IndexedDB, Vitest + `fake-indexeddb` for tests. No backend.

**Spec:** `docs/superpowers/specs/2026-08-22-grandmas-shop-design.md`

## Global Constraints

- **Node >= 20.** Required for `crypto.randomUUID` and `structuredClone` in the test environment.
- **All work happens inside `client/`.** The `api/` directory is deleted in Task 1.
- **New runtime dependencies are limited to `idb`.** `vite-plugin-pwa` arrives in a later phase.
- **Calendar dates are `YYYY-MM-DD` strings** (`dateStocked`, `useByDate`). **Timestamps are full ISO 8601 strings** (`createdAt`, `updatedAt`, `lastVerifiedAt`, `archivedAt`). Never mix the two.
- **The domain layer imports nothing from the data layer.** The dependency runs one way only.
- **Domain functions that depend on the current time take `now` as an explicit parameter.** They never call `new Date()` themselves.
- **The app never computes processing times, pressures, or altitude adjustments, and never asserts whether food is safe to eat.** Quality bands describe quality only.
- **Commits use Conventional Commits** scoped by area: `feat(domain):`, `feat(data):`, `chore(repo):`.
- **Branch per phase.** Task 1 runs on `chore/repo-hygiene`; Tasks 2–10 run on `feat/foundation`.

---

### Task 1: Repository hygiene

The repository currently tracks `node_modules/` and a binary SQLite file, and has no `.gitignore`. Every diff from here on is unreadable until this is fixed. There are also uncommitted UI changes in the working tree that must be preserved before anything else happens.

**Files:**
- Create: `.gitignore`
- Delete: `api/` (entire directory)
- Untrack: `api/node_modules/`, `client/node_modules/`, `api/database.sqlite`

**Interfaces:**
- Consumes: nothing
- Produces: a clean repository. No code interfaces.

- [ ] **Step 1: Preserve the existing working-tree changes**

There are uncommitted modifications to `client/index.html`, `client/src/App.vue`, and `client/src/assets/main.css`. Commit them first so they are not lost.

```bash
git checkout -b chore/repo-hygiene
git add client/index.html client/src/App.vue client/src/assets/main.css
git commit -m "feat(ui): in-progress styling changes from the MVP"
```

- [ ] **Step 2: Write the .gitignore**

```bash
cat > .gitignore <<'EOF'
node_modules/
dist/
dist-ssr/
coverage/

*.sqlite
*.sqlite-journal

.DS_Store
*.local
.env
.env.*
!.env.example

.vscode/*
!.vscode/extensions.json
.idea/
EOF
```

- [ ] **Step 3: Untrack the files that should never have been committed**

This produces a very large deletion commit. That is expected and correct.

```bash
git rm -r --cached --quiet api/node_modules client/node_modules
git rm --cached --quiet api/database.sqlite
```

- [ ] **Step 4: Verify the working tree still has its dependencies**

`git rm --cached` removes files from the index only. Confirm the actual directories survive, because the client must still build.

Run: `test -d client/node_modules && echo "PRESENT"`
Expected: `PRESENT`

Run: `git status --short | grep -c '^D  client/node_modules'`
Expected: a large non-zero number (staged deletions from the index only)

- [ ] **Step 5: Commit the hygiene change**

```bash
git add .gitignore
git commit -m "chore(repo): add gitignore and untrack node_modules and the sqlite database

The repository tracked both dependency trees and a binary SQLite file,
which made every diff unreadable. Files remain on disk; only the index
is changed."
```

- [ ] **Step 6: Delete the API**

The backend is retired by the local-first design. It stays recoverable in git history and at the `v0-mvp` tag.

```bash
git rm -r --quiet api
rm -rf api          # api/node_modules is untracked by now, so git leaves it behind
git commit -m "chore(repo): remove the Express API

Superseded by local-first IndexedDB storage. Recoverable at tag v0-mvp."
```

- [ ] **Step 7: Verify the client still builds**

Run: `cd client && npm run build`
Expected: build succeeds and writes `client/dist/`

- [ ] **Step 8: Merge to main**

```bash
git checkout main
git merge --no-ff chore/repo-hygiene -m "chore(repo): repository hygiene"
```

---

### Task 2: Test infrastructure

The repository has no tests at all. This task creates the first suite and proves it runs.

**Files:**
- Modify: `client/package.json`
- Create: `client/vitest.config.js`
- Create: `client/vitest.setup.js`
- Create: `client/src/domain/smoke.test.js` (deleted at the end of this task)

**Interfaces:**
- Consumes: nothing
- Produces: `npm test` and `npm run test:run` scripts; a jsdom + fake-indexeddb test environment available to all later tasks.

- [ ] **Step 1: Install the test and storage dependencies**

```bash
cd client
npm install idb
npm install --save-dev vitest jsdom @vue/test-utils fake-indexeddb
```

- [ ] **Step 2: Write the Vitest config**

Create `client/vitest.config.js`:

```js
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.js'],
    include: ['src/**/*.test.js'],
  },
})
```

- [ ] **Step 3: Write the test setup file**

`fake-indexeddb/auto` installs an in-memory IndexedDB onto the global object, so the data layer can be tested without a browser.

Create `client/vitest.setup.js`:

```js
import 'fake-indexeddb/auto'
```

- [ ] **Step 4: Add the test scripts**

In `client/package.json`, add to `"scripts"`:

```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 5: Write a smoke test to prove the harness works**

Create `client/src/domain/smoke.test.js`:

```js
import { describe, it, expect } from 'vitest'

describe('test harness', () => {
  it('runs tests', () => {
    expect(1 + 1).toBe(2)
  })

  it('provides an IndexedDB global', () => {
    expect(typeof indexedDB.open).toBe('function')
  })

  it('provides crypto.randomUUID', () => {
    expect(crypto.randomUUID()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    )
  })
})
```

- [ ] **Step 6: Run the smoke test**

Run: `cd client && npm run test:run`
Expected: 3 tests pass. If `crypto.randomUUID` fails, the Node version is below 20 — stop and upgrade.

- [ ] **Step 7: Delete the smoke test and commit**

```bash
cd client && rm src/domain/smoke.test.js
cd .. && git checkout -b feat/foundation
git add client/package.json client/package-lock.json client/vitest.config.js client/vitest.setup.js
git commit -m "test: add vitest with jsdom and fake-indexeddb"
```

---

### Task 3: Domain — age arithmetic and formatting

Every screen displays how old something is in plain language. This is the most-used rule in the product, and it must not drift across daylight-saving boundaries.

**Files:**
- Create: `client/src/domain/age.js`
- Test: `client/src/domain/age.test.js`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `daysBetween(from, to) -> number`
  - `monthsBetween(from, to) -> number`
  - `formatAge(from, to) -> string`

  `from` is a `YYYY-MM-DD` string; `to` is a `Date`. Both are compared as local calendar dates, so a jar canned yesterday reads "yesterday" regardless of the hour.

- [ ] **Step 1: Write the failing test**

Create `client/src/domain/age.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { daysBetween, monthsBetween, formatAge } from './age.js'

const at = (y, m, d) => new Date(y, m - 1, d, 13, 30)

describe('daysBetween', () => {
  it('counts whole calendar days', () => {
    expect(daysBetween('2026-08-01', at(2026, 8, 22))).toBe(21)
  })

  it('returns 0 for the same day regardless of time of day', () => {
    expect(daysBetween('2026-08-22', at(2026, 8, 22))).toBe(0)
  })

  it('survives a daylight-saving transition', () => {
    expect(daysBetween('2026-03-07', at(2026, 3, 9))).toBe(2)
  })

  it('is negative for future dates', () => {
    expect(daysBetween('2026-09-01', at(2026, 8, 22))).toBe(-10)
  })
})

describe('monthsBetween', () => {
  it('counts whole months', () => {
    expect(monthsBetween('2025-08-22', at(2026, 8, 22))).toBe(12)
  })

  it('does not count a month until the day-of-month is reached', () => {
    expect(monthsBetween('2025-08-23', at(2026, 8, 22))).toBe(11)
  })

  it('handles multi-year spans', () => {
    expect(monthsBetween('2024-02-10', at(2026, 8, 22))).toBe(30)
  })
})

describe('formatAge', () => {
  it.each([
    ['2026-08-22', 'today'],
    ['2026-08-21', 'yesterday'],
    ['2026-08-17', '5 days ago'],
    ['2026-07-20', '1 month ago'],
    ['2026-02-22', '6 months ago'],
    ['2025-06-22', '14 months ago'],
    ['2024-08-22', '2 years ago'],
    ['2024-05-22', '2 years, 3 months ago'],
  ])('renders %s as "%s"', (date, expected) => {
    expect(formatAge(date, at(2026, 8, 22))).toBe(expected)
  })

  it('does not pretend a future date is old', () => {
    expect(formatAge('2026-12-01', at(2026, 8, 22))).toBe('dated in the future')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd client && npm run test:run -- src/domain/age.test.js`
Expected: FAIL — `Failed to resolve import "./age.js"`

- [ ] **Step 3: Write the implementation**

Create `client/src/domain/age.js`:

```js
const MS_PER_DAY = 86_400_000

/**
 * Normalises a YYYY-MM-DD string or a Date to local midnight, so that
 * comparisons are between calendar days rather than instants.
 */
function toCalendarDate(value) {
  if (typeof value === 'string') {
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day)
  }
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

export function daysBetween(from, to) {
  // Rounded, not floored: a DST transition makes the span 23 or 25 hours.
  return Math.round((toCalendarDate(to) - toCalendarDate(from)) / MS_PER_DAY)
}

export function monthsBetween(from, to) {
  const start = toCalendarDate(from)
  const end = toCalendarDate(to)
  let months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth())
  if (end.getDate() < start.getDate()) months -= 1
  return months
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

export function formatAge(from, to) {
  const days = daysBetween(from, to)
  if (days < 0) return 'dated in the future'
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'

  const months = monthsBetween(from, to)
  if (months < 1) return `${days} days ago`
  if (months < 24) return `${plural(months, 'month')} ago`

  const years = Math.floor(months / 12)
  const remainder = months % 12
  if (remainder === 0) return `${plural(years, 'year')} ago`
  return `${plural(years, 'year')}, ${plural(remainder, 'month')} ago`
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd client && npm run test:run -- src/domain/age.test.js`
Expected: PASS, 16 tests

- [ ] **Step 5: Commit**

```bash
git add client/src/domain/age.js client/src/domain/age.test.js
git commit -m "feat(domain): add calendar-safe age arithmetic and formatting"
```

---

### Task 4: Domain — quality bands

Canned goods get a quality band derived from USDA guidance. This is the one place the app makes a claim about food, so the wording is deliberately about quality and never about safety.

**Files:**
- Create: `client/src/domain/categories.js`
- Create: `client/src/domain/quality.js`
- Test: `client/src/domain/quality.test.js`

**Interfaces:**
- Consumes: `monthsBetween` from `./age.js`
- Produces:
  - `CATEGORY_CANNED = 'canned'`, `CATEGORY_FREEZER = 'freezer'`, `CATEGORY_SUPPLY = 'supply'`, `CATEGORIES = [...]` from `./categories.js`
  - `QUALITY_GOOD = 'good'`, `QUALITY_USE_SOON = 'use-soon'`, `QUALITY_PAST_BEST = 'past-best'`
  - `qualityBand(dateStocked, now) -> string`
  - `qualityLabel(band) -> string`
  - `bandForItem(item, now) -> string | null` — null for anything that is not a canned item

- [ ] **Step 1: Write the failing test**

Create `client/src/domain/quality.test.js`:

```js
import { describe, it, expect } from 'vitest'
import {
  qualityBand,
  qualityLabel,
  bandForItem,
  QUALITY_GOOD,
  QUALITY_USE_SOON,
  QUALITY_PAST_BEST,
} from './quality.js'
import {
  CATEGORY_CANNED,
  CATEGORY_FREEZER,
  CATEGORY_SUPPLY,
} from './categories.js'

const now = new Date(2026, 7, 22, 13, 30)

describe('qualityBand', () => {
  it('is good under twelve months', () => {
    expect(qualityBand('2026-08-01', now)).toBe(QUALITY_GOOD)
    expect(qualityBand('2025-09-22', now)).toBe(QUALITY_GOOD)
  })

  it('says use soon from twelve through eighteen months inclusive', () => {
    expect(qualityBand('2025-08-22', now)).toBe(QUALITY_USE_SOON)
    expect(qualityBand('2025-02-22', now)).toBe(QUALITY_USE_SOON)
  })

  it('is past best quality beyond eighteen months', () => {
    expect(qualityBand('2025-02-21', now)).toBe(QUALITY_PAST_BEST)
    expect(qualityBand('2023-01-01', now)).toBe(QUALITY_PAST_BEST)
  })
})

describe('qualityLabel', () => {
  it('describes quality, never safety', () => {
    expect(qualityLabel(QUALITY_GOOD)).toBe('Good')
    expect(qualityLabel(QUALITY_USE_SOON)).toBe('Use soon')
    expect(qualityLabel(QUALITY_PAST_BEST)).toBe('Past best quality')
  })

  it('never claims anything is unsafe, expired, or bad', () => {
    const forbidden = /unsafe|expired|spoiled|bad|do not eat|discard|toxic/i
    for (const band of [QUALITY_GOOD, QUALITY_USE_SOON, QUALITY_PAST_BEST]) {
      expect(qualityLabel(band)).not.toMatch(forbidden)
    }
  })
})

describe('bandForItem', () => {
  it('bands canned items', () => {
    const item = { category: CATEGORY_CANNED, dateStocked: '2024-01-01' }
    expect(bandForItem(item, now)).toBe(QUALITY_PAST_BEST)
  })

  it('refuses to band freezer items, whose windows vary too much by food', () => {
    const item = { category: CATEGORY_FREEZER, dateStocked: '2024-01-01' }
    expect(bandForItem(item, now)).toBeNull()
  })

  it('refuses to band supplies, which do not age', () => {
    const item = { category: CATEGORY_SUPPLY, dateStocked: '2024-01-01' }
    expect(bandForItem(item, now)).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd client && npm run test:run -- src/domain/quality.test.js`
Expected: FAIL — `Failed to resolve import "./quality.js"`

- [ ] **Step 3: Write the implementations**

Create `client/src/domain/categories.js`:

```js
export const CATEGORY_CANNED = 'canned'
export const CATEGORY_FREEZER = 'freezer'
export const CATEGORY_SUPPLY = 'supply'

export const CATEGORIES = [CATEGORY_CANNED, CATEGORY_FREEZER, CATEGORY_SUPPLY]

export const CATEGORY_LABELS = {
  [CATEGORY_CANNED]: 'Canned',
  [CATEGORY_FREEZER]: 'Freezer',
  [CATEGORY_SUPPLY]: 'Supplies',
}
```

Create `client/src/domain/quality.js`:

```js
import { monthsBetween } from './age.js'
import { CATEGORY_CANNED } from './categories.js'

export const QUALITY_GOOD = 'good'
export const QUALITY_USE_SOON = 'use-soon'
export const QUALITY_PAST_BEST = 'past-best'

/**
 * USDA guidance: home-canned foods are best used within a year, and
 * high-acid goods hold their quality for 12 to 18 months. These bands
 * describe QUALITY ONLY. The app never asserts that food is safe or
 * unsafe to eat — that judgement belongs to the person holding the jar.
 */
export function qualityBand(dateStocked, now) {
  const months = monthsBetween(dateStocked, now)
  if (months < 12) return QUALITY_GOOD
  if (months <= 18) return QUALITY_USE_SOON
  return QUALITY_PAST_BEST
}

export function qualityLabel(band) {
  switch (band) {
    case QUALITY_GOOD:
      return 'Good'
    case QUALITY_USE_SOON:
      return 'Use soon'
    case QUALITY_PAST_BEST:
      return 'Past best quality'
    default:
      return ''
  }
}

export function bandForItem(item, now) {
  if (item.category !== CATEGORY_CANNED) return null
  return qualityBand(item.dateStocked, now)
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd client && npm run test:run -- src/domain/quality.test.js`
Expected: PASS, 8 tests

- [ ] **Step 5: Commit**

```bash
git add client/src/domain/categories.js client/src/domain/quality.js client/src/domain/quality.test.js
git commit -m "feat(domain): add USDA-derived quality bands for canned goods

Bands describe quality only. The app makes no safety claim about food."
```

---

### Task 5: Domain — count confidence

This implements the honesty rule from the spec. She will sometimes forget to log usage, and an app that is confidently wrong once loses trust permanently. Counts that have not been touched recently must visibly degrade rather than lie.

**Files:**
- Create: `client/src/domain/confidence.js`
- Test: `client/src/domain/confidence.test.js`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `STALE_AFTER_DAYS = 90`
  - `CONFIDENCE_FRESH = 'fresh'`, `CONFIDENCE_STALE = 'stale'`
  - `countConfidence(item, now) -> string`
  - `formatCount(item, now) -> string`

  `item` needs `quantity`, `unit`, `updatedAt`, and optionally `lastVerifiedAt`.

- [ ] **Step 1: Write the failing test**

Create `client/src/domain/confidence.test.js`:

```js
import { describe, it, expect } from 'vitest'
import {
  countConfidence,
  formatCount,
  CONFIDENCE_FRESH,
  CONFIDENCE_STALE,
} from './confidence.js'

const now = new Date(2026, 7, 22, 13, 30)
const iso = (y, m, d) => new Date(y, m - 1, d, 9, 0).toISOString()

const item = (overrides) => ({
  quantity: 6,
  unit: 'jars',
  updatedAt: iso(2026, 8, 1),
  lastVerifiedAt: null,
  ...overrides,
})

describe('countConfidence', () => {
  it('is fresh when recently verified', () => {
    expect(countConfidence(item({ lastVerifiedAt: iso(2026, 7, 1) }), now))
      .toBe(CONFIDENCE_FRESH)
  })

  it('is fresh when recently updated even without a verification', () => {
    expect(countConfidence(item({ updatedAt: iso(2026, 8, 20) }), now))
      .toBe(CONFIDENCE_FRESH)
  })

  it('goes stale past ninety days', () => {
    expect(
      countConfidence(
        item({ updatedAt: iso(2026, 1, 1), lastVerifiedAt: iso(2026, 1, 1) }),
        now
      )
    ).toBe(CONFIDENCE_STALE)
  })

  it('uses the most recent of the two timestamps', () => {
    expect(
      countConfidence(
        item({ updatedAt: iso(2026, 1, 1), lastVerifiedAt: iso(2026, 8, 10) }),
        now
      )
    ).toBe(CONFIDENCE_FRESH)
  })
})

describe('formatCount', () => {
  it('states a fresh count plainly', () => {
    expect(formatCount(item({ lastVerifiedAt: iso(2026, 8, 10) }), now))
      .toBe('6 jars')
  })

  it('singularises a count of one', () => {
    expect(
      formatCount(item({ quantity: 1, lastVerifiedAt: iso(2026, 8, 10) }), now)
    ).toBe('1 jar')
  })

  it('singularises pounds and packs', () => {
    const fresh = { updatedAt: iso(2026, 8, 10) }
    expect(formatCount(item({ quantity: 1, unit: 'lbs', ...fresh }), now))
      .toBe('1 lb')
    expect(formatCount(item({ quantity: 1, unit: 'packs', ...fresh }), now))
      .toBe('1 pack')
  })

  it('hedges a stale count and says when it was last checked', () => {
    const stale = item({
      updatedAt: iso(2026, 3, 3),
      lastVerifiedAt: iso(2026, 3, 3),
    })
    expect(formatCount(stale, now)).toBe(
      'about 6 jars · last checked in March 2026'
    )
  })

  it('never states a stale count as though it were certain', () => {
    const stale = item({ updatedAt: iso(2025, 1, 1) })
    expect(formatCount(stale, now)).toMatch(/^about /)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd client && npm run test:run -- src/domain/confidence.test.js`
Expected: FAIL — `Failed to resolve import "./confidence.js"`

- [ ] **Step 3: Write the implementation**

Create `client/src/domain/confidence.js`:

```js
const MS_PER_DAY = 86_400_000

export const STALE_AFTER_DAYS = 90
export const CONFIDENCE_FRESH = 'fresh'
export const CONFIDENCE_STALE = 'stale'

const SINGULARS = {
  jars: 'jar',
  lbs: 'lb',
  packs: 'pack',
  packages: 'package',
  count: 'count',
}

function unitFor(quantity, unit) {
  if (quantity === 1) return SINGULARS[unit] ?? unit.replace(/s$/, '')
  return unit
}

function lastTouched(item) {
  const stamps = [item.lastVerifiedAt, item.updatedAt]
    .filter(Boolean)
    .map((value) => new Date(value).getTime())
  return stamps.length ? Math.max(...stamps) : null
}

export function countConfidence(item, now) {
  const touched = lastTouched(item)
  if (touched === null) return CONFIDENCE_STALE
  const days = (now.getTime() - touched) / MS_PER_DAY
  return days > STALE_AFTER_DAYS ? CONFIDENCE_STALE : CONFIDENCE_FRESH
}

/**
 * The honesty rule. A count we have not confirmed recently is presented as
 * an estimate with the date of the last check, never as a bare number. An
 * app that is confidently wrong once is not trusted again.
 */
export function formatCount(item, now) {
  const unit = unitFor(item.quantity, item.unit)
  if (countConfidence(item, now) === CONFIDENCE_FRESH) {
    return `${item.quantity} ${unit}`
  }
  const checked = new Date(lastTouched(item))
  const when = checked.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
  return `about ${item.quantity} ${unit} · last checked in ${when}`
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd client && npm run test:run -- src/domain/confidence.test.js`
Expected: PASS, 9 tests

- [ ] **Step 5: Commit**

```bash
git add client/src/domain/confidence.js client/src/domain/confidence.test.js
git commit -m "feat(domain): add count confidence and honest count formatting"
```

---

### Task 6: Domain — stock validation and jar descriptions

Validation lives in the domain layer so it is testable without a database, and so the data layer has a single place to reject bad input.

**Files:**
- Create: `client/src/domain/validation.js`
- Create: `client/src/domain/jars.js`
- Test: `client/src/domain/validation.test.js`
- Test: `client/src/domain/jars.test.js`

**Interfaces:**
- Consumes: `CATEGORIES`, `CATEGORY_CANNED`, `CATEGORY_SUPPLY` from `./categories.js`
- Produces:
  - `validateStockInput(input) -> string[]` — an array of human-readable problems, empty when valid
  - `describeJarType(jarType) -> string`

- [ ] **Step 1: Write the failing tests**

Create `client/src/domain/validation.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { validateStockInput } from './validation.js'
import { CATEGORY_CANNED, CATEGORY_FREEZER, CATEGORY_SUPPLY } from './categories.js'

const valid = (overrides) => ({
  category: CATEGORY_FREEZER,
  name: 'Ground beef',
  quantity: 5,
  unit: 'lbs',
  dateStocked: '2026-08-01',
  ...overrides,
})

describe('validateStockInput', () => {
  it('accepts a valid item', () => {
    expect(validateStockInput(valid())).toEqual([])
  })

  it('requires a name', () => {
    expect(validateStockInput(valid({ name: '   ' }))).toContain('Name is required')
  })

  it('rejects an unknown category', () => {
    expect(validateStockInput(valid({ category: 'pickled' })))
      .toContain('Category must be one of: canned, freezer, supply')
  })

  it('rejects a negative quantity', () => {
    expect(validateStockInput(valid({ quantity: -1 })))
      .toContain('Quantity cannot be negative')
  })

  it('rejects a non-integer jar count', () => {
    expect(validateStockInput(valid({ category: CATEGORY_CANNED, unit: 'jars', quantity: 2.5, jarTypeId: 'pint-regular' })))
      .toContain('Jars must be a whole number')
  })

  it('allows fractional pounds', () => {
    expect(validateStockInput(valid({ unit: 'lbs', quantity: 2.5 }))).toEqual([])
  })

  it('requires a unit', () => {
    expect(validateStockInput(valid({ unit: '' }))).toContain('Unit is required')
  })

  it('requires a calendar date in YYYY-MM-DD form', () => {
    expect(validateStockInput(valid({ dateStocked: '08/01/2026' })))
      .toContain('Date must be in YYYY-MM-DD form')
  })

  it('requires a jar type on canned items', () => {
    expect(validateStockInput(valid({ category: CATEGORY_CANNED, unit: 'jars', jarTypeId: null })))
      .toContain('Canned items need a jar type')
  })

  it('requires a supply type on supplies', () => {
    expect(validateStockInput(valid({ category: CATEGORY_SUPPLY, unit: 'count', supplyType: null })))
      .toContain('Supplies need a supply type')
  })

  it('reports every problem at once rather than only the first', () => {
    const problems = validateStockInput({ category: 'nope', name: '', quantity: -2, unit: '', dateStocked: 'x' })
    expect(problems.length).toBeGreaterThanOrEqual(5)
  })
})
```

Create `client/src/domain/jars.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { describeJarType } from './jars.js'

describe('describeJarType', () => {
  it('names the jar with its volume and mouth', () => {
    expect(
      describeJarType({ name: 'Quart', ounces: 32, mouth: 'Wide' })
    ).toBe('Quart (32 oz) · Wide mouth')
  })

  it('distinguishes the two pints, which differ only by mouth', () => {
    const regular = describeJarType({ name: 'Pint', ounces: 16, mouth: 'Regular' })
    const wide = describeJarType({ name: 'Pint', ounces: 16, mouth: 'Wide' })
    expect(regular).not.toBe(wide)
  })

  it('returns an empty string for a missing jar type', () => {
    expect(describeJarType(null)).toBe('')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd client && npm run test:run -- src/domain/validation.test.js src/domain/jars.test.js`
Expected: FAIL — both imports unresolved

- [ ] **Step 3: Write the implementations**

Create `client/src/domain/validation.js`:

```js
import { CATEGORIES, CATEGORY_CANNED, CATEGORY_SUPPLY } from './categories.js'

const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Returns every problem with the input, not just the first, so a form can
 * show all of them at once instead of making the user resubmit repeatedly.
 */
export function validateStockInput(input) {
  const problems = []

  if (!input.name || !input.name.trim()) {
    problems.push('Name is required')
  }

  if (!CATEGORIES.includes(input.category)) {
    problems.push(`Category must be one of: ${CATEGORIES.join(', ')}`)
  }

  if (typeof input.quantity !== 'number' || Number.isNaN(input.quantity)) {
    problems.push('Quantity must be a number')
  } else if (input.quantity < 0) {
    problems.push('Quantity cannot be negative')
  } else if (input.unit === 'jars' && !Number.isInteger(input.quantity)) {
    problems.push('Jars must be a whole number')
  }

  if (!input.unit) {
    problems.push('Unit is required')
  }

  if (!input.dateStocked || !CALENDAR_DATE.test(input.dateStocked)) {
    problems.push('Date must be in YYYY-MM-DD form')
  }

  if (input.category === CATEGORY_CANNED && !input.jarTypeId) {
    problems.push('Canned items need a jar type')
  }

  if (input.category === CATEGORY_SUPPLY && !input.supplyType) {
    problems.push('Supplies need a supply type')
  }

  return problems
}
```

Create `client/src/domain/jars.js`:

```js
/**
 * Jars are described by name, volume and mouth together because several
 * standard jars share a name and volume and differ only by mouth — the
 * regular and wide-mouth pint, and the regular and wide-mouth quart.
 */
export function describeJarType(jarType) {
  if (!jarType) return ''
  return `${jarType.name} (${jarType.ounces} oz) · ${jarType.mouth} mouth`
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd client && npm run test:run -- src/domain/validation.test.js src/domain/jars.test.js`
Expected: PASS, 14 tests

- [ ] **Step 5: Commit**

```bash
git add client/src/domain/validation.js client/src/domain/validation.test.js client/src/domain/jars.js client/src/domain/jars.test.js
git commit -m "feat(domain): add stock validation and jar type descriptions"
```

---

### Task 7: Data — database schema and seeds

The MVP created its schema with `CREATE TABLE IF NOT EXISTS`, which silently ignores every later change and leaves no migration story. This task establishes a versioned schema with a real upgrade path from the start.

Seed identifiers are deterministic slugs rather than random UUIDs, so that seeded rows are stable across devices and backups.

**Files:**
- Create: `client/src/data/seeds/locations.js`
- Create: `client/src/data/seeds/jarTypes.js`
- Create: `client/src/data/db.js`
- Test: `client/src/data/db.test.js`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `DB_NAME = 'grandmas-shop'`, `DB_VERSION = 1`
  - `openDatabase() -> Promise<IDBPDatabase>`
  - `resetDatabaseHandle() -> Promise<void>` — closes and drops the cached connection so tests can start clean
  - `SEED_LOCATIONS`, `SEED_JAR_TYPES`

  Object stores: `stock` (keyPath `id`, indexes `by-category`, `by-location`, `by-date-stocked`), `recipes`, `photos`, `locations`, `jarTypes`, `meta` (keyPath `key`).

- [ ] **Step 1: Write the seed data**

Create `client/src/data/seeds/locations.js`:

```js
export const SEED_LOCATIONS = [
  { id: 'basement-freezer', name: 'Basement freezer', sortOrder: 10, isSeeded: true },
  { id: 'kitchen-freezer', name: 'Kitchen freezer', sortOrder: 20, isSeeded: true },
  { id: 'basement-shelf', name: 'Basement shelf', sortOrder: 30, isSeeded: true },
  { id: 'pantry', name: 'Pantry', sortOrder: 40, isSeeded: true },
]
```

Create `client/src/data/seeds/jarTypes.js`:

```js
/**
 * The standard Ball lineup. Modelled as a catalog rather than a size enum
 * crossed with a mouth enum, because crossing them invents jars that do not
 * exist — there is no wide-mouth quarter-pint jelly jar.
 */
export const SEED_JAR_TYPES = [
  { id: 'quarter-pint-jelly', name: 'Quarter-pint jelly', ounces: 4, millilitres: 125, mouth: 'Regular', isSeeded: true, sortOrder: 10 },
  { id: 'half-pint', name: 'Half-pint', ounces: 8, millilitres: 250, mouth: 'Regular', isSeeded: true, sortOrder: 20 },
  { id: 'half-pint-jelly', name: 'Half-pint jelly', ounces: 8, millilitres: 250, mouth: 'Regular', isSeeded: true, sortOrder: 30 },
  { id: 'three-quarter-pint-jelly', name: 'Three-quarter-pint jelly', ounces: 12, millilitres: 375, mouth: 'Regular', isSeeded: true, sortOrder: 40 },
  { id: 'pint-regular', name: 'Pint', ounces: 16, millilitres: 500, mouth: 'Regular', isSeeded: true, sortOrder: 50 },
  { id: 'pint-wide', name: 'Pint', ounces: 16, millilitres: 500, mouth: 'Wide', isSeeded: true, sortOrder: 60 },
  { id: 'pint-and-a-half', name: 'Pint and a half', ounces: 24, millilitres: 750, mouth: 'Regular', isSeeded: true, sortOrder: 70 },
  { id: 'quart-regular', name: 'Quart', ounces: 32, millilitres: 1000, mouth: 'Regular', isSeeded: true, sortOrder: 80 },
  { id: 'quart-wide', name: 'Quart', ounces: 32, millilitres: 1000, mouth: 'Wide', isSeeded: true, sortOrder: 90 },
  { id: 'half-gallon', name: 'Half gallon', ounces: 64, millilitres: 2000, mouth: 'Wide', isSeeded: true, sortOrder: 100 },
]
```

- [ ] **Step 2: Write the failing test**

Create `client/src/data/db.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest'
import { deleteDB } from 'idb'
import { openDatabase, resetDatabaseHandle, DB_NAME, DB_VERSION } from './db.js'
import { SEED_LOCATIONS } from './seeds/locations.js'
import { SEED_JAR_TYPES } from './seeds/jarTypes.js'

beforeEach(async () => {
  await resetDatabaseHandle()
  await deleteDB(DB_NAME)
})

describe('openDatabase', () => {
  it('creates every object store', async () => {
    const db = await openDatabase()
    expect([...db.objectStoreNames].sort()).toEqual(
      ['jarTypes', 'locations', 'meta', 'photos', 'recipes', 'stock'].sort()
    )
  })

  it('indexes stock for the queries the shelf makes', async () => {
    const db = await openDatabase()
    const store = db.transaction('stock').objectStore('stock')
    expect([...store.indexNames].sort()).toEqual(
      ['by-category', 'by-date-stocked', 'by-location'].sort()
    )
  })

  it('opens at the declared version', async () => {
    const db = await openDatabase()
    expect(db.version).toBe(DB_VERSION)
  })

  it('seeds the storage locations', async () => {
    const db = await openDatabase()
    const stored = await db.getAll('locations')
    expect(stored).toHaveLength(SEED_LOCATIONS.length)
    expect(stored.map((l) => l.id)).toContain('basement-freezer')
  })

  it('seeds the full jar catalog', async () => {
    const db = await openDatabase()
    const stored = await db.getAll('jarTypes')
    expect(stored).toHaveLength(SEED_JAR_TYPES.length)
  })

  it('seeds both pints, which differ only by mouth', async () => {
    const db = await openDatabase()
    const regular = await db.get('jarTypes', 'pint-regular')
    const wide = await db.get('jarTypes', 'pint-wide')
    expect(regular.ounces).toBe(16)
    expect(wide.ounces).toBe(16)
    expect(regular.mouth).toBe('Regular')
    expect(wide.mouth).toBe('Wide')
  })

  it('returns the same connection on repeated calls', async () => {
    const first = await openDatabase()
    const second = await openDatabase()
    expect(first).toBe(second)
  })

  it('does not duplicate seeds when reopened', async () => {
    await openDatabase()
    await resetDatabaseHandle()
    const db = await openDatabase()
    expect(await db.getAll('jarTypes')).toHaveLength(SEED_JAR_TYPES.length)
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd client && npm run test:run -- src/data/db.test.js`
Expected: FAIL — `Failed to resolve import "./db.js"`

- [ ] **Step 4: Write the implementation**

Create `client/src/data/db.js`:

```js
import { openDB } from 'idb'
import { SEED_LOCATIONS } from './seeds/locations.js'
import { SEED_JAR_TYPES } from './seeds/jarTypes.js'

export const DB_NAME = 'grandmas-shop'
export const DB_VERSION = 1

let dbPromise = null

/**
 * Every schema change gets a new DB_VERSION and its own `if (oldVersion < n)`
 * block below. Blocks run in order for a user upgrading across several
 * versions at once, so each must stand alone and must never be edited after
 * it has shipped.
 */
export function openDatabase() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const stock = db.createObjectStore('stock', { keyPath: 'id' })
          stock.createIndex('by-category', 'category')
          stock.createIndex('by-location', 'locationId')
          stock.createIndex('by-date-stocked', 'dateStocked')

          db.createObjectStore('recipes', { keyPath: 'id' })
          db.createObjectStore('photos', { keyPath: 'id' })
          db.createObjectStore('meta', { keyPath: 'key' })

          const locations = db.createObjectStore('locations', { keyPath: 'id' })
          for (const location of SEED_LOCATIONS) locations.add(location)

          const jarTypes = db.createObjectStore('jarTypes', { keyPath: 'id' })
          for (const jarType of SEED_JAR_TYPES) jarTypes.add(jarType)
        }
      },
    })
  }
  return dbPromise
}

/**
 * Closes and drops the cached connection. Used by tests between cases.
 * The close is essential: `deleteDB` blocks indefinitely while any
 * connection to the database is still open.
 */
export async function resetDatabaseHandle() {
  if (dbPromise) {
    const db = await dbPromise
    db.close()
    dbPromise = null
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd client && npm run test:run -- src/data/db.test.js`
Expected: PASS, 8 tests

- [ ] **Step 6: Commit**

```bash
git add client/src/data/db.js client/src/data/db.test.js client/src/data/seeds
git commit -m "feat(data): add versioned IndexedDB schema with seeded locations and jars"
```

---

### Task 8: Data — location and jar type repositories

**Files:**
- Create: `client/src/data/locations.js`
- Create: `client/src/data/jarTypes.js`
- Test: `client/src/data/locations.test.js`
- Test: `client/src/data/jarTypes.test.js`

**Interfaces:**
- Consumes: `openDatabase` from `./db.js`
- Produces:
  - `listLocations() -> Promise<Location[]>` — ordered by `sortOrder`
  - `addLocation(name) -> Promise<Location>` — throws on blank or duplicate names
  - `listJarTypes() -> Promise<JarType[]>` — ordered by `sortOrder`
  - `getJarType(id) -> Promise<JarType | undefined>`
  - `addJarType({ name, ounces, millilitres, mouth }) -> Promise<JarType>`

- [ ] **Step 1: Write the failing tests**

Create `client/src/data/locations.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest'
import { deleteDB } from 'idb'
import { resetDatabaseHandle, DB_NAME } from './db.js'
import { listLocations, addLocation } from './locations.js'

beforeEach(async () => {
  await resetDatabaseHandle()
  await deleteDB(DB_NAME)
})

describe('listLocations', () => {
  it('returns the seeded locations in order', async () => {
    const names = (await listLocations()).map((l) => l.name)
    expect(names).toEqual([
      'Basement freezer',
      'Kitchen freezer',
      'Basement shelf',
      'Pantry',
    ])
  })
})

describe('addLocation', () => {
  it('adds a location at the end of the order', async () => {
    const added = await addLocation('Garage shelf')
    expect(added.name).toBe('Garage shelf')
    expect(added.isSeeded).toBe(false)
    const names = (await listLocations()).map((l) => l.name)
    expect(names[names.length - 1]).toBe('Garage shelf')
  })

  it('trims surrounding whitespace', async () => {
    const added = await addLocation('  Spare fridge  ')
    expect(added.name).toBe('Spare fridge')
  })

  it('rejects a blank name', async () => {
    await expect(addLocation('   ')).rejects.toThrow('Location name is required')
  })

  it('rejects a duplicate name regardless of case', async () => {
    await expect(addLocation('basement FREEZER')).rejects.toThrow(
      'A location named "basement FREEZER" already exists'
    )
  })
})
```

Create `client/src/data/jarTypes.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest'
import { deleteDB } from 'idb'
import { resetDatabaseHandle, DB_NAME } from './db.js'
import { listJarTypes, getJarType, addJarType } from './jarTypes.js'

beforeEach(async () => {
  await resetDatabaseHandle()
  await deleteDB(DB_NAME)
})

describe('listJarTypes', () => {
  it('returns the catalog smallest first', async () => {
    const ounces = (await listJarTypes()).map((j) => j.ounces)
    expect(ounces).toEqual([4, 8, 8, 12, 16, 16, 24, 32, 32, 64])
  })
})

describe('getJarType', () => {
  it('fetches a seeded jar by its stable slug', async () => {
    const jar = await getJarType('quart-wide')
    expect(jar.name).toBe('Quart')
    expect(jar.mouth).toBe('Wide')
  })

  it('returns undefined for an unknown id', async () => {
    expect(await getJarType('nope')).toBeUndefined()
  })
})

describe('addJarType', () => {
  it('adds a jar the catalog is missing', async () => {
    const added = await addJarType({
      name: 'Twelve-ounce squat',
      ounces: 12,
      millilitres: 355,
      mouth: 'Wide',
    })
    expect(added.isSeeded).toBe(false)
    expect(await getJarType(added.id)).toBeTruthy()
  })

  it('rejects a jar with no name', async () => {
    await expect(
      addJarType({ name: '', ounces: 12, millilitres: 355, mouth: 'Wide' })
    ).rejects.toThrow('Jar name is required')
  })

  it('rejects an unknown mouth type', async () => {
    await expect(
      addJarType({ name: 'Odd', ounces: 12, millilitres: 355, mouth: 'Square' })
    ).rejects.toThrow('Mouth must be Regular or Wide')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd client && npm run test:run -- src/data/locations.test.js src/data/jarTypes.test.js`
Expected: FAIL — both imports unresolved

- [ ] **Step 3: Write the implementations**

Create `client/src/data/locations.js`:

```js
import { openDatabase } from './db.js'

function byOrder(a, b) {
  return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
}

export async function listLocations() {
  const db = await openDatabase()
  const all = await db.getAll('locations')
  return all.sort(byOrder)
}

export async function addLocation(name) {
  const trimmed = (name ?? '').trim()
  if (!trimmed) throw new Error('Location name is required')

  const db = await openDatabase()
  const existing = await db.getAll('locations')

  const clash = existing.some(
    (l) => l.name.toLowerCase() === trimmed.toLowerCase()
  )
  if (clash) throw new Error(`A location named "${name}" already exists`)

  const location = {
    id: crypto.randomUUID(),
    name: trimmed,
    sortOrder: Math.max(0, ...existing.map((l) => l.sortOrder)) + 10,
    isSeeded: false,
    createdAt: new Date().toISOString(),
  }
  await db.add('locations', location)
  return location
}
```

Create `client/src/data/jarTypes.js`:

```js
import { openDatabase } from './db.js'

const MOUTHS = ['Regular', 'Wide']

function byOrder(a, b) {
  return a.sortOrder - b.sortOrder
}

export async function listJarTypes() {
  const db = await openDatabase()
  const all = await db.getAll('jarTypes')
  return all.sort(byOrder)
}

export async function getJarType(id) {
  if (!id) return undefined
  const db = await openDatabase()
  return db.get('jarTypes', id)
}

export async function addJarType({ name, ounces, millilitres, mouth }) {
  const trimmed = (name ?? '').trim()
  if (!trimmed) throw new Error('Jar name is required')
  if (!MOUTHS.includes(mouth)) throw new Error('Mouth must be Regular or Wide')

  const db = await openDatabase()
  const existing = await db.getAll('jarTypes')

  const jarType = {
    id: crypto.randomUUID(),
    name: trimmed,
    ounces,
    millilitres,
    mouth,
    isSeeded: false,
    sortOrder: Math.max(0, ...existing.map((j) => j.sortOrder)) + 10,
  }
  await db.add('jarTypes', jarType)
  return jarType
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd client && npm run test:run -- src/data/locations.test.js src/data/jarTypes.test.js`
Expected: PASS, 11 tests

- [ ] **Step 5: Commit**

```bash
git add client/src/data/locations.js client/src/data/locations.test.js client/src/data/jarTypes.js client/src/data/jarTypes.test.js
git commit -m "feat(data): add location and jar type repositories"
```

---

### Task 9: Data — stock repository create, read, update

**Files:**
- Create: `client/src/data/stock.js`
- Test: `client/src/data/stock.test.js`

**Interfaces:**
- Consumes: `openDatabase` from `./db.js`; `validateStockInput` from `../domain/validation.js`; category constants from `../domain/categories.js`
- Produces:
  - `createStock(input) -> Promise<StockItem>` — throws with all validation problems joined by `; `
  - `getStock(id) -> Promise<StockItem | undefined>`
  - `listStock({ category, locationId, includeArchived }) -> Promise<StockItem[]>` — oldest `dateStocked` first
  - `updateStock(id, patch) -> Promise<StockItem>`

  A created `StockItem` has: `id`, `category`, `name`, `quantity`, `initialQuantity`, `unit`, `dateStocked`, `locationId`, `lastVerifiedAt`, `useByDate`, `notes`, `recipeId`, `jarTypeId`, `method`, `supplyType`, `archivedAt`, `createdAt`, `updatedAt`.

- [ ] **Step 1: Write the failing test**

Create `client/src/data/stock.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest'
import { deleteDB } from 'idb'
import { resetDatabaseHandle, DB_NAME } from './db.js'
import { createStock, getStock, listStock, updateStock } from './stock.js'
import {
  CATEGORY_CANNED,
  CATEGORY_FREEZER,
  CATEGORY_SUPPLY,
} from '../domain/categories.js'

beforeEach(async () => {
  await resetDatabaseHandle()
  await deleteDB(DB_NAME)
})

const jam = (overrides) => ({
  category: CATEGORY_CANNED,
  name: 'Strawberry jam',
  quantity: 12,
  unit: 'jars',
  dateStocked: '2026-07-04',
  jarTypeId: 'half-pint',
  locationId: 'basement-shelf',
  ...overrides,
})

describe('createStock', () => {
  it('stores an item and returns it with generated fields', async () => {
    const item = await createStock(jam())
    expect(item.id).toBeTruthy()
    expect(item.quantity).toBe(12)
    expect(item.initialQuantity).toBe(12)
    expect(item.archivedAt).toBeNull()
    expect(item.createdAt).toBe(item.updatedAt)
  })

  it('treats creation as a verification, since she just counted them', async () => {
    const item = await createStock(jam())
    expect(item.lastVerifiedAt).toBe(item.createdAt)
  })

  it('trims the name', async () => {
    const item = await createStock(jam({ name: '  Peach butter  ' }))
    expect(item.name).toBe('Peach butter')
  })

  it('defaults the optional fields rather than leaving them undefined', async () => {
    const item = await createStock(jam())
    expect(item.notes).toBe('')
    expect(item.method).toBe('')
    expect(item.useByDate).toBeNull()
    expect(item.recipeId).toBeNull()
  })

  it('rejects invalid input with every problem at once', async () => {
    await expect(
      createStock(jam({ name: '', quantity: -3 }))
    ).rejects.toThrow(/Name is required.*Quantity cannot be negative/)
  })

  it('persists the item so it can be fetched again', async () => {
    const item = await createStock(jam())
    expect((await getStock(item.id)).name).toBe('Strawberry jam')
  })
})

describe('listStock', () => {
  beforeEach(async () => {
    await createStock(jam({ name: 'Old jam', dateStocked: '2024-01-01' }))
    await createStock(jam({ name: 'New jam', dateStocked: '2026-08-01' }))
    await createStock({
      category: CATEGORY_FREEZER,
      name: 'Ground beef',
      quantity: 8,
      unit: 'lbs',
      dateStocked: '2026-05-01',
      locationId: 'basement-freezer',
    })
  })

  it('returns everything oldest first, because that is what to open next', async () => {
    const names = (await listStock()).map((i) => i.name)
    expect(names).toEqual(['Old jam', 'Ground beef', 'New jam'])
  })

  it('filters by category', async () => {
    const items = await listStock({ category: CATEGORY_FREEZER })
    expect(items).toHaveLength(1)
    expect(items[0].name).toBe('Ground beef')
  })

  it('filters by location, since stock is spread across several places', async () => {
    const items = await listStock({ locationId: 'basement-freezer' })
    expect(items.map((i) => i.name)).toEqual(['Ground beef'])
  })

  it('hides archived items by default', async () => {
    const [oldest] = await listStock()
    await updateStock(oldest.id, { archivedAt: new Date().toISOString() })
    expect((await listStock()).map((i) => i.name)).toEqual([
      'Ground beef',
      'New jam',
    ])
  })

  it('includes archived items on request', async () => {
    const [oldest] = await listStock()
    await updateStock(oldest.id, { archivedAt: new Date().toISOString() })
    expect(await listStock({ includeArchived: true })).toHaveLength(3)
  })
})

describe('updateStock', () => {
  it('applies a patch and advances updatedAt', async () => {
    const item = await createStock(jam())
    await new Promise((resolve) => setTimeout(resolve, 2))
    const updated = await updateStock(item.id, { notes: 'Extra sweet' })
    expect(updated.notes).toBe('Extra sweet')
    expect(updated.updatedAt > item.updatedAt).toBe(true)
  })

  it('moves an item to another location without touching anything else', async () => {
    const item = await createStock(jam())
    const moved = await updateStock(item.id, { locationId: 'pantry' })
    expect(moved.locationId).toBe('pantry')
    expect(moved.quantity).toBe(12)
  })

  it('refuses to patch an id that does not exist', async () => {
    await expect(updateStock('missing', { notes: 'x' })).rejects.toThrow(
      'No stock item with id missing'
    )
  })

  it('revalidates, so a patch cannot make an item invalid', async () => {
    const item = await createStock(jam())
    await expect(updateStock(item.id, { quantity: -1 })).rejects.toThrow(
      'Quantity cannot be negative'
    )
  })

  it('never lets a patch rewrite the id', async () => {
    const item = await createStock(jam())
    const updated = await updateStock(item.id, { id: 'hijacked' })
    expect(updated.id).toBe(item.id)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd client && npm run test:run -- src/data/stock.test.js`
Expected: FAIL — `Failed to resolve import "./stock.js"`

- [ ] **Step 3: Write the implementation**

Create `client/src/data/stock.js`:

```js
import { openDatabase } from './db.js'
import { validateStockInput } from '../domain/validation.js'

function assertValid(item) {
  const problems = validateStockInput(item)
  if (problems.length) throw new Error(problems.join('; '))
}

export async function createStock(input) {
  const now = new Date().toISOString()
  const item = {
    id: crypto.randomUUID(),
    category: input.category,
    name: (input.name ?? '').trim(),
    quantity: input.quantity,
    initialQuantity: input.quantity,
    unit: input.unit,
    dateStocked: input.dateStocked,
    locationId: input.locationId ?? null,
    // Creating an item is itself a count, so it starts fully verified.
    lastVerifiedAt: now,
    useByDate: input.useByDate ?? null,
    notes: input.notes ?? '',
    recipeId: input.recipeId ?? null,
    jarTypeId: input.jarTypeId ?? null,
    method: input.method ?? '',
    supplyType: input.supplyType ?? null,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
  }
  assertValid(item)

  const db = await openDatabase()
  await db.add('stock', item)
  return item
}

export async function getStock(id) {
  const db = await openDatabase()
  return db.get('stock', id)
}

export async function listStock({
  category,
  locationId,
  includeArchived = false,
} = {}) {
  const db = await openDatabase()
  let items = await db.getAll('stock')

  if (category) items = items.filter((i) => i.category === category)
  if (locationId) items = items.filter((i) => i.locationId === locationId)
  if (!includeArchived) items = items.filter((i) => !i.archivedAt)

  // Oldest first: the shelf's whole job is answering "what do I open next?"
  return items.sort(
    (a, b) =>
      a.dateStocked.localeCompare(b.dateStocked) || a.name.localeCompare(b.name)
  )
}

export async function updateStock(id, patch) {
  const db = await openDatabase()
  const existing = await db.get('stock', id)
  if (!existing) throw new Error(`No stock item with id ${id}`)

  const updated = {
    ...existing,
    ...patch,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  }
  assertValid(updated)

  await db.put('stock', updated)
  return updated
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd client && npm run test:run -- src/data/stock.test.js`
Expected: PASS, 16 tests

- [ ] **Step 5: Commit**

```bash
git add client/src/data/stock.js client/src/data/stock.test.js
git commit -m "feat(data): add stock repository with create, read, list and update"
```

---

### Task 10: Data — using a jar and reconciling counts

The two interactions the whole app is built around. `useOne` also implements the empty-jar return: opening a canned jar puts an empty jar of the same type back into supplies. Both writes happen inside one transaction so a failure cannot leave the pantry half-updated.

**Files:**
- Modify: `client/src/data/stock.js`
- Modify: `client/src/data/stock.test.js`

**Interfaces:**
- Consumes: everything produced by Task 9
- Produces:
  - `useOne(id) -> Promise<{ item: StockItem, returnedJar: StockItem | null }>`
  - `verifyCount(id, quantity) -> Promise<StockItem>`
  - `SUPPLY_EMPTY_JAR = 'empty-jar'`

- [ ] **Step 1: Write the failing test**

Extend the existing import of `./stock.js` at the top of `client/src/data/stock.test.js` to also pull in `useOne`, `verifyCount`, and `SUPPLY_EMPTY_JAR`:

```js
import {
  createStock,
  getStock,
  listStock,
  updateStock,
  useOne,
  verifyCount,
  SUPPLY_EMPTY_JAR,
} from './stock.js'
```

Then append these suites to the bottom of the file:

```js

describe('useOne', () => {
  it('decrements the count', async () => {
    const created = await createStock(jam())
    const { item } = await useOne(created.id)
    expect(item.quantity).toBe(11)
  })

  it('counts using a jar as verifying it, so the count stays trustworthy', async () => {
    const created = await createStock(jam())
    await new Promise((resolve) => setTimeout(resolve, 2))
    const { item } = await useOne(created.id)
    expect(item.lastVerifiedAt > created.lastVerifiedAt).toBe(true)
  })

  it('archives the item when the last one is used', async () => {
    const created = await createStock(jam({ quantity: 1 }))
    const { item } = await useOne(created.id)
    expect(item.quantity).toBe(0)
    expect(item.archivedAt).not.toBeNull()
  })

  it('returns an empty jar of the same type to supplies', async () => {
    const created = await createStock(jam({ jarTypeId: 'quart-wide' }))
    const { returnedJar } = await useOne(created.id)
    expect(returnedJar.category).toBe(CATEGORY_SUPPLY)
    expect(returnedJar.supplyType).toBe(SUPPLY_EMPTY_JAR)
    expect(returnedJar.jarTypeId).toBe('quart-wide')
    expect(returnedJar.quantity).toBe(1)
  })

  it('adds to the existing empty jar record rather than creating a second', async () => {
    const created = await createStock(jam({ jarTypeId: 'pint-wide', quantity: 3 }))
    await useOne(created.id)
    await useOne(created.id)
    const supplies = await listStock({ category: CATEGORY_SUPPLY })
    expect(supplies).toHaveLength(1)
    expect(supplies[0].quantity).toBe(2)
  })

  it('keeps the two pints apart, since they are different jars', async () => {
    const regular = await createStock(jam({ jarTypeId: 'pint-regular' }))
    const wide = await createStock(jam({ name: 'Salsa', jarTypeId: 'pint-wide' }))
    await useOne(regular.id)
    await useOne(wide.id)
    const supplies = await listStock({ category: CATEGORY_SUPPLY })
    expect(supplies).toHaveLength(2)
    expect(supplies.map((s) => s.jarTypeId).sort()).toEqual([
      'pint-regular',
      'pint-wide',
    ])
  })

  it('does not return a jar for freezer items', async () => {
    const beef = await createStock({
      category: CATEGORY_FREEZER,
      name: 'Ground beef',
      quantity: 8,
      unit: 'lbs',
      dateStocked: '2026-05-01',
    })
    const { returnedJar } = await useOne(beef.id)
    expect(returnedJar).toBeNull()
  })

  it('refuses to use an item that is already gone', async () => {
    const created = await createStock(jam({ quantity: 1 }))
    await useOne(created.id)
    await expect(useOne(created.id)).rejects.toThrow(
      'Strawberry jam is already used up'
    )
  })

  it('refuses an unknown id', async () => {
    await expect(useOne('missing')).rejects.toThrow(
      'No stock item with id missing'
    )
  })
})

describe('verifyCount', () => {
  it('sets the count and marks it verified', async () => {
    const created = await createStock(jam())
    await new Promise((resolve) => setTimeout(resolve, 2))
    const checked = await verifyCount(created.id, 9)
    expect(checked.quantity).toBe(9)
    expect(checked.lastVerifiedAt > created.lastVerifiedAt).toBe(true)
  })

  it('archives an item found to be empty', async () => {
    const created = await createStock(jam())
    const checked = await verifyCount(created.id, 0)
    expect(checked.archivedAt).not.toBeNull()
  })

  it('un-archives an item found on the shelf after all', async () => {
    const created = await createStock(jam({ quantity: 1 }))
    await useOne(created.id)
    const checked = await verifyCount(created.id, 4)
    expect(checked.quantity).toBe(4)
    expect(checked.archivedAt).toBeNull()
  })

  it('rejects a negative count', async () => {
    const created = await createStock(jam())
    await expect(verifyCount(created.id, -1)).rejects.toThrow(
      'Quantity cannot be negative'
    )
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd client && npm run test:run -- src/data/stock.test.js`
Expected: FAIL — `useOne is not a function` / import errors

- [ ] **Step 3: Write the implementation**

First add this import to the **top** of `client/src/data/stock.js`, alongside the existing imports:

```js
import { CATEGORY_CANNED, CATEGORY_SUPPLY } from '../domain/categories.js'
```

Then append the rest to the bottom of the file:

```js
export const SUPPLY_EMPTY_JAR = 'empty-jar'

/**
 * Finds the open empty-jar record for this jar type and adds one, creating
 * the record if she has never had empties of this type before. Matching is
 * on jarTypeId, not size, so a wide-mouth quart returns a wide-mouth quart.
 *
 * Runs inside the caller's transaction so the decrement and the return
 * either both land or neither does.
 */
async function returnEmptyJar(store, jarTypeId, now) {
  const all = await store.getAll()
  const existing = all.find(
    (i) =>
      i.category === CATEGORY_SUPPLY &&
      i.supplyType === SUPPLY_EMPTY_JAR &&
      i.jarTypeId === jarTypeId &&
      !i.archivedAt
  )

  if (existing) {
    const updated = { ...existing, quantity: existing.quantity + 1, updatedAt: now }
    await store.put(updated)
    return updated
  }

  const created = {
    id: crypto.randomUUID(),
    category: CATEGORY_SUPPLY,
    name: 'Empty jars',
    quantity: 1,
    initialQuantity: 1,
    unit: 'jars',
    dateStocked: now.slice(0, 10),
    locationId: null,
    lastVerifiedAt: now,
    useByDate: null,
    notes: '',
    recipeId: null,
    jarTypeId,
    method: '',
    supplyType: SUPPLY_EMPTY_JAR,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
  }
  await store.put(created)
  return created
}

export async function useOne(id) {
  const db = await openDatabase()
  const tx = db.transaction('stock', 'readwrite')
  const store = tx.objectStore('stock')

  const existing = await store.get(id)
  if (!existing) throw new Error(`No stock item with id ${id}`)
  if (existing.quantity <= 0) {
    throw new Error(`${existing.name} is already used up`)
  }

  const now = new Date().toISOString()
  const quantity = existing.quantity - 1
  const item = {
    ...existing,
    quantity,
    // Handling an item is evidence of its count, so this counts as a check.
    lastVerifiedAt: now,
    updatedAt: now,
    archivedAt: quantity === 0 ? now : existing.archivedAt,
  }
  await store.put(item)

  let returnedJar = null
  if (item.category === CATEGORY_CANNED && item.jarTypeId) {
    returnedJar = await returnEmptyJar(store, item.jarTypeId, now)
  }

  await tx.done
  return { item, returnedJar }
}

export async function verifyCount(id, quantity) {
  const db = await openDatabase()
  const existing = await db.get('stock', id)
  if (!existing) throw new Error(`No stock item with id ${id}`)

  const now = new Date().toISOString()
  const updated = {
    ...existing,
    quantity,
    lastVerifiedAt: now,
    updatedAt: now,
    archivedAt: quantity === 0 ? (existing.archivedAt ?? now) : null,
  }
  assertValid(updated)

  await db.put('stock', updated)
  return updated
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd client && npm run test:run -- src/data/stock.test.js`
Expected: PASS, 29 tests

- [ ] **Step 5: Run the whole suite**

Run: `cd client && npm run test:run`
Expected: PASS, 95 tests across 9 files

- [ ] **Step 6: Commit and merge the phase**

```bash
git add client/src/data/stock.js client/src/data/stock.test.js
git commit -m "feat(data): add useOne with empty-jar return, and shelf-check reconciliation

Opening a canned jar returns an empty jar of the same type to supplies,
matched on jar type so a wide-mouth quart returns a wide-mouth quart.
Both writes share one transaction so a failure cannot half-update the
pantry."

git checkout main
git merge --no-ff feat/foundation -m "feat: domain and data foundation for the local-first rewrite"
```

---

## What this plan does not cover

Deliberately out of scope, each getting its own plan once these interfaces are reviewed:

- **Phase 2** — the shelf, add/edit forms, item detail, and the location-scoped shelf check UI
- **Phase 3** — recipes and photos
- **Phase 4** — labels, printing, and QR codes
- **Phase 5** — backup, restore, and the backup nudge
- **Phase 6** — `vite-plugin-pwa`, offline, persistent storage, deployment, on-device testing

The MVP's four existing views under `client/src/views/` are left untouched by this plan. They still reference the deleted `/api` endpoints and will be replaced in Phase 2.
