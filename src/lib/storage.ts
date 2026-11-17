// Stockage persistant (spec local-data) : demandé au premier lancement, statut affiché dans Réglages.

export type PersistStatus = 'granted' | 'denied' | 'unsupported'

export async function requestPersistentStorage(): Promise<PersistStatus> {
  if (!navigator.storage?.persist) return 'unsupported'
  if (await navigator.storage.persisted()) return 'granted'
  return (await navigator.storage.persist()) ? 'granted' : 'denied'
}

export async function persistentStorageStatus(): Promise<PersistStatus> {
  if (!navigator.storage?.persisted) return 'unsupported'
  return (await navigator.storage.persisted()) ? 'granted' : 'denied'
}

/** Déclenche le téléchargement d'un fichier binaire (export de sauvegarde). */
export function downloadBytes(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([bytes as BlobPart], { type: 'application/x-sqlite3' })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
