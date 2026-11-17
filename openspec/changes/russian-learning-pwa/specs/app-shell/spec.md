## ADDED Requirements

### Requirement: Application web progressive installable
L'application MUST être une PWA installable sur l'écran d'accueil d'Android (Chrome), s'ouvrant en plein écran sans barre de navigateur.

#### Scenario: Installation sur Android
- **WHEN** l'utilisateur ouvre l'URL de l'app dans Chrome Android et choisit « Ajouter à l'écran d'accueil »
- **THEN** une icône est créée et l'app s'ouvre en mode standalone

### Requirement: Fonctionnement entièrement hors ligne
L'application MUST fonctionner sans connexion réseau après le premier chargement, y compris le contenu des leçons et l'audio. Aucune fonctionnalité de la v1 ne SHALL dépendre d'un service externe à l'exécution, à l'exception de la reconnaissance vocale (voir `audio-speech`).

#### Scenario: Utilisation en mode avion
- **WHEN** l'app a été chargée une fois puis le téléphone passe en mode avion
- **THEN** l'utilisateur peut ouvrir l'app et réaliser toutes les unités du jour qui ne nécessitent pas la reconnaissance vocale

#### Scenario: Mise à jour du contenu
- **WHEN** une nouvelle version de l'app est déployée et le téléphone est en ligne
- **THEN** la nouvelle version est téléchargée en arrière-plan et appliquée au prochain lancement sans perte de données

### Requirement: Interface mobile-first et minimaliste
L'interface MUST être conçue d'abord pour un écran de téléphone en portrait, utilisable à une main (actions principales dans la moitié basse de l'écran, cibles tactiles ≥ 44 px), avec une esthétique minimaliste. L'app MUST comporter uniquement trois écrans : **Aujourd'hui** (écran d'accueil et écran central), **Plan** et **Réglages** (secondaires). Il MUST NOT y avoir de barre d'onglets : Plan et Réglages sont atteints par deux icônes discrètes en haut de l'écran Aujourd'hui, et en reviennent par une flèche retour.

#### Scenario: Ouverture de l'app
- **WHEN** l'utilisateur ouvre l'app
- **THEN** l'écran Aujourd'hui s'affiche directement, sans écran intermédiaire ni connexion

#### Scenario: Navigation
- **WHEN** l'utilisateur est sur l'écran Aujourd'hui
- **THEN** il atteint Plan ou Réglages en un seul tap sur une icône en haut, et revient à Aujourd'hui en un tap

### Requirement: Écran d'unité
Pendant une unité, l'écran MUST afficher uniquement un bouton ✕ (retour à Aujourd'hui, progression conservée), une fine barre de progression de l'unité et l'exercice en cours.

#### Scenario: Quitter une unité
- **WHEN** l'utilisateur appuie sur ✕ au milieu d'une unité
- **THEN** il revient à l'écran Aujourd'hui sans confirmation et sans perte de progression

### Requirement: Pas d'italique pour le texte russe
Le texte russe MUST NOT être affiché en italique nulle part dans l'app, car les formes italiques cyrilliques (т → *m*, и → *u*) diffèrent des formes droites et désorientent un débutant.

#### Scenario: Mise en évidence d'un mot russe
- **WHEN** un mot russe doit être mis en évidence (mot nouveau, correction)
- **THEN** il est mis en évidence par la graisse, la couleur ou un soulignement, jamais par l'italique

### Requirement: Thème clair et sombre
L'application MUST suivre le thème clair/sombre du système.

#### Scenario: Réveil dans le noir
- **WHEN** le téléphone est en thème sombre
- **THEN** l'app s'affiche en thème sombre

### Requirement: Attribution des sources
L'écran Réglages MUST afficher l'attribution des données sous licence libre utilisées (OpenRussian, Tatoeba, voix Piper, enregistrements Lingua Libre et leurs auteurs).

#### Scenario: Consultation des crédits
- **WHEN** l'utilisateur ouvre Réglages
- **THEN** il voit la liste des sources et leurs licences
