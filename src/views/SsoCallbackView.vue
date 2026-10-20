<template>
  <div class="sso-callback">
    <div class="loading" v-if="isLoading">
      <p>Завершаем вход...</p>
    </div>
    <div class="error" v-else-if="hasError">
      <h2>Не удалось войти</h2>
      <button @click="goHome" class="btn-primary">На главную</button>
    </div>
    <div class="success" v-else-if="isSuccess">
      <p>Успешно! Перенаправляем...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed, inject } from 'vue'
import { useRouter } from 'vue-router'
import { SsoService } from '@bogdanovmn/ssofw'
import { authStore } from '@/stores/auth'
import { logout } from '@/logout'

const router = useRouter()
const ssoService = inject<SsoService>('ssoService')!
const auth = authStore()

const isLoading = ref<boolean>(true)
const hasError = ref<boolean>(false)
const isSuccess = computed(() => !isLoading.value && !hasError.value)

function extractUrlParams(): { code: string | null; error: string | null } {
  const urlParams = new URLSearchParams(window.location.search)
  return {
    code: urlParams.get('code'),
    error: urlParams.get('error')
  }
}

async function processCallback(): Promise<void> {
  try {
    const { code, error: errorParam } = extractUrlParams()

    if (errorParam) {
      console.error(decodeURIComponent(errorParam))
      hasError.value = true
      return
    }

    if (!code) {
      console.error('SSO callback: code is empty')
      hasError.value = true
      return
    }

    await ssoService.exchangeCodeToJwt(code)
  } catch (err) {
    console.error('SSO callback error:', err)
    hasError.value = true
    await logout(ssoService)
  } finally {
    auth.update()
    isLoading.value = false
  }
  if (!hasError.value) {
    goHome()
  }
}

function goHome(): void {
  const redirect = sessionStorage.getItem('redirectAfterLogin')
  sessionStorage.removeItem('redirectAfterLogin')
  router.push(redirect?.startsWith('/') ? redirect : '/')
}

onMounted(() => {
  processCallback()
})
</script>

<style scoped>
.sso-callback {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 50vh;
  font-size: 1.2rem;
  color: var(--color-muted);
  text-align: center;
  padding: 1rem;
}

.error h2 {
  color: var(--color-danger);
  margin-bottom: 1rem;
}

.btn-primary {
  display: inline-block;
  padding: 0.6rem 1.5rem;
  background: var(--btn-primary-bg);
  color: var(--btn-primary-text);
  border: 1px solid var(--btn-primary-bg);
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  min-height: 44px;
}

.btn-primary:hover {
  background: var(--btn-primary-bg-hover);
  color: var(--btn-primary-text-hover);
  border-color: var(--btn-primary-bg-hover);
}
</style>
