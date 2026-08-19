"use client";

import { palette } from "@/lib/palette";
import { layout } from "../scene-layout";
import ToonMaterial from "../ToonMaterial";

const { wall } = layout;
const FRONT_Z = wall.z + wall.thickness / 2 + 0.012;

type Note = {
  x: number;
  y: number;
  size: number;
  tilt: number;
  color: string;
};

/**
 * Post-its et tirages punaisés autour de la fenêtre, repris de l'ambiance de
 * `references/bureau 1.jpg`.
 *
 * Ils ne sont pas décoratifs au sens gratuit : le mur occupait un tiers du
 * cadre en aplat corail uniforme, sans rien pour donner l'échelle de la pièce.
 * Ces éléments ne se lisent qu'en périphérie — d'où leur cantonnement aux
 * bandes latérales, hors de la zone où l'oeil doit aller (le moniteur).
 */
const NOTES: Note[] = [
  { x: -2.16, y: 1.66, size: 0.2, tilt: 0.09, color: palette.postit },
  { x: -1.9, y: 1.36, size: 0.17, tilt: -0.13, color: palette.teal300 },
  { x: -2.12, y: 1.12, size: 0.18, tilt: 0.05, color: palette.coral300 },
  { x: -1.88, y: 0.84, size: 0.15, tilt: 0.17, color: palette.postit },
  { x: 1.94, y: 1.52, size: 0.19, tilt: -0.08, color: palette.postit },
  { x: 2.16, y: 1.2, size: 0.16, tilt: 0.12, color: palette.teal300 },
];

/** Tirage encadré : liseré clair, image sombre — un polaroid vu de loin. */
function Print({
  x,
  y,
  width,
  height,
  tilt,
  inner,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  tilt: number;
  inner: string;
}) {
  return (
    <group position={[x, y, FRONT_Z]} rotation-z={tilt}>
      <mesh castShadow>
        <boxGeometry args={[width, height, 0.012]} />
        <ToonMaterial color={palette.paper} />
      </mesh>
      <mesh position={[0, height * 0.06, 0.008]}>
        <planeGeometry args={[width * 0.86, height * 0.74]} />
        <ToonMaterial color={inner} />
      </mesh>
    </group>
  );
}

export default function WallDecor() {
  return (
    <group>
      <Print
        x={-2.02}
        y={1.98}
        width={0.44}
        height={0.56}
        tilt={-0.04}
        inner={palette.dusk700}
      />
      <Print
        x={2.08}
        y={1.92}
        width={0.4}
        height={0.5}
        tilt={0.06}
        inner={palette.teal600}
      />

      {NOTES.map((note) => (
        <group
          key={`${note.x}:${note.y}`}
          position={[note.x, note.y, FRONT_Z]}
          rotation-z={note.tilt}
        >
          <mesh castShadow>
            <boxGeometry args={[note.size, note.size, 0.006]} />
            <ToonMaterial color={note.color} />
          </mesh>
          {[0.22, 0.02, -0.18].map((offset, index) => (
            <mesh
              key={offset}
              position={[
                index === 2 ? -note.size * 0.12 : 0,
                note.size * offset,
                0.005,
              ]}
            >
              <planeGeometry
                args={[note.size * (index === 2 ? 0.42 : 0.62), note.size * 0.055]}
              />
              <meshBasicMaterial color={palette.shell700} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
