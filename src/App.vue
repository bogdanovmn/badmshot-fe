<template>
  <div id="app" :class="{ 'app--immersive': immersive }">
    <nav class="navbar">
      <div class="nav-brand">
        <router-link to="/">Badm Shot</router-link>
      </div>
      <div class="nav-links">
        <router-link to="/top">ТОП</router-link>
        <router-link to="/tags">Тэги</router-link>
        <template v-if="auth.isAuthenticated">
          <router-link to="/explore">Кадры</router-link>
          <router-link to="/liked">Любимые</router-link>
        </template>
        <template v-if="auth.isAdmin">
          <router-link to="/archive">Архив</router-link>
        </template>
        <template v-if="auth.isAuthenticated">
          <router-link v-if="auth.userName" to="/liked" class="user-name full" :title="auth.userName">{{ auth.userName }}</router-link>
          <button class="icon-btn" title="Выйти" aria-label="Выйти" @click="handleLogout">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </template>
        <template v-else>
          <button class="icon-btn" title="Войти" aria-label="Войти" @click="handleLogin">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
              <polyline points="10 17 15 12 10 7"/>
              <line x1="15" y1="12" x2="3" y2="12"/>
            </svg>
          </button>
        </template>
      </div>
    </nav>
    <main class="content" :class="{ 'content--immersive': immersive }">
      <router-view />
    </main>
    <footer v-if="!immersive" class="footer">
      <div class="footer-links">
        <router-link to="/faq">FAQ</router-link>
      </div>
      <span class="footer-version">версия: {{ backendVersion || '—' }} / {{ frontendVersion }}</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authStore } from '@/stores/auth'
import { frameEffectsStore } from '@/stores/frameEffects'
import { logout } from '@/logout'
import { getBackendVersion } from '@/api'
import { SsoService } from '@bogdanovmn/ssofw'

const router = useRouter()
const route = useRoute()
const auth = authStore()
const frameEffects = frameEffectsStore()
const immersive = computed(() => route.path === '/' || route.path === '/explore')
const ssoService = inject<SsoService>('ssoService')!
const backendVersion = ref<string | null>(null)
const frontendVersion = import.meta.env.FRONTEND_VERSION

onMounted(() => {
  auth.update()
  loadBackendVersion()
  void frameEffects.ensureLoaded()
})

async function loadBackendVersion() {
  try {
    const data = await getBackendVersion()
    backendVersion.value = data.version
  } catch {
    backendVersion.value = null
  }
}

function handleLogin() {
  router.push('/login')
}

async function handleLogout() {
  await logout(ssoService)
  router.push('/')
}
</script>

<style scoped>
#app {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 100vh;
}

.app--immersive {
  height: 100dvh;
  min-height: 0;
  overflow: hidden;
}

.navbar {
  display: flex;
  flex: 0 0 auto;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: var(--color-nav);
  color: var(--text-primary);
  flex-wrap: wrap;
  gap: 0.5rem;
}

.nav-brand a {
  color: var(--text-primary);
  text-decoration: none;
  font-size: 1.25rem;
  font-weight: bold;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.nav-links a {
  color: var(--color-nav-link);
  text-decoration: none;
  font-size: 0.95rem;
  padding: 0.4rem 0.25rem;
}

.nav-links a:hover,
.nav-links a.router-link-active {
  color: var(--text-primary);
}

.user-name {
  max-width: 220px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.95rem;
  color: var(--color-nav-link);
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  background: var(--btn-primary-bg);
  color: var(--btn-primary-text);
}

.icon-btn:hover {
  background: var(--btn-primary-bg-hover);
  color: var(--btn-primary-text-hover);
}

.icon-btn svg {
  width: 20px;
  height: 20px;
}

.content {
  flex: 1;
  width: 100%;
  max-width: 1200px;
  min-width: 0;
  margin: 1rem auto;
  padding: 0 1rem;
}

.content--immersive {
  display: flex;
  flex: 1;
  max-width: none;
  min-height: 0;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

.content--immersive > * {
  flex: 1;
  min-width: 0;
  min-height: 0;
}

.footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  margin-top: 2rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--color-border);
  font-size: 0.85rem;
  color: var(--color-muted);
}

.footer-links a {
  color: var(--color-muted);
  text-decoration: none;
}

.footer-links a:hover {
  color: var(--text-primary);
  text-decoration: underline;
}

.footer-version {
  font-size: 0.8rem;
  opacity: 0.65;
}

@media (max-width: 599px) {
  .user-name.full {
    display: none;
  }
}

@media (min-width: 768px) {
  .navbar {
    padding: 1rem 2rem;
  }

  .content {
    margin: 2rem auto;
    padding: 0 2rem;
  }
}
</style>
