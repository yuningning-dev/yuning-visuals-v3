"use client";

import { useMemo } from "react";
import { AdditiveBlending, BackSide, Color, type ColorRepresentation } from "three";
import { colorKey } from "@/lib/palette";
import { FAKE_LIGHT_LAYER } from "../layers";

const vertexShader = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vToEye;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    // normalMatrix est en espace vue ; ici on veut le monde, d'ou mat3 du
    // modelMatrix. La coque n'est jamais mise a l'echelle de facon non
    // uniforme, sinon il faudrait passer par l'inverse transposee.
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vToEye = cameraPosition - worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uPower;

  varying vec3 vNormalW;
  varying vec3 vToEye;

  void main() {
    // abs() et non un dot signe : la coque est rendue en BackSide, ses normales
    // pointent donc a l'oppose de l'oeil. Sans la valeur absolue le terme part
    // dans les negatifs et tout le contour s'eteint.
    float facing = abs(dot(normalize(vNormalW), normalize(vToEye)));
    float rim = pow(clamp(1.0 - facing, 0.0, 1.0), uPower);
    gl_FragColor = vec4(uColor, rim * uIntensity);
  }
`;

type Props = {
  /** Dimensions de la coque — à prendre légèrement plus grandes que l'objet. */
  args: [number, number, number];
  position?: [number, number, number];
  color: ColorRepresentation;
  /** Volontairement bas : c'est un liseré, pas une source. */
  intensity?: number;
  /** Plus haut = liseré plus serré sur la silhouette. */
  power?: number;
};

/**
 * Liseré de contour type rim light, en coque autour d'un volume.
 *
 * POURQUOI UNE COQUE EN `BackSide` plutôt qu'un fresnel posé sur l'objet.
 * Le corps du moniteur est une boîte, donc ses faces sont PLATES : un fresnel
 * appliqué dessus rendrait une valeur constante par face — face avant éteinte,
 * faces latérales allumées d'un bloc. Aucun dégradé, et vu de face les côtés
 * d'une boîte centrée sur l'axe de la caméra sont rigoureusement de chant, donc
 * invisibles. Le fresnel « classique » ne donne rien sur cette géométrie.
 *
 * En rendant à la place une coque un peu plus grande et en n'affichant que ses
 * faces ARRIÈRE, seule la couronne qui déborde de l'objet reste visible : le
 * corps, opaque et écrit dans le depth buffer, masque tout le reste. On obtient
 * un contour net et symétrique sur les quatre côtés.
 *
 * Le terme de fresnel garde son intérêt : il module la couronne selon l'angle,
 * donc le liseré respire quand le parallax déplace la caméra au lieu d'être un
 * autocollant à opacité fixe.
 *
 * `depthWrite: false` et mélange additif : le liseré s'ajoute à ce qu'il y a
 * derrière sans jamais occulter, et ne perturbe pas le cel-shading — il ne
 * touche pas à l'éclairage des matériaux, il se superpose.
 */
export default function FresnelRim({
  args,
  position = [0, 0, 0],
  color,
  intensity = 0.5,
  power = 1.6,
}: Props) {
  const uniforms = useMemo(
    () => ({
      uColor: { value: new Color(color) },
      uIntensity: { value: intensity },
      uPower: { value: power },
    }),
    [color, intensity, power],
  );

  return (
    <mesh
      position={position}
      onUpdate={(self) => self.layers.set(FAKE_LIGHT_LAYER)}
    >
      <boxGeometry args={args} />
      <shaderMaterial
        key={`${colorKey(color)}-${intensity}-${power}`}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        side={BackSide}
      />
    </mesh>
  );
}
