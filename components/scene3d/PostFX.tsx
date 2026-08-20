"use client";

import {
  Bloom,
  EffectComposer,
  SMAA,
  ToneMapping,
  Vignette,
} from "@react-three/postprocessing";
import { BlendFunction, KernelSize, ToneMappingMode } from "postprocessing";
import { useReducedMotion } from "@/lib/use-reduced-motion";

/**
 * Chaîne de post-traitement.
 *
 * Le bloom n'est pas un ornement : c'est la signature des références
 * (`style 3D.png`, `style 3D 2.png`), où chaque néon et chaque lampe baigne dans
 * un halo. Sans lui, les surfaces émissives — ciel, dalle, diffuseur — restent
 * des aplats découpés au cutter : la scène peut être juste, elle reste plate.
 *
 * TONE MAPPING — il est ICI, dans la chaîne, et pas dans le `gl` du Canvas.
 * Ce n'est pas un choix de style : Three n'applique `renderer.toneMapping` que
 * lorsqu'il rend dans le framebuffer par défaut (`WebGLPrograms.js`, le
 * `currentRenderTarget === null` qui garde l'affectation). Dès qu'un composer
 * est branché, la scène part dans une render target et le réglage du renderer
 * ne s'applique JAMAIS. Posé là-bas, il aurait l'air de travailler sans rien
 * faire — le pire des réglages.
 * L'effet, lui, porte la courbe et lit `toneMappingExposure` du renderer : le
 * `gl` du Canvas garde donc la main sur l'exposition, et elle seule.
 * Placé APRÈS le bloom (qui travaille en HDR linéaire, c'est là que le
 * débordement a un sens) et avant SMAA (qui cherche des contours dans l'image
 * finale).
 *
 * Deux réglages font tout le rendu, et ce sont les seuls à toucher :
 * — `luminanceThreshold` : au-dessus de quelle luminosité une surface déborde.
 *   RECALÉ DE 0.8 À 1.6 avec AgX, et ce n'est pas un réglage à l'oeil : la
 *   charte est désormais pré-compensée, donc ses clairs valent plus de 1 (le
 *   papier est à ~1.5). À 0.8, le dormant de la fenêtre et les post-it se
 *   mettaient à rayonner comme des sources et la scène partait en brouillard.
 *   Au-dessus de 1.6 il ne reste que ce qui ÉMET vraiment — dalle, diffuseur,
 *   fenêtres de la ville, diode.
 * — `intensity` : l'ampleur du débordement.
 *
 * ANTIALIASING — `multisampling` est à 0, ET C'EST VOLONTAIRE. Ne pas le
 * remonter : sur ANGLE Metal (Apple Silicon), la résolution du buffer
 * multi-échantillonné du composer ne recouvre qu'une bande de la cible et laisse
 * le reste à zéro. À l'écran, un grand rectangle noir mange les deux tiers
 * gauches de la scène. Vérifié à 4 comme à 2 échantillons — c'est le chemin MSAA
 * lui-même qui casse, pas un plafond de samples (`MAX_SAMPLES` y vaut 4).
 * Diagnostic : la scène rendue directement dans le framebuffer par défaut est
 * intacte, et seule la sortie du composer est trouée.
 *
 * L'antialiasing passe donc par SMAA, un filtre d'image : aucune cible
 * multi-échantillonnée, donc le même rendu sur tous les GPU. Il est placé en
 * dernier — c'est un effet de convolution, `postprocessing` lui donne sa propre
 * passe, appliquée sur l'image déjà bloomée et vignettée.
 */
export default function PostFX() {
  const reduced = useReducedMotion();

  return (
    <EffectComposer multisampling={0}>
      <Bloom
        mipmapBlur
        intensity={reduced ? 0.5 : 0.85}
        luminanceThreshold={1.6}
        luminanceSmoothing={0.35}
        kernelSize={KernelSize.LARGE}
      />
      {/* AgX plutôt qu'ACES : sur des aplats saturés, ACES vire au pastel et
          décale les teintes: le corail tourne au saumon. AgX garde la teinte
          en montant vers le blanc, ce qui est exactement ce qu'on demande à une
          courbe sur un rendu en aplats. */}
      <ToneMapping mode={ToneMappingMode.AGX} />

      {/* Vignettage discret : ramène l'oeil vers le moniteur sans que le
          procédé se remarque. */}
      <Vignette
        offset={0.32}
        darkness={0.38}
        blendFunction={BlendFunction.NORMAL}
      />

      <SMAA />
    </EffectComposer>
  );
}
