"use client";

import { ZONAS } from "@/dominio/escenario";
import { rutaPx, aPx, type Propuesta } from "@/dominio/portafolios";
import { COLOR_PRIORIDAD_CSS } from "@/componentes/graficos";
import { num, usd } from "@/componentes/ui";

// Gráficos del tablero del portafolio de planta (paso 10.1). Todos comparten el
// «foco»: al pasar sobre una propuesta en cualquiera de ellos (o en la lista) se
// resalta en los demás; al tocarla se abre su detalle.

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const MONO = "JetBrains Mono, monospace";
const TINTA = "#9B9BA1";
const REJILLA = "rgba(237,237,237,0.1)";
const FONDO = "#0E0E10";

/** Color de identidad de cada propuesta: el ejemplo en amarillo, el resto por prioridad. */
export const colorPropuesta = (p: Propuesta) => (p.esEjemplo ? "#FFE14D" : COLOR_PRIORIDAD_CSS[p.prioridad]);

/** Una tecnología, un color (orden fijo; validado contra el fondo oscuro, con etiquetas directas). */
export const COLOR_TECNOLOGIA: Record<string, string> = { T1: "#B88000", T2: "#D92E63", T3: "#27AE62", T4: "#3B9FD4", T5: "#9466F0" };

interface PropsGrafico {
  lista: Propuesta[];
  foco: string | null;
  onFoco: (id: string | null) => void;
  onAbrir: (id: string) => void;
}

const opacidad = (foco: string | null, id: string) => (!foco || foco === id ? 1 : 0.3);
/** Número corto de la propuesta (OT-003 → 3) para marcar puntos y barras. */
const corto = (p: Propuesta) => String(Number(p.codigo.replace(/\D/g, "")) || p.codigo);

/** Mapa de la planta con la tubería de cada propuesta, numerada y coloreada por prioridad. */
export function PlanoPortafolio({ lista, foco, onFoco, onAbrir, alto = 300 }: PropsGrafico & { alto?: number }) {
  const rutas = lista.map((p) => ({ p, r: rutaPx(p) }));
  const xs = rutas.flatMap(({ r }) => r.map((q) => q[0])), ys = rutas.flatMap(({ r }) => r.map((q) => q[1]));
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const ancho = Math.max(Math.max(...xs) - Math.min(...xs) + 160, (Math.max(...ys) - Math.min(...ys) + 120) * (16 / 9));
  const altoV = ancho * (9 / 16);
  const vb = [cx - ancho / 2, cy - altoV / 2, ancho, altoV].map(Math.round);
  const k = ancho / 640;
  const t = (n: number) => n * k;
  // Los de foco se dibujan al final para quedar encima.
  const orden = [...rutas].sort((a, b) => Number(a.p.id === foco || a.p.esEjemplo) - Number(b.p.id === foco || b.p.esEjemplo));
  return (
    <svg viewBox={vb.join(" ")} className="block w-full" style={{ height: alto, background: "#111" }} role="img" aria-label="Ubicación de las propuestas del portafolio en la planta">
      <image href={`${BASE}/planta/satelite.jpg`} x={0} y={0} width={1280} height={900} preserveAspectRatio="none" style={{ filter: "grayscale(1) brightness(0.5) contrast(1.15)" }} />
      {ZONAS.map((z) => (
        <polygon key={z.nombre} points={z.poligono.map(([lng, lat]) => aPx(lng, lat).join(",")).join(" ")} fill="none" stroke="rgba(255,176,0,0.35)" strokeWidth={t(1)} strokeDasharray={`${t(4)} ${t(4)}`} />
      ))}
      {orden.map(({ p, r }) => {
        const color = colorPropuesta(p);
        const puntos = r.map((q) => q.join(",")).join(" ");
        const [fx, fy] = r[0]!;
        const [dx, dy] = r[r.length - 1]!;
        const activo = p.id === foco;
        return (
          <g key={p.id} opacity={opacidad(foco, p.id)} onMouseEnter={() => onFoco(p.id)} onMouseLeave={() => onFoco(null)} onClick={() => onAbrir(p.id)} style={{ cursor: "pointer", transition: "opacity .2s" }}>
            <title>{`${p.codigo} · ${p.titulo}\n${p.fuente.nombre} → ${p.demanda.nombre}\n${num(p.recuperadoMW, 1)} MW · ${usd(p.ahorroUSD)}/año`}</title>
            <polyline points={puntos} fill="none" stroke="transparent" strokeWidth={t(14)} />
            <polyline points={puntos} fill="none" stroke="#0A0A0B" strokeWidth={t(activo ? 8 : 6)} strokeLinejoin="round" opacity={0.6} />
            <polyline points={puntos} fill="none" stroke={color} strokeWidth={t(activo ? 4.5 : 3)} strokeLinejoin="round" strokeDasharray={p.esEjemplo || activo ? `${t(8)} ${t(5)}` : undefined}>
              {p.esEjemplo || activo ? <animate attributeName="stroke-dashoffset" from={t(26)} to="0" dur="0.9s" repeatCount="indefinite" /> : null}
            </polyline>
            <rect x={dx - t(5)} y={dy - t(5)} width={t(10)} height={t(10)} fill="#5AC8FA" stroke="#0A0A0B" strokeWidth={t(1.5)} />
            <circle cx={fx} cy={fy} r={t(11)} fill={color} stroke="#0A0A0B" strokeWidth={t(2)} />
            <text x={fx} y={fy + t(3.5)} fill="#0A0A0B" fontSize={t(10)} fontWeight={700} textAnchor="middle" fontFamily={MONO}>
              {corto(p)}
            </text>
          </g>
        );
      })}
      <g fontFamily={MONO} fontSize={t(9)}>
        <rect x={vb[0]! + t(8)} y={vb[1]! + vb[3]! - t(30)} width={t(218)} height={t(22)} fill="rgba(10,10,11,0.85)" />
        <circle cx={vb[0]! + t(20)} cy={vb[1]! + vb[3]! - t(19)} r={t(5)} fill="#FF8A3D" />
        <text x={vb[0]! + t(30)} y={vb[1]! + vb[3]! - t(16)} fill="#EDEDED">fuente</text>
        <rect x={vb[0]! + t(76)} y={vb[1]! + vb[3]! - t(24)} width={t(9)} height={t(9)} fill="#5AC8FA" />
        <text x={vb[0]! + t(90)} y={vb[1]! + vb[3]! - t(16)} fill="#EDEDED">demanda</text>
        <line x1={vb[0]! + t(146)} x2={vb[0]! + t(166)} y1={vb[1]! + vb[3]! - t(19)} y2={vb[1]! + vb[3]! - t(19)} stroke="#FFE14D" strokeWidth={t(3)} />
        <text x={vb[0]! + t(171)} y={vb[1]! + vb[3]! - t(16)} fill="#EDEDED">tubería</text>
      </g>
    </svg>
  );
}

/** Cascada del aporte a la meta anual: cada propuesta suma sobre la anterior. */
export function CascadaMeta({ lista, foco, onFoco, onAbrir }: PropsGrafico) {
  const W = 420, H = 230, X0 = 34, X1 = W - 8, Y0 = 18, Y1 = H - 34;
  const total = lista.reduce((a, p) => a + p.aporteMeta * 100, 0);
  const max = Math.ceil((total * 1.12) / 10) * 10;
  const py = (v: number) => Y1 - (v / max) * (Y1 - Y0);
  const n = lista.length + 1;
  const paso = (X1 - X0) / n;
  const anchoBarra = Math.min(34, paso - 8);
  let acumulado = 0;
  const marcas = Array.from({ length: max / 10 + 1 }, (_, i) => i * 10);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={`Aporte acumulado a la meta anual: ${num(total, 1)} %`}>
      {marcas.map((v) => (
        <g key={v}>
          <line x1={X0} x2={X1} y1={py(v)} y2={py(v)} stroke={v === 0 ? "rgba(237,237,237,0.4)" : REJILLA} />
          <text x={X0 - 5} y={py(v) + 3} fill={TINTA} fontSize={9} textAnchor="end" fontFamily={MONO}>{v}</text>
        </g>
      ))}
      <text x={X0 - 5} y={Y0 - 7} fill={TINTA} fontSize={8} textAnchor="end" fontFamily={MONO}>%</text>
      {lista.map((p, i) => {
        const v = p.aporteMeta * 100;
        const desde = acumulado;
        acumulado += v;
        const x = X0 + paso * i + (paso - anchoBarra) / 2;
        return (
          <g key={p.id} opacity={opacidad(foco, p.id)} onMouseEnter={() => onFoco(p.id)} onMouseLeave={() => onFoco(null)} onClick={() => onAbrir(p.id)} style={{ cursor: "pointer", transition: "opacity .2s" }}>
            <title>{`${p.codigo} · ${p.titulo}: +${num(v, 2)} % (acumulado ${num(acumulado, 1)} %)`}</title>
            <rect x={X0 + paso * i} y={Y0} width={paso} height={Y1 - Y0} fill="transparent" />
            {i > 0 ? <line x1={x - (paso - anchoBarra)} x2={x} y1={py(desde)} y2={py(desde)} stroke="rgba(237,237,237,0.35)" strokeDasharray="2 2" /> : null}
            <rect x={x} y={py(acumulado)} width={anchoBarra} height={Math.max(2, py(desde) - py(acumulado))} rx={2} fill={colorPropuesta(p)} />
            <text x={x + anchoBarra / 2} y={py(acumulado) - 4} fill="#EDEDED" fontSize={9} textAnchor="middle" fontFamily={MONO}>+{num(v, 1)}</text>
            <text x={x + anchoBarra / 2} y={Y1 + 13} fill={p.id === foco ? "#fff" : TINTA} fontSize={9} textAnchor="middle" fontFamily={MONO}>{corto(p)}</text>
          </g>
        );
      })}
      {(() => {
        const x = X0 + paso * lista.length + (paso - anchoBarra) / 2;
        return (
          <g>
            <rect x={x} y={py(total)} width={anchoBarra} height={py(0) - py(total)} rx={2} fill="rgba(237,237,237,0.85)" />
            <text x={x + anchoBarra / 2} y={py(total) - 4} fill="#fff" fontSize={10} fontWeight={700} textAnchor="middle" fontFamily={MONO}>{num(total, 1)}</text>
            <text x={x + anchoBarra / 2} y={Y1 + 13} fill="#fff" fontSize={9} textAnchor="middle" fontFamily={MONO}>total</text>
          </g>
        );
      })()}
      <text x={X0} y={H - 4} fill={TINTA} fontSize={8.5} fontFamily="IBM Plex Sans, sans-serif">Propuestas en orden de prioridad · % de la meta anual (1,75 PJ)</text>
    </svg>
  );
}

/** Matriz inversión vs. ahorro: el tamaño es el calor recuperado; las diagonales, el retorno. */
export function MatrizInversion({ lista, foco, onFoco, onAbrir }: PropsGrafico) {
  const W = 420, H = 230, X0 = 40, X1 = W - 12, Y0 = 14, Y1 = H - 34;
  const maxX = Math.ceil(Math.max(...lista.map((p) => p.capexUSD / 1e6)) * 1.15);
  const maxY = Math.ceil(Math.max(...lista.map((p) => p.ahorroUSD / 1e6)) * 1.2 * 2) / 2;
  const px = (v: number) => X0 + (v / maxX) * (X1 - X0);
  const py = (v: number) => Y1 - (v / maxY) * (Y1 - Y0);
  const maxMW = Math.max(...lista.map((p) => p.recuperadoMW));
  const radio = (mw: number) => 5 + 13 * Math.sqrt(mw / maxMW);
  const ejeX = Array.from({ length: Math.floor(maxX) + 1 }, (_, i) => i).filter((v) => maxX <= 6 || v % 2 === 0);
  const ejeY = Array.from({ length: Math.floor(maxY / 0.5) + 1 }, (_, i) => i * 0.5).filter((v) => maxY <= 3 || v % 1 === 0);
  // Diagonales de retorno: ahorro = inversión ÷ años.
  const diagonales = [1, 2, 4].map((a) => {
    const xFin = Math.min(maxX, maxY * a);
    return { a, x2: px(xFin), y2: py(xFin / a) };
  });
  const orden = [...lista].sort((a, b) => b.recuperadoMW - a.recuperadoMW);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="Inversión estimada frente a ahorro anual por propuesta">
      {ejeX.map((v) => (
        <g key={`x${v}`}>
          <line x1={px(v)} x2={px(v)} y1={Y0} y2={Y1} stroke={v === 0 ? "rgba(237,237,237,0.4)" : REJILLA} />
          <text x={px(v)} y={Y1 + 12} fill={TINTA} fontSize={9} textAnchor="middle" fontFamily={MONO}>{v}</text>
        </g>
      ))}
      {ejeY.map((v) => (
        <g key={`y${v}`}>
          <line x1={X0} x2={X1} y1={py(v)} y2={py(v)} stroke={v === 0 ? "rgba(237,237,237,0.4)" : REJILLA} />
          <text x={X0 - 5} y={py(v) + 3} fill={TINTA} fontSize={9} textAnchor="end" fontFamily={MONO}>{num(v, v % 1 ? 1 : 0)}</text>
        </g>
      ))}
      {diagonales.map((d) => (
        <g key={d.a}>
          <line x1={px(0)} y1={py(0)} x2={d.x2} y2={d.y2} stroke="rgba(237,237,237,0.3)" strokeDasharray="3 3" />
          <text x={d.x2 - 3} y={d.y2 + (d.y2 < Y0 + 8 ? 11 : -4)} fill={TINTA} fontSize={8.5} textAnchor="end" fontFamily={MONO}>{d.a} año{d.a > 1 ? "s" : ""}</text>
        </g>
      ))}
      {orden.map((p) => {
        const x = px(p.capexUSD / 1e6), y = py(p.ahorroUSD / 1e6), r = radio(p.recuperadoMW);
        return (
          <g key={p.id} opacity={opacidad(foco, p.id)} onMouseEnter={() => onFoco(p.id)} onMouseLeave={() => onFoco(null)} onClick={() => onAbrir(p.id)} style={{ cursor: "pointer", transition: "opacity .2s" }}>
            <title>{`${p.codigo} · ${p.titulo}\nInversión ${usd(p.capexUSD)} · ahorro ${usd(p.ahorroUSD)}/año\n${num(p.recuperadoMW, 1)} MW recuperados`}</title>
            <circle cx={x} cy={y} r={r} fill={colorPropuesta(p)} fillOpacity={0.75} stroke={FONDO} strokeWidth={2} />
            {p.id === foco ? <circle cx={x} cy={y} r={r + 3} fill="none" stroke="#fff" strokeWidth={1.5} /> : null}
            <text x={x} y={y + 3} fill="#0A0A0B" fontSize={9} fontWeight={700} textAnchor="middle" fontFamily={MONO}>{corto(p)}</text>
          </g>
        );
      })}
      <text x={X1} y={H - 6} fill={TINTA} fontSize={8.5} textAnchor="end" fontFamily="IBM Plex Sans, sans-serif">Inversión (USD M) →</text>
      <text x={X0 + 4} y={Y0 + 8} fill={TINTA} fontSize={8.5} fontFamily="IBM Plex Sans, sans-serif">↑ Ahorro (USD M/año)</text>
    </svg>
  );
}

/** Dona del ahorro anual por tecnología, con leyenda y valores directos. */
export function DonaTecnologia({ lista }: { lista: Propuesta[] }) {
  const grupos = Object.values(
    lista.reduce<Record<string, { id: string; nombre: string; ahorro: number; mw: number; n: number }>>((a, p) => {
      const g = (a[p.tecnologia.id] ??= { id: p.tecnologia.id, nombre: p.tecnologia.nombre, ahorro: 0, mw: 0, n: 0 });
      g.ahorro += p.ahorroUSD;
      g.mw += p.recuperadoMW;
      g.n += 1;
      return a;
    }, {}),
  ).sort((a, b) => a.id.localeCompare(b.id));
  const total = grupos.reduce((a, g) => a + g.ahorro, 0);
  const R = 62, r = 40, C = 74;
  let angulo = -Math.PI / 2;
  const arco = (a0: number, a1: number) => {
    const p = (rad: number, a: number) => `${C + rad * Math.cos(a)},${C + rad * Math.sin(a)}`;
    const grande = a1 - a0 > Math.PI ? 1 : 0;
    return `M${p(R, a0)} A${R},${R} 0 ${grande} 1 ${p(R, a1)} L${p(r, a1)} A${r},${r} 0 ${grande} 0 ${p(r, a0)} Z`;
  };
  return (
    <div className="flex items-center gap-3">
      <svg viewBox={`0 0 ${C * 2} ${C * 2}`} className="h-[170px] w-[170px] shrink-0" role="img" aria-label="Ahorro anual por tecnología">
        {grupos.map((g) => {
          const a0 = angulo, a1 = angulo + (g.ahorro / total) * Math.PI * 2;
          angulo = a1;
          return (
            <path key={g.id} d={grupos.length === 1 ? arco(a0, a1 - 0.0001) : arco(a0, a1)} fill={COLOR_TECNOLOGIA[g.id] ?? "#828288"} stroke={FONDO} strokeWidth={2}>
              <title>{`${g.nombre}: ${usd(g.ahorro)}/año (${num((g.ahorro / total) * 100, 0)} %)`}</title>
            </path>
          );
        })}
        <text x={C} y={C - 2} fill="#fff" fontSize={14} fontWeight={700} textAnchor="middle" fontFamily={MONO}>{num(total / 1e6, 1)} M</text>
        <text x={C} y={C + 12} fill={TINTA} fontSize={8.5} textAnchor="middle" fontFamily={MONO}>USD/año</text>
      </svg>
      <ul className="flex min-w-0 max-w-xs flex-1 flex-col gap-1.5 text-[10.5px]">
        {grupos.map((g) => (
          <li key={g.id} className="grid grid-cols-[0.6rem_1fr_auto] items-center gap-1.5">
            <span className="h-2.5 w-2.5" style={{ background: COLOR_TECNOLOGIA[g.id] ?? "#828288" }} />
            <span className="min-w-0 truncate text-[#C8C8CC]">
              {g.nombre} <span className="text-[#5E5E66]">· {g.n}</span>
            </span>
            <span className="cifra-tabular text-white">{num((g.ahorro / total) * 100, 0)} %</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Reparto por prioridad: cuántas propuestas y cuánto calor en cada nivel. */
export function BarraPrioridad({ lista }: { lista: Propuesta[] }) {
  const niveles = (["P1", "P2", "P3", "P4"] as const).map((n) => ({ n, items: lista.filter((p) => p.prioridad === n) })).filter((g) => g.items.length);
  const total = lista.reduce((a, p) => a + p.recuperadoMW, 0);
  const nombre = { P1: "Muy alta", P2: "Alta", P3: "Media", P4: "Baja" } as const;
  return (
    <div>
      <div className="flex h-3 w-full gap-[2px]">
        {niveles.map((g) => {
          const mw = g.items.reduce((a, p) => a + p.recuperadoMW, 0);
          return <span key={g.n} title={`${nombre[g.n]}: ${g.items.length} propuestas · ${num(mw, 1)} MW`} className="h-3 rounded-[2px]" style={{ width: `${(mw / total) * 100}%`, background: COLOR_PRIORIDAD_CSS[g.n] }} />;
        })}
      </div>
      <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-[#9B9BA1]">
        {niveles.map((g) => (
          <li key={g.n} className="flex items-center gap-1">
            <span className="h-2 w-2" style={{ background: COLOR_PRIORIDAD_CSS[g.n] }} />
            {g.n} {nombre[g.n].toLowerCase()} · <b className="cifra-tabular font-normal text-white">{g.items.length}</b> · {num(g.items.reduce((a, p) => a + p.recuperadoMW, 0), 1)} MW
          </li>
        ))}
      </ul>
    </div>
  );
}
