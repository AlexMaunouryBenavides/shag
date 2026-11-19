import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import { initPwa } from './lib/pwa'
import { app as state } from './lib/app.svelte'

const app = mount(App, {
  target: document.getElementById('app')!,
})

// Une mise à jour n'est appliquée (rechargement) que hors d'une unité en cours.
initPwa(() => state.route.name !== 'unit' && state.route.name !== 'replay' && state.route.name !== 'extra')

export default app
