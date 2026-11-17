<script lang="ts">
  // Bouton audio : un tap = écouter, appui long = écouter lentement (0,75×).
  import { app } from '../lib/app.svelte'
  import { play } from '../lib/audio'
  import Icon from './Icon.svelte'

  let { ru, label = 'Écouter', size = 'normal' }: { ru: string; label?: string; size?: 'normal' | 'big' } = $props()
  const available = $derived(Boolean(app.pack?.audio[ru]))
  let timer: ReturnType<typeof setTimeout> | null = null
  let longPressed = false

  function down() {
    longPressed = false
    timer = setTimeout(() => {
      longPressed = true
      if (app.pack) void play(app.pack, ru, true)
    }, 450)
  }
  function up() {
    if (timer) clearTimeout(timer)
    if (!longPressed && app.pack) void play(app.pack, ru)
  }
</script>

{#if available}
  <button
    class="audio {size}"
    aria-label="{label} (appui long : lentement)"
    onpointerdown={down}
    onpointerup={up}
    onpointerleave={() => timer && clearTimeout(timer)}
    oncontextmenu={(e) => e.preventDefault()}
    onkeydown={(e) => e.key === 'Enter' && app.pack && play(app.pack, ru)}
  >
    <Icon name="sound" size={size === 'big' ? 32 : 22} />
  </button>
{/if}

<style>
  .audio {
    display: inline-grid;
    place-items: center;
    flex: none;
    width: 44px;
    height: 44px;
    border: 1px solid var(--rule);
    border-radius: 50%;
    background: var(--paper-raised);
    color: var(--ink);
    cursor: pointer;
    touch-action: manipulation;
    user-select: none;
    -webkit-user-select: none;
  }
  .big {
    width: 72px;
    height: 72px;
  }
</style>
