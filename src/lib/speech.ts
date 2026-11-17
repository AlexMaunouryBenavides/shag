// Reconnaissance vocale russe via la Web Speech API de Chrome (spec audio-speech).
// Nécessite le réseau sur Android ; repli en auto-évaluation sinon.

interface RecognitionResultList {
  length: number
  [i: number]: { [j: number]: { transcript: string } }
}
interface Recognition {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  onresult: ((e: { results: RecognitionResultList }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  abort(): void
}
type RecognitionCtor = new () => Recognition

function ctor(): RecognitionCtor | undefined {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

export function speechAvailable(): boolean {
  return Boolean(ctor()) && navigator.onLine
}

/** Écoute une phrase en russe ; renvoie les transcriptions candidates (vide si rien compris). */
export function listen(timeoutMs = 8000): { result: Promise<string[]>; cancel: () => void } {
  const Ctor = ctor()
  if (!Ctor) return { result: Promise.reject(new Error('indisponible')), cancel: () => {} }
  const rec = new Ctor()
  rec.lang = 'ru-RU'
  rec.interimResults = false
  rec.maxAlternatives = 3
  let timer: ReturnType<typeof setTimeout>
  const result = new Promise<string[]>((resolve, reject) => {
    let got: string[] = []
    rec.onresult = (e) => {
      const alts = e.results[0]
      got = [0, 1, 2].map((i) => alts?.[i]?.transcript).filter((t): t is string => Boolean(t))
    }
    rec.onerror = (e) => {
      clearTimeout(timer)
      if (e.error === 'no-speech' || e.error === 'aborted') resolve([])
      else reject(new Error(e.error))
    }
    rec.onend = () => {
      clearTimeout(timer)
      resolve(got)
    }
    rec.start()
    timer = setTimeout(() => rec.abort(), timeoutMs)
  })
  return { result, cancel: () => rec.abort() }
}
