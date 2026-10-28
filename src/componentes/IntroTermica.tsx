"use client";

import { useEffect, useRef, useState } from "react";
import { Firmas } from "@/componentes/Firmas";
import { CONTACTO, EnlacesContacto } from "@/componentes/Contacto";
import { DEMANDAS, FUENTES } from "@/dominio/escenario";

// Entrada de Valor Térmico: "calibración del sensor térmico". Tapa el mapa
// mientras carga las teselas de la planta (avance real, con tope) y termina con
// un barrido de escaneo que destapa la termografía. Sin vuelo desde el planeta.

const MIN_MS = 3200;
const MAX_MS = 9000;
const MENSAJES: Array<[number, string]> = [
  [0, "Inicializando sensor"],
  [0.15, "Calibrando escala 0–320 °C"],
  [0.35, "Cargando imagen satelital de la planta"],
  [0.55, `Ubicando ${FUENTES.length} fuentes de calor`],
  [0.7, `Ubicando ${DEMANDAS.length} demandas de energía`],
  [0.85, "Trazando racks de tubería"],
  [0.98, "Listo"],
];

export function IntroTermica({ mapaListo, onTerminar }: { mapaListo: boolean; onTerminar: () => void }) {
  const [revelando, setRevelando] = useState(false);
  const barra = useRef<HTMLDivElement>(null);
  const texto = useRef<HTMLSpanElement>(null);
  const porcentaje = useRef<HTMLSpanElement>(null);
  const listo = useRef(mapaListo);
  listo.current = mapaListo;

  // Avance: corre con el tiempo hasta 90 % y solo llega a 100 % cuando el mapa está listo (o al tope).
  useEffect(() => {
    const inicio = performance.now();
    let cuadro = 0;
    let ultimo = "";
    const paso = (ahora: number) => {
      // El primer cuadro puede traer una marca anterior a «inicio»: sin el tope, el avance sería negativo.
      const t = Math.max(0, ahora - inicio);
      const base = Math.min(0.9, t / MIN_MS * 0.9);
      const p = listo.current && t >= MIN_MS ? 1 : t >= MAX_MS ? 1 : base;
      if (barra.current) barra.current.style.transform = `scaleX(${p})`;
      if (porcentaje.current) porcentaje.current.textContent = `${String(Math.round(p * 100)).padStart(3, "0")} %`;
      const m = [...MENSAJES].reverse().find(([d]) => p >= d)![1];
      if (m !== ultimo && texto.current) {
        texto.current.textContent = m;
        ultimo = m;
      }
      if (p < 1) cuadro = requestAnimationFrame(paso);
      else setRevelando(true);
    };
    cuadro = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(cuadro);
  }, []);

  useEffect(() => {
    if (!revelando) return;
    const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = setTimeout(onTerminar, reducido ? 0 : 1450);
    return () => clearTimeout(id);
  }, [revelando, onTerminar]);

  return (
    <div className="pointer-events-none absolute inset-0 z-50" role="status" aria-live="polite" aria-label="Calibrando la vista térmica">
      <div className={`pointer-events-auto absolute inset-0 flex flex-col bg-[#0A0A0B] ${revelando ? "vt-revelar" : ""}`}>
        {/* Esquinas del visor y retícula central. */}
        <div className="absolute inset-6 border border-white/10" aria-hidden>
          {["left-0 top-0 border-l-2 border-t-2", "right-0 top-0 border-r-2 border-t-2", "bottom-0 left-0 border-b-2 border-l-2", "bottom-0 right-0 border-b-2 border-r-2"].map((c) => (
            <span key={c} className={`absolute h-8 w-8 border-[#FFB000] ${c}`} />
          ))}
        </div>
        <div className="m-auto flex w-full max-w-3xl flex-col items-center gap-5 px-6 text-center lg:gap-7">
          <p className="hud text-[11px] text-[#FFB000]">
            <span className="vt-parpadeo mr-2 inline-block h-2 w-2 bg-[#FF3B30] align-middle" />
            REC · Refinería de Cartagena · 10,31° N 75,49° O
          </p>
          <h1 className="text-5xl font-extrabold uppercase leading-none tracking-tight text-white sm:text-7xl">
            Valor <span className="vt-degradado">Térmico</span>
          </h1>
          <p className="hud text-xs text-[#9B9BA1]">Mapa de oportunidades térmicas</p>
          <div className="h-3 w-full max-w-md" style={{ background: "var(--ironbow)" }} aria-hidden />
          <div className="flex w-full max-w-md justify-between text-[10px] text-[#9B9BA1] cifra-tabular" aria-hidden>
            <span>0 °C</span>
            <span>160 °C</span>
            <span>320 °C</span>
          </div>
          <div className="flex w-full max-w-md flex-col gap-2">
            <div className="h-px w-full bg-white/15">
              <div ref={barra} className="h-px w-full origin-left bg-[#FFB000]" style={{ transform: "scaleX(0)" }} />
            </div>
            <div className="hud flex justify-between text-[10px] text-[#9B9BA1]">
              <span ref={texto}>Inicializando sensor</span>
              <span className="flex gap-3">
                <span ref={porcentaje} className="cifra-tabular">000 %</span>
                <button type="button" onClick={() => setRevelando(true)} className="hud text-[#5E5E66] hover:text-white">
                  Saltar
                </button>
              </span>
            </div>
          </div>
          <div className="flex max-w-xl flex-col gap-1 text-[11px] leading-relaxed text-[#5E5E66]">
            <p className="text-[#F5C518]">Prototipo de demostración: ubicaciones de procesos y cifras ilustrativas.</p>
            <details className="text-left">
              <summary className="cursor-pointer list-none text-center text-[#9B9BA1] hover:text-white">Aviso de privacidad ▾</summary>
              <p className="mt-2 border border-white/10 p-3 text-[#9B9BA1]">
                Esta demostración no pide registro ni recoge datos personales: todo se calcula en su navegador. El mapa lo sirve Mapbox, que recibe datos técnicos de la conexión (IP y navegador) según su propia política de privacidad. No hay cookies de seguimiento.
              </p>
            </details>
          </div>
          <Firmas />
          <div className="flex flex-col items-center gap-1.5 border-t border-white/10 pt-3 text-[11px]">
            <span className="hud text-[9px] text-[#9B9BA1]">Contacto · {CONTACTO.autor} · {CONTACTO.cargo}</span>
            <EnlacesContacto className="justify-center" />
          </div>
        </div>
      </div>
      {revelando ? <div className="vt-barrido absolute inset-x-0 top-0 h-[3px] bg-[#FFE14D] shadow-[0_0_24px_6px_rgba(255,176,0,0.75)]" aria-hidden /> : null}
    </div>
  );
}
