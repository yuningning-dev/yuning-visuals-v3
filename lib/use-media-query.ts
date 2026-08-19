"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Media query réactive.
 *
 * `useSyncExternalStore` plutôt qu'un `useEffect` + `useState` : la valeur est
 * lue au premier rendu client au lieu d'arriver une frame plus tard, donc pas
 * d'effet activé puis coupé sous les yeux du visiteur.
 *
 * `serverValue` est ce que le serveur suppose, faute de pouvoir interroger le
 * navigateur. Toujours choisir la valeur la plus prudente pour l'appelant.
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);
  const getServerSnapshot = useCallback(() => serverValue, [serverValue]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Vrai seulement sur un pointeur qui survole — souris, trackpad.
 *
 * Le tactile est exclu volontairement : un doigt n'a pas de position au repos,
 * il n'existe qu'au contact. Un effet piloté par le pointeur y sauterait d'un
 * coup à chaque tap au lieu de suivre quoi que ce soit.
 */
export function useFinePointer(): boolean {
  return useMediaQuery("(hover: hover) and (pointer: fine)");
}
