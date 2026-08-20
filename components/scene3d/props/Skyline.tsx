"use client";

import { useMemo } from "react";
import type { ColorRepresentation } from "three";
import CityWindows from "./CityWindows";
import { BASE_Y, BUILDINGS, buildingColors } from "./skyline-data";

type Props = {
  /** Intensité des fenêtres allumées, 0 à 1, donnée par le preset actif. */
  windowsLit: number;
  /** Ciel du preset actif, vers lequel la brume fait tendre les lointains. */
  sky: ColorRepresentation;
};

/**
 * Skyline vue par la fenêtre.
 *
 * MATÉRIAU NON ÉCLAIRÉ, volontairement. Ces volumes sont dehors, à contre-jour
 * sur le ciel : ce sont des silhouettes, pas des objets de la pièce. Les passer
 * en `ToonMaterial` les ferait éclairer par la clé — une lampe de bureau qui
 * illumine des immeubles à cent mètres — et le contre-jour serait perdu. C'est
 * aussi ce qui les rend insensibles au preset actif, ce qui est voulu : seules
 * les fenêtres allumées réagissent à l'heure qu'il est.
 *
 * Le tracé et les teintes viennent de `skyline-data.ts` — voir là-bas pour le
 * tirage déterministe et la perspective atmosphérique. La silhouette est figée
 * une fois pour toutes ; seules les teintes se recalculent, parce qu'elles
 * dépendent du ciel, donc de l'heure qu'il est.
 *
 * Les bases descendent bien sous le bord bas visible de l'ouverture : on ne doit
 * jamais voir un immeuble se terminer en l'air. L'allège de la fenêtre coupe.
 */
export default function Skyline({ windowsLit, sky }: Props) {
  // Au changement de preset uniquement : la brume est une donnée d'ambiance,
  // pas une animation.
  const colors = useMemo(() => buildingColors(sky), [sky]);

  return (
    <group>
      {/* Monté seulement s'il fait assez sombre dehors : à 0, pas d'instances,
          pas de tirage, rien. C'est la version la moins chère de « désactivé ». */}
      {windowsLit > 0 && <CityWindows intensity={windowsLit} />}

      {/* PAS DE DOUBLURE DE CONTOUR — voir CLAUDE.md. Un `scale` sur le groupe
          met à l'échelle les POSITIONS autant que les tailles : un bâtiment posé
          à 2.55 se décalait de 5 cm sur le côté en ne grossissant que de 0.5 cm,
          donc la doublure sortait d'un seul côté, en fantôme décalé, au lieu de
          border la silhouette. La profondeur ici est portée par la brume par
          bâtiment de `skyline-data` et par le brouillard de la scène. */}
      {BUILDINGS.map(({ x, width, top, z }, i) => (
        <mesh key={i} position={[x, (top + BASE_Y) / 2, z]}>
          {/* Profondeur égale à la largeur : ces volumes ne sont jamais vus
              d'assez loin sur le côté pour que leur section se lise. */}
          <boxGeometry args={[width, top - BASE_Y, width]} />
          <meshBasicMaterial color={colors[i]} />
        </mesh>
      ))}
    </group>
  );
}
