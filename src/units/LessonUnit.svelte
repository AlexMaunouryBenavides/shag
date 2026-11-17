<script lang="ts">
  // Unité Leçon (dialogue) : les messages apparaissent un par un au tap ; Fluidité : dialogue
  // déjà vu affiché en entier, sans aide par défaut.
  import { onMount } from 'svelte'
  import { app } from '../lib/app.svelte'
  import { play, playToEnd } from '../lib/audio'
  import { dayOf } from '../lib/engine/plan'
  import Dialogue from '../ui/Dialogue.svelte'

  let {
    day: _day,
    dialogueDay,
    fluency = false,
    cursor,
    onprogress,
    oncursor,
    onfinish,
  }: {
    day: number
    dialogueDay: number
    fluency?: boolean
    cursor: { shown: number } | null
    onprogress: (done: number, total: number) => void
    oncursor: (c: unknown) => void
    onfinish: () => void
  } = $props()

  const source = $derived(dayOf(app.pack!, dialogueDay))
  const messages = $derived(source?.dialogue?.messages ?? [])
  // svelte-ignore state_referenced_locally
  let shown = $state(fluency ? Number.MAX_SAFE_INTEGER : (cursor?.shown ?? 1))
  // svelte-ignore state_referenced_locally
  let help = $state(!fluency)
  const all = $derived(shown >= messages.length)

  $effect(() => onprogress(Math.min(shown, messages.length), messages.length || 1))

  onMount(() => {
    if (!messages.length) onfinish()
    else if (!fluency && app.mode === 'audio') void play(app.pack!, messages[0].ru)
  })

  function more() {
    shown += 1
    oncursor({ shown })
    if (app.mode === 'audio' && messages[shown - 1]) void play(app.pack!, messages[shown - 1].ru)
    queueMicrotask(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }))
  }

  async function playAll() {
    for (const m of messages) {
      await playToEnd(app.pack!, m.ru)
      await new Promise((r) => setTimeout(r, 500))
    }
  }
</script>

{#if fluency}
  <p class="intro">Relis ce dialogue à ton rythme, en entier, sans t'arrêter sur les mots.</p>
{:else if source?.theme}
  <p class="intro">Tape sur un mot pour sa traduction. Les mots nouveaux sont soulignés.</p>
{/if}

<Dialogue {messages} day={dialogueDay} {shown} highlightNew={!fluency} showHelp={help} />

<div class="dock">
  {#if !all}
    <button class="primary" onclick={more}>Message suivant</button>
  {:else}
    {#if fluency}
      <div class="row">
        {#if !help}<button class="quiet" onclick={() => (help = true)}>Afficher l'aide</button>{/if}
        {#if app.mode === 'audio'}<button class="quiet" onclick={playAll}>Tout écouter</button>{/if}
      </div>
    {/if}
    <button class="primary" onclick={onfinish}>{fluency ? "J'ai relu" : 'Terminer le dialogue'}</button>
  {/if}
</div>

<style>
  .intro {
    margin: 8px 0 0;
    font-size: var(--s-14);
    color: var(--graphite);
  }
  .row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
  }
</style>
