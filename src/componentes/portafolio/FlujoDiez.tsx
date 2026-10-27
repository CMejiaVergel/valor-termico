"use client";

import { ANIOS_FLUJO, type Flujo } from "@/dominio/portafolios";
import { num } from "@/componentes/ui";

// Flujo de caja acumulado de la refinería a 10 años, un trazo por esquema de
// financiamiento; el elegido va resaltado. Sirve en el tablero (oscuro) y en el informe (claro).

export function FlujoDiez({ flujos, seleccion, onSel, claro = false, alto = 200 }: { flujos: Flujo[]; seleccion: string; onSel?: (id: string) => void; claro?: boolean; alto?: number }) {
  const W = 560, H = 220, X0 = 52, X1 = 440, Y0 = 12, Y1 = 190;
  const todos = flujos.flatMap((f) => f.acumulado);
  const min = Math.min(0, ...todos) * 1.1, max = Math.max(...todos) * 1.08;
  const px = (a: number) => X0 + (a / ANIOS_FLUJO) * (X1 - X0);
  const py = (v: number) => Y1 - ((v - min) / (max - min || 1)) * (Y1 - Y0);
  const paso = max > 20e6 ? 5e6 : max > 8e6 ? 2e6 : 1e6;
  const marcas: number[] = [];
  for (let v = Math.ceil(min / paso) * paso; v <= max; v += paso) marcas.push(v);
  const tinta = claro ? "#3A3A40" : "#9B9BA1";
  const linea = claro ? "rgba(10,10,11,0.12)" : "rgba(237,237,237,0.1)";
  const ordenados = [...flujos].sort((a, b) => (a.modelo.id === seleccion ? 1 : 0) - (b.modelo.id === seleccion ? 1 : 0));
  // Posición vertical de cada etiqueta al final de su curva, separadas al menos 11 px.
  const yEtiqueta = new Map<string, number>();
  [...flujos].sort((a, b) => py(a.acumulado[ANIOS_FLUJO]!) - py(b.acumulado[ANIOS_FLUJO]!)).reduce((previa, f) => {
    const y = Math.max(py(f.acumulado[ANIOS_FLUJO]!), previa + 11);
    yEtiqueta.set(f.modelo.id, y);
    return y;
  }, -Infinity);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" style={{ height: alto }} role="img" aria-label="Flujo de caja acumulado de la refinería a 10 años por esquema de financiamiento">
      {marcas.map((v) => (
        <g key={v}>
          <line x1={X0} x2={X1} y1={py(v)} y2={py(v)} stroke={v === 0 ? (claro ? "rgba(10,10,11,0.45)" : "rgba(237,237,237,0.45)") : linea} />
          <text x={X0 - 6} y={py(v) + 3} fill={tinta} fontSize={9} textAnchor="end" fontFamily="JetBrains Mono, monospace">{num(v / 1e6, 0)}</text>
        </g>
      ))}
      <text x={X0 - 6} y={Y0 - 2} fill={tinta} fontSize={8} textAnchor="end" fontFamily="JetBrains Mono, monospace">USD M</text>
      {[0, 2, 4, 6, 8, 10].map((a) => (
        <text key={a} x={px(a)} y={H - 12} fill={tinta} fontSize={9} textAnchor="middle" fontFamily="JetBrains Mono, monospace">año {a}</text>
      ))}
      {ordenados.map((f) => {
        const sel = f.modelo.id === seleccion;
        const color = sel ? (claro ? "#D9480F" : "#FFE14D") : claro ? "rgba(10,10,11,0.25)" : "rgba(237,237,237,0.28)";
        const d = f.acumulado.map((v, a) => `${a ? "L" : "M"}${px(a)},${py(v)}`).join(" ");
        return (
          <g key={f.modelo.id} onClick={() => onSel?.(f.modelo.id)} style={{ cursor: onSel ? "pointer" : "default" }}>
            <path d={d} fill="none" stroke="transparent" strokeWidth={14} />
            <path d={d} fill="none" stroke={color} strokeWidth={sel ? 3.5 : 1.6} />
            <text x={X1 + 8} y={yEtiqueta.get(f.modelo.id)! + 3} fill={sel ? color : tinta} fontSize={sel ? 10 : 8.5} fontWeight={sel ? 700 : 400} fontFamily="JetBrains Mono, monospace">
              {f.modelo.nombre}
              {sel ? ` · ${num(f.acumulado[ANIOS_FLUJO]! / 1e6, 1)} M` : ""}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
