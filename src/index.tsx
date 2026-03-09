import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Dragon } from "./screens/Dragon";

createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <Dragon />
  </StrictMode>,
);
