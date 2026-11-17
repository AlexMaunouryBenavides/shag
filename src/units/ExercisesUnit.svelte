<script lang="ts">
  // Unités à base d'exercices : écoute, écriture, oral, lecture, clavier, répétition.
  import type { Unit } from '../lib/content/types'
  import { exerciseSpec } from '../lib/engine/specs'
  import ExercisesRunner, { type RunnerCursor } from './ExercisesRunner.svelte'

  let {
    day,
    unit,
    cursor,
    onprogress,
    oncursor,
    onfinish,
  }: {
    day: number
    unit: Unit
    cursor: RunnerCursor | null
    onprogress: (done: number, total: number) => void
    oncursor: (c: unknown) => void
    onfinish: () => void
  } = $props()

  const specs = $derived((unit.exercises ?? []).map((ex, i) => exerciseSpec(ex, `${day}:${unit.type}:${i}`)))
  // Jour 1 : guide d'installation du clavier russe avant les premiers exercices de saisie.
  // svelte-ignore state_referenced_locally
  let showGuide = $state(day === 1 && unit.type === 'keyboard' && !cursor)
</script>

{#if showGuide}
  <section class="guide">
    <h2>Installe le clavier russe</h2>
    <ol>
      <li>Appuie longuement sur la touche virgule de ton clavier, puis sur l'engrenage.</li>
      <li>Langues → Ajouter un clavier → Русский → ЙЦУКЕН.</li>
      <li>Pour passer du français au russe : touche globe, ou glisse sur la barre d'espace.</li>
    </ol>
    <p>Les lettres ne sont pas à la même place qu'en français : c'est normal de chercher au début.</p>
    <div class="dock"><button class="primary" onclick={() => (showGuide = false)}>C'est fait</button></div>
  </section>
{:else}
  <ExercisesRunner
    {specs}
    {day}
    flagPrefix="{day}:{unit.type}"
    {cursor}
    {onprogress}
    {oncursor}
    ondone={onfinish}
  />
{/if}

<style>
  .guide h2 {
    margin: 12px 0;
    font-size: var(--s-28);
  }
  .guide ol {
    padding-left: 1.2em;
    font-size: var(--s-17);
  }
  .guide li {
    margin: 10px 0;
  }
  .guide p {
    color: var(--graphite);
  }
</style>
