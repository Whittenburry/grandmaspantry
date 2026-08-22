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
| `unit` | string | Per item. `jars` for canned; `lbs` and `packs` are both first-class for freezer items, since the right one depends on the product. |
| `dateStocked` | ISO date | Date canned / frozen / acquired |
| `locationId` | uuid? | Where it lives. See Location below. |
| `lastVerifiedAt` | ISO datetime? | Set by shelf check |
| `useByDate` | ISO date? | Optional, user-set. Never inferred by the app. |
| `notes` | string? | |
| `recipeId` | uuid? | Canned items only |
| `archivedAt` | ISO datetime? | Set when the item is used up |
| `createdAt` / `updatedAt` | ISO datetime | |

Category-specific optional fields:

- **canned**: `jarTypeId` (see Jar catalog below), `method` (free text, e.g. `WB 20 min`
  — entered by her, never computed by us)
- **supply**: `supplyType` (`empty-jar` / `lid` / `ring` / `other`), plus `jarTypeId`
  when the supply is an empty jar

### Location

`id`, `name`, `sortOrder`, `createdAt`.

She stores goods in several places — a chest freezer in the basement, the kitchen
fridge/freezer, and otherwise wherever there is space. Locations are a managed,
user-extensible list rather than free text, seeded with **Basement freezer**, **Kitchen
freezer**, **Basement shelf**, and **Pantry**, and addable inline while entering an item.

This matters more than it first appears. When stock is spread across four places,
"which of these is it in?" *is* the visibility problem the app exists to solve. The shelf
view therefore supports grouping and filtering by location, and an item may be moved
between locations without otherwise being edited.

### Jar catalog

`id`, `name`, `ounces`, `millilitres`, `mouth` (`Regular` | `Wide`), `isSeeded`, `sortOrder`.

Jar sizes are a **seeded, user-extensible catalog**, not a pair of crossed enums. Crossing
size against mouth type produces combinations that do not exist on a shelf; a catalog
lists only real jars and lets her add any this list misses.

Seeded from the standard Ball lineup:

| Name | Volume | Mouth |
|---|---|---|
| Quarter-pint jelly | 4 oz / 125 mL | Regular |
| Half-pint | 8 oz / 250 mL | Regular |
| Half-pint jelly | 8 oz / 250 mL | Regular |
| Three-quarter-pint jelly | 12 oz / 375 mL | Regular |
| Pint | 16 oz / 500 mL | Regular |
| Pint | 16 oz / 500 mL | Wide |
| Pint and a half | 24 oz / 750 mL | Regular |
| Quart | 32 oz / 1 L | Regular |
| Quart | 32 oz / 1 L | Wide |
| Half gallon | 64 oz / 2 L | Wide |

The empty-jar return behaviour matches on `jarTypeId`, so a wide-mouth quart returns a
wide-mouth quart.

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

**Shelf (home)** — oldest first, always. Each row shows the item, plain-language age,
approximate count, and where it lives. Answers *"what should I open next?"* and
*"which freezer is it in?"* Filterable by category and by location, and groupable by
location for walking one storage space at a time.

**Add item** — minimal fields, date defaults to today. For canned items, completing the
form leads directly to the Label screen.

**Label** — three outputs from one record: a large high-contrast view to read and copy by
hand at arm's length, a single printed label, or a full printed sheet for a canning
session. Printed labels carry an optional QR code.

**Item detail** — particulars, plus one-tap *Used one*, *Fix the count*, and *All gone*.

**Shelf check** — the reconciliation flow. Tap through items confirming or correcting
counts while standing at the shelf. Scopeable to **one location**, since she will be
standing in front of the basement freezer, not all four places at once. Sets
`lastVerifiedAt`. Target: under 30 seconds per location.

**Recipes** — her book, searchable, with photos.

**Settings** — backup and restore, locations, jar catalog, print layout.

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

**Target platform is Chrome on Android** — both user zero and the author carry a Pixel 9
Pro XL, so the app can be tested on the exact hardware it will run on. This is a genuine
simplification: Android PWA installs behave like real apps, IndexedDB is durable,
persistent-storage grants are reliable, camera access for QR scanning is well supported,
and Web Push actually works. Desktop browsers are supported for the printing flow.
Safari/iOS is not a v1 target and its constraints do not shape the design.

## Testing

The repo currently has no tests. This introduces the first suite.

- **Vitest** against `domain/` — pure functions, the highest-value target, since this is
  where every rule lives.
- **Vitest + `fake-indexeddb`** against `data/` — schema upgrades and backup round-trips
  especially, because these are the two places a bug destroys real data.
- **`@vue/test-utils`** on the two flows that matter most: adding an item, and using one.

Domain and data layers are developed test-first.

Automated tests do not cover install, print output, or QR scanning. Those are verified by
hand on a Pixel 9 Pro XL, which the author also owns — so every device-dependent claim in
this design can be checked on the exact hardware user zero will use.

## Failure modes designed for

- **IndexedDB unavailable** (private browsing): say so loudly on a dedicated screen. Never
  silently accept data we cannot persist.
- **Storage quota exceeded** on photos: warn, and offer to downscale before saving.
- **Invalid or newer backup file**: refuse with a clear explanation, change nothing.
- **Service worker update available**: prompt to reload rather than swapping under her.
- **Storage durability**: prompt to install to the home screen and request persistent
  storage via the Storage API. Chrome on Android grants this readily to installed apps,
  so eviction is a manageable risk rather than a looming one — but the backup nudge
  remains the real answer to a lost or wiped phone.

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

**Deferred rather than rejected:** rotation reminders via Web Push. These were previously
ruled out as unreliable, but Chrome on Android supports them properly, and a monthly
"your oldest jars" nudge is exactly the retrieval-side payoff that keeps an app like this
alive. It is out of v1 only because the app must first be worth being reminded about.

## Resolved during design

1. **Multiple storage locations — yes.** A chest freezer in the basement, a fridge/freezer
   in the kitchen, and otherwise wherever there is space. Hence Location as a first-class
   managed entity rather than an optional string.
2. **Jar sizes — the full standard lineup**, not three sizes. Modelled as a seeded,
   extensible catalog; see Jar catalog above.
3. **Freezer units — pounds and packs**, chosen per item, because the right unit depends
   on the product.
4. **Android, Pixel 9 Pro XL**, for both user zero and the author. See Delivery.

## Phases

| Phase | Content |
|---|---|
| 0 | Repo hygiene: `.gitignore`, untrack `node_modules/` and `api/database.sqlite`, tag `v0-mvp` |
| 1 | Foundation: Vitest, `domain/` and `data/` layers with seeded locations and jar catalog, test-first |
| 2 | Stock core: shelf with category and location filters, add/edit, use one, location-scoped shelf check, empty-jar return |
| 3 | Recipes with photos |
| 4 | Labels: screen, single print, sheet print, QR |
| 5 | Backup, restore, and the backup nudge |
| 6 | `vite-plugin-pwa`, offline and install polish, persistent-storage request, deploy, on-device testing on a Pixel 9 Pro XL |

Each phase is developed on its own branch and merged to `main` once it stands alone, so
`main` stays deployable and every merge is a review checkpoint.

## Conventions

- **Commits:** Conventional Commits, scoped by area — `feat(stock):`, `fix(backup):`.
  Commits authored with Claude carry a `Co-Authored-By` trailer.
- **Model use:** Opus for the domain and data layers and for code review, where a subtle
  bug corrupts real data; Sonnet for view components and print CSS from a settled spec.
  Work proceeds in a single session rather than parallel agents — this project is too
  small for fan-out to pay for itself.
