"use client";

import { useMemo } from "react";
import { Color, type ColorRepresentation } from "three";
import { colorKey } from "@/lib/palette";

/**
 * Le ciel vu par la fenêtre, en dégradé vertical.
 *
 * POURQUOI UN PLAN ET PAS UN DÔME. Un dôme de ciel derrière la scène ne
 * rendrait aucun pixel : la pièce remplit tout le cadre (murs, sol, plafond de
 * l'ouverture), la couleur de fond du Canvas n'est visible NULLE PART — vérifié
 * en la passant en magenta, pas un pixel ne change. Le seul endroit où l'on
 * voit du ciel, c'est l'ouverture de la fenêtre. Le dégradé est donc posé là,
 * sur le plan de fond qui s'y trouvait déjà : même géométrie, même coût, une
 * valeur de plus.
 *
 * CE QUE LE DÉGRADÉ DIT. Un ciel réel n'est pas un aplat : il est plus profond
 * au zénith, plus pâle à l'horizon, où l'épaisseur d'atmosphère traversée est la
 * plus grande. C'est la même mécanique que la brume de la skyline, en vertical.
 * Les deux teintes sont DÉRIVÉES de la couleur du preset et non posées à la
 * main : un ciel de nuit doit se dégrader comme un ciel de jour, et la
 * direction n'a qu'une couleur à régler.
 */

/** Le zénith est plus sombre que la couleur de référence. Sous AgX, descendre
 *  en luminosité fait aussi remonter la saturation — le haut du ciel est donc
 *  plus franc, ce qui est exactement le comportement d'un vrai ciel. */
const ZENITH_SCALE = 0.62;

/** L'horizon est plus pâle. Volontairement court : au-delà, il blanchit et le
 *  dormant de la fenêtre ne se détache plus dessus. */
const HORIZON_SCALE = 1.14;

const vertexShader = /* glsl */ `
  varying float vWorldY;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldY = world.y;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uZenith;
  uniform vec3 uHorizon;
  uniform float uLow;
  uniform float uHigh;
  varying float vWorldY;

  void main() {
    float t = clamp((vWorldY - uLow) / (uHigh - uLow), 0.0, 1.0);
    // Courbe et non rampe droite : l'essentiel du changement se fait dans le
    // bas du ciel, comme dehors. Une rampe linéaire lit comme un dégradé de
    // logiciel de dessin.
    gl_FragColor = vec4(mix(uHorizon, uZenith, pow(t, 1.35)), 1.0);
  }
`;

type Props = {
  position: [number, number, number];
  /** Largeur et hauteur du plan de fond. */
  size: [number, number];
  /** Couleur de référence du preset — la valeur du ciel à mi-hauteur. */
  sky: ColorRepresentation;
  /**
   * Bande de hauteur monde sur laquelle court le dégradé. À caler sur
   * l'OUVERTURE de la fenêtre et non sur le plan : le plan déborde largement de
   * l'ouverture (il doit couvrir le cône de vision), et un dégradé étalé sur
   * toute sa hauteur ne montrerait qu'une tranche fade dans la partie visible.
   */
  band: [number, number];
};

export default function SkyGradient({ position, size, sky, band }: Props) {
  const uniforms = useMemo(() => {
    const base = new Color(sky);
    return {
      uZenith: { value: base.clone().multiplyScalar(ZENITH_SCALE) },
      uHorizon: { value: base.clone().multiplyScalar(HORIZON_SCALE) },
      uLow: { value: band[0] },
      uHigh: { value: band[1] },
    };
  }, [sky, band]);

  return (
    <mesh position={position}>
      <planeGeometry args={size} />
      <shaderMaterial
        // Les uniformes sont mémoïsés : sans remontage, un changement de preset
        // ne les reprendrait pas.
        key={colorKey(sky)}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}
