// Mises à jour de l'app installée. Une PWA Android est surtout reprise depuis l'arrière-plan,
// sans nouvelle navigation : sans vérification explicite, elle peut rester des jours sur une
// ancienne version. On vérifie donc au lancement, à chaque retour au premier plan et toutes
// les heures, et on applique la mise à jour dès qu'on n'est pas au milieu d'une unité.
import { registerSW } from 'virtual:pwa-register'

const HOUR = 60 * 60 * 1000
let pending = false
let update: ((reload?: boolean) => Promise<void>) | null = null

export function initPwa(canReload: () => boolean): void {
  if (!('serviceWorker' in navigator)) return
  update = registerSW({
    immediate: true,
    onNeedRefresh() {
      pending = true
      if (canReload()) applyPendingUpdate()
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return
      const check = () => void registration.update().catch(() => {})
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
      setInterval(check, HOUR)
    },
  })
}

/** Recharge sur la nouvelle version si elle est prête (appelé en revenant sur « Aujourd'hui »). */
export function applyPendingUpdate(): void {
  if (pending && update) void update(true)
}
