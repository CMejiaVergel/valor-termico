import type { Metadata, Viewport } from "next";
import { fuenteMono, fuenteTexto, fuenteTitulos } from "./fuentes";
import "./globals.css";

export const metadata: Metadata = {
  title: "Valor Térmico · Mapa de Oportunidades Térmicas",
  description: "Recorrido guiado: del calor residual de la refinería a un portafolio de proyectos medibles, priorizados y financiables.",
};

// Celular como app: área segura completa y sin zoom de página (el mapa se acerca con los dedos).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#051417",
};

export default function RaizLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${fuenteTitulos.variable} ${fuenteTexto.variable} ${fuenteMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
