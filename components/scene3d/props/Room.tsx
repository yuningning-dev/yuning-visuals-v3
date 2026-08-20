"use client";

import { useMemo } from "react";
import type { ColorRepresentation, Texture } from "three";
import { palette } from "@/lib/palette";
import { plasterTexture } from "@/lib/textures";
import { layout } from "../scene-layout";
import ToonMaterial from "../ToonMaterial";
import Skyline from "./Skyline";

const { wall, desk } = layout;
const win = wall.window;

const FLOOR_Y = -desk.height;
const WALL_TOP = 3.2;
const WALL_HALF_WIDTH = 6;
const FRAME = 0.075;

/** Fond de ciel. Doit rester DERRIÈRE tous les volumes de `Skyline`. */
const SKY_Z = -3.6;

/**
 * Une boîte définie par ses bornes plutôt que par centre + taille.
 * Les panneaux de mur se raisonnent en « de tel bord à tel bord » — les
 * convertir à la main est le meilleur moyen de décaler l'ouverture.
 */
function Panel({
  minX,
  maxX,
  minY,
  maxY,
  color,
  map,
}: {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  color: ColorRepresentation;
  map?: Texture;
}) {
  return (
    <mesh
      position={[(minX + maxX) / 2, (minY + maxY) / 2, wall.z]}
      receiveShadow
      castShadow
    >
      <boxGeometry args={[maxX - minX, maxY - minY, wall.thickness]} />
      <ToonMaterial color={color} map={map} />
    </mesh>
  );
}

/**
 * Sol, mur du fond et sa fenêtre.
 *
 * L'ouverture n'est pas percée : le mur est assemblé en quatre panneaux autour
 * du vide. Une soustraction booléenne coûterait de la géométrie et des outils
 * pour un résultat identique à l'écran.
 */
export default function Room({
  windowsLit,
  sky,
}: {
  windowsLit: number;
  sky: ColorRepresentation;
}) {
  const plaster = useMemo(() => plasterTexture(), []);

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position-y={FLOOR_Y} receiveShadow>
        <planeGeometry args={[28, 28]} />
        <ToonMaterial color={palette.dusk800} map={plaster} />
      </mesh>

      <Panel
        minX={-WALL_HALF_WIDTH}
        maxX={win.minX}
        minY={FLOOR_Y}
        maxY={WALL_TOP}
        color={palette.coral500}
        map={plaster}
      />
      <Panel
        minX={win.maxX}
        maxX={WALL_HALF_WIDTH}
        minY={FLOOR_Y}
        maxY={WALL_TOP}
        color={palette.coral500}
        map={plaster}
      />
      <Panel
        minX={win.minX}
        maxX={win.maxX}
        minY={FLOOR_Y}
        maxY={win.minY}
        color={palette.coral500}
        map={plaster}
      />
      <Panel
        minX={win.minX}
        maxX={win.maxX}
        minY={win.maxY}
        maxY={WALL_TOP}
        color={palette.coral500}
        map={plaster}
      />

      {/* Plinthe : une seule cassure de valeur suffit à empêcher le mur de lire
          comme un aplat infini, sans ajouter de matière. */}
      <mesh position={[0, FLOOR_Y + 0.11, wall.z + wall.thickness / 2 + 0.01]}>
        <boxGeometry args={[WALL_HALF_WIDTH * 2, 0.22, 0.05]} />
        <ToonMaterial color={palette.coral600} />
      </mesh>

      <WindowOpening windowsLit={windowsLit} sky={sky} />
    </group>
  );
}

/**
 * Le ciel vu par la fenêtre, en matériau non éclairé : c'est une source, elle
 * ne doit pas s'assombrir avec le reste de la pièce. La lumière qu'elle est
 * censée jeter dans la scène est portée par la `rim` du preset, pas par ce plan.
 *
 * Sa couleur vient du PRESET et non de la charte : c'est elle qui dit l'heure
 * qu'il est dehors, et elle doit donc s'accorder avec `cityWindows`. Dans la
 * direction retenue, elle vaut exactement `palette.sky` — volontairement très
 * pâle et non turquoise franc, parce qu'à teinte égale avec la dalle du
 * moniteur les deux surfaces fusionnaient et le moniteur flottait dans une
 * tache bleue.
 */
function WindowOpening({
  windowsLit,
  sky,
}: {
  windowsLit: number;
  sky: ColorRepresentation;
}) {
  const width = win.maxX - win.minX;
  const height = win.maxY - win.minY;
  const centerX = (win.minX + win.maxX) / 2;
  const centerY = (win.minY + win.maxY) / 2;
  const frontZ = wall.z + wall.thickness / 2;

  return (
    <group>
      {/* Le ciel est RECULÉ loin derrière le mur, et agrandi d'autant.
          Collé à l'ouverture comme avant, il ne laissait aucune place pour
          mettre quoi que ce soit dehors : la skyline se serait retrouvée
          coplanaire avec lui. Reculé, elle s'intercale et glisse derrière
          l'encadrement quand la caméra bouge — c'est cette profondeur qui
          empêche la fenêtre de lire comme une image collée.
          La taille est calculée pour couvrir le cône de vision à travers
          l'ouverture, débattement du parallax compris : si ce plan devient
          trop petit, on aperçoit ses bords et le sol au-delà. */}
      <mesh position={[centerX, centerY, SKY_Z]}>
        <planeGeometry args={[6, 4]} />
        <meshBasicMaterial color={sky} />
      </mesh>

      <Skyline windowsLit={windowsLit} sky={sky} />

      {/* Dormant : quatre montants sur le pourtour. C'est lui qui fait lire une
          fenêtre — l'ouverture nue lit comme un deuxième écran. */}
      <mesh position={[centerX, win.maxY, frontZ]} castShadow>
        <boxGeometry args={[width + FRAME * 2, FRAME, 0.09]} />
        <ToonMaterial color={palette.paper} />
      </mesh>
      <mesh position={[centerX, win.minY, frontZ]} castShadow>
        <boxGeometry args={[width + FRAME * 2, FRAME, 0.09]} />
        <ToonMaterial color={palette.paper} />
      </mesh>
      <mesh position={[win.minX, centerY, frontZ]} castShadow>
        <boxGeometry args={[FRAME, height, 0.09]} />
        <ToonMaterial color={palette.paper} />
      </mesh>
      <mesh position={[win.maxX, centerY, frontZ]} castShadow>
        <boxGeometry args={[FRAME, height, 0.09]} />
        <ToonMaterial color={palette.paper} />
      </mesh>

      {/* Meneau vertical, décalé : centré, il disparaissait derrière le moniteur. */}
      <mesh position={[win.minX + width * 0.28, centerY, frontZ - 0.02]}>
        <boxGeometry args={[FRAME * 0.6, height, 0.05]} />
        <ToonMaterial color={palette.paper} />
      </mesh>
    </group>
  );
}
