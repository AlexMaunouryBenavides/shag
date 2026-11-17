import { describe, expect, it } from 'vitest'
import { check, compareSpeech, isLatin, levenshtein, normalize } from './answer'

const A = '́'

describe('normalize', () => {
  it('ignore casse, ponctuation, accents et ё', () => {
    expect(normalize(`Я хочу${A} ко${A}фе!`)).toBe('я хочу кофе')
    expect(normalize('Ещё, пожалуйста…')).toBe('еще пожалуйста')
  })
})

describe('check', () => {
  it('accepte une variante', () => {
    expect(check('хочу кофе', [`Я хочу${A} ко${A}фе.`, `Хочу${A} ко${A}фе.`])).toEqual({
      kind: 'correct',
      expected: `Хочу${A} ко${A}фе.`,
    })
  })

  it('accepte la saisie sans accent', () => {
    expect(check('кофе', [`ко${A}фе`]).kind).toBe('correct')
  })

  it('signale « presque » à une lettre près', () => {
    const v = check('Я хочу кафе', [`Я хочу${A} ко${A}фе.`])
    expect(v.kind).toBe('almost')
    if (v.kind === 'almost') expect(v.diffIndex).toBe(8) // « я хочу к[а]фе »
  })

  it('refuse une mauvaise réponse', () => {
    expect(check('чай', ['кофе']).kind).toBe('wrong')
  })

  it('détecte le clavier latin', () => {
    expect(check('kafe', ['кафе'])).toEqual({ kind: 'latin' })
    expect(isLatin('кафе')).toBe(false)
  })

  it('ne dit pas « presque » pour un mot très court', () => {
    expect(check('ты', ['мы']).kind).toBe('wrong')
  })

  it('saisie vide', () => {
    expect(check('  ', ['да']).kind).toBe('empty')
  })
})

describe('levenshtein', () => {
  it('calcule la distance', () => {
    expect(levenshtein('кафе', 'кофе')).toBe(1)
    expect(levenshtein('', 'abc')).toBe(3)
  })
})

describe('compareSpeech', () => {
  it('repère les mots non reconnus', () => {
    expect(compareSpeech('привет как', `Приве${A}т, как дела${A}?`)).toEqual([
      { word: `Приве${A}т,`, ok: true },
      { word: 'как', ok: true },
      { word: `дела${A}?`, ok: false },
    ])
  })
})
