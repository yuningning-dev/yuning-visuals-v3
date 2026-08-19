"use client";

import { useLayoutEffect, useRef } from "react";
import type { DirectionalLight } from "three";
import type { LightingPreset } from "@/lib/lighting-presets";

type Props = {
  config: LightingPreset["key"];
};

/**
 * Lumière clé et sa shadow map.
 *
 * Le `updateProjectionMatrix` n'est pas décoratif : React Three Fiber écrit
 * bien `shadow.camera.left/right/top/bottom`, mais Three ne recalcule pas la
 * matrice de projection tout seul. Sans cet appel, le frustum resserré ci-dessous
 * est ignoré et la shadow map continue de couvrir le frustum par défaut — soit
 * une résolution effective divisée par presque trois.
 */
export default function KeyLight({ config }: Props) {
  const light = useRef<DirectionalLight>(null);

  useLayoutEffect(() => {
    light.current?.shadow.camera.updateProjectionMatrix();
  }, [config]);

  return (
    <directionalLight
      ref={light}
      position={config.position}
      intensity={config.intensity}
      color={config.color}
      castShadow
      shadow-mapSize={[2048, 2048]}
      // normalBias décolle l'échantillon de la surface : sans lui, les faces
      // rasantes à la lumière se strient d'acné d'ombre.
      shadow-normalBias={0.15}
      shadow-bias={-0.0004}
      // Frustum resserré sur l'étendue réelle du bureau : à cadrage égal,
      // chaque texel de la shadow map couvre moins de surface.
      shadow-camera-left={-3}
      shadow-camera-right={3}
      shadow-camera-top={3}
      shadow-camera-bottom={-3}
      shadow-camera-near={0.5}
      shadow-camera-far={12}
    />
  );
}
