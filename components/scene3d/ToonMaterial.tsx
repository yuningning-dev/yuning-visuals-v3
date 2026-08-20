"use client";

import type { ColorRepresentation, Texture } from "three";
import { toonGradient } from "@/lib/toon";

type Props = {
  color: ColorRepresentation;
  /** Moins de paliers = ombrage plus dur. 3 est le plancher : en dessous, le volume se lit à plat. */
  steps?: number;
  /**
   * Carte de grain. Elle est multipliée par `color` : les textures du projet
   * sont dessinées en blanc cassé pour n'apporter que le relief, jamais la teinte.
   */
  map?: Texture;
  /**
   * Émission propre de la surface. S'AJOUTE à l'ombrage cel au lieu de le
   * remplacer : la pièce ne l'éteint pas, mais la rampe de paliers continue de
   * sculpter le volume. C'est ce qu'il faut pour une diode ou un témoin — un
   * `meshBasicMaterial` donnerait un aplat plat, hors de la lumière de la scène.
   *
   * Au-dessus du seuil du bloom de `PostFX`, la surface se met à rayonner : le
   * halo est gratuit, il n'y a aucune lumière réelle à ajouter.
   */
  emissive?: ColorRepresentation;
  emissiveIntensity?: number;
};

/**
 * Matériau cel-shadé du projet. Passe par `toonGradient`, qui mutualise la
 * rampe : toutes les surfaces à 3 paliers partagent une seule texture GPU.
 */
export default function ToonMaterial({
  color,
  steps = 3,
  map,
  emissive,
  emissiveIntensity,
}: Props) {
  return (
    <meshToonMaterial
      color={color}
      gradientMap={toonGradient(steps)}
      map={map}
      emissive={emissive}
      emissiveIntensity={emissiveIntensity}
    />
  );
}
