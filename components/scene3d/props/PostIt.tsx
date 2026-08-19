"use client";

import { palette } from "@/lib/palette";
import ToonMaterial from "../ToonMaterial";

const SIZE = 0.26;

type Props = {
  position: [number, number, number];
};

/**
 * Post-it collé sur la dalle — l'indice qui dit que l'écran est cliquable.
 *
 * Le texte réel (« click the monitor to access ») n'est pas encore posé : il
 * demande une police cartoon chargée côté Three, alors que la charte n'est
 * servie que via next/font pour le DOM. En attendant, des traits suggèrent
 * l'écriture manuscrite — l'objet lit déjà comme un pense-bête.
 */
export default function PostIt({ position }: Props) {
  const lines = [0.06, 0.015, -0.03];

  return (
    <group position={position} rotation-z={-0.07}>
      <mesh castShadow>
        <boxGeometry args={[SIZE, SIZE, 0.004]} />
        <ToonMaterial color={palette.postit} />
      </mesh>

      {lines.map((y, index) => (
        <mesh key={y} position={[index === 2 ? -0.03 : 0, y, 0.004]}>
          <planeGeometry args={[index === 2 ? SIZE * 0.4 : SIZE * 0.62, 0.014]} />
          <meshBasicMaterial color={palette.shell700} />
        </mesh>
      ))}
    </group>
  );
}
