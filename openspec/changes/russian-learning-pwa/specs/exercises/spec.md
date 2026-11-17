## ADDED Requirements

### Requirement: Types d'exercices
Le système MUST fournir les types d'exercices suivants, réutilisables par toutes les unités :
- **Saisie** : traduire ou transcrire en tapant en cyrillique
- **Trous** : compléter un mot ou une terminaison manquante
- **Remise en ordre** : reconstituer une phrase à partir de mots mélangés
- **Réponse dans un fil** : choisir ou taper la réplique adaptée dans une conversation
- **Écoute** : écouter puis choisir le sens ou taper ce qui est entendu
- **Oral** : dire une phrase, vérifiée par reconnaissance vocale
- **Shadowing** : écouter et répéter en même temps, sans vérification automatique

Chaque exercice MUST tenir sur un écran de téléphone sans défilement.

#### Scenario: Exercice de remise en ordre
- **WHEN** l'exercice affiche les mots « кофе / хочу / я »
- **THEN** l'utilisateur les tape dans l'ordre et obtient « Я хочу кофе »

### Requirement: Compatibilité avec le clavier virtuel
Pour les exercices tapés, la consigne, le champ de saisie, « Je ne sais pas » et « Valider » MUST rester visibles au-dessus du clavier virtuel Android ouvert. La touche Entrée du clavier MUST valider la réponse, puis passer à l'exercice suivant après le retour.

#### Scenario: Clavier ouvert
- **WHEN** l'utilisateur tape une réponse avec le clavier Android ouvert
- **THEN** la consigne, le champ et le bouton « Valider » sont visibles sans défilement, et Entrée valide

### Requirement: Correction tolérante
La correction des réponses tapées MUST ignorer la casse, la ponctuation, les accents toniques et la différence е/ё. Chaque exercice MUST pouvoir déclarer plusieurs réponses acceptées. Une réponse à une seule lettre près d'une réponse acceptée MUST être signalée comme « presque » avec la correction mise en évidence.

#### Scenario: Variante acceptée
- **WHEN** les réponses acceptées sont « Я хочу кофе » et « Хочу кофе » et l'utilisateur tape « хочу кофе »
- **THEN** la réponse est correcte

#### Scenario: Faute de frappe
- **WHEN** l'utilisateur tape « Я хочу кафе »
- **THEN** le système affiche « Presque » et met en évidence « о » dans « кофе »

### Requirement: Retour immédiat
Après chaque réponse, le système MUST afficher immédiatement si elle est juste, la forme correcte accentuée, et (en mode 🔊) jouer l'audio de la forme correcte. Passer à l'exercice suivant MUST se faire par un seul tap.

#### Scenario: Réponse juste en mode audio
- **WHEN** l'utilisateur répond correctement en mode 🔊
- **THEN** une confirmation s'affiche, l'audio de la phrase est joué, et un bouton « Suivant » apparaît en bas de l'écran

### Requirement: Signalement d'une erreur de contenu
La fiche mot et l'écran de retour après une réponse MUST proposer un bouton discret ⚑ « Signaler une erreur ». Un signalement MUST enregistrer localement l'identifiant de l'élément, le jour de programme et la date, sans autre saisie obligatoire, et MUST être inclus dans le fichier d'export.

#### Scenario: Correction contestée
- **WHEN** l'utilisateur pense que la réponse attendue est fausse et appuie sur ⚑
- **THEN** un signalement est enregistré, une confirmation brève s'affiche, et l'exercice continue normalement

### Requirement: Échappatoire
Chaque exercice MUST proposer « Je ne sais pas », qui révèle la réponse et compte comme une erreur, pour ne jamais bloquer l'utilisateur.

#### Scenario: Blocage
- **WHEN** l'utilisateur tape « Je ne sais pas »
- **THEN** la réponse est affichée et l'exercice est noté comme échoué
