import { SsoService } from '@bogdanovmn/ssofw'
import { authStore } from '@/stores/auth'
import router from '@/router'

export async function logout(ssoService: SsoService): Promise<void> {
    const auth = authStore()
    await ssoService.deleteRefreshToken().catch(() => undefined)
    auth.update()
}

export function handleAuthFailure(ssoService: SsoService): void {
    void logout(ssoService)
    router.push('/')
}
