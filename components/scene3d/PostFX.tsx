"use client";

import { Bloom, EffectComposer, SMAA, Vignette } from "@react-three/postprocessing";
import { BlendFunction, KernelSize } from "postprocessing";
import { useReducedMotion } from "@/lib/use-reduced-motion";

/**
 * Chaîne de post-traitement.
 *
 * Le bloom n'est pas un ornement : c'est la signature des références
 * (`style 3D.png`, `style 3D 2.png`), où chaque néon et chaque lampe baigne dans
 * un halo. Sans lui, les surfaces émissives — ciel, dalle, diffuseur — restent
 * des aplats découpés au cutter : la scène peut être juste, elle reste plate.
 *
 * Deux réglages font tout le rendu, et ce sont les seuls à toucher :
 * — `luminanceThreshold` : au-dessus de quelle luminosité une surface déborde.
 *   Calé haut volontairement. Plus bas, le mur corail se met lui aussi à
 *   rayonner et l'ensemble part en brouillard.
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
        luminanceThreshold={0.8}
        luminanceSmoothing={0.35}
        kernelSize={KernelSize.LARGE}
      />
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
