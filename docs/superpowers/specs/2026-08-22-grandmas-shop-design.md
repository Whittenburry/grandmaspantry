# Grandma's Shop — v1 Design

**Date:** 2026-08-22
**Status:** Approved for planning

## Context

Grandma's Shop began as an MVP: an Express + SQLite API with a Vue 3 client, tracking
canned batches, raw goods, empty jars, and recipes. This document redesigns it into
something a real person will use every week.

**User zero is the author's mother**, an experienced home canner. She is the inspiration
for the project, has a smartphone and is comfortable with it, and will test the app in
her own pantry. The app must be **free** — no subscription, for her or for anyone else
who adopts it. Hosting cost is therefore a design constraint, not an afterthought.

## The problem, as she actually experiences it

She has **no formal tracking system today** — she walks to the shelf and looks.

Food waste happens, but it is **rare**. When it does happen the cause is physical, not
clerical: jars sit behind other jars, and the date was written on the lid where it can't
be read once the jar is shelved. She has already partly solved this herself by moving to
front labels that carry the contents and details.

She has also specifically asked to track **empty jars** (by size *and* type) and **freezer
contents** — for example, how much uncooked ground beef she has on hand. Her described
workflow is: enter it into inventory once, then open the app to log when she uses it.

**The design target is therefore not "inventory management." It is: be a readable index
of a shelf she cannot see into, and make logging usage cheap enough that she keeps doing it.**

## Research summary

- Competitors exist and are mature. **Jarred** (iOS) offers altitude-adjusted processing
  times, batch timers, and jar-level pantry tracking on a freemium model. **JarTracker**
  (Android) does QR labels with device-only storage. **BeaglePrep** is notable for being
  the only one that actively nudges FIFO rotation. Basic batch logging is table stakes.
- The recurring failure across this category is **drift**: users log at canning time,
  never log consumption, the numbers desynchronize from the shelf, and the app is
  abandoned. Estimates in the space put rotation-related waste at 15–20%.
- **USDA** guidance: use home-canned foods within one year; high-acid goods hold best
  quality 12–18 months. Past that the issue is quality, not necessarily safety.
- **NCHFP** is emphatic that only lab-tested recipes are safe, because acidity and heat
  penetration have actually been measured. Untested recipes are guesses.
- Labeling best practice: label the jar, not the lid; include contents, date, and
  processing method with detail (`WB 20 min`, `PC 11lb 25min`).

## Design principles

### 1. The honesty rule

**The app never claims to know more than it does.** Counts display as
*"about 6 jars · last checked in March,"* never a bare *"6."* When a count goes stale it
visibly degrades rather than quietly lying.

Rationale: she will sometimes forget to log usage. An app that is confidently wrong once
loses trust permanently. An app that is visibly uncertain stays useful.

### 2. We are an index, not an authority

The app displays **how old something is**. It marks when a canned item has passed the
window where USDA says quality declines, framed explicitly as **quality**.

**The app never tells anyone whether food is safe to eat, and never computes or suggests
processing times, pressures, or altitude adjustments.** She is the expert; we are the
index. This is both an ethical line and the correct scope for a free family project — the
liability tail on canning-safety advice is botulism, not a bug report.

### 3. One verb, everywhere

Canned jars, freezer items, and empty jars are the same thing: a count that goes down when
used. They share one data model and one "use one" interaction. For someone who opens the
app a few times a month, one thing to learn instead of three is the difference between
adoption and abandonment.

## Domain model

### StockItem

The single core record. Category determines which optional fields apply and how the item
is displayed.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | Stable. Used in QR payloads and backups. |
| `category` | `canned` \| `freezer` \| `supply` | |
| `name` | string | "Strawberry Jam", "Ground Beef", "Pint Jars" |
| `quantity` | number | Current count |
| `initialQuantity` | number | What was originally stocked |
| `unit` | string | `jars`, `lbs`, `packages`, `count` |
| `dateStocked` | ISO date | Date canned / frozen / acquired |
| `location` | string? | Optional free text — "basement shelf", "chest freezer" |
| `lastVerifiedAt` | ISO datetime? | Set by shelf check |
| `useByDate` | ISO date? | Optional, user-set. Never inferred by the app. |
| `notes` | string? | |
| `recipeId` | uuid? | Canned items only |
| `archivedAt` | ISO datetime? | Set when the item is used up |
| `createdAt` / `updatedAt` | ISO datetime | |

Category-specific optional fields:

- **canned**: `jarSize` (Half-Pint / Pint / Quart), `jarMouth` (Regular / Wide),
  `method` (free text, e.g. `WB 20 min` — entered by her, never computed by us)
- **supply**: `supplyType` (`empty-jar` / `lid` / `ring` / `other`), plus `jarSize` and
  `jarMouth` when the supply is an empty jar

### Recipe

`id`, `title`, `body`, `sourceUrl?`, `photoId?`, `createdAt`, `updatedAt`.

Her recipes, stored as she wrote them. No scraping, no processing-time authority.

### Photo

Stored in a separate object store (`id`, `mime`, `blob`) so stock and recipe records stay
small and cheap to query.

## Derived rules (the `domain` layer)

**Age** — days between `dateStocked` and today, rendered in plain language
("canned 14 months ago").

**Quality band**, canned items only:

| Band | Age |
|---|---|
| Good | under 12 months |
| Use soon | 12–18 months |
| Past best quality | over 18 months |

Freezer items show **age only**. No app-asserted bands — freezer quality windows vary too
much by food for us to make a claim we can stand behind. She may optionally set her own
`useByDate` per item. Supplies have no age.

**Count confidence** — an item is `stale` when
`now - max(lastVerifiedAt, updatedAt) > 90 days`, otherwise `fresh`. Stale counts render
in the approximate form described by the honesty rule.

## Screens

**Shelf (home)** — oldest first, always. Each row shows the item, plain-language age, and
approximate count. Answers *"what should I open next?"* Filterable by category.

**Add item** — minimal fields, date defaults to today. For canned items, completing the
form leads directly to the Label screen.

**Label** — three outputs from one record: a large high-contrast view to read and copy by
hand at arm's length, a single printed label, or a full printed sheet for a canning
session. Printed labels carry an optional QR code.

**Item detail** — particulars, plus one-tap *Used one*, *Fix the count*, and *All gone*.

**Shelf check** — the reconciliation flow. Tap through items confirming or correcting
counts while standing at the shelf. Sets `lastVerifiedAt`. Target: under 30 seconds.

**Recipes** — her book, searchable, with photos.

**Settings** — backup and restore, jar sizes, print layout.

## Behaviors

**Empty-jar return.** Using a canned jar automatically increments the matching empty-jar
supply (same size and mouth type) and says so on screen. Carried forward from the MVP.
If no matching empty-jar supply record exists, one is created with a quantity of 1.
If it drifts, shelf check corrects it.

**Label QR payload.** `https://<origin>/j/<uuid>` — opens the installed app directly to
that item. Because data is local, a scan on another device resolves to a clear
"this jar isn't in this device's pantry" message rather than an error.

**Print layout.** Print CSS is built around a configurable `@page` size, defaulting to a
US Letter sheet of labels. This means adding Brother thermal roll support later is a
configuration change, not a rebuild. Thermal support is **not** built in v1.

## Storage and architecture

**Local-first. No accounts, no server.** Data lives in IndexedDB on her phone. This works
with no signal in a basement, costs nothing to run at any number of users, and requires no
login from anyone.

The accepted trade-off is no multi-device sync. The mitigation is explicit backup.

### Backup and restore

Export produces a single JSON file she keeps in her own iCloud or Drive:

```json
{
  "schema": "grandmas-shop-backup",
  "version": 1,
  "exportedAt": "2026-08-22T00:00:00.000Z",
  "stock": [],
  "recipes": [],
  "photos": []
}
```

`photos` entries carry their image as a base64 `data` string alongside `id` and `mime`,
so the backup is a single self-contained file.

Restore **validates the payload completely before applying anything**, refuses versions
newer than the running app, and writes into temporary stores before an atomic swap — a
failed restore must never leave a half-overwritten pantry.

Restore **replaces** the entire local dataset and requires explicit confirmation naming
what will be lost. Merge is deliberately not supported in v1: the intended use is
recovering onto a new or wiped phone, and merge semantics introduce conflict questions
that a single-device app has no way to answer.

The Settings screen surfaces a **"last backed up N months ago"** nudge. A backup nobody
takes is not a backup.

### Code structure

```
client/src/
  domain/    pure functions, no I/O — age, quality bands, confidence,
             label formatting, backup validation
  data/      the only code that touches IndexedDB — versioned schema with a
             real upgrade path, repository functions
  views/     screens; call data/, never touch storage directly
```

This split is the structural fix for two MVP problems: business rules currently live
inside components, and `CREATE TABLE IF NOT EXISTS` silently ignores schema changes,
so there is no migration story at all.

`api/` is deleted. It remains in git history and at the `v0-mvp` tag.

### Delivery

Vue 3 + Vite + vue-router are retained. `vite-plugin-pwa` adds installability, offline
app-shell caching, and an update prompt. Deployment is a static free-tier host
(Cloudflare Pages or Netlify) with SPA fallback configured, which `createWebHistory`
requires.

## Testing

The repo currently has no tests. This introduces the first suite.

- **Vitest** against `domain/` — pure functions, the highest-value target, since this is
  where every rule lives.
- **Vitest + `fake-indexeddb`** against `data/` — schema upgrades and backup round-trips
  especially, because these are the two places a bug destroys real data.
- **`@vue/test-utils`** on the two flows that matter most: adding an item, and using one.

Domain and data layers are developed test-first.

## Failure modes designed for

- **IndexedDB unavailable** (private browsing): say so loudly on a dedicated screen. Never
  silently accept data we cannot persist.
- **Storage quota exceeded** on photos: warn, and offer to downscale before saving.
- **Invalid or newer backup file**: refuse with a clear explanation, change nothing.
- **Service worker update available**: prompt to reload rather than swapping under her.
- **iOS storage eviction**: prompt to install to the home screen, and lean on the backup
  nudge, since a non-installed web app's storage is evictable.

## Non-goals

Explicitly out of scope for v1:

- Accounts, servers, and multi-device sync
- **Any** computed processing time, pressure, altitude adjustment, or canning timer
- **Any** safety judgment about whether food is edible
- Recipe scraping or import from URLs
- Barcode scanning of commercial products
- Meal planning
- Native app store distribution
- Brother thermal label printing (design accommodates it; v1 does not build it)

## Open questions

1. Does she store goods in more than one place (basement, garage, chest freezer)? The
   optional `location` field covers this cheaply, but the UI treatment depends on the answer.
2. Which jar sizes and mouth types does she actually use? Assumed Half-Pint / Pint / Quart
   and Regular / Wide.
3. Preferred freezer units — pounds, packages, or both?
4. iPhone or Android? Affects install guidance and how hard we push the backup nudge.

## Phases

| Phase | Content |
|---|---|
| 0 | Repo hygiene: `.gitignore`, untrack `node_modules/` and `api/database.sqlite`, tag `v0-mvp` |
| 1 | Foundation: Vitest, PWA plugin, `domain/` and `data/` layers, test-first |
| 2 | Stock core: shelf with category filters, add/edit, use one, shelf check, empty-jar return |
| 3 | Recipes with photos |
| 4 | Labels: screen, single print, sheet print, QR |
| 5 | Backup, restore, and the backup nudge |
| 6 | Offline and install polish, deploy |

Each phase is developed on its own branch and merged to `main` once it stands alone, so
`main` stays deployable and every merge is a review checkpoint.

## Conventions

- **Commits:** Conventional Commits, scoped by area — `feat(stock):`, `fix(backup):`.
  Commits authored with Claude carry a `Co-Authored-By` trailer.
- **Model use:** Opus for the domain and data layers and for code review, where a subtle
  bug corrupts real data; Sonnet for view components and print CSS from a settled spec.
  Work proceeds in a single session rather than parallel agents — this project is too
  small for fan-out to pay for itself.
