"use client";

import { useEffect, useMemo, useState } from "react";
import {
  COSTO_CALOR_CONSERVADOR,
  DEMANDAS,
  FUENTES,
  HABILITADORES,
  META_RETO,
  MODELOS,
  NOMBRE_CRITERIO8,
  PESOS,
  SECCIONES_INTERMEDIO,
  SUPUESTOS_INICIALES,
  TECNOLOGIAS,
  fraccionMeta,
  pjAnioPorMW,
  type Criterio8,
  type IdPaso,
  type Supuestos,
  type Zona,
} from "@/dominio/escenario";
import { CALOR_RESIDUAL_MW, SECCIONES_PILOTO, ajusteTecnologia, evaluar, type EstadoCriterio, type Oportunidad, type Par, type ProyectoPiloto } from "@/dominio/motor";
import { Barras, COLOR_PAR, FlujoCaja, COLOR_PRIORIDAD_CSS, MatrizCruce, MatrizPrioridad, Radar, SaltoTemperatura, Serie } from "@/componentes/graficos";
import { PALETAS, type PaletaCalor } from "@/componentes/mapa/MapaTermico";
import { BarraTemperatura, COLOR, ChipOrigen, anios, cssTemperatura, mw, num, usd } from "@/componentes/ui";

// Panel contextual de cada paso: lo que explica los datos del ejemplo y deja
// interactuar (paleta del mapa térmico, par del cruce, tecnología, modelo,
// supuestos). Se usa en el panel derecho del escritorio y en la tarjeta del celular.

export interface ContextoPanel {
  paso: IdPaso;
  pares: Par[];
  parSeleccionado: string | null;
  onPar: (id: string) => void;
  /** Toma el par como oportunidad y sigue al paso de tecnología. */
  onEvaluarPar: (id: string) => void;
  op: Oportunidad;
  onTecnologia: (id: string) => void;
  onModelo: (id: string) => void;
  supuestos: Supuestos;
  onSupuestos: (s: Supuestos) => void;
  /** Proyectos del piloto (suman la meta) y todos los proyectos de la sección. */
  cartera: ProyectoPiloto[];
  candidatos: ProyectoPiloto[];
  seccion: Zona;
  onSeccion: (z: Zona) => void;
  metaPiloto: number;
  onMetaPiloto: (mw: number) => void;
  /** Abre la sección «Supuestos y fuentes». */
  onFuentes: () => void;
  paleta: PaletaCalor;
  onPaleta: (p: PaletaCalor) => void;
  intensidad: number;
  onIntensidad: (n: number) => void;
}

const COLOR_CRITERIO: Record<EstadoCriterio, string> = { CUMPLE: COLOR.verde, CONDICION: COLOR.amarillo, INCUMPLE: COLOR.rojo };
const TEXTO_CRITERIO: Record<EstadoCriterio, string> = { CUMPLE: "cumple", CONDICION: "con condición", INCUMPLE: "no cumple" };

function Titulo({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-white">{children}</h3>
      {sub ? <p className="text-[11px] text-[#9B9BA1]">{sub}</p> : null}
    </div>
  );
}

function Cifra({ etiqueta, valor, color = "#fff", origen = "ESTIMADO" as const }: { etiqueta: string; valor: string; color?: string; origen?: "MEDIDO" | "DECLARADO" | "ESTIMADO" }) {
  return (
    <div className="rounded-[2px] border border-white/10 bg-white/5 p-2">
      <p className="text-[10px] text-[#9B9BA1]">{etiqueta}</p>
      <p className="cifra-tabular text-base font-semibold leading-tight" style={{ color }}>
        {valor}
      </p>
      <ChipOrigen origen={origen} mini />
    </div>
  );
}

function ParCabecera({ op }: { op: Oportunidad }) {
  return (
    <div className="flex items-center gap-2 rounded-[2px] border border-[#FFE14D]/40 bg-[#FFE14D]/5 p-2 text-xs">
      <span className="rounded px-1.5 py-0.5 font-semibold text-[#0A0A0B]" style={{ background: cssTemperatura(op.fuente.tMax) }}>
        {op.fuente.id}
      </span>
      <span className="min-w-0 flex-1 truncate text-white">{op.fuente.nombre}</span>
      <span className="text-[#FFE14D]">→</span>
      <span className="rounded bg-[#5AC8FA] px-1.5 py-0.5 font-semibold text-[#0A0A0B]">{op.demanda.id}</span>
      <span className="min-w-0 flex-1 truncate text-white">{op.demanda.nombre}</span>
    </div>
  );
}

function Deslizador({ etiqueta, valor, min, max, paso, formato, onCambio }: { etiqueta: string; valor: number; min: number; max: number; paso: number; formato: (n: number) => string; onCambio: (n: number) => void }) {
  return (
    <label className="flex flex-col gap-1 text-[11px]">
      <span className="flex justify-between text-[#9B9BA1]">
        {etiqueta}
        <span className="cifra-tabular text-white">{formato(valor)}</span>
      </span>
      <input type="range" min={min} max={max} step={paso} value={valor} onChange={(e) => onCambio(Number(e.target.value))} className="vt-rango" />
    </label>
  );
}

/** Enlace a la sección «Supuestos y fuentes». */
function VerFuentes({ onFuentes, texto = "Ver supuestos y fuentes" }: { onFuentes: () => void; texto?: string }) {
  return (
    <button type="button" onClick={onFuentes} className="hud w-fit text-[10px] text-[#FFB000] underline-offset-2 hover:text-white hover:underline">
      ⓘ {texto}
    </button>
  );
}

/** 1 · El reto: la meta de la refinería y la escala de un piloto. */
function PanelReto({ onFuentes }: { onFuentes: () => void }) {
  const horas = SUPUESTOS_INICIALES.horas;
  return (
    <div className="flex flex-col gap-3">
      <div className="visor p-3 text-xs">
        <p className="hud text-[9px] text-[#FFB000]">Meta fijada por la refinería</p>
        <p className="cifra-tabular text-2xl font-semibold leading-tight text-white">
          {META_RETO.pj} PJ <span className="text-sm font-normal text-[#9B9BA1]">de ahorro térmico en {META_RETO.anios} años</span>
        </p>
        <p className="mt-1 text-[11px] text-[#9B9BA1]">
          ≈ {num(META_RETO.pjAnio, 2)} PJ/año ≈ {META_RETO.mwPromedio} MW térmicos sostenidos durante {num(horas)} h
        </p>
      </div>
      <div className="rounded-[2px] border border-white/10 bg-white/5 p-3 text-xs">
        <p className="hud text-[9px] text-[#9B9BA1]">Unidad de escala del piloto</p>
        <p className="cifra-tabular mt-1 text-base font-semibold text-white">
          1 MW recuperado <span className="text-[#FFB000]">≈ {num(fraccionMeta(1, horas) * 100, 1)} %</span> <span className="text-xs font-normal text-[#9B9BA1]">de la meta anual</span>
        </p>
        <p className="mt-1 text-[11px] text-[#9B9BA1]">
          1 MW × {num(horas)} h = {num(horas)} MWh/año ≈ {num(pjAnioPorMW(horas), 3)} PJ. Una meta de piloto del 1 % al 2 % equivale a {num((0.01 * META_RETO.pjAnio) / pjAnioPorMW(horas), 1)}–{num((0.02 * META_RETO.pjAnio) / pjAnioPorMW(horas), 1)} MW.
        </p>
      </div>
      <div className="flex flex-col gap-1.5 text-xs">
        <p className="hud text-[9px] text-[#9B9BA1]">Qué ofrece Calor Rescatado</p>
        {[
          ["Servicio de consultoría especializada", "con software propio para consolidar y analizar los datos térmicos de la planta."],
          ["Portafolio documentado", "de proyectos de uso del calor, con indicadores estimados y respaldo técnico y bibliográfico."],
          ["Decisión de la refinería", "sus ingenieros revisan el portafolio y aprueban qué proyectos ejecutar."],
        ].map(([t, d]) => (
          <p key={t} className="border-l-2 border-[#FF5A1F] pl-2 text-[#C8C8CC]">
            <b className="text-white">{t}</b> {d}
          </p>
        ))}
      </div>
      <p className="text-[11px] text-[#9B9BA1]">
        El servicio aporta a la meta, pero no la garantiza: la meta es de la refinería y cada proyecto depende de sus datos reales y de su aprobación.
      </p>
      <VerFuentes onFuentes={onFuentes} />
    </div>
  );
}

/** 2 · Inventario: fuentes y demandas caracterizadas. */
function PanelInventario({ onPunto, seleccion }: { onPunto: (id: string) => void; seleccion: string | null }) {
  const [tab, setTab] = useState<"F" | "D">("F");
  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-[2px] border border-white/10 bg-white/5 p-2 text-[11px] text-[#C8C8CC]">
        <p className="hud mb-1 text-[9px] text-[#FFB000]">Datos que entrega la refinería</p>
        Fuentes con calor sobrante y consumidores potenciales: temperatura, potencia, continuidad y ubicación. Se consolidan con acceso restringido y se tratan como confidenciales.
        <span className="mt-1 block text-[#F5C518]">Este inventario es un ejemplo ilustrativo, no datos de la planta.</span>
      </div>
      <div className="grid grid-cols-2 overflow-hidden rounded-[2px] border border-white/15 text-xs">
        {(["F", "D"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`px-2 py-1.5 ${tab === t ? (t === "F" ? "bg-[#FF5A1F] font-semibold text-[#0A0A0B]" : "bg-[#5AC8FA] font-semibold text-[#0A0A0B]") : "text-[#9B9BA1]"}`}>
            {t === "F" ? `Fuentes (${FUENTES.length})` : `Demandas (${DEMANDAS.length})`}
          </button>
        ))}
      </div>
      <ul className="flex flex-col gap-1.5">
        {tab === "F"
          ? FUENTES.map((f) => (
              <li key={f.id}>
                <button type="button" onClick={() => onPunto(f.id)} className={`w-full rounded-[2px] border px-2 py-1.5 text-left ${seleccion === f.id ? "border-[#FF5A1F] bg-[#FF5A1F]/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
                  <span className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate text-white">
                      <b style={{ color: cssTemperatura(f.tMax) }}>{f.id}</b> {f.nombre}
                    </span>
                    <span className="cifra-tabular shrink-0 text-[#9B9BA1]">{f.potencia} MW</span>
                  </span>
                  <span className="mt-1.5 block">
                    <BarraTemperatura tMin={f.tMin} tMax={f.tMax} alto={5} />
                  </span>
                  <span className="mt-1 flex items-center justify-between text-[10px] text-[#9B9BA1]">
                    <span>
                      {f.tMin}–{f.tMax} °C · continuidad <span style={{ color: f.continuidad === "Alta" ? COLOR.verde : f.continuidad === "Media" ? COLOR.amarillo : COLOR.rojo }}>{f.continuidad.toLowerCase()}</span>
                    </span>
                    <ChipOrigen origen={f.origen} mini />
                  </span>
                </button>
              </li>
            ))
          : DEMANDAS.map((d) => (
              <li key={d.id}>
                <button type="button" onClick={() => onPunto(d.id)} className={`w-full rounded-[2px] border px-2 py-1.5 text-left ${seleccion === d.id ? "border-[#5AC8FA] bg-[#5AC8FA]/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
                  <span className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate text-white">
                      <b className="text-[#5AC8FA]">{d.id}</b> {d.nombre}
                    </span>
                    <span className="cifra-tabular shrink-0 text-[#9B9BA1]">{d.potencia} MW</span>
                  </span>
                  <span className="mt-1.5 block">
                    <BarraTemperatura punto={d.tReq} alto={5} />
                  </span>
                  <span className="mt-1 flex items-center justify-between text-[10px] text-[#9B9BA1]">
                    <span>
                      {d.tipo === "FRIO" ? "Frío" : d.tipo === "CALOR" ? "Calor" : "Electricidad"} · {d.rango} · {d.ubicacion}
                    </span>
                    <ChipOrigen origen={d.origen} mini />
                  </span>
                </button>
              </li>
            ))}
      </ul>
    </div>
  );
}

/** 3 · Mapa térmico: paleta, intensidad y reparto por zona. */
function PanelTermico({ paleta, onPaleta, intensidad, onIntensidad }: Pick<ContextoPanel, "paleta" | "onPaleta" | "intensidad" | "onIntensidad">) {
  const zonas = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of FUENTES) m.set(f.zona, (m.get(f.zona) ?? 0) + f.potencia);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, []);
  return (
    <div className="flex flex-col gap-3">
      <Titulo sub="Como una cámara termográfica sobre la planta">Termografía del inventario</Titulo>
      <div>
        <p className="mb-1.5 text-[10px] uppercase tracking-[0.18em] text-[#9B9BA1]">Paleta</p>
        <div className="grid grid-cols-2 gap-1.5">
          {(Object.keys(PALETAS) as PaletaCalor[]).map((k) => (
            <button key={k} type="button" onClick={() => onPaleta(k)} className={`flex flex-col gap-1 rounded-[2px] border p-1.5 text-left text-[11px] ${paleta === k ? "border-[#FFE14D] text-white" : "border-white/10 text-[#9B9BA1] hover:text-white"}`}>
              <span className="h-2 rounded-full" style={{ background: `linear-gradient(90deg, ${PALETAS[k].colores.map((c) => `rgb(${c.join(",")})`).join(",")})` }} />
              {PALETAS[k].nombre}
            </button>
          ))}
        </div>
      </div>
      <Deslizador etiqueta="Intensidad" valor={intensidad} min={0.4} max={2.5} paso={0.1} formato={(n) => `${Math.round(n * 100)} %`} onCambio={onIntensidad} />
      <div>
        <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-[#9B9BA1]">Calor residual por zona</p>
        <Barras filas={zonas.map(([z, v]) => ({ id: z, etiqueta: z, valor: v, color: COLOR.naranja, nota: `${Math.round((v / CALOR_RESIDUAL_MW) * 100)} % del total` }))} formato={(n) => `${num(n)} MW`} />
      </div>
    </div>
  );
}

/** 4 · Cruce: matriz 8×7 y criterios del par elegido. */
function PanelCruce({ pares, parSeleccionado, onPar, onEvaluarPar, op }: Pick<ContextoPanel, "pares" | "parSeleccionado" | "onPar" | "onEvaluarPar" | "op">) {
  const p = pares.find((x) => x.id === parSeleccionado) ?? pares[0]!;
  const cuenta = (e: string) => pares.filter((x) => x.estado === e).length;
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-1.5 text-center">
        {(["COMPATIBLE", "CONDICIONADO", "DESCARTADO"] as const).map((e) => (
          <div key={e} className="rounded-[2px] border border-white/10 bg-white/5 py-1.5">
            <p className="cifra-tabular text-lg font-semibold" style={{ color: COLOR_PAR[e] === "#3A3A40" ? COLOR.texto2 : COLOR_PAR[e] }}>
              {cuenta(e)}
            </p>
            <p className="text-[10px] text-[#9B9BA1]">{e === "COMPATIBLE" ? "compatibles" : e === "CONDICIONADO" ? "condicionados" : "descartados"}</p>
          </div>
        ))}
      </div>
      <div>
        <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-[#9B9BA1]">56 pares · toque una celda</p>
        <MatrizCruce pares={pares} seleccion={p.id} onSel={onPar} />
      </div>
      <div className="flex flex-col gap-2 border-t border-white/10 pt-2">
        <p className="text-xs text-white">
          <b style={{ color: cssTemperatura(p.fuente.tMax) }}>{p.fuente.id}</b> {p.fuente.nombre} → <b className="text-[#5AC8FA]">{p.demanda.id}</b> {p.demanda.nombre}
        </p>
        <span className="w-fit rounded-full px-2 py-0.5 text-[11px] font-semibold text-[#0A0A0B]" style={{ background: COLOR_PAR[p.estado] === "#3A3A40" ? "#828288" : COLOR_PAR[p.estado] }}>
          {p.estado === "COMPATIBLE" ? "Compatible" : p.estado === "CONDICIONADO" ? "Condicionado" : "Descartado"}
          {p.tecnologia ? ` · ${p.tecnologia.nombre}` : ""}
        </span>
        <ul className="flex flex-col gap-1.5">
          {p.criterios.map((c) => (
            <li key={c.codigo} className="grid grid-cols-[2rem_1fr] gap-2 text-xs">
              <span className="cifra-tabular rounded px-1 py-0.5 text-center font-semibold text-[#0A0A0B]" style={{ background: COLOR_CRITERIO[c.estado] }}>
                {c.codigo}
              </span>
              <span>
                <span className="font-medium text-white">{c.nombre}</span> <span style={{ color: COLOR_CRITERIO[c.estado] }}>· {TEXTO_CRITERIO[c.estado]}</span>
                <span className="block text-[#9B9BA1]">{c.nota}</span>
              </span>
            </li>
          ))}
        </ul>
        {p.estado !== "DESCARTADO" ? (
          p.id === `${op.fuente.id}-${op.demanda.id}` ? (
            <p className="text-[11px] text-[#FFE14D]">★ Este es el par que seguirá el recorrido.</p>
          ) : (
            <button type="button" onClick={() => onEvaluarPar(p.id)} className="w-fit rounded-[2px] border border-[#FFE14D]/60 px-2.5 py-1 text-[11px] font-semibold text-[#FFE14D] hover:bg-[#FFE14D]/10">
              Evaluar este par →
            </button>
          )
        ) : null}
      </div>
    </div>
  );
}

/** Texto que se escribe letra a letra, como la respuesta de un agente (simulado y determinista). */
function useEscritura(texto: string, cps = 90) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    const id = setInterval(() => setN((x) => (x >= texto.length ? x : x + 3)), 3000 / cps);
    return () => clearInterval(id);
  }, [texto, cps]);
  return { visible: texto.slice(0, n), listo: n >= texto.length };
}

const TITULO_PROPUESTA: Record<string, string> = {
  T1: "Reúso directo en proceso",
  T2: "Calor elevado con bomba de calor",
  T3: "Retorno al ciclo de calderas",
  T4: "Calor a frío para climatización",
  T5: "Calor a electricidad",
};

/** 5 · Propuestas de la IA (simulada): proyectos de uso para el par, con sus indicadores estimados. */
function PanelPropuestas({ op, onTecnologia, supuestos }: Pick<ContextoPanel, "op" | "onTecnologia" | "supuestos">) {
  const propuestas = TECNOLOGIAS.map((t) => ({ t, a: ajusteTecnologia(t, op.fuente, op.demanda) }))
    .filter((x) => x.a)
    .map(({ t, a }) => ({ t, a: a!, e: evaluar(op.fuente, op.demanda, t, op.modelo, supuestos) }));
  const resumen = `Analicé ${op.fuente.id} (${op.fuente.tMin}–${op.fuente.tMax} °C, ${op.fuente.potencia} MW, continuidad ${op.fuente.continuidad.toLowerCase()}) frente a ${op.demanda.id} (${op.demanda.rango}, ${op.demanda.potencia} MW). Encontré ${propuestas.length} ${propuestas.length === 1 ? "proyecto viable" : "proyectos viables"}; los ordeno por ajuste de temperatura y retorno estimado.`;
  const { visible, listo } = useEscritura(resumen);
  const descartadas = TECNOLOGIAS.filter((t) => !ajusteTecnologia(t, op.fuente, op.demanda));
  return (
    <div className="flex flex-col gap-3">
      <ParCabecera op={op} />
      <SaltoTemperatura tMin={op.fuente.tMin} tMax={op.fuente.tMax} tReq={op.demanda.tReq} />
      <div className="rounded-[2px] border border-[#B98CFF]/40 bg-[#B98CFF]/5 p-2 text-xs">
        <p className="hud flex items-center justify-between text-[9px] text-[#B98CFF]">
          <span>✦ Agente de propuestas</span>
          <span className="text-[#F5C518]">IA simulada</span>
        </p>
        <p className="mt-1 min-h-[3.5rem] text-[#D0D0D4]">
          {visible}
          {!listo ? <span className="vt-parpadeo ml-0.5 inline-block h-3 w-1.5 bg-[#B98CFF] align-middle" /> : null}
        </p>
      </div>
      <ul className={`flex flex-col gap-1.5 transition-opacity duration-500 ${listo ? "opacity-100" : "opacity-0"}`}>
        {propuestas.map(({ t, a, e }, i) => {
          const sel = t.id === op.tecnologia.id;
          return (
            <li key={t.id}>
              <button type="button" onClick={() => onTecnologia(t.id)} className={`w-full rounded-[2px] border px-2 py-1.5 text-left ${sel ? "border-[#FFE14D] bg-[#FFE14D]/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
                <span className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-white">
                    <span className="cifra-tabular mr-1 text-[#5E5E66]">P{i + 1}</span>
                    {TITULO_PROPUESTA[t.id]}
                  </span>
                  <span className="shrink-0 rounded-full px-1.5 py-px text-[10px] font-semibold text-[#0A0A0B]" style={{ background: a === "Alta" ? COLOR.verde : a === "Media" ? COLOR.amarillo : COLOR.naranja }}>
                    ajuste {a.toLowerCase()}
                  </span>
                </span>
                <span className="mt-0.5 block text-[10px] text-[#9B9BA1]">
                  {t.nombre} · {t.descripcion}
                </span>
                <span className="cifra-tabular mt-1 grid grid-cols-4 gap-1 text-[10px] text-[#9B9BA1]">
                  <span>
                    Útil<b className="block text-white">{mw(e.qUtil)}</b>
                  </span>
                  <span>
                    Inversión<b className="block text-white">{usd(e.capexUSD)}</b>
                  </span>
                  <span>
                    Ahorro/año<b className="block text-white">{usd(e.ahorroUSD)}</b>
                  </span>
                  <span>
                    Retorno<b className="block text-white">{anios(e.paybackAnios)}</b>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {descartadas.length && listo ? (
        <p className="text-[10px] text-[#5E5E66]">Descartadas para este par: {descartadas.map((t) => t.nombre.toLowerCase()).join(", ")} (no encajan con el salto de temperatura o con la demanda).</p>
      ) : null}
      <p className="border-l-2 border-[#B98CFF] pl-2 text-[10px] text-[#9B9BA1]">
        Propuestas generadas con IA a partir de los parámetros ingresados (eficiencia {Math.round(supuestos.eficiencia * 100)} %, {num(supuestos.horas)} h/año, calor USD {supuestos.costoEnergia}/MWh, electricidad USD {supuestos.precioElectricidad}/MWh). En este prototipo el agente es simulado con reglas; no hay un modelo de IA real.
      </p>
    </div>
  );
}

/** 6 · Financiamiento del proyecto: beneficio neto de la refinería a 5 años según cómo lo financie. */
function PanelModelo({ op, onModelo, supuestos }: Pick<ContextoPanel, "op" | "onModelo" | "supuestos">) {
  const filas = MODELOS.filter((m) => !m.soloPara || m.soloPara === op.demanda.tipo).map((m) => {
    const e = evaluar(op.fuente, op.demanda, op.tecnologia, m, supuestos);
    // Flujo de caja acumulado de la refinería, año 0 a 5: inversión inicial y luego su parte del ahorro neto.
    const neto = e.ahorroUSD - e.opexUSD;
    const flujo = Array.from({ length: 6 }, (_, anio) => -e.inversionCliente + neto * m.participacionCliente * anio);
    return { m, e, flujo };
  });
  const sel = op.modelo;
  const elegido = filas.find((f) => f.m.id === sel.id) ?? filas[0]!;
  const parteRefineria = Math.round(sel.participacionCliente * 100);
  return (
    <div className="flex flex-col gap-3">
      <ParCabecera op={op} />
      <p className="rounded-[2px] border border-[#5AC8FA]/40 bg-[#5AC8FA]/5 p-2 text-[11px] text-[#C8C8CC]">
        Estos esquemas son opciones de <b className="text-white">financiamiento del proyecto</b> para la refinería. No son el modelo de negocio de Calor Rescatado, que cobra por el portafolio.
      </p>
      <div>
        <p className="hud mb-1 text-[9px] text-[#9B9BA1]">Flujo de caja acumulado de la refinería · años 0–5</p>
        <FlujoCaja series={filas.map(({ m, flujo }) => ({ id: m.id, nombre: m.nombre, valores: flujo }))} seleccion={sel.id} onSel={onModelo} />
      </div>
      {/* Quién pone el dinero y quién se queda con qué parte del ahorro. */}
      <div className="visor p-3 text-xs">
        <p className="hud text-[10px] text-[#FFB000]">{sel.nombre} · cómo se financia el proyecto</p>
        <p className="mt-1 text-[#C8C8CC]">{sel.descripcion}</p>
        <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center text-[11px]">
          <div className="border border-white/15 p-2">
            <p className="hud text-[9px] text-[#9B9BA1]">Refinería</p>
            <p className="cifra-tabular text-sm font-semibold text-white">{sel.inversionCliente === 0 ? "USD 0" : usd(elegido.e.inversionCliente)}</p>
            <p className="text-[10px] text-[#9B9BA1]">inversión inicial</p>
          </div>
          <div className="flex flex-col items-center text-[10px] text-[#9B9BA1]">
            <span className="text-[#FFB000]">{sel.inversionCliente < 1 ? "◀ invierte" : ""}</span>
            <span>⇄</span>
            <span className="text-[#3DDC84]">{parteRefineria < 100 ? `paga ${100 - parteRefineria} % ▶` : ""}</span>
          </div>
          <div className="border border-white/15 p-2">
            <p className="hud text-[9px] text-[#9B9BA1]">Quien ejecuta</p>
            <p className="cifra-tabular text-sm font-semibold text-white">{sel.inversionCliente === 1 ? "USD 0" : usd(elegido.e.capexUSD * (1 - sel.inversionCliente))}</p>
            <p className="text-[10px] text-[#9B9BA1]">inversión inicial</p>
          </div>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden border border-white/15" aria-label={`La refinería conserva el ${parteRefineria} % del ahorro`}>
          <div className="h-full bg-[#3DDC84]" style={{ width: `${parteRefineria}%` }} />
        </div>
        <p className="mt-1 flex justify-between text-[10px] text-[#9B9BA1]">
          <span>Refinería conserva {parteRefineria} % del ahorro</span>
          <span>{100 - parteRefineria} % paga el servicio</span>
        </p>
        <div className="mt-2 grid grid-cols-3 gap-1 text-[10px]">
          <span className="text-[#9B9BA1]">
            Beneficio a 5 años
            <b className="cifra-tabular block text-white">{usd(elegido.e.beneficioCliente5)}</b>
          </span>
          <span className="text-[#9B9BA1]">
            Riesgo de quien ejecuta
            <b className="block text-white">{sel.riesgoProveedor}</b>
          </span>
          <span className="text-[#9B9BA1]">
            Pago por resultado
            <b className="block text-white">{sel.pagoPorResultado}</b>
          </span>
        </div>
      </div>
      <p className="border-l-2 border-[#3DDC84] pl-2 text-[11px] text-[#C8C8CC]">
        Incentivos Ley 1715/2099 (con certificación UPME): exclusión del 50 % en renta, IVA 0 % y aranceles 0 % en equipos. El ahorro se verifica con el protocolo IPMVP.
      </p>
      <p className="text-[11px] text-[#9B9BA1]">Toque una curva para elegir el esquema. Ahorro neto anual (ahorro − 4 % de OPEX) × participación de la refinería, menos su inversión. Participaciones y plazos ilustrativos.</p>
    </div>
  );
}

/** 7 · Evaluación: indicadores, radar, riesgo, prioridad y supuestos. */
function PanelEvaluacion({ op, supuestos, onSupuestos, onFuentes }: Pick<ContextoPanel, "op" | "supuestos" | "onSupuestos" | "onFuentes">) {
  const semaforo = { Bajo: COLOR.verde, Medio: COLOR.amarillo, Alto: COLOR.rojo }[op.riesgo];
  return (
    <div className="flex flex-col gap-3">
      <ParCabecera op={op} />
      <p className="text-[11px] text-[#9B9BA1]">
        {op.tecnologia.nombre} · financiamiento {op.modelo.nombre} · indicadores estimados
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        <Cifra etiqueta="Potencia útil" valor={mw(op.qUtil)} color={COLOR.lima} />
        <Cifra etiqueta="Energía anual" valor={`${num(op.energiaMWh)} MWh`} />
        <Cifra etiqueta="Ahorro energético anual" valor={usd(op.ahorroUSD)} color={COLOR.lima} />
        <Cifra etiqueta="Inversión inicial (CAPEX)" valor={usd(op.capexUSD)} />
        <Cifra etiqueta="Retorno (payback)" valor={anios(op.paybackAnios)} />
        <Cifra etiqueta="CO₂ evitado / año" valor={`${num(op.co2t)} t`} />
      </div>
      <div className="flex items-center gap-3 rounded-[2px] border border-white/10 bg-white/5 p-2">
        <div className="flex gap-1">
          {(["Bajo", "Medio", "Alto"] as const).map((r) => (
            <span key={r} className="h-4 w-4 rounded-full" style={{ background: { Bajo: COLOR.verde, Medio: COLOR.amarillo, Alto: COLOR.rojo }[r], opacity: op.riesgo === r ? 1 : 0.18, boxShadow: op.riesgo === r ? `0 0 10px ${semaforo}` : undefined }} />
          ))}
        </div>
        <div className="text-xs">
          <p className="text-[#9B9BA1]">Riesgo</p>
          <p className="font-semibold" style={{ color: semaforo }}>
            {op.riesgo}
          </p>
        </div>
        <div className="ml-auto text-right">
          <p className="cifra-tabular text-2xl font-bold leading-none" style={{ color: COLOR_PRIORIDAD_CSS[op.prioridad] }}>
            {num(op.puntaje, 2)}
          </p>
          <p className="text-[10px] text-[#9B9BA1]">
            {op.prioridad} · {op.accion}
          </p>
        </div>
      </div>
      <Radar puntajes={op.puntajes} />
      <details className="text-[11px] text-[#9B9BA1]">
        <summary className="cursor-pointer text-white">Ponderación del puntaje</summary>
        <p className="mt-1">{(Object.keys(PESOS) as Criterio8[]).map((k) => `${NOMBRE_CRITERIO8[k]} ${Math.round(PESOS[k] * 100)} %`).join(" · ")}</p>
      </details>
      <div className="flex flex-col gap-2 border-t border-white/10 pt-2">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[#9B9BA1]">Supuestos (mueva y compare)</p>
        <Deslizador etiqueta="Eficiencia de aprovechamiento" valor={supuestos.eficiencia} min={0.3} max={0.9} paso={0.05} formato={(n) => `${Math.round(n * 100)} %`} onCambio={(eficiencia) => onSupuestos({ ...supuestos, eficiencia })} />
        <Deslizador etiqueta="Valor del calor evitado" valor={supuestos.costoEnergia} min={20} max={150} paso={1} formato={(n) => `USD ${n}/MWh`} onCambio={(costoEnergia) => onSupuestos({ ...supuestos, costoEnergia })} />
        <p className="-mt-1 text-[10px] text-[#5E5E66]">
          Base USD {SUPUESTOS_INICIALES.costoEnergia}/MWh: gas importado en caldera.{" "}
          <button type="button" className="text-[#FFB000] hover:text-white" onClick={() => onSupuestos({ ...supuestos, costoEnergia: COSTO_CALOR_CONSERVADOR })}>
            Conservador USD {COSTO_CALOR_CONSERVADOR}
          </button>
        </p>
        <Deslizador etiqueta="Precio de la electricidad" valor={supuestos.precioElectricidad} min={100} max={300} paso={1} formato={(n) => `USD ${n}/MWh`} onCambio={(precioElectricidad) => onSupuestos({ ...supuestos, precioElectricidad })} />
        <p className="-mt-1 text-[10px] text-[#5E5E66]">Base USD {SUPUESTOS_INICIALES.precioElectricidad}/MWh: tarifa Afinia Nivel 4, octubre de 2026.</p>
        <Deslizador etiqueta="Horas de operación al año" valor={supuestos.horas} min={4000} max={8760} paso={20} formato={(n) => `${num(n)} h`} onCambio={(horas) => onSupuestos({ ...supuestos, horas })} />
        <Deslizador etiqueta="Factor CAPEX" valor={supuestos.factorCapex} min={0.5} max={2} paso={0.1} formato={(n) => `${num(n, 1)}×`} onCambio={(factorCapex) => onSupuestos({ ...supuestos, factorCapex })} />
        <button type="button" onClick={() => onSupuestos(SUPUESTOS_INICIALES)} className="w-fit text-[11px] text-[#FFB000] hover:text-white">
          ↺ Restablecer supuestos
        </button>
        <VerFuentes onFuentes={onFuentes} />
      </div>
    </div>
  );
}

/** 8 · Portafolio del piloto: sección, meta y proyectos que la suman. */
function PanelPortafolio({ cartera, candidatos, op, onPar, seccion, onSeccion, metaPiloto, onMetaPiloto, supuestos }: Pick<ContextoPanel, "cartera" | "candidatos" | "op" | "onPar" | "seccion" | "onSeccion" | "metaPiloto" | "onMetaPiloto" | "supuestos">) {
  const sel = `${op.fuente.id}-${op.demanda.id}`;
  const recuperado = cartera.reduce((a, o) => a + o.recuperadoMW, 0);
  const potencial = candidatos.reduce((a, o) => a + o.recuperadoMW, 0);
  const cumple = recuperado >= metaPiloto - 1e-6;
  const enPiloto = new Set(cartera.map((o) => `${o.fuente.id}-${o.demanda.id}`));
  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="hud mb-1 text-[9px] text-[#9B9BA1]">Sección del piloto · la elige la refinería</p>
        <div className="grid grid-cols-2 gap-1">
          {SECCIONES_PILOTO.map((z) => (
            <button key={z} type="button" onClick={() => onSeccion(z)} className={`truncate rounded-[2px] border px-2 py-1 text-left text-[11px] ${z === seccion ? "border-[#FFE14D] bg-[#FFE14D]/10 text-white" : "border-white/10 text-[#9B9BA1] hover:text-white"}`}>
              {z}
            </button>
          ))}
        </div>
      </div>
      <Deslizador etiqueta="Meta del piloto (calor recuperado)" valor={metaPiloto} min={0.5} max={5} paso={0.1} formato={(n) => `${num(n, 1)} MW · ${num(fraccionMeta(n, supuestos.horas) * 100, 1)} % de la meta anual`} onCambio={onMetaPiloto} />
      <div className="rounded-[2px] border border-white/10 bg-white/5 p-2 text-xs">
        <div className="flex items-baseline justify-between">
          <span className="text-[#9B9BA1]">Suma de los proyectos</span>
          <span className="cifra-tabular font-semibold" style={{ color: cumple ? COLOR.verde : COLOR.amarillo }}>
            {num(recuperado, 2)} / {num(metaPiloto, 1)} MW
          </span>
        </div>
        <div className="mt-1.5 h-2 w-full overflow-hidden border border-white/15">
          <div className="h-full" style={{ width: `${Math.min(100, (recuperado / metaPiloto) * 100)}%`, background: cumple ? COLOR.verde : COLOR.amarillo }} />
        </div>
        <p className="mt-1 text-[10px] text-[#9B9BA1]">
          {cumple ? "Los proyectos del piloto cumplen la meta." : `La sección no alcanza la meta con los datos del ejemplo (potencial ${num(potencial, 1)} MW).`} Potencial total de la sección: {num(potencial, 1)} MW.
        </p>
      </div>
      <ul className="flex flex-col gap-1.5">
        {cartera.map((o) => {
          const id = `${o.fuente.id}-${o.demanda.id}`;
          const parcial = o.recuperadoMW < o.potencialMW - 1e-6;
          return (
            <li key={o.codigo}>
              <button type="button" onClick={() => onPar(id)} className={`w-full rounded-[2px] border px-2 py-1.5 text-left text-[11px] ${id === sel ? "border-[#FFE14D] bg-[#FFE14D]/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
                <span className="flex items-center justify-between gap-2">
                  <span className="text-white">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ background: COLOR_PRIORIDAD_CSS[o.prioridad] }} /> <b className="cifra-tabular">{o.codigo}</b> {o.fuente.id}→{o.demanda.id} · {o.tecnologia.nombre}
                  </span>
                  <span className="cifra-tabular shrink-0 font-semibold text-white">{num(o.recuperadoMW, 2)} MW</span>
                </span>
                <span className="cifra-tabular mt-0.5 block text-[10px] text-[#9B9BA1]">
                  Ahorro {usd(o.ahorroUSD)}/año · inversión {usd(o.capexUSD)} · retorno {anios(o.paybackAnios)}
                  {parcial ? ` · dimensionado a la meta (potencial ${num(o.potencialMW, 1)} MW)` : ""}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div>
        <p className="hud mb-1 text-[9px] text-[#9B9BA1]">Proyectos de la sección ({candidatos.length}) · matriz de prioridad</p>
        <MatrizPrioridad cartera={candidatos} seleccion={sel} onSel={onPar} />
        <p className="mt-1 text-[10px] text-[#5E5E66]">
          {candidatos.filter((o) => !enPiloto.has(`${o.fuente.id}-${o.demanda.id}`)).length} proyectos más quedan documentados para fases siguientes.
        </p>
      </div>
      <p className="border-l-2 border-[#FFB000] pl-2 text-[11px] text-[#C8C8CC]">
        Entregable: portafolio documentado con indicadores estimados y respaldo técnico y bibliográfico. Los ingenieros de la refinería revisan y aprueban cada proyecto.
      </p>
    </div>
  );
}

/** Lecturas simuladas deterministas (seno), una vez por segundo. */
function useReloj(activo: boolean) {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!activo) return;
    const id = setInterval(() => setT((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, [activo]);
  return t;
}

/** 9 · Piloto y monitoreo: sensórica clamp-on en vivo (simulada). */
function PanelMonitoreo({ op }: Pick<ContextoPanel, "op">) {
  const t = useReloj(true);
  const esperado = op.qUtil * 1000;
  const serie = Array.from({ length: 40 }, (_, i) => esperado * (0.975 + 0.02 * Math.sin((t + i) / 3) + 0.008 * Math.sin((t + i) * 1.7)));
  const actual = serie[serie.length - 1]!;
  const dif = ((esperado - actual) / esperado) * 100;
  const tEntra = op.fuente.tMax - 4 + 1.2 * Math.sin(t / 4);
  const tSale = op.demanda.tReq + 1.5 + 0.8 * Math.sin(t / 5);
  const mwh = 1240 + (t * op.qUtil) / 60;
  return (
    <div className="flex flex-col gap-3">
      <ParCabecera op={op} />
      <div className="flex items-center gap-2 text-xs text-[#3DDC84]">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3DDC84] opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#3DDC84]" />
        </span>
        En vivo · lectura cada segundo (simulada)
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <Cifra etiqueta={`Entrada · ${op.fuente.id}`} valor={`${num(tEntra, 1)} °C`} color={cssTemperatura(tEntra)} origen="MEDIDO" />
        <Cifra etiqueta={`Entrega · ${op.demanda.id}`} valor={`${num(tSale, 1)} °C`} color={COLOR.azul} origen="MEDIDO" />
      </div>
      <div className="rounded-[2px] border border-white/10 bg-white/5 p-2">
        <div className="flex items-baseline justify-between text-xs">
          <span className="text-[#9B9BA1]">Potencia recuperada</span>
          <span className="cifra-tabular text-white">
            {num(actual)} <span className="text-[#9B9BA1]">/ {num(esperado)} kW esperados</span>
          </span>
        </div>
        <Serie valores={serie} color={COLOR.lima} referencia={esperado} />
      </div>
      <div className={`rounded-[2px] border p-2 text-xs ${dif <= 5 ? "border-[#3DDC84]/50 text-[#3DDC84]" : "border-[#FF3B30] text-[#FF3B30]"}`}>
        Conciliación entregado–esperado (IPMVP): {num(dif, 1)} % (tolerancia 5 %) · {dif <= 5 ? "dentro de lo pactado" : "fuera de lo pactado: se avisa a las partes"}
      </div>
      <Cifra etiqueta="Calor rescatado en el mes" valor={`${num(mwh, 1)} MWh`} color={COLOR.lima} origen="MEDIDO" />
      <ul className="flex flex-col gap-1 text-[11px]">
        {HABILITADORES.map((h) => (
          <li key={h.id} className="rounded border border-white/10 px-2 py-1">
            <b className="text-white">{h.nombre}</b> <span className="text-[#9B9BA1]">· {h.descripcion}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 10 · Escenarios de escala: piloto, intermedio (supuesto) y refinería completa (proporcional a la meta). */
function PanelEscenarios({ cartera, metaPiloto, seccion, supuestos, onFuentes }: Pick<ContextoPanel, "cartera" | "metaPiloto" | "seccion" | "supuestos" | "onFuentes">) {
  const recuperado = cartera.reduce((a, o) => a + o.recuperadoMW, 0);
  const ahorro = cartera.reduce((a, o) => a + o.ahorroUSD, 0);
  const inversion = cartera.reduce((a, o) => a + o.capexUSD, 0);
  // Ahorro e inversión por MW recuperado del piloto: base para proyectar los otros escenarios.
  const ahorroPorMW = recuperado > 0 ? ahorro / recuperado : 0;
  const inversionPorMW = recuperado > 0 ? inversion / recuperado : 0;
  const escenarios = [
    { nombre: "Piloto", mw: recuperado, base: `Una sección: ${seccion.toLowerCase()}. Meta ${num(metaPiloto, 1)} MW.`, tipo: "Proyectos del portafolio", color: COLOR.lima },
    { nombre: "Intermedio", mw: recuperado * SECCIONES_INTERMEDIO, base: `Supuesto declarado: ${SECCIONES_INTERMEDIO} secciones similares a la del piloto.`, tipo: "Supuesto", color: COLOR.amarillo },
    { nombre: "Refinería completa", mw: META_RETO.mwPromedio, base: `Proporcional a la meta de ${META_RETO.pj} PJ en ${META_RETO.anios} años. Sin compromiso.`, tipo: "Referencia de escala", color: COLOR.naranja },
  ];
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {escenarios.map((e) => (
          <li key={e.nombre} className="rounded-[2px] border border-white/10 bg-white/5 p-2 text-xs">
            <p className="flex items-center justify-between">
              <span className="font-semibold text-white">{e.nombre}</span>
              <span className="hud text-[9px]" style={{ color: e.color }}>
                {e.tipo}
              </span>
            </p>
            <p className="mt-0.5 text-[10px] text-[#9B9BA1]">{e.base}</p>
            <div className="cifra-tabular mt-1.5 grid grid-cols-4 gap-1 text-[10px] text-[#9B9BA1]">
              <span>
                Recuperado<b className="block text-[13px] text-white">{mw(e.mw)}</b>
              </span>
              <span>
                Meta anual<b className="block text-[13px]" style={{ color: e.color }}>{num(Math.min(1, fraccionMeta(e.mw, supuestos.horas)) * 100, 1)} %</b>
              </span>
              <span>
                Ahorro/año<b className="block whitespace-nowrap text-[13px] text-white">{usd(e.mw * ahorroPorMW)}</b>
              </span>
              <span>
                Inversión<b className="block whitespace-nowrap text-[13px] text-white">{usd(e.mw * inversionPorMW)}</b>
              </span>
            </div>
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-[#5E5E66]">
        Intermedio y refinería completa repiten el ahorro y la inversión por MW del piloto ({usd(ahorroPorMW)} y {usd(inversionPorMW)} por MW). Son referencias de escala: cada sección real tiene su propio portafolio.
      </p>
      <div className="visor p-3 text-xs">
        <p className="hud text-[9px] text-[#FFB000]">Modelo de negocio de Calor Rescatado</p>
        <p className="mt-1 text-base font-semibold text-white">Cobro por portafolio</p>
        <p className="mt-1 text-[#C8C8CC]">Un porcentaje del ahorro energético anual estimado de los proyectos que la refinería aprueba. Se pacta con la refinería para cada portafolio.</p>
        <p className="mt-2 text-[10px] text-[#9B9BA1]">Es independiente de cómo financie la refinería cada proyecto (CAPEX propio, ESCO, BOOT…).</p>
      </div>
      <ol className="relative flex flex-col gap-2 border-l border-white/15 pl-4 text-xs">
        {[
          ["1 · Datos y diagnóstico", "La refinería entrega los datos térmicos; se consolidan y se cruzan."],
          ["2 · Portafolio del piloto", `Proyectos de la sección elegida que suman ${num(metaPiloto, 1)} MW, con su respaldo técnico.`],
          ["3 · Aprobación y verificación", "Los ingenieros aprueban; el piloto se mide con IPMVP antes de escalar."],
          ["4 · Escala", `Nuevas secciones, cada una con su portafolio, hacia la meta de ${META_RETO.pj} PJ.`],
        ].map(([t, d], i) => (
          <li key={t}>
            <span className="absolute -left-[5px] mt-1 h-2.5 w-2.5 rounded-full" style={{ background: i < 2 ? COLOR.lima : COLOR.teal }} />
            <p className="font-medium text-white">{t}</p>
            <p className="text-[#9B9BA1]">{d}</p>
          </li>
        ))}
      </ol>
      <VerFuentes onFuentes={onFuentes} />
    </div>
  );
}

export function PanelPaso(ctx: ContextoPanel & { puntoSeleccionado: string | null; onPunto: (id: string) => void }) {
  switch (ctx.paso) {
    case "problema":
      return <PanelReto onFuentes={ctx.onFuentes} />;
    case "inventario":
      return <PanelInventario onPunto={ctx.onPunto} seleccion={ctx.puntoSeleccionado} />;
    case "termico":
      return <PanelTermico paleta={ctx.paleta} onPaleta={ctx.onPaleta} intensidad={ctx.intensidad} onIntensidad={ctx.onIntensidad} />;
    case "cruce":
      return <PanelCruce pares={ctx.pares} parSeleccionado={ctx.parSeleccionado} onPar={ctx.onPar} onEvaluarPar={ctx.onEvaluarPar} op={ctx.op} />;
    case "tecnologia":
      return <PanelPropuestas op={ctx.op} onTecnologia={ctx.onTecnologia} supuestos={ctx.supuestos} />;
    case "modelo":
      return <PanelModelo op={ctx.op} onModelo={ctx.onModelo} supuestos={ctx.supuestos} />;
    case "evaluacion":
      return <PanelEvaluacion op={ctx.op} supuestos={ctx.supuestos} onSupuestos={ctx.onSupuestos} onFuentes={ctx.onFuentes} />;
    case "portafolio":
      return <PanelPortafolio cartera={ctx.cartera} candidatos={ctx.candidatos} op={ctx.op} onPar={ctx.onPar} seccion={ctx.seccion} onSeccion={ctx.onSeccion} metaPiloto={ctx.metaPiloto} onMetaPiloto={ctx.onMetaPiloto} supuestos={ctx.supuestos} />;
    case "monitoreo":
      return <PanelMonitoreo op={ctx.op} />;
    case "impacto":
      return <PanelEscenarios cartera={ctx.cartera} metaPiloto={ctx.metaPiloto} seccion={ctx.seccion} supuestos={ctx.supuestos} onFuentes={ctx.onFuentes} />;
  }
}
