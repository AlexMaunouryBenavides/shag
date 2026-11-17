<script lang="ts">
  // Bilan de l'alphabet (jour 10) : lecture et saisie d'une vingtaine de mots ; les lettres
  // des mots ratés sont marquées fragiles (priorisées en révision). Jamais bloquant.
  import { app } from '../lib/app.svelte'
  import type { Item } from '../lib/content/types'
  import { exerciseSpec, withDistractors, type Spec } from '../lib/engine/specs'
  import { markFragile } from '../lib/engine/srs'
  import ExercisesRunner, { type RunnerCursor } from './ExercisesRunner.svelte'

  let {
    day,
    ids,
    cursor,
    onprogress,
    oncursor,
    onfinish,
  }: {
    day: number
    ids: string[]
    cursor: RunnerCursor | null
    onprogress: (done: number, total: number) => void
    oncursor: (c: unknown) => void
    onfinish: () => void
  } = $props()

  const pack = $derived(app.pack!)
  const items = $derived(ids.map((id) => pack.items[id]).filter(Boolean) as Item[])
  const specs = $derived<Spec[]>(
    items.flatMap((it, i) => {
      const { options, answer } = withDistractors(it.fr, items.map((x) => x.fr), `bilan:${i}`)
      const read = exerciseSpec({ t: 'read', ru: it.ru, options, answer }, `bilan:r${i}`)
      return i % 2 === 0 ? [read, exerciseSpec({ t: 'copy', ru: it.ru, fr: it.fr }, `bilan:c${i}`)] : [read]
    }),
  )
  let fragile = $state<string[] | null>(null)

  async function done(results: Record<number, boolean>) {
    const counts: Record<string, number> = {}
    let k = 0
    items.forEach((it, i) => {
      const n = i % 2 === 0 ? 2 : 1
      const failed = Array.from({ length: n }, (_, j) => results[k + j] === false).some(Boolean)
      k += n
      if (!failed) return
      for (const ch of new Set(it.ru.replace(/́/g, '').toLowerCase())) {
        if (/[а-яё]/.test(ch)) counts[ch] = (counts[ch] ?? 0) + 1
      }
    })
    const letters = Object.entries(counts).filter(([, n]) => n >= 2).map(([c]) => c)
    const letterItems = Object.values(pack.items).filter((it) => it.kind === 'letter')
    const toMark = letterItems.filter((l) => letters.some((c) => l.ru.toLowerCase().includes(c)))
    if (toMark.length) await markFragile(app.db!, toMark.map((l) => l.id))
    fragile = toMark.map((l) => l.ru.split(' ')[0])
  }
</script>

{#if fragile === null}
  <ExercisesRunner {specs} {day} flagPrefix="bilan" {cursor} {onprogress} {oncursor} ondone={done} />
{:else}
  <section class="end">
    <h2>Bilan terminé</h2>
    {#if fragile.length}
      <p>À consolider : <strong lang="ru">{fragile.join(', ')}</strong></p>
      <p class="sub">Ces lettres reviendront plus souvent dans tes révisions.</p>
    {:else}
      <p>Tu lis toutes les lettres. La phase 1 peut commencer.</p>
    {/if}
  </section>
  <div class="dock"><button class="primary" onclick={onfinish}>Continuer</button></div>
{/if}

<style>
  .end h2 {
    margin: 16px 0 8px;
    font-size: var(--s-28);
  }
  .end p {
    font-size: var(--s-17);
  }
  .end strong {
    color: var(--margin);
    font-size: var(--s-21);
  }
  .sub {
    color: var(--graphite);
  }
</style>
