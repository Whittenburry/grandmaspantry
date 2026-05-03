<template>
  <div class="raw-goods">
    <div class="header-actions">
      <h2>Raw Goods to Process</h2>
      <button class="btn-primary" @click="showAddModal = true">+ Add Ingredient</button>
    </div>

    <div class="goods-grid">
      <div v-for="item in goods" :key="item.id" class="glass-card goods-card" :class="{ 'expiring-soon': isExpiringSoon(item.expirationDate) }">
        <div class="card-header">
          <h3>{{ item.name }}</h3>
          <button class="delete-btn" @click="deleteItem(item.id)">×</button>
        </div>
        <p class="qty">Qty: {{ item.quantity }}</p>
        <p class="expiry" v-if="item.expirationDate">
          <span class="indicator"></span> Exp: {{ item.expirationDate }}
        </p>
      </div>
      <p v-if="goods.length === 0" class="empty-state">No raw goods waiting to be processed.</p>
    </div>

    <!-- Add Modal -->
    <div v-if="showAddModal" class="modal-backdrop" @click.self="showAddModal = false">
      <div class="glass-card modal">
        <h3>Log Raw Ingredient</h3>
        <form @submit.prevent="addItem">
          <input v-model="newItem.name" placeholder="Item Name (e.g. 5lbs Strawberries)" required />
          <input v-model="newItem.quantity" type="number" placeholder="Quantity/Weight Number" required />
          <label>Expiration / Must Process By:</label>
          <input v-model="newItem.expirationDate" type="date" required />
          <div class="modal-actions">
            <button type="button" @click="showAddModal = false">Cancel</button>
            <button type="submit" class="btn-primary">Save Item</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const goods = ref([]);
const showAddModal = ref(false);
const newItem = ref({ name: '', quantity: '', expirationDate: '' });

const fetchGoods = async () => {
  const res = await fetch('/api/raw-ingredients');
  goods.value = await res.json();
};

const addItem = async () => {
  await fetch('/api/raw-ingredients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newItem.value)
  });
  showAddModal.value = false;
  newItem.value = { name: '', quantity: '', expirationDate: '' };
  fetchGoods();
};

const deleteItem = async (id) => {
  await fetch(`/api/raw-ingredients/${id}`, { method: 'DELETE' });
  fetchGoods();
};

const isExpiringSoon = (dateStr) => {
  if (!dateStr) return false;
  const exp = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
  return diffDays <= 3; // within 3 days
};

onMounted(fetchGoods);
</script>

<style scoped>
.header-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.header-actions h2 { font-size: 2rem; color: var(--text-dark); }
.goods-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1.5rem; }
.goods-card { position: relative; }
.card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }
.card-header h3 { color: var(--text-dark); font-size: 1.2rem; margin: 0; }
.delete-btn { background: none; border: none; color: var(--text-muted); font-size: 1.5rem; cursor: pointer; line-height: 1; padding: 0 5px; }
.delete-btn:hover { color: var(--warning-color); }
.qty { font-size: 1.1rem; color: var(--secondary-color); font-weight: bold; }
.expiry { color: var(--text-muted); font-size: 0.9rem; display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem; }
.indicator { width: 10px; height: 10px; border-radius: 50%; background: var(--primary-color); display: inline-block; }

.expiring-soon .indicator { background: var(--warning-color); box-shadow: 0 0 8px var(--warning-color); }
.expiring-soon { border-left: 4px solid var(--warning-color); }

/* Modal Styles */
.modal-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.2); backdrop-filter: blur(4px); display: flex; justify-content: center; align-items: center; z-index: 1000; }
.modal { width: 400px; max-width: 90%; }
.modal h3 { margin-bottom: 1rem; color: var(--text-dark); }
form { display: flex; flex-direction: column; gap: 1rem; }
label { font-size: 0.9rem; color: var(--text-muted); margin-bottom: -0.5rem; }
input { padding: 0.8rem; border-radius: 8px; border: 1px solid var(--glass-border); background: rgba(255,255,255,0.8); font-family: inherit; }
.modal-actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1rem; }
.modal-actions button[type="button"] { background: transparent; border: none; color: var(--text-muted); cursor: pointer; font-weight: bold; }
.empty-state { color: var(--text-muted); font-style: italic; grid-column: 1 / -1; }
</style>
