import { describe, expect, it } from 'vitest'
import type { Item, Pack } from '../content/types'
import { cardSpec, exerciseSpec, itemAnswers, orderWords, teacherFix, withDistractors } from './specs'

const A = '́'
const item = (id: string, ru: string, fr: string, extra: Partial<Item> = {}): Item => ({ id, day: 1, kind: 'word', ru, fr, ...extra })
const PACK = {
  items: {
    voda: item('voda', `вода${A}`, 'eau', { cloze: { ru: `Я хочу${A} ___.`, answer: `во${A}ду` }, example: { ru: `Я хочу${A} во${A}ду.`, fr: "Je veux de l'eau." } }),
    chai: item('chai', 'чай', 'thé'),
    sok: item('sok', 'сок', 'jus'),
    kofe: item('kofe', `ко${A}фе`, 'café'),
    'l-a': item('l-a', 'А а', '[a]', { kind: 'letter', hint: 'comme papa' }),
    'l-o': item('l-o', 'О о', '[o]', { kind: 'letter' }),
  },
} as unknown as Pack

describe('fiches de cartes', () => {
  it('reconnaissance : russe → sens parmi 4 options', () => {
    const s = cardSpec(PACK.items.voda, 'recognition', PACK, 'x')
    expect(s.kind).toBe('choice')
    if (s.kind === 'choice') {
      expect(s.options).toHaveLength(4)
      expect(s.options[s.answer]).toBe('eau')
      expect(s.prompt).toBe(`вода${A}`)
    }
  })
  it('production : français → russe tapé', () => {
    const s = cardSpec(PACK.items.voda, 'production', PACK, 'x')
    expect(s).toMatchObject({ kind: 'type', prompt: 'eau', answers: [`вода${A}`] })
  })
  it('contexte : phrase à trou', () => {
    const s = cardSpec(PACK.items.voda, 'context', PACK, 'x')
    expect(s).toMatchObject({ kind: 'type', prompt: `Я хочу${A} ___.`, answers: [`во${A}ду`], reveal: `Я хочу${A} во${A}ду.` })
  })
  it('lettre : son → lettre', () => {
    const s = cardSpec(PACK.items['l-a'], 'production', PACK, 'x')
    expect(s.kind === 'choice' && s.options.includes('А а')).toBe(true)
  })
})

describe('exercices du paquet', () => {
  it('traduction', () => {
    expect(exerciseSpec({ t: 'translate', fr: 'Je veux du thé.', answers: [`Я хочу${A} чай.`] }, 's')).toMatchObject({
      kind: 'type',
      reveal: `Я хочу${A} чай.`,
    })
  })
  it('écoute : l’audio est joué avant de répondre', () => {
    const s = exerciseSpec({ t: 'listen', mode: 'pick', ru: 'кот', options: ['кот', 'там'], answer: 0 }, 's')
    expect(s).toMatchObject({ kind: 'choice', listenFirst: true, optionsLang: 'ru' })
  })
})

describe('outils', () => {
  it('réponses d’une paire', () => {
    expect(itemAnswers(item('h', `хочу${A} / хо${A}чешь`, 'je veux'))).toEqual([`хочу${A}`])
  })
  it('distracteurs distincts', () => {
    const { options, answer } = withDistractors('eau', ['thé', 'thé', 'jus', 'eau', 'café', 'lait'], 'k')
    expect(new Set(options).size).toBe(4)
    expect(options[answer]).toBe('eau')
  })
  it('remise en ordre : jamais déjà dans l’ordre', () => {
    const words = orderWords(`Я хочу${A} ко${A}фе.`, 'seed')
    expect(words.sort()).toEqual([`Я`, `хочу${A}`, `ко${A}фе`].sort())
    expect(orderWords('Да нет', 'a').join(' ')).not.toBe('Да нет')
  })
})

describe('correction au stylo rouge', () => {
  it('marque la lettre substituée', () => {
    expect(teacherFix(`Я хочу${A} ко${A}фе.`, 'я хочу кафе')).toEqual([
      { text: `Я хочу${A} к` },
      { text: `о${A}`, fix: { wrong: 'а' } },
      { text: 'фе.' },
    ])
  })
  it('lettre manquante', () => {
    expect(teacherFix('кофе', 'коф')).toEqual([{ text: 'коф' }, { text: 'е', fix: { wrong: '' } }])
  })
})
