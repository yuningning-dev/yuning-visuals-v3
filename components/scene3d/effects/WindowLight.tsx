"use client";

import { palette } from "@/lib/palette";
import { layout } from "../scene-layout";
import GlowQuad from "./GlowQuad";
import LightShaft from "./LightShaft";

const { wall, desk, monitor } = layout;
const win = wall.window;

const WIN_CENTER_X = (win.minX + win.maxX) / 2;
const WIN_CENTER_Y = (win.minY + win.maxY) / 2;
const WIN_WIDTH = win.maxX - win.minX;

/**
 * Tout ce que la fenêtre projette dans la pièce.
 *
 * Le faisceau et les flaques sont des fausses lumières, indépendantes de la
 * `rim` du preset : elles ne changent pas l'éclairage des matériaux, elles se
 * contentent de le rendre visible. C'est ce découplage qui permet de les régler
 * à l'oeil sans casser le contraste validé.
 */
export default function WindowLight() {
  return (
    <group>
      {/* Le rai part du tiers gauche de l'ouverture, pas de son centre : décalé
          et dévié latéralement, il est vu de biais par la caméra frontale et
          lit comme un faisceau. Centré, il partait droit vers l'objectif et ne
          donnait qu'une tache. */}
      <LightShaft
        origin={[win.minX + WIN_WIDTH * 0.3, WIN_CENTER_Y + 0.2, wall.z + wall.thickness / 2]}
        width={WIN_WIDTH * 0.34}
        length={3.4}
        tilt={0.72}
        yaw={-0.5}
        color={palette.sky}
        opacity={0.3}
      />

      {/* Flaque au sol, là où le faisceau atterrit — décalée vers le spectateur
          puisque la lumière entre en biais. */}
      <GlowQuad
        position={[WIN_CENTER_X, -desk.height + 0.008, 0.55]}
        rotation={[-Math.PI / 2, 0, 0]}
        size={[WIN_WIDTH * 1.5, 2.6]}
        color={palette.sky}
        opacity={0.24}
        falloff={1.5}
      />

      {/* Nappe froide sur le plateau, derrière le moniteur : c'est elle qui
          donne au bois l'air d'être touché par la fenêtre. */}
      <GlowQuad
        position={[0, 0.006, monitor.z - 0.18]}
        rotation={[-Math.PI / 2, 0, 0]}
        size={[3.4, 0.95]}
        color={palette.sky}
        opacity={0.18}
        falloff={1.6}
      />

      {/* Reflet allongé sur le mur, sous la tablette de fenêtre. */}
      <GlowQuad
        position={[WIN_CENTER_X, win.minY - 0.22, wall.z + wall.thickness / 2 + 0.01]}
        size={[WIN_WIDTH * 1.2, 0.72]}
        color={palette.teal300}
        opacity={0.15}
        falloff={1.7}
      />
    </group>
  );
}
