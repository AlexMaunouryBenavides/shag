<script lang="ts" module>
  export interface RunnerCursor {
    pos: number
    /** exercices ratés, reproposés une fois à la fin */
    retry: number[]
    inRetry: boolean
    results: Record<number, boolean>
  }
  export const freshCursor = (): RunnerCursor => ({ pos: 0, retry: [], inRetry: false, results: {} })
</script>

<script lang="ts">
  import ExerciseView from '../exercises/ExerciseView.svelte'
  import type { Spec } from '../lib/engine/specs'

  let {
    specs,
    day,
    flagPrefix,
    flagIds,
    cursor: initial,
    onprogress,
    oncursor,
    ondone,
    onanswer,
  }: {
    specs: Spec[]
    day: number
    flagPrefix: string
    /** identifiants d'éléments pour les signalements ⚑ (sinon préfixe:index) */
    flagIds?: string[]
    cursor: RunnerCursor | null
    onprogress: (done: number, total: number) => void
    oncursor: (c: RunnerCursor) => void
    ondone: (results: Record<number, boolean>) => void
    /** appelé à la première réponse de chaque exercice (avant la seconde chance) */
    onanswer?: (index: number, correct: boolean) => void | Promise<void>
  } = $props()

  // L'état initial est copié une fois : le curseur évolue ensuite localement.
  // svelte-ignore state_referenced_locally
  let c = $state<RunnerCursor>(initial ?? freshCursor())
  const current = $derived(c.inRetry ? c.retry[c.pos] : c.pos)
  const total = $derived(specs.length + c.retry.length)
  const done = $derived(c.inRetry ? specs.length + c.pos : c.pos)

  $effect(() => onprogress(done, total))
  $effect(() => {
    if (specs.length === 0) ondone({})
  })

  async function result(correct: boolean) {
    const next: RunnerCursor = { ...c, retry: [...c.retry], results: { ...c.results } }
    if (!next.inRetry) {
      next.results[current] = correct
      await onanswer?.(current, correct)
      if (!correct) next.retry.push(current)
    }
    next.pos += 1
    if (!next.inRetry && next.pos >= specs.length) {
      next.inRetry = true
      next.pos = 0
    }
    if (next.inRetry && next.pos >= next.retry.length) {
      oncursor(next)
      ondone(next.results)
      return
    }
    c = next
    oncursor(next)
  }
</script>

{#if specs.length && current !== undefined && specs[current]}
  {#key `${c.inRetry}-${c.pos}`}
    <ExerciseView spec={specs[current]} flagId={flagIds?.[current] ?? `${flagPrefix}:${current}`} {day} onresult={result} />
  {/key}
{/if}
