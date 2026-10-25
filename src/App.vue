<template>
  <div id="app" :class="{ 'app--immersive': immersive }">
    <nav ref="navRef" class="navbar">
      <div class="nav-left">
        <button
          v-if="auth.isAuthenticated"
          class="icon-btn menu-toggle"
          :title="menuOpen ? 'Закрыть меню' : 'Меню'"
          :aria-label="menuOpen ? 'Закрыть меню' : 'Меню'"
          :aria-expanded="menuOpen"
          @click="menuOpen = !menuOpen"
        >
          <NavIcon :name="menuOpen ? 'close' : 'menu'" />
        </button>
        <div class="nav-brand">
          <router-link to="/">Badm Shot</router-link>
        </div>
      </div>
      <div v-if="menuOpen" class="nav-dropdown">
        <router-link
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="nav-dropdown-link"
          @click="menuOpen = false"
        >
          <NavIcon :name="item.icon" />
          <span>{{ item.label }}</span>
        </router-link>
      </div>
      <div class="nav-actions">
        <template v-if="auth.isAuthenticated">
          <div class="nav-icons">
            <router-link
              v-for="item in navItems"
              :key="item.to"
              :to="item.to"
              class="nav-icon-link"
              :title="item.label"
              :aria-label="item.label"
            >
              <NavIcon :name="item.icon" />
            </router-link>
          </div>
          <router-link v-if="auth.userName" to="/liked" class="user-name full" :title="auth.userName">{{ auth.userName }}</router-link>
          <router-link v-if="auth.userName" to="/liked" class="user-name short" :title="auth.userName">{{ initials(auth.userName) }}</router-link>
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
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authStore } from '@/stores/auth'
import { frameEffectsStore } from '@/stores/frameEffects'
import { logout } from '@/logout'
import { getBackendVersion } from '@/api'
import { SsoService } from '@bogdanovmn/ssofw'
import NavIcon from '@/components/NavIcon.vue'

type NavIconName = 'top' | 'stats' | 'explore' | 'liked' | 'archive'

interface NavItem {
  to: string
  label: string
  icon: NavIconName
}

const router = useRouter()
const route = useRoute()
const auth = authStore()
const frameEffects = frameEffectsStore()
const immersive = computed(() => route.meta.immersive === true)
const ssoService = inject<SsoService>('ssoService')!
const backendVersion = ref<string | null>(null)
const frontendVersion = import.meta.env.FRONTEND_VERSION
const menuOpen = ref(false)
const navRef = ref<HTMLElement | null>(null)

const navItems = computed<NavItem[]>(() => {
  const items: NavItem[] = [
    { to: '/top', label: 'ТОП', icon: 'top' },
    { to: '/stats', label: 'Статистика', icon: 'stats' },
    { to: '/explore', label: 'Кадры', icon: 'explore' },
    { to: '/liked', label: 'Любимые', icon: 'liked' },
  ]
  if (auth.isAdmin) {
    items.push({ to: '/archive', label: 'Архив', icon: 'archive' })
  }
  return items
})

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return parts
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('')
}

watch(() => route.fullPath, () => {
  menuOpen.value = false
})

watch(() => auth.isAuthenticated, () => {
  menuOpen.value = false
})

function onDocumentClick(event: MouseEvent) {
  if (!menuOpen.value) {
    return
  }
  const target = event.target as Node | null
  if (navRef.value && target && !navRef.value.contains(target)) {
    menuOpen.value = false
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    menuOpen.value = false
  }
}

onMounted(() => {
  auth.update()
  loadBackendVersion()
  void frameEffects.ensureLoaded()
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onKeydown)
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
  position: relative;
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

.nav-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.nav-brand a {
  color: var(--text-primary);
  text-decoration: none;
  font-size: 1.25rem;
  font-weight: bold;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.icon-btn.menu-toggle {
  display: none;
}

.nav-icons {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.nav-icon-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  color: var(--color-nav-link);
  text-decoration: none;
}

.nav-icon-link:hover,
.nav-icon-link.router-link-active {
  color: var(--text-primary);
  background: var(--color-nav-hover);
  text-decoration: none;
}

.nav-icon-link svg,
.nav-dropdown-link svg,
.menu-toggle svg {
  width: 20px;
  height: 20px;
}

.nav-dropdown {
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 1rem;
  z-index: 100;
  display: none;
  flex-direction: column;
  min-width: 220px;
  padding: 0.35rem;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-nav);
  box-shadow: var(--shadow-strong);
}

.nav-dropdown-link {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.6rem 0.75rem;
  border-radius: 6px;
  color: var(--color-nav-link);
  text-decoration: none;
  font-size: 0.95rem;
}

.nav-dropdown-link:hover,
.nav-dropdown-link.router-link-active {
  color: var(--text-primary);
  background: var(--color-nav-hover);
  text-decoration: none;
}

.user-name {
  max-width: 220px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.95rem;
  color: var(--color-nav-link);
  text-decoration: none;
}

.user-name:hover {
  color: var(--text-primary);
  text-decoration: none;
}

.user-name.short {
  display: none;
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

@media (max-width: 479px) {
  .navbar {
    flex-wrap: nowrap;
  }

  .nav-actions {
    gap: 0.5rem;
  }

  .icon-btn.menu-toggle {
    display: flex;
  }

  .nav-dropdown {
    display: flex;
  }

  .nav-icons {
    display: none;
  }
}

@media (max-width: 599px) {
  .user-name.full {
    display: none;
  }

  .user-name.short {
    display: inline;
  }
}

@media (min-width: 768px) {
  .navbar {
    padding: 1rem 2rem;
  }

  .content:not(.content--immersive) {
    margin: 2rem auto;
    padding: 0 2rem;
  }
}
</style>
