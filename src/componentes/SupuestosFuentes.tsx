"use client";

import { useEffect } from "react";
import { FUENTES_DATOS, type FuenteDato } from "@/dominio/escenario";

// Sección «Supuestos y fuentes»: cada valor de referencia del prototipo con su
// tipo (publicado, estimación, supuesto o meta de la refinería), cómo se obtuvo
// y, si existe, el enlace a la fuente publicada.

const TONO: Record<FuenteDato["tipo"], string> = {
  PUBLICADO: "#3DDC84",
  "ESTIMACIÓN": "#F5C518",
  SUPUESTO: "#9B9BA1",
  "META DE LA REFINERÍA": "#5AC8FA",
};

export function SupuestosFuentes({ onCerrar }: { onCerrar: () => void }) {
  useEffect(() => {
    const f = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [onCerrar]);
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#0A0A0B]/80 p-4" role="dialog" aria-modal="true" aria-label="Supuestos y fuentes" onClick={onCerrar}>
      <div className="visor flex max-h-full w-full max-w-3xl flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <p className="hud text-[10px] text-[#FFB000]">Respaldo de las cifras</p>
            <h2 className="text-lg font-extrabold uppercase text-white">Supuestos y fuentes</h2>
          </div>
          <button type="button" onClick={onCerrar} className="hud border border-white/15 px-2.5 py-1 text-[10px] text-[#9B9BA1] hover:text-white">
            ✕ Cerrar
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto px-4 py-3">
          <p className="mb-3 text-xs text-[#9B9BA1]">
            Toda cifra del prototipo sale de una fuente publicada o de un supuesto declarado. Los indicadores de cada proyecto son estimaciones y se precisan con los datos reales de la planta.
          </p>
          <ul className="flex flex-col gap-2">
            {FUENTES_DATOS.map((d) => (
              <li key={d.dato} className="grid gap-1 border-b border-white/5 pb-2 text-xs sm:grid-cols-[11rem_1fr]">
                <div>
                  <p className="font-semibold text-white">{d.dato}</p>
                  <span className="hud text-[9px]" style={{ color: TONO[d.tipo] }}>
                    {d.tipo}
                  </span>
                </div>
                <div>
                  <p className="cifra-tabular text-white">{d.valor}</p>
                  <p className="text-[#9B9BA1]">{d.explicacion}</p>
                  {d.fuente ? (
                    <a href={d.fuente.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-[#FFB000] hover:text-white">
                      {d.fuente.nombre} ↗
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
