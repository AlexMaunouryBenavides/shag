// Spike 1.6 — rendu de l'accent tonique combinant (U+0301) selon la police.
import '@fontsource/noto-sans/cyrillic-400.css'
import '@fontsource/noto-sans/latin-400.css'
import '@fontsource/pt-sans/cyrillic-400.css'
import '@fontsource/pt-sans/latin-400.css'

const FONTS = ['Noto Sans', 'PT Sans', 'system-ui']
const A = '́'
const SMALL = `Приве${A}т! Как дела${A}? Я хочу${A} ко${A}фе, пожа${A}луйста.`
const MEDIUM = `молоко${A} · во${A}ду · Москва${A} · ёж · ты · щи${A}`
const LARGE = `А${A}а${A} О${A}о${A} У${A}у${A} Ы${A}ы${A} И${A}и${A} Е${A}е${A} Я${A}я${A} Ю${A}ю${A}`

const root = document.getElementById('root')!
for (const font of FONTS) {
  const section = document.createElement('section')
  section.style.fontFamily = `'${font}', sans-serif`
  section.innerHTML = `<h2>${font}</h2>
    <div class="s">${SMALL}</div>
    <div class="m">${MEDIUM}</div>
    <div class="l">${LARGE}</div>`
  root.append(section)
}
