import { Color } from "three";

/**
 * AgX — la courbe de tone mapping de la scène, et son INVERSE.
 *
 * POURQUOI CE FICHIER EXISTE. AgX ne se contente pas d'écraser les hautes
 * lumières : il rentre toute l'image dans sa courbe, gris moyen compris. Une
 * couleur posée à `#d9542f` ne sort plus à `#d9542f` mais à `#cd7557` — plus
 * clair, moins saturé. Sur un rendu photoréaliste c'est le but recherché ; sur
 * des aplats cel-shadés c'est la palette qui ment, et la direction « Crépuscule
 * saturé » a justement été validée sur des valeurs précises.
 *
 * D'où la PRÉ-COMPENSATION : on résout, pour chaque couleur de la charte, la
 * couleur d'entrée dont AgX ressort la couleur voulue. Les surfaces retrouvent
 * exactement leur valeur validée, et AgX ne travaille plus que là où on
 * l'attend — au-dessus de 1, sur les surfaces qui émettent, où il remplace
 * l'écrêtage par un vrai roulement vers le blanc.
 *
 * POURQUOI ÇA RENVOIE DES `Color` ET PAS DES HEXADÉCIMAUX. AgX désature
 * d'autant plus qu'on monte en luminosité : pour ressortir au turquoise validé,
 * le ciel doit être posé PLUS SATURÉ que tout ce qu'un `#rrggbb` peut écrire.
 * Ramenées dans le gamut, la moitié claire de la charte s'effondrait — `sky` et
 * `teal300` réclamaient tous deux le cyan pur et devenaient indiscernables, or
 * c'est précisément leur écart qui empêche la dalle de se fondre dans la
 * fenêtre. Rien n'oblige pourtant une couleur de matériau à tenir dans [0,1] :
 * le shader travaille en flottant. On renvoie donc des `Color` linéaires, sans
 * borne haute, et la charte redevient atteignable.
 *
 * Transcrit de `three/src/renderers/shaders/ShaderChunk/tonemapping_pars_fragment.glsl.js`.
 * Attention en relisant l'original : `mat3(a, b, c)` en GLSL prend des COLONNES.
 */

/**
 * Exposition de la scène. UNE SEULE SOURCE : le `gl` du Canvas la donne au
 * renderer (l'effet `<ToneMapping>` lit l'uniforme `toneMappingExposure`), et
 * la pré-compensation ci-dessous résout à cette même valeur. Les deux ne
 * peuvent pas diverger.
 *
 * 2 et non 1 : l'exposition ne décale pas les couleurs pré-compensées (la
 * résolution l'annule), elle décide de ce qui reste RÉCUPÉRABLE. Plus elle
 * monte, plus les clairs saturés reviennent près de leur valeur (le papier
 * passe de #cfcfcf à #e0e0de) ; trop haut, les tons sombres pré-compensés se
 * tassent vers le noir et l'encodage 8 bits commence à créer des bandes.
 */
export const AGX_EXPOSURE = 2;

type Vec3 = [number, number, number];
type Mat3 = readonly [Vec3, Vec3, Vec3];

/** Produit matrice × vecteur, avec les matrices écrites EN COLONNES. */
function mul(m: Mat3, v: Vec3): Vec3 {
  return [
    m[0][0] * v[0] + m[1][0] * v[1] + m[2][0] * v[2],
    m[0][1] * v[0] + m[1][1] * v[1] + m[2][1] * v[2],
    m[0][2] * v[0] + m[1][2] * v[1] + m[2][2] * v[2],
  ];
}

const INSET: Mat3 = [
  [0.856627153315983, 0.137318972929847, 0.11189821299995],
  [0.0951212405381588, 0.761241990602591, 0.0767994186031903],
  [0.0482516061458583, 0.101439036467562, 0.811302368396859],
];
const OUTSET: Mat3 = [
  [1.1271005818144368, -0.1413297634984383, -0.14132976349843826],
  [-0.11060664309660323, 1.157823702216272, -0.11060664309660294],
  [-0.016493938717834573, -0.016493938717834257, 1.2519364065950405],
];
const SRGB_TO_REC2020: Mat3 = [
  [0.6274, 0.0691, 0.0164],
  [0.3293, 0.9195, 0.088],
  [0.0433, 0.0113, 0.8956],
];
const REC2020_TO_SRGB: Mat3 = [
  [1.6605, -0.1246, -0.0182],
  [-0.5876, 1.1329, -0.1006],
  [-0.0728, -0.0083, 1.1187],
];

const MIN_EV = -12.47393;
const MAX_EV = 4.026069;

/** Sigmoïde d'AgX, polynôme d'ordre 6 — l'approximation de Filament. */
function contrast(x: number): number {
  const x2 = x * x;
  const x4 = x2 * x2;
  return (
    15.5 * x4 * x2 -
    40.14 * x4 * x +
    31.96 * x4 -
    6.868 * x2 * x +
    0.4298 * x2 +
    0.1191 * x -
    0.00232
  );
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** AgX, en linéaire vers linéaire. Même calcul que le shader, au flottant près. */
export function agx(color: Vec3, exposure = AGX_EXPOSURE): Vec3 {
  let c = color.map((v) => v * exposure) as Vec3;
  c = mul(INSET, mul(SRGB_TO_REC2020, c));
  c = c.map((v) =>
    clamp01((Math.log2(Math.max(v, 1e-10)) - MIN_EV) / (MAX_EV - MIN_EV)),
  ) as Vec3;
  c = c.map(contrast) as Vec3;
  c = mul(OUTSET, c);
  c = c.map((v) => Math.pow(Math.max(0, v), 2.2)) as Vec3;
  return mul(REC2020_TO_SRGB, c).map(clamp01) as Vec3;
}

/**
 * Inverse d'AgX : la couleur à poser pour que la courbe en ressorte `target`.
 *
 * Résolu par itération et non par formule : la sigmoïde d'AgX est un polynôme
 * d'ordre 6 pris entre deux changements d'espace, elle n'a pas d'inverse
 * analytique. Le point fixe converge en quelques dizaines de tours parce que la
 * courbe est monotone ; l'exposant 0.6 amortit le pas, sans lui les canaux
 * presque nuls oscillent au lieu de descendre.
 *
 * Le résultat n'est PAS borné à 1 : voir l'en-tête, c'est justement au-dessus
 * de 1 que se trouvent les couleurs dont AgX ressort les clairs saturés de la
 * charte. Il est seulement borné en bas, à 0.
 */
export function invertAgX(target: Vec3, exposure = AGX_EXPOSURE): Vec3 {
  const guess: Vec3 = [...target];

  for (let i = 0; i < 60; i += 1) {
    const out = agx(guess, exposure);
    let moved = false;

    for (let k = 0; k < 3; k += 1) {
      if (target[k] < 1e-6) {
        guess[k] = 0;
        continue;
      }
      const ratio = target[k] / Math.max(out[k], 1e-6);
      guess[k] = Math.max(0, guess[k] * Math.pow(ratio, 0.6));
      if (Math.abs(ratio - 1) > 1e-4) moved = true;
    }

    if (!moved) break;
  }

  return guess.map((v) => Math.max(0, v)) as Vec3;
}

/* ----------------------------- conversions sRGB --------------------------- */

const toLinear = (v: number) =>
  v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
function hexToLinear(hex: string): Vec3 {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) =>
    toLinear(c / 255),
  ) as Vec3;
}

/**
 * Couleur à poser sur une surface pour qu'elle SORTE à `hex` après AgX.
 *
 * Le `Color` renvoyé est en espace LINÉAIRE, celui dans lequel Three travaille :
 * `new Color(r, g, b)` n'applique aucune conversion, contrairement à
 * `new Color("#...")` qui, lui, décode du sRGB. Les canaux peuvent dépasser 1,
 * et c'est voulu — voir l'en-tête.
 *
 * À n'appliquer qu'aux couleurs de SURFACE — albédos, émissifs, aplats non
 * éclairés. Surtout pas aux couleurs de LUMIÈRE : une lumière multiplie déjà un
 * albédo pré-compensé, la compenser à son tour reviendrait à compenser deux fois
 * le même produit. Et une clé pré-compensée vire à l'orange franc, ce qui fait
 * basculer tous les turquoises au vert — le piège documenté de la palette.
 */
export function preCompensate(hex: string): Color {
  const [r, g, b] = invertAgX(hexToLinear(hex));
  return new Color(r, g, b);
}
