"use client";

import { palette } from "@/lib/palette";
import ToonMaterial from "../ToonMaterial";

const BODY_W = 0.098;
const BODY_H = 0.29;
const BODY_D = 0.058;
const FRONT = BODY_D / 2;

/**
 * DJI Osmo Pocket, d'après `references/osmo pocket 4 2.jpg`.
 *
 * Corrigé sur la seconde référence, qui contredit la première : l'écran est
 * ENCASTRÉ dans la façade, il ne déborde pas sur le côté. La façade est un
 * bandeau légèrement en saillie qui ne couvre pas toute la largeur du corps —
 * c'est ce décrochement latéral, visible en trois-quarts, qui donne à l'objet
 * son épaisseur.
 *
 * Au-dessus, la nacelle en trois temps : embase cylindrique, bras oblique
 * décalé, tête horizontale. C'est l'obliquité du bras qui empêche l'objet de
 * lire comme une simple télécommande.
 */
export default function OsmoPocket() {
  const gimbalBaseY = BODY_H + 0.014;
  const armY = gimbalBaseY + 0.055;
  const headY = armY + 0.055;

  return (
    <group position={[-0.7, 0, 0.5]} rotation-y={0.5}>
      <mesh position={[0, BODY_H / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[BODY_W, BODY_H, BODY_D]} />
        <ToonMaterial color={palette.shell700} />
      </mesh>

      {/* Bandeau de façade en saillie, décalé vers la droite du corps. */}
      <mesh position={[0.012, BODY_H * 0.53, FRONT + 0.004]} castShadow>
        <boxGeometry args={[BODY_W * 0.76, BODY_H * 0.84, 0.009]} />
        <ToonMaterial color={palette.shell500} />
      </mesh>

      {/* Écran encastré, presque carré, dans le haut de la façade. */}
      <mesh position={[0.012, BODY_H * 0.68, FRONT + 0.0095]}>
        <planeGeometry args={[BODY_W * 0.6, BODY_H * 0.27]} />
        <meshBasicMaterial color={palette.teal400} />
      </mesh>

      {/* Bloc de commandes : deux boutons ronds et la LED d'état. */}
      {[-0.016, 0.028].map((x) => (
        <mesh
          key={x}
          position={[0.012 + x, BODY_H * 0.24, FRONT + 0.009]}
          rotation-x={Math.PI / 2}
        >
          <cylinderGeometry args={[0.014, 0.014, 0.005, 12]} />
          <ToonMaterial color={palette.shell300} />
        </mesh>
      ))}
      <mesh position={[-0.004, BODY_H * 0.24, FRONT + 0.012]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.005, 0.005, 0.004, 8]} />
        <meshBasicMaterial color={palette.coral400} />
      </mesh>
      <mesh position={[-0.012, BODY_H * 0.33, FRONT + 0.0095]}>
        <planeGeometry args={[0.012, 0.005]} />
        <meshBasicMaterial color="#4ade80" />
      </mesh>

      {/* Embase de nacelle. */}
      <mesh position={[0.008, gimbalBaseY, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.032, 0.028, 14]} />
        <ToonMaterial color={palette.shell500} />
      </mesh>

      {/* Bras oblique, décalé : sans cette inclinaison la nacelle lit comme un
          simple bouchon posé sur le corps. */}
      <mesh position={[-0.004, armY, -0.004]} rotation-z={0.42} castShadow>
        <boxGeometry args={[0.028, 0.085, 0.032]} />
        <ToonMaterial color={palette.shell700} />
      </mesh>

      {/* Tête : barillet de roulis à gauche, bloc objectif à droite. */}
      <group position={[-0.03, headY, 0.004]} rotation-z={-0.12}>
        <mesh rotation-z={Math.PI / 2} castShadow>
          <cylinderGeometry args={[0.032, 0.032, 0.05, 14]} />
          <ToonMaterial color={palette.shell700} />
        </mesh>

        <mesh position={[0.052, 0.002, 0.004]} castShadow>
          <boxGeometry args={[0.058, 0.062, 0.05]} />
          <ToonMaterial color={palette.shell500} />
        </mesh>

        <mesh position={[0.052, 0.002, 0.031]}>
          <planeGeometry args={[0.042, 0.046]} />
          <ToonMaterial color={palette.dusk950} />
        </mesh>
        <mesh position={[0.052, 0.002, 0.0325]}>
          <circleGeometry args={[0.017, 14]} />
          <meshBasicMaterial color={palette.teal300} />
        </mesh>
      </group>
    </group>
  );
}
