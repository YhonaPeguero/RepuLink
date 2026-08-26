import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Providers } from "./providers";
import App from "./App";
import "@fontsource/bricolage-grotesque/400.css";
import "@fontsource/bricolage-grotesque/600.css";
import "@fontsource/bricolage-grotesque/700.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./index.css";

// Marca el documento como listo en cuanto React monta: el velo #boot de
// index.html se desvanece y no hay flash blanco ni salto de layout.
requestAnimationFrame(() =>
  document.documentElement.classList.add("app-ready")
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Providers>
      <App />
    </Providers>
  </StrictMode>
);
