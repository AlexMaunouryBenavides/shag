## 1. Spikes et mise en place

- [x] 1.1 Initialiser le dépôt git, le projet Vite + Svelte 5 + TypeScript, Vitest, ESLint/Prettier
- [x] 1.2 Créer le dépôt GitHub public et configurer dès le départ le déploiement GitHub Pages par GitHub Action (build Vite, `base` = sous-chemin du dépôt, scope/start_url du manifeste, chemins du service worker et de l'audio) pour tester sur le téléphone tout au long du développement
- [x] 1.3 Initialiser l'environnement Python du pipeline (`tools/`, `requirements.txt` : pymorphy3, PyYAML, pytest) et un script de téléchargement des données (OpenRussian, Tatoeba rus–fra) vers `data/` (non versionné) ; Lingua Libre est interrogé mot par mot lors de la génération audio (pas d'index)
- [x] 1.4 Spike Piper : générer des échantillons avec les voix russes disponibles, tester la prise en compte des accents fournis, choisir 2–3 voix
- [x] 1.5 Spike SQLite-wasm `opfs-sahpool` dans un Worker sur le téléphone Android réel (création, écriture, relecture après fermeture, export du fichier)
- [x] 1.6 Spike typographie : tester le rendu de l'accent U+0301 avec 3 polices candidates sur le téléphone, choisir et auto-héberger la police

## 2. Pipeline de contenu (socle)

- [x] 2.1 Définir les schémas YAML (programme, vocabulaire, dialogues, grammaire, alphabet, exercices) avec identifiants stables
- [x] 2.2 Implémenter le chargement et la validation structurelle des sources (`build_content.py`), y compris le plafond de 12 nouveaux éléments par jour et les jours de consolidation sans nouveaux éléments
- [x] 2.3 Implémenter la lemmatisation et la vérification de gradation (≥95 %, nouveaux mots déclarés, rapport d'erreur fichier/phrase/mot) + tests pytest
- [x] 2.4 Implémenter l'accentuation depuis OpenRussian avec signalement des ambiguïtés et annotations manuelles (`stress.py`) + tests pytest
- [x] 2.5 Implémenter la génération audio Piper → Opus avec cache par hash (`tts.py`)
- [x] 2.6 Implémenter la substitution audio par un enregistrement humain Lingua Libre pour les mots isolés marqués comme mal prononcés par Piper (liste d'exceptions), avec attribution
- [x] 2.7 Produire le paquet `public/content/pack.json` versionné (avec le dernier jour publié) + audio découpé par phase
- [x] 2.8 Implémenter l'export pour relecture native (`export_review.py`)
- [x] 2.9 Implémenter la lecture des signalements ⚑ depuis un fichier de sauvegarde exporté (`read_flags.py`) pour lister les éléments à corriger

## 3. Couche de données locale

- [x] 3.1 Implémenter le Worker SQLite-wasm et l'interface typée `db.ts` (isolée pour permettre un plan B Dexie)
- [x] 3.2 Créer le schéma initial (dont la table des signalements) et le système de migrations versionnées + tests
- [x] 3.3 Implémenter la copie de sauvegarde interne automatique avant chaque migration, et la restauration en cas d'échec + tests
- [x] 3.4 Demander le stockage persistant au premier lancement et exposer son statut
- [x] 3.5 Implémenter l'export (téléchargement du fichier) et l'import avec confirmation
- [x] 3.6 Implémenter le suivi de la date du dernier export pour le rappel hebdomadaire

## 4. Moteurs : SRS, correction, plan

- [x] 4.1 Intégrer `ts-fsrs` : une carte par élément, notation déduite de la réponse, journal de révisions + tests
- [x] 4.2 Implémenter le choix du format selon la stabilité (reconnaissance → production tapée → production en contexte) avec seuils configurables + tests
- [x] 4.3 Implémenter la sélection des cartes dues avec plafond quotidien, priorisation des retards (et des lettres fragiles du bilan) et entrelacement + tests
- [x] 4.4 Implémenter la normalisation et la correction des réponses (casse, ponctuation, U+0301, ё/е, réponses multiples, Levenshtein ≤ 1 « presque », détection du latin) + tests
- [x] 4.5 Implémenter le moteur de plan : jours de programme, unités statiques et dynamiques, jours de consolidation, états à faire / en cours / faite, curseur de reprise + tests
- [x] 4.6 Implémenter la sélection « Continuer » selon le mode 🔊/🔇, le cas « plus que des unités audio », la fin de journée avec garde-fou (révisions supplémentaires d'abord, puis jour suivant) et la fin du contenu publié + tests
- [x] 4.7 Implémenter l'historique d'activité par jour calendaire

## 5. Coque PWA et design

- [x] 5.1 Charger le skill frontend-design et définir la direction visuelle minimaliste à partir des maquettes validées (tokens couleurs clair/sombre, typographie sans italique pour le russe, espacements, zone du pouce)
- [x] 5.2 Configurer `vite-plugin-pwa` : manifeste, icônes, précache de l'app et du paquet de contenu, mise à jour en arrière-plan
- [x] 5.3 Implémenter le cache audio par phase (phase courante + suivante, cache-first, préchargement en ligne)
- [x] 5.4 Implémenter la navigation : Aujourd'hui central, icônes Plan et Réglages en haut, flèche retour, routage par hash
- [x] 5.5 Implémenter l'écran Aujourd'hui : jour et thème, barre N/8, liste des unités, « Continuer », interrupteur 🔊/🔇, « Journée terminée » avec thème du lendemain et lien secondaire, rappel de sauvegarde, écran « La suite arrive bientôt »
- [x] 5.6 Implémenter l'écran Plan : phase, « Jour N / 140 », pourcentage, objectifs de phase, liste des jours et thèmes, historique d'activité
- [x] 5.7 Implémenter l'écran Réglages : export/import, statut du stockage, date du dernier export, aide clavier russe, crédits et licences

## 6. Exercices et audio

- [x] 6.1 Implémenter le lecteur audio (rejouer, appui long = 0,75×, respect du mode silencieux)
- [x] 6.2 Implémenter le cadre d'exercice commun : écran d'unité (✕ + barre), retour immédiat, forme accentuée, « Suivant » en un tap, « Je ne sais pas », sauvegarde après chaque réponse, mise en page au-dessus du clavier virtuel (`visualViewport`), Entrée pour valider
- [x] 6.3 Implémenter les exercices Saisie et Trous
- [x] 6.4 Implémenter l'exercice Remise en ordre
- [x] 6.5 Implémenter l'exercice Réponse dans un fil
- [x] 6.6 Implémenter l'exercice Écoute
- [x] 6.7 Implémenter l'exercice Oral (Web Speech `ru-RU`, mots reconnus/non reconnus, repli auto-évalué)
- [x] 6.8 Implémenter l'exercice Shadowing
- [x] 6.9 Implémenter le bouton ⚑ « Signaler une erreur » (fiche mot et écran de correction), stocké localement et inclus dans l'export

## 7. Unités

- [x] 7.1 Implémenter l'unité Révision SRS
- [x] 7.2 Implémenter l'unité Nouveaux éléments (≤ 8–9 éléments, présentation puis rappel immédiat, ajout au SRS)
- [x] 7.3 Implémenter l'unité Leçon : fil de messages au tap, mots nouveaux repérés, fiche au tap sur un mot (transcription jusqu'au jour 30), écoute et traduction d'une bulle
- [x] 7.4 Implémenter l'unité Grammaire (explication courte + exercices, rappel des blocs figés liés)
- [x] 7.5 Implémenter l'unité Fluidité (relecture/réécoute d'un dialogue déjà vu)
- [x] 7.6 Implémenter les unités d'alphabet (nouvelle lettre avec avertissement faux ami, lecture de mots, écoute → lettre, saisie ЙЦУКЕН, bilan non bloquant du jour 10)

## 8. Jalon 1 — Contenu « je peux commencer »

- [x] 8.1 Concevoir la structure complète du programme (`program.yaml`) : 140 jours, thèmes, répartition des unités, progression grammaticale « bloc d'abord, règle ensuite », jours de consolidation, liste de fréquence de référence
- [x] 8.2 Rédiger la phase 0 (jours 1–10 : lettres, mots utiles, accent tonique, clavier, mots de survie, bilan) et la faire passer la validation
- [x] 8.3 Rédiger les personnages récurrents et les jours 11–24 de la phase 1, validés par le pipeline
- [x] 8.4 Générer l'audio du jalon 1, écouter un échantillon et corriger les accents (exceptions Lingua Libre si nécessaire)
- [x] 8.5 Exporter les jours 1–20 pour une relecture native optionnelle

## 9. Jalon 1 — Vérification et publication

- [x] 9.1 Vérifier sur le téléphone Android : installation, mode avion, reprise après interruption, mode silencieux, thème sombre, clavier virtuel
- [x] 9.2 Vérifier sur le téléphone : audio, reconnaissance vocale, export/import d'une sauvegarde, migration avec sauvegarde automatique
- [ ] 9.3 Faire un parcours complet des jours 1–3 en conditions réelles, corriger les frictions UX (durées des unités, ergonomie)
- [x] 9.4 Publier le jalon 1 — l'utilisateur commence le programme

## 10. Jalon 2 — Fin de la phase 1 (jours 25–55)

- [ ] 10.1 Intégrer les retours d'usage des premiers jours (rythme, durées, signalements ⚑) dans `program.yaml` et le contenu existant
- [ ] 10.2 Rédiger les jours 25–55 (dont le prépositionnel et le passé), validés par le pipeline
- [ ] 10.3 Générer et vérifier l'audio, intégrer les corrections de relecture native
- [ ] 10.4 Publier le jalon 2 avant que l'utilisateur n'atteigne le jour 24 (avance ≥ 2 semaines)

## 11. Jalon 3 — Phase 2, première moitié (jours 56–97)

- [ ] 11.1 Traiter les signalements ⚑ et retours en attente
- [ ] 11.2 Rédiger les jours 56–97 (accusatif, futur, génitif, aspect), validés par le pipeline
- [ ] 11.3 Générer et vérifier l'audio
- [ ] 11.4 Publier le jalon 3 avec ≥ 2 semaines d'avance sur la position de l'utilisateur

## 12. Jalon 4 — Phase 2, seconde moitié (jours 98–140)

- [ ] 12.1 Traiter les signalements ⚑ et retours en attente
- [ ] 12.2 Rédiger les jours 98–140 (verbes de mouvement, datif, instrumental, -ся, impératif, révision générale, bilan final), validés par le pipeline
- [ ] 12.3 Générer et vérifier l'audio
- [ ] 12.4 Publier le jalon 4 — programme complet
