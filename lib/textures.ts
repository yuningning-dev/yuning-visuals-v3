import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";

/**
 * Textures procédurales, dessinées sur un canvas au premier usage.
 *
 * Aucun fichier image : le projet modélise tout en code, les textures suivent la
 * même règle. Zéro octet à télécharger, et la teinte reste pilotée par la palette.
 *
 * Toutes sont dessinées en NUANCES DE BLANC. Un `map` de matériau multiplie la
 * couleur de base : en générant du blanc cassé, la texture n'apporte que le
 * grain et c'est `palette.ts` qui garde la main sur la couleur. Une texture déjà
 * teintée doublerait la source de vérité.
 *
 * Ces fonctions touchent au DOM : elles ne sont appelées que depuis les
 * composants de la scène, montés côté client uniquement (`ssr: false`).
 */

const cache = new Map<string, CanvasTexture>();

/** PRNG déterministe : deux rechargements doivent donner le même grain. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function build(
  key: string,
  size: number,
  repeat: [number, number],
  draw: (ctx: CanvasRenderingContext2D, size: number, rand: () => number) => void,
): CanvasTexture {
  const cached = cache.get(key);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error(`Contexte 2D indisponible pour la texture ${key}`);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  draw(ctx, size, mulberry32(key.length * 9176 + size));

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeat[0], repeat[1]);
  // Le plateau se voit en fuyante : sans anisotropie, le grain part en bouillie
  // dès qu'il s'éloigne.
  texture.anisotropy = 4;

  cache.set(key, texture);
  return texture;
}

/**
 * Veine de bois : des filets qui ondulent doucement, plus quelques noeuds.
 * Volontairement graphique et non photoréaliste — c'est du bois de dessin animé.
 */
export function woodGrainTexture(): CanvasTexture {
  return build("wood", 512, [3, 1], (ctx, size, rand) => {
    for (let i = 0; i < 160; i += 1) {
      const y = rand() * size;
      const amplitude = 2 + rand() * 7;
      const alpha = 0.03 + rand() * 0.08;

      ctx.strokeStyle = `rgba(60, 30, 12, ${alpha})`;
      ctx.lineWidth = 0.6 + rand() * 2.2;
      ctx.beginPath();
      for (let x = 0; x <= size; x += 16) {
        const wave = Math.sin((x / size) * Math.PI * 2 + i) * amplitude;
        if (x === 0) ctx.moveTo(x, y + wave);
        else ctx.lineTo(x, y + wave);
      }
      ctx.stroke();
    }

    for (let k = 0; k < 3; k += 1) {
      const cx = rand() * size;
      const cy = rand() * size;
      for (let r = 3; r < 26; r += 3.5) {
        ctx.strokeStyle = `rgba(60, 30, 12, ${0.1 - r * 0.003})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.ellipse(cx, cy, r, r * 0.42, 0.5, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  });
}

/** Tissage serré du tapis de souris. */
export function weaveTexture(): CanvasTexture {
  return build("weave", 128, [26, 14], (ctx, size) => {
    ctx.strokeStyle = "rgba(0, 0, 0, 0.16)";
    ctx.lineWidth = 1;
    for (let i = -size; i < size * 2; i += 5) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + size, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(i + size, 0);
      ctx.lineTo(i, size);
      ctx.stroke();
    }
  });
}

/**
 * Dégradé vertical du diffuseur de la lampe : blanc en haut, chaud en bas.
 *
 * Seule texture du module qui porte une vraie couleur, et c'est assumé : ici la
 * teinte EST l'effet — un cylindre uniformément blanc ne lit pas comme allumé.
 */
export function lampDiffuserTexture(): CanvasTexture {
  return build("diffuser", 64, [1, 1], (ctx, size) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, size);
    gradient.addColorStop(0, "#fffaf0");
    gradient.addColorStop(0.45, "#fff3dd");
    gradient.addColorStop(1, "#ffcf95");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  });
}

/** Grain de plâtre du mur : à peine perceptible, juste de quoi casser l'aplat. */
export function plasterTexture(): CanvasTexture {
  return build("plaster", 256, [7, 4], (ctx, size, rand) => {
    for (let i = 0; i < 2600; i += 1) {
      const alpha = rand() * 0.07;
      ctx.fillStyle =
        rand() > 0.5
          ? `rgba(0, 0, 0, ${alpha})`
          : `rgba(255, 255, 255, ${alpha * 1.4})`;
      ctx.beginPath();
      ctx.arc(rand() * size, rand() * size, 0.6 + rand() * 1.9, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}
