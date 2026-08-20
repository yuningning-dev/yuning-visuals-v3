"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh, MeshToonMaterial } from "three";
import { palette } from "@/lib/palette";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import ToonMaterial from "../ToonMaterial";

const BODY_W = 0.098;
const BODY_H = 0.29;
const BODY_D = 0.058;
const FRONT = BODY_D / 2;

/**
 * DJI Osmo Pocket, d'après `references/osmo pocket 4 2.jpg`.
 *
 * Corrigé sur la seconde référence, qui contredit la première : l'écran est
 * ENCASTRÉ dans la façade, il ne déborde pas sur le côté. La façade est un
 * bandeau légèrement en saillie qui ne couvre pas toute la largeur du corps —
 * c'est ce décrochement latéral, visible en trois-quarts, qui donne à l'objet
 * son épaisseur.
 *
 * Au-dessus, la nacelle en trois temps : embase cylindrique, bras oblique
 * décalé, tête horizontale. C'est l'obliquité du bras qui empêche l'objet de
 * lire comme une simple télécommande.
 */
export default function OsmoPocket() {
  const gimbalBaseY = BODY_H + 0.014;
  const armY = gimbalBaseY + 0.055;
  const headY = armY + 0.055;

  return (
    <group position={[-0.7, 0, 0.5]} rotation-y={0.5}>
      <mesh position={[0, BODY_H / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[BODY_W, BODY_H, BODY_D]} />
        <ToonMaterial color={palette.shell700} />
      </mesh>

      {/* Bandeau de façade en saillie, décalé vers la droite du corps. */}
      <mesh position={[0.012, BODY_H * 0.53, FRONT + 0.004]} castShadow>
        <boxGeometry args={[BODY_W * 0.76, BODY_H * 0.84, 0.009]} />
        <ToonMaterial color={palette.shell500} />
      </mesh>

      {/* Écran encastré, presque carré, dans le haut de la façade. */}
      <mesh position={[0.012, BODY_H * 0.68, FRONT + 0.0095]}>
        <planeGeometry args={[BODY_W * 0.6, BODY_H * 0.27]} />
        <meshBasicMaterial color={palette.teal400} />
      </mesh>

      {/* Bloc de commandes : deux boutons ronds et la LED d'état. */}
      {[-0.016, 0.028].map((x) => (
        <mesh
          key={x}
          position={[0.012 + x, BODY_H * 0.24, FRONT + 0.009]}
          rotation-x={Math.PI / 2}
        >
          <cylinderGeometry args={[0.014, 0.014, 0.005, 12]} />
          <ToonMaterial color={palette.shell300} />
        </mesh>
      ))}
      <mesh position={[-0.004, BODY_H * 0.24, FRONT + 0.012]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.005, 0.005, 0.004, 8]} />
        <meshBasicMaterial color={palette.coral400} />
      </mesh>
      <StatusLed position={[-0.012, BODY_H * 0.33, FRONT + 0.008]} />

      {/* Embase de nacelle. */}
      <mesh position={[0.008, gimbalBaseY, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.032, 0.028, 14]} />
        <ToonMaterial color={palette.shell500} />
      </mesh>

      {/* Bras oblique, décalé : sans cette inclinaison la nacelle lit comme un
          simple bouchon posé sur le corps. */}
      <mesh position={[-0.004, armY, -0.004]} rotation-z={0.42} castShadow>
        <boxGeometry args={[0.028, 0.085, 0.032]} />
        <ToonMaterial color={palette.shell700} />
      </mesh>

      {/* Tête : barillet de roulis à gauche, bloc objectif à droite. */}
      <group position={[-0.03, headY, 0.004]} rotation-z={-0.12}>
        <mesh rotation-z={Math.PI / 2} castShadow>
          <cylinderGeometry args={[0.032, 0.032, 0.05, 14]} />
          <ToonMaterial color={palette.shell700} />
        </mesh>

        <mesh position={[0.052, 0.002, 0.004]} castShadow>
          <boxGeometry args={[0.058, 0.062, 0.05]} />
          <ToonMaterial color={palette.shell500} />
        </mesh>

        <mesh position={[0.052, 0.002, 0.031]}>
          <planeGeometry args={[0.042, 0.046]} />
          <ToonMaterial color={palette.dusk950} />
        </mesh>
        <mesh position={[0.052, 0.002, 0.0325]}>
          <circleGeometry args={[0.017, 14]} />
          <meshBasicMaterial color={palette.teal300} />
        </mesh>
      </group>
    </group>
  );
}

/* -------------------------------------------------------------------------- */

/** Couleur de la diode. Vert franc, tirant sur le cyan : sur le corail et le
 *  prune de la scène, un vert plus jaune se confondrait avec les hautes
 *  lumières de la lampe. */
const LED_COLOR = "#00ff44";

/** Intensité au sommet du clignotement. Au-dessus du seuil de bloom de
 *  `PostFX`, donc la diode déborde d'un halo — c'est lui qu'on voit à cette
 *  taille, pas les 4 mm de sphère. */
const LED_PEAK = 2;

/** Braise entre deux éclats. Pas zéro : une diode éteinte disparaît, et l'objet
 *  redevient mort la plus grande partie du temps. */
const LED_IDLE = 0.15;

/** Sous `prefers-reduced-motion`, la diode est FIXE à mi-course : l'objet reste
 *  allumé, plus rien ne clignote. */
const LED_STEADY = LED_PEAK / 2;

/**
 * Pulsation : `sin(4t)` repasse au-dessus du seuil toutes les ~1.57 s, et n'y
 * reste que ~0.23 s. C'est ce rapport très déséquilibré qui fait lire un témoin
 * d'enregistrement plutôt qu'une lampe qui pompe.
 */
const LED_SPEED = 4;
const LED_THRESHOLD = 0.8;

const MAX_DELTA = 0.1;

/**
 * Diode d'état de l'Osmo.
 *
 * Une SPHÈRE et non le plan qui était là avant : à cette taille on ne lit pas la
 * forme, on lit le halo, et une sphère l'accroche sous tous les angles alors
 * qu'un plan disparaît dès que l'objet tourne un peu.
 *
 * `emissiveIntensity` est écrite directement sur le matériau du mesh, sans
 * passer par le state React : c'est une valeur par frame, elle n'a rien à faire
 * dans un rendu.
 */
function StatusLed({ position }: { position: [number, number, number] }) {
  const mesh = useRef<Mesh>(null);
  const reduced = useReducedMotion();
  const time = useRef(0);

  useFrame((_, delta) => {
    const material = mesh.current?.material as MeshToonMaterial | undefined;
    if (!material) return;

    if (reduced) {
      material.emissiveIntensity = LED_STEADY;
      return;
    }

    const dt = Math.min(delta, MAX_DELTA);
    time.current += dt;

    // Le seuil coupe la sinusoïde ; ce qui dépasse est renormalisé de 0 à 1.
    // Sans cette renormalisation, la diode s'allumerait d'un cran net — ici
    // elle monte et redescend, ce qui donne une vraie inertie de filament.
    const wave = Math.sin(time.current * LED_SPEED);
    const pulse =
      wave > LED_THRESHOLD ? (wave - LED_THRESHOLD) / (1 - LED_THRESHOLD) : 0;

    material.emissiveIntensity = LED_IDLE + (LED_PEAK - LED_IDLE) * pulse;
  });

  return (
    <mesh ref={mesh} position={position}>
      <sphereGeometry args={[0.004, 10, 8]} />
      <ToonMaterial
        color={LED_COLOR}
        emissive={LED_COLOR}
        emissiveIntensity={LED_IDLE}
      />
    </mesh>
  );
}
