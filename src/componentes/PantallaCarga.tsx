"use client";

import { useEffect, useRef } from "react";
import { DEMANDAS, FUENTES } from "@/dominio/escenario";
import { cssTemperatura } from "@/componentes/ui";

// Pantalla de carga (misma mecánica que la Vitrina de ConfluencIA): tapa el
// mapa mientras precarga el estilo satelital, las teselas de la planta y la
// ruta de vuelo. La barra avanza a ritmo constante y se dibuja con refs, sin
// re-renderizar React.

const MENSAJES: Array<[number, string]> = [
  [0, "Inicializando el motor gráfico"],
  [0.08, "Cargando el estilo satelital"],
  [0.2, "Descargando teselas de la Refinería de Cartagena"],
  [0.34, "Precargando la ruta de vuelo"],
  [0.48, "Levantando las unidades de proceso en 3D"],
  [0.6, "Ubicando 8 fuentes de calor residual"],
  [0.7, "Ubicando 7 demandas de energía"],
  [0.8, "Cruzando 56 pares fuente–demanda"],
  [0.9, "Priorizando el portafolio de oportunidades"],
  [0.98, "Listo"],
];

export function PantallaCarga({ saliendo, duracionMs, onSaltar }: { saliendo: boolean; duracionMs: number; onSaltar: () => void }) {
  const barra = useRef<HTMLDivElement>(null);
  const porcentaje = useRef<HTMLSpanElement>(null);
  const mensaje = useRef<HTMLSpanElement>(null);
  const duracion = useRef(duracionMs);
  duracion.current = duracionMs;

  useEffect(() => {
    const inicio = performance.now();
    let ultimo = "";
    let cuadro = 0;
    const paso = (ahora: number) => {
      const p = Math.min(1, Math.max(0, (ahora - inicio) / duracion.current));
      if (barra.current) barra.current.style.transform = `scaleX(${p})`;
      if (porcentaje.current) porcentaje.current.textContent = `${Math.round(p * 100)} %`;
      const texto = [...MENSAJES].reverse().find(([desde]) => p >= desde)![1];
      if (texto !== ultimo && mensaje.current) {
        mensaje.current.textContent = texto === "Listo" ? texto : `${texto}…`;
        ultimo = texto;
      }
      if (p < 1) cuadro = requestAnimationFrame(paso);
    };
    cuadro = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(cuadro);
  }, []);

  return (
    <div
      className={`absolute inset-0 z-50 flex flex-col overflow-y-auto bg-[#051417] px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] transition-opacity duration-700 motion-reduce:transition-none ${saliendo ? "pointer-events-none opacity-0" : "opacity-100"}`}
      role="status"
      aria-live="polite"
      aria-label="Cargando la vitrina"
    >
      <div className="vt-resplandor pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative m-auto flex w-full flex-col items-center gap-6 sm:gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="rounded-full border border-[#00AEC0]/40 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-[#00AEC0]">Prototipo interactivo · Refinería de Cartagena</p>
          <h1 className="font-[family-name:var(--font-titulos)] text-5xl font-bold leading-none text-white sm:text-7xl">
            <span className="vt-degradado">Calor</span> Rescatado
          </h1>
          <p className="text-lg text-[#E0F0F2] sm:text-xl">Mapa de Oportunidades Térmicas</p>
          <p className="max-w-xl text-sm text-[#8CA8AD]">Del calor residual invisible a un portafolio de proyectos medibles, priorizados y financiables.</p>
        </div>

        <div className="grid w-full max-w-3xl gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-center text-[10px] uppercase tracking-[0.25em] text-[#FF8A3D]">8 fuentes de calor residual</p>
            <ul className="grid grid-cols-2 gap-1 text-[11px]">
              {FUENTES.map((f) => (
                <li key={f.id} className="flex items-center gap-1.5 truncate rounded-md border border-white/10 bg-white/5 px-2 py-1">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: cssTemperatura(f.tMax) }} />
                  <span className="truncate text-white">{f.nombre}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1.5 text-center text-[10px] uppercase tracking-[0.25em] text-[#60A5FA]">7 demandas de energía</p>
            <ul className="grid grid-cols-2 gap-1 text-[11px]">
              {DEMANDAS.map((d) => (
                <li key={d.id} className="flex items-center gap-1.5 truncate rounded-md border border-white/10 bg-white/5 px-2 py-1">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-[#60A5FA]" />
                  <span className="truncate text-white">{d.nombre}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex w-full max-w-md flex-col gap-2">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-label="Progreso de carga">
            <div ref={barra} className="h-full w-full origin-left rounded-full bg-gradient-to-r from-[#00AEC0] via-[#CFE84E] to-[#FF8A3D]" style={{ transform: "scaleX(0)" }} />
          </div>
          <div className="flex items-center justify-between gap-3 text-xs">
            <span ref={mensaje} className="text-[#8CA8AD]">
              Inicializando el motor gráfico…
            </span>
            <span className="flex items-center gap-3">
              <span ref={porcentaje} className="cifra-tabular text-[#5A7A80]">
                0 %
              </span>
              <button type="button" onClick={onSaltar} className="rounded px-2 py-0.5 text-[#5A7A80] hover:text-white">
                Saltar
              </button>
            </span>
          </div>
        </div>

        <footer className="flex max-w-3xl flex-col items-center gap-1.5 border-t border-white/10 pt-4 text-center text-[11px] leading-relaxed text-[#5A7A80]">
          <p className="text-[#FACC15]">Demostración: las cifras son ilustrativas y se ajustan con datos reales de la refinería.</p>
          <details className="w-full max-w-2xl text-left">
            <summary className="cursor-pointer list-none text-center text-[#8CA8AD] hover:text-white">Aviso de privacidad ▾</summary>
            <div className="mt-2 flex flex-col gap-1.5 rounded-md border border-white/10 bg-white/5 p-3 text-[#8CA8AD]">
              <p>Esta demostración no pide registro ni recoge datos personales: todo se calcula en su propio navegador.</p>
              <p>Su navegador guarda solo una preferencia técnica de esta sesión (para acortar esta pantalla si vuelve a entrar), que se borra al cerrar la pestaña. No hay cookies de seguimiento ni publicidad.</p>
              <p>El mapa lo sirve Mapbox, que recibe datos técnicos de la conexión (dirección IP y navegador) para entregar las imágenes, según su propia política de privacidad.</p>
            </div>
          </details>
        </footer>
      </div>
    </div>
  );
}
