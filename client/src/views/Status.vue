<template>
  <div class="status">
    <header class="intro">
      <p class="eyebrow">Mid-rewrite · local-first PWA</p>
      <h2>Where we left off</h2>
      <p class="lede">
        The foundation is built and tested. The screens she'll actually use
        come next.
      </p>
    </header>

    <div class="glass-card phase-card">
      <div class="phase done">
        <span class="marker">✓</span>
        <div>
          <h3>Phase 0 · Repository hygiene</h3>
          <p>Dependencies untracked, the old Express API retired.</p>
        </div>
      </div>
      <div class="phase done">
        <span class="marker">✓</span>
        <div>
          <h3>Phase 1 · Foundation</h3>
          <p>
            Domain rules and the IndexedDB data layer, built test-first.
            95 tests across 9 files.
          </p>
        </div>
      </div>
      <div class="phase next">
        <span class="marker">→</span>
        <div>
          <h3>Phase 2 · Stock core</h3>
          <p>
            The shelf, add and edit, use one, and the location-scoped shelf
            check. <strong>Needs a plan written before any code.</strong>
          </p>
        </div>
      </div>
    </div>

    <div class="glass-card db-card">
      <h3>Data layer</h3>

      <p v-if="state === 'loading'" class="muted">Opening the database…</p>

      <div v-else-if="state === 'ready'">
        <p class="verdict ok">
          <span class="dot"></span> Connected and seeded
        </p>
        <dl class="figures">
          <div><dt>Jar types</dt><dd>{{ counts.jarTypes }}</dd></div>
          <div><dt>Locations</dt><dd>{{ counts.locations }}</dd></div>
          <div><dt>Items stocked</dt><dd>{{ counts.stock }}</dd></div>
        </dl>
        <p class="muted note">
          Read live from IndexedDB in this browser — the test suite runs
          against an in-memory stand-in, so this is the real thing.
        </p>
      </div>

      <div v-else>
        <p class="verdict bad"><span class="dot"></span> Could not open</p>
        <p class="muted note">{{ error }}</p>
      </div>
    </div>

    <p class="footer-note">
      Full context lives in <code>docs/PROGRESS.md</code>.
    </p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { listStock } from '../data/stock.js'
import { listLocations } from '../data/locations.js'
import { listJarTypes } from '../data/jarTypes.js'

const state = ref('loading')
const error = ref('')
const counts = ref({ jarTypes: 0, locations: 0, stock: 0 })

onMounted(async () => {
  try {
    const [jarTypes, locations, stock] = await Promise.all([
      listJarTypes(),
      listLocations(),
      listStock(),
    ])
    counts.value = {
      jarTypes: jarTypes.length,
      locations: locations.length,
      stock: stock.length,
    }
    state.value = 'ready'
  } catch (err) {
    // Most likely cause is private browsing, where IndexedDB is blocked.
    error.value = err?.message ?? String(err)
    state.value = 'failed'
  }
})
</script>

<style scoped>
.status { max-width: 640px; }

.intro { margin-bottom: 2rem; }
.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-bottom: 0.4rem;
}
.intro h2 { font-size: 2rem; color: var(--text-dark); }
.lede { color: var(--text-muted); margin-top: 0.3rem; }

.phase-card { margin-bottom: 1.5rem; }
.phase {
  display: flex;
  gap: 1rem;
  padding: 0.9rem 0;
  border-bottom: 1px solid var(--glass-border);
}
.phase:last-child { border-bottom: none; padding-bottom: 0; }
.phase:first-child { padding-top: 0; }
.phase h3 {
  font-size: 1.05rem;
  color: var(--text-dark);
  margin-bottom: 0.15rem;
}
.phase p { color: var(--text-muted); font-size: 0.92rem; }

.marker {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 0.85rem;
  font-weight: 700;
}
.done .marker { background: var(--primary-color); color: #fff; }
.next .marker { background: var(--secondary-color); color: var(--text-dark); }

.db-card h3 { font-size: 1.05rem; margin-bottom: 0.75rem; }

.verdict {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  margin-bottom: 0.9rem;
}
.dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
.ok { color: var(--primary-color); }
.ok .dot { background: var(--primary-color); box-shadow: 0 0 8px var(--primary-color); }
.bad { color: var(--warning-color); }
.bad .dot { background: var(--warning-color); }

.figures { display: flex; flex-wrap: wrap; gap: 1.75rem; }
.figures dt {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}
.figures dd {
  font-size: 1.7rem;
  font-weight: 600;
  color: var(--secondary-color);
  font-family: 'Playfair Display', serif;
}

.muted { color: var(--text-muted); font-size: 0.88rem; }
.note { margin-top: 1rem; line-height: 1.5; }

.footer-note {
  margin-top: 1.5rem;
  color: var(--text-muted);
  font-size: 0.85rem;
}
code {
  background: rgba(255, 255, 255, 0.55);
  padding: 0.1rem 0.4rem;
  border-radius: 5px;
  font-size: 0.85em;
}
</style>
