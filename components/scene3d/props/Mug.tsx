"use client";

import { palette } from "@/lib/palette";
import ToonMaterial from "../ToonMaterial";

// ~8 cm de diamètre à l'échelle de la scène : à 0.062 de rayon le mug
// faisait 6 cm et lisait comme un dé à coudre à côté du clavier.
const RADIUS = 0.085;
const HEIGHT = 0.135;

/**
 * Mug. Le seul objet de la scène qui ne soit pas dans le brief — il comble le
 * vide entre l'appareil photo et le clavier, où le plateau restait nu sur une
 * large bande au premier plan.
 */
export default function Mug() {
  return (
    <group position={[-1.38, 0, 0.46]} rotation-y={-0.4}>
      <mesh position={[0, HEIGHT / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[RADIUS, RADIUS * 0.86, HEIGHT, 16]} />
        <ToonMaterial color={palette.paper} />
      </mesh>

      {/* Café : un disque sombre en retrait du bord, sinon le mug lit plein. */}
      <mesh position={[0, HEIGHT - 0.012, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[RADIUS * 0.86, 16]} />
        <ToonMaterial color={palette.wood600} />
      </mesh>

      <mesh position={[RADIUS + 0.016, HEIGHT * 0.56, 0]} rotation-x={Math.PI / 2} castShadow>
        <torusGeometry args={[0.04, 0.011, 6, 12, Math.PI * 1.25]} />
        <ToonMaterial color={palette.paper} />
      </mesh>
    </group>
  );
}
