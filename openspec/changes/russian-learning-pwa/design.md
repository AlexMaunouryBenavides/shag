## Context

Projet personnel, dépôt vierge. Un seul utilisateur, francophone, zéro absolu en russe, sur Android (Chrome). Il veut atteindre A1–A2 en 4–6 mois à raison de 20–25 min/jour, en sessions courtes et interrompables (au réveil, en attente). Contraintes fortes :
- **0 €** : pas de serveur payant, pas d'API payante.
- **Pas de LLM à l'exécution** : la pratique libre se fait avec des natifs sur HelloTalk ; l'app construit les bases.
- **Zéro décision côté utilisateur** : ouvrir l'app → « Continuer » → faire ce qui est prévu.
- **Minimalisme** visuel et fonctionnel, mobile-first ; l'UI est conçue avec le plugin frontend-design.

Fondements pédagogiques retenus : Four Strands (Nation), répétition espacée + récupération active (FSRS), input gradué ≥95 % de mots connus, grammaire explicite courte, entrelacement, shadowing, apprentissage par blocs d'expressions (« chunks »).

## Goals / Non-Goals

**Goals:**
- PWA statique, hors ligne, installable, sans backend.
- Un moteur de plan déterministe qui transforme le programme en unités du jour.
- Un pipeline de contenu qui garantit la gradation et l'exactitude des accents avant même que le contenu n'arrive dans l'app.
- Une base de code TypeScript simple, lisible par l'utilisateur (profil JS/TS).

**Non-Goals:**
- LLM, correction de texte libre, conversation simulée.
- Synchronisation multi-appareils, comptes, backend.
- Gamification (séries, points, badges, classements, célébrations).
- Notifications push et réglages de difficulté/rythme : le plan décide.
- iOS / navigateurs desktop comme cibles prioritaires (ils peuvent fonctionner, sans garantie).
- Import de messages HelloTalk (v1.1), écriture cursive.

## Decisions

### 1. Architecture générale : PWA statique local-first

```
┌──────────────── DÉVELOPPEMENT (PC) ─────────────────┐
│ content/*.yaml ──▶ pipeline Python ──▶ public/content│
│   (programme,        • pymorphy3 (lemmes)   pack.json│
│    vocabulaire,      • OpenRussian (accents) audio/  │
│    dialogues)        • Tatoeba (phrases)     *.opus  │
│                      • Piper TTS (audio)             │
└──────────────────────────┬──────────────────────────┘
                           │ vite build
                           ▼
              Hébergement statique (GitHub Pages)
                           │
┌──────────────── TÉLÉPHONE ───────▼──────────────────┐
│ Service worker (cache app + contenu + audio)        │
│ UI Svelte ──▶ moteur de plan ──▶ moteur d'exercices │
│                  │                     │            │
│                  ▼                     ▼            │
│           ts-fsrs (planif.)   SQLite-wasm (Worker)  │
│                                état utilisateur     │
└─────────────────────────────────────────────────────┘
```

Le **contenu** (immuable, versionné) et l'**état utilisateur** (mutable) sont strictement séparés : le contenu est un paquet JSON chargé en mémoire, l'état vit dans SQLite et ne référence le contenu que par identifiants stables.

*Alternative écartée :* un backend (API + SQLite serveur). Inutile sans synchronisation, impose réseau, authentification et un hébergement gratuit fragile.

### 2. Front-end : Vite + Svelte 5 + TypeScript

Svelte produit un bundle très léger (important sur mobile), sa syntaxe reste proche de HTML/JS donc lisible pour l'utilisateur. Trois écrans → routage par hash minimal, pas besoin de SvelteKit.

*Alternatives :* React (plus lourd, plus de boilerplate), Preact (viable, équivalent), vanilla TS (trop de code UI à la main pour les exercices).

### 3. Stockage : SQLite-wasm avec le VFS `opfs-sahpool`, dans un Web Worker

`@sqlite.org/sqlite-wasm` (build officiel) avec le VFS **`opfs-sahpool`**, qui ne nécessite **pas** les en-têtes COOP/COEP — indispensable car les hébergeurs statiques gratuits ne permettent pas toujours de les définir. La base tourne dans un Worker ; l'UI communique via une petite couche de messages typée (`db.ts`). Export = copie du fichier `.sqlite` ; import = remplacement après confirmation.

`navigator.storage.persist()` est demandé au premier lancement.

*Alternative :* IndexedDB via Dexie. Plus simple, mais l'utilisateur a exprimé une préférence pour SQLite et le SQL facilite les requêtes de suivi (historique, stats). Dexie reste le plan B si `opfs-sahpool` pose problème sur l'appareil cible.

Schéma initial (indicatif) :

```
meta(key, value)                     -- version schéma, version contenu, réglages
program_progress(day, status, started_at, completed_at)
unit_progress(day, unit_index, status, cursor_json, updated_at)
cards(card_id, content_id, kind, direction, fsrs_state_json, due, introduced_day)
review_log(id, card_id, ts, rating, elapsed_ms, fsrs_snapshot_json)
activity(date, units_done)           -- historique par jour calendaire
```

### 4. Répétition espacée : `ts-fsrs`

Implémentation de référence de FSRS en TypeScript. Paramètres par défaut, rétention cible 0,9. Notation déduite de la réponse (faux → Again, juste → Good, geste optionnel Hard/Easy). Plafond quotidien : nombre de cartes calculé pour remplir les unités SRS du jour (~25–30 cartes/unité), tri par retard relatif.

**Budget de charge.** Règle empirique : révisions quotidiennes ≈ 10 × nouveaux éléments par jour. Le plan initial (~14 nouveaux/jour en phase 1) aurait donné ~140 révisions/jour (~19 min), intenable. Décisions :
- rythme lissé à **~8–9 nouveaux éléments/jour** (≈400 éléments en phase 1, ≈650 en phase 2, ≈1050 au total) → ~80–90 révisions/jour ;
- **une seule carte par élément**, dont le format évolue avec la stabilité FSRS (reconnaissance → production tapée → production en contexte), au lieu de deux cartes (une par sens) qui doubleraient la charge ;
- **3 unités de révision par jour** (~9–10 min, ~85 cartes à ~4–8 s).

Le pipeline vérifie le plafond de nouveaux éléments par jour ; l'app plafonne les révisions dues.

*Alternative écartée :* deux cartes par élément (modèle Anki classique) — plus exhaustif mais double la charge et la rend incompatible avec 20–25 min/jour.

**Exemple de jour type (jour 15 · « Au café »)** : Révision → Nouveaux éléments (чай, вода́, сок, ко́фе, хочу́/хо́чешь, и́ли…) → Leçon (fil Ма́ша ↔ Анто́н) → Révision → Grammaire (la question par l'intonation) → Écoute/shadowing 🔊 → Révision → Écriture. Les formes non encore expliquées (ex. accusatif « во́ду ») sont admises comme blocs figés dès lors que leur lemme est connu.

### 5. Moteur de plan déterministe

Le programme est une liste de jours ; chaque jour est une liste ordonnée de définitions d'unités. Certaines unités sont **statiques** (leçon X, grammaire Y, nouveaux éléments Z) ; les unités **SRS** sont **dynamiques** et tirent les cartes dues au moment où elles démarrent.

```
          ┌─────────┐  Continuer   ┌──────────┐ dernière   ┌──────┐
 à faire ─▶│ à faire │────────────▶│ en cours │──réponse──▶│ faite│
          └─────────┘             └──────────┘            └──────┘
                ▲                   │ quitter                 │
                │                   ▼ (curseur sauvegardé)    │
                └──────────── reprise au même point ──────────┘

  Sélection « Continuer » = première unité non faite du jour
                            ET compatible avec le mode (🔊/🔇)
```

Les jours avancent quand toutes leurs unités sont faites, jamais avec le calendrier. Jour terminé → possibilité d'ouvrir le suivant (lien secondaire).

### 6. Pipeline de contenu en Python

Python car les meilleurs outils de morphologie russe y sont (`pymorphy3`). Sources en **YAML** (lisible, facile à relire et à éditer) :

```
content/
  program.yaml          # phases + squelette des 140 jours (thème, type, slot5/slot8)
  characters.yaml       # personnages récurrents
  stress.yaml           # formes accentuées faisant autorité (noms propres, ambiguïtés)
  audio_exceptions.yaml # mots à remplacer par un enregistrement Lingua Libre
  days/dNNN.yaml        # un fichier par jour : lettres, éléments, dialogue, grammaire, exercices
tools/
  build_content.py      # valide + compile → public/content/pack.json (+ audio)
  shag/                 # model, grading (pymorphy3), stress (OpenRussian), translit, units, tts, lingualibre
  export_review.py      # export Markdown pour relecture native
  read_flags.py         # lecture des signalements ⚑ d'une sauvegarde
data/                   # dumps OpenRussian, Tatoeba (non versionnés, téléchargés par script)
```

Un fichier par jour (plutôt qu'un fichier par type de contenu) : le jour est l'unité de rédaction, de relecture et de publication. Le pipeline compose aussi les unités de chaque jour (gabarits par type de jour) et génère les exercices automatiques (écoute, oral, remise en ordre, phrases à trou du SRS) ; le paquet contient donc des unités entièrement résolues, et l'app ne compose dynamiquement que les révisions SRS.

Étapes de validation (le build échoue au moindre écart) : lemmatisation → vérification que chaque lemme est introduit à un jour ≤ jour courant (≥95 %, nouveaux mots déclarés) → accentuation depuis OpenRussian, ambiguïtés exigeant une annotation manuelle → unicité et stabilité des identifiants.

**Rédaction du contenu** : les dialogues et exercices sont rédigés pendant l'implémentation (par l'assistant de développement), sous contrainte du vocabulaire autorisé, puis passent la validation. Les phrases de Tatoeba (rus–fra) servent de complément pour les cartes de phrases, filtrées par vocabulaire autorisé. Relecture native optionnelle via `export_review.py`.

### 7. Audio : Piper TTS, Opus, cache incrémental

Voix russes Piper (ex. `ru_RU-irina`, `ru_RU-denis`, `ru_RU-dmitri`) : une voix par personnage récurrent pour aider la compréhension. Encodage Opus mono ~24 kb/s (≈ 5–10 Ko par mot, 15–30 Ko par phrase). Volume estimé : ~5 000 clips → ~40–60 Mo au total. Noms de fichiers = hash du texte normalisé + voix, ce qui rend la régénération incrémentale.

**Substitution humaine** : pour les mots isolés que Piper prononce mal (liste d'exceptions), utilisation d'un enregistrement **Lingua Libre** (projet Wikimedia, licence libre) quand il existe, avec attribution. On ne l'utilise pas partout, car la qualité des enregistrements varie.

*Alternatives :* synthèse vocale du navigateur (pas hors ligne garanti, qualité variable, pas de contrôle de l'accent) ; edge-tts (meilleure qualité mais service non officiel).

### 8. Service worker et cache

`vite-plugin-pwa` (Workbox). L'application et `pack.json` sont précachés. L'audio est mis en cache **par phase** : la phase courante et la suivante sont téléchargées en arrière-plan quand le téléphone est en ligne, en stratégie cache-first. Évite un premier chargement de 50 Mo.

### 9. Reconnaissance vocale : Web Speech API (`webkitSpeechRecognition`, `ru-RU`)

Gratuite sur Chrome Android (traitement par les serveurs Google, donc réseau requis). Comparaison transcription/attendu avec la même normalisation que les exercices tapés. Repli automatique en auto-évaluation si indisponible.

### 10. Correction des réponses

Normalisation commune : minuscules, suppression de la ponctuation et des accents combinants (U+0301), ё → е, espaces compactés. Détection du latin tapé à la place du cyrillique. Distance de Levenshtein ≤ 1 → « presque ». Plusieurs réponses acceptées par exercice.

### 11. Design et typographie

UI conçue avec le plugin **frontend-design** lors de l'implémentation : minimaliste, une action principale par écran, bouton principal dans la zone du pouce, thème clair/sombre système. Structure validée par maquettes : Aujourd'hui est l'écran central (thème, barre N/8, liste des unités, « Continuer ») ; Plan et Réglages via deux icônes en haut, sans barre d'onglets ; écran d'unité réduit à ✕ + barre de progression + exercice. Les exercices tapés sont mis en page dans la moitié haute (le clavier Android occupe la moitié basse), Entrée valide (gérer `visualViewport` pour le redimensionnement). Retours « juste / presque / faux » en couleurs discrètes, sans animation festive. Jamais d'italique pour le russe (les formes italiques cyrilliques т/и/д diffèrent des formes droites) : la mise en évidence passe par la graisse ou la couleur. Police auto-hébergée (hors ligne) avec un très bon rendu du cyrillique **et de l'accent combinant U+0301** (à valider : Noto Sans, PT Sans, Inter) — de nombreuses polices décalent mal l'accent.

### 12. Hébergement : GitHub Pages (dépôt public)

Le dépôt est public (l'utilisateur l'accepte), donc GitHub Pages est gratuit et évite de connecter un service tiers. Déploiement par une GitHub Action (build Vite → `actions/upload-pages-artifact` → `actions/deploy-pages`) à chaque push sur la branche principale. HTTPS inclus (requis pour la PWA et le micro).

Point d'attention : le site est servi sous un sous-chemin (`https://<utilisateur>.github.io/<dépôt>/`). Le `base` de Vite, le `scope` et le `start_url` du manifeste, ainsi que les chemins du service worker et de l'audio doivent tous en tenir compte.

Le dépôt ne contient aucun secret. Les données tierces brutes (`data/`) ne sont pas versionnées ; le contenu dérivé publié porte l'attribution exigée par les licences (OpenRussian CC-BY-SA, Tatoeba CC-BY).

*Alternative :* Cloudflare Pages (utile seulement pour un dépôt privé ou des en-têtes HTTP personnalisés, inutiles ici grâce au VFS `opfs-sahpool`).

### 13. Tests

Vitest pour la logique pure (moteur de plan, normalisation/correction, intégration FSRS, migrations). Pytest pour le pipeline (lemmatisation, gradation, accentuation). Tests manuels sur le téléphone Android réel pour l'installation, l'audio et la reconnaissance vocale.

## Risks / Trade-offs

- **[Qualité du russe rédigé à l'avance]** → validation automatique stricte (vocabulaire, accents), complément Tatoeba (phrases humaines), relecture native optionnelle des premiers jours en priorité.
- **[Piper place mal certains accents]** (phonémisation espeak-ng) → fournir le texte avec accents explicites quand la voix les prend en compte ; écoute d'échantillons ; liste d'exceptions corrigées manuellement ; possibilité de remplacer un clip par un enregistrement humain.
- **[Perte des données locales]** → stockage persistant, export en un tap, rappel hebdomadaire.
- **[`opfs-sahpool` instable sur l'appareil]** → couche d'accès aux données isolée derrière une interface ; plan B Dexie/IndexedDB.
- **[Reconnaissance vocale imparfaite pour un débutant]** → tolérance, affichage des mots reconnus, toujours possible de passer ; jamais bloquant.
- **[Volume de contenu à produire (~140 jours)]** → produire et valider par phase ; l'app est utilisable dès que la phase 0 et le début de la phase 1 sont prêts, la suite est ajoutée par mises à jour (identifiants stables).
- **[Le programme fixe ne convient pas au rythme réel]** → avancement par jours de programme et non par calendrier ; possibilité d'avancer d'un jour ; ajustement du programme par simple édition du YAML.
- **[Rendu de l'accent U+0301]** → police choisie et testée sur l'appareil réel dès le début.

## Migration Plan

**Livraison par jalons**, pour que l'utilisateur commence à apprendre au plus tôt et que ses premiers jours réels servent de test :
- **Jalon 1** : app complète + phase 0 (jours 1–10) + jours 11–24 ;
- **Jalon 2** : jours 25–55 (fin de phase 1), après intégration des retours d'usage ;
- **Jalon 3** : jours 56–97 ;
- **Jalon 4** : jours 98–140.

Règle : le contenu publié garde toujours au moins 2 semaines d'avance sur la position de l'utilisateur. Si elle est rattrapée, l'app bascule sur « La suite arrive bientôt » (révisions et fluidité). Les signalements ⚑, inclus dans l'export, sont traités au début de chaque jalon.

Avant toute migration du schéma, l'app crée une copie interne de la base et la restaure en cas d'échec.

Nouveau projet, pas de migration existante. Déploiement continu : chaque push sur la branche principale déclenche une GitHub Action qui construit et publie sur GitHub Pages. Les mises à jour de contenu conservent les identifiants ; le schéma SQLite porte un numéro de version et des migrations séquentielles. Retour arrière : redéployer une version précédente (les données locales restent compatibles si les migrations sont additives).

## Résultats des spikes

- **Piper (1.4)** : les accents explicites (U+0301) sont respectés par la phonémisation espeak-ng (за́мок → `zˈɑmʌk`, замо́к → `zamˈok` ; му́ка / мука́ ; пи́сать / писа́ть). Le texte envoyé à Piper porte donc toujours les accents issus du dictionnaire. Clips Opus 24 kHz : 3 à 12 Ko (volume total estimé < 40 Mo). Opus encodé via `soundfile` (libsndfile), sans ffmpeg, après rééchantillonnage 22 050 → 24 000 Hz. Voix provisoires : `irina` (personnage féminin, voix par défaut) et `denis` (personnage masculin), à confirmer à l'écoute.
- **SQLite-wasm (1.5)** : `opfs-sahpool` dans un Worker fonctionne sur Chrome desktop sans en-têtes COOP/COEP (chargement ~80 ms, persistance après rechargement, export OK). Page de test `spike-sqlite.html` à valider sur le téléphone.
- **Typographie (1.6)** : Inter place mal l'accent combinant (décalé à droite des minuscules), Golos Text échoue sur « ы́ ». **Noto Sans** et PT Sans sont corrects ; choix : **Noto Sans** (`@fontsource/noto-sans`, sous-ensembles cyrillic + latin), PT Sans en repli. Page de test `spike-fonts.html` à valider sur le téléphone.

## Open Questions

- Confirmation à l'écoute des voix Piper (échantillons dans `tools/.cache/spike_audio/`).
- Confirmation sur le téléphone : rendu de Noto Sans et persistance SQLite.
- L'amie de HelloTalk accepterait-elle de relire un échantillon (jours 1–20) ?
- Liste de fréquence de référence pour les ~1000 mots (corpus national russe vs listes OpenRussian) → décider pendant la conception du programme.
