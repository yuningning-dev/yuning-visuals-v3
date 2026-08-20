"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, type InstancedBufferAttribute, InstancedMesh, Matrix4 } from "three";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { CITY_WINDOWS, WINDOW_SIZE } from "./skyline-data";

/** Réutilisés d'une instance à l'autre : rien à allouer dans la boucle. */
const matrix = new Matrix4();
const color = new Color();

/**
 * Profondeur du scintillement. Le facteur reste entre 0.8 et 1 : une fenêtre
 * qui s'éteint et se rallume lit comme une guirlande. Ici elle ne fait que
 * respirer, et l'effet ne se voit qu'en regardant la ville quelques secondes —
 * ce qui est exactement le but.
 */
const TWINKLE_DEPTH = 0.2;

/** Vitesse de la respiration. Les phases étant tirées par fenêtre, la ville
 *  entière n'est jamais en train de monter ou de descendre en même temps. */
const TWINKLE_SPEED = 3;

const MAX_DELTA = 0.1;

/**
 * Force d'émission des fenêtres. La couleur de chaque instance est multipliée
 * par ce facteur, donc les fenêtres SORTENT de [0,1] : sans ce dépassement,
 * elles ne peuvent que refléter — c'est lui qui les fait déborder au bloom et
 * rouler sous la courbe AgX au lieu d'écrêter sur un jaune plat.
 *
 * Matériau non éclairé, et émission portée par la couleur : voir `Skyline`, la
 * ville est dehors, la lampe de la pièce n'a rien à y faire.
 */
const EMISSIVE_STRENGTH = 3;

/**
 * Réécrit le buffer de couleurs par instance pour l'instant `t`.
 *
 * Hors du composant, et volontairement : c'est du calcul par frame sur des
 * flottants, il n'a aucun rapport avec le rendu React. Le sortir garde la boucle
 * lisible et la fonction testable à l'oeil — une multiplication par fenêtre,
 * rien d'autre.
 */
function paintWindows(
  attribute: InstancedBufferAttribute,
  base: Float32Array,
  t: number,
) {
  for (let i = 0; i < CITY_WINDOWS.length; i += 1) {
    // Sinus RENORMALISÉ sur [0,1] avant d'être dosé. Une sinusoïde brute varie
    // sur [-1,1] : dosée telle quelle, elle descendait à `1 - 2 × DEPTH`, soit
    // le double de la profondeur demandée, et la ville clignotait au lieu de
    // respirer. Avec la renormalisation, `TWINKLE_DEPTH` veut enfin dire ce que
    // son nom annonce — le facteur tient sur [1 - DEPTH, 1].
    const wave =
      0.5 + 0.5 * Math.sin(t * TWINKLE_SPEED + CITY_WINDOWS[i].phase);
    const factor = 1 - TWINKLE_DEPTH + TWINKLE_DEPTH * wave;

    const o = i * 3;
    attribute.setXYZ(i, base[o] * factor, base[o + 1] * factor, base[o + 2] * factor);
  }

  attribute.needsUpdate = true;
}

type Props = {
  /**
   * Intensité globale, de 0 à 1, fournie par le preset actif. Multiplie la
   * couleur du matériau, donc TOUTES les instances d'un coup : c'est un seul
   * uniforme à changer, là où retoucher le buffer de couleurs par instance
   * demanderait de le réécrire et de le renvoyer au GPU à chaque bascule.
   *
   * Le scintillement, lui, joue sur le buffer par instance. Les deux réglages
   * restent donc indépendants : baisser l'heure n'aplatit pas le scintillement,
   * et le scintillement ne rallume jamais une ville censée être éteinte.
   */
  intensity: number;
};

/**
 * Fenêtres allumées de la skyline, en un seul `InstancedMesh`.
 *
 * Plusieurs centaines de plans, donc UN SEUL TIRAGE : autant de meshes séparés
 * coûteraient autant d'appels de dessin, pour des quads de quelques pixels.
 *
 * Le maillage est écrit une fois au montage et ne bouge plus — les fenêtres ne
 * se déplacent pas. Seule leur COULEUR est retouchée par frame, pour le
 * scintillement : c'est un buffer de quelques milliers de flottants, réécrit en
 * place, sans allocation ni recalcul de matrice.
 *
 * Aucune lumière réelle : voir `skyline-data.ts`. Le rayonnement vient du bloom
 * déjà présent dans la chaîne de post-traitement — d'où un effet de bord voulu
 * du scintillement : les fenêtres les plus vives passent et repassent le seuil
 * du bloom, donc leur halo apparaît et disparaît au lieu de simplement varier.
 */
export default function CityWindows({ intensity }: Props) {
  const mesh = useRef<InstancedMesh>(null);
  const reduced = useReducedMotion();
  const time = useRef(0);

  // Un gris dont la valeur est l'intensité de l'heure MULTIPLIÉE par la force
  // d'émission : le matériau multiplie la couleur par instance, donc ce seul
  // facteur monte ou baisse toute la ville. `intensity` reste le gradateur —
  // c'est bien le preset qui dit l'heure, l'émission ne fait que placer le
  // résultat au-dessus de 1.
  const tint = useMemo(() => {
    const value = intensity * EMISSIVE_STRENGTH;
    return new Color(value, value, value);
  }, [intensity]);

  // Couleurs de repos, à plat, dans l'ordre des instances. Les garder ici évite
  // de reconstruire un `Color` par fenêtre et par frame : la boucle d'animation
  // ne fait plus qu'une multiplication sur des flottants déjà en place.
  const base = useMemo(() => {
    const out = new Float32Array(CITY_WINDOWS.length * 3);
    CITY_WINDOWS.forEach((window, i) => {
      color.set(window.color);
      out[i * 3] = color.r;
      out[i * 3 + 1] = color.g;
      out[i * 3 + 2] = color.b;
    });
    return out;
  }, []);

  useLayoutEffect(() => {
    const instanced = mesh.current;
    if (!instanced) return;

    CITY_WINDOWS.forEach((window, i) => {
      matrix.makeTranslation(...window.position);
      instanced.setMatrixAt(i, matrix);
      instanced.setColorAt(i, color.set(window.color));
    });

    instanced.instanceMatrix.needsUpdate = true;
    // `instanceColor` n'existe qu'après le premier `setColorAt` : Three alloue
    // le buffer à la demande.
    if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
  }, []);

  useFrame((_, delta) => {
    // Sous `prefers-reduced-motion`, la ville reste allumée mais fixe : les
    // couleurs posées au montage sont déjà les bonnes, il n'y a rien à faire —
    // et surtout pas de buffer à renvoyer au GPU 60 fois par seconde.
    if (reduced) return;

    const attribute = mesh.current?.instanceColor;
    if (!attribute) return;

    const dt = Math.min(delta, MAX_DELTA);
    time.current += dt;

    paintWindows(attribute, base, time.current);
  });

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, CITY_WINDOWS.length]}
      frustumCulled={false}
    >
      <planeGeometry args={WINDOW_SIZE} />
      <meshBasicMaterial color={tint} />
    </instancedMesh>
  );
}
