<script lang="ts">
  import { app } from '../lib/app.svelte'
  import { activity, currentDay, overallProgress } from '../lib/engine/plan'
  import Icon from '../ui/Icon.svelte'

  const pack = $derived(app.pack!)
  let current = $state(1)
  let doneDays = $state(0)
  let history = $state<{ date: string; units: number }[]>([])

  $effect(() => {
    const db = app.db
    if (!db) return
    void (async () => {
      current = (await currentDay(db)).day
      doneDays = (await overallProgress(db, pack)).doneDays
      history = await activity(db, 28)
    })()
  })

  const phase = $derived(pack.phases.find((p) => p.firstDay <= current && current <= p.lastDay) ?? pack.phases[0])
  const percent = $derived(Math.round((doneDays / pack.plan.length) * 100))

  let currentRow = $state<HTMLElement | null>(null)
  $effect(() => {
    currentRow?.scrollIntoView({ block: 'center' })
  })
</script>

<main class="page">
  <header class="bar">
    <button class="icon-btn" aria-label="Retour" onclick={() => app.go({ name: 'today' })}>
      <Icon name="back" />
    </button>
    <h1>Plan</h1>
  </header>

  <section class="phase">
    <p class="kicker">Phase {phase.id}</p>
    <h2>{phase.title}</h2>
    <div class="progress">
      <span class="track"><span class="fill" style:width="{percent}%"></span></span>
      <span class="count">Jour {Math.min(current, pack.plan.length)} / {pack.plan.length}</span>
    </div>
    <ul class="goals">
      {#each phase.goals as goal (goal)}<li>{goal}</li>{/each}
    </ul>
  </section>

  <section aria-label="Activité des 4 dernières semaines" class="activity">
    {#each history as h (h.date)}
      <span class="sq" class:on={h.units > 0} class:full={h.units >= 8} title="{h.date} : {h.units} unités"></span>
    {/each}
  </section>

  <ol class="days">
    {#each pack.plan as p (p.day)}
      {#if p.day === current}
        <li class="now" bind:this={currentRow}>
          <span class="n">{p.day}</span><span class="t">{p.theme}</span>
        </li>
      {:else}
        <li class:past={p.day < current} class:unpublished={p.day > pack.lastDay}>
          {#if p.day < current}
            <span class="n mark" aria-label="Jour {p.day}, fait"><Icon name="check" size={18} /></span>
          {:else}
            <span class="n">{p.day}</span>
          {/if}
          <span class="t">{p.theme}</span>
        </li>
      {/if}
    {/each}
  </ol>
</main>

<style>
  .bar {
    position: sticky;
    top: 0;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    height: 56px;
    margin-left: calc(-1 * var(--margin-x) - var(--gutter) + 4px);
    background: var(--paper);
  }
  h1 {
    margin: 0;
    margin-left: calc(var(--margin-x) - 44px + var(--gutter) - 12px);
    font-size: var(--s-21);
    font-weight: 600;
  }
  .phase {
    padding: 16px 0 20px;
  }
  .kicker {
    margin: 0;
    font-size: var(--s-14);
    color: var(--graphite);
  }
  h2 {
    margin: 2px 0 14px;
    font-size: var(--s-28);
    line-height: 1.2;
    font-weight: 700;
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
  }
  .count {
    font-size: var(--s-14);
    color: var(--graphite);
    font-variant-numeric: tabular-nums;
  }
  .goals {
    margin: 16px 0 0;
    padding-left: 1.1em;
    color: var(--text);
  }
  .goals li {
    margin: 4px 0;
  }
  .activity {
    display: grid;
    grid-template-columns: repeat(14, 1fr);
    gap: 4px;
    max-width: 320px;
    padding: 8px 0 20px;
  }
  .sq {
    aspect-ratio: 1;
    border-radius: 3px;
    background: var(--rule);
  }
  .sq.on {
    background: color-mix(in srgb, var(--ink) 45%, var(--rule));
  }
  .sq.full {
    background: var(--ink);
  }
  .days {
    list-style: none;
    margin: 0;
    padding: 0 0 32px;
    border-top: 1px solid var(--rule);
  }
  .days li {
    position: relative;
    display: flex;
    align-items: baseline;
    padding: 12px 0;
    border-bottom: 1px solid var(--rule);
  }
  /* Numéro du jour (ou coche) dans la marge. */
  .n {
    position: absolute;
    right: calc(100% + var(--gutter) + 10px);
    top: 50%;
    transform: translateY(-50%);
    display: grid;
    font-variant-numeric: tabular-nums;
    color: var(--graphite);
    font-size: var(--s-14);
  }
  .past {
    color: var(--graphite);
  }
  .unpublished {
    opacity: 0.6;
  }
  .now {
    font-weight: 600;
    color: var(--ink);
  }
  .now .n {
    color: var(--margin);
    font-weight: 700;
  }
  .mark {
    color: var(--margin);
  }
</style>
