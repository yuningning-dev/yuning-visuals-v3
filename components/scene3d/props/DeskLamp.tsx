"use client";

import { useMemo } from "react";
import { Color } from "three";
import { preCompensate } from "@/lib/agx";
import { authoredPalette, palette } from "@/lib/palette";
import { lampDiffuserTexture, woodGrainTexture } from "@/lib/textures";
import GlowQuad from "../effects/GlowQuad";
import ToonMaterial from "../ToonMaterial";

/** Posée à droite du moniteur, entre la dalle et la fenêtre. */
export const LAMP_POSITION: [number, number, number] = [1.12, 0, -0.55];

const RADIUS = 0.105;
const BASE_HEIGHT = 0.085;
const DIFFUSER_HEIGHT = 0.195;
const CAP_HEIGHT = 0.03;
const SEGMENTS = 20;

/**
 * Émission du diffuseur : blanc chaud à 1.5.
 *
 * Portée par la COULEUR d'un matériau non éclairé et non par `emissive` sur un
 * matériau éclairé — même résultat au pixel près (un `emissive` sur albédo noir
 * n'est qu'une couleur non éclairée), mais un matériau éclairé rendrait le
 * diffuseur sombre du côté opposé à la clé, alors qu'une source ne s'assombrit
 * pas sur sa propre face arrière.
 *
 * 1.5, franchement sous les 3 de la dalle : le diffuseur est déjà la surface la
 * plus proche de la caméra à s'allumer, et il porte une texture de dégradé. Plus
 * haut, la texture est écrasée par le bloom et la lampe redevient le cylindre
 * blanc uniforme qu'on a passé du temps à éviter.
 */
const DIFFUSER_EMISSIVE = new Color(preCompensate("#fff8e8")).multiplyScalar(1.5);

/**
 * Lampe tactile, d'après `references/LAMPE BUREAU .jpg`.
 *
 * Rien à voir avec la lampe articulée du premier jet : c'est un cylindre trapu,
 * diffuseur blanc laiteux pris entre une base et un capuchon en bois. Ni tige,
 * ni abat-jour, ni bras — la silhouette tient entièrement dans le contraste
 * entre les deux bandeaux de bois et le corps qui s'allume.
 *
 * Le diffuseur est en matériau non éclairé : c'est une surface qui émet, elle ne
 * doit pas s'assombrir du côté opposé à la clé. Depuis le passage à AgX, il
 * émet POUR DE BON — sa couleur dépasse 1 (voir `DIFFUSER_EMISSIVE`) au lieu de
 * se contenter d'être claire. La `pointLight` reste une source distincte : le
 * diffuseur est ce qu'on VOIT, la pointLight ce qui ÉCLAIRE.
 */
export default function DeskLamp() {
  const wood = useMemo(() => woodGrainTexture(), []);
  const diffuser = useMemo(() => lampDiffuserTexture(), []);

  const diffuserY = BASE_HEIGHT + DIFFUSER_HEIGHT / 2;
  const capY = BASE_HEIGHT + DIFFUSER_HEIGHT + CAP_HEIGHT / 2;

  return (
    <group position={LAMP_POSITION}>
      {/* Chêne clair et non foncé : contre un diffuseur crème, un bois sombre
          vire au quasi-noir sous cet éclairage et les deux bandeaux disparaissent
          au lieu de structurer la silhouette. */}
      <mesh position={[0, BASE_HEIGHT / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[RADIUS, RADIUS * 1.02, BASE_HEIGHT, SEGMENTS]} />
        <ToonMaterial color={palette.wood400} map={wood} />
      </mesh>

      <mesh position={[0, diffuserY, 0]} castShadow>
        <cylinderGeometry
          args={[RADIUS * 0.99, RADIUS * 0.99, DIFFUSER_HEIGHT, SEGMENTS]}
        />
        {/* La couleur MULTIPLIE la texture : le dégradé du diffuseur reste
            lisible, il émet simplement au-dessus de 1. */}
        <meshBasicMaterial map={diffuser} color={DIFFUSER_EMISSIVE} />
      </mesh>

      <mesh position={[0, capY, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[RADIUS, RADIUS, CAP_HEIGHT, SEGMENTS]} />
        <ToonMaterial color={palette.wood400} map={wood} />
      </mesh>

      {/* Halo resserré sur le seul diffuseur. En 0.6 × 0.5, il débordait sur la
          base et le capuchon et effaçait les deux bandeaux de bois — la lampe
          lisait comme un simple cylindre blanc. */}
      <GlowQuad
        position={[0, diffuserY, 0]}
        size={[0.44, 0.4]}
        color={palette.lamp400}
        opacity={0.32}
        falloff={3}
      />

      {/* Un diffuseur éclaire à 360°, pas vers le bas : la source est au centre
          du corps et non sous une ouverture.

          La diffusion se règle par la FORME de l'atténuation, pas par `intensity` :
          — `decay` sous 2 aplatit la courbe. C'est lui qui adoucit le passage
            éclairé/non éclairé : la nappe s'étire au lieu de tomber.
          — `distance` recule la coupure. À 2.3 elle tranchait un cercle net en
            plein dans le dégradé — soit exactement le bord qu'on cherche à fondre.
          — `intensity` NE BOUGE PAS, et c'est le point à ne pas rater. Le réflexe
            est de la remonter pour compenser le pied de lampe qu'un `decay` plus
            bas dégarnit. Mesuré : à 3.2 la scène entière prend +10 à +37 %, jusqu'au
            mur gauche que la lampe n'est pas censée toucher — la lampe lit plus
            FORTE, pas plus diffuse. À 2.6 la courbe se contente de redistribuer :
            le pic sur le plateau reste à l'identique et ce sont les flancs qui
            montent. C'est ça, diffuser. */}
      <pointLight
        position={[0, diffuserY, 0.04]}
        color={authoredPalette.lamp200}
        intensity={2.6}
        distance={3.2}
        decay={1.5}
      />

      {/* Nappe sur le plateau — la part visible de la lumière de la lampe, à
          élargir avec la source sinon les deux se désaccordent : la pièce
          s'éclaire plus loin pendant que la tache, elle, garde son ancien bord.
          `falloff` bas étale la densité au lieu de la concentrer ; `opacity`
          redescend d'autant, parce qu'un quad additif plus grand ajoute plus de
          lumière à opacité égale et la lampe virerait au projecteur. */}
      <GlowQuad
        position={[0, 0.007, 0.16]}
        rotation={[-Math.PI / 2, 0, 0]}
        size={[2.15, 1.9]}
        color={palette.lamp400}
        opacity={0.3}
        falloff={1.35}
      />
    </group>
  );
}
