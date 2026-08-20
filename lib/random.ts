/**
 * Tirage pseudo-aléatoire REPRODUCTIBLE, partagé par tout ce qui se génère
 * dans la scène — silhouette de la ville, fenêtres allumées, poussières du
 * faisceau.
 *
 * Pourquoi jamais `Math.random` : ces générateurs tournent au rendu React, donc
 * plusieurs fois. Avec `Math.random`, la ville changerait de forme à chaque
 * re-rendu, et surtout ne serait jamais deux fois la même d'un chargement à
 * l'autre — impossible d'art-diriger ce qu'on ne peut pas revoir.
 *
 * mulberry32 : court, sans dépendance, statistiquement suffisant pour du
 * placement. C'est la stabilité qu'on lui demande, pas la qualité.
 */
export function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
