# yuning visuals

Portfolio de Yuning, créateur de contenu UGC — scène 3D cartoon en porte d'entrée,
puis un « faux OS » 2D qui structure le contenu.

Le concept, la direction artistique et les décisions techniques sont documentés
dans [CLAUDE.md](./CLAUDE.md).

## Démarrer

```bash
npm run dev
```

## Stack

- **Next.js 16** (App Router) + TypeScript, déployé sur Vercel — `yuningvisuals.live`
- **Tailwind CSS v4** — les tokens de la charte sont dans `app/globals.css` (bloc `@theme`)
- **React Three Fiber / Three.js / drei / postprocessing** — scène 3D du bureau
- **GSAP** — transition caméra vers l'écran, ouverture des « fenêtres » de l'OS

## Structure

```
app/                  routes et layout
components/scene3d/   scène 3D du bureau (Canvas, éclairage, modèles)
components/os/        le faux OS 2D (menu, fenêtres, sections)
components/ui/        primitives partagées entre 3D et OS
lib/                  helpers (palette partagée avec Three, cel-shading, hooks)
references/           images de direction artistique
```

La palette existe en deux endroits : les tokens CSS de `app/globals.css` pour le
DOM, et `lib/palette.ts` pour Three.js qui ne sait pas lire les variables CSS.
Les deux doivent rester synchronisés.
