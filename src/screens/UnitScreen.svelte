<script lang="ts">
  // Écran d'unité (spec app-shell) : uniquement ✕ (retour, progression conservée),
  // une fine barre de progression et l'unité en cours.
  import { onDestroy, onMount } from 'svelte'
  import { app } from '../lib/app.svelte'
  import { stop } from '../lib/audio'
  import type { Unit } from '../lib/content/types'
  import { completeUnit, dayOf, loadCursor, saveCursor, startUnit, waitingUnits } from '../lib/engine/plan'
  import Icon from '../ui/Icon.svelte'
  import BilanUnit from '../units/BilanUnit.svelte'
  import ExercisesUnit from '../units/ExercisesUnit.svelte'
  import GrammarUnit from '../units/GrammarUnit.svelte'
  import LessonUnit from '../units/LessonUnit.svelte'
  import NewUnit from '../units/NewUnit.svelte'
  import ReviewUnit from '../units/ReviewUnit.svelte'

  /** day/index = unité du plan ; extra = révisions supplémentaires (hors plan) ;
   *  replay = unité d'une journée terminée refaite, sans effet sur la progression */
  let {
    day,
    index = null,
    extra = false,
    replay = false,
  }: { day: number; index?: number | null; extra?: boolean; replay?: boolean } = $props()

  let extraStep = $state(0)
  const planned = $derived(index !== null && !replay)
  const unit = $derived<Unit | undefined>(
    extra ? (app.today?.kind === 'waiting' ? waitingUnits(app.pack!)[extraStep] : { type: 'review', audio: false }) : dayOf(app.pack!, day)?.units[index!],
  )
  let cursor = $state<unknown>(null)
  let ready = $state(false)
  let progress = $state(0)
  let empty = $state(false)

  onMount(async () => {
    if (planned && app.db) {
      await startUnit(app.db, day, index!)
      cursor = await loadCursor(app.db, day, index!)
    }
    ready = true
  })
  onDestroy(stop)

  function onprogress(done: number, total: number) {
    progress = total ? done / total : 0
  }

  function oncursor(c: unknown) {
    if (planned && app.db) void saveCursor(app.db, day, index!, c)
  }

  async function onfinish() {
    if (planned && app.db && app.pack) await completeUnit(app.db, app.pack, day, index!)
    if (extra && app.today?.kind === 'waiting' && extraStep + 1 < waitingUnits(app.pack!).length) {
      extraStep += 1
      ready = false
      queueMicrotask(() => (ready = true))
      return
    }
    app.go({ name: 'today' })
  }

  async function onempty() {
    // Rien à réviser : l'unité est considérée comme faite, sans écran intermédiaire.
    if (planned) return onfinish()
    empty = true
  }

  const common = $derived({ day, onprogress, oncursor, onfinish })
</script>

<main class="page unit">
  <header class="bar">
    <button class="icon-btn" aria-label="Quitter (ta progression est gardée)" onclick={() => app.go({ name: 'today' })}>
      <Icon name="close" />
    </button>
    <span class="track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(progress * 100)}>
      <span class="fill" style:width="{progress * 100}%"></span>
    </span>
  </header>

  {#if empty}
    <p class="empty">Rien à réviser pour l'instant. Reviens plus tard dans la journée.</p>
    <div class="dock"><button class="primary" onclick={() => app.go({ name: 'today' })}>Retour</button></div>
  {:else if ready && !unit}
    <p class="empty">Cette unité n'existe plus dans cette version du programme.</p>
    <div class="dock"><button class="primary" onclick={() => app.go({ name: 'today' })}>Retour</button></div>
  {:else if ready && unit}
    {#key extraStep}
      {#if unit.type === 'review'}
        <ReviewUnit {...common} cursor={cursor as never} {onempty} />
      {:else if unit.type === 'new' || unit.type === 'letters'}
        <NewUnit {...common} ids={(unit.type === 'letters' ? unit.letters : unit.items) ?? []} cursor={cursor as never} {replay} />
      {:else if unit.type === 'lesson'}
        <LessonUnit {...common} dialogueDay={day} cursor={cursor as never} />
      {:else if unit.type === 'fluency'}
        <LessonUnit {...common} dialogueDay={unit.dialogueDay ?? day} fluency cursor={null} />
      {:else if unit.type === 'grammar'}
        <GrammarUnit {...common} cursor={cursor as never} />
      {:else if unit.type === 'bilan'}
        <BilanUnit {...common} ids={unit.items ?? []} cursor={cursor as never} />
      {:else}
        <ExercisesUnit {...common} {unit} cursor={cursor as never} />
      {/if}
    {/key}
  {/if}
</main>

<style>
  .bar {
    display: flex;
    align-items: center;
    gap: 12px;
    height: 56px;
    margin-left: calc(-1 * var(--margin-x) - var(--gutter) + 4px);
  }
  .track {
    flex: 1;
    height: 4px;
    margin-left: calc(var(--margin-x) - 44px - 12px + var(--gutter) - 4px);
    border-radius: 2px;
    background: var(--rule);
    overflow: hidden;
  }
  .fill {
    display: block;
    height: 100%;
    background: var(--ink);
    transition: width 0.3s ease;
  }
  .empty {
    margin: 24px 0;
    font-size: var(--s-17);
  }
</style>
