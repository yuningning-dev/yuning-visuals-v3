"use client";

import type { Texture } from "three";
import { toonGradient } from "@/lib/toon";

type Props = {
  color: string;
  /** Moins de paliers = ombrage plus dur. 3 est le plancher : en dessous, le volume se lit à plat. */
  steps?: number;
  /**
   * Carte de grain. Elle est multipliée par `color` : les textures du projet
   * sont dessinées en blanc cassé pour n'apporter que le relief, jamais la teinte.
   */
  map?: Texture;
};

/**
 * Matériau cel-shadé du projet. Passe par `toonGradient`, qui mutualise la
 * rampe : toutes les surfaces à 3 paliers partagent une seule texture GPU.
 */
export default function ToonMaterial({ color, steps = 3, map }: Props) {
  return (
    <meshToonMaterial color={color} gradientMap={toonGradient(steps)} map={map} />
  );
}
