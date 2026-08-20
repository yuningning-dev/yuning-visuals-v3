# CLAUDE.md

## Vue d'ensemble du projet

Portfolio personnel de **Yuning**, créateur de contenu UGC (yuning-visuals). Le site est une expérience narrative en deux temps : une scène 3D stylisée (bureau) qui sert de porte d'entrée, puis un "faux OS" en 2D qui structure le reste du contenu.

Objectif : se démarquer des portfolios génériques, éviter tout rendu "AI slop" (pas de gradients violets par défaut, pas d'icônes/illustrations génériques, pas de mise en page template). Chaque choix visuel doit être intentionnel.

## Structure de l'expérience

### 1. Chargement initial
Petit écran de chargement avant d'entrer dans la scène 3D.

### 2. Scène 3D — le bureau (desktop uniquement)
- Bureau en **3D stylisé façon cartoon** (cel-shading / toon shading, formes simplifiées et arrondies, palette de couleurs franches, pas de réalisme photo). **Référence de style : https://bruno-simon.com/** — low-poly cartoon simple mais très soigné, peu de détails mais exécution propre (éclairage doux, formes reconnaissables en peu de polygones). Ne pas viser un niveau de détail élevé.
- Éléments : écran allumé, clavier, souris, tapis de souris, un appareil photo, un DJI Osmo Pocket 4.
- Un post-it collé sur l'écran (desktop uniquement) avec un texte du type "click the monitor to access or scroll down", dans une police toujours cartoon — sert d'indice visuel pour l'interaction avec l'écran.
- Une fenêtre sur le mur derrière l'écran, pour permettre des effets de lumière (ambiance/éclairage de la scène).
- L'écran affiche une texture/canvas qui donne un aperçu du "faux OS" décrit plus bas.
- **Interaction pour zoomer sur l'écran : scroll ET clic direct sur l'écran** (les deux doivent fonctionner, pas l'un ou l'autre). Prévoir un indice visuel discret (hover, légère lueur) qui signale que l'écran est cliquable.
- Une fois zoomé, transition vers l'interface 2D (le faux OS prend tout l'écran).
- **Retour possible** vers la scène 3D du bureau à tout moment en cliquant sur le logo/nom du site dans le faux OS.

### 3. Le "faux OS" (interface 2D)
Metaphore d'un système d'exploitation, pas d'un logiciel de montage unique — plus lisible et navigable pour un visiteur pressé.

- **Menu du haut** : glass UI façon Apple (effet verre dépoli/blur), toujours visible, uniquement des libellés texte (pas d'icônes, hormis le logo de la marque "yuning visuals").
- **Sections = "fenêtres/applis"** qui s'ouvrent en **vues plein écran stylisées** imitant visuellement des fenêtres qui s'ouvrent. **Important : ce ne sont PAS de vraies fenêtres draggable/redimensionnables** — juste une animation d'ouverture qui donne cette impression. Pas de vrai système de fenêtrage à implémenter.

Sections, dans l'ordre :
1. **Home** — le bureau / hero
2. **Manifesto** — "what I believe", positionnement personnel
3. **Selected Works** — la preuve par l'exemple, **3-4 projets maximum** (qualité > quantité). Cette section garde l'esprit "éditeur vidéo" : les projets apparaissent sur une timeline colorée (un bloc coloré + titre par projet), cliquer sur un projet l'affiche dans un preview central façon moniteur de montage.
4. **Services / Offres** — scope de ce qui est proposé
5. **About Me** — présentation personnelle, ce qui différencie Yuning
6. **Contact** — Calendly intégré + option d'envoi de mail direct
7. **Footer** — métadonnées, réseaux sociaux

- **Changement de langue** : accessible depuis le menu du haut.

## Charte visuelle

- **Style cartoon** pour la 3D : cel-shading, formes arrondies/simplifiées, pas de réalisme.
- **Chaque section/app peut avoir un visuel distinct** (comme des vraies applis différentes sur un OS) — **les couleurs peuvent varier d'une section à l'autre**, mais toutes doivent respecter une **charte commune stricte** sur la typographie et le style d'icônes. L'unité vient de la charte (typo + icônes), pas de gabarits identiques.
- Éviter tout ce qui ressent le générique/template : pas de stock icons Lucide/Heroicons non retravaillées si évitable, pas de dégradés par défaut, pas de mise en page "hero + 3 colonnes + footer" sans réflexion.

## Comportement responsive (mobile)

- **Sur mobile, la métaphore "faux OS" est abandonnée.** Version simplifiée en scroll classique, sections empilées verticalement.
- La scène 3D et son interaction (scroll/clic sur écran) restent à valider spécifiquement pour mobile — anticiper une version dégradée ou alternative si les perfs WebGL posent problème sur petits appareils.

## Stack technique

- **Framework** : Next.js (App Router), déployé sur **Vercel** avec le nom de domaine custom **yuningvisuals.live**
- **3D** : Three.js / React Three Fiber pour la scène du bureau, Drei pour les helpers (chargement de modèles, contrôles caméra), @react-three/postprocessing pour les effets de lumière (via la fenêtre du mur) et le rendu toon/cartoon
- **Animations** : GSAP + ScrollTrigger pour la transition scroll/clic → zoom caméra et l'ouverture des "fenêtres" du faux OS ; Framer Motion en option pour les micro-animations UI
- **Style** : Tailwind CSS, avec la charte (typographie, style d'icônes) centralisée en tokens pour garantir la cohérence entre sections malgré des couleurs qui peuvent varier
- **Modèles 3D** : formats .glb/.gltf, composants générés via gltfjsx (Drei)
- **Vidéo** : hébergement sur **Cloudflare Stream** (streaming adaptatif HLS/DASH, CDN mondial) pour éviter tout lag au chargement/lecture des 3-4 vidéos UGC — ne pas héberger les fichiers vidéo directement sur Vercel
- **Performance** : priorité générale sur l'optimisation pour éviter tout lag — modèles 3D légers/optimisés (low-poly volontaire, compression Draco pour les .glb), lazy loading des assets lourds, attention particulière aux perfs sur la scène 3D (limiter le nombre de lights/effets post-processing coûteux)
- *(à compléter au fur et à mesure des décisions techniques)*

## Notes de statut

- **Étape 1 faite** : projet initialisé (Next.js 16 App Router + TypeScript + Tailwind v4,
  three/R3F/drei/postprocessing/gsap installés, structure `app` `components/{scene3d,os,ui}` `lib`,
  tokens de charte dans `app/globals.css`, hello world 3D cel-shadé validé dans le navigateur).
- **Direction lumière validée (19/08/2026) : « Crépuscule saturé »** — paire complémentaire
  corail (sol, grandes surfaces) / turquoise (objets, accents) sur ciel prune, clé chaude
  volontairement peu saturée, cel-shading à 3 paliers. Comparée à deux alternatives écartées
  (« Nuit chaude » : trop de noir, la pièce disparaît ; « Heure bleue » : trop peu d'énergie).
  Palette promue dans `lib/palette.ts` + les tokens `@theme` de `app/globals.css`.
  Deux contraintes à retenir : une clé trop orangée écrase le canal bleu et fait virer le
  turquoise au vert ; en dessous de 3 paliers le volume se lit à plat.
- Les accents par section (`--color-app-*`) datent de l'ancienne base bleu nuit et
  n'ont pas encore été confrontés à la base prune/corail — à revalider au design des sections.
- **Tout est modélisé en primitives, aucun asset externe** — sauf l'appareil photo,
  chargé depuis `public/models/camera.glb` (export Sketchfab, Z-up, pivot au sommet ;
  échelle et assiette recalculées depuis la boîte englobante réelle, pas en dur).
  Ses matériaux d'origine sont remplacés par la palette du projet : un modèle importé
  qui garde ses propres gris casse le cel-shading de toute la scène.
- **Les effets de lumière sont de fausses lumières** (`components/scene3d/effects/`) :
  faisceau de fenêtre, flaques au sol et sur le plateau, glare de dalle, rebond d'écran,
  halo de lampe. Quads additifs, `depthWrite: false` / `depthTest` actif. Aucune réflexion
  planaire — elle rendrait la scène une seconde fois par surface pour un écart invisible
  en aplats. Ces effets sont découplés des presets : ils rendent la lumière visible sans
  changer l'éclairage des matériaux.
- **Les textures sont procédurales** (`lib/textures.ts`) : veine de bois, tissage du
  tapis, grain de plâtre, dégradé du diffuseur — dessinées sur canvas au premier usage,
  aucun fichier image. Elles sont générées en NUANCES DE BLANC : un `map` multiplie la
  couleur de base, donc la texture n'apporte que le grain et `palette.ts` garde la main
  sur la teinte. Seul le diffuseur de lampe porte une vraie couleur, parce que là la
  teinte est l'effet.
- **Bloom + vignettage** via `@react-three/postprocessing` (`components/scene3d/PostFX.tsx`).
  Le bloom porte la signature des références : sans lui les surfaces émissives restent
  des aplats découpés. Deux réglages seulement à toucher — `luminanceThreshold` (calé
  haut : plus bas, le mur corail rayonne et tout part en brouillard) et `intensity`.
  Le composer court-circuite le MSAA du renderer, d'où `antialias` retiré du `gl`.
- **`multisampling` de l'EffectComposer est à 0, et doit y rester** (19/08/2026).
  Sur ANGLE Metal (Apple Silicon), la résolution du buffer multi-échantillonné du
  composer ne recouvre qu'une bande de la cible et laisse le reste à zéro : un grand
  rectangle noir mange les deux tiers gauches de la scène. Cassé à 4 comme à 2
  échantillons — c'est le chemin MSAA lui-même, pas un plafond (`MAX_SAMPLES` y vaut 4).
  Ce qui isole le coupable : la scène rendue directement dans le framebuffer par défaut
  est intacte, seule la sortie du composer est trouée. L'antialiasing est donc repris
  par `<SMAA />`, un filtre d'image sans cible multi-échantillonnée — même rendu sur
  tous les GPU. Placé en dernier : effet de convolution, il a sa propre passe, appliquée
  sur l'image déjà bloomée et vignettée.
- **La `pointLight` de la lampe ne projette pas d'ombre** — une seconde shadow map
  doublerait le coût du rendu. Le relief reste porté par la clé directionnelle.
- **Deux réglages Three à ne pas défaire par inadvertance** :
  `toneMapping: NoToneMapping` (le ACES Filmic par défaut de R3F désature les aplats
  et fait mentir la palette), et `shadow.camera.updateProjectionMatrix()` dans `KeyLight`
  (R3F écrit les bornes du frustum d'ombre mais Three ne recalcule pas la matrice).
- **Le canvas est en `fixed inset-0`** (`SceneCanvas`), pas dans une chaîne de hauteurs
  en pourcentage : R3F le dimensionne via un ResizeObserver, qui a besoin d'une boîte
  à taille définie. Une re-mesure est forcée sur `fullscreenchange` ET sur
  `visibilitychange` — un document en arrière-plan ne reçoit ni frame ni callback de
  ResizeObserver, donc un changement de taille survenu pendant ce temps n'est jamais
  rattrapé au retour. Corollaire pour le développement : **tant qu'un onglet ou un
  panneau de preview est masqué, la page est `hidden` et RIEN ne rend** — inutile d'y
  diagnostiquer quoi que ce soit.
- **Une seule chose écrit dans `camera.position` : `CameraParallax`.** Tout le reste
  passe par `cameraBase` (`components/scene3d/camera-pose.ts`), la pose que la caméra
  aurait sans parallax ; le parallax lit cette base et compose son décalage angulaire
  par-dessus. La transition scroll/clic à venir doit donc animer `cameraBase.position`
  et `cameraBase.target` avec GSAP, jamais la caméra directement — sinon le parallax,
  qui tourne à chaque frame, écraserait l'animation et le zoom ne partirait pas.
  Le parallax est une ORBITE de quelques degrés autour du point visé, pas une
  translation : c'est ce qui décale l'avant-plan par rapport au fond (mesuré : fond et
  premier plan se déplacent en sens inverse). Amorti via `MathUtils.damp` et non un
  `lerp` à coefficient fixe, qui irait deux fois plus vite sur un écran 120 Hz.
  Neutralisé sans pointeur fin (le tactile n'a pas de position au repos) et sous
  `prefers-reduced-motion`.
- **La skyline est GÉNÉRÉE, pas posée à la main** (`components/scene3d/props/skyline-data.ts`).
  Tirage déterministe depuis une graine fixe : la ville est identique à chaque
  chargement, et se remanie entièrement en changeant `SEED`. Ne jamais y mettre de
  `Math.random`, la silhouette changerait à chaque re-rendu React. Les teintes viennent
  d'UNE couleur de base interpolée vers celle du ciel selon la distance — c'est le
  mécanisme réel de la brume, et il remplace les trois teintes plates d'avant.
- **Les fenêtres allumées de la ville sont un seul `InstancedMesh`** (~740 quads,
  un tirage), en émissif pur : aucune lumière réelle, le bloom de `PostFX` fait le
  rayonnement. Leur intensité vient du champ `cityWindows` du preset actif — une
  donnée d'HEURE, pas d'éclairage : elle ne touche aucune lumière. À 0 (« Crépuscule
  saturé », il fait jour) le composant n'est pas monté du tout.
  Réserve connue : le ciel de la fenêtre est un aplat constant (`palette.sky`), il ne
  suit pas le preset. En « Nuit chaude » on a donc des fenêtres allumées sur un ciel
  de plein jour. À trancher quand les presets seront rejoués.
- **Le liseré de contour du moniteur** (`effects/FresnelRim.tsx`) est une coque en
  `BackSide` un peu plus grande que le corps, pas un fresnel posé sur l'objet : sur une
  boîte, les faces sont plates, un fresnel y rendrait une valeur constante par face et
  les côtés, vus de chant, seraient invisibles. Sa couleur est `preset.rim.color` — un
  rim light EST le contre-jour qui accroche l'arête, donc il suit froid/chaud tout seul.
- **Pack de mouvement au repos (20/08/2026)** — la scène ne doit jamais être une
  image fixe, même quand personne ne touche à rien. Quatre mouvements, tous
  découplés et tous coupés ou ralentis sous `prefers-reduced-motion` :
  dérive lente de la caméra après 3 s sans pointeur, diode d'état clignotante
  sur l'Osmo, poussière dans le faisceau de la fenêtre, scintillement des
  fenêtres de la ville.
  Points structurants :
  — La dérive caméra passe par le MÊME canal que le parallax : elle s'ajoute aux
    angles cibles avant l'amortissement, donc rien à arbitrer entre les deux, et
    le contrat de `camera-pose.ts` reste intact. Périodes 8 s et 11 s,
    volontairement non harmoniques : à périodes égales le trajet dessine une
    ellipse fermée que l'oeil repère en deux tours. Contrairement au parallax,
    elle reste active au doigt — c'est le seul mouvement de caméra qu'un mobile
    verra.
  — La poussière (`effects/ShaftDust.tsx`) est un `Points` + `ShaderMaterial`
    écrit à la main : la montée est calculée dans le vertex shader, donc aucune
    position n'est réécrite côté CPU. Elle vit dans le repère DÉJÀ incliné du
    rai ; la verticale monde y est réinjectée comme uniforme
    (`uUp = (0, cos tilt, −sin tilt)`), sinon les grains montent dans l'axe du
    faisceau au lieu de monter tout court. C'est la seule chose du rai qui a
    besoin de la couleur de la CLÉ (`dustTint`) et non du ciel : de la poussière
    est de la matière éclairée. D'où la prop `keyColor` de `WindowLight`.
  — `ToonMaterial` accepte désormais `emissive` / `emissiveIntensity`. La diode
    de l'Osmo n'a aucune lumière réelle : au pic elle passe le seuil du bloom et
    le halo apparaît, en creux il disparaît — c'est ce halo qu'on voit, pas les
    4 mm de sphère.
  — Le scintillement des fenêtres réécrit `instanceColor` par frame ; le
    `intensity` du preset reste sur la couleur du MATÉRIAU. Les deux réglages
    ne se marchent pas dessus : l'heure ne dépend pas du scintillement, et le
    scintillement ne rallume pas une ville éteinte. Invisible dans la direction
    retenue (« Crépuscule saturé » a `cityWindows: 0`), à revoir si les presets
    sont rejoués.
  — Le tirage déterministe est mutualisé dans `lib/random.ts` (mulberry32), que
    partagent maintenant la skyline, ses fenêtres et la poussière.
  — Piège d'outillage : la règle `react-hooks/immutability` refuse une écriture
    dans un objet atteint depuis un `ref` à l'intérieur d'un `useFrame`. Le
    contournement propre — et qui se lit mieux — est de sortir le travail par
    frame dans une fonction au niveau du module (cf. `paintWindows`).
- Reste à faire : texture du faux OS sur la dalle, transition caméra scroll/clic
  (voir le contrat `camera-pose.ts` ci-dessus), faux OS 2D, contenu, comportement mobile.
- Ce fichier reflète les décisions de concept prises à ce stade ; à mettre à jour au fil du projet (via `/init` une fois du code existant, ou manuellement après chaque décision structurante).
---

@AGENTS.md
