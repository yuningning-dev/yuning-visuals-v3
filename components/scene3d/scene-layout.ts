/**
 * Cotes de la scène, en unités Three.
 *
 * Échelle : le plateau fait 3.4 unités pour un bureau réel d'environ 1,60 m,
 * soit ~0,47 m par unité. Tout le reste est dimensionné à partir de là — c'est
 * ce qui garantit qu'un clavier reste crédible à côté d'une souris.
 *
 * Origine : y = 0 est la SURFACE du plateau, pas le sol. La quasi-totalité des
 * objets se pose dessus, autant que leur position parte de zéro.
 */
export const layout = {
  /** 1 unité Three ≈ 0,47 m. */
  metersPerUnit: 0.47,

  desk: {
    width: 3.4,
    depth: 1.5,
    thickness: 0.08,
    /** Hauteur du plateau au-dessus du sol. */
    height: 1.6,
  },

  wall: {
    z: -1.35,
    thickness: 0.12,
    /**
     * Ouverture de la fenêtre, en coordonnées monde.
     *
     * Volontairement plus haute que le moniteur (dont le sommet est à ~1.40) :
     * à hauteur égale, la dalle masquait toute l'ouverture et il ne restait que
     * deux liserés clairs de part et d'autre — ça ne lisait plus comme une
     * fenêtre mais comme un panneau blanc.
     */
    window: { minX: -1.6, maxX: 1.6, minY: 0.32, maxY: 2.25 },
  },

  monitor: {
    z: -0.45,
    screenWidth: 1.45,
    screenHeight: 0.85,
    /** Hauteur du centre de la dalle au-dessus du plateau. */
    centerY: 0.92,
  },
} as const;
