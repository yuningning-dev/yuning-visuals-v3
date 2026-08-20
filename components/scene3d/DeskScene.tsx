"use client";

import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { AgXToneMapping, Color } from "three";
import type { LightingPreset } from "@/lib/lighting-presets";
import { palette } from "@/lib/palette";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { FAKE_LIGHT_LAYER } from "./layers";
import { layout } from "./scene-layout";
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

const { desk } = layout;

/**
 * Brouillard — LINÉAIRE et non exponentiel, et c'est le point à comprendre
 * avant d'y toucher.
 *
 * La pièce est courte : le plateau est à ~4.2 unités de la caméra, la skyline à
 * ~7. Un `fogExp2` ne sait pas séparer deux distances aussi proches — réglé
 * assez dense pour estomper la ville (densité ~0.14), il voile aussi le bureau
 * à près de 30 %, c'est-à-dire qu'il brume l'avant-plan qu'on cherche justement
 * à garder net. Le brouillard linéaire, lui, se règle par ses bornes : il
 * COMMENCE derrière le mur et ne touche que le dehors.
 *
 * La couleur suit le ciel du preset, pas le fond de la pièce : la perspective
 * atmosphérique fait tendre les lointains vers la lumière du ciel, c'est
 * exactement ce que fait déjà la brume par bâtiment de `skyline-data`. Un
 * brouillard d'une autre teinte ferait diverger les deux.
 *
 * LES BORNES SONT SERRÉES, ET IL FAUT SAVOIR POURQUOI. La surface la plus
 * lointaine de la PIÈCE — le bas du mur derrière le bureau — est à 5.9. Le
 * brouillard commence donc à 6.2 : rien de l'intérieur n'est touché, seul le
 * dehors s'estompe. Ce n'est pas un excès de prudence : la couleur du ciel est
 * pré-compensée pour AgX, donc sa valeur linéaire vaut ~2. Mélangée ne
 * serait-ce qu'à 10 % sur un sol prune (valeur ~0.05), elle le quintuple. À
 * 5.2, le sol et le bas du mur viraient au bleu pâle — mesuré à l'écran, pas
 * supposé.
 *
 * La borne lointaine est réglée sur le même constat, dans l'autre sens : la
 * skyline est entre 6.5 et 7.2. À `far = 11`, le plan lointain prenait 21 % de
 * ciel HDR et se dissolvait dedans — or il porte déjà sa propre brume, dosée à
 * la main dans `skyline-data`. À 14, le brouillard ajoute 4 % au plan proche et
 * 13 % au lointain : il CREUSE l'écart entre les trois plans au lieu de les
 * noyer, ce qu'on demande à un indice de profondeur.
 */
const FOG_NEAR = 6.2;
const FOG_FAR = 14;

/** Sous `prefers-reduced-motion`, le brouillard est reculé : moins de voile,
 *  donc plus de contraste et une image qui bouge moins quand la caméra dérive.
 *  (À noter : le brouillard ne « bouge » pas avec la caméra ici — la scène est
 *  fixe et la dérive fait 2.5°. C'est un réglage de confort, pas un remède.) */
const FOG_FAR_REDUCED = 19;

/**
 * Ombres de contact — l'assombrissement au ras du plateau, là où la clé
 * directionnelle ne donne qu'une ombre portée oblique.
 *
 * Posé à 2 mm du bois : assez haut pour ne pas se battre en profondeur avec le
 * plateau, assez bas pour attraper les objets à leur base, là où le contact se
 * lit.
 *
 * CE QUI A RENDU CE RÉGLAGE POSSIBLE : `ContactShadows` rend la scène ENTIÈRE
 * dans une passe de profondeur (caméra orthographique posée sur ce plan et
 * tournée vers le haut), fausses lumières comprises. Le rai de la fenêtre, qui
 * traverse le bureau en biais, s'y projetait comme un grand rectangle sombre —
 * une ombre portée par un faisceau de lumière, visible à l'écran. Les fausses
 * lumières sont donc passées sur leur propre calque (`layers.ts`), que seule la
 * caméra de la scène active. Sans ce calque, il faudrait remonter ce plan
 * au-dessus des flaques et perdre le contact.
 */
const CONTACT_Y = 0.002;

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
  const reduced = useReducedMotion();

  /**
   * Couleur du brouillard : celle du ciel, RAMENÉE DANS LE GAMUT.
   *
   * Le ciel du preset est pré-compensé pour AgX, donc sa valeur linéaire vaut
   * ~2. Une couleur de surface peut se le permettre — on la regarde en face.
   * Une couleur de brouillard, non : elle est MÉLANGÉE à ce qu'elle voile, et
   * 13 % d'une valeur 2 posés sur un bâtiment sombre (~0.08) le quadruplent. La
   * skyline se dissolvait dans la vitre. Divisée par son canal le plus fort, la
   * teinte est conservée et l'apport redevient proportionné.
   */
  const fogColor = useMemo(() => {
    const color = new Color(preset.sky);
    return color.multiplyScalar(1 / Math.max(color.r, color.g, color.b, 1));
  }, [preset.sky]);

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
      onCreated={({ camera }) => {
        camera.lookAt(...START_TARGET);
        // Seule la caméra de la scène voit les fausses lumières. Les caméras
        // annexes — celle des ombres de contact — restent sur le calque 0 et
        // ignorent donc le rai de la fenêtre, qui sinon porterait une ombre.
        camera.layers.enable(FAKE_LIGHT_LAYER);
      }}
    >
      <color attach="background" args={[preset.background]} />
      {/* Bornes en unités monde, mesurées depuis la caméra : le plateau (~4.2)
          reste net, le mur (~5.5) prend un voile, la ville (~7) s'estompe. */}
      <fog
        attach="fog"
        args={[fogColor, FOG_NEAR, reduced ? FOG_FAR_REDUCED : FOG_FAR]}
      />

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
      <Monitor />
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

        {/* DANS la même frontière que l'appareil photo, et volontairement :
            `frames={1}` ne calcule l'ombre qu'une fois — rien ne bouge sur le
            plateau, la recalculer à chaque frame reviendrait à rendre la scène
            deux fois pour une image identique. Montée ici, elle attend que le
            .glb soit chargé, sinon l'unique passe se ferait sans l'appareil et
            il serait le seul objet à flotter. */}
        <ContactShadows
          position={[0, CONTACT_Y, 0]}
          // `scale` multiplie width/height (défaut 10 !) : sans ce 1, une zone
          // de 3.4 × 1.5 couvrirait 34 × 15 unités, soit toute la pièce, et la
          // résolution utile tomberait à quelques pixels par objet.
          scale={1}
          width={desk.width}
          height={desk.depth}
          resolution={512}
          frames={1}
          // Ne capte que ce qui touche presque le plateau. Au-delà, le corps du
          // moniteur et la nacelle de l'Osmo poseraient leur silhouette entière
          // à plat sur le bois.
          far={0.42}
          blur={2.2}
          opacity={0.4}
          color={palette.dusk950}
        />
      </Suspense>

      <WindowLight keyColor={preset.key.color} skyColor={preset.sky} />
      <Reflections />

      <PostFX />
    </Canvas>
  );
}
