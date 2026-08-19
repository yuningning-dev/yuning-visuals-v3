"use client";

import { palette } from "@/lib/palette";
import { LAMP_POSITION } from "../props/DeskLamp";
import { layout } from "../scene-layout";
import GlowQuad from "./GlowQuad";

const { wall, monitor } = layout;
const win = wall.window;

/** Face intérieure de la vitre, là où se posent les reflets. */
const GLASS_Z = wall.z - wall.thickness / 2 - 0.01;
const LAMP_X = LAMP_POSITION[0];

/**
 * Reflets sur les surfaces lisses : la vitre, le plateau verni, la dalle.
 *
 * Sur le reflet de la lampe dans la vitre — l'image miroir stricte de la lampe
 * (centre du diffuseur à y ≈ 0.18, soit SOUS l'allège de la fenêtre) retombe
 * pile sur l'arête basse du dormant, où elle serait invisible. Ce qu'on voit
 * réellement sur une vitre proche d'une source, c'est la diffusion dans
 * l'épaisseur du verre : une traînée verticale qui monte depuis l'allège. C'est
 * ce qui est dessiné ici — physiquement plus juste que le miroir ponctuel, et
 * c'est en plus la version qui se voit.
 */
export default function Reflections() {
  return (
    <group>
      <GlowQuad
        position={[LAMP_X, win.minY + 0.42, GLASS_Z + 0.008]}
        size={[0.62, 1.15]}
        color={palette.lamp400}
        opacity={0.34}
        falloff={2.4}
      />
      {/* Coeur plus dense au ras de l'allège, juste au-dessus de la lampe. */}
      <GlowQuad
        position={[LAMP_X, win.minY + 0.1, GLASS_Z + 0.01]}
        size={[0.34, 0.34]}
        color={palette.lamp200}
        opacity={0.4}
        falloff={3.2}
      />

      {/* Le plateau est verni : les sources s'y étirent vers le spectateur, en
          traînée dans l'axe de la profondeur, jamais en tache ronde. */}
      <GlowQuad
        position={[LAMP_X, 0.009, -0.12]}
        rotation={[-Math.PI / 2, 0, 0]}
        size={[0.42, 1.05]}
        color={palette.lamp400}
        opacity={0.3}
        falloff={2.6}
      />
      <GlowQuad
        position={[0, 0.008, monitor.z + 0.5]}
        rotation={[-Math.PI / 2, 0, 0]}
        size={[1.5, 0.8]}
        color={palette.teal400}
        opacity={0.14}
        falloff={1.7}
      />

      {/* Rappel chaud sur le tapis de souris, qui borde la lampe. */}
      <GlowQuad
        position={[1.02, 0.012, 0.22]}
        rotation={[-Math.PI / 2, 0, 0]}
        size={[0.85, 0.6]}
        color={palette.lamp400}
        opacity={0.2}
        falloff={1.8}
      />
    </group>
  );
}
