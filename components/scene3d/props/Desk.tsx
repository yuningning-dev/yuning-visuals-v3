"use client";

import { useMemo } from "react";
import { palette } from "@/lib/palette";
import { woodGrainTexture } from "@/lib/textures";
import { layout } from "../scene-layout";
import ToonMaterial from "../ToonMaterial";

const { desk } = layout;

const LEG = 0.11;
const INSET = 0.22;

/** Plateau et piètement. Le plateau a sa face supérieure exactement à y = 0. */
export default function Desk() {
  const wood = useMemo(() => woodGrainTexture(), []);
  const legHeight = desk.height - desk.thickness;
  const legY = -desk.thickness - legHeight / 2;

  const legX = desk.width / 2 - INSET;
  const legZ = desk.depth / 2 - INSET;

  return (
    <group>
      <mesh position={[0, -desk.thickness / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[desk.width, desk.thickness, desk.depth]} />
        <ToonMaterial color={palette.wood400} map={wood} />
      </mesh>

      {/* Chant plus sombre : sans lui, le plateau vu de face n'a aucune épaisseur lisible. */}
      <mesh
        position={[0, -desk.thickness - 0.012, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[desk.width - 0.04, 0.03, desk.depth - 0.04]} />
        <ToonMaterial color={palette.wood600} map={wood} />
      </mesh>

      {[
        [-legX, legZ],
        [legX, legZ],
        [-legX, -legZ],
        [legX, -legZ],
      ].map(([x, z]) => (
        <mesh key={`${x}:${z}`} position={[x, legY, z]} castShadow>
          <boxGeometry args={[LEG, legHeight, LEG]} />
          <ToonMaterial color={palette.wood600} map={wood} />
        </mesh>
      ))}
    </group>
  );
}
