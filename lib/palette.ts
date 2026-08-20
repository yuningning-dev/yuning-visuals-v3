import { Color, type ColorRepresentation } from "three";
import { preCompensate } from "./agx";

/**
 * Palette du projet — direction « Crépuscule saturé », validée sur la scène de
 * test le 19/08/2026.
 *
 * Principe : une paire complémentaire corail / turquoise posée sur un ciel
 * prune, éclairée par une clé chaude volontairement peu saturée. La clé pâle
 * n'est pas un détail : une lumière trop orangée écrase le canal bleu et fait
 * virer le turquoise au vert.
 *
 * Three ne sait pas lire les variables CSS : ces valeurs doublent volontairement
 * les tokens de `app/globals.css`. Toute modification doit être répercutée des
 * deux côtés — c'est la seule duplication assumée du projet.
 *
 * CE QUI SUIT EST LA VALEUR VOULUE À L'ÉCRAN, pas celle qu'on pose sur les
 * matériaux. Depuis le passage à AgX (20/08/2026), la scène traverse une courbe
 * de tone mapping qui déplace toutes les valeurs, gris moyen compris : poser
 * `#d9542f` afficherait `#cd7557`. Les surfaces lisent donc `palette`, qui est
 * cette table PRÉ-COMPENSÉE par l'inverse d'AgX — voir `lib/agx.ts`.
 * Les LUMIÈRES, elles, lisent `authored` : une couleur de lumière multiplie déjà
 * un albédo compensé, la compenser aussi reviendrait à le faire deux fois.
 */
const authored = {
  /* Ciel, fonds, chrome sombre de l'OS */
  dusk950: "#150819",
  dusk900: "#2b1230",
  dusk800: "#3b1a42",
  dusk700: "#4e2456",
  dusk600: "#643170",

  /* Dominante chaude : le sol, les grandes surfaces */
  coral300: "#ff9b78",
  coral400: "#f07a52",
  coral500: "#d9542f",
  coral600: "#ad3f22",

  /* Complémentaire froide : les objets, les accents qui doivent ressortir */
  teal300: "#6fe0ea",
  teal400: "#2ac6e0",
  teal500: "#12b0d8",
  teal600: "#0b87a8",

  /* Lumière chaude — la lampe. Peu saturée, sinon le turquoise vire au vert. */
  lamp200: "#ffe9cc",
  lamp400: "#ffc98c",
  lamp600: "#f2913f",

  /* Ambiance basse et néons */
  magenta500: "#a8437a",

  /* Le ciel par la fenêtre — surface la plus lumineuse de la scène. Saturé,
     mais la dalle du moniteur est passée en bleu sombre : la séparation tient
     désormais sur la valeur, plus besoin de délaver la teinte. */
  sky: "#8ee9f2",

  /* Dalle du moniteur éteinte — support du faux OS, volontairement sombre. */
  screen: "#103c4d",

  /* Skyline vue par la fenêtre. Seuls tons franchement froids de la charte, et
     seule matière hors de la pièce : c'est le contraste avec le corail intérieur
     qui fait lire le dehors. Du plus clair — au loin, presque noyé dans le ciel —
     au plus sombre, au premier plan. */
  city300: "#8e92c4",
  city500: "#5c60a0",
  city700: "#3a3d6e",

  /* Matières du bureau — bois du plateau */
  wood300: "#e8b184",
  wood400: "#cf8b57",
  wood500: "#a8663a",
  wood600: "#7a4526",

  /* Matières du bureau — plastiques sombres (moniteur, souris, périphériques) */
  shell300: "#7a6a84",
  shell500: "#4a3b52",
  shell700: "#2a2032",

  /* Papier mat : post-it, notes */
  paper: "#f4efe2",
  postit: "#ffd84d",
} as const;

export type PaletteKey = keyof typeof authored;

/**
 * Les valeurs de la charte telles qu'elles sont AUTORISÉES et telles qu'elles
 * apparaissent dans `app/globals.css`. À utiliser pour tout ce qui ne traverse
 * pas la courbe : couleurs de lumière, valeurs de référence, UI 2D.
 */
export const authoredPalette: Readonly<Record<PaletteKey, string>> = authored;

/**
 * La charte pré-compensée, à poser sur les MATÉRIAUX.
 *
 * Ce sont des `Color` et non des hexadécimaux : la moitié claire de la charte
 * demande, pour ressortir juste après AgX, des couleurs plus saturées que ce
 * qu'un `#rrggbb` peut écrire (voir `lib/agx.ts`). Rien n'y oblige — un shader
 * travaille en flottant.
 *
 * Résolue au chargement du module plutôt que recopiée à la main : une trentaine
 * de couleurs, quelques dizaines d'itérations chacune, moins d'une milliseconde
 * — et surtout une seule source de vérité. Recopier les hexadécimaux corrigés
 * ferait diverger la charte de son rendu à la première retouche, et il faudrait
 * penser à relancer un script à chaque changement d'exposition.
 */
export const palette: Readonly<Record<PaletteKey, Color>> = Object.fromEntries(
  Object.entries(authored).map(([key, hex]) => [key, preCompensate(hex)]),
) as Record<PaletteKey, Color>;

/**
 * Clé stable pour une couleur, à l'usage des `key` de React.
 *
 * Plusieurs matériaux du projet se remontent quand leur couleur change (leurs
 * uniformes sont mémoïsés, changer l'objet est le seul moyen de les rafraîchir).
 * La clé était bâtie par interpolation de chaîne, ce qui marchait tant que les
 * couleurs ÉTAIENT des chaînes. Depuis la pré-compensation elles sont des
 * `Color`, et `${color}` rend « [object Object] » — une clé identique pour
 * toutes les couleurs, donc plus aucun remontage : les fausses lumières
 * gardaient la teinte du preset précédent.
 *
 * Les canaux bruts, et pas `getHexString()` : la charte dépasse 1, et deux
 * couleurs HDR distinctes se ramènent au même hexadécimal.
 */
export function colorKey(color: ColorRepresentation): string {
  if (color instanceof Color) {
    return `${color.r.toFixed(4)}:${color.g.toFixed(4)}:${color.b.toFixed(4)}`;
  }
  return String(color);
}
