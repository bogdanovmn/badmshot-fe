import { createRouter, createWebHistory } from 'vue-router'
import { tokenStorage, Role } from '@bogdanovmn/ssofw'

import HomeView from '@/views/HomeView.vue'

const APP_ID = 'badmshot'

const router = createRouter({
  history: createWebHistory('/badmshot/'),
  routes: [
    { path: '/', component: HomeView },
    { path: '/top', component: () => import('@/views/TopView.vue'), meta: { private: true } },
    { path: '/tags', component: () => import('@/views/TagsView.vue'), meta: { private: true } },
    { path: '/explore', component: () => import('@/views/ExploreView.vue'), meta: { private: true } },
    { path: '/liked', component: () => import('@/views/LikedView.vue'), meta: { private: true } },
    { path: '/faq', component: () => import('@/views/FaqView.vue') },
    {
      path: '/login',
      redirect: () => {
        const ssoUrl = import.meta.env.VITE_SSO_FRONT_URL
        const redirectUri = `${window.location.origin}/badmshot/sso-callback`
        window.location.href = `${ssoUrl}/login?from=${encodeURIComponent(redirectUri)}`
        return '/'
      }
    },
    { path: '/sso-callback', component: () => import('@/views/SsoCallbackView.vue') },
    { path: '/archive', component: () => import('@/views/ArchiveView.vue'), meta: { allow: Role.admin } },
    { path: '/archive/manage', component: () => import('@/views/IndexJobView.vue'), meta: { allow: Role.admin } },
    { path: '/archive/import', component: () => import('@/views/ImportView.vue'), meta: { allow: Role.admin } },
    { path: '/archive/index-job', redirect: '/archive/manage', meta: { allow: Role.admin } },
    { path: '/archive/invalid', component: () => import('@/views/ArchiveInvalidView.vue'), meta: { allow: Role.admin } },
    { path: '/archive/stats', component: () => import('@/views/ArchiveStatsView.vue'), meta: { allow: Role.admin } },
    { path: '/archive/matches/:id', component: () => import('@/views/ArchiveMatchView.vue'), meta: { allow: Role.admin }, props: true },
    { path: '/catalog', component: () => import('@/views/CatalogView.vue'), meta: { allow: Role.admin } },
    { path: '/players', redirect: { path: '/catalog', query: { tab: 'players' } }, meta: { allow: Role.admin } },
    { path: '/clubs', redirect: { path: '/catalog', query: { tab: 'clubs' } }, meta: { allow: Role.admin } },
  ]
})

router.beforeEach((to) => {
  const isAuthenticated = tokenStorage.defined()
  const targetRole = to.meta.allow as Role | undefined

  if (to.path === '/' && isAuthenticated) {
    return { path: '/explore' }
  }
  if (targetRole && !tokenStorage.claims?.hasRole(targetRole, APP_ID)) {
    return { path: '/' }
  }
  if (to.meta.private && !isAuthenticated) {
    return { path: '/' }
  }
})

export default router
