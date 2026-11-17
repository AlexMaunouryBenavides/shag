<script lang="ts">
  // Unités « Nouveaux éléments » et « Nouvelles lettres » : présentation d'un élément,
  // puis rappel immédiat ; l'élément entre dans le SRS avec ce premier rappel comme révision.
  import { onMount } from 'svelte'
  import { app } from '../lib/app.svelte'
  import { play } from '../lib/audio'
  import type { Item } from '../lib/content/types'
  import { cardSpec } from '../lib/engine/specs'
  import { gradeFor, introduce, recordReview } from '../lib/engine/srs'
  import ExerciseView from '../exercises/ExerciseView.svelte'
  import AudioButton from '../ui/AudioButton.svelte'

  interface Cursor {
    pos: number
    step: 'present' | 'recall'
  }

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
    cursor: Cursor | null
    onprogress: (done: number, total: number) => void
    oncursor: (c: unknown) => void
    onfinish: () => void
  } = $props()

  // svelte-ignore state_referenced_locally
  let c = $state<Cursor>(cursor ?? { pos: 0, step: 'present' })
  const pack = $derived(app.pack!)
  const items = $derived(ids.map((id) => pack.items[id]).filter(Boolean) as Item[])
  const item = $derived(items[c.pos])
  const isLetter = $derived(item?.kind === 'letter')
  const showTranslit = $derived(day <= 30)

  $effect(() => onprogress(c.pos * 2 + (c.step === 'recall' ? 1 : 0), items.length * 2))

  function speakItem() {
    if (app.mode === 'audio' && item) void play(pack, isLetter ? (item.example?.ru ?? '') : item.ru)
  }
  onMount(speakItem)

  function toRecall() {
    c = { ...c, step: 'recall' }
    oncursor(c)
  }

  async function recalled(correct: boolean) {
    await introduce(app.db!, [item], day)
    await recordReview(app.db!, item.id, gradeFor(correct), 'recognition', null)
    if (c.pos + 1 >= items.length) return onfinish()
    c = { pos: c.pos + 1, step: 'present' }
    oncursor(c)
    queueMicrotask(speakItem)
  }
</script>

{#if item}
  {#if c.step === 'present'}
    <section class="card">
      {#if isLetter}
        <p class="letter" lang="ru">{item.ru}</p>
        <p class="sound">se prononce <strong>{item.sound}</strong></p>
        {#if item.hint}<p class="hint">{item.hint}</p>{/if}
        {#if item.warning}<p class="warning">{item.warning}</p>{/if}
        {#if item.example}
          <div class="example">
            <p><span class="ru" lang="ru">{item.example.ru}</span>
              {#if item.example.translit}<span class="tr">{item.example.translit}</span>{/if}
              <span class="fr">{item.example.fr}</span></p>
            <AudioButton ru={item.example.ru} />
          </div>
        {/if}
      {:else}
        <div class="word">
          <p class="ru big" lang="ru">{item.ru}</p>
          <AudioButton ru={item.ru} />
        </div>
        {#if showTranslit && item.translit}<p class="tr">{item.translit}</p>{/if}
        <p class="meaning">{item.fr}{#if item.note}<span class="note"> ({item.note})</span>{/if}</p>
        {#if item.example}
          <div class="example">
            <p><span class="ru" lang="ru">{item.example.ru}</span><span class="fr">{item.example.fr}</span></p>
            <AudioButton ru={item.example.ru} />
          </div>
        {/if}
      {/if}
    </section>
    <div class="dock"><button class="primary" onclick={toRecall}>Suivant</button></div>
  {:else}
    {#key c.pos}
      <ExerciseView spec={cardSpec(item, 'recognition', pack, `new:${item.id}`)} flagId={item.id} {day} onresult={recalled} />
    {/key}
  {/if}
{/if}

<style>
  .card {
    padding-top: 8px;
  }
  .letter {
    margin: 8px 0 4px;
    font-size: var(--s-64);
    font-weight: 700;
    line-height: 1.1;
    color: var(--text);
    letter-spacing: 0.08em;
  }
  .sound {
    margin: 0;
    font-size: var(--s-21);
  }
  .sound strong {
    color: var(--ink);
  }
  .hint {
    margin: 8px 0 0;
    color: var(--graphite);
  }
  .warning {
    margin: 14px 0 0;
    padding-left: 12px;
    border-left: 3px solid var(--margin);
    color: var(--text);
  }
  .word {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-top: 8px;
  }
  .ru {
    font-weight: 600;
  }
  .big {
    flex: 1;
    margin: 0;
    font-size: var(--s-44);
    line-height: 1.2;
    color: var(--text);
  }
  .tr {
    display: block;
    color: var(--graphite);
    font-size: var(--s-17);
  }
  .meaning {
    margin: 10px 0 0;
    font-size: var(--s-21);
  }
  .note {
    color: var(--graphite);
    font-size: var(--s-17);
  }
  .example {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 24px;
    padding-top: 14px;
    border-top: 1px solid var(--rule);
  }
  .example p {
    flex: 1;
    margin: 0;
    font-size: var(--s-21);
  }
  .example .fr {
    display: block;
    font-size: var(--s-17);
    color: var(--graphite);
  }
</style>
