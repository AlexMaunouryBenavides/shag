<script lang="ts">
  // Cadre d'exercice commun (spec exercises) : consigne, réponse, retour immédiat,
  // « Je ne sais pas », « Suivant » en un tap, Entrée pour valider.
  import { onMount } from 'svelte'
  import { app } from '../lib/app.svelte'
  import { play } from '../lib/audio'
  import { check, compareSpeech, normalize, type Verdict } from '../lib/engine/answer'
  import type { Spec } from '../lib/engine/specs'
  import { listen, speechAvailable } from '../lib/speech'
  import AudioButton from '../ui/AudioButton.svelte'
  import Feedback from '../ui/Feedback.svelte'
  import Icon from '../ui/Icon.svelte'

  let {
    spec,
    flagId,
    day,
    onresult,
  }: { spec: Spec; flagId: string; day: number; onresult: (correct: boolean) => void } = $props()

  type Shown = Verdict | { kind: 'self' | 'skipped'; expected: string }
  let verdict = $state<Shown | null>(null)
  let input = $state('')
  let chosen = $state<number | null>(null)
  let built = $state<number[]>([]) // remise en ordre : indices des mots choisis
  let heard = $state<{ word: string; ok: boolean }[] | null>(null)
  let listening = $state(false)
  let speechFailed = $state(false)
  let inputEl = $state<HTMLInputElement | null>(null)
  let nextEl = $state<HTMLButtonElement | null>(null)

  const audioMode = $derived(app.mode === 'audio')
  const answered = $derived(verdict !== null && verdict.kind !== 'latin' && verdict.kind !== 'empty')
  const correct = $derived(verdict?.kind === 'correct' || verdict?.kind === 'self')
  const reveal = $derived(
    spec.kind === 'type'
      ? spec.reveal
      : spec.kind === 'choice'
        ? (spec.reveal ?? (spec.optionsLang === 'ru' ? spec.options[spec.answer] : spec.prompt))
        : spec.kind === 'reply'
          ? spec.options[spec.answer]
          : spec.ru,
  )

  const meaning = $derived(spec.kind === 'choice' && spec.optionsLang === 'fr' ? spec.options[spec.answer] : undefined)
  const audioRu = $derived(spec.kind === 'choice' ? (spec.audio ?? reveal) : reveal)

  onMount(() => {
    if (spec.kind === 'type') inputEl?.focus()
    const first = spec.kind === 'choice' && spec.listenFirst ? spec.audio : spec.kind === 'shadow' ? spec.ru : null
    if (first && audioMode && app.pack) void play(app.pack, first)
  })

  function settle(v: Shown) {
    verdict = v
    if (!answered) return
    if (audioMode && app.pack && audioRu) void play(app.pack, audioRu)
    queueMicrotask(() => nextEl?.focus({ preventScroll: true }))
  }

  function submitTyped() {
    if (spec.kind !== 'type' || answered) return
    settle(check(input, spec.answers))
  }

  function choose(i: number) {
    if (answered || (spec.kind !== 'choice' && spec.kind !== 'reply')) return
    chosen = i
    const expected = spec.kind === 'choice' ? spec.options[spec.answer] : spec.options[spec.answer]
    settle(i === spec.answer ? { kind: 'correct', expected } : { kind: 'wrong', expected })
  }

  function submitOrder() {
    if (spec.kind !== 'order') return
    const got = built.map((i) => spec.words[i]).join(' ')
    settle(normalize(got) === normalize(spec.ru) ? { kind: 'correct', expected: spec.ru } : { kind: 'wrong', expected: spec.ru })
  }

  async function speak() {
    if (spec.kind !== 'speak' || listening) return
    if (!speechAvailable()) {
      speechFailed = true
      return
    }
    listening = true
    try {
      const alternatives = await listen().result
      const results = alternatives.map((t) => compareSpeech(t, spec.ru))
      const best = results.sort((a, b) => b.filter((w) => w.ok).length - a.filter((w) => w.ok).length)[0]
      heard = best ?? spec.ru.split(/\s+/).map((word) => ({ word, ok: false }))
      if (heard.every((w) => w.ok)) settle({ kind: 'correct', expected: spec.ru })
    } catch {
      speechFailed = true
    } finally {
      listening = false
    }
  }

  function skip() {
    settle({ kind: 'skipped', expected: reveal })
  }

  function next() {
    onresult(correct)
  }

  function keydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && answered) {
      e.preventDefault()
      next()
    }
  }
</script>

<svelte:window onkeydown={keydown} />

<div class="ex">
  <p class="instruction">{spec.instruction}</p>

  {#if spec.kind === 'type'}
    <div class="prompt">
      <p class="text {spec.promptLang}" lang={spec.promptLang}>{spec.prompt}</p>
    </div>
    <form
      onsubmit={(e) => {
        e.preventDefault()
        submitTyped()
      }}
    >
      <input
        bind:this={inputEl}
        bind:value={input}
        class="field"
        lang="ru"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        enterkeyhint="done"
        readonly={answered}
        aria-label="Ta réponse en russe"
      />
      {#if verdict?.kind === 'latin'}
        <p class="hint" role="alert">Passe ton clavier en russe (touche globe ou espace).</p>
      {/if}
      {#if !answered}
        <div class="row">
          <button type="button" class="quiet" onclick={skip}>Je ne sais pas</button>
          <button type="submit" class="primary small" disabled={!input.trim()}>Valider</button>
        </div>
      {/if}
    </form>
  {:else if spec.kind === 'choice'}
    <div class="prompt">
      {#if spec.prompt}<p class="text {spec.promptLang}" lang={spec.promptLang}>{spec.prompt}</p>{/if}
      {#if spec.audio && (spec.listenFirst || answered)}<AudioButton ru={spec.audio} size={spec.listenFirst ? 'big' : 'normal'} />{/if}
    </div>
    <ul class="options">
      {#each spec.options as opt, i (i)}
        <li>
          <button
            class="opt {spec.optionsLang}"
            class:right={answered && i === spec.answer}
            class:picked={answered && i === chosen && i !== spec.answer}
            lang={spec.optionsLang}
            disabled={answered}
            onclick={() => choose(i)}>{opt}</button
          >
        </li>
      {/each}
    </ul>
    {#if !answered}<button class="quiet" onclick={skip}>Je ne sais pas</button>{/if}
  {:else if spec.kind === 'reply'}
    <div class="thread">
      {#each spec.thread as m, i (i)}
        <p class="bubble" lang="ru"><span class="who">{app.pack?.characters[m.from]?.name ?? m.from}</span>{m.ru}</p>
      {/each}
    </div>
    <ul class="options">
      {#each spec.options as opt, i (i)}
        <li>
          <button
            class="opt ru"
            class:right={answered && i === spec.answer}
            class:picked={answered && i === chosen && i !== spec.answer}
            lang="ru"
            disabled={answered}
            onclick={() => choose(i)}>{opt}</button
          >
        </li>
      {/each}
    </ul>
  {:else if spec.kind === 'order'}
    {#if spec.fr}<p class="text fr">{spec.fr}</p>{/if}
    <div class="line" lang="ru" aria-label="Ta phrase">
      {#each built as wi, k (k)}
        <button class="tile placed" disabled={answered} onclick={() => (built = built.filter((_, j) => j !== k))}
          >{spec.words[wi]}</button
        >
      {/each}
    </div>
    <div class="tiles" lang="ru">
      {#each spec.words as w, i (i)}
        <button class="tile" disabled={answered || built.includes(i)} onclick={() => (built = [...built, i])}>{w}</button>
      {/each}
    </div>
    {#if !answered}
      <div class="row">
        <button class="quiet" onclick={skip}>Je ne sais pas</button>
        <button class="primary small" disabled={built.length !== spec.words.length} onclick={submitOrder}>Valider</button>
      </div>
    {/if}
  {:else if spec.kind === 'speak'}
    <div class="prompt">
      <p class="text ru" lang="ru">{spec.ru}</p>
      <AudioButton ru={spec.ru} label="Écouter le modèle" />
    </div>
    {#if spec.fr}<p class="sub">{spec.fr}</p>{/if}
    {#if heard && !answered}
      <p class="heard" lang="ru">
        {#each heard as h, i (i)}<span class:miss={!h.ok}>{h.word}</span>{/each}
      </p>
      <p class="hint">Les mots soulignés n'ont pas été reconnus. Écoute le modèle et réessaie.</p>
    {/if}
    {#if !answered}
      {#if speechFailed}
        <p class="hint">La reconnaissance vocale n'est pas disponible. Dis la phrase, puis évalue-toi.</p>
        <div class="row">
          <button class="quiet" onclick={() => settle({ kind: 'wrong', expected: spec.ru })}>À revoir</button>
          <button class="primary small" onclick={() => settle({ kind: 'self', expected: spec.ru })}>Réussi</button>
        </div>
      {:else}
        <button class="mic" class:on={listening} onclick={speak} aria-label="Parler">
          <Icon name="mic" size={30} />
        </button>
        <p class="mic-label">{listening ? 'Je t’écoute…' : heard ? 'Réessayer' : 'Appuie et parle'}</p>
        <button class="quiet" onclick={skip}>Passer</button>
      {/if}
    {/if}
  {:else if spec.kind === 'shadow'}
    <div class="prompt">
      <p class="text ru" lang="ru">{spec.ru}</p>
      <AudioButton ru={spec.ru} size="big" />
    </div>
    {#if spec.fr}<p class="sub">{spec.fr}</p>{/if}
    {#if !answered}
      <p class="hint">Écoute, puis rejoue l'audio en parlant en même temps. Plusieurs fois si tu veux.</p>
      <div class="row end">
        <button class="primary small" onclick={() => settle({ kind: 'self', expected: spec.ru })}>J'ai répété</button>
      </div>
    {/if}
  {/if}

  {#if answered && verdict && spec.kind !== 'shadow'}
    <Feedback {verdict} {reveal} {meaning} {audioRu} input={spec.kind === 'type' ? input : ''} {flagId} {day} />
  {/if}

  {#if answered}
    <div class="dock">
      <button bind:this={nextEl} class="primary" onclick={next}>Suivant</button>
    </div>
  {/if}
</div>

<style>
  .ex {
    display: flex;
    flex-direction: column;
    flex: 1;
  }
  .instruction {
    margin: 8px 0 12px;
    font-size: var(--s-14);
    color: var(--graphite);
  }
  .prompt {
    display: flex;
    align-items: center;
    gap: 14px;
    min-height: 44px;
  }
  .text {
    flex: 1;
    margin: 0;
    line-height: 1.35;
  }
  .text.ru {
    font-size: var(--s-28);
    font-weight: 600;
    color: var(--text);
  }
  .text.fr {
    font-size: var(--s-21);
    color: var(--text);
  }
  .sub {
    margin: 6px 0 0;
    color: var(--graphite);
  }
  form {
    margin-top: 16px;
  }
  .field {
    width: 100%;
    min-height: 56px;
    padding: 8px 2px;
    border: 0;
    border-bottom: 2px solid var(--ink);
    border-radius: 0;
    background: transparent;
    color: var(--text);
    font: 600 var(--s-21) var(--font);
    outline: none;
  }
  .field:focus-visible {
    outline: none;
    border-bottom-color: var(--margin);
  }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 12px;
  }
  .row.end {
    justify-content: flex-end;
  }
  .primary.small {
    width: auto;
    min-width: 132px;
    padding: 0 22px;
  }
  .hint {
    margin: 10px 0 0;
    color: var(--graphite);
    font-size: var(--s-14);
  }
  .options {
    list-style: none;
    margin: 16px 0 4px;
    padding: 0;
    border-top: 1px solid var(--rule);
  }
  .opt {
    display: block;
    width: 100%;
    min-height: var(--line);
    padding: 8px 4px;
    border: 0;
    border-bottom: 1px solid var(--rule);
    background: none;
    text-align: left;
    font-size: var(--s-17);
    color: var(--text);
    cursor: pointer;
  }
  .opt.ru {
    font-size: var(--s-21);
    font-weight: 600;
  }
  .opt:disabled {
    cursor: default;
    color: var(--graphite);
  }
  .opt.right {
    color: var(--ok);
    font-weight: 700;
  }
  .opt.picked {
    color: var(--margin);
    text-decoration: line-through;
  }
  .thread {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .bubble {
    align-self: flex-start;
    max-width: 85%;
    margin: 0;
    padding: 8px 12px;
    border-radius: 14px 14px 14px 4px;
    background: var(--paper-raised);
    border: 1px solid var(--rule);
    font-size: var(--s-17);
  }
  .who {
    display: block;
    font-size: var(--s-14);
    color: var(--graphite);
  }
  .line {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    min-height: 56px;
    margin: 16px 0;
    padding: 8px 0;
    border-bottom: 2px solid var(--ink);
  }
  .tiles {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .tile {
    min-height: 44px;
    padding: 6px 14px;
    border: 1px solid var(--rule);
    border-radius: 8px;
    background: var(--paper-raised);
    color: var(--text);
    font-size: var(--s-17);
    font-weight: 600;
    cursor: pointer;
  }
  .tile:disabled:not(.placed) {
    visibility: hidden;
  }
  .tile.placed {
    border-color: var(--ink);
    color: var(--ink);
  }
  .heard {
    display: flex;
    flex-wrap: wrap;
    gap: 0 0.3em;
    margin: 14px 0 0;
    font-size: var(--s-21);
  }
  .heard .miss {
    color: var(--margin);
    text-decoration: underline wavy var(--margin) 1px;
    text-underline-offset: 4px;
  }
  .mic {
    display: grid;
    place-items: center;
    width: 84px;
    height: 84px;
    margin: 28px auto 6px;
    border: 0;
    border-radius: 50%;
    background: var(--ink);
    color: var(--on-ink);
    cursor: pointer;
  }
  .mic.on {
    background: var(--margin);
  }
  .mic-label {
    margin: 0 0 4px;
    text-align: center;
    color: var(--graphite);
  }
  .ex > .quiet {
    align-self: flex-start;
  }
</style>
