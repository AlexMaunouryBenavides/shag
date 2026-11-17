<script lang="ts">
  // Fil de messages façon messagerie. Tap sur un mot → fiche mot ; tap sur la bulle → traduction.
  import { app } from '../lib/app.svelte'
  import { SvelteSet } from 'svelte/reactivity'
  import type { Message } from '../lib/content/types'
  import AudioButton from './AudioButton.svelte'
  import WordSheet from './WordSheet.svelte'

  let {
    messages,
    day,
    shown = messages.length,
    highlightNew = false,
    showHelp = true,
  }: { messages: Message[]; day: number; shown?: number; highlightNew?: boolean; showHelp?: boolean } = $props()

  const pack = $derived(app.pack!)
  const first = $derived(messages[0]?.from)
  const translated = new SvelteSet<number>()
  let sheet = $state<{ word: string; itemId: string | null } | null>(null)

  function parts(m: Message): { text: string; word?: string }[] {
    const out: { text: string; word?: string }[] = []
    const re = /(?:[А-Яа-яЁё]́?)+(?:-(?:[А-Яа-яЁё]́?)+)*/g
    let last = 0
    for (const match of m.ru.matchAll(re)) {
      if (match.index! > last) out.push({ text: m.ru.slice(last, match.index) })
      out.push({ text: match[0], word: match[0] })
      last = match.index! + match[0].length
    }
    if (last < m.ru.length) out.push({ text: m.ru.slice(last) })
    return out
  }

  function toggle(i: number) {
    if (translated.has(i)) translated.delete(i)
    else translated.add(i)
  }
</script>

<div class="thread">
  {#each messages.slice(0, shown) as m, i (i)}
    <div class="msg" class:me={m.from !== first}>
      <span class="who">{pack.characters[m.from]?.name ?? m.from}</span>
      <div class="bubble">
        <p class="ru" lang="ru">
          {#each parts(m) as p, k (k)}{#if p.word && showHelp}<button
                class="w"
                class:new={highlightNew && m.words?.[p.word] && pack.items[m.words[p.word]]?.day === day}
                onclick={() => (sheet = { word: p.word!, itemId: m.words?.[p.word!] ?? null })}>{p.text}</button
              >{:else}{p.text}{/if}{/each}
        </p>
        {#if translated.has(i)}<p class="fr">{m.fr}</p>{/if}
      </div>
      <div class="tools">
        <AudioButton ru={m.ru} size="small" />
        {#if showHelp}
          <button class="tr-btn" onclick={() => toggle(i)} aria-pressed={translated.has(i)}>
            {translated.has(i) ? 'Masquer' : 'Traduire'}
          </button>
        {/if}
      </div>
    </div>
  {/each}
</div>

{#if sheet}
  <WordSheet
    word={sheet.word}
    item={sheet.itemId ? (pack.items[sheet.itemId] ?? null) : null}
    {day}
    onclose={() => (sheet = null)}
  />
{/if}

<style>
  .thread {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 8px 0 16px;
  }
  .msg {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    max-width: 88%;
  }
  .msg.me {
    align-self: flex-end;
    align-items: flex-end;
  }
  .who {
    font-size: var(--s-14);
    color: var(--graphite);
    margin: 0 4px 2px;
  }
  .bubble {
    padding: 10px 14px;
    border-radius: 16px 16px 16px 4px;
    background: var(--paper-raised);
    border: 1px solid var(--rule);
  }
  .me .bubble {
    border-radius: 16px 16px 4px 16px;
    background: color-mix(in srgb, var(--ink) 10%, var(--paper-raised));
  }
  .ru {
    margin: 0;
    font-size: var(--s-21);
    line-height: 1.5;
  }
  .w {
    display: inline;
    padding: 0;
    border: 0;
    background: none;
    font: inherit;
    color: inherit;
    cursor: pointer;
  }
  .w.new {
    color: var(--ink);
    font-weight: 700;
    text-decoration: underline;
    text-decoration-thickness: 2px;
    text-underline-offset: 4px;
  }
  .fr {
    margin: 6px 0 0;
    color: var(--graphite);
    font-size: var(--s-17);
  }
  .tools {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 4px;
  }
  .tr-btn {
    min-height: 44px;
    padding: 0 8px;
    border: 0;
    background: none;
    color: var(--graphite);
    font-size: var(--s-14);
    cursor: pointer;
  }
</style>
