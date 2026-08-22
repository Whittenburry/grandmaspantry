<template>
  <div class="app-container">
    <nav class="glass-nav">
      <h1>Grandma's Shop</h1>
      <div class="links">
        <router-link to="/">Dashboard</router-link>
        <router-link to="/pantry">Pantry</router-link>
        <router-link to="/raw-goods">Raw Goods</router-link>
        <router-link to="/recipes">Recipes</router-link>
      </div>
    </nav>
    <main class="main-content">
      <router-view></router-view>
    </main>
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.glass-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 1rem 2rem;
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--glass-border);
  position: sticky;
  top: 0;
  z-index: 100;
}

.glass-nav h1 {
  font-size: 1.8rem;
  color: var(--text-dark);
  margin: 0;
  font-family: 'Playfair Display', serif;
}

.links {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.links a {
  text-decoration: none;
  color: var(--text-muted);
  font-weight: 500;
  transition: all 0.3s ease;
}

.links a:hover, .links a.router-link-active {
  color: var(--primary-color);
  text-shadow: 0 0 10px rgba(138, 171, 145, 0.3);
}

.main-content {
  flex: 1;
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

@media (max-width: 768px) {
  .glass-nav {
    flex-direction: column;
    padding: 1rem;
    text-align: center;
  }
  .links {
    justify-content: center;
    gap: 1rem;
  }
  .main-content {
    padding: 1rem;
  }
}
</style>
