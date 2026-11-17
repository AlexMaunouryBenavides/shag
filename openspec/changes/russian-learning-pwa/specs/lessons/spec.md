## ADDED Requirements

### Requirement: Dialogues au format messagerie
Les leçons de lecture MUST présenter le contenu sous forme de fils de discussion (bulles de messages, personnages récurrents), en registre de chat courant (ты, formules familières, abréviations usuelles introduites progressivement).

#### Scenario: Affichage d'un dialogue
- **WHEN** l'utilisateur ouvre une unité « Leçon »
- **THEN** il voit un fil de messages entre personnages, les messages apparaissant un par un au tap

### Requirement: Input gradué
Chaque dialogue MUST être composé d'au moins 95 % de mots (lemmes) déjà introduits dans le programme au moment où il est présenté ; les mots nouveaux MUST être ceux que la leçon introduit.

#### Scenario: Mot nouveau dans un dialogue
- **WHEN** un dialogue contient un mot introduit par la leçon
- **THEN** ce mot est visuellement repérable et sa traduction est disponible au tap

### Requirement: Aide au tap sur un mot
Un tap sur un mot russe dans un dialogue MUST afficher sa forme accentuée, sa forme de base, sa traduction, la transcription phonétique jusqu'au jour 30 (voir `alphabet`) et (en mode 🔊) son audio. Un tap sur une bulle MUST permettre d'écouter le message entier et de voir sa traduction.

#### Scenario: Tap sur une forme déclinée
- **WHEN** l'utilisateur tape sur « ко́фе » dans « Я хочу́ ко́фе »
- **THEN** une fiche affiche « ко́фе — café (n., invariable) » et l'audio

### Requirement: Accents toniques toujours affichés
Tout texte russe affiché dans l'app (dialogues, cartes, exercices, grammaire) MUST porter la marque d'accent tonique sur les mots de plus d'une syllabe, à l'exception de « ё » qui est toujours accentué et MUST être écrit avec ses points.

#### Scenario: Affichage d'une phrase
- **WHEN** une phrase russe est affichée
- **THEN** chaque mot polysyllabique porte son accent (ex. « Приве́т, как дела́? »)

### Requirement: Grammaire explicite et courte
Les unités de grammaire MUST présenter un seul point de grammaire à la fois, en français, avec une explication courte (lisible en moins d'une minute), des exemples tirés des dialogues déjà vus, puis des exercices d'application. Les cas MUST être introduits un par un via des usages concrets (ex. « в + prépositionnel = où ? »), et non sous forme de tableaux complets d'emblée.

#### Scenario: Introduction du prépositionnel
- **WHEN** l'utilisateur atteint la leçon du prépositionnel
- **THEN** il voit la règle « Где? → в/на + -е », des exemples (в Москве́, в кафе́) et enchaîne sur des exercices à trous

### Requirement: Introduction du nouveau vocabulaire
Les unités « Nouveaux éléments » MUST introduire au plus 8 éléments (mots ou expressions) par unité, chacun avec traduction, accent, audio et une phrase exemple, puis les ajouter au SRS.

#### Scenario: Fin d'unité de vocabulaire
- **WHEN** l'unité « Nouveaux éléments » est terminée
- **THEN** ses éléments sont ajoutés aux cartes SRS et considérés comme introduits pour la gradation des dialogues

### Requirement: Relecture pour la fluidité
Les unités « Fluidité » MUST reprendre un dialogue déjà étudié pour une relecture ou réécoute rapide, sans aide affichée par défaut.

#### Scenario: Unité de fluidité
- **WHEN** l'utilisateur lance une unité de fluidité
- **THEN** un dialogue déjà vu est affiché en entier pour une lecture rapide, l'audio pouvant être joué en vitesse normale
