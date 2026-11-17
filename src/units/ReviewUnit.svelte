<script lang="ts" module>
  export interface ReviewCursor {
    ids: string[]
    formats: string[]
    runner: import('./ExercisesRunner.svelte').RunnerCursor | null
  }
</script>

<script lang="ts">
  // Unité de révision SRS : cartes dues (plafonnées, priorisées, entrelacées), format selon la
  // stabilité, note FSRS déduite de la première réponse ; les erreurs reviennent en fin d'unité.
  import { onMount } from 'svelte'
  import { app } from '../lib/app.svelte'
  import { cardSpec, type Spec } from '../lib/engine/specs'
  import { chooseFormat, gradeFor, parseCard, pickDue, recordReview, type CardRow, type Format } from '../lib/engine/srs'
  import ExercisesRunner from './ExercisesRunner.svelte'

  let {
    day,
    cursor,
    onprogress,
    oncursor,
    onfinish,
    onempty,
  }: {
    day: number
    cursor: ReviewCursor | null
    onprogress: (done: number, total: number) => void
    oncursor: (c: unknown) => void
    onfinish: () => void
    onempty: () => void
  } = $props()

  let ids = $state<string[]>([])
  let formats = $state<Format[]>([])
  let specs = $state<Spec[]>([])
  let ready = $state(false)
  let started = 0

  onMount(async () => {
    const db = app.db!
    const pack = app.pack!
    if (cursor) {
      ids = cursor.ids
      formats = cursor.formats as Format[]
    } else {
      const rows = (await pickDue(db)).filter((r: CardRow) => pack.items[r.card_id])
      ids = rows.map((r) => r.card_id)
      formats = rows.map((r) => chooseFormat(parseCard(r), pack.items[r.card_id]))
    }
    if (!ids.length) return onempty()
    specs = ids.map((id, i) => cardSpec(pack.items[id], formats[i], pack, `${id}:${new Date().toDateString()}`))
    oncursor({ ids, formats, runner: cursor?.runner ?? null } satisfies ReviewCursor)
    ready = true
    started = performance.now()
  })

  async function answer(i: number, correct: boolean) {
    const elapsed = Math.round(performance.now() - started)
    started = performance.now()
    await recordReview(app.db!, ids[i], gradeFor(correct), formats[i], elapsed)
  }
</script>

{#if ready}
  <ExercisesRunner
    {specs}
    {day}
    flagPrefix="srs"
    flagIds={ids}
    cursor={cursor?.runner ?? null}
    {onprogress}
    oncursor={(r) => oncursor({ ids, formats, runner: r } satisfies ReviewCursor)}
    onanswer={answer}
    ondone={onfinish}
  />
{/if}
