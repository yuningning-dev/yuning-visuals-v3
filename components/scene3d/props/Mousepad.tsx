"use client";

import { useMemo } from "react";
import { palette } from "@/lib/palette";
import { weaveTexture } from "@/lib/textures";
import ToonMaterial from "../ToonMaterial";

/** Tapis de souris — sert surtout à poser un aplat froid contre le bois chaud. */
export default function Mousepad() {
  const weave = useMemo(() => weaveTexture(), []);

  return (
    <mesh position={[1.02, 0.005, 0.35]} receiveShadow>
      <boxGeometry args={[0.78, 0.01, 0.44]} />
      <ToonMaterial color={palette.teal600} map={weave} />
    </mesh>
  );
}
