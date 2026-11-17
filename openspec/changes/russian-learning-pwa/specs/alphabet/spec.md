## ADDED Requirements

### Requirement: Déroulé de la phase 0 sur 10 jours
La phase 0 MUST durer 10 jours de programme, selon le découpage suivant :
- J1 : А О К М Т + guide d'installation du clavier russe (Gboard)
- J2 : Р Н В С (faux amis)
- J3 : Е У Х
- J4 : И Л П Д З
- J5 : Б Г Ф Й Э
- J6 : Ж Ш Ч Щ Ц
- J7 : Я Ю Ё Ы Ь Ъ (Ь et Ъ en reconnaissance seulement)
- J8 : accent tonique et réduction du « о » non accentué
- J9 : premiers mots de survie (Приве́т, Да, Нет, Спаси́бо, Пожа́луйста, Как дела́?)
- J10 : bilan

Chaque jour de phase 0 MUST suivre le gabarit de 8 unités adapté à l'alphabet (révisions, nouvelles lettres, lecture de mots, écoute → lettre, clavier, répétition à voix haute). Les mots débloqués MUST être des mots utiles (transparents ou de survie), composés uniquement de lettres déjà vues.

#### Scenario: Mots du jour 2
- **WHEN** l'utilisateur termine le jour 2
- **THEN** il a lu et tapé des mots composés uniquement des lettres des jours 1–2 (ex. нос, сок, вот, Москва́)

### Requirement: Bilan non bloquant
Le jour 10 MUST proposer un bilan (lecture et saisie d'environ 20 mots) qui affiche les lettres encore fragiles. Le bilan MUST NOT bloquer le passage à la phase 1 : les lettres fragiles MUST être priorisées dans les révisions SRS suivantes.

#### Scenario: Bilan avec erreurs
- **WHEN** l'utilisateur fait 30 % d'erreurs au bilan, surtout sur Ш et Щ
- **THEN** l'écran indique « À consolider : Ш, Щ », la phase 1 commence normalement le lendemain et ces lettres reviennent plus souvent en révision

### Requirement: Transcription phonétique dégressive
Une transcription approximative pour francophone (ex. « молоко́ → [malako] ») MUST être affichée directement en phase 0. Du jour 11 au jour 30, elle MUST n'être disponible qu'au tap (fiche mot). À partir du jour 31, elle MUST NOT être affichée.

#### Scenario: Transcription en phase 1
- **WHEN** l'utilisateur est au jour 20 et tape sur un mot
- **THEN** la fiche mot affiche la transcription

#### Scenario: Transcription après le jour 30
- **WHEN** l'utilisateur est au jour 35 et tape sur un mot
- **THEN** la fiche mot n'affiche pas de transcription, seulement l'audio

### Requirement: Apprentissage progressif des lettres
La phase 0 MUST enseigner les 33 lettres du cyrillique par petits groupes, dans un ordre pédagogique : lettres identiques au français, puis faux amis, puis lettres nouvelles (voir le déroulé sur 10 jours). Chaque lettre MUST être présentée avec sa majuscule, sa minuscule (imprimée, jamais en italique), son son, une transcription approximative pour un francophone, un avertissement pour les faux amis et l'audio.

#### Scenario: Introduction d'un faux ami
- **WHEN** la lettre Р est introduite
- **THEN** l'écran affiche « Р р — se prononce [r] roulé, pas [p] » avec un mot exemple et son audio

### Requirement: Décodage de mots transparents
Dès que suffisamment de lettres sont connues, le système MUST proposer des exercices de lecture de mots transparents (кафе, такси, метро, банк…) composés uniquement de lettres déjà apprises.

#### Scenario: Lecture d'un mot
- **WHEN** l'utilisateur connaît les lettres т, а, к, с, и
- **THEN** il peut recevoir l'exercice « Lis : такси » avec choix de la traduction, puis l'audio en retour

### Requirement: Lettres en répétition espacée
Chaque lettre introduite MUST devenir une carte SRS (reconnaissance lettre → son, et son → lettre).

#### Scenario: Lettre introduite
- **WHEN** une unité d'introduction de lettres est terminée
- **THEN** les lettres de l'unité apparaissent dans les révisions des jours suivants

### Requirement: Prise en main du clavier russe
La phase 0 MUST inclure des exercices de saisie au clavier russe ЙЦУКЕН, avec des instructions pour ajouter la langue russe au clavier Android (Gboard). Les exercices de saisie MUST détecter si un caractère latin a été tapé à la place du cyrillique et le signaler.

#### Scenario: Saisie en latin
- **WHEN** l'utilisateur tape « kafe » au lieu de « кафе »
- **THEN** le système indique « Passe ton clavier en russe » sans compter la réponse comme fausse

### Requirement: Accent tonique introduit dès la phase 0
La phase 0 MUST expliquer la notion d'accent tonique et sa notation (´), et l'effet de réduction du « о » non accentué.

#### Scenario: Explication de l'accent
- **WHEN** l'utilisateur atteint la leçon sur l'accent
- **THEN** il voit et entend la différence entre « молоко́ » et une lecture lettre par lettre
