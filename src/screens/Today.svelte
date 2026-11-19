<script lang="ts">
  import { app } from '../lib/app.svelte'
  import { UNIT_LABELS } from '../lib/content/types'
  import { startNextDay } from '../lib/engine/plan'
  import Icon from '../ui/Icon.svelte'

  const today = $derived(app.today)
  const dayNumber = $derived(today && today.kind !== 'waiting' ? today.day.day : null)
  const theme = $derived(
    today?.kind === 'waiting' ? 'La suite arrive bientôt' : today ? today.day.theme : '',
  )
  const total = $derived(today?.kind === 'day' ? today.units.length : 0)
  const done = $derived(today?.kind === 'day' ? today.done : today?.kind === 'finished' ? 1 : 0)
  const ratio = $derived(today?.kind === 'finished' ? 1 : total ? done / total : 0)

  function minutes(type: string): string {
    return type === 'speak-words' || type === 'speak' ? '2 min' : '3 min'
  }

  function next() {
    if (today?.kind === 'day' && today.next !== null) app.go({ name: 'unit', day: today.day.day, index: today.next })
    if (today?.kind === 'waiting') app.go({ name: 'extra' })
  }

  async function nextDay() {
    if (app.db && app.pack && (await startNextDay(app.db, app.pack))) await app.refresh()
  }
</script>

<main class="page">
  <header class="bar">
    <button class="icon-btn" aria-label="Plan" onclick={() => app.go({ name: 'plan' })}>
      <Icon name="plan" />
    </button>
    <span class="spacer"></span>
    <button
      class="icon-btn mode"
      aria-pressed={app.mode === 'audio'}
      aria-label={app.mode === 'audio' ? 'Son activé (passer en silencieux)' : 'Mode silencieux (activer le son)'}
      onclick={() => app.setMode(app.mode === 'audio' ? 'silent' : 'audio')}
    >
      <Icon name={app.mode === 'audio' ? 'sound' : 'mute'} />
    </button>
    <button class="icon-btn" aria-label="Réglages" onclick={() => app.go({ name: 'settings' })}>
      <Icon name="settings" />
    </button>
  </header>

  {#if today}
    <section class="head">
      {#if dayNumber !== null}
        <span class="date" aria-label="Jour {dayNumber}">{dayNumber}</span>
      {/if}
      <p class="kicker">{dayNumber !== null ? `Jour ${dayNumber}` : 'Programme publié terminé'}</p>
      <h1>{theme}</h1>
      {#if today.kind !== 'waiting'}
        <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax={total || 1} aria-valuenow={done}>
          <span class="track"><span class="fill" style:width="{ratio * 100}%"></span></span>
          <span class="count">{today.kind === 'finished' ? 'fait' : `${done} / ${total}`}</span>
        </div>
      {/if}
    </section>

    {#if today.kind === 'day'}
      <ol class="units">
        {#each today.units as u (u.index)}
          <li class:done={u.status === 'done'} class:next={u.index === today.next}>
            <span class="mark" aria-hidden="true">
              {#if u.status === 'done'}<Icon name="check" size={20} />{/if}
            </span>
            <span class="label">
              {UNIT_LABELS[u.unit.type]}
              {#if u.unit.audio}<span class="audio-tag" aria-label="(audio)"><Icon name="sound" size={16} /></span>{/if}
            </span>
            {#if u.index === today.next}<span class="dur">{minutes(u.unit.type)}</span>{/if}
            <span class="sr">{u.status === 'done' ? 'faite' : u.status === 'in_progress' ? 'commencée' : 'à faire'}</span>
          </li>
        {/each}
      </ol>
      <div class="dock">
        {#if today.next !== null}
          <button class="primary" onclick={next}>Continuer</button>
        {:else if today.audioLeft > 0}
          <p class="note">
            Il reste {today.audioLeft} unité{today.audioLeft > 1 ? 's' : ''} audio pour plus tard.
          </p>
          <button class="quiet" onclick={() => app.setMode('audio')}>Activer le son</button>
        {/if}
      </div>
    {:else if today.kind === 'finished'}
      <section class="finished">
        <p class="big">Journée terminée.<br />À demain.</p>
        {#if today.nextTheme}<p class="tomorrow">Demain : {today.nextTheme}</p>{/if}
      </section>
      <p class="again">Refaire une unité</p>
      <ol class="units">
        {#each today.day.units as unit, index (index)}
          <li class="done">
            <span class="mark" aria-hidden="true"><Icon name="check" size={20} /></span>
            <button class="replay" onclick={() => app.go({ name: 'replay', day: today.day.day, index })}>
              <span class="label">
                {UNIT_LABELS[unit.type]}
                {#if unit.audio}<span class="audio-tag" aria-label="(audio)"><Icon name="sound" size={16} /></span>{/if}
              </span>
            </button>
          </li>
        {/each}
      </ol>
      <div class="dock links">
        {#if today.secondary === 'extra-review'}
          <button class="quiet" onclick={() => app.go({ name: 'extra' })}>Révisions supplémentaires</button>
        {:else if today.secondary === 'next-day'}
          <button class="quiet" onclick={nextDay}>Commencer le jour suivant</button>
        {/if}
        {#if app.backupReminder}
          <button class="quiet" onclick={() => app.go({ name: 'settings' })}>Sauvegarder ma progression</button>
        {/if}
      </div>
    {:else}
      <section class="finished">
        <p class="big">Tu as terminé tous les jours publiés.</p>
        <p class="tomorrow">En attendant la suite : révisions et relecture.</p>
      </section>
      <div class="dock"><button class="primary" onclick={next}>Continuer</button></div>
    {/if}
  {/if}
</main>

<style>
  .bar {
    display: flex;
    align-items: center;
    gap: 4px;
    height: 56px;
    margin-left: calc(-1 * var(--margin-x) - var(--gutter) + 4px);
  }
  .spacer {
    flex: 1;
  }
  .mode[aria-pressed='true'] {
    color: var(--ink);
  }

  .head {
    position: relative;
    padding: 20px 0 24px;
  }
  /* Le numéro du jour est écrit dans la marge, comme la date d'une page de cahier. */
  .date {
    position: absolute;
    right: calc(100% + var(--gutter) + 10px);
    top: 14px;
    font-size: 2.125rem;
    font-weight: 700;
    line-height: 1;
    color: var(--margin);
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
  }
  .kicker {
    margin: 0;
    font-size: var(--s-14);
    color: var(--graphite);
  }
  h1 {
    margin: 2px 0 18px;
    font-size: var(--s-28);
    line-height: 1.2;
    font-weight: 700;
    color: var(--text);
  }
  .progress {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .track {
    flex: 1;
    height: 4px;
    border-radius: 2px;
    background: var(--rule);
    overflow: hidden;
  }
  .fill {
    display: block;
    height: 100%;
    background: var(--ink);
    transition: width 0.4s ease;
  }
  .count {
    font-size: var(--s-14);
    color: var(--graphite);
    font-variant-numeric: tabular-nums;
    min-width: 3.2em;
    text-align: right;
  }

  .units {
    list-style: none;
    margin: 0;
    padding: 0;
    border-top: 1px solid var(--rule);
  }
  .units li {
    position: relative;
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: var(--line);
    border-bottom: 1px solid var(--rule);
    font-size: var(--s-17);
    color: var(--text);
  }
  .units li.done {
    color: var(--graphite);
  }
  .units li.next {
    font-weight: 600;
    color: var(--ink);
  }
  .units li.next::after {
    content: '';
    position: absolute;
    left: calc(-1 * var(--gutter) - 1px);
    top: 14px;
    bottom: 14px;
    width: 4px;
    border-radius: 2px;
    background: var(--ink);
  }
  /* Les coches sont portées dans la marge, comme une correction. */
  .mark {
    position: absolute;
    right: calc(100% + var(--gutter) + 12px);
    display: grid;
    color: var(--margin);
  }
  .label {
    flex: 1;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .audio-tag {
    display: inline-grid;
    color: var(--graphite);
  }
  .dur {
    font-size: var(--s-14);
    font-weight: 400;
    color: var(--graphite);
  }
  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }

  .note {
    margin: 0 0 4px;
    color: var(--graphite);
  }

  .finished {
    padding: 32px 0;
  }
  .big {
    margin: 0;
    font-size: var(--s-28);
    line-height: 1.25;
    font-weight: 600;
    color: var(--ink);
  }
  .tomorrow {
    margin: 16px 0 0;
    font-size: var(--s-17);
    color: var(--graphite);
  }
  .again {
    margin: 0 0 6px;
    font-size: var(--s-14);
    color: var(--graphite);
  }
  .replay {
    flex: 1;
    display: flex;
    align-items: center;
    min-height: var(--line);
    padding: 0;
    border: 0;
    background: none;
    font: inherit;
    color: inherit;
    text-align: left;
    cursor: pointer;
  }
  .links {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }
</style>
