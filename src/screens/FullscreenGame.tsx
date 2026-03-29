import DragonTower from "../games/dragontower";

export const FullscreenGame = () => (
  <div
    style={{
      width: "100vw",
      height: "100vh",
      background: "#0e0c11",
      overflow: "hidden",
    }}
  >
    <DragonTower />
  </div>
);
