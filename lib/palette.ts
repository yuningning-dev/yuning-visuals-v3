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
 */
export const palette = {
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

export type PaletteKey = keyof typeof palette;
