## Why

Je veux apprendre le russe en partant de zéro absolu, jusqu'à un niveau A1–A2 qui me permette d'échanger par messages et à l'oral avec des russophones sur HelloTalk. Les apps existantes se concentrent sur des exercices gamifiés et isolés ; je veux un outil personnel, gratuit, qui applique les méthodes reconnues par la recherche (Four Strands de Nation, répétition espacée, récupération active, input gradué) et qui me dise simplement quoi faire chaque jour, sans que j'aie à réfléchir.

## What Changes

- Création d'une **PWA mobile-first** (Android / Chrome), installable, entièrement **hors ligne**, hébergée gratuitement en statique, **sans backend et sans LLM à l'exécution**.
- Un **plan fixe de 4 à 6 mois** découpé en phases (0 : alphabet ; 1 : ~400 éléments, expressions de chat et mots fréquents ; 2 : ~1050 éléments au total, cas, passé, verbes de mouvement), à un rythme lissé de ~8–9 nouveaux éléments par jour et un thème situationnel par jour. L'app génère automatiquement les tâches du jour : l'utilisateur ouvre l'app et fait ce qui est prévu.
- Un **jour = ~8 unités de 3 minutes** (20–25 min), interrompables et sauvegardées une par une, avec un **mode audio 🔊** et un **mode silencieux 🔇**.
- **Répétition espacée FSRS** sur lettres, mots, expressions et phrases.
- **Dialogues gradués au format messagerie** (≥95 % de mots connus), avec accents toniques toujours affichés et audio.
- **Exercices contraints** : saisie au clavier ЙЦУКЕН, textes à trous, remise en ordre, choix de réponse dans un fil, écoute, répétition orale (reconnaissance vocale Chrome `ru-RU`).
- **Stockage local** SQLite-wasm (OPFS) avec **export/import de sauvegarde**.
- **Pipeline de contenu exécuté au développement** : contenu rédigé à l'avance, validé automatiquement (lemmatisation pymorphy3, accents via le dictionnaire OpenRussian, phrases Tatoeba), audio généré avec Piper TTS, relecture native optionnelle.
- **Livraison par jalons** : l'app et les jours 1–24 d'abord, puis le reste du contenu par mises à jour, toujours avec au moins 2 semaines d'avance sur la progression. Un bouton ⚑ permet de signaler une erreur de contenu.
- **Design et fonctionnalités minimalistes** (UI conçue avec le plugin frontend-design). Pas de gamification : un plan visible et le suivi quotidien suffisent.

Hors périmètre v1 : LLM, synchronisation multi-appareils, gamification, notifications/rappels, réglages de difficulté ou de rythme, import de messages HelloTalk (prévu v1.1), écriture cursive.

## Capabilities

### New Capabilities
- `app-shell` : PWA installable, hors ligne, mobile-first, navigation minimale (écran Aujourd'hui, écran Plan, réglages).
- `daily-plan` : programme fixe en phases/semaines/jours, génération des unités du jour, modes 🔊/🔇, suivi de la progression et rattrapage des jours manqués.
- `alphabet` : phase 0 — apprentissage du cyrillique, décodage de mots transparents, prise en main du clavier russe.
- `srs-review` : répétition espacée FSRS des cartes (lettres, mots, expressions, phrases).
- `lessons` : leçons du programme — dialogues gradués au format messagerie, points de grammaire explicites, introduction du nouveau vocabulaire.
- `exercises` : types d'exercices réutilisables (saisie, trous, ordre, choix de réponse, écoute, oral, shadowing) et leur correction.
- `audio-speech` : lecture de l'audio pré-généré et reconnaissance vocale russe pour les exercices oraux.
- `local-data` : persistance locale SQLite-wasm, stockage persistant, export/import de sauvegarde.
- `content-pipeline` : outillage de développement pour produire, valider et empaqueter le contenu (curriculum, dialogues, audio).

### Modified Capabilities
<!-- Aucune : projet vierge, pas de spec existante. -->

## Impact

- Nouveau projet : application front-end TypeScript (PWA) + scripts de contenu en Python, dans ce dépôt.
- Dépendances principales : `ts-fsrs`, `@sqlite.org/sqlite-wasm`, un framework UI léger, outillage PWA (service worker) ; côté pipeline : `pymorphy3`, données OpenRussian et Tatoeba, Piper TTS.
- Données tierces sous licences libres (OpenRussian CC-BY-SA, Tatoeba CC-BY) : attribution requise dans l'app.
- Aucun service externe à l'exécution, coût d'hébergement nul (GitHub Pages, dépôt public, déploiement par GitHub Action).
