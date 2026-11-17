// Types du paquet de contenu produit par tools/build_content.py (public/content/pack.json).
// Tout le texte russe y est déjà accentué.

export type DayKind = 'alphabet' | 'survival' | 'bilan' | 'normal' | 'consolidation'
export type ItemKind = 'letter' | 'word' | 'phrase'

export interface Item {
  id: string
  day: number
  kind: ItemKind
  ru: string
  fr: string
  note?: string
  answers?: string[]
  example?: { ru: string; fr: string; translit?: string }
  translit?: string
  cloze?: { ru: string; answer: string }
  sound?: string
  hint?: string
  warning?: string
}

export interface Message {
  from: string
  ru: string
  fr: string
  /** mot affiché (accentué) → élément qui l'a introduit (fiche mot au tap) */
  words?: Record<string, string>
}

export type Exercise =
  | { t: 'translate'; fr: string; answers: string[] }
  | { t: 'cloze'; ru: string; answers: string[]; fr?: string }
  | { t: 'order'; ru: string; fr?: string }
  | { t: 'reply'; thread: { from: string; ru: string }[]; options: string[]; answer: number; fr?: string }
  | { t: 'listen'; mode: 'meaning' | 'pick' | 'choice'; ru: string; options: string[]; answer: number }
  | { t: 'speak'; ru: string; fr?: string }
  | { t: 'shadow'; ru: string; fr?: string }
  | { t: 'read'; ru: string; options: string[]; answer: number }
  | { t: 'copy'; ru: string; fr: string }

export type UnitType =
  | 'review'
  | 'new'
  | 'lesson'
  | 'grammar'
  | 'fluency'
  | 'listen'
  | 'write'
  | 'speak'
  | 'letters'
  | 'read'
  | 'keyboard'
  | 'speak-words'
  | 'bilan'

export interface Unit {
  type: UnitType
  /** l'unité exige du son ou de parler (sautée en mode silencieux) */
  audio: boolean
  items?: string[]
  letters?: string[]
  exercises?: Exercise[]
  dialogueDay?: number | null
}

export interface Grammar {
  title: string
  explanation: string
  examples: { ru: string; fr: string }[]
  exercises: Exercise[]
}

export interface Day {
  day: number
  phase: number
  theme: string
  kind: DayKind
  items: string[]
  letters: string[]
  dialogue?: { messages: Message[] }
  grammar?: Grammar
  units: Unit[]
}

export interface Phase {
  id: number
  title: string
  goals: string[]
  firstDay: number
  lastDay: number
}

export interface Credit {
  name: string
  url: string
  license: string
  use: string
}

export interface Pack {
  version: string
  phases: Phase[]
  /** squelette complet du programme (y compris les jours pas encore publiés) */
  plan: { day: number; theme: string; kind: DayKind }[]
  characters: Record<string, { name: string }>
  /** dernier jour publié */
  lastDay: number
  items: Record<string, Item>
  days: Day[]
  /** texte russe accentué → fichier audio (dans content/audio/) */
  audio: Record<string, string>
  audioByPhase: Record<string, string[]>
  credits: Credit[]
}

export const UNIT_LABELS: Record<UnitType, string> = {
  review: 'Révision',
  new: 'Nouveaux mots',
  lesson: 'Dialogue',
  grammar: 'Grammaire',
  fluency: 'Relecture',
  listen: 'Écoute',
  write: 'Écriture',
  speak: 'Oral',
  letters: 'Nouvelles lettres',
  read: 'Lecture',
  keyboard: 'Clavier',
  'speak-words': 'Répéter',
  bilan: 'Bilan',
}
