## ADDED Requirements

### Requirement: Planification FSRS
Le système MUST planifier les révisions avec l'algorithme FSRS. Chaque révision MUST être enregistrée (carte, date, note, état) dans un journal de révisions.

#### Scenario: Carte réussie
- **WHEN** l'utilisateur répond correctement à une carte
- **THEN** la prochaine échéance de la carte est repoussée selon FSRS et la révision est journalisée

### Requirement: Notation simplifiée
Le système MUST déduire la note FSRS de la réponse sans demander d'auto-évaluation détaillée : réponse fausse → « Again » ; réponse juste → « Good » ; l'utilisateur MAY marquer une réponse juste comme « facile » ou « difficile » par un geste secondaire optionnel.

#### Scenario: Réponse fausse
- **WHEN** l'utilisateur donne une réponse incorrecte
- **THEN** la bonne réponse est affichée (avec audio en mode 🔊), la carte est notée « Again » et revient plus tard dans la même unité

### Requirement: Types de cartes
Le système MUST supporter des cartes de type lettre, mot, expression et phrase, avec l'accent tonique affiché sur toutes les formes russes. Les paires d'aspect (делать / сделать) MUST être une seule carte.

#### Scenario: Paire d'aspect
- **WHEN** la paire делать / сделать est introduite
- **THEN** une seule carte est créée pour les deux verbes

### Requirement: Une carte par élément, sens de révision évolutif
Chaque élément appris MUST correspondre à une seule carte SRS (pas de carte séparée par sens). Le format de présentation MUST être choisi selon la stabilité FSRS de la carte :
- stabilité faible → **reconnaissance** (russe → sens, choix ou saisie courte) ;
- stabilité moyenne → **production tapée** (français → russe) ;
- stabilité forte → **production en contexte** (phrase à trou issue d'un dialogue ou d'une phrase exemple).

Les seuils de stabilité MUST être configurables. Une seule planification FSRS s'applique à la carte quel que soit le format.

#### Scenario: Nouvelle carte
- **WHEN** une carte vient d'être introduite
- **THEN** elle est présentée en reconnaissance (« вода́ → ? »)

#### Scenario: Carte bien maîtrisée
- **WHEN** la stabilité d'une carte dépasse le seuil haut
- **THEN** elle est présentée en production en contexte (« Я хочу́ ___ . → во́ду ») ; la saisie sans accent est acceptée et la forme accentuée est affichée en retour

### Requirement: Charge quotidienne plafonnée
Le nombre de révisions dues par jour MUST être plafonné pour tenir dans le temps des unités de révision. En cas de retard, les cartes les plus en retard selon FSRS MUST être priorisées, et le reliquat MUST être étalé sur les jours suivants sans bloquer le programme.

#### Scenario: Retour après absence
- **WHEN** 200 révisions sont dues après une semaine d'absence
- **THEN** la journée contient le nombre normal d'unités de révision, et les cartes restantes sont réparties sur les jours suivants

### Requirement: Entrelacement
Une unité de révision MUST mélanger les types de cartes et les sens de révision au lieu de les regrouper par bloc.

#### Scenario: Unité mixte
- **WHEN** une unité de révision contient des lettres, des mots et des phrases
- **THEN** ils apparaissent dans un ordre mélangé
