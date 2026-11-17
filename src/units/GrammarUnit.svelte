<script lang="ts">
  // Unité Grammaire : un seul point, explication courte, exemples, puis exercices d'application.
  import { app } from '../lib/app.svelte'
  import { dayOf } from '../lib/engine/plan'
  import { exerciseSpec } from '../lib/engine/specs'
  import AudioButton from '../ui/AudioButton.svelte'
  import ExercisesRunner, { type RunnerCursor } from './ExercisesRunner.svelte'

  let {
    day,
    cursor,
    onprogress,
    oncursor,
    onfinish,
  }: {
    day: number
    cursor: { step: 'read' | 'practice'; runner: RunnerCursor | null } | null
    onprogress: (done: number, total: number) => void
    oncursor: (c: unknown) => void
    onfinish: () => void
  } = $props()

  const grammar = $derived(dayOf(app.pack!, day)?.grammar)
  const specs = $derived((grammar?.exercises ?? []).map((ex, i) => exerciseSpec(ex, `${day}:grammar:${i}`)))
  // svelte-ignore state_referenced_locally
  let step = $state(cursor?.step ?? 'read')
  const paragraphs = $derived((grammar?.explanation ?? '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean))

  $effect(() => {
    if (step === 'read') onprogress(0, 1)
  })

  function practice() {
    if (!specs.length) return onfinish()
    step = 'practice'
    oncursor({ step, runner: null })
  }
</script>

{#if grammar}
  {#if step === 'read'}
    <article>
      <h2>{grammar.title}</h2>
      {#each paragraphs as p, i (i)}<p class="para">{p}</p>{/each}
      {#if grammar.examples.length}
        <ul class="examples">
          {#each grammar.examples as ex, i (i)}
            <li>
              <div><span class="ru" lang="ru">{ex.ru}</span><span class="fr">{ex.fr}</span></div>
              <AudioButton ru={ex.ru} />
            </li>
          {/each}
        </ul>
      {/if}
    </article>
    <div class="dock"><button class="primary" onclick={practice}>{specs.length ? 'S’entraîner' : 'Terminer'}</button></div>
  {:else}
    <ExercisesRunner
      {specs}
      {day}
      flagPrefix="{day}:grammar"
      cursor={cursor?.runner ?? null}
      {onprogress}
      oncursor={(r) => oncursor({ step: 'practice', runner: r })}
      ondone={onfinish}
    />
  {/if}
{/if}

<style>
  h2 {
    margin: 12px 0 8px;
    font-size: var(--s-28);
    line-height: 1.2;
  }
  .para {
    margin: 10px 0;
    font-size: var(--s-17);
    max-width: 38em;
  }
  .examples {
    list-style: none;
    margin: 16px 0 0;
    padding: 0;
    border-top: 1px solid var(--rule);
  }
  .examples li {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid var(--rule);
  }
  .examples div {
    flex: 1;
  }
  .ru {
    display: block;
    font-size: var(--s-21);
    font-weight: 600;
  }
  .fr {
    display: block;
    color: var(--graphite);
  }
</style>
