// Lecture de l'audio pré-généré et mise en cache par phase (spec audio-speech, design §8).
import type { Pack } from './content/types'

const CACHE = 'shag-audio'
const base = import.meta.env.BASE_URL

export function audioUrl(file: string): string {
  return `${base}content/audio/${file}`
}

let current: HTMLAudioElement | null = null

/** Joue le texte russe donné (s'il a un audio). `slow` = 0,75×. */
export function play(pack: Pack, ru: string, slow = false): Promise<void> {
  const file = pack.audio[ru]
  if (!file) return Promise.resolve()
  current?.pause()
  const el = new Audio(audioUrl(file))
  el.playbackRate = slow ? 0.75 : 1
  el.preservesPitch = true
  current = el
  return el.play().catch(() => undefined)
}

export function stop(): void {
  current?.pause()
  current = null
}

/**
 * Télécharge en arrière-plan l'audio de la phase courante et de la suivante,
 * pour qu'il soit disponible hors ligne (cache-first ensuite via le service worker).
 */
export async function prefetchPhases(pack: Pack, phase: number): Promise<number> {
  if (!('caches' in window) || !navigator.onLine) return 0
  const cache = await caches.open(CACHE)
  const files = [...(pack.audioByPhase[String(phase)] ?? []), ...(pack.audioByPhase[String(phase + 1)] ?? [])]
  let fetched = 0
  for (const file of new Set(files)) {
    const url = audioUrl(file)
    if (await cache.match(url)) continue
    try {
      const res = await fetch(url)
      if (res.ok) {
        await cache.put(url, res)
        fetched++
      }
    } catch {
      return fetched // hors ligne entre-temps : on reprendra plus tard
    }
  }
  return fetched
}

/** Joue un texte et attend la fin de la lecture (lecture enchaînée d'un dialogue). */
export function playToEnd(pack: Pack, ru: string): Promise<void> {
  const file = pack.audio[ru]
  if (!file) return Promise.resolve()
  current?.pause()
  const el = new Audio(audioUrl(file))
  current = el
  return new Promise((resolve) => {
    el.onended = () => resolve()
    el.onerror = () => resolve()
    el.play().catch(() => resolve())
  })
}
