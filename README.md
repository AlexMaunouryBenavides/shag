# Шаг — le russe pas à pas

Application personnelle (PWA, hors ligne, mobile-first) pour apprendre le russe de zéro jusqu'au niveau A1–A2 en suivant un plan fixe de ~140 jours, à raison de 20–25 minutes par jour.

- Spécification et conception : `openspec/changes/russian-learning-pwa/`
- Application : Vite + Svelte 5 + TypeScript (`src/`)
- Pipeline de contenu : Python (`tools/`), sources du contenu dans `content/`

## Développement

```bash
npm install
npm run dev      # serveur local
npm test         # tests unitaires (Vitest)
npm run check    # vérification des types
npm run build    # build de production
```

Le déploiement sur GitHub Pages est automatique à chaque push sur `main`.

## Crédits

Données sous licence libre : [OpenRussian](https://en.openrussian.org) (CC BY-SA), [Tatoeba](https://tatoeba.org) (CC BY 2.0 FR), voix [Piper](https://github.com/rhasspy/piper), enregistrements [Lingua Libre](https://lingualibre.org).
