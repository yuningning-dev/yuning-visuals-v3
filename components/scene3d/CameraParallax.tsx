"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { MathUtils, Spherical, Vector3 } from "three";
import { useFinePointer } from "@/lib/use-media-query";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { cameraBase, resetCameraBase } from "./camera-pose";

/**
 * Amplitude, en degrés d'orbite autour du point visé.
 *
 * Le vertical est plus court que l'horizontal, et ce n'est pas un hasard : la
 * scène est cadrée serré en hauteur (le dormant de la fenêtre affleure déjà le
 * bord haut), et l'oeil tolère beaucoup moins bien un basculement vertical.
 */
const MAX_YAW = MathUtils.degToRad(2.5);
const MAX_PITCH = MathUtils.degToRad(1.5);

/**
 * Vitesse du rattrapage. ~3 donne une constante de temps d'un tiers de seconde :
 * le mouvement traîne derrière le curseur au lieu d'y être collé. Monter cette
 * valeur rend l'effet nerveux, la descendre le rend mou et pâteux.
 */
const LAMBDA = 3;

/** Un onglet en arrière-plan revient avec un `delta` énorme, qui téléporterait
 *  la caméra à la première frame. Plafonné à deux frames à 30 Hz. */
const MAX_DELTA = 1 / 15;

/**
 * Parallax caméra suivant le curseur.
 *
 * C'est une ORBITE autour du point visé, pas une translation : la caméra se
 * déplace de quelques degrés sur une sphère et continue de regarder le même
 * point. C'est ce qui produit le décalage entre le premier plan et le fond —
 * translater la caméra en gardant son axe ferait glisser toute l'image d'un
 * bloc, sans profondeur.
 *
 * Cet effet est le SEUL endroit qui écrit dans `camera.position`. Il lit sa pose
 * de base dans `camera-pose.ts` et compose son décalage par-dessus, de sorte que
 * la transition scroll/clic à venir n'a qu'à animer cette base pour que les deux
 * mouvements coexistent. Voir le contrat détaillé dans ce fichier.
 *
 * Neutralisé sans pointeur fin (le tactile n'a pas de position au repos) et sous
 * `prefers-reduced-motion`. Dans les deux cas la caméra revient à sa base par le
 * même amortissement, elle ne se remet pas en place d'un coup.
 */
export default function CameraParallax() {
  const camera = useThree((state) => state.camera);
  const reduced = useReducedMotion();
  const finePointer = useFinePointer();
  const enabled = finePointer && !reduced;

  // Angles courants, hors du state React : ils changent à chaque frame et ne
  // doivent rien redessiner.
  const yaw = useRef(0);
  const pitch = useRef(0);

  // Alloués une fois. Un `new Vector3()` par frame donnerait au GC de quoi
  // hoqueter pendant une animation qu'on veut lisse.
  const offset = useRef(new Vector3()).current;
  const spherical = useRef(new Spherical()).current;

  useEffect(resetCameraBase, []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, MAX_DELTA);

    // Souris à droite : la caméra part à droite. Souris en haut : elle monte —
    // d'où le signe, `phi` se mesure depuis le pôle et décroît vers le haut.
    const targetYaw = enabled ? state.pointer.x * MAX_YAW : 0;
    const targetPitch = enabled ? -state.pointer.y * MAX_PITCH : 0;

    // `damp` et non un `lerp` à coefficient fixe : un lerp avance d'une fraction
    // PAR FRAME, donc deux fois plus vite sur un écran 120 Hz que sur un 60 Hz.
    // `damp` intègre le temps écoulé et donne le même mouvement partout.
    yaw.current = MathUtils.damp(yaw.current, targetYaw, LAMBDA, dt);
    pitch.current = MathUtils.damp(pitch.current, targetPitch, LAMBDA, dt);

    offset.copy(cameraBase.position).sub(cameraBase.target);
    spherical.setFromVector3(offset);
    spherical.theta += yaw.current;
    // Bornes strictes : `phi` à 0 ou π place la caméra au pôle, où l'axe de
    // visée devient colinéaire au vecteur haut et où `lookAt` perd son roulis.
    spherical.phi = MathUtils.clamp(
      spherical.phi + pitch.current,
      0.05,
      Math.PI - 0.05,
    );
    offset.setFromSpherical(spherical);

    camera.position.copy(cameraBase.target).add(offset);
    camera.lookAt(cameraBase.target);
  });

  return null;
}
