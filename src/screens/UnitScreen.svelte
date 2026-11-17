<script lang="ts">
  // Écran d'unité : ✕ (retour, progression conservée) + barre de progression + contenu.
  // Les unités elles-mêmes sont implémentées dans src/units/ (section 7).
  import { app } from '../lib/app.svelte'
  import { UNIT_LABELS } from '../lib/content/types'
  import { completeUnit, dayOf, startUnit } from '../lib/engine/plan'
  import Icon from '../ui/Icon.svelte'

  let { day, index }: { day: number; index: number } = $props()
  const unit = $derived(app.pack ? dayOf(app.pack, day)?.units[index] : undefined)

  $effect(() => {
    if (app.db) void startUnit(app.db, day, index)
  })

  async function finish() {
    if (!app.db || !app.pack) return
    await completeUnit(app.db, app.pack, day, index)
    app.go({ name: 'today' })
  }
</script>

<main class="page unit">
  <header class="bar">
    <button class="icon-btn" aria-label="Quitter l'unité" onclick={() => app.go({ name: 'today' })}>
      <Icon name="close" />
    </button>
  </header>
  {#if unit}
    <h1>{UNIT_LABELS[unit.type]}</h1>
    <p>Cette unité arrive bientôt.</p>
    <div class="dock"><button class="primary" onclick={finish}>Terminer l'unité</button></div>
  {/if}
</main>

<style>
  .bar {
    display: flex;
    align-items: center;
    height: 56px;
    margin-left: calc(-1 * var(--margin-x) - var(--gutter) + 4px);
  }
  h1 {
    font-size: var(--s-28);
    margin: 16px 0 8px;
  }
</style>
