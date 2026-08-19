"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { Object3D } from "three";
import type { InstancedMesh } from "three";
import { palette } from "@/lib/palette";
import ToonMaterial from "../ToonMaterial";

const COLS = 14;
const ROWS = 5;
const KEY = 0.055;
const GAP = 0.012;

const BASE_WIDTH = COLS * (KEY + GAP) + GAP * 3;
const BASE_DEPTH = ROWS * (KEY + GAP) + GAP * 3;
const BASE_HEIGHT = 0.035;

/**
 * Clavier. Les touches sont instanciées : 70 boîtes en un seul draw call, ce
 * qui rend le détail gratuit. Un clavier sans touches lit comme une planche.
 */
export default function Keyboard() {
  const keys = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);

  useLayoutEffect(() => {
    const mesh = keys.current;
    if (!mesh) return;

    let i = 0;
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        dummy.position.set(
          (col - (COLS - 1) / 2) * (KEY + GAP),
          0,
          (row - (ROWS - 1) / 2) * (KEY + GAP),
        );
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        i += 1;
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [dummy]);

  return (
    <group position={[0, 0, 0.42]}>
      <mesh position={[0, BASE_HEIGHT / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[BASE_WIDTH, BASE_HEIGHT, BASE_DEPTH]} />
        <ToonMaterial color={palette.shell500} />
      </mesh>

      <instancedMesh
        ref={keys}
        args={[undefined, undefined, ROWS * COLS]}
        position={[0, BASE_HEIGHT + 0.008, 0]}
        castShadow
      >
        <boxGeometry args={[KEY, 0.016, KEY]} />
        <ToonMaterial color={palette.paper} />
      </instancedMesh>
    </group>
  );
}
