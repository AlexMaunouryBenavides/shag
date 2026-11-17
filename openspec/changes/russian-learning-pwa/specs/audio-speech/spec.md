## ADDED Requirements

### Requirement: Audio pré-généré hors ligne
Tout élément russe du contenu (lettres, mots, expressions, phrases, messages de dialogue) MUST disposer d'un fichier audio pré-généré, embarqué et disponible hors ligne.

#### Scenario: Écoute en mode avion
- **WHEN** l'utilisateur joue l'audio d'un message sans réseau
- **THEN** l'audio est lu depuis le cache local

### Requirement: Contrôle de lecture
L'utilisateur MUST pouvoir rejouer un audio d'un tap et MUST pouvoir le jouer en vitesse ralentie (≈0,75×).

#### Scenario: Écoute ralentie
- **WHEN** l'utilisateur appuie longuement sur le bouton audio
- **THEN** l'audio est rejoué à vitesse ralentie

### Requirement: Reconnaissance vocale pour l'oral
Les exercices oraux MUST utiliser la reconnaissance vocale du navigateur en langue `ru-RU`. La transcription MUST être comparée à la phrase attendue avec les mêmes règles de tolérance que les exercices tapés, et le résultat MUST afficher les mots reconnus et non reconnus.

#### Scenario: Phrase reconnue
- **WHEN** l'utilisateur dit « Привет, как дела » et la transcription correspond
- **THEN** l'exercice est validé

#### Scenario: Mot non reconnu
- **WHEN** la transcription ne contient pas l'un des mots attendus
- **THEN** ce mot est mis en évidence, l'audio modèle est proposé, et l'utilisateur peut réessayer ou passer

### Requirement: Dégradation si la reconnaissance est indisponible
Si la reconnaissance vocale n'est pas disponible (hors ligne, permission refusée, navigateur non compatible), les exercices oraux MUST basculer en mode auto-évalué : écouter le modèle, s'enregistrer mentalement ou à voix haute, puis indiquer « réussi » ou « à revoir ».

#### Scenario: Oral sans réseau
- **WHEN** une unité orale est lancée hors ligne
- **THEN** l'exercice se présente en mode auto-évalué au lieu d'échouer
