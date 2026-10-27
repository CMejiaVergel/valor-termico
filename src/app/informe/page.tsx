import { Suspense } from "react";
import type { Metadata } from "next";
import { Informe } from "@/componentes/informe/Informe";

export const metadata: Metadata = { title: "Informe de propuesta · Valor Térmico" };

// Vista de documento del informe de una propuesta (se imprime o guarda como PDF desde el navegador).
// Los parámetros (propuesta, esquema y supuestos) llegan en la URL; por eso va dentro de Suspense.
export default function PaginaInforme() {
  return (
    <Suspense fallback={null}>
      <Informe />
    </Suspense>
  );
}
