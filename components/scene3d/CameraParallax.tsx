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

/* ------------------------------- dérive au repos ------------------------- */

/** Silence du pointeur avant que la dérive prenne la main, en secondes. */
const IDLE_DELAY = 3;

/**
 * Seuil de détection du mouvement, en unités de `pointer` (-1 à 1). Assez haut
 * pour ignorer le bruit d'un trackpad posé, assez bas pour qu'un vrai geste
 * coupe la dérive immédiatement.
 */
const POINTER_EPSILON = 0.002;

/**
 * Deux périodes VOLONTAIREMENT non harmoniques : à 8 s et 11 s, le lacet et le
 * tangage ne repassent ensemble par la même position que toutes les 88 s. Des
 * périodes égales ou multiples dessineraient une ellipse fermée, que l'oeil
 * repère en deux tours et qui trahit la boucle.
 */
const DRIFT_YAW_PERIOD = 8;
const DRIFT_PITCH_PERIOD = 11;

/**
 * Amplitude de la dérive, en radians d'orbite. Du même ordre que le parallax
 * souris (~0.044 rad) mais en dessous : le mouvement doit se sentir sans se
 * voir — on ne doit jamais avoir l'impression que la caméra part toute seule.
 */
const DRIFT_YAW = 0.03;
const DRIFT_PITCH = 0.018;

/**
 * Fondu d'entrée et de sortie de la dérive. Bien plus lent que `LAMBDA` : la
 * dérive doit s'installer sans qu'on puisse dater son départ, et s'effacer sous
 * le geste dès que la main revient sur la souris.
 */
const IDLE_LAMBDA = 0.8;

const TAU = Math.PI * 2;

/**
 * Parallax caméra suivant le curseur, plus une dérive lente au repos.
 *
 * C'est une ORBITE autour du point visé, pas une translation : la caméra se
 * déplace de quelques degrés sur une sphère et continue de regarder le même
 * point. C'est ce qui produit le décalage entre le premier plan et le fond —
 * translater la caméra en gardant son axe ferait glisser toute l'image d'un
 * bloc, sans profondeur.
 *
 * La dérive au repos utilise EXACTEMENT le même canal : elle ne fait qu'ajouter
 * son décalage aux angles cibles, avant l'amortissement. Rien à composer, rien
 * à arbitrer — quand la main revient sur la souris, le poids de la dérive
 * retombe à zéro et le geste reprend la main sans transition visible.
 *
 * Cet effet est le SEUL endroit qui écrit dans `camera.position`. Il lit sa pose
 * de base dans `camera-pose.ts` et compose son décalage par-dessus, de sorte que
 * la transition scroll/clic à venir n'a qu'à animer cette base pour que les deux
 * mouvements coexistent. Voir le contrat détaillé dans ce fichier.
 *
 * Le suivi du pointeur est neutralisé sans pointeur fin (le tactile n'a pas de
 * position au repos) et sous `prefers-reduced-motion`. La dérive, elle, ne
 * dépend d'aucun geste : elle reste active au doigt — c'est même le seul
 * mouvement de caméra qu'un mobile verra — et n'est coupée que par
 * `prefers-reduced-motion`.
 */
export default function CameraParallax() {
  const camera = useThree((state) => state.camera);
  const reduced = useReducedMotion();
  const finePointer = useFinePointer();
  const enabled = finePointer && !reduced;
  const driftEnabled = !reduced;

  // Angles courants, hors du state React : ils changent à chaque frame et ne
  // doivent rien redessiner.
  const yaw = useRef(0);
  const pitch = useRef(0);

  // Horloge propre, avancée avec le `dt` déjà plafonné plutôt que lue sur
  // `state.clock` : un onglet revenu d'arrière-plan ferait sauter la phase de
  // la dérive, donc la caméra, alors même que le plafonnement est censé
  // l'empêcher.
  const driftTime = useRef(0);
  const idleTime = useRef(0);
  /** Poids de la dérive, de 0 (geste en cours) à 1 (repos installé). */
  const idleMix = useRef(0);
  const lastPointer = useRef({ x: 0, y: 0 }).current;

  // Alloués une fois. Un `new Vector3()` par frame donnerait au GC de quoi
  // hoqueter pendant une animation qu'on veut lisse.
  const offset = useRef(new Vector3()).current;
  const spherical = useRef(new Spherical()).current;

  useEffect(resetCameraBase, []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, MAX_DELTA);

    // Inactivité mesurée sur `state.pointer` lui-même, sans écouteur DOM
    // supplémentaire : R3F le tient déjà à jour, et c'est exactement la valeur
    // qui pilote le parallax — donc « le pointeur a bougé » veut bien dire ici
    // « la caméra a une nouvelle cible », et pas « un événement est passé ».
    const moved =
      Math.abs(state.pointer.x - lastPointer.x) +
        Math.abs(state.pointer.y - lastPointer.y) >
      POINTER_EPSILON;
    lastPointer.x = state.pointer.x;
    lastPointer.y = state.pointer.y;
    idleTime.current = moved ? 0 : idleTime.current + dt;

    const idleTarget = driftEnabled && idleTime.current > IDLE_DELAY ? 1 : 0;
    idleMix.current = MathUtils.damp(idleMix.current, idleTarget, IDLE_LAMBDA, dt);

    driftTime.current += dt;
    const t = driftTime.current;
    const driftYaw =
      Math.sin((t * TAU) / DRIFT_YAW_PERIOD) * DRIFT_YAW * idleMix.current;
    const driftPitch =
      Math.sin((t * TAU) / DRIFT_PITCH_PERIOD) * DRIFT_PITCH * idleMix.current;

    // Souris à droite : la caméra part à droite. Souris en haut : elle monte —
    // d'où le signe, `phi` se mesure depuis le pôle et décroît vers le haut.
    const targetYaw = (enabled ? state.pointer.x * MAX_YAW : 0) + driftYaw;
    const targetPitch = (enabled ? -state.pointer.y * MAX_PITCH : 0) + driftPitch;

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
