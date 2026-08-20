"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, type Mesh, type MeshBasicMaterial } from "three";
import { palette } from "@/lib/palette";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { layout } from "../scene-layout";
import GlowQuad from "../effects/GlowQuad";
import ToonMaterial from "../ToonMaterial";
import PostIt from "./PostIt";

const { monitor } = layout;

const BEZEL = 0.06;
const BODY_DEPTH = 0.07;

/**
 * Facteur d'émission de la dalle. La couleur de base est multipliée par cette
 * valeur, donc la dalle SORT de [0,1] : c'est ce dépassement, et lui seul, qui
 * la fait déborder au bloom et rouler vers le blanc sous AgX au lieu de rester
 * l'aplat sombre qu'elle était.
 *
 * 3 et non davantage : au-delà, la dalle vire au turquoise laiteux et le
 * moniteur perd sa silhouette contre la fenêtre — exactement ce que la teinte
 * sombre était là pour éviter.
 */
const SCREEN_EMISSIVE = 3;

/** Battement de la dalle. ±8 % autour de la valeur d'émission, période ~3 s :
 *  c'est le souffle d'un rétroéclairage, pas un néon qui grésille. */
/**
 * Émission du liseré de dalle. C'est LUI qui déborde au bloom, pas la dalle :
 * une dalle sombre ne peut pas franchir le seuil sans cesser d'être sombre, et
 * elle doit le rester pour ne pas se confondre avec la fenêtre juste derrière.
 * Le halo vient donc du bord — ce qui est aussi ce qu'on voit d'un écran allumé
 * dans une pièce sombre : le pourtour bave, le noir reste noir.
 */
const RIM_EMISSIVE = 2.6;

const FLICKER_DEPTH = 0.08;
const FLICKER_SPEED = 2;

const MAX_DELTA = 0.1;

const SCREEN_W = monitor.screenWidth;
const SCREEN_H = monitor.screenHeight;
const HALF_W = SCREEN_W / 2;
const HALF_H = SCREEN_H / 2;

type Props = {
  /** Passé au post-it, qui n'existe que sur desktop. */
  showPostIt?: boolean;
};

/**
 * Moniteur. La dalle est un plan non éclairé : c'est elle qui recevra la
 * texture du faux OS, et une texture d'interface ne doit pas subir l'éclairage
 * de la pièce sous peine de devenir illisible.
 */
export default function Monitor({ showPostIt = true }: Props) {
  const screenRim = useMemo(
    () => new Color(palette.teal500).multiplyScalar(RIM_EMISSIVE),
    [],
  );
  const bodyWidth = monitor.screenWidth + BEZEL * 2;
  const bodyHeight = monitor.screenHeight + BEZEL * 2;
  const bottomY = monitor.centerY - bodyHeight / 2;

  return (
    <group position={[0, 0, monitor.z]}>
      <mesh position={[0, 0.018, 0.12]} castShadow receiveShadow>
        <boxGeometry args={[0.52, 0.035, 0.3]} />
        <ToonMaterial color={palette.shell700} />
      </mesh>

      <mesh position={[0, bottomY / 2, 0.02]} castShadow>
        <boxGeometry args={[0.1, bottomY, 0.08]} />
        <ToonMaterial color={palette.shell500} />
      </mesh>

      <mesh position={[0, monitor.centerY, 0]} castShadow receiveShadow>
        <boxGeometry args={[bodyWidth, bodyHeight, BODY_DEPTH]} />
        <ToonMaterial color={palette.shell700} />
      </mesh>

      {/* PAS DE LISERÉ DE CONTOUR ICI — voir CLAUDE.md. Une coque en `BackSide`
          autour d'une BOÎTE ne donne pas un trait : elle donne un bandeau plat.
          La silhouette du moniteur tient toute seule, en valeur, contre le ciel
          de la fenêtre ; ce qui dit « l'écran est allumé », c'est le liseré
          émissif de la dalle juste en dessous et la nappe des quatre `GlowQuad`. */}

      {/* Placeholder du faux OS : sera remplacé par une render target. */}
      <ScreenPanel position={[0, monitor.centerY, BODY_DEPTH / 2 + 0.002]} />

      {/* Liseré allumé : le seul signe que l'écran est sous tension tant que
          la texture du faux OS n'est pas branchée. Poussé au-dessus de 1 : c'est
          le seul élément de la dalle qui franchit le seuil du bloom. */}
      <mesh position={[0, monitor.centerY, BODY_DEPTH / 2 + 0.001]}>
        <planeGeometry
          args={[monitor.screenWidth + 0.02, monitor.screenHeight + 0.02]}
        />
        <meshBasicMaterial color={screenRim} />
      </mesh>

      {/* Lueur des bords. Posée DEVANT la dalle, et c'est tout l'intérêt : elle
          déborde vers l'extérieur sur le cadre, mais aussi vers l'intérieur sur
          le noir de la dalle. Placée derrière, la dalle masquerait la moitié
          interne et il ne resterait qu'un halo sur le plastique — l'écran
          resterait le trou noir qu'on cherche à habiter.

          Quatre quads plutôt qu'un seul grand : le dégradé de `GlowQuad` est
          radial, donc un quad unique aux dimensions de l'écran s'allumerait au
          CENTRE, là où l'on ne veut rien. Chaque quad est plus long que son bord
          pour que les quatre se recouvrent aux angles, sinon le halo se lit en
          quatre taches distinctes au lieu d'un pourtour continu.

          `falloff` bas : c'est une nappe, pas une source. Monter l'opacité
          donnerait un liseré dur, et il y en a déjà un juste au-dessus. */}
      {(
        [
          { pos: [0, HALF_H, 0], size: [SCREEN_W + 0.17, 0.3] },
          { pos: [0, -HALF_H, 0], size: [SCREEN_W + 0.17, 0.3] },
          { pos: [-HALF_W, 0, 0], size: [0.3, SCREEN_H + 0.17] },
          { pos: [HALF_W, 0, 0], size: [0.3, SCREEN_H + 0.17] },
        ] as const
      ).map(({ pos, size }, i) => (
        <GlowQuad
          key={i}
          position={[pos[0], monitor.centerY + pos[1], BODY_DEPTH / 2 + 0.005]}
          size={[size[0], size[1]]}
          color={palette.teal400}
          opacity={0.15}
          falloff={1.7}
        />
      ))}

      {/* Glare de dalle : deux traînées obliques. C'est la convention cartoon
          qui dit « c'est du verre » — sans elles, la dalle lit comme un carton
          peint. Placées à gauche pour laisser le post-it lisible à droite. */}
      <GlowQuad
        position={[-0.42, monitor.centerY + 0.05, BODY_DEPTH / 2 + 0.004]}
        rotation={[0, 0, -0.62]}
        size={[0.22, 1.15]}
        color={palette.sky}
        opacity={0.13}
        falloff={2.8}
      />
      <GlowQuad
        position={[-0.19, monitor.centerY - 0.02, BODY_DEPTH / 2 + 0.004]}
        rotation={[0, 0, -0.62]}
        size={[0.11, 0.72]}
        color={palette.sky}
        opacity={0.1}
        falloff={3}
      />

      {/* Rebond de l'écran sur le plateau : une dalle allumée éclaire toujours
          un peu le bureau devant elle. */}
      <GlowQuad
        position={[0, 0.006, 0.42]}
        rotation={[-Math.PI / 2, 0, 0]}
        size={[2.3, 1.25]}
        color={palette.teal400}
        opacity={0.12}
        falloff={1.6}
      />

      {showPostIt && (
        <PostIt
          position={[
            bodyWidth / 2 - 0.24,
            monitor.centerY - bodyHeight / 2 + 0.2,
            BODY_DEPTH / 2 + 0.006,
          ]}
        />
      )}
    </group>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Dalle allumée.
 *
 * MATÉRIAU NON ÉCLAIRÉ, et l'émission passe par la COULEUR poussée au-dessus
 * de 1 — pas par `emissive` sur un matériau éclairé. Les deux donnent le même
 * pixel (un `emissive × emissiveIntensity` sur un albédo noir n'est rien
 * d'autre qu'une couleur non éclairée), mais un matériau éclairé exposerait la
 * dalle à la lampe de la pièce, alors qu'elle doit rester lisible telle quelle :
 * c'est elle qui recevra la texture du faux OS, et une interface qui s'assombrit
 * du côté opposé à la lampe est une interface illisible.
 *
 * La teinte reste `palette.screen`, sombre et froide : une dalle blanche se
 * confondait avec la fenêtre juste derrière et le moniteur perdait sa
 * silhouette. Ce qui change avec AgX, c'est qu'elle ÉMET cette teinte au lieu
 * de la refléter.
 */
function ScreenPanel({ position }: { position: [number, number, number] }) {
  const mesh = useRef<Mesh>(null);
  const reduced = useReducedMotion();
  const time = useRef(0);

  const base = useMemo(
    () => new Color(palette.screen).multiplyScalar(SCREEN_EMISSIVE),
    [],
  );

  useFrame((_, delta) => {
    if (reduced) return;

    const material = mesh.current?.material as MeshBasicMaterial | undefined;
    if (!material) return;

    const dt = Math.min(delta, MAX_DELTA);
    time.current += dt;

    material.color
      .copy(base)
      .multiplyScalar(1 + Math.sin(time.current * FLICKER_SPEED) * FLICKER_DEPTH);
  });

  return (
    <mesh ref={mesh} position={position}>
      <planeGeometry args={[monitor.screenWidth, monitor.screenHeight]} />
      <meshBasicMaterial color={base} />
    </mesh>
  );
}
