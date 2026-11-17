// Page de test du spike 1.5, à ouvrir sur le téléphone Android.
const out = document.getElementById('out')!
const log = (line: string) => {
  out.textContent += line + '\n'
}

const worker = new Worker(new URL('./sqlite-worker.ts', import.meta.url), { type: 'module' })
let nextId = 0
const pending = new Map<number, (v: { ok: boolean; data?: unknown; error?: string }) => void>()
worker.onmessage = (e) => {
  pending.get(e.data.id)?.(e.data)
  pending.delete(e.data.id)
}
const call = (cmd: string) =>
  new Promise<{ ok: boolean; data?: unknown; error?: string }>((resolve) => {
    const id = nextId++
    pending.set(id, resolve)
    worker.postMessage({ id, cmd })
  })

async function run() {
  log(`OPFS disponible : ${'storage' in navigator && 'getDirectory' in navigator.storage}`)
  const persisted = await navigator.storage?.persist?.()
  log(`Stockage persistant accordé : ${persisted}`)
  const t0 = performance.now()
  const r = await call('visit')
  if (!r.ok) return log(`ÉCHEC : ${r.error}`)
  const d = r.data as { version: string; count: number; first: string }
  log(`SQLite ${d.version} chargé en ${Math.round(performance.now() - t0)} ms`)
  log(`Visites enregistrées : ${d.count} (première : ${d.first})`)
  log(d.count > 1 ? '✓ Les données ont survécu au rechargement' : '→ Recharge la page pour vérifier')
}

document.getElementById('export')!.addEventListener('click', async () => {
  const r = await call('export')
  if (!r.ok) return log(`Export ÉCHEC : ${r.error}`)
  const bytes = r.data as Uint8Array
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/x-sqlite3' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: 'spike.sqlite3' })
  a.click()
  URL.revokeObjectURL(url)
  log(`Export : ${bytes.byteLength} octets`)
})

run()
