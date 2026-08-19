import * as THREE from "three";

/**
 * Rampe de dégradé pour `MeshToonMaterial` : c'est elle qui produit les paliers
 * francs du cel-shading. Moins de paliers = rendu plus cartoon.
 *
 * La texture est mise en cache par nombre de paliers — trois matériaux qui
 * partagent la même rampe doivent partager la même texture GPU.
 */
const cache = new Map<number, THREE.DataTexture>();

export function toonGradient(steps = 3): THREE.DataTexture {
  const cached = cache.get(steps);
  if (cached) return cached;

  const data = new Uint8Array(steps);
  for (let i = 0; i < steps; i += 1) {
    data[i] = ((i + 1) / steps) * 255;
  }

  const texture = new THREE.DataTexture(data, steps, 1, THREE.RedFormat);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;

  cache.set(steps, texture);
  return texture;
}
