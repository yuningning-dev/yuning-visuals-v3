"use client";

import { useEffect } from "react";
import type { LightingPreset } from "@/lib/lighting-presets";

type Props = {
  presets: LightingPreset[];
  current: LightingPreset;
  onSelect: (preset: LightingPreset) => void;
};

/**
 * Sélecteur de schéma d'éclairage — OUTIL DE TRAVAIL, à supprimer avec
 * `lib/lighting-presets.ts` une fois la scène figée.
 *
 * Placé en haut à droite et non en bas : en bandeau centré, il masquait le
 * plateau, le clavier et la souris — c'est-à-dire exactement ce qu'on regarde.
 */
export default function PresetSwitcher({ presets, current, onSelect }: Props) {
  // Raccourcis 1..n : comparer deux ambiances demande de basculer vite, et
  // viser une pastille à la souris casse le rythme de l'oeil.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const index = Number(event.key) - 1;
      if (Number.isInteger(index) && presets[index]) onSelect(presets[index]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [presets, onSelect]);

  return (
    <div className="pointer-events-none fixed top-0 right-0 z-10 p-4">
      <div className="pointer-events-auto w-56 rounded-panel border border-white/10 bg-dusk-950/70 p-2 backdrop-blur-xl">
        <p className="px-1.5 pt-0.5 pb-1.5 font-mono text-[10px] tracking-[0.18em] uppercase text-paper/35">
          éclairage
        </p>

        <div className="flex flex-col gap-1">
          {presets.map((preset, index) => {
            const active = preset.id === current.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSelect(preset)}
                aria-pressed={active}
                title={preset.intent}
                className={`flex items-baseline gap-2 rounded-[8px] px-2 py-1.5 text-left transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400 ${
                  active
                    ? "bg-paper text-dusk-950"
                    : "text-paper/60 hover:bg-white/10 hover:text-paper"
                }`}
              >
                <span className="font-mono text-[10px] tabular-nums opacity-50">
                  {index + 1}
                </span>
                <span className="font-display text-[13px] leading-tight font-semibold">
                  {preset.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
