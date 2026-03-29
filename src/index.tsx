import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import { Dragon } from "./screens/Dragon";
import { FullscreenGame } from "./screens/FullscreenGame";

createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<Dragon />} />
        <Route path="/play" element={<FullscreenGame />} />
      </Routes>
    </HashRouter>
  </StrictMode>,
);
