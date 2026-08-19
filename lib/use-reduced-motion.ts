"use client";

import { useMediaQuery } from "./use-media-query";

/**
 * `prefers-reduced-motion`, réactif aux changements de préférence système.
 *
 * Le serveur ne connaît pas la préférence : on suppose l'animation autorisée,
 * puis le client corrige à l'hydratation.
 */
export function useReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}
