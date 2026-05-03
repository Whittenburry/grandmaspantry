import { createApp } from 'vue'
import './assets/main.css'
import App from './App.vue'

import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', component: () => import('./views/Dashboard.vue') },
  { path: '/pantry', component: () => import('./views/Pantry.vue') },
  { path: '/raw-goods', component: () => import('./views/RawGoods.vue') },
  { path: '/recipes', component: () => import('./views/Recipes.vue') },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

const app = createApp(App)
app.use(router)
app.mount('#app')
