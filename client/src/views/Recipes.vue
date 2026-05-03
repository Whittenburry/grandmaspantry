<template>
  <div class="recipes">
    <div class="header-actions">
      <h2>Recipe Book</h2>
      <button class="btn-primary" @click="showAddModal = true">+ Add Recipe</button>
    </div>

    <div class="recipe-grid">
      <div v-for="recipe in recipes" :key="recipe.id" class="glass-card recipe-card">
        <h3>{{ recipe.title }}</h3>
        <a v-if="recipe.sourceUrl" :href="recipe.sourceUrl" target="_blank" class="source-link">🔗 View Source</a>
        <div class="content-preview">{{ recipe.content || 'No text content provided.' }}</div>
      </div>
      <p v-if="recipes.length === 0" class="empty-state">No recipes saved yet.</p>
    </div>

    <!-- Add Modal -->
    <div v-if="showAddModal" class="modal-backdrop" @click.self="showAddModal = false">
      <div class="glass-card modal">
        <h3>Save Recipe</h3>
        <p class="subtitle">Paste a link or text from your favorite canning site (like BALL).</p>
        <form @submit.prevent="addRecipe">
          <input v-model="newRecipe.title" placeholder="Recipe Title" required />
          <input v-model="newRecipe.sourceUrl" type="url" placeholder="Source URL (Optional)" />
          <textarea v-model="newRecipe.content" placeholder="Paste recipe text or notes here..." rows="5"></textarea>
          
          <div class="modal-actions">
            <button type="button" @click="showAddModal = false">Cancel</button>
            <button type="submit" class="btn-primary">Save Recipe</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const recipes = ref([]);
const showAddModal = ref(false);
const newRecipe = ref({ title: '', content: '', sourceUrl: '' });

const fetchRecipes = async () => {
  const res = await fetch('/api/recipes');
  recipes.value = await res.json();
};

const addRecipe = async () => {
  await fetch('/api/recipes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newRecipe.value)
  });
  showAddModal.value = false;
  newRecipe.value = { title: '', content: '', sourceUrl: '' };
  fetchRecipes();
};

onMounted(fetchRecipes);
</script>

<style scoped>
.header-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.header-actions h2 { font-size: 2rem; color: var(--text-dark); }
.recipe-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; }
.recipe-card h3 { color: var(--text-dark); margin-bottom: 0.5rem; font-size: 1.3rem; }
.source-link { color: var(--primary-color); text-decoration: none; font-size: 0.9rem; display: inline-block; margin-bottom: 1rem; }
.source-link:hover { text-decoration: underline; }
.content-preview { color: var(--text-muted); font-size: 0.95rem; white-space: pre-wrap; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }

/* Modal Styles */
.modal-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.2); backdrop-filter: blur(4px); display: flex; justify-content: center; align-items: center; z-index: 1000; }
.modal { width: 500px; max-width: 90%; }
.modal h3 { margin-bottom: 0.5rem; color: var(--text-dark); }
.subtitle { color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.5rem; }
form { display: flex; flex-direction: column; gap: 1rem; }
input, textarea { padding: 0.8rem; border-radius: 8px; border: 1px solid var(--glass-border); background: rgba(255,255,255,0.8); font-family: inherit; }
textarea { resize: vertical; }
.modal-actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1rem; }
.modal-actions button[type="button"] { background: transparent; border: none; color: var(--text-muted); cursor: pointer; font-weight: bold; }
.empty-state { color: var(--text-muted); font-style: italic; grid-column: 1 / -1; }
</style>
