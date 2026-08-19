"use client";

import { useMemo } from "react";
import { SphereGeometry } from "three";
import { palette } from "@/lib/palette";
import ToonMaterial from "../ToonMaterial";

/**
 * Corps de la souris — un demi-ellipsoïde bas-poly RESSERRÉ VERS L'AVANT.
 *
 * Aucune primitive de Three ne donne cette forme : sphère, capsule et lathe sont
 * toutes symétriques d'avant en arrière, et c'est précisément cette symétrie qui
 * faisait lire un galet. Une mise à l'échelle non uniforme n'y change rien, elle
 * étire sans effiler.
 *
 * D'où la déformation à la main : chaque anneau de la demi-sphère est rétréci en
 * largeur ET en hauteur d'autant qu'il est proche de l'avant. Le résultat est
 * large et haut à l'arrière — la paume — et étroit et bas devant, aux boutons.
 * C'est la silhouette vue de dessus qui identifie une souris, pas son profil.
 *
 * `thetaLength` à π/2 coupe à l'équateur : la base reste PLATE, posée net sur le
 * tapis. Un galet est rond dessous, une souris non.
 *
 * `computeVertexNormals` n'est pas optionnel : déplacer les sommets sans
 * recalculer les normales laisserait l'ombrage de la sphère d'origine, et la
 * forme effilée s'éclairerait comme une boule.
 */
function useMouseBody() {
  return useMemo(() => {
    // Peu de segments, le parti pris est assumé : la souris fait ~20 px à
    // l'écran, un maillage dense n'y ajouterait rien de visible.
    const geometry = new SphereGeometry(1, 12, 4, 0, Math.PI * 2, 0, Math.PI / 2);
    const position = geometry.attributes.position;

    for (let i = 0; i < position.count; i += 1) {
      // z va de -1 (avant) à +1 (arrière) ; t de 0 à 1.
      const t = (position.getZ(i) + 1) / 2;
      // Jamais 0 à l'avant : la pointe doit rester un museau arrondi, pas une
      // arête. Une souris est effilée, pas taillée en biseau.
      position.setX(i, position.getX(i) * (0.54 + 0.46 * t));
      position.setY(i, position.getY(i) * (0.58 + 0.42 * t));
    }

    geometry.computeVertexNormals();
    return geometry;
  }, []);
}

export default function Mouse() {
  const body = useMouseBody();

  return (
    <group position={[1.02, 0.01, 0.33]}>
      <mesh geometry={body} scale={[0.065, 0.082, 0.118]} castShadow>
        <ToonMaterial color={palette.shell700} />
      </mesh>

      {/* Molette, ramenée près de la crête. Posée à sa place anatomique — dans
          le tiers avant — elle disparaissait derrière le sommet du dôme : la
          caméra regarde la souris de très haut mais de loin, et tout ce qui est
          à la fois bas et éloigné passe derrière ce qui est haut et proche.
          L'objet fait ~20 px à l'écran, ce détail ne porte que la ponctuation
          froide, pas la lecture de la forme. */}
      <mesh position={[0, 0.06, -0.03]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.011, 0.011, 0.015, 8]} />
        <ToonMaterial color={palette.teal400} />
      </mesh>
    </group>
  );
}
