"use client";

import { useMemo } from "react";
import { AdditiveBlending, Color, type ColorRepresentation, DoubleSide } from "three";
import { colorKey } from "@/lib/palette";
import { FAKE_LIGHT_LAYER } from "../layers";

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uFalloff;
  varying vec2 vUv;

  void main() {
    // La distance est mesurée en UV : un quad non carré donne donc une ellipse,
    // ce qui suffit à étirer un halo en traînée sans shader séparé.
    float d = min(distance(vUv, vec2(0.5)) * 2.0, 1.0);

    // Fondu en puissance plutôt qu'un smoothstep sur le bord : le smoothstep
    // gardait un coeur uniforme puis coupait net, ce qui lisait comme un
    // autocollant. Ici la densité décroît dès le centre — c'est ce dégradé
    // continu qui donne l'aspect optique.
    float a = pow(1.0 - d, uFalloff);

    gl_FragColor = vec4(uColor, a * uOpacity);
  }
`;

type Props = {
  position: [number, number, number];
  rotation?: [number, number, number];
  /** Largeur et hauteur du quad. Un rapport allongé donne une traînée. */
  size: [number, number];
  color: ColorRepresentation;
  opacity?: number;
  /**
   * Courbe du fondu. Bas (~1.4) = nappe large et douce, pour une lumière
   * indirecte. Haut (~4) = coeur concentré, pour une source vive.
   */
  falloff?: number;
};

/**
 * Tache lumineuse : flaque au sol, halo de lampe, rebond de l'écran, reflet
 * sur le plateau.
 *
 * Volontairement une fausse lumière et non un vrai reflet : une réflexion
 * planaire (`MeshReflectorMaterial`) rendrait la scène une seconde fois par
 * surface réfléchissante. Sur un rendu cartoon en aplats, l'écart visuel ne se
 * voit pas, et le budget GPU reste pour la scène elle-même.
 *
 * `depthWrite: false` mais `depthTest` laissé actif — la tache doit être masquée
 * par ce qui passe devant, sans masquer ce qui passe derrière.
 */
export default function GlowQuad({
  position,
  rotation = [0, 0, 0],
  size,
  color,
  opacity = 0.3,
  falloff = 2.2,
}: Props) {
  // `uColor` est un vec3 : il lui faut un THREE.Color, pas la chaîne hex.
  const uniforms = useMemo(
    () => ({
      uColor: { value: new Color(color) },
      uOpacity: { value: opacity },
      uFalloff: { value: falloff },
    }),
    [color, opacity, falloff],
  );

  return (
    <mesh
      position={position}
      rotation={rotation}
      // Hors du calque des objets : une fausse lumière ne porte pas d'ombre.
      onUpdate={(self) => self.layers.set(FAKE_LIGHT_LAYER)}
    >
      <planeGeometry args={size} />
      <shaderMaterial
        key={`${colorKey(color)}-${opacity}-${falloff}`}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        side={DoubleSide}
      />
    </mesh>
  );
}
