import { createApp } from 'vue'
import './assets/main.css'
import App from './App.vue'

import { createRouter, createWebHistory } from 'vue-router'

// One route until phase 2 brings the real screens. The status view reports
// where the rewrite stands and checks that the data layer opens.
const routes = [
  { path: '/', component: () => import('./views/Status.vue') },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

const app = createApp(App)
app.use(router)
app.mount('#app')
