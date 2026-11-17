# Contenu de Шаг — guide de rédaction

Tout le contenu pédagogique vit ici, en YAML. Le pipeline (`tools/build_content.py`) le valide,
l'accentue, génère l'audio et produit `public/content/pack.json`.

```
content/
  program.yaml        # phases, squelette des 140 jours (thème + type), noms propres
  characters.yaml     # personnages récurrents des dialogues
  stress.yaml         # formes accentuées faisant autorité (ambiguïtés, mots absents du dictionnaire)
  audio_exceptions.yaml  # mots isolés à remplacer par un enregistrement humain Lingua Libre
  days/d001.yaml …    # contenu de chaque jour publié
```

## Règles d'écriture du russe

- Écrire le russe **sans accents** : le pipeline les ajoute depuis OpenRussian.
- Si le pipeline signale un mot **ambigu** (ру́ки / руки́, все / всё, за́мок / замо́к), écrire
  l'accent (ou ё) directement dans la source à cet endroit : `ру́ки`, `всё`.
- Si un mot est **inconnu** du dictionnaire (pronom décliné, forme rare), l'ajouter à `stress.yaml`.
- Toujours écrire **ё** quand on le sait.

## Un fichier de jour (`days/d015.yaml`)

```yaml
day: 15
items:                      # nouveaux éléments du jour (≤ 12, aucun les jours de consolidation)
  - id: voda                # identifiant stable, ne jamais le changer
    ru: вода
    fr: eau
    note: f.                # facultatif
    example: { ru: Я хочу воду., fr: Je veux de l'eau. }
  - id: hochu
    ru: хочу / хочешь       # paire présentée ensemble (une seule carte)
    fr: je veux / tu veux
    answers: [хочу]         # facultatif : réponses acceptées en production
dialogue:
  messages:
    - { from: masha, ru: Привет! Ты где?, fr: Salut ! Tu es où ? }
  glossed: []               # mots exceptionnellement hors programme (≤ 5 % des mots)
grammar:
  title: La question par l'intonation
  explanation: |
    En russe, une question peut s'écrire comme une affirmation…
  examples:
    - { ru: Ты хочешь чай?, fr: Tu veux du thé ? }
  exercises: [ … ]
write: [ … ]                # exercices d'écriture
```

Les jours de phase 0 ont en plus `letters:` (lettres introduites) ; leurs `items` ne doivent
contenir que des lettres déjà vues.

## Types d'exercices

```yaml
- { type: translate, fr: Je veux du thé., answers: [Я хочу чай.] }
- { type: cloze, ru: Я хочу ___., answers: [воду], fr: Je veux de l'eau. }
- { type: order, ru: Я хочу кофе., fr: Je veux du café. }
- { type: reply, thread: [{ from: masha, ru: Как дела? }], options: [Хорошо!, Кофе.], answer: 0 }
- { type: listen, ru: Ты хочешь чай?, options: [Question, Affirmation], answer: 0 }
- { type: speak, ru: Привет!, fr: Salut ! }
- { type: shadow, ru: Я хочу кофе, пожалуйста., fr: Je voudrais un café, s'il te plaît. }
```

Les unités Écoute, Oral et Fluidité sont complétées automatiquement à partir du dialogue.
