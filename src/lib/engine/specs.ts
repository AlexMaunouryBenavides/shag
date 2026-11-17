// Conversion des exercices du paquet et des cartes SRS en « fiches d'exercice » affichables.
import type { Exercise, Item, Pack } from '../content/types'
import { normalize } from './answer'
import type { Format } from './srs'

export type Lang = 'fr' | 'ru'

export type Spec =
  | {
      kind: 'type'
      instruction: string
      prompt: string
      promptLang: Lang
      answers: string[]
      /** texte russe joué après la réponse (forme correcte complète) */
      reveal: string
      /** audio joué avant de répondre (dictée) */
      listenFirst?: boolean
    }
  | {
      kind: 'choice'
      instruction: string
      prompt: string
      promptLang: Lang
      options: string[]
      optionsLang: Lang
      answer: number
      /** texte russe à faire écouter (avant pour une écoute, après sinon) */
      audio?: string
      listenFirst?: boolean
      reveal?: string
    }
  | { kind: 'order'; instruction: string; ru: string; fr?: string; words: string[] }
  | { kind: 'speak'; instruction: string; ru: string; fr?: string }
  | { kind: 'shadow'; instruction: string; ru: string; fr?: string }
  | {
      kind: 'reply'
      instruction: string
      thread: { from: string; ru: string }[]
      options: string[]
      answer: number
    }

/** Variantes acceptées d'un élément en production : « хочу / хочешь » → [хочу]. */
export function itemAnswers(item: Item): string[] {
  if (item.answers?.length) return item.answers
  return [item.ru.split(' / ')[0]]
}

function seeded(seed: string): () => number {
  let h = 2166136261
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

export function shuffle<T>(xs: T[], seed: string): T[] {
  const r = seeded(seed)
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Options à choix multiple : la bonne réponse + jusqu'à 3 distracteurs distincts. */
export function withDistractors(correct: string, pool: string[], seed: string): { options: string[]; answer: number } {
  const distinct = [...new Set(pool.filter((p) => normalize(p) !== normalize(correct)))]
  const options = shuffle([...shuffle(distinct, seed).slice(0, 3), correct], `${seed}:o`)
  return { options, answer: options.indexOf(correct) }
}

/** Mots d'une phrase pour l'exercice de remise en ordre (ponctuation retirée, mélangés). */
export function orderWords(ru: string, seed: string): string[] {
  const words = ru.split(/\s+/).map((w) => w.replace(/[.,!?;:«»…]/g, '')).filter(Boolean)
  let mixed = shuffle(words, seed)
  if (words.length > 1 && mixed.join(' ') === words.join(' ')) mixed = [...words].reverse()
  return mixed
}

export function exerciseSpec(ex: Exercise, seed: string): Spec {
  switch (ex.t) {
    case 'translate':
      return {
        kind: 'type',
        instruction: 'Traduis',
        prompt: ex.fr,
        promptLang: 'fr',
        answers: ex.answers,
        reveal: ex.answers[0],
      }
    case 'cloze':
      return {
        kind: 'type',
        instruction: ex.fr ? `Complète : ${ex.fr}` : 'Complète',
        prompt: ex.ru,
        promptLang: 'ru',
        answers: ex.answers,
        reveal: ex.ru.replace('___', ex.answers[0]),
      }
    case 'copy':
      return {
        kind: 'type',
        instruction: `Tape en russe : ${ex.fr}`,
        prompt: ex.ru,
        promptLang: 'ru',
        answers: [ex.ru],
        reveal: ex.ru,
      }
    case 'read':
      return {
        kind: 'choice',
        instruction: 'Lis. Que veut dire ce mot ?',
        prompt: ex.ru,
        promptLang: 'ru',
        options: ex.options,
        optionsLang: 'fr',
        answer: ex.answer,
        audio: ex.ru,
      }
    case 'listen':
      return {
        kind: 'choice',
        instruction:
          ex.mode === 'pick' ? "Écoute. Quel mot as-tu entendu ?" : ex.mode === 'meaning' ? 'Écoute. Que veut dire ce message ?' : 'Écoute et choisis',
        prompt: ex.mode === 'pick' ? '' : '',
        promptLang: 'ru',
        options: ex.options,
        optionsLang: ex.mode === 'pick' ? 'ru' : 'fr',
        answer: ex.answer,
        audio: ex.ru,
        listenFirst: true,
        reveal: ex.ru,
      }
    case 'order':
      return { kind: 'order', instruction: 'Remets les mots dans l’ordre', ru: ex.ru, fr: ex.fr, words: orderWords(ex.ru, seed) }
    case 'speak':
      return { kind: 'speak', instruction: 'Dis à voix haute', ru: ex.ru, fr: ex.fr }
    case 'shadow':
      return { kind: 'shadow', instruction: 'Écoute et répète en même temps', ru: ex.ru, fr: ex.fr }
    case 'reply':
      return { kind: 'reply', instruction: 'Choisis la bonne réponse', thread: ex.thread, options: ex.options, answer: ex.answer }
  }
}

/** Fiche d'exercice d'une carte SRS selon son format. */
export function cardSpec(item: Item, format: Format, pack: Pack, seed: string): Spec {
  const pool = Object.values(pack.items).filter((it) => it.kind === item.kind && it.id !== item.id)
  if (item.kind === 'letter') {
    const letterPool = Object.values(pack.items).filter((it) => it.kind === 'letter' && it.id !== item.id)
    if (format === 'recognition') {
      const { options, answer } = withDistractors(item.fr, letterPool.map((l) => l.fr), seed)
      return {
        kind: 'choice',
        instruction: 'Quel son fait cette lettre ?',
        prompt: item.ru,
        promptLang: 'ru',
        options,
        optionsLang: 'fr',
        answer,
        reveal: item.ru,
        audio: item.example?.ru,
      }
    }
    const { options, answer } = withDistractors(item.ru, letterPool.map((l) => l.ru), seed)
    return {
      kind: 'choice',
      instruction: `Quelle lettre fait le son ${item.fr} ?`,
      prompt: item.hint ?? item.fr,
      promptLang: 'fr',
      options,
      optionsLang: 'ru',
      answer,
      reveal: item.ru,
      audio: item.example?.ru,
    }
  }
  if (format === 'recognition') {
    const { options, answer } = withDistractors(item.fr, pool.map((p) => p.fr), seed)
    return {
      kind: 'choice',
      instruction: 'Que veut dire… ?',
      prompt: item.ru,
      promptLang: 'ru',
      options,
      optionsLang: 'fr',
      answer,
      audio: item.ru,
      reveal: item.ru,
    }
  }
  if (format === 'context' && item.cloze) {
    return {
      kind: 'type',
      instruction: item.example ? `Complète : ${item.example.fr}` : 'Complète',
      prompt: item.cloze.ru,
      promptLang: 'ru',
      answers: [item.cloze.answer],
      reveal: item.cloze.ru.replace('___', item.cloze.answer),
    }
  }
  return {
    kind: 'type',
    instruction: 'En russe ?',
    prompt: item.fr,
    promptLang: 'fr',
    answers: itemAnswers(item),
    reveal: item.ru,
  }
}

/**
 * Correction « au stylo rouge » d'une réponse presque juste : découpe la forme attendue
 * (accentuée) en segments, en marquant la lettre à corriger et la lettre tapée à sa place.
 */
export function teacherFix(expected: string, input: string): { text: string; fix?: { wrong: string } }[] {
  const exp = [...expected]
  // flux normalisé de la réponse attendue, avec l'index du caractère d'origine
  const stream: { c: string; i: number }[] = []
  exp.forEach((ch, i) => {
    if (ch === '́') return
    const n = normalize(ch)
    if (n.length === 1 && /[а-яa-z0-9]/.test(n)) stream.push({ c: n, i })
  })
  const got = [...normalize(input).replace(/ /g, '')]
  let k = 0
  while (k < stream.length && k < got.length && stream[k].c === got[k]) k++
  if (k >= stream.length) return [{ text: expected }]
  const at = stream[k].i
  const substitution = got.length === stream.length
  let end = at + 1
  if (exp[end] === '́') end++
  return [
    { text: exp.slice(0, at).join('') },
    { text: exp.slice(at, end).join(''), fix: { wrong: substitution ? got[k] : '' } },
    { text: exp.slice(end).join('') },
  ].filter((s) => s.text || s.fix)
}
