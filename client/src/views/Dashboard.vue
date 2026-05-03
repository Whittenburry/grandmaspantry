<template>
  <div class="dashboard">
    <header class="dashboard-header">
      <h2>Welcome to Grandma's Shop</h2>
      <p>Here's what's happening in your pantry today.</p>
    </header>
    
    <div v-if="loading" class="loading">Loading stats...</div>
    
    <div v-else class="stats-grid">
      <div class="glass-card stat-card">
        <h3>Total Canned Batches</h3>
        <p class="stat-number">{{ stats.cannedBatches }}</p>
      </div>
      <div class="glass-card stat-card">
        <h3>Raw Goods to Process</h3>
        <p class="stat-number">{{ stats.rawGoods }}</p>
      </div>
      <div class="glass-card stat-card empty-jars">
        <h3>Available Empty Jars</h3>
        <p class="stat-number">{{ stats.emptyJars }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const loading = ref(true);
const stats = ref({
  cannedBatches: 0,
  rawGoods: 0,
  emptyJars: 0
});

const fetchStats = async () => {
  try {
    const [cannedRes, rawRes, jarsRes] = await Promise.all([
      fetch('/api/canned-batches'),
      fetch('/api/raw-ingredients'),
      fetch('/api/empty-jars')
    ]);
    
    const canned = await cannedRes.json();
    const raw = await rawRes.json();
    const jars = await jarsRes.json();
    
    stats.value = {
      cannedBatches: canned.length,
      rawGoods: raw.length,
      emptyJars: jars.reduce((acc, jar) => acc + jar.quantity, 0)
    };
  } catch (error) {
    console.error("Failed to fetch stats:", error);
  } finally {
    loading.value = false;
  }
};

onMounted(fetchStats);
</script>

<style scoped>
.dashboard-header { margin-bottom: 2rem; }
.dashboard-header h2 { font-size: 2rem; color: var(--text-dark); }
.dashboard-header p { color: var(--text-muted); }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; }
.stat-card { text-align: center; display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 150px; }
.stat-card h3 { font-size: 1.1rem; color: var(--text-muted); margin-bottom: 0.5rem; }
.stat-number { font-size: 3rem; font-weight: 600; color: var(--primary-color); }
.empty-jars .stat-number { color: var(--secondary-color); }
.loading { text-align: center; color: var(--text-muted); padding: 2rem; }
</style>
