<script lang="ts">
  import { app } from './lib/app.svelte'
  import Plan from './screens/Plan.svelte'
  import Settings from './screens/Settings.svelte'
  import Today from './screens/Today.svelte'
  import UnitScreen from './screens/UnitScreen.svelte'

  void app.start()
</script>

{#if app.error}
  <main class="page">
    <h1 class="err">L'application n'a pas pu démarrer.</h1>
    <p>{app.error}</p>
    <button class="primary" onclick={() => location.reload()}>Recharger</button>
  </main>
{:else if !app.pack || !app.today}
  <main class="page" aria-busy="true"></main>
{:else if app.route.name === 'plan'}
  <Plan />
{:else if app.route.name === 'settings'}
  <Settings />
{:else if app.route.name === 'unit'}
  {#key `${app.route.day}-${app.route.index}`}
    <UnitScreen day={app.route.day} index={app.route.index} />
  {/key}
{:else}
  <Today />
{/if}

<style>
  .err {
    font-size: var(--s-28);
    margin: 48px 0 8px;
  }
</style>
