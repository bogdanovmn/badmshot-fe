import { defineStore } from 'pinia'
import { ref } from 'vue'
import { tokenStorage, Role } from '@bogdanovmn/ssofw'

const APP_ID = 'badmshot'

export const authStore = defineStore('authStore', () => {
  const isAuthenticated = ref(false)
  const userName = ref<string | null>(null)
  const isAdmin = ref(false)

  function update() {
    isAuthenticated.value = tokenStorage.defined()
    userName.value = tokenStorage.claims?.userName || null
    isAdmin.value = tokenStorage.claims?.isAdmin(APP_ID) || false
  }

  function hasRole(role: Role): boolean {
    return tokenStorage.claims?.hasRole(role, APP_ID) || false
  }

  return { isAuthenticated, userName, isAdmin, hasRole, update }
})
