"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import PresetSwitcher from "@/components/ui/PresetSwitcher";
import { defaultPreset, lightingPresets } from "@/lib/lighting-presets";

/**
 * Point d'entrée de la 3D côté page. Le chargement est différé et strictement
 * client : Three touche au DOM et à WebGL, rien à gagner à le rendre côté serveur.
 */
const DeskScene = dynamic(() => import("./DeskScene"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 flex items-center justify-center bg-dusk-950">
      <p className="font-mono text-xs tracking-[0.3em] uppercase text-teal-400">
        chargement
      </p>
    </div>
  ),
});

/**
 * Force une nouvelle mesure du conteneur quand le ResizeObserver de R3F a pu
 * rater un changement de taille.
 *
 * Deux cas, et ils ne se recouvrent pas :
 *
 * — `fullscreenchange` ne se déclenche QUE pour l'API Fullscreen. Agrandir la
 *   fenêtre ou passer en plein écran via le navigateur (F11, bouton vert) ne le
 *   déclenche pas. La bascule redimensionne le viewport en plusieurs étapes et
 *   la dernière peut arriver après la mesure livrée par l'observateur.
 *
 * — `visibilitychange` couvre le trou réel : un document en arrière-plan ne
 *   reçoit NI frame d'animation NI callback de ResizeObserver. Si la fenêtre
 *   change de taille pendant ce temps — onglet masqué, panneau replié, autre
 *   bureau — le canvas garde la taille d'avant et rien ne le corrige au retour.
 *
 * Dans les deux cas on relance un `resize`, que la mesure de R3F écoute déjà.
 * Le `requestAnimationFrame` attend que le navigateur ait fini sa mise en page :
 * mesurer immédiatement relirait la valeur périmée.
 */
function useMissedResize() {
  useEffect(() => {
    const nudge = () => {
      requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") nudge();
    };

    document.addEventListener("fullscreenchange", nudge);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("fullscreenchange", nudge);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
}

export default function SceneCanvas() {
  const [preset, setPreset] = useState(defaultPreset);
  useMissedResize();

  return (
    // `fixed inset-0` plutôt qu'une chaîne de hauteurs en pourcentage : le
    // conteneur mesuré par R3F a ainsi une taille définie sans dépendre de la
    // résolution du `height: 100%` de ses parents, qui se fait attendre pendant
    // une bascule en plein écran.
    <div className="fixed inset-0">
      <DeskScene preset={preset} />
      <PresetSwitcher
        presets={lightingPresets}
        current={preset}
        onSelect={setPreset}
      />
    </div>
  );
}
