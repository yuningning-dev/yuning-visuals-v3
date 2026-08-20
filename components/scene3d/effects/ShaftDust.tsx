"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, Color, type ShaderMaterial } from "three";
import { mulberry32 } from "@/lib/random";
import { useReducedMotion } from "@/lib/use-reduced-motion";

/**
 * Poussière du faisceau — le volume que les deux quads du rai ne peuvent pas
 * donner.
 *
 * `Points` et un `ShaderMaterial` écrit à la main, pas un `PointsMaterial` :
 * il faut deux choses que celui-ci ne sait pas faire — une montée continue
 * calculée SUR LE GPU (sinon 200 positions à réécrire et à renvoyer à chaque
 * frame, pour un mouvement qui tient en une addition) et un fondu par
 * particule, qui recycle chaque grain arrivé en haut sans qu'on le voie
 * réapparaître en bas.
 *
 * Ce composant vit dans le repère DÉJÀ incliné du faisceau : l'axe local +z
 * suit le rai, la section est dans le plan xy. C'est ce qui permet de semer les
 * grains dans un cône aligné sur la lumière sans manipuler une seule matrice.
 */

/** Grains. Assez pour que l'air soit habité, assez peu pour tenir dans un seul
 *  tirage sans peser : ce sont des points de 2 à 4 pixels. */
const COUNT = 200;

/** Blanc chaud de la poussière. Mélangé à la couleur de la clé plutôt que
 *  remplacé par elle : de la poussière éclairée reste blanche, elle prend juste
 *  la teinte de ce qui l'éclaire. */
const DUST_BASE = "#fff8e8";
const TINT_MIX = 0.35;

/** Montée, en unités monde par seconde. C'est de la convection, pas du vent :
 *  au-delà, les grains lisent comme des étincelles. */
const RISE_SPEED = 0.02;

/** Course d'un grain avant recyclage. Le fondu en sinus l'éteint aux deux
 *  bouts, donc le saut retour n'est jamais visible. */
const RISE_SPAN = 0.45;

/** Amplitude du louvoiement latéral. Les grains ne montent pas droit. */
const WOBBLE = 0.018;

/** Ouverture du cône, en fraction de la largeur du rai, à l'entrée et au bout.
 *  Le faisceau s'évase : la poussière doit s'évaser avec lui. */
const CONE_NEAR = 0.35;
const CONE_FAR = 1.05;

/** Taille des points, en pixels à un mètre. Divisée par la distance dans le
 *  vertex shader — sans cette atténuation, les grains du fond seraient aussi
 *  gros que ceux du premier plan et l'effet se lirait comme du bruit d'écran. */
const POINT_SIZE = 11;

/** Sous `prefers-reduced-motion`, la poussière reste (c'est de la matière, pas
 *  une animation d'interface) mais la montée est ramenée de moitié. */
const REDUCED_FACTOR = 0.5;

const MAX_DELTA = 0.1;

/** Graine fixe : la même poussière à chaque chargement, comme la skyline. */
const SEED = 71042;

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uSpeed;
  uniform float uSpan;
  uniform float uWobble;
  uniform float uSize;
  uniform float uPixelRatio;

  /** Direction du HAUT MONDE, exprimée dans le repère incliné du faisceau :
      les grains montent à la verticale, pas dans l'axe du rai. */
  uniform vec3 uUp;

  attribute float aSeed;
  attribute float aFade;
  attribute float aSize;

  varying float vFade;

  void main() {
    // Chaque grain part à un endroit différent de sa course, d'où le décalage
    // par graine : sans lui, les 200 grains monteraient au même instant.
    float rise = mod(aSeed * uSpan + uTime * uSpeed, uSpan);

    vec3 p = position + uUp * rise;

    // Deux fréquences différentes, et lentes : un louvoiement rapide ferait
    // vibrer les grains sur place au lieu de les faire flotter.
    p.x += sin(uTime * 0.6 + aSeed * 34.0) * uWobble;
    p.z += cos(uTime * 0.43 + aSeed * 51.0) * uWobble;

    // Fondu en cloche sur la course : nul aux deux bouts, donc le recyclage
    // est invisible.
    vFade = aFade * sin(3.14159 * rise / uSpan);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * aSize * uPixelRatio / max(-mv.z, 0.1);
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vFade;

  void main() {
    // gl_PointCoord va de 0 à 1 sur le quad du point : un disque doux, sinon
    // chaque grain est un petit carré.
    float d = length(gl_PointCoord - vec2(0.5)) * 2.0;
    if (d > 1.0) discard;
    float a = pow(1.0 - d, 1.6);

    gl_FragColor = vec4(uColor, a * vFade * uOpacity);
  }
`;

type Props = {
  /** Largeur du rai, reprise telle quelle : le cône doit épouser le faisceau. */
  width: number;
  length: number;
  /** Inclinaison du faisceau, nécessaire pour retrouver la verticale monde. */
  tilt: number;
  /** Couleur de la lumière clé, dont la poussière prend la teinte. */
  tint: string;
  opacity?: number;
};

export default function ShaftDust({
  width,
  length,
  tilt,
  tint,
  opacity = 0.3,
}: Props) {
  const reduced = useReducedMotion();
  const material = useRef<ShaderMaterial>(null);
  const time = useRef(0);

  const { positions, seeds, fades, sizes } = useMemo(() => {
    const random = mulberry32(SEED);
    const positions = new Float32Array(COUNT * 3);
    const seeds = new Float32Array(COUNT);
    const fades = new Float32Array(COUNT);
    const sizes = new Float32Array(COUNT);

    for (let i = 0; i < COUNT; i += 1) {
      // Le long du rai, biaisé vers l'entrée : c'est là que le faisceau est le
      // plus dense, donc là qu'on doit voir le plus de grains.
      const along = Math.pow(random(), 1.4);
      const radius = (width / 2) * (CONE_NEAR + (CONE_FAR - CONE_NEAR) * along);

      // `sqrt` sur le rayon : sans lui, un tirage uniforme entasse les grains
      // au centre du disque, parce que l'aire croît comme le carré du rayon.
      const r = Math.sqrt(random()) * radius;
      const theta = random() * Math.PI * 2;

      positions[i * 3] = Math.cos(theta) * r;
      positions[i * 3 + 1] = Math.sin(theta) * r;
      positions[i * 3 + 2] = along * length;

      seeds[i] = random();

      // Opacité figée au tirage plutôt que calculée par frame : elle ne dépend
      // que de la place du grain dans le cône, qui ne bouge quasiment pas sur
      // les 45 cm de sa course.
      // — le long du rai, même courbe que le quad du faisceau (`pow 1.7`) ;
      // — en travers, extinction vers le bord, sinon le cône a une paroi.
      const alongFade = Math.pow(1 - along, 1.7);
      const radialFade = 1 - Math.pow(r / Math.max(radius, 1e-4), 2) * 0.75;
      fades[i] = alongFade * radialFade * (0.45 + random() * 0.55);

      sizes[i] = 0.6 + random() * 0.8;
    }

    return { positions, seeds, fades, sizes };
  }, [width, length]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSpeed: { value: RISE_SPEED },
      uSpan: { value: RISE_SPAN },
      uWobble: { value: WOBBLE },
      uSize: { value: POINT_SIZE },
      // Figé au montage : `dpr` est déjà plafonné à 2 dans le Canvas, et un
      // point de 3 px n'a pas à être recalculé si l'écran change.
      uPixelRatio: { value: Math.min(globalThis.devicePixelRatio ?? 1, 2) },
      // Verticale monde ramenée dans le repère incliné du faisceau. Le lacet du
      // rai tourne autour de l'axe y monde : il ne touche pas à cette direction,
      // seule l'inclinaison compte.
      uUp: { value: [0, Math.cos(tilt), -Math.sin(tilt)] as [number, number, number] },
      uColor: { value: new Color(DUST_BASE).lerp(new Color(tint), TINT_MIX) },
      uOpacity: { value: opacity },
    }),
    [tilt, tint, opacity],
  );

  useFrame((_, delta) => {
    if (!material.current) return;
    const dt = Math.min(delta, MAX_DELTA);
    time.current += dt * (reduced ? REDUCED_FACTOR : 1);
    material.current.uniforms.uTime.value = time.current;
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[seeds, 1]} />
        <bufferAttribute attach="attributes-aFade" args={[fades, 1]} />
        <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={material}
        // Remonte le matériau si la couleur change de preset : les uniformes
        // sont recréés, il faut que Three reprenne l'objet.
        key={`${tint}-${opacity}`}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        // Comme les fausses lumières du projet : masquée par ce qui passe
        // devant, sans masquer ce qui passe derrière.
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}
