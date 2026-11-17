<script lang="ts">
  // Fiche mot (tap sur un mot d'un dialogue) : forme accentuée, forme de base, traduction,
  // transcription jusqu'au jour 30, audio, signalement ⚑.
  import { app } from '../lib/app.svelte'
  import type { Item } from '../lib/content/types'
  import { addFlag } from '../lib/flags'
  import AudioButton from './AudioButton.svelte'
  import Icon from './Icon.svelte'

  let { word, item, day, onclose }: { word: string; item: Item | null; day: number; onclose: () => void } = $props()
  let flagged = $state(false)
  const clean = $derived(word.replace(/[.,!?;:«»…]/g, ''))

  async function flag() {
    if (!app.db || flagged) return
    await addFlag(app.db, item?.id ?? `mot:${clean}`, day, `fiche mot : ${clean}`)
    flagged = true
  }
</script>

<div class="scrim" role="presentation" onclick={onclose}></div>
<div class="sheet" role="dialog" aria-modal="true" aria-label="Fiche du mot {clean}">
  <div class="top">
    <p class="w" lang="ru">{clean}</p>
    <AudioButton ru={item && app.pack?.audio[item.ru] ? item.ru : clean} />
    <button class="icon-btn" aria-label="Fermer" onclick={onclose}><Icon name="close" /></button>
  </div>
  {#if item}
    {#if item.ru.replace(/́/g, '').toLowerCase() !== clean.replace(/́/g, '').toLowerCase()}
      <p class="base">forme de base : <span lang="ru">{item.ru}</span></p>
    {/if}
    {#if day <= 30 && item.translit}<p class="tr">{item.translit}</p>{/if}
    <p class="fr">{item.fr}{#if item.note}<span class="note"> ({item.note})</span>{/if}</p>
  {:else}
    <p class="fr muted">Nom propre ou mot expliqué dans le dialogue.</p>
  {/if}
  <button class="flag" onclick={flag} disabled={flagged}>
    <Icon name="flag" size={16} />{flagged ? 'Erreur signalée' : 'Signaler une erreur'}
  </button>
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 10;
    background: rgb(0 0 0 / 0.25);
  }
  .sheet {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 11;
    padding: 12px 16px calc(16px + env(safe-area-inset-bottom)) calc(var(--margin-x) + var(--gutter));
    border-radius: 16px 16px 0 0;
    background: var(--paper-raised);
    box-shadow: 0 -2px 16px rgb(0 0 0 / 0.15);
  }
  .top {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .w {
    flex: 1;
    margin: 0;
    font-size: var(--s-28);
    font-weight: 700;
  }
  .base,
  .tr {
    margin: 6px 0 0;
    color: var(--graphite);
  }
  .fr {
    margin: 10px 0 0;
    font-size: var(--s-21);
  }
  .muted {
    color: var(--graphite);
    font-size: var(--s-17);
  }
  .note {
    color: var(--graphite);
    font-size: var(--s-17);
  }
  .flag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 12px;
    min-height: 44px;
    padding: 0;
    border: 0;
    background: none;
    color: var(--graphite);
    font-size: var(--s-14);
    cursor: pointer;
  }
</style>
