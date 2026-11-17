## ADDED Requirements

### Requirement: Persistance locale
Toutes les données de l'utilisateur (progression dans le programme, état des unités, cartes SRS, journal de révisions, historique d'activité, réglages) MUST être stockées localement sur l'appareil, sans compte ni serveur.

#### Scenario: Redémarrage du téléphone
- **WHEN** le téléphone redémarre et l'utilisateur rouvre l'app
- **THEN** toute la progression est intacte

### Requirement: Stockage persistant
Au premier lancement, l'app MUST demander au navigateur un stockage persistant. Si le navigateur le refuse, l'écran Réglages MUST l'indiquer et recommander l'export régulier.

#### Scenario: Stockage persistant accordé
- **WHEN** l'app installée demande le stockage persistant et le navigateur l'accorde
- **THEN** Réglages affiche « Stockage protégé »

### Requirement: Export et import de sauvegarde
L'écran Réglages MUST permettre d'exporter l'intégralité des données dans un fichier unique téléchargeable, et d'importer un tel fichier pour restaurer l'état. L'import MUST demander confirmation avant d'écraser les données existantes.

#### Scenario: Restauration sur un nouveau téléphone
- **WHEN** l'utilisateur importe un fichier de sauvegarde sur un nouvel appareil
- **THEN** il retrouve sa position dans le programme et ses cartes SRS

### Requirement: Rappel de sauvegarde
Si aucun export n'a été fait depuis 7 jours, l'écran Aujourd'hui MUST afficher un rappel discret, une fois par jour au plus, après la fin de la journée de programme.

#### Scenario: Rappel hebdomadaire
- **WHEN** la journée est terminée et le dernier export date de plus de 7 jours
- **THEN** un lien discret « Sauvegarder ma progression » apparaît

### Requirement: Migration du schéma de données
Lors d'une mise à jour de l'app modifiant la structure des données ou le contenu du programme, les données existantes MUST être migrées sans perte de progression.

#### Scenario: Nouvelle version du contenu
- **WHEN** une mise à jour corrige le texte d'un dialogue
- **THEN** la progression et les cartes SRS associées sont conservées

### Requirement: Sauvegarde automatique avant migration
Avant d'appliquer toute migration du schéma de données, le système MUST créer une copie interne de la base. Si la migration échoue, le système MUST restaurer cette copie et continuer à fonctionner avec la version précédente des données.

#### Scenario: Échec de migration
- **WHEN** une migration échoue lors du lancement d'une nouvelle version
- **THEN** la copie interne est restaurée, aucune progression n'est perdue, et Réglages indique l'erreur

### Requirement: Signalements inclus dans l'export
Le fichier d'export MUST inclure la liste des signalements ⚑ enregistrés.

#### Scenario: Export avec signalements
- **WHEN** l'utilisateur a fait 3 signalements puis exporte sa progression
- **THEN** le fichier exporté contient ces 3 signalements
