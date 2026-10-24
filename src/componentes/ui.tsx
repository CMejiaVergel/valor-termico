"use client";

import { useEffect, useRef, useState } from "react";
import type { Origen } from "@/dominio/escenario";

// Piezas compartidas de la vitrina: formatos, colores, cifras animadas y la
// marca de origen que acompaña a cada número (regla: sin origen no se muestra).

export const COLOR = {
  fondo: "#051417",
  fondo2: "#0E2B30",
  tarjeta: "#122E33",
  teal: "#00AEC0",
  naranja: "#FF8A3D",
  magenta: "#F0479A",
  lima: "#CFE84E",
  azul: "#60A5FA",
  verde: "#4ADE80",
  amarillo: "#FACC15",
  rojo: "#EF4444",
  texto: "#E0F0F2",
  texto2: "#8CA8AD",
  texto3: "#5A7A80",
} as const;

export const TONO_ORIGEN: Record<Origen, string> = { MEDIDO: COLOR.verde, DECLARADO: COLOR.azul, ESTIMADO: COLOR.amarillo };

export const num = (n: number, d = 0) => n.toLocaleString("es-CO", { minimumFractionDigits: d, maximumFractionDigits: d });
export const usd = (n: number) => (Math.abs(n) >= 1e6 ? `USD ${num(n / 1e6, 2)} M` : `USD ${num(n / 1e3, 0)} k`);
export const mw = (n: number) => `${num(n, n < 10 ? 1 : 0)} MW`;
export const anios = (n: number) => (Number.isFinite(n) ? `${num(n, 1)} años` : "sin retorno");

/** Escala de temperatura 0–320 °C (turquesa → lima → naranja → magenta → rojo). */
const PARADAS: Array<[number, [number, number, number]]> = [
  [0, [0, 174, 192]],
  [60, [74, 222, 128]],
  [110, [207, 232, 78]],
  [170, [255, 138, 61]],
  [240, [240, 71, 154]],
  [320, [239, 68, 68]],
];
export const T_MAX_ESCALA = 320;
export function rgbTemperatura(t: number): [number, number, number] {
  for (let i = 0; i < PARADAS.length - 1; i++) {
    const [v0, c0] = PARADAS[i]!;
    const [v1, c1] = PARADAS[i + 1]!;
    if (t <= v1) {
      const f = Math.max(0, (t - v0) / (v1 - v0));
      return [0, 1, 2].map((k) => Math.round(c0[k]! + (c1[k]! - c0[k]!) * f)) as [number, number, number];
    }
  }
  return PARADAS[PARADAS.length - 1]![1];
}
export const cssTemperatura = (t: number) => `rgb(${rgbTemperatura(t).join(",")})`;
export const gradienteTemperatura = `linear-gradient(90deg, ${PARADAS.map(([v, c]) => `rgb(${c.join(",")}) ${((v / T_MAX_ESCALA) * 100).toFixed(1)}%`).join(", ")})`;

export function ChipOrigen({ origen, mini = false }: { origen: Origen; mini?: boolean }) {
  return (
    <span
      className={`inline-block w-fit rounded-full border font-medium uppercase tracking-wide ${mini ? "px-1 text-[8px]" : "px-1.5 py-px text-[10px]"}`}
      style={{ borderColor: TONO_ORIGEN[origen], color: TONO_ORIGEN[origen] }}
    >
      {origen.toLowerCase()} · ilustrativo
    </span>
  );
}

/** Número que cuenta hasta su valor (900 ms, salida cúbica). */
export function Contador({ valor, decimales = 0, formato }: { valor: number; decimales?: number; formato?: (n: number) => string }) {
  const [mostrado, setMostrado] = useState(valor);
  const desde = useRef(valor);
  useEffect(() => {
    const inicio = performance.now();
    const origen = desde.current;
    let f = 0;
    const paso = (ahora: number) => {
      const k = Math.min(1, (ahora - inicio) / 900);
      setMostrado(origen + (valor - origen) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) f = requestAnimationFrame(paso);
      else desde.current = valor;
    };
    f = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(f);
  }, [valor]);
  return <>{formato ? formato(mostrado) : num(mostrado, decimales)}</>;
}

interface PropsKpi {
  etiqueta: string;
  valor: number;
  unidad?: string;
  origen: Origen;
  decimales?: number;
  formato?: (n: number) => string;
  resaltar?: boolean;
  activo?: boolean;
}

export function Kpi({ etiqueta, valor, unidad, origen, decimales, formato, resaltar, activo = true }: PropsKpi) {
  return (
    <div className={`flex min-w-0 flex-col gap-1 rounded-lg border px-3 py-2 transition-opacity duration-500 ${resaltar ? "border-[#CFE84E]/60 bg-[#1B2E12]/95" : "border-white/10 bg-[#051417]/90"} ${activo ? "opacity-100" : "opacity-45"}`}>
      <span className="truncate text-[11px] text-[#8CA8AD]">{etiqueta}</span>
      <span className="cifra-tabular text-xl font-semibold leading-none text-white">
        {activo ? <Contador valor={valor} decimales={decimales} formato={formato} /> : "—"}
        {unidad && activo ? <span className="ml-1 text-xs font-normal text-[#8CA8AD]">{unidad}</span> : null}
      </span>
      <ChipOrigen origen={origen} />
    </div>
  );
}

export function KpiMini({ etiqueta, valor, unidad, origen, decimales, formato, resaltar, activo = true }: PropsKpi) {
  return (
    <div className={`flex min-w-[6.8rem] shrink-0 snap-start flex-col rounded-lg border px-2 py-1 ${resaltar ? "border-[#CFE84E]/60 bg-[#1B2E12]/95" : "border-white/10 bg-[#051417]/90"} ${activo ? "" : "opacity-45"}`}>
      <span className="truncate text-[9px] text-[#8CA8AD]">{etiqueta}</span>
      <span className="cifra-tabular text-sm font-semibold leading-tight text-white">
        {activo ? <Contador valor={valor} decimales={decimales} formato={formato} /> : "—"}
        {unidad && activo ? <span className="ml-0.5 text-[9px] font-normal text-[#8CA8AD]">{unidad}</span> : null}
      </span>
      <ChipOrigen origen={origen} mini />
    </div>
  );
}

/** Barra de temperatura 0–320 °C con un rango (fuente) o un punto (demanda). */
export function BarraTemperatura({ tMin, tMax, punto, alto = 6 }: { tMin?: number; tMax?: number; punto?: number; alto?: number }) {
  const p = (t: number) => `${Math.max(0, Math.min(100, (t / T_MAX_ESCALA) * 100))}%`;
  return (
    <div className="relative w-full overflow-visible rounded-full" style={{ height: alto, background: gradienteTemperatura }}>
      {tMin !== undefined && tMax !== undefined ? (
        <>
          {/* Fuera del rango la escala se apaga; el rango queda con su color y un borde. */}
          <div className="absolute inset-y-0 left-0 rounded-l-full bg-[#051417]/75" style={{ width: p(tMin) }} />
          <div className="absolute inset-y-0 right-0 rounded-r-full bg-[#051417]/75" style={{ left: p(tMax) }} />
          <div className="absolute -inset-y-px rounded-full ring-[1.5px] ring-white" style={{ left: p(tMin), width: `calc(${p(tMax)} - ${p(tMin)})` }} />
        </>
      ) : (
        <div className="absolute inset-0 rounded-full bg-[#051417]/55" />
      )}
      {punto !== undefined ? <div className="absolute -top-1 h-[calc(100%+8px)] w-1 -translate-x-1/2 rounded bg-white shadow" style={{ left: p(punto) }} /> : null}
    </div>
  );
}
