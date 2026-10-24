"use client";

import { DEMANDAS, FUENTES, NOMBRE_CRITERIO8, PESOS, type Criterio8 } from "@/dominio/escenario";
import type { EstadoPar, Oportunidad, Par } from "@/dominio/motor";
import { COLOR, cssTemperatura, num } from "@/componentes/ui";

// Gráficos SVG livianos de la vitrina (sin librerías): radar de 8 criterios,
// barras, matriz de cruce 8×7, matriz de prioridad y serie de tiempo.

export const COLOR_PAR: Record<EstadoPar, string> = { COMPATIBLE: COLOR.verde, CONDICIONADO: COLOR.amarillo, DESCARTADO: "#3A3A40" };
export const COLOR_PRIORIDAD_CSS = { P1: COLOR.verde, P2: COLOR.teal, P3: COLOR.naranja, P4: "#828288" } as const;

export function Radar({ puntajes, tamano = 220 }: { puntajes: Record<Criterio8, number>; tamano?: number }) {
  const ejes = Object.keys(PESOS) as Criterio8[];
  const c = tamano / 2;
  const r = c - 42;
  const punto = (i: number, v: number) => {
    const a = -Math.PI / 2 + (i / ejes.length) * Math.PI * 2;
    return [c + Math.cos(a) * r * (v / 5), c + Math.sin(a) * r * (v / 5)] as const;
  };
  const poligono = ejes.map((k, i) => punto(i, puntajes[k]).join(",")).join(" ");
  return (
    <svg viewBox={`0 0 ${tamano} ${tamano}`} className="w-full" role="img" aria-label="Perfil de 8 criterios">
      {[1, 2, 3, 4, 5].map((n) => (
        <polygon key={n} points={ejes.map((_, i) => punto(i, n).join(",")).join(" ")} fill="none" stroke="rgba(255,255,255,0.09)" />
      ))}
      {ejes.map((k, i) => {
        const [x, y] = punto(i, 5);
        const [lx, ly] = punto(i, 6.3);
        return (
          <g key={k}>
            <line x1={c} y1={c} x2={x} y2={y} stroke="rgba(255,255,255,0.09)" />
            <text x={lx} y={ly} fontSize={9.5} fill={COLOR.texto2} textAnchor="middle" dominantBaseline="middle">
              {NOMBRE_CRITERIO8[k]}
            </text>
          </g>
        );
      })}
      <polygon points={poligono} fill="rgba(255,176,0,0.28)" stroke={COLOR.teal} strokeWidth={2} className="transition-all duration-500" />
      {ejes.map((k, i) => {
        const [x, y] = punto(i, puntajes[k]);
        return <circle key={k} cx={x} cy={y} r={3} fill={COLOR.lima} />;
      })}
    </svg>
  );
}

export function Barras({ filas, formato, maximo }: { filas: Array<{ id: string; etiqueta: string; valor: number; color: string; resaltar?: boolean; onClick?: () => void; nota?: string }>; formato: (n: number) => string; maximo?: number }) {
  const max = maximo ?? Math.max(...filas.map((f) => Math.abs(f.valor)), 1);
  return (
    <ul className="flex flex-col gap-1.5">
      {filas.map((f) => (
        <li key={f.id}>
          <button type="button" onClick={f.onClick} disabled={!f.onClick} className={`w-full rounded-[2px] px-1.5 py-1 text-left transition ${f.resaltar ? "bg-white/10 ring-1 ring-[#FFE14D]/70" : f.onClick ? "hover:bg-white/5" : ""}`}>
            <span className="flex items-baseline justify-between gap-2 text-[11px]">
              <span className={f.resaltar ? "font-semibold text-white" : "text-[#C8C8CC]"}>{f.etiqueta}</span>
              <span className="cifra-tabular text-white">{formato(f.valor)}</span>
            </span>
            <span className="mt-1 block h-1.5 rounded-full bg-white/10">
              <span className="block h-1.5 rounded-full transition-all duration-500" style={{ width: `${Math.max(2, (Math.max(0, f.valor) / max) * 100)}%`, background: f.color }} />
            </span>
            {f.nota ? <span className="mt-0.5 block text-[10px] text-[#9B9BA1]">{f.nota}</span> : null}
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Matriz de cruce: filas = fuentes, columnas = demandas; cada celda es un par. */
export function MatrizCruce({ pares, seleccion, onSel }: { pares: Par[]; seleccion: string | null; onSel: (id: string) => void }) {
  const mapa = new Map(pares.map((p) => [p.id, p]));
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-[3px] text-[10px]">
        <thead>
          <tr>
            <th />
            {DEMANDAS.map((d) => (
              <th key={d.id} className="font-semibold text-[#5AC8FA]" title={d.nombre}>
                {d.id}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FUENTES.map((f) => (
            <tr key={f.id}>
              <th className="pr-1 text-left font-semibold" style={{ color: cssTemperatura(f.tMax) }} title={f.nombre}>
                {f.id}
              </th>
              {DEMANDAS.map((d) => {
                const p = mapa.get(`${f.id}-${d.id}`)!;
                const sel = p.id === seleccion;
                return (
                  <td key={d.id} className="p-0">
                    <button
                      type="button"
                      onClick={() => onSel(p.id)}
                      title={`${f.id} → ${d.id}: ${p.estado.toLowerCase()}`}
                      className={`block h-5 w-full rounded-[4px] transition ${sel ? "ring-2 ring-white" : "hover:brightness-125"}`}
                      style={{ background: COLOR_PAR[p.estado], opacity: p.estado === "DESCARTADO" ? 0.55 : 0.9 }}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Matriz de prioridad: mitad técnica (x) contra mitad económica (y) del puntaje,
 * ambas de 1 a 5. Como puntaje = (x + y) / 2, los cortes de prioridad (4,2 · 3,5 ·
 * 2,8) son diagonales: el color de cada punto siempre coincide con su franja.
 */
export function MatrizPrioridad({ cartera, seleccion, onSel }: { cartera: Oportunidad[]; seleccion: string | null; onSel: (id: string) => void }) {
  const MIN = 1.8;
  const MAX = 5.15;
  const X0 = 16, X1 = 214, Y0 = 6, Y1 = 166;
  const px = (v: number) => X0 + ((v - MIN) / (MAX - MIN)) * (X1 - X0);
  const py = (v: number) => Y1 - ((v - MIN) / (MAX - MIN)) * (Y1 - Y0);
  // Franja con puntaje ≥ corte: polígono del cuadro por encima de la recta x + y = 2·corte.
  const franja = (corte: number) => {
    const s = 2 * corte;
    const pts: Array<[number, number]> = [];
    const esq: Array<[number, number]> = [[MIN, MAX], [MAX, MAX], [MAX, MIN], [MIN, MIN]];
    // Recorre el borde del cuadro y se queda con lo que está sobre la recta, más los cortes.
    for (let i = 0; i < 4; i++) {
      const a = esq[i]!, b = esq[(i + 1) % 4]!;
      const fa = a[0] + a[1] - s, fb = b[0] + b[1] - s;
      if (fa >= 0) pts.push(a);
      if ((fa >= 0) !== (fb >= 0)) {
        const t = fa / (fa - fb);
        pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      }
    }
    return pts.map(([x, y]) => `${px(x)},${py(y)}`).join(" ");
  };
  const franjas = [
    { corte: 0, t: "P4 · Evaluar después", c: "#828288", lx: 2.05, ly: 2.05 },
    { corte: 2.8, t: "P3 · Mantener", c: COLOR.naranja, lx: 2.05, ly: 3.75 },
    { corte: 3.5, t: "P2 · Prefactibilidad", c: COLOR.teal, lx: 2.6, ly: 4.65 },
    { corte: 4.2, t: "P1 · Piloto prioritario", c: COLOR.verde, lx: 3.62, ly: 5.0 },
  ];
  return (
    <svg viewBox="0 0 220 186" className="w-full" role="img" aria-label="Matriz de prioridad">
      {franjas.map((f) => (
        <polygon key={f.t} points={franja(f.corte)} fill={f.c} fillOpacity={0.09} stroke={f.c} strokeOpacity={0.35} strokeWidth={0.6} />
      ))}
      {franjas.map((f) => (
        <text key={`t${f.t}`} x={px(f.lx)} y={py(f.ly)} fontSize={6.5} fill={f.c} fontWeight={600}>
          {f.t}
        </text>
      ))}
      {cartera.map((o) => {
        const id = `${o.fuente.id}-${o.demanda.id}`;
        const sel = id === seleccion;
        const cx = px(o.x);
        const cy = py(o.y);
        return (
          <g key={o.codigo} onClick={() => onSel(id)} className="cursor-pointer">
            <circle cx={cx} cy={cy} r={sel ? 6.5 : 3.5 + Math.min(3, o.qUtil * 0.6)} fill={COLOR_PRIORIDAD_CSS[o.prioridad]} fillOpacity={0.92} stroke="#fff" strokeWidth={sel ? 1.8 : 0.6} />
            <text x={cx} y={cy + 2.2} fontSize={5.5} fill="#0A0A0B" fontWeight={700} textAnchor="middle">
              {Number(o.codigo.slice(3))}
            </text>
          </g>
        );
      })}
      <text x={(X0 + X1) / 2} y={182} fontSize={7} fill={COLOR.texto2} textAnchor="middle">
        Viabilidad técnica →
      </text>
      <text x={6} y={(Y0 + Y1) / 2} fontSize={7} fill={COLOR.texto2} textAnchor="middle" transform={`rotate(-90 6 ${(Y0 + Y1) / 2})`}>
        Valor económico →
      </text>
    </svg>
  );
}

/**
 * Flujo de caja acumulado de la refinería por modelo de negocio (años 0–5).
 * El modelo elegido se resalta; los demás quedan de fondo y se pueden tocar.
 */
export function FlujoCaja({ series, seleccion, onSel }: { series: Array<{ id: string; nombre: string; valores: number[] }>; seleccion: string; onSel: (id: string) => void }) {
  const todos = series.flatMap((s) => s.valores);
  const min = Math.min(0, ...todos);
  const max = Math.max(...todos, 1);
  const X0 = 34, X1 = 214, Y0 = 8, Y1 = 128;
  const px = (anio: number) => X0 + (anio / 5) * (X1 - X0);
  const py = (v: number) => Y1 - ((v - min) / (max - min)) * (Y1 - Y0);
  const millones = (v: number) => `${num(v / 1e6, Math.abs(v) < 1e6 ? 1 : 0)}`;
  const orden = [...series].sort((a, b) => (a.id === seleccion ? 1 : b.id === seleccion ? -1 : 0));
  const elegida = series.find((s) => s.id === seleccion);
  return (
    <div className="flex flex-col gap-2">
      <svg viewBox="0 0 222 146" className="w-full" role="img" aria-label="Flujo de caja acumulado por modelo">
        {[min, 0, max].map((v, i) => (
          <g key={i}>
            <line x1={X0} x2={X1} y1={py(v)} y2={py(v)} stroke={v === 0 ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.08)"} strokeDasharray={v === 0 ? undefined : "2 3"} />
            <text x={X0 - 4} y={py(v) + 3} fontSize={7} fill={COLOR.texto2} textAnchor="end">
              {millones(v)}
            </text>
          </g>
        ))}
        {[0, 1, 2, 3, 4, 5].map((a) => (
          <text key={a} x={px(a)} y={140} fontSize={7} fill={COLOR.texto3} textAnchor="middle">
            año {a}
          </text>
        ))}
        <text x={4} y={py(max) + 3} fontSize={6.5} fill={COLOR.texto3}>
          USD M
        </text>
        {orden.map((s) => {
          const sel = s.id === seleccion;
          const puntos = s.valores.map((v, a) => `${px(a)},${py(v)}`).join(" ");
          return (
            <g key={s.id} onClick={() => onSel(s.id)} className="cursor-pointer">
              {/* Trazo ancho e invisible para que la curva sea fácil de tocar. */}
              <polyline points={puntos} fill="none" stroke="transparent" strokeWidth={9} />
              <polyline points={puntos} fill="none" stroke={sel ? COLOR.lima : "rgba(237,237,237,0.28)"} strokeWidth={sel ? 2.4 : 1} className="transition-all duration-300" />
              {sel ? s.valores.map((v, a) => <rect key={a} x={px(a) - 2} y={py(v) - 2} width={4} height={4} fill={COLOR.lima} />) : null}
            </g>
          );
        })}
        {elegida ? (
          <text x={X1} y={py(elegida.valores[5]!) - 5} fontSize={7.5} fill={COLOR.lima} textAnchor="end" fontWeight={700}>
            {elegida.nombre} · {millones(elegida.valores[5]!)} M
          </text>
        ) : null}
      </svg>
      <div className="flex flex-wrap gap-1">
        {series.map((s) => (
          <button key={s.id} type="button" onClick={() => onSel(s.id)} className={`hud border px-1.5 py-0.5 text-[9px] ${s.id === seleccion ? "border-[#FFE14D] text-[#FFE14D]" : "border-white/15 text-[#9B9BA1] hover:text-white"}`}>
            {s.nombre}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Serie({ valores, color, referencia }: { valores: number[]; color: string; referencia?: number }) {
  const lista = referencia !== undefined ? [...valores, referencia] : valores;
  const min = Math.min(...lista) * 0.97;
  const max = Math.max(...lista) * 1.03;
  const y = (v: number) => 40 - ((v - min) / (max - min || 1)) * 36;
  const puntos = valores.map((v, i) => `${(i / (valores.length - 1)) * 200},${y(v)}`).join(" ");
  return (
    <svg viewBox="0 0 200 42" className="h-10 w-full" preserveAspectRatio="none" aria-hidden>
      {referencia !== undefined ? <line x1={0} x2={200} y1={y(referencia)} y2={y(referencia)} stroke="rgba(255,255,255,0.35)" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" /> : null}
      <polyline points={puntos} fill="none" stroke={color} strokeWidth={1.8} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Termómetro de un par: rango de la fuente, punto de la demanda y el salto que cubre la tecnología. */
export function SaltoTemperatura({ tMin, tMax, tReq }: { tMin: number; tMax: number; tReq: number }) {
  const x = (t: number) => 14 + (t / 320) * 272;
  const sube = tReq > tMax;
  return (
    <svg viewBox="0 0 300 64" className="w-full" role="img" aria-label="Salto de temperatura">
      <defs>
        <linearGradient id="vt-escala" x1="0" x2="1">
          {[0, 60, 110, 170, 240, 320].map((t) => (
            <stop key={t} offset={t / 320} stopColor={cssTemperatura(t)} />
          ))}
        </linearGradient>
      </defs>
      <rect x={14} y={30} width={272} height={6} rx={3} fill="url(#vt-escala)" opacity={0.35} />
      <rect x={x(tMin)} y={27} width={Math.max(4, x(tMax) - x(tMin))} height={12} rx={4} fill={cssTemperatura(tMax)} stroke="#fff" strokeWidth={1.2} />
      <text x={(x(tMin) + x(tMax)) / 2} y={20} fontSize={9} fill="#fff" textAnchor="middle">
        fuente {tMin}–{tMax} °C
      </text>
      <circle cx={x(tReq)} cy={33} r={6} fill={COLOR.azul} stroke="#fff" strokeWidth={1.5} />
      <text x={x(tReq)} y={56} fontSize={9} fill={COLOR.azul} textAnchor="middle">
        demanda {tReq} °C
      </text>
      {/* Flecha del salto: hacia abajo la temperatura baja sola; hacia arriba la eleva una bomba de calor. */}
      <line x1={x(tMax)} y1={33} x2={x(tReq) + (sube ? -8 : 8)} y2={33} stroke={sube ? COLOR.magenta : COLOR.lima} strokeWidth={2} strokeDasharray="4 3" />
      {[0, 100, 200, 300].map((t) => (
        <text key={t} x={x(t)} y={47} fontSize={7} fill={COLOR.texto3} textAnchor="middle">
          {num(t)}°
        </text>
      ))}
    </svg>
  );
}
