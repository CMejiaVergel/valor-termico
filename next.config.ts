import type { NextConfig } from "next";

// Sitio estático (out/): la vitrina corre completa en el navegador, sin servidor.
// Para publicarlo en una subruta (p. ej. GitHub Pages) se define BASE_PATH al compilar.
const base = process.env.BASE_PATH ?? "";

const config: NextConfig = {
  output: "export",
  // El build va a su propia carpeta para no pisar la .next de `next dev` si ambos corren a la vez.
  distDir: process.env.NODE_ENV === "production" ? ".next-build" : ".next",
  basePath: base || undefined,
  images: { unoptimized: true },
  trailingSlash: true,
  env: { NEXT_PUBLIC_BASE_PATH: base },
};

export default config;
