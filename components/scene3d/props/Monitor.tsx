"use client";

import { palette } from "@/lib/palette";
import { layout } from "../scene-layout";
import FresnelRim from "../effects/FresnelRim";
import GlowQuad from "../effects/GlowQuad";
import ToonMaterial from "../ToonMaterial";
import PostIt from "./PostIt";

const { monitor } = layout;

const BEZEL = 0.06;
const BODY_DEPTH = 0.07;

const SCREEN_W = monitor.screenWidth;
const SCREEN_H = monitor.screenHeight;
const HALF_W = SCREEN_W / 2;
const HALF_H = SCREEN_H / 2;

type Props = {
  /** Passé au post-it, qui n'existe que sur desktop. */
  showPostIt?: boolean;
  /**
   * Couleur du liseré de contour. Reçoit le contre-jour du preset actif : c'est
   * physiquement ce qu'un rim light EST — la source de derrière qui accroche
   * l'arête. Le liseré suit donc le froid ou le chaud de la direction choisie
   * sans qu'aucune table de correspondance ne soit à tenir à jour.
   */
  rimColor: string;
};

/**
 * Moniteur. La dalle est un plan non éclairé : c'est elle qui recevra la
 * texture du faux OS, et une texture d'interface ne doit pas subir l'éclairage
 * de la pièce sous peine de devenir illisible.
 */
export default function Monitor({ showPostIt = true, rimColor }: Props) {
  const bodyWidth = monitor.screenWidth + BEZEL * 2;
  const bodyHeight = monitor.screenHeight + BEZEL * 2;
  const bottomY = monitor.centerY - bodyHeight / 2;

  return (
    <group position={[0, 0, monitor.z]}>
      <mesh position={[0, 0.018, 0.12]} castShadow receiveShadow>
        <boxGeometry args={[0.52, 0.035, 0.3]} />
        <ToonMaterial color={palette.shell700} />
      </mesh>

      <mesh position={[0, bottomY / 2, 0.02]} castShadow>
        <boxGeometry args={[0.1, bottomY, 0.08]} />
        <ToonMaterial color={palette.shell500} />
      </mesh>

      <mesh position={[0, monitor.centerY, 0]} castShadow receiveShadow>
        <boxGeometry args={[bodyWidth, bodyHeight, BODY_DEPTH]} />
        <ToonMaterial color={palette.shell700} />
      </mesh>

      {/* Liseré de contour. La coque déborde de 0.02 sur chaque côté : c'est
          cette marge, et elle seule, qui fixe l'épaisseur du trait — le corps
          opaque masque tout le reste de la coque. */}
      <FresnelRim
        position={[0, monitor.centerY, 0]}
        args={[bodyWidth + 0.04, bodyHeight + 0.04, BODY_DEPTH + 0.04]}
        color={rimColor}
        intensity={0.5}
        power={1.6}
      />

      {/* Placeholder du faux OS : sera remplacé par une render target.
          Sombre et non éclairé — une dalle claire se confondait avec la
          fenêtre juste derrière, et le moniteur perdait sa silhouette. */}
      <mesh position={[0, monitor.centerY, BODY_DEPTH / 2 + 0.002]}>
        <planeGeometry args={[monitor.screenWidth, monitor.screenHeight]} />
        <meshBasicMaterial color={palette.screen} />
      </mesh>

      {/* Liseré allumé : le seul signe que l'écran est sous tension tant que
          la texture du faux OS n'est pas branchée. */}
      <mesh position={[0, monitor.centerY, BODY_DEPTH / 2 + 0.001]}>
        <planeGeometry
          args={[monitor.screenWidth + 0.02, monitor.screenHeight + 0.02]}
        />
        <meshBasicMaterial color={palette.teal500} />
      </mesh>

      {/* Lueur des bords. Posée DEVANT la dalle, et c'est tout l'intérêt : elle
          déborde vers l'extérieur sur le cadre, mais aussi vers l'intérieur sur
          le noir de la dalle. Placée derrière, la dalle masquerait la moitié
          interne et il ne resterait qu'un halo sur le plastique — l'écran
          resterait le trou noir qu'on cherche à habiter.

          Quatre quads plutôt qu'un seul grand : le dégradé de `GlowQuad` est
          radial, donc un quad unique aux dimensions de l'écran s'allumerait au
          CENTRE, là où l'on ne veut rien. Chaque quad est plus long que son bord
          pour que les quatre se recouvrent aux angles, sinon le halo se lit en
          quatre taches distinctes au lieu d'un pourtour continu.

          `falloff` bas : c'est une nappe, pas une source. Monter l'opacité
          donnerait un liseré dur, et il y en a déjà un juste au-dessus. */}
      {(
        [
          { pos: [0, HALF_H, 0], size: [SCREEN_W + 0.17, 0.3] },
          { pos: [0, -HALF_H, 0], size: [SCREEN_W + 0.17, 0.3] },
          { pos: [-HALF_W, 0, 0], size: [0.3, SCREEN_H + 0.17] },
          { pos: [HALF_W, 0, 0], size: [0.3, SCREEN_H + 0.17] },
        ] as const
      ).map(({ pos, size }, i) => (
        <GlowQuad
          key={i}
          position={[pos[0], monitor.centerY + pos[1], BODY_DEPTH / 2 + 0.005]}
          size={[size[0], size[1]]}
          color={palette.teal400}
          opacity={0.15}
          falloff={1.7}
        />
      ))}

      {/* Glare de dalle : deux traînées obliques. C'est la convention cartoon
          qui dit « c'est du verre » — sans elles, la dalle lit comme un carton
          peint. Placées à gauche pour laisser le post-it lisible à droite. */}
      <GlowQuad
        position={[-0.42, monitor.centerY + 0.05, BODY_DEPTH / 2 + 0.004]}
        rotation={[0, 0, -0.62]}
        size={[0.22, 1.15]}
        color={palette.sky}
        opacity={0.13}
        falloff={2.8}
      />
      <GlowQuad
        position={[-0.19, monitor.centerY - 0.02, BODY_DEPTH / 2 + 0.004]}
        rotation={[0, 0, -0.62]}
        size={[0.11, 0.72]}
        color={palette.sky}
        opacity={0.1}
        falloff={3}
      />

      {/* Rebond de l'écran sur le plateau : une dalle allumée éclaire toujours
          un peu le bureau devant elle. */}
      <GlowQuad
        position={[0, 0.006, 0.42]}
        rotation={[-Math.PI / 2, 0, 0]}
        size={[2.3, 1.25]}
        color={palette.teal400}
        opacity={0.12}
        falloff={1.6}
      />

      {showPostIt && (
        <PostIt
          position={[
            bodyWidth / 2 - 0.24,
            monitor.centerY - bodyHeight / 2 + 0.2,
            BODY_DEPTH / 2 + 0.006,
          ]}
        />
      )}
    </group>
  );
}
