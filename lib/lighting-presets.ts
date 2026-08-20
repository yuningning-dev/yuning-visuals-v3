import type { ColorRepresentation } from "three";
import { preCompensate } from "./agx";
import { authoredPalette, palette } from "./palette";

/**
 * Schémas d'éclairage de la scène.
 *
 * DIRECTION RETENUE : « Crépuscule saturé » (validée le 19/08/2026). Sa palette
 * a été promue dans `palette.ts` + les tokens de `globals.css` ; ce preset les
 * lit, il n'y a qu'une seule source de vérité.
 *
 * Les deux autres sont écartées et conservées uniquement pour pouvoir refaire
 * la comparaison sur la vraie géométrie — un schéma qui tenait sur un cube ne
 * tient pas forcément sur un bureau meublé.
 *
 * Ces presets ne pilotent QUE les lumières et le fond. Les matières des objets
 * appartiennent désormais aux composants du bureau, qui lisent `palette.ts`.
 *
 * DEUX CHARTES, ET IL FAUT CHOISIR LA BONNE. Les couleurs de LUMIÈRE viennent de
 * `authoredPalette`, brutes : une lumière multiplie un albédo déjà pré-compensé
 * pour AgX, la compenser à son tour compenserait deux fois le même produit — et
 * une clé pré-compensée vire à l'orange franc, ce qui fait basculer tous les
 * turquoises au vert. Les couleurs de SURFACE (le fond, le ciel) viennent de
 * `palette`, compensée, parce qu'elles traversent la courbe comme le reste de
 * l'image.
 */

type Vec3 = [number, number, number];

export type LightingPreset = {
  id: string;
  name: string;
  intent: string;
  /**
   * Couleur au-delà du mur — ce qu'on voit là où la géométrie s'arrête.
   *
   * C'est une couleur de SURFACE : elle est effacée dans la cible du composer
   * puis traverse la courbe AgX comme n'importe quel pixel. Elle doit donc être
   * PRÉ-COMPENSÉE (`palette.*` ou `preCompensate()`), jamais posée en hex brut,
   * sinon ce preset dérive à l'écran pendant que les autres tiennent — et la
   * comparaison entre directions ne veut plus rien dire.
   *
   * Et elle se voit vraiment : au format ~16/9 la pièce remplit le cadre, mais
   * sur un écran très large elle laisse des bandes franches à gauche et à
   * droite (mesuré à 2400×700). Ce n'est pas une valeur morte.
   */
  background: ColorRepresentation;
  ambient: { color: string; intensity: number };
  /** Lumière clé — la lampe de bureau, source dominante. */
  key: { color: string; intensity: number; position: Vec3 };
  /** Contre-jour — la fenêtre, derrière le moniteur. */
  rim: { color: string; intensity: number; position: Vec3 };
  /**
   * Couleur du ciel vu par la fenêtre.
   *
   * C'est la surface la plus lumineuse de la scène et la SEULE indication de
   * l'heure qu'il est dehors : elle doit donc suivre le preset, au même titre
   * que `cityWindows`. Un ciel figé donnait des fenêtres allumées sur du plein
   * jour — la ville s'allumait sans que la nuit tombe.
   *
   * Elle sert aussi de brume à la skyline (les bâtiments lointains tendent vers
   * elle) et de teinte aux fausses lumières de la fenêtre : c'est la même
   * lumière, il n'y a qu'une valeur à changer pour changer l'heure.
   */
  sky: ColorRepresentation;
  /**
   * Intensité des fenêtres allumées de la skyline, de 0 à 1.
   *
   * C'est une donnée d'HEURE, pas d'éclairage : elle ne touche aucune lumière et
   * ne modifie pas les trois schémas ci-dessous. Elle dit seulement s'il fait
   * assez sombre dehors pour qu'on voie les fenêtres de la ville allumées.
   * À 0, l'InstancedMesh n'est pas monté du tout — aucun tirage.
   */
  cityWindows: number;
};

export const lightingPresets: LightingPreset[] = [
  {
    id: "crepuscule-sature",
    name: "Crépuscule saturé",
    intent:
      "Direction retenue. Clé chaude peu saturée, contre-jour turquoise venant de la fenêtre, ambiance magenta basse.",
    background: palette.dusk900,
    // Ambiante abaissée après le montage du décor : à 0.6 elle remplissait les
    // ombres portées et la scène meublée lisait comme une suite d'aplats.
    ambient: { color: authoredPalette.magenta500, intensity: 0.42 },
    // Clé volontairement peu saturée : en orange franc elle écrase le canal
    // bleu et fait virer tous les turquoises au vert.
    key: { color: authoredPalette.lamp400, intensity: 1.9, position: [3.4, 3, 2.4] },
    // Placé derrière le mur, dans l'axe de la fenêtre : c'est elle qui est
    // censée jeter cette lumière dans la pièce. Ramené de 0.9 à 0.65 : ce
    // remplissage ne projette pas d'ombre, il rallumait donc uniformément
    // celles de la clé et la scène meublée perdait tout relief.
    rim: { color: authoredPalette.teal300, intensity: 0.65, position: [-1.5, 2, -4] },
    // Le ciel validé de la direction retenue : turquoise franc et très clair.
    // C'est lui la référence, `palette.sky` en est la copie côté charte.
    sky: palette.sky,
    // Il fait encore grand jour derrière la vitre — le ciel est la surface la
    // plus lumineuse de la scène. Des fenêtres allumées y seraient invisibles
    // au mieux, incohérentes au pire.
    cityWindows: 0,
  },
  {
    id: "nuit-chaude",
    name: "Nuit chaude",
    intent:
      "Écartée : la lampe domine, la fenêtre n'est qu'un liseré. Contraste très fort, les noirs avalent la pièce.",
    background: preCompensate("#0b0f16"),
    ambient: { color: "#24406f", intensity: 0.3 },
    key: { color: "#ffcf8a", intensity: 1.45, position: [3, 4, 2] },
    rim: { color: "#4c7fc4", intensity: 0.55, position: [-4, 1.5, -3.5] },
    /** Nuit franche. Le ciel reste au-dessus du fond de la pièce — un ciel plus
     *  sombre que le mur ferait un trou noir dans la fenêtre au lieu du dehors. */
    sky: preCompensate("#16233d"),
    /** La ville est le seul point de vie derrière la vitre. */
    cityWindows: 1,
  },
  {
    id: "heure-bleue",
    name: "Heure bleue",
    intent:
      "Écartée : la fenêtre devient la source principale, la lampe n'est qu'un accent latéral. Contraste doux, peu d'énergie.",
    background: preCompensate("#141d2e"),
    ambient: { color: "#5f86b8", intensity: 0.75 },
    key: { color: "#9cc4e8", intensity: 1, position: [-3.5, 3.5, 2.5] },
    rim: { color: "#ff9b52", intensity: 1, position: [4, 0.8, 0.5] },
    /** Bleu de fin de jour : encore clair, mais très en dessous du turquoise de
     *  plein jour — c'est cet écart de valeur qui laisse les fenêtres ressortir. */
    sky: preCompensate("#7ba0cd"),
    /** Entre chien et loup : les fenêtres s'allument, mais le ciel tient encore
     *  et les noie en partie. */
    cityWindows: 0.7,
  },
];

export const defaultPreset = lightingPresets[0];
