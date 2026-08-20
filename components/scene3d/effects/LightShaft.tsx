"use client";

import { useMemo } from "react";
import { AdditiveBlending, Color, DoubleSide } from "three";
import ShaftDust from "./ShaftDust";

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
  varying vec2 vUv;

  void main() {
    // vUv.y : 0 à la fenêtre, 1 à l'extrémité du faisceau.
    float along = pow(1.0 - vUv.y, 1.7);
    // Bords adoucis, sinon le faisceau a des arêtes de carton.
    float edge = smoothstep(0.0, 0.3, vUv.x) * smoothstep(1.0, 0.7, vUv.x);
    gl_FragColor = vec4(uColor, along * edge * uOpacity);
  }
`;

type Props = {
  /** Centre de l'ouverture par laquelle entre la lumière. */
  origin: [number, number, number];
  width: number;
  length: number;
  /** Inclinaison du faisceau vers le bas, en radians. */
  tilt: number;
  /** Dévers latéral. Sans lui, la caméra frontale regarde dans l'axe du
      faisceau et ne voit qu'une tache, pas un rai. */
  yaw?: number;
  color: string;
  opacity?: number;
  /**
   * Couleur de la lumière clé, dont la poussière prend la teinte. Elle ne vient
   * pas de `color` : `color` est la couleur du ciel qui entre, la poussière,
   * elle, est de la matière ÉCLAIRÉE — c'est la source qui la colore.
   */
  dustTint: string;
};

/**
 * Faisceau de lumière entrant par la fenêtre.
 *
 * Deux plans qui se croisent le long de l'axe plutôt qu'un vrai volume : en
 * additif, leur recoupement suffit à donner l'épaisseur, pour deux quads au lieu
 * d'un rendu volumétrique.
 *
 * Deux et non trois : à trois, les plans se recoupaient en X franc à l'écran et
 * l'effet lisait comme un artefact, pas comme de la lumière. Le faisceau a aussi
 * besoin d'un `yaw` — vu strictement de face, un rai est invisible.
 *
 * L'épaisseur, elle, vient de la POUSSIÈRE (`ShaftDust`) semée dans le même
 * repère : ce sont les grains qui traversent le rai qui font qu'on le lit comme
 * un volume traversé de lumière et non comme deux voiles tendus. Composant
 * séparé parce que c'est un autre métier — géométrie de points et shader de
 * mouvement, là où le rai n'est que deux quads à fondu fixe.
 */
export default function LightShaft({
  origin,
  width,
  length,
  tilt,
  yaw = 0,
  color,
  opacity = 0.22,
  dustTint,
}: Props) {
  const uniforms = useMemo(
    () => ({
      uColor: { value: new Color(color) },
      uOpacity: { value: opacity },
    }),
    [color, opacity],
  );

  const planes = [0, Math.PI / 2];

  return (
    // Deux groupes imbriqués plutôt qu'un Euler à trois angles : le lacet doit
    // s'appliquer en repère monde, l'inclinaison dans le repère déjà pivoté.
    // Nommer l'ordre par l'imbrication évite d'avoir à raisonner sur l'ordre
    // des rotations d'Euler.
    <group position={origin} rotation-y={yaw}>
      <group rotation-x={tilt}>
        {planes.map((angle) => (
          <group key={angle} rotation-z={angle}>
            <mesh rotation-x={Math.PI / 2} position={[0, 0, length / 2]}>
              <planeGeometry args={[width, length]} />
              <shaderMaterial
                key={`${color}-${opacity}`}
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                uniforms={uniforms}
                transparent
                depthWrite={false}
                blending={AdditiveBlending}
                side={DoubleSide}
              />
            </mesh>
          </group>
        ))}

        {/* Dans le repère déjà incliné : le cône de poussière est aligné sur le
            rai sans avoir à refaire le calcul de sa direction. */}
        <ShaftDust width={width} length={length} tilt={tilt} tint={dustTint} />
      </group>
    </group>
  );
}
