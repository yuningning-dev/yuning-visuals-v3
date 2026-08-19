import SceneCanvas from "@/components/scene3d/SceneCanvas";

export default function Home() {
  return (
    // La scène est en position fixe : ce main ne sert plus que de repère
    // sémantique, il n'a plus à porter la hauteur du viewport.
    <main>
      <SceneCanvas />
    </main>
  );
}
