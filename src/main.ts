import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { SsoService } from '@bogdanovmn/ssofw'
import './assets/main.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

const ssoService = new SsoService(import.meta.env.VITE_SSO_SERVICE_URL)
app.provide('ssoService', ssoService)

app.mount('#app')
