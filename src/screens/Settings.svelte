<script lang="ts">
  import { app, lastMigrationError } from '../lib/app.svelte'
  import { backupFileName, daysSinceExport, markExported } from '../lib/db/meta'
  import { downloadBytes } from '../lib/storage'
  import Icon from '../ui/Icon.svelte'

  let sinceExport = $state<number | null>(null)
  let message = $state<string | null>(null)
  let fileInput = $state<HTMLInputElement | null>(null)

  $effect(() => {
    const db = app.db
    if (db) void daysSinceExport(db).then((d) => (sinceExport = d))
  })

  async function exportData() {
    if (!app.db) return
    const bytes = await app.db.exportFile()
    downloadBytes(bytes, backupFileName())
    await markExported(app.db)
    sinceExport = 0
    message = 'Progression exportée.'
  }

  async function importData(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file || !app.db) return
    const ok = confirm('Remplacer toute ta progression actuelle par cette sauvegarde ?')
    if (!ok) return
    try {
      await app.db.importFile(new Uint8Array(await file.arrayBuffer()))
      message = 'Sauvegarde importée.'
      await app.refresh()
    } catch (err) {
      message = err instanceof Error ? err.message : String(err)
    } finally {
      if (fileInput) fileInput.value = ''
    }
  }

  const exportLabel = $derived(
    sinceExport === null ? 'Jamais exportée' : sinceExport === 0 ? "Dernier export : aujourd'hui" : `Dernier export : il y a ${sinceExport} j`,
  )
  const migrationError = lastMigrationError()
</script>

<main class="page">
  <header class="bar">
    <button class="icon-btn" aria-label="Retour" onclick={() => app.go({ name: 'today' })}>
      <Icon name="back" />
    </button>
    <h1>Réglages</h1>
  </header>

  <section>
    <h2>Sauvegarde</h2>
    <p class="status">
      {#if app.persist === 'granted'}Stockage protégé{:else}Stockage non protégé : exporte ta progression régulièrement{/if}
    </p>
    <p class="status">{exportLabel}</p>
    <button class="row" onclick={exportData}>Exporter ma progression</button>
    <button class="row" onclick={() => fileInput?.click()}>Importer une sauvegarde</button>
    <input bind:this={fileInput} type="file" accept=".sqlite3,application/x-sqlite3,application/octet-stream" hidden onchange={importData} />
    {#if message}<p class="msg" role="status">{message}</p>{/if}
    {#if migrationError}
      <p class="msg">La dernière mise à jour des données a échoué ({migrationError}). Ta progression a été restaurée.</p>
    {/if}
  </section>

  <section>
    <h2>Clavier russe</h2>
    <details>
      <summary>Comment l'installer</summary>
      <ol class="steps">
        <li>Ouvre les paramètres de Gboard (appui long sur la touche virgule, puis l'engrenage).</li>
        <li>Langues → Ajouter un clavier → Русский → ЙЦУКЕН.</li>
        <li>Pour changer de langue, appuie sur la touche globe ou glisse sur la barre d'espace.</li>
      </ol>
    </details>
  </section>

  <section>
    <h2>Crédits et licences</h2>
    <ul class="credits">
      {#each app.pack?.credits ?? [] as c (c.name + c.use)}
        <li><a href={c.url} target="_blank" rel="noreferrer">{c.name}</a> — {c.license}, {c.use}</li>
      {/each}
    </ul>
    <p class="version">Version du contenu {app.pack?.version}, {app.pack?.lastDay} jours publiés</p>
  </section>
</main>

<style>
  .bar {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 56px;
    margin-left: calc(-1 * var(--margin-x) - var(--gutter) + 4px);
  }
  h1 {
    margin: 0;
    margin-left: calc(var(--margin-x) - 44px + var(--gutter) - 12px);
    font-size: var(--s-21);
    font-weight: 600;
  }
  section {
    padding: 16px 0 8px;
  }
  h2 {
    margin: 0 0 8px;
    font-size: var(--s-17);
    font-weight: 700;
  }
  .status {
    margin: 0 0 4px;
    color: var(--graphite);
    font-size: var(--s-14);
  }
  .row {
    display: block;
    width: 100%;
    min-height: var(--line);
    padding: 0;
    border: 0;
    border-bottom: 1px solid var(--rule);
    background: none;
    text-align: left;
    font-size: var(--s-17);
    color: var(--ink);
    cursor: pointer;
  }
  .row:first-of-type {
    border-top: 1px solid var(--rule);
    margin-top: 12px;
  }
  .msg {
    margin: 12px 0 0;
    color: var(--ink);
  }
  details summary {
    min-height: 44px;
    display: flex;
    align-items: center;
    color: var(--ink);
    cursor: pointer;
  }
  .steps {
    margin: 4px 0 0;
    padding-left: 1.2em;
  }
  .steps li {
    margin: 6px 0;
  }
  .credits {
    margin: 0;
    padding-left: 1.1em;
    font-size: var(--s-14);
  }
  .credits li {
    margin: 6px 0;
  }
  .credits a {
    color: var(--ink);
  }
  .version {
    margin: 16px 0 32px;
    font-size: var(--s-14);
    color: var(--graphite);
  }
</style>
