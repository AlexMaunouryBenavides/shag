## ADDED Requirements

### Requirement: Contenu source versionné
Le programme (phases, jours, unités), le vocabulaire, les dialogues, les points de grammaire et les exercices MUST être définis dans des fichiers sources lisibles et versionnés dans le dépôt, séparés du code de l'application.

#### Scenario: Correction d'un dialogue
- **WHEN** une erreur est trouvée dans un dialogue
- **THEN** elle se corrige en modifiant un fichier source, puis en relançant le pipeline

### Requirement: Validation du vocabulaire
Le pipeline MUST lemmatiser chaque mot russe du contenu et vérifier que chaque dialogue et exercice respecte la contrainte de gradation (≥95 % de lemmes déjà introduits, nouveaux lemmes déclarés par la leçon). Toute violation MUST faire échouer le build avec un rapport indiquant le fichier, la phrase et le mot fautif.

#### Scenario: Mot hors programme
- **WHEN** un dialogue du jour 12 utilise un mot introduit au jour 30
- **THEN** le pipeline échoue et signale le mot, le dialogue et le jour

### Requirement: Accents toniques depuis un dictionnaire
Les accents toniques MUST être appliqués ou vérifiés à partir d'un dictionnaire de référence (OpenRussian). Un mot dont l'accent ne peut être déterminé MUST être signalé pour vérification manuelle ; il MUST NOT être accentué au hasard.

#### Scenario: Mot ambigu
- **WHEN** une forme a plusieurs accentuations possibles (ex. « замок »)
- **THEN** le pipeline exige une annotation explicite dans la source

### Requirement: Génération audio
Le pipeline MUST générer un fichier audio compressé pour chaque élément russe du contenu à l'aide d'un moteur de synthèse vocale libre exécuté localement (Piper), et MUST ne régénérer que les éléments modifiés.

#### Scenario: Ajout d'une phrase
- **WHEN** une phrase est ajoutée au contenu
- **THEN** seul son audio est généré lors du prochain build

### Requirement: Audio humain de substitution
Pour un mot isolé dont l'audio Piper est jugé incorrect (liste d'exceptions maintenue dans les sources), le pipeline MUST utiliser un enregistrement humain issu de Lingua Libre lorsqu'il existe, et MUST enregistrer l'attribution correspondante.

#### Scenario: Mot mal prononcé par Piper
- **WHEN** le mot « молоко́ » figure dans la liste d'exceptions et un enregistrement Lingua Libre existe
- **THEN** le paquet utilise l'enregistrement Lingua Libre pour ce mot et ajoute son auteur aux crédits

#### Scenario: Pas d'enregistrement disponible
- **WHEN** un mot de la liste d'exceptions n'a pas d'enregistrement Lingua Libre
- **THEN** le pipeline le signale pour une correction manuelle (texte phonétique adapté ou autre voix)

### Requirement: Lecture des signalements
Le pipeline MUST fournir un outil qui lit un fichier de sauvegarde exporté et liste les éléments signalés ⚑ avec leur texte et leur jour.

#### Scenario: Traitement des signalements
- **WHEN** l'outil est lancé sur un export contenant des signalements
- **THEN** il affiche pour chacun l'identifiant, le texte russe, la traduction et le fichier source à corriger

### Requirement: Paquet de contenu
Le pipeline MUST produire un paquet de contenu statique (données + audio) consommé par l'application, avec un numéro de version et des identifiants stables pour chaque élément afin de préserver la progression lors des mises à jour.

#### Scenario: Identifiants stables
- **WHEN** le texte d'un mot est corrigé
- **THEN** son identifiant reste inchangé dans le paquet

### Requirement: Export pour relecture native
Le pipeline MUST pouvoir exporter le contenu d'une plage de jours dans un document lisible (texte russe + traduction) destiné à une relecture par un locuteur natif.

#### Scenario: Export pour relecture
- **WHEN** le pipeline est lancé avec l'option d'export sur les jours 1 à 20
- **THEN** un fichier lisible regroupe les dialogues et phrases de ces jours avec leur traduction
