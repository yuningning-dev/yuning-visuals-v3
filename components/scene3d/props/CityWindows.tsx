"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { Color, InstancedMesh, Matrix4 } from "three";
import { CITY_WINDOWS, WINDOW_SIZE } from "./skyline-data";

/** Réutilisés d'une instance à l'autre : rien à allouer dans la boucle. */
const matrix = new Matrix4();
const color = new Color();

type Props = {
  /**
   * Intensité globale, de 0 à 1, fournie par le preset actif. Multiplie la
   * couleur du matériau, donc TOUTES les instances d'un coup : c'est un seul
   * uniforme à changer, là où retoucher le buffer de couleurs par instance
   * demanderait de le réécrire et de le renvoyer au GPU à chaque bascule.
   */
  intensity: number;
};

/**
 * Fenêtres allumées de la skyline, en un seul `InstancedMesh`.
 *
 * Plusieurs centaines de plans, donc UN SEUL TIRAGE : autant de meshes séparés
 * coûteraient autant d'appels de dessin, pour des quads de quelques pixels. Le
 * maillage est écrit une fois au montage et ne bouge plus — les fenêtres sont
 * statiques, il n'y a rien à mettre à jour par frame.
 *
 * Aucune lumière réelle : voir `skyline-data.ts`. Le rayonnement vient du bloom
 * déjà présent dans la chaîne de post-traitement.
 */
export default function CityWindows({ intensity }: Props) {
  const mesh = useRef<InstancedMesh>(null);
  // Un gris dont la valeur EST l'intensité : le matériau multiplie la couleur
  // par instance, donc ce seul facteur monte ou baisse toute la ville.
  const tint = useMemo(() => new Color(intensity, intensity, intensity), [intensity]);

  useLayoutEffect(() => {
    const instanced = mesh.current;
    if (!instanced) return;

    CITY_WINDOWS.forEach((window, i) => {
      matrix.makeTranslation(...window.position);
      instanced.setMatrixAt(i, matrix);
      instanced.setColorAt(i, color.set(window.color));
    });

    instanced.instanceMatrix.needsUpdate = true;
    // `instanceColor` n'existe qu'après le premier `setColorAt` : Three alloue
    // le buffer à la demande.
    if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
  }, []);

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, CITY_WINDOWS.length]}
      frustumCulled={false}
    >
      <planeGeometry args={WINDOW_SIZE} />
      <meshBasicMaterial color={tint} />
    </instancedMesh>
  );
}
