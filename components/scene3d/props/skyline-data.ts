import { Color } from "three";
import { palette } from "@/lib/palette";
import { mulberry32 } from "@/lib/random";

/**
 * Génération de la skyline — géométrie ET teintes.
 *
 * TIRAGE DÉTERMINISTE, jamais `Math.random`. Une skyline retirée à chaque rendu
 * changerait de silhouette au moindre re-rendu React, et surtout ne serait plus
 * la même d'un chargement à l'autre : impossible d'art-diriger ce qu'on ne peut
 * pas revoir. Le générateur ci-dessous part d'une graine fixe, donc la ville est
 * toujours exactement la même — et se remanie d'un coup si l'on change `SEED`.
 *
 * PERSPECTIVE ATMOSPHÉRIQUE. Une seule couleur de base, celle des bâtiments les
 * plus proches, puis interpolation vers la couleur du CIEL en fonction de la
 * distance. C'est le mécanisme réel de la brume : au loin, la couche d'air
 * diffuse s'accumule entre l'oeil et l'objet, et la valeur de l'objet tend vers
 * celle du fond. Poser trois teintes à la main donnait trois bandes plates ;
 * ici la profondeur devient continue, et chaque bâtiment est légèrement décalé
 * de son voisin.
 */

/** Change tout le tracé de la ville d'un seul coup. */
const SEED = 20260819;

/** Sous le bord bas visible de l'ouverture, quel que soit le plan. */
export const BASE_Y = -0.6;

export type Building = {
  x: number;
  width: number;
  /** Altitude du toit, en coordonnées monde. */
  top: number;
  z: number;
  /** Couleur finale, brume et variation par bâtiment déjà appliquées. */
  color: string;
  /** Graine propre, pour que les fenêtres d'un bâtiment lui restent attachées. */
  seed: number;
};

type Layer = {
  z: number;
  count: number;
  /** 0 = couleur de base, 1 = couleur du ciel. */
  haze: number;
  spread: number;
  widthRange: [number, number];
  topRange: [number, number];
};

/**
 * Trois plans. Le lointain est le plus fourni et le plus embrumé, le proche le
 * plus clairsemé et le plus dense en valeur — c'est ce qui creuse l'ouverture.
 */
const LAYERS: Layer[] = [
  { z: -3.0, count: 9, haze: 0.45, spread: 2.55, widthRange: [0.3, 0.66], topRange: [0.72, 1.62] },
  { z: -2.6, count: 7, haze: 0.24, spread: 2.35, widthRange: [0.34, 0.7], topRange: [0.6, 1.28] },
  { z: -2.25, count: 6, haze: 0.06, spread: 2.2, widthRange: [0.4, 0.78], topRange: [0.55, 1.05] },
];

function buildSkyline(): Building[] {
  const random = mulberry32(SEED);
  const base = new Color(palette.city700);
  const sky = new Color(palette.sky);
  const out: Building[] = [];

  for (const layer of LAYERS) {
    for (let i = 0; i < layer.count; i += 1) {
      // Réparti sur la largeur, puis décalé : un pas régulier se lit comme un
      // peigne, même avec des hauteurs variées.
      const slot = (i + 0.5) / layer.count;
      const x = (slot * 2 - 1) * layer.spread + (random() - 0.5) * 0.42;

      const [wMin, wMax] = layer.widthRange;
      const [tMin, tMax] = layer.topRange;

      // Une brume propre à chaque bâtiment, autour de celle du plan : deux
      // voisins à la même distance n'ont jamais exactement la même valeur.
      const haze = Math.min(0.85, Math.max(0, layer.haze + (random() - 0.5) * 0.16));
      const color = base.clone().lerp(sky, haze);
      // Dérive de teinte et de saturation, très courte : au-delà, la ville
      // cesse de lire comme un seul matériau vu à travers un seul air.
      color.offsetHSL((random() - 0.5) * 0.045, (random() - 0.5) * 0.1, (random() - 0.5) * 0.05);

      out.push({
        x,
        width: wMin + random() * (wMax - wMin),
        top: tMin + random() * (tMax - tMin),
        z: layer.z,
        color: `#${color.getHexString()}`,
        seed: Math.floor(random() * 1e9),
      });
    }
  }

  return out;
}

/** Calculé une fois au chargement du module : la ville ne change plus ensuite. */
export const BUILDINGS: Building[] = buildSkyline();

/* -------------------------------------------------------------------------- */

/** Taille d'une fenêtre, et pas de la trame. L'écart fait la lecture. */
export const WINDOW_SIZE: [number, number] = [0.03, 0.04];
const COLUMN_PITCH = 0.062;
const ROW_PITCH = 0.076;

/**
 * Plancher des fenêtres. En dessous, l'allège de la fenêtre de la pièce masque
 * tout : ces instances ne seraient jamais vues et coûteraient quand même leur
 * place dans le buffer.
 */
const LOWEST_WINDOW_Y = 0.12;

/** Proportion de fenêtres allumées. Trop haut, la ville lit comme un damier. */
const LIT_RATIO = 0.38;

export type CityWindow = {
  position: [number, number, number];
  /** Couleur déjà variée — teinte chaude et intensité tirées par fenêtre. */
  color: string;
  /**
   * Phase du scintillement, en radians. Tirée ICI, sur la graine du bâtiment,
   * et pas dans la boucle de rendu : c'est la même règle que pour la
   * silhouette — un déphasage retiré à chaque frame ferait clignoter la ville
   * au hasard au lieu de la faire respirer.
   */
  phase: number;
};

/**
 * Fenêtres allumées, à plat sur la face avant de chaque bâtiment.
 *
 * UNIQUEMENT DE L'ÉMISSIF, aucune lumière ajoutée : plusieurs centaines de
 * points lumineux réels seraient hors de question, chacun coûtant une passe
 * d'éclairage sur chaque matériau de la scène. Ici ce ne sont que des plans en
 * matériau non éclairé — le bloom déjà présent dans `PostFX` se charge de les
 * faire rayonner, ce qui donne l'impression de vraies sources pour rien.
 *
 * Seule la face avant est garnie. Les bâtiments sont vus quasiment de face à
 * travers l'ouverture ; garnir les côtés doublerait le nombre d'instances pour
 * des fenêtres de chant, donc invisibles.
 *
 * La couleur est tirée par fenêtre autour d'un ambre chaud, avec une intensité
 * variable : une trame à couleur unique se lit comme une texture répétée, alors
 * que l'irrégularité fait la ville habitée.
 */
function buildWindows(): CityWindow[] {
  const out: CityWindow[] = [];
  const warm = new Color(palette.lamp400);

  for (const building of BUILDINGS) {
    const random = mulberry32(building.seed);
    const columns = Math.floor((building.width - 0.02) / COLUMN_PITCH);
    if (columns < 1) continue;

    const gridWidth = (columns - 1) * COLUMN_PITCH;
    const faceZ = building.z + building.width / 2 + 0.004;
    const ceiling = building.top - 0.06;

    for (let c = 0; c < columns; c += 1) {
      const x = building.x - gridWidth / 2 + c * COLUMN_PITCH;

      for (let y = LOWEST_WINDOW_Y; y <= ceiling; y += ROW_PITCH) {
        if (random() > LIT_RATIO) continue;

        const color = warm.clone();
        // Dérive de teinte courte : du jaune franc à l'ambre, jamais au rouge —
        // au-delà, les fenêtres virent au brasier.
        color.offsetHSL((random() - 0.5) * 0.06, (random() - 0.5) * 0.25, 0);
        // Intensité : certaines fenêtres sont des veilleuses, d'autres des
        // néons de bureau. Le haut de la plage dépasse le seuil du bloom, donc
        // seules les plus vives débordent — comme dans une vraie ville.
        color.multiplyScalar(0.55 + random() * 0.45);

        out.push({
          position: [x, y, faceZ],
          color: `#${color.getHexString()}`,
          phase: random() * Math.PI * 2,
        });
      }
    }
  }

  return out;
}

export const CITY_WINDOWS: CityWindow[] = buildWindows();
