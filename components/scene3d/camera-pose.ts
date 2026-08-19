import { Vector3 } from "three";

/**
 * Pose de la caméra — et contrat de partage entre les deux choses qui la
 * déplacent.
 *
 * LE PROBLÈME QUE CE FICHIER RÉSOUT. Deux mouvements visent la caméra : le
 * parallax souris, continu, et la transition scroll/clic vers la dalle, à venir.
 * S'ils écrivent tous les deux dans `camera.position`, le dernier à passer dans
 * la frame gagne — le parallax, qui tourne à chaque frame, écraserait purement
 * et simplement l'animation GSAP. Le symptôme serait un zoom qui ne part pas,
 * ou qui tressaute.
 *
 * LA RÈGLE. `camera.position` n'est écrite qu'à UN endroit, `CameraParallax`.
 * Tout le reste écrit ici, dans `cameraBase` : c'est la pose que la caméra
 * aurait sans parallax. Le parallax lit cette base et ajoute son décalage
 * angulaire par-dessus. Les deux mouvements se composent au lieu de se disputer.
 *
 * Concrètement, pour la transition à venir : animer `cameraBase.position` et
 * `cameraBase.target` avec GSAP (ce sont des `Vector3`, donc des objets que
 * GSAP interpole directement sur `.x/.y/.z`), et ne jamais toucher à la caméra
 * elle-même.
 */

/** Pose de départ, avant toute interaction. Cadrage calé sur le plateau. */
export const START_POSITION: readonly [number, number, number] = [0, 1.29, 4.16];

/** Point visé. Légèrement sous le centre de la dalle, au-dessus du plateau. */
export const START_TARGET: readonly [number, number, number] = [0, 0.5, -0.4];

/**
 * Pose de base courante. Mutable, et volontairement au niveau du module : c'est
 * la surface que GSAP animera, or GSAP interpole des objets, pas du state React.
 */
export const cameraBase = {
  position: new Vector3(...START_POSITION),
  target: new Vector3(...START_TARGET),
};

/**
 * Remet la base à la pose de départ.
 *
 * Nécessaire parce que l'objet ci-dessus survit au démontage du composant : sans
 * ce reset, un remontage — Fast Refresh en développement, retour vers la scène
 * 3D depuis le faux OS — repartirait de la pose où la dernière animation s'était
 * arrêtée, c'est-à-dire collé à l'écran.
 */
export function resetCameraBase() {
  cameraBase.position.set(...START_POSITION);
  cameraBase.target.set(...START_TARGET);
}
