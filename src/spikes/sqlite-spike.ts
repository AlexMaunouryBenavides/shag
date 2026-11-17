// Page de test de la couche de données réelle (Worker + migrations + export/import).
import { createDbClient } from '../lib/db/client'
import { getMeta, setMeta } from '../lib/db/meta'

const out = document.getElementById('out')!
const log = (line: string) => {
  out.textContent += line + '\n'
}

const db = createDbClient()
let exported: Uint8Array | null = null

async function run() {
  const t0 = performance.now()
  const info = await db.init()
  log(`SQLite ${info.sqliteVersion} prêt en ${Math.round(performance.now() - t0)} ms`)
  log(`Migration : v${info.migration.from} → v${info.migration.to}` +
    (info.migration.restored ? ` (RESTAURÉE : ${info.migration.error})` : ''))
  const visits = Number((await getMeta(db, 'spike_visits')) ?? 0) + 1
  await setMeta(db, 'spike_visits', String(visits))
  log(`Visites enregistrées : ${visits}`)
  log(visits > 1 ? '✓ Les données ont survécu au rechargement' : '→ Recharge la page pour vérifier')
  ;(window as unknown as { shagTest: unknown }).shagTest = { db, getMeta, setMeta }
}

document.getElementById('export')!.addEventListener('click', async () => {
  exported = await db.exportFile()
  log(`Export : ${exported.byteLength} octets`)
})

document.getElementById('import')!.addEventListener('click', async () => {
  if (!exported) return log("Exporte d'abord")
  await setMeta(db, 'spike_visits', '999')
  const info = await db.importFile(exported)
  log(`Import OK (v${info.migration.to}) — visites restaurées : ${await getMeta(db, 'spike_visits')}`)
})

run().catch((e) => log(`ÉCHEC : ${e}`))
