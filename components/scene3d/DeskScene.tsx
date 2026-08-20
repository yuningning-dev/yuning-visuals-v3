"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { AgXToneMapping } from "three";
import type { LightingPreset } from "@/lib/lighting-presets";
import CameraParallax from "./CameraParallax";
import { START_POSITION, START_TARGET } from "./camera-pose";
import KeyLight from "./KeyLight";
import PostFX from "./PostFX";
import Reflections from "./effects/Reflections";
import WindowLight from "./effects/WindowLight";
import CameraSlot from "./props/CameraSlot";
import DeskLamp from "./props/DeskLamp";
import Desk from "./props/Desk";
import Keyboard from "./props/Keyboard";
import Monitor from "./props/Monitor";
import Mouse from "./props/Mouse";
import Mousepad from "./props/Mousepad";
import Mug from "./props/Mug";
import OsmoPocket from "./props/OsmoPocket";
import Room from "./props/Room";
import WallDecor from "./props/WallDecor";

type Props = {
  preset: LightingPreset;
};

/**
 * Scène du bureau, entièrement modélisée en primitives — aucun asset à charger
 * hormis l'appareil photo, qui viendra en .glb (cf. `props/CameraSlot`).
 *
 * Cadrage frontal et symétrique, repris de `references/bureau 2.jpg` : le
 * moniteur au centre, la fenêtre derrière lui. C'est cette composition qui rend
 * lisible le zoom vers l'écran une fois la transition branchée.
 */
export default function DeskScene({ preset }: Props) {
  return (
    <Canvas
      // Plafonné à 2 : au-delà, le coût GPU explose sans gain visible.
      dpr={[1, 2]}
      // "percentage" = PCFShadowMap ; le défaut PCFSoft est déprécié en three r185.
      shadows="percentage"
      // Rapprochée de ~7 % le long de l'axe de visée, pas en réduisant `z` seul :
      // la cible du `lookAt` étant plus basse que la caméra, ne toucher qu'à `z`
      // redresserait la plongée et changerait la composition au lieu de la
      // distance. y et z descendent donc ensemble, l'angle est conservé.
      // `fov` reste à 42 : le rapprochement doit venir de la distance. Le réduire
      // grossirait le sujet sans rien changer à la perspective — un zoom, pas un
      // travelling — et rognerait le cadre d'autant.
      // Marge courte des deux côtés, à retester à toute nouvelle valeur :
      // — trop près, le plateau et le clavier sortent du cadre (constaté à 3.5),
      //   or ce sont eux qui ancrent la scène ;
      // — dès ~10 %, le haut du dormant de la fenêtre affleure le bord et le
      //   polaroid en haut à gauche se fait couper.
      // Le `fov` de Three est VERTICAL : le cadrage haut/bas ne dépend pas du
      // format de l'écran, ces deux limites valent donc pour tout le monde.
      // Les deux valeurs viennent de `camera-pose.ts`, qui est aussi ce que lit
      // le parallax : une seule source de vérité pour la pose de départ.
      camera={{ position: [...START_POSITION], fov: 42 }}
      // AgX, et non plus NoToneMapping. Le rendu ne tient plus dans [0,1] :
      // les surfaces qui s'allument (dalle, diffuseur, fenêtres de la ville,
      // diode) émettent au-dessus de 1, et sans courbe elles écrêtent toutes au
      // même blanc — un écran deux fois plus lumineux qu'une diode rendait le
      // même pixel. AgX plutôt qu'ACES parce qu'il conserve la teinte en montant
      // vers le blanc là où ACES la fait dériver.
      //
      // ATTENTION à ce que cette ligne fait VRAIMENT : Three n'applique
      // `renderer.toneMapping` qu'en rendant dans le framebuffer par défaut. Le
      // composer de `PostFX` rendant dans une render target, c'est l'effet
      // `<ToneMapping>` de la chaîne qui porte la courbe. La valeur ci-dessous
      // dit l'intention et sert si le composer saute ; `toneMappingExposure`,
      // lui, est bien lu par l'effet — c'est le vrai réglage d'exposition.
      //
      // Exposition à 1.15 et non 1 : AgX pose le gris moyen plus bas qu'un rendu
      // sans courbe, et à 1 toute la pièce descendait d'un cran par rapport à la
      // direction validée. 1.15 remet les aplats à leur valeur d'origine sans
      // repousser les émissifs dans l'écrêtage.
      //
      // `antialias` retiré : le composer prend la main sur le rendu et
      // court-circuite le MSAA du renderer. Il est repris dans `PostFX`.
      gl={{ toneMapping: AgXToneMapping, toneMappingExposure: 1.15 }}
      // `CameraParallax` refait ce cadrage à chaque frame ; celui-ci sert la
      // toute première, et garde la scène juste si le parallax est retiré.
      onCreated={({ camera }) => camera.lookAt(...START_TARGET)}
    >
      <color attach="background" args={[preset.background]} />

      <CameraParallax />

      <ambientLight
        intensity={preset.ambient.intensity}
        color={preset.ambient.color}
      />

      <KeyLight config={preset.key} />

      <directionalLight
        position={preset.rim.position}
        intensity={preset.rim.intensity}
        color={preset.rim.color}
      />

      <Room windowsLit={preset.cityWindows} sky={preset.sky} />
      <WallDecor />
      <Desk />
      <DeskLamp />
      <Monitor rimColor={preset.rim.color} />
      <Keyboard />
      <Mousepad />
      <Mouse />
      <OsmoPocket />
      <Mug />
      {/* Le seul élément qui suspend. Sans cette frontière, le téléchargement
          du .glb retiendrait tout le bureau : la pièce apparaîtrait d'un coup
          au lieu de se monter tout de suite avec l'appareil en dernier. */}
      <Suspense fallback={null}>
        <CameraSlot />
      </Suspense>

      <WindowLight keyColor={preset.key.color} skyColor={preset.sky} />
      <Reflections />

      <PostFX />
    </Canvas>
  );
}
