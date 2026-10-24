import localFont from "next/font/local";

// Tipografías autoalojadas de Calor Rescatado: Fraunces (titulares), IBM Plex
// Sans (texto) e IBM Plex Mono (cifras tabulares). Sin Google Fonts en producción.

export const fuenteTitulos = localFont({
  variable: "--font-titulos",
  display: "swap",
  src: [
    { path: "../../public/fonts/fraunces-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../../public/fonts/fraunces-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
});

export const fuenteTexto = localFont({
  variable: "--font-texto",
  display: "swap",
  src: [
    { path: "../../public/fonts/ibm-plex-sans-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/ibm-plex-sans-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/ibm-plex-sans-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../../public/fonts/ibm-plex-sans-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
});

export const fuenteMono = localFont({
  variable: "--font-mono",
  display: "swap",
  src: [
    { path: "../../public/fonts/ibm-plex-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/ibm-plex-mono-latin-500-normal.woff2", weight: "500", style: "normal" },
  ],
});
