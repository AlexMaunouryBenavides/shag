// Correction tolérante des réponses tapées ou dictées (spec exercises, « Correction tolérante »).
// Ignore la casse, la ponctuation, les accents toniques et la différence е/ё ;
// accepte plusieurs réponses ; « presque » à une lettre près ; détecte le latin tapé par erreur.

export type Verdict =
  | { kind: 'correct'; expected: string }
  | { kind: 'almost'; expected: string; diffIndex: number }
  | { kind: 'wrong'; expected: string }
  | { kind: 'latin' }
  | { kind: 'empty' }

const ACUTE = /́/g
const PUNCT = /[.,!?;:«»"“”„()…\-–—]/g

export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(ACUTE, '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(PUNCT, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** La saisie contient des lettres latines et aucune lettre cyrillique : clavier pas en russe. */
export function isLatin(s: string): boolean {
  return /[a-z]/i.test(s) && !/[а-яё]/i.test(s)
}

/** Distance de Levenshtein (petites chaînes). */
export function levenshtein(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]
    prev[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1))
      diag = tmp
    }
  }
  return prev[b.length]
}

/** Position (dans la réponse normalisée attendue) de la première différence. */
function firstDiff(a: string, b: string): number {
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  return i
}

/**
 * Compare une saisie aux réponses acceptées. `expected` du verdict est toujours la première
 * réponse acceptée (forme canonique, accentuée) sauf si la saisie en vise clairement une autre.
 */
export function check(input: string, accepted: string[]): Verdict {
  if (!input.trim()) return { kind: 'empty' }
  if (isLatin(input)) return { kind: 'latin' }
  const got = normalize(input)
  let best: { answer: string; dist: number; norm: string } | null = null
  for (const answer of accepted) {
    const norm = normalize(answer)
    if (norm === got) return { kind: 'correct', expected: answer }
    const dist = levenshtein(got, norm)
    if (!best || dist < best.dist) best = { answer, dist, norm }
  }
  if (best && best.dist === 1 && best.norm.length >= 3) {
    return { kind: 'almost', expected: best.answer, diffIndex: firstDiff(got, best.norm) }
  }
  return { kind: 'wrong', expected: accepted[0] }
}

/** Mots attendus reconnus / non reconnus dans une transcription vocale (exercice Oral). */
export function compareSpeech(transcript: string, expected: string): { word: string; ok: boolean }[] {
  const heard = new Set(normalize(transcript).split(' '))
  return expected
    .split(/\s+/)
    .filter((w) => normalize(w))
    .map((word) => ({ word, ok: heard.has(normalize(word)) }))
}
