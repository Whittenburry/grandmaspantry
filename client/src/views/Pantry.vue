<template>
  <div class="pantry">
    <div class="header-actions">
      <h2>My Pantry</h2>
      <button class="btn-primary" @click="showAddModal = true">+ Add Batch</button>
    </div>

    <div class="inventory-section">
      <h3>Empty Jars Inventory</h3>
      <div class="jar-grid">
        <div v-for="jar in emptyJars" :key="jar.id" class="glass-card jar-card">
          <h4>{{ jar.size }}</h4>
          <p class="qty">{{ jar.quantity }}</p>
          <div class="actions">
            <button @click="updateJarQty(jar.size, jar.quantity + 1)">+</button>
            <button @click="updateJarQty(jar.size, Math.max(0, jar.quantity - 1))">-</button>
          </div>
        </div>
      </div>
    </div>

    <div class="inventory-section">
      <h3>Canned Batches</h3>
      <div class="batch-grid">
        <div v-for="batch in cannedBatches" :key="batch.id" class="glass-card batch-card">
          <h4>{{ batch.recipeName }}</h4>
          <p class="detail">Qty: <strong>{{ batch.quantity }}</strong> x {{ batch.jarSize }}</p>
          <p class="detail date">Canned: {{ batch.dateCanned }}</p>
          <button class="btn-primary use-btn" @click="useJar(batch.id)" :disabled="batch.quantity <= 0">Use 1 Jar</button>
        </div>
        <p v-if="cannedBatches.length === 0" class="empty-state">No batches yet. Start canning!</p>
      </div>
    </div>

    <!-- Add Batch Modal -->
    <div v-if="showAddModal" class="modal-backdrop" @click.self="showAddModal = false">
      <div class="glass-card modal">
        <h3>Log New Batch</h3>
        <form @submit.prevent="addBatch">
          <input v-model="newBatch.recipeName" placeholder="Recipe Name (e.g. Strawberry Jam)" required />
          <input v-model="newBatch.quantity" type="number" placeholder="Quantity of Jars" required min="1"/>
          <select v-model="newBatch.jarSize">
            <option>Half-Pint</option>
            <option>Pint</option>
            <option>Quart</option>
          </select>
          <input v-model="newBatch.dateCanned" type="date" required />
          <div class="modal-actions">
            <button type="button" @click="showAddModal = false">Cancel</button>
            <button type="submit" class="btn-primary">Save Batch</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const emptyJars = ref([]);
const cannedBatches = ref([]);
const showAddModal = ref(false);

const newBatch = ref({
  recipeName: '',
  quantity: '',
  jarSize: 'Pint',
  dateCanned: new Date().toISOString().split('T')[0],
  expirationDate: ''
});

const fetchData = async () => {
  const [jarsRes, batchesRes] = await Promise.all([
    fetch('/api/empty-jars'),
    fetch('/api/canned-batches')
  ]);
  emptyJars.value = await jarsRes.json();
  cannedBatches.value = await batchesRes.json();
};

const updateJarQty = async (size, quantity) => {
  await fetch('/api/empty-jars/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ size, quantity })
  });
  fetchData();
};

const useJar = async (id) => {
  await fetch(`/api/canned-batches/${id}/use`, { method: 'POST' });
  fetchData();
};

const addBatch = async () => {
  await fetch('/api/canned-batches', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newBatch.value)
  });
  showAddModal.value = false;
  newBatch.value = { recipeName: '', quantity: '', jarSize: 'Pint', dateCanned: new Date().toISOString().split('T')[0], expirationDate: '' };
  fetchData();
};

onMounted(fetchData);
</script>

<style scoped>
.header-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.header-actions h2 { font-size: 2rem; color: var(--text-dark); }
.inventory-section { margin-bottom: 3rem; }
.inventory-section h3 { margin-bottom: 1rem; color: var(--text-muted); border-bottom: 1px solid var(--glass-border); padding-bottom: 0.5rem; }
.jar-grid, .batch-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1.5rem; }
.jar-card, .batch-card { text-align: center; }
.qty { font-size: 2rem; font-weight: 600; color: var(--secondary-color); margin: 0.5rem 0; }
.actions { display: flex; justify-content: center; gap: 0.5rem; }
.actions button { width: 30px; height: 30px; border-radius: 50%; border: none; background: rgba(255,255,255,0.5); cursor: pointer; font-weight: bold; }
.actions button:hover { background: var(--primary-color); color: white; }
.detail { margin: 0.2rem 0; color: var(--text-muted); }
.date { font-size: 0.8rem; }
.use-btn { margin-top: 1rem; width: 100%; }
.use-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Modal Styles */
.modal-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.2); backdrop-filter: blur(4px); display: flex; justify-content: center; align-items: center; z-index: 1000; }
.modal { width: 400px; max-width: 90%; }
.modal h3 { margin-bottom: 1rem; color: var(--text-dark); }
form { display: flex; flex-direction: column; gap: 1rem; }
input, select { padding: 0.8rem; border-radius: 8px; border: 1px solid var(--glass-border); background: rgba(255,255,255,0.8); font-family: inherit; }
.modal-actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1rem; }
.modal-actions button[type="button"] { background: transparent; border: none; color: var(--text-muted); cursor: pointer; font-weight: bold; }
.empty-state { color: var(--text-muted); font-style: italic; grid-column: 1 / -1; }
</style>
