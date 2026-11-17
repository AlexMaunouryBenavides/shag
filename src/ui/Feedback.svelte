<script lang="ts">
  // Retour après une réponse : juste (encre), presque (correction au stylo rouge), faux.
  import { app } from '../lib/app.svelte'
  import type { Verdict } from '../lib/engine/answer'
  import { teacherFix } from '../lib/engine/specs'
  import { addFlag } from '../lib/flags'
  import AudioButton from './AudioButton.svelte'
  import Icon from './Icon.svelte'

  let {
    verdict,
    reveal,
    meaning,
    audioRu,
    input = '',
    flagId,
    day,
  }: {
    verdict: Verdict | { kind: 'self' | 'skipped'; expected: string }
    /** forme russe correcte affichée */
    reveal: string
    /** sens (choix en français) affiché sous la forme russe */
    meaning?: string
    /** texte dont on propose l'audio (par défaut : reveal) */
    audioRu?: string
    input?: string
    flagId: string
    day: number
  } = $props()

  let flagged = $state(false)
  async function flag() {
    if (!app.db || flagged) return
    await addFlag(app.db, flagId, day, `attendu : ${reveal}${input ? ` · saisi : ${input}` : ''}`)
    flagged = true
  }
  const segments = $derived(verdict.kind === 'almost' ? teacherFix(verdict.expected, input) : [])
</script>

<div class="fb {verdict.kind}" role="status">
  <p class="head">
    {#if verdict.kind === 'correct'}<Icon name="check" size={20} /> Juste
    {:else if verdict.kind === 'almost'}Presque
    {:else if verdict.kind === 'skipped'}La réponse
    {:else if verdict.kind === 'self'}Modèle
    {:else}Pas tout à fait{/if}
  </p>
  <div class="answer">
    <p class="ru" lang="ru">
      {#if verdict.kind === 'almost'}
        {#each segments as s, i (i)}{#if s.fix}{#if s.fix.wrong}<span class="fix"
                ><s class="struck">{s.fix.wrong}</s><span class="above" aria-label="correction">{s.text}</span></span
              >{:else}<span class="inserted">{s.text}</span>{/if}{:else}{s.text}{/if}{/each}
      {:else}
        {reveal}
      {/if}
    </p>
    <AudioButton ru={audioRu ?? reveal} />
  </div>
  {#if meaning}<p class="meaning">{meaning}</p>{/if}
  {#if input && verdict.kind !== 'correct'}
    <p class="typed">Tu as écrit : <span lang="ru">{input}</span></p>
  {/if}
  <button class="flag" onclick={flag} disabled={flagged}>
    <Icon name="flag" size={16} />
    {flagged ? 'Erreur signalée' : 'Signaler une erreur'}
  </button>
</div>

<style>
  .fb {
    margin-top: 20px;
    padding: 14px 0 0;
    border-top: 2px solid var(--rule);
  }
  .correct {
    border-top-color: var(--ok);
  }
  .almost {
    border-top-color: var(--almost);
  }
  .wrong,
  .skipped {
    border-top-color: var(--margin);
  }
  .head {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0 0 6px;
    font-weight: 600;
    font-size: var(--s-17);
  }
  .correct .head {
    color: var(--ok);
  }
  .almost .head {
    color: var(--almost);
  }
  .wrong .head,
  .skipped .head {
    color: var(--margin);
  }
  .answer {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .ru {
    flex: 1;
    margin: 0;
    padding-top: 0.5em;
    font-size: var(--s-21);
    font-weight: 600;
    line-height: 1.6;
    color: var(--text);
  }
  /* Correction au stylo rouge : la lettre fautive est barrée, la bonne est écrite au-dessus. */
  .fix {
    position: relative;
    display: inline-block;
  }
  .struck {
    color: var(--graphite);
    text-decoration: line-through 2px var(--margin);
  }
  .above {
    position: absolute;
    left: 50%;
    bottom: 78%;
    transform: translateX(-50%);
    font-size: 0.8em;
    color: var(--margin);
    white-space: nowrap;
  }
  .inserted {
    color: var(--margin);
    text-decoration: underline wavy var(--margin) 1px;
    text-underline-offset: 4px;
  }
  .meaning {
    margin: 2px 0 0;
    font-size: var(--s-17);
    color: var(--graphite);
  }
  .typed {
    margin: 10px 0 0;
    color: var(--graphite);
    font-size: var(--s-14);
  }
  .flag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 10px;
    min-height: 44px;
    padding: 0;
    border: 0;
    background: none;
    color: var(--graphite);
    font-size: var(--s-14);
    cursor: pointer;
  }
</style>
