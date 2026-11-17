## ADDED Requirements

### Requirement: Programme fixe en phases
Le système MUST embarquer un programme fixe et ordonné couvrant zéro → A1–A2, découpé en phases puis en « jours de programme » (environ 140 jours, soit 4 à 6 mois) :
- Phase 0 — Alphabet (jours ~1–10)
- Phase 1 — ~400 éléments (≈150 expressions de chat + ≈250 mots fréquents), présent, ты/вы, prépositionnel, passé (jusqu'au jour ~55)
- Phase 2 — ~650 éléments supplémentaires (≈1050 au total), accusatif, futur, génitif, aspect, verbes de mouvement, datif, instrumental, verbes en -ся, impératif (jusqu'au jour ~140)

Le niveau visé à la fin du programme est un A1 solide et une bonne partie de l'A2 (6 cas au singulier, pluriel au nominatif seulement).

Le rythme d'acquisition MUST rester lissé autour de 8 à 9 nouveaux éléments par jour de programme (jamais plus de 12), afin que la charge de révisions tienne dans le temps prévu. L'utilisateur MUST NOT avoir à choisir quoi étudier : le contenu de chaque jour est défini par le programme.

#### Scenario: Rythme d'acquisition
- **WHEN** le programme est compilé par le pipeline de contenu
- **THEN** aucun jour de programme n'introduit plus de 12 nouveaux éléments et la moyenne par phase est comprise entre 7 et 10

#### Scenario: Premier lancement
- **WHEN** l'utilisateur ouvre l'app pour la première fois
- **THEN** il est positionné au jour 1 de la phase 0 et voit les unités du jour

### Requirement: Jour de programme composé d'unités
Chaque jour de programme (phases 1 et 2) MUST être composé d'environ 8 unités d'environ 3 minutes (20–25 minutes au total), équilibrées selon les Four Strands (input, output, apprentissage ciblé, fluidité) sur la semaine. Les types d'unités sont : révision SRS, nouveaux éléments, leçon (dialogue), grammaire, écoute/shadowing, écriture, oral, fluidité (relecture d'un dialogue déjà vu).

La composition type d'un jour MUST suivre ce gabarit, dans un ordre qui commence par une révision et entrelace les types :
- 3 × Révision SRS (~9 min)
- 1 × Nouveaux éléments (~8–9 éléments)
- 1 × Leçon (dialogue)
- 1 × Grammaire **ou** Fluidité (en alternance selon le programme)
- 1 × Écoute / shadowing 🔊
- 1 × Écriture **ou** Oral 🔊 (en alternance)

#### Scenario: Composition d'un jour de phase 1
- **WHEN** l'utilisateur est au jour 20
- **THEN** l'écran Aujourd'hui liste ses unités dans l'ordre prévu, chacune avec un libellé court et une durée estimée, la première étant une révision SRS

### Requirement: Progression grammaticale « bloc d'abord, règle ensuite »
Le programme MUST suivre la progression grammaticale suivante (jours indicatifs) :
- 11–15 salutations, présentation, absence de « être » au présent, question par l'intonation, Э́то… ;
- 16–20 genre des noms, мой/твой ;
- 21–25 chiffres 1–10, pluriel nominatif ;
- 26–33 présent des 1ʳᵉ et 2ᵉ conjugaisons ;
- 34–40 ты/вы, adjectifs au nominatif, хоте́ть, мочь ;
- 41–47 prépositionnel (où ?) ;
- 48–55 passé, chiffres jusqu'à 100, l'heure ;
- 56–65 accusatif ; 66–75 futur, jours de la semaine ; 76–87 génitif et quantités ;
- 88–97 aspect ; 98–107 verbes de mouvement (куда́/где) ; 108–117 datif ; 118–127 instrumental ;
- 128–135 verbes en -ся, impératif ; 136–140 révision générale et bilan.

Les structures fréquentes reposant sur une règle pas encore vue (ex. Меня́ зову́т, Мне нра́вится, У меня́ есть, Мне … лет) MUST être introduites tôt comme blocs figés, puis rattachées explicitement à leur règle lorsque celle-ci est enseignée.

#### Scenario: Rattachement d'un bloc à sa règle
- **WHEN** l'unité de grammaire du datif est présentée
- **THEN** ses exemples incluent « Мне нра́вится… » et rappellent que ce bloc est connu depuis la phase 1

### Requirement: Jour de consolidation hebdomadaire
Un jour de programme sur sept (jours 7, 14, 21…, hors phase 0) MUST être un jour de consolidation sans nouveaux éléments, composé de révisions SRS, de relectures/réécoutes de dialogues déjà vus (fluidité), d'écriture et d'oral.

#### Scenario: Jour 21
- **WHEN** l'utilisateur atteint le jour 21
- **THEN** l'écran Aujourd'hui affiche « Jour 21 · Consolidation » et aucune unité « Nouveaux éléments »

### Requirement: Thème situationnel par jour
Chaque jour de programme des phases 1 et 2 MUST avoir un thème situationnel (ex. « Au café », « Se présenter », « La famille », « L'heure ») qui relie ses nouveaux éléments, son dialogue et ses exercices. Le thème MUST être affiché en titre de l'écran Aujourd'hui et dans l'écran Plan.

#### Scenario: Affichage du thème
- **WHEN** l'utilisateur ouvre l'app au jour 15
- **THEN** l'écran Aujourd'hui affiche « Jour 15 · Au café » au-dessus de la liste des unités

### Requirement: Un seul bouton pour continuer
L'écran Aujourd'hui MUST présenter un bouton principal unique « Continuer » qui lance la prochaine unité à faire. L'utilisateur MUST pouvoir réaliser toute sa journée en n'utilisant que ce bouton.

#### Scenario: Reprise après interruption
- **WHEN** l'utilisateur a terminé 3 unités, ferme l'app, puis la rouvre plus tard
- **THEN** l'écran Aujourd'hui montre 3 unités terminées et « Continuer » lance la 4ᵉ

### Requirement: Unités interrompables
Chaque unité MUST sauvegarder la progression après chaque réponse. Une unité quittée en cours MUST reprendre là où elle s'est arrêtée.

#### Scenario: Interruption en salle d'attente
- **WHEN** l'utilisateur quitte l'app au milieu d'une unité de révision
- **THEN** les réponses déjà données sont conservées et la reprise propose la question suivante

### Requirement: Mode audio et mode silencieux
L'écran Aujourd'hui MUST offrir un interrupteur unique 🔊 / 🔇. En mode silencieux, « Continuer » MUST sauter les unités qui exigent du son ou de parler (écoute, shadowing, oral) et lancer la prochaine unité compatible ; les unités sautées restent à faire. En mode silencieux, les exercices MUST NOT jouer d'audio automatiquement.

#### Scenario: Unité orale en mode silencieux
- **WHEN** la prochaine unité est « Oral » et le mode silencieux est actif
- **THEN** « Continuer » lance la première unité suivante compatible, et l'unité « Oral » reste marquée à faire

#### Scenario: Plus que des unités audio
- **WHEN** le mode silencieux est actif et seules des unités audio restent à faire
- **THEN** l'écran indique « Il reste N unités audio pour plus tard » au lieu du bouton Continuer

### Requirement: Progression au rythme de l'utilisateur
Le programme MUST avancer par jours de programme complétés et non par dates calendaires. Un jour manqué MUST NOT créer de retard ni de message culpabilisant : l'utilisateur reprend au jour de programme suivant. Lorsque toutes les unités du jour sont terminées, l'écran MUST afficher « Journée terminée », le thème du jour suivant, et un unique lien secondaire choisi automatiquement : « Révisions supplémentaires » s'il reste des révisions SRS en retard, sinon « Commencer le jour suivant ». Aucune animation de célébration ne SHALL être affichée.

#### Scenario: Trois jours sans ouvrir l'app
- **WHEN** l'utilisateur rouvre l'app après 3 jours d'absence
- **THEN** il retrouve le jour de programme non terminé, et les révisions SRS en retard sont plafonnées (voir `srs-review`)

#### Scenario: Journée terminée sans retard
- **WHEN** la dernière unité du jour est terminée et aucune révision n'est en retard
- **THEN** l'écran affiche « Journée terminée », « Demain : <thème> » et un lien discret « Commencer le jour suivant »

#### Scenario: Journée terminée avec des révisions en retard
- **WHEN** la dernière unité du jour est terminée et des révisions sont en retard
- **THEN** le lien secondaire est « Révisions supplémentaires » ; « Commencer le jour suivant » n'apparaît qu'une fois le retard résorbé

### Requirement: Contenu de l'écran Aujourd'hui
L'écran Aujourd'hui MUST afficher : le numéro du jour et son thème, une barre de progression « N / 8 », la liste complète des unités du jour (faites ✓, prochaine mise en avant avec sa durée, à faire ○, icône 🔊 pour les unités audio) et le bouton « Continuer » dans la zone du pouce.

#### Scenario: Milieu de journée
- **WHEN** 3 unités sur 8 sont faites
- **THEN** l'écran montre la barre « 3 / 8 », les 3 unités cochées, la 4ᵉ mise en avant et le bouton « Continuer » en bas

### Requirement: Fin du contenu publié
Le contenu étant livré par jalons, le paquet de contenu MUST indiquer le dernier jour de programme publié. Si l'utilisateur termine ce dernier jour, l'écran Aujourd'hui MUST afficher « La suite arrive bientôt » et proposer chaque jour des unités de révision SRS et de fluidité à la place des nouveaux jours.

#### Scenario: Dernier jour publié atteint
- **WHEN** le jalon publié s'arrête au jour 24 et l'utilisateur termine le jour 24
- **THEN** le lendemain, l'écran affiche « La suite arrive bientôt » avec des unités de révision et de fluidité ; dès qu'une mise à jour publie le jour 25, il reprend normalement

### Requirement: Pas de notifications
L'application MUST NOT envoyer de notifications ni de rappels push dans la v1.

#### Scenario: Journée non faite
- **WHEN** l'utilisateur n'ouvre pas l'app de la journée
- **THEN** aucune notification n'est envoyée

### Requirement: Écran Plan
L'écran Plan MUST montrer la position de l'utilisateur dans le programme : phase en cours, jour de programme (ex. « Jour 37 / 140 »), objectifs de la phase, et une liste des jours passés et à venir avec leur thème. Il MUST afficher un historique simple d'activité (unités faites par jour calendaire) sans badge, série ni point.

#### Scenario: Consultation du plan
- **WHEN** l'utilisateur ouvre l'écran Plan
- **THEN** il voit sa phase, son jour de programme, le pourcentage du programme effectué et le thème des prochains jours
