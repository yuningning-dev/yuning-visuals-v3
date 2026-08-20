"use client";

import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { Color, Box3, Mesh, MeshToonMaterial, Vector3 } from "three";
import { palette } from "@/lib/palette";
import { toonGradient } from "@/lib/toon";

const MODEL_URL = "/models/camera.glb";

/** Largeur cible en unités de scène : ~12 cm de boîtier à l'échelle du bureau. */
const TARGET_WIDTH = 0.26;

export const CAMERA_TRANSFORM = {
  position: [-1.12, 0, 0.24] as [number, number, number],
  rotationY: 0.7,
};

/**
 * Les quatre matériaux du modèle Sketchfab sont des gris à plat. On les remplace
 * par la palette du projet : un modèle importé qui garde ses propres gris casse
 * le cel-shading de toute la scène.
 */
const MATERIAL_COLORS: Record<string, Color> = {
  Black: palette.dusk950,
  Grey_1: palette.shell700,
  Grey_2: palette.shell500,
  blueish: palette.shell300,
};

/**
 * Appareil photo — seul objet de la scène qui ne soit pas modélisé en code.
 * Les bagues et molettes du boîtier ne se font pas proprement en primitives.
 *
 * L'échelle et l'assiette sont calculées depuis la boîte englobante réelle
 * plutôt qu'écrites en dur : l'export Sketchfab est en Z-up avec un pivot au
 * sommet du modèle, et deviner ces conventions à la main est le meilleur moyen
 * de se retrouver avec un appareil enterré sous le plateau.
 */
export default function CameraSlot() {
  const { scene } = useGLTF(MODEL_URL);

  const { model, scale, offset } = useMemo(() => {
    const root = scene.clone(true);
    const created: MeshToonMaterial[] = [];

    root.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      child.castShadow = true;
      child.receiveShadow = true;

      const name = Array.isArray(child.material)
        ? child.material[0]?.name
        : child.material?.name;

      const material = new MeshToonMaterial({
        color: MATERIAL_COLORS[name ?? ""] ?? palette.shell500,
        gradientMap: toonGradient(3),
      });
      created.push(material);
      child.material = material;
    });

    const box = new Box3().setFromObject(root);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const s = TARGET_WIDTH / size.x;

    return {
      model: root,
      scale: s,
      // Recentré en X/Z, base posée exactement sur le plateau.
      offset: [-center.x * s, -box.min.y * s, -center.z * s] as [
        number,
        number,
        number,
      ],
      materials: created,
    };
  }, [scene]);

  useEffect(() => {
    return () => {
      model.traverse((child) => {
        if (child instanceof Mesh && child.material instanceof MeshToonMaterial) {
          child.material.dispose();
        }
      });
    };
  }, [model]);

  return (
    <group
      position={CAMERA_TRANSFORM.position}
      rotation-y={CAMERA_TRANSFORM.rotationY}
    >
      <group scale={scale} position={offset}>
        <primitive object={model} />
      </group>
    </group>
  );
}

useGLTF.preload(MODEL_URL);
