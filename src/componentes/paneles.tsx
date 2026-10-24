"use client";

import { useEffect, useMemo, useState } from "react";
import { DEMANDAS, FUENTES, GAS_M3_POR_MWH, HABILITADORES, MODELOS, NOMBRE_CRITERIO8, PESOS, SUPUESTOS_INICIALES, TECNOLOGIAS, type Criterio8, type IdPaso, type Supuestos } from "@/dominio/escenario";
import { CALOR_RESIDUAL_MW, ajusteTecnologia, evaluar, type EstadoCriterio, type Oportunidad, type Par } from "@/dominio/motor";
import { Barras, COLOR_PAR, COLOR_PRIORIDAD_CSS, MatrizCruce, MatrizPrioridad, Radar, SaltoTemperatura, Serie } from "@/componentes/graficos";
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
  cartera: Oportunidad[];
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
      {sub ? <p className="text-[11px] text-[#8CA8AD]">{sub}</p> : null}
    </div>
  );
}

function Cifra({ etiqueta, valor, color = "#fff", origen = "ESTIMADO" as const }: { etiqueta: string; valor: string; color?: string; origen?: "MEDIDO" | "DECLARADO" | "ESTIMADO" }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/5 p-2">
      <p className="text-[10px] text-[#8CA8AD]">{etiqueta}</p>
      <p className="cifra-tabular text-base font-semibold leading-tight" style={{ color }}>
        {valor}
      </p>
      <ChipOrigen origen={origen} mini />
    </div>
  );
}

function ParCabecera({ op }: { op: Oportunidad }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-[#CFE84E]/40 bg-[#CFE84E]/5 p-2 text-xs">
      <span className="rounded px-1.5 py-0.5 font-semibold text-[#051417]" style={{ background: cssTemperatura(op.fuente.tMax) }}>
        {op.fuente.id}
      </span>
      <span className="min-w-0 flex-1 truncate text-white">{op.fuente.nombre}</span>
      <span className="text-[#CFE84E]">→</span>
      <span className="rounded bg-[#60A5FA] px-1.5 py-0.5 font-semibold text-[#051417]">{op.demanda.id}</span>
      <span className="min-w-0 flex-1 truncate text-white">{op.demanda.nombre}</span>
    </div>
  );
}

function Deslizador({ etiqueta, valor, min, max, paso, formato, onCambio }: { etiqueta: string; valor: number; min: number; max: number; paso: number; formato: (n: number) => string; onCambio: (n: number) => void }) {
  return (
    <label className="flex flex-col gap-1 text-[11px]">
      <span className="flex justify-between text-[#8CA8AD]">
        {etiqueta}
        <span className="cifra-tabular text-white">{formato(valor)}</span>
      </span>
      <input type="range" min={min} max={max} step={paso} value={valor} onChange={(e) => onCambio(Number(e.target.value))} className="vt-rango" />
    </label>
  );
}

/** 1 · El problema: cuánto calor se pierde y dónde. */
function PanelProblema() {
  const energia = CALOR_RESIDUAL_MW * 8000;
  return (
    <div className="flex flex-col gap-3">
      <Titulo sub="8 fuentes de la refinería, 8.000 h de operación al año">Lo que hoy se pierde</Titulo>
      <div className="grid grid-cols-2 gap-2">
        <Cifra etiqueta="Calor residual" valor={`${CALOR_RESIDUAL_MW} MWt`} color={COLOR.naranja} origen="DECLARADO" />
        <Cifra etiqueta="Energía perdida al año" valor={`${num(energia / 1000)} GWh`} color={COLOR.naranja} />
        <Cifra etiqueta="Valor del calor (USD 50/MWh)" valor={usd(energia * 50)} />
        <Cifra etiqueta="Gas natural equivalente" valor={`${num((energia * GAS_M3_POR_MWH) / 1e6, 0)} M m³`} />
      </div>
      <div>
        <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-[#8CA8AD]">Potencia por fuente</p>
        <Barras
          filas={[...FUENTES].sort((a, b) => b.potencia - a.potencia).map((f) => ({ id: f.id, etiqueta: `${f.id} · ${f.nombre}`, valor: f.potencia, color: cssTemperatura(f.tMax), nota: `${f.tMin}–${f.tMax} °C · ${f.ubicacion}` }))}
          formato={(n) => `${num(n)} MW`}
        />
      </div>
      <p className="text-[11px] text-[#8CA8AD]">El color de cada barra y de cada columna del mapa es la temperatura máxima de la fuente: cuanto más caliente, más valioso es ese calor.</p>
    </div>
  );
}

/** 2 · Inventario: fuentes y demandas caracterizadas. */
function PanelInventario({ onPunto, seleccion }: { onPunto: (id: string) => void; seleccion: string | null }) {
  const [tab, setTab] = useState<"F" | "D">("F");
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 overflow-hidden rounded-md border border-white/15 text-xs">
        {(["F", "D"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`px-2 py-1.5 ${tab === t ? (t === "F" ? "bg-[#FF8A3D] font-semibold text-[#051417]" : "bg-[#60A5FA] font-semibold text-[#051417]") : "text-[#8CA8AD]"}`}>
            {t === "F" ? `Fuentes (${FUENTES.length})` : `Demandas (${DEMANDAS.length})`}
          </button>
        ))}
      </div>
      <ul className="flex flex-col gap-1.5">
        {tab === "F"
          ? FUENTES.map((f) => (
              <li key={f.id}>
                <button type="button" onClick={() => onPunto(f.id)} className={`w-full rounded-md border px-2 py-1.5 text-left ${seleccion === f.id ? "border-[#FF8A3D] bg-[#FF8A3D]/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
                  <span className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate text-white">
                      <b style={{ color: cssTemperatura(f.tMax) }}>{f.id}</b> {f.nombre}
                    </span>
                    <span className="cifra-tabular shrink-0 text-[#8CA8AD]">{f.potencia} MW</span>
                  </span>
                  <span className="mt-1.5 block">
                    <BarraTemperatura tMin={f.tMin} tMax={f.tMax} alto={5} />
                  </span>
                  <span className="mt-1 flex items-center justify-between text-[10px] text-[#8CA8AD]">
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
                <button type="button" onClick={() => onPunto(d.id)} className={`w-full rounded-md border px-2 py-1.5 text-left ${seleccion === d.id ? "border-[#60A5FA] bg-[#60A5FA]/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
                  <span className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate text-white">
                      <b className="text-[#60A5FA]">{d.id}</b> {d.nombre}
                    </span>
                    <span className="cifra-tabular shrink-0 text-[#8CA8AD]">{d.potencia} MW</span>
                  </span>
                  <span className="mt-1.5 block">
                    <BarraTemperatura punto={d.tReq} alto={5} />
                  </span>
                  <span className="mt-1 flex items-center justify-between text-[10px] text-[#8CA8AD]">
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
        <p className="mb-1.5 text-[10px] uppercase tracking-[0.18em] text-[#8CA8AD]">Paleta</p>
        <div className="grid grid-cols-2 gap-1.5">
          {(Object.keys(PALETAS) as PaletaCalor[]).map((k) => (
            <button key={k} type="button" onClick={() => onPaleta(k)} className={`flex flex-col gap-1 rounded-md border p-1.5 text-left text-[11px] ${paleta === k ? "border-[#CFE84E] text-white" : "border-white/10 text-[#8CA8AD] hover:text-white"}`}>
              <span className="h-2 rounded-full" style={{ background: `linear-gradient(90deg, ${PALETAS[k].colores.map((c) => `rgb(${c.join(",")})`).join(",")})` }} />
              {PALETAS[k].nombre}
            </button>
          ))}
        </div>
      </div>
      <Deslizador etiqueta="Intensidad" valor={intensidad} min={0.4} max={2.5} paso={0.1} formato={(n) => `${Math.round(n * 100)} %`} onCambio={onIntensidad} />
      <div>
        <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-[#8CA8AD]">Calor residual por zona</p>
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
          <div key={e} className="rounded-md border border-white/10 bg-white/5 py-1.5">
            <p className="cifra-tabular text-lg font-semibold" style={{ color: COLOR_PAR[e] === "#3A5258" ? COLOR.texto2 : COLOR_PAR[e] }}>
              {cuenta(e)}
            </p>
            <p className="text-[10px] text-[#8CA8AD]">{e === "COMPATIBLE" ? "compatibles" : e === "CONDICIONADO" ? "condicionados" : "descartados"}</p>
          </div>
        ))}
      </div>
      <div>
        <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-[#8CA8AD]">56 pares · toque una celda</p>
        <MatrizCruce pares={pares} seleccion={p.id} onSel={onPar} />
      </div>
      <div className="flex flex-col gap-2 border-t border-white/10 pt-2">
        <p className="text-xs text-white">
          <b style={{ color: cssTemperatura(p.fuente.tMax) }}>{p.fuente.id}</b> {p.fuente.nombre} → <b className="text-[#60A5FA]">{p.demanda.id}</b> {p.demanda.nombre}
        </p>
        <span className="w-fit rounded-full px-2 py-0.5 text-[11px] font-semibold text-[#051417]" style={{ background: COLOR_PAR[p.estado] === "#3A5258" ? "#78908F" : COLOR_PAR[p.estado] }}>
          {p.estado === "COMPATIBLE" ? "Compatible" : p.estado === "CONDICIONADO" ? "Condicionado" : "Descartado"}
          {p.tecnologia ? ` · ${p.tecnologia.nombre}` : ""}
        </span>
        <ul className="flex flex-col gap-1.5">
          {p.criterios.map((c) => (
            <li key={c.codigo} className="grid grid-cols-[2rem_1fr] gap-2 text-xs">
              <span className="cifra-tabular rounded px-1 py-0.5 text-center font-semibold text-[#051417]" style={{ background: COLOR_CRITERIO[c.estado] }}>
                {c.codigo}
              </span>
              <span>
                <span className="font-medium text-white">{c.nombre}</span> <span style={{ color: COLOR_CRITERIO[c.estado] }}>· {TEXTO_CRITERIO[c.estado]}</span>
                <span className="block text-[#8CA8AD]">{c.nota}</span>
              </span>
            </li>
          ))}
        </ul>
        {p.estado !== "DESCARTADO" ? (
          p.id === `${op.fuente.id}-${op.demanda.id}` ? (
            <p className="text-[11px] text-[#CFE84E]">★ Este es el par que seguirá el recorrido.</p>
          ) : (
            <button type="button" onClick={() => onEvaluarPar(p.id)} className="w-fit rounded-md border border-[#CFE84E]/60 px-2.5 py-1 text-[11px] font-semibold text-[#CFE84E] hover:bg-[#CFE84E]/10">
              Evaluar este par →
            </button>
          )
        ) : null}
      </div>
    </div>
  );
}

/** 5 · Tecnología: catálogo con su ajuste al par de la oportunidad. */
function PanelTecnologia({ op, onTecnologia }: Pick<ContextoPanel, "op" | "onTecnologia">) {
  return (
    <div className="flex flex-col gap-3">
      <ParCabecera op={op} />
      <SaltoTemperatura tMin={op.fuente.tMin} tMax={op.fuente.tMax} tReq={op.demanda.tReq} />
      <ul className="flex flex-col gap-1.5">
        {TECNOLOGIAS.map((t) => {
          const a = ajusteTecnologia(t, op.fuente, op.demanda);
          const sel = t.id === op.tecnologia.id;
          return (
            <li key={t.id}>
              <button type="button" disabled={!a} onClick={() => onTecnologia(t.id)} className={`w-full rounded-md border px-2 py-1.5 text-left disabled:opacity-40 ${sel ? "border-[#CFE84E] bg-[#CFE84E]/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
                <span className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-white">{t.nombre}</span>
                  <span className="shrink-0 rounded-full px-1.5 py-px text-[10px] font-semibold text-[#051417]" style={{ background: a === "Alta" ? COLOR.verde : a === "Media" ? COLOR.amarillo : a === "Baja" ? COLOR.naranja : "#3A5258" }}>
                    {a ? `ajuste ${a.toLowerCase()}` : "no aplica"}
                  </span>
                </span>
                <span className="mt-0.5 block text-[10px] text-[#8CA8AD]">{t.ruta} · {t.descripcion}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="grid grid-cols-2 gap-2">
        <Cifra etiqueta="Potencia útil entregada" valor={mw(op.qUtil)} color={COLOR.lima} />
        <Cifra etiqueta="Calor aprovechado de la fuente" valor={`${mw(op.qAprovechado)} de ${op.fuente.potencia}`} />
      </div>
    </div>
  );
}

/** 6 · Modelo de negocio: beneficio neto de la refinería a 5 años por modelo. */
function PanelModelo({ op, onModelo, supuestos }: Pick<ContextoPanel, "op" | "onModelo" | "supuestos">) {
  const filas = MODELOS.filter((m) => !m.soloPara || m.soloPara === op.demanda.tipo).map((m) => {
    const e = evaluar(op.fuente, op.demanda, op.tecnologia, m, supuestos);
    return { m, e };
  });
  const sel = op.modelo;
  return (
    <div className="flex flex-col gap-3">
      <ParCabecera op={op} />
      <div>
        <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-[#8CA8AD]">Beneficio neto de la refinería a 5 años</p>
        <Barras
          filas={filas.map(({ m, e }) => ({ id: m.id, etiqueta: m.nombre, valor: e.beneficioCliente5, color: m.id === sel.id ? COLOR.lima : COLOR.teal, resaltar: m.id === sel.id, onClick: () => onModelo(m.id), nota: e.inversionCliente > 0 ? `invierte ${usd(e.inversionCliente)}` : "sin inversión inicial" }))}
          formato={usd}
        />
      </div>
      <div className="rounded-md border border-[#CFE84E]/40 bg-white/5 p-2 text-xs">
        <p className="font-semibold text-white">{sel.nombre}</p>
        <p className="text-[#C9DADD]">{sel.descripcion}</p>
        <div className="mt-2 grid grid-cols-3 gap-1 text-[10px]">
          <span className="text-[#8CA8AD]">
            Inversión
            <b className="block text-white">{sel.inversionCliente === 0 ? "ninguna" : `${Math.round(sel.inversionCliente * 100)} % CAPEX`}</b>
          </span>
          <span className="text-[#8CA8AD]">
            Riesgo proveedor
            <b className="block text-white">{sel.riesgoProveedor}</b>
          </span>
          <span className="text-[#8CA8AD]">
            Pago por resultado
            <b className="block text-white">{sel.pagoPorResultado}</b>
          </span>
        </div>
      </div>
      <p className="text-[11px] text-[#8CA8AD]">Ahorro neto anual × 5 años × participación de la refinería, menos su inversión. Cifras ilustrativas.</p>
    </div>
  );
}

/** 7 · Evaluación: indicadores, radar, riesgo, prioridad y supuestos. */
function PanelEvaluacion({ op, supuestos, onSupuestos }: Pick<ContextoPanel, "op" | "supuestos" | "onSupuestos">) {
  const semaforo = { Bajo: COLOR.verde, Medio: COLOR.amarillo, Alto: COLOR.rojo }[op.riesgo];
  return (
    <div className="flex flex-col gap-3">
      <ParCabecera op={op} />
      <p className="text-[11px] text-[#8CA8AD]">
        {op.tecnologia.nombre} · modelo {op.modelo.nombre}
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        <Cifra etiqueta="Potencia útil" valor={mw(op.qUtil)} color={COLOR.lima} />
        <Cifra etiqueta="Energía anual" valor={`${num(op.energiaMWh)} MWh`} />
        <Cifra etiqueta="Ahorro anual" valor={usd(op.ahorroUSD)} color={COLOR.lima} />
        <Cifra etiqueta="CAPEX estimado" valor={usd(op.capexUSD)} />
        <Cifra etiqueta="Retorno (payback)" valor={anios(op.paybackAnios)} />
        <Cifra etiqueta="CO₂ evitado / año" valor={`${num(op.co2t)} t`} />
      </div>
      <div className="flex items-center gap-3 rounded-md border border-white/10 bg-white/5 p-2">
        <div className="flex gap-1">
          {(["Bajo", "Medio", "Alto"] as const).map((r) => (
            <span key={r} className="h-4 w-4 rounded-full" style={{ background: { Bajo: COLOR.verde, Medio: COLOR.amarillo, Alto: COLOR.rojo }[r], opacity: op.riesgo === r ? 1 : 0.18, boxShadow: op.riesgo === r ? `0 0 10px ${semaforo}` : undefined }} />
          ))}
        </div>
        <div className="text-xs">
          <p className="text-[#8CA8AD]">Riesgo</p>
          <p className="font-semibold" style={{ color: semaforo }}>
            {op.riesgo}
          </p>
        </div>
        <div className="ml-auto text-right">
          <p className="cifra-tabular text-2xl font-bold leading-none" style={{ color: COLOR_PRIORIDAD_CSS[op.prioridad] }}>
            {num(op.puntaje, 2)}
          </p>
          <p className="text-[10px] text-[#8CA8AD]">
            {op.prioridad} · {op.accion}
          </p>
        </div>
      </div>
      <Radar puntajes={op.puntajes} />
      <details className="text-[11px] text-[#8CA8AD]">
        <summary className="cursor-pointer text-white">Ponderación del puntaje</summary>
        <p className="mt-1">{(Object.keys(PESOS) as Criterio8[]).map((k) => `${NOMBRE_CRITERIO8[k]} ${Math.round(PESOS[k] * 100)} %`).join(" · ")}</p>
      </details>
      <div className="flex flex-col gap-2 border-t border-white/10 pt-2">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[#8CA8AD]">Supuestos (mueva y compare)</p>
        <Deslizador etiqueta="Eficiencia de aprovechamiento" valor={supuestos.eficiencia} min={0.3} max={0.9} paso={0.05} formato={(n) => `${Math.round(n * 100)} %`} onCambio={(eficiencia) => onSupuestos({ ...supuestos, eficiencia })} />
        <Deslizador etiqueta="Costo de energía evitada" valor={supuestos.costoEnergia} min={20} max={120} paso={5} formato={(n) => `USD ${n}/MWh`} onCambio={(costoEnergia) => onSupuestos({ ...supuestos, costoEnergia })} />
        <Deslizador etiqueta="Horas de operación al año" valor={supuestos.horas} min={4000} max={8760} paso={20} formato={(n) => `${num(n)} h`} onCambio={(horas) => onSupuestos({ ...supuestos, horas })} />
        <Deslizador etiqueta="Factor CAPEX" valor={supuestos.factorCapex} min={0.5} max={2} paso={0.1} formato={(n) => `${num(n, 1)}×`} onCambio={(factorCapex) => onSupuestos({ ...supuestos, factorCapex })} />
        <button type="button" onClick={() => onSupuestos(SUPUESTOS_INICIALES)} className="w-fit text-[11px] text-[#00AEC0] hover:text-white">
          ↺ Restablecer supuestos
        </button>
      </div>
    </div>
  );
}

/** 8 · Portafolio: matriz de prioridad y ranking. */
function PanelPortafolio({ cartera, op, onPar }: Pick<ContextoPanel, "cartera" | "op" | "onPar">) {
  const sel = `${op.fuente.id}-${op.demanda.id}`;
  return (
    <div className="flex flex-col gap-3">
      <MatrizPrioridad cartera={cartera} seleccion={sel} onSel={onPar} />
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead className="text-left text-[10px] text-[#8CA8AD]">
            <tr>
              <th className="py-1">Código</th>
              <th>Par</th>
              <th>Tecnología</th>
              <th className="text-right">Ahorro</th>
              <th className="text-right">Puntaje</th>
            </tr>
          </thead>
          <tbody>
            {cartera.map((o) => {
              const id = `${o.fuente.id}-${o.demanda.id}`;
              return (
                <tr key={o.codigo} onClick={() => onPar(id)} className={`cursor-pointer border-t border-white/5 ${id === sel ? "bg-white/10" : "hover:bg-white/5"}`}>
                  <td className="py-1 pr-1">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ background: COLOR_PRIORIDAD_CSS[o.prioridad] }} /> <span className="cifra-tabular text-white">{o.codigo}</span>
                  </td>
                  <td className="text-white">
                    {o.fuente.id}→{o.demanda.id}
                  </td>
                  <td className="max-w-[6rem] truncate text-[#C9DADD]">{o.tecnologia.nombre}</td>
                  <td className="cifra-tabular text-right text-white">{usd(o.ahorroUSD)}</td>
                  <td className="cifra-tabular text-right font-semibold" style={{ color: COLOR_PRIORIDAD_CSS[o.prioridad] }}>
                    {num(o.puntaje, 2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-[#8CA8AD]">Cada fuente se asigna una sola vez: el portafolio no cuenta dos veces el mismo calor. Modelo de referencia: ESCO.</p>
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
      <div className="flex items-center gap-2 text-xs text-[#4ADE80]">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4ADE80] opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#4ADE80]" />
        </span>
        En vivo · lectura cada segundo (simulada)
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <Cifra etiqueta={`Entrada · ${op.fuente.id}`} valor={`${num(tEntra, 1)} °C`} color={cssTemperatura(tEntra)} origen="MEDIDO" />
        <Cifra etiqueta={`Entrega · ${op.demanda.id}`} valor={`${num(tSale, 1)} °C`} color={COLOR.azul} origen="MEDIDO" />
      </div>
      <div className="rounded-md border border-white/10 bg-white/5 p-2">
        <div className="flex items-baseline justify-between text-xs">
          <span className="text-[#8CA8AD]">Potencia recuperada</span>
          <span className="cifra-tabular text-white">
            {num(actual)} <span className="text-[#8CA8AD]">/ {num(esperado)} kW esperados</span>
          </span>
        </div>
        <Serie valores={serie} color={COLOR.lima} referencia={esperado} />
      </div>
      <div className={`rounded-md border p-2 text-xs ${dif <= 5 ? "border-[#4ADE80]/50 text-[#4ADE80]" : "border-[#EF4444] text-[#EF4444]"}`}>
        Conciliación entregado–esperado: {num(dif, 1)} % (tolerancia 5 %) · {dif <= 5 ? "dentro de lo pactado" : "fuera de lo pactado: se avisa a las partes"}
      </div>
      <Cifra etiqueta="Calor rescatado en el mes" valor={`${num(mwh, 1)} MWh`} color={COLOR.lima} origen="MEDIDO" />
      <ul className="flex flex-col gap-1 text-[11px]">
        {HABILITADORES.map((h) => (
          <li key={h.id} className="rounded border border-white/10 px-2 py-1">
            <b className="text-white">{h.nombre}</b> <span className="text-[#8CA8AD]">· {h.descripcion}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

async function huella(texto: string): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** 10 · Impacto: reporte del piloto, portafolio y hoja de ruta. */
function PanelImpacto({ op, cartera }: Pick<ContextoPanel, "op" | "cartera">) {
  const mes = op.energiaMWh / 12;
  const contenido = `CR-REF-2026-09-0001|${op.fuente.id}|${op.demanda.id}|${Math.round(mes)}`;
  const [hash, setHash] = useState("");
  useEffect(() => {
    void huella(contenido).then(setHash);
  }, [contenido]);
  const total = cartera.reduce((a, o) => ({ mw: a.mw + o.qUtil, usd: a.usd + o.ahorroUSD, co2: a.co2 + o.co2t }), { mw: 0, usd: 0, co2: 0 });
  const p1 = cartera.filter((o) => o.prioridad === "P1").length;
  const p2 = cartera.filter((o) => o.prioridad === "P2").length;
  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-lg border border-[#CFE84E]/50 bg-gradient-to-br from-[#0E2B30] to-[#051417] p-3">
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#CFE84E]/10 blur-2xl" />
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#8CA8AD]">Reporte de calor rescatado · demostración</p>
        <p className="font-[family-name:var(--font-titulos)] text-lg font-bold text-white">Nº CR-REF-2026-09-0001</p>
        <p className="text-[11px] text-[#8CA8AD]">
          Septiembre de 2026 · {op.fuente.id} → {op.demanda.id} · {op.tecnologia.nombre}
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Cifra etiqueta="Calor rescatado" valor={`${num(mes)} MWh`} color={COLOR.lima} origen="MEDIDO" />
          <Cifra etiqueta="Gas natural evitado" valor={`${num((mes * GAS_M3_POR_MWH) / 1000)} mil m³`} />
          <Cifra etiqueta="Ahorro del mes" valor={usd(op.ahorroUSD / 12)} />
          <Cifra etiqueta="CO₂ evitado" valor={`${num(op.co2t / 12)} t`} />
        </div>
        <div className="mt-2 flex items-end gap-2">
          <div className="grid grid-cols-8 gap-px rounded bg-white p-1" aria-hidden>
            {(hash || "0".repeat(64)).slice(0, 64).split("").map((ch, i) => (
              <span key={i} className="h-1.5 w-1.5" style={{ background: parseInt(ch, 16) % 2 ? "#051417" : "#fff" }} />
            ))}
          </div>
          <p className="min-w-0 text-[9px] text-[#8CA8AD]">
            Huella SHA-256 enlazada a las mediciones
            <span className="cifra-tabular block break-all text-white/70">{hash}</span>
          </p>
        </div>
      </div>
      <div>
        <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-[#8CA8AD]">Portafolio completo ({cartera.length} oportunidades)</p>
        <div className="grid grid-cols-3 gap-1.5">
          <Cifra etiqueta="Calor útil" valor={mw(total.mw)} color={COLOR.lima} />
          <Cifra etiqueta="Ahorro / año" valor={usd(total.usd)} color={COLOR.lima} />
          <Cifra etiqueta="CO₂ / año" valor={`${num(total.co2 / 1000, 1)} kt`} />
        </div>
      </div>
      <ol className="relative flex flex-col gap-2 border-l border-white/15 pl-4 text-xs">
        {[
          ["Fase 1 · Piloto (0–6 meses)", `${op.fuente.id} → ${op.demanda.id} con sensórica y modelo ${op.modelo.nombre}`],
          ["Fase 2 · Prefactibilidad (6–12 meses)", `${p1 > 1 ? `${p1 - 1} P1 más y ` : ""}${p2} oportunidades P2`],
          ["Fase 3 · Portafolio (12–36 meses)", "Escalar a toda la refinería y replicar en otras plantas"],
        ].map(([t, d], i) => (
          <li key={t}>
            <span className="absolute -left-[5px] mt-1 h-2.5 w-2.5 rounded-full" style={{ background: i === 0 ? COLOR.lima : COLOR.teal }} />
            <p className="font-medium text-white">{t}</p>
            <p className="text-[#8CA8AD]">{d}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function PanelPaso(ctx: ContextoPanel & { puntoSeleccionado: string | null; onPunto: (id: string) => void }) {
  switch (ctx.paso) {
    case "problema":
      return <PanelProblema />;
    case "inventario":
      return <PanelInventario onPunto={ctx.onPunto} seleccion={ctx.puntoSeleccionado} />;
    case "termico":
      return <PanelTermico paleta={ctx.paleta} onPaleta={ctx.onPaleta} intensidad={ctx.intensidad} onIntensidad={ctx.onIntensidad} />;
    case "cruce":
      return <PanelCruce pares={ctx.pares} parSeleccionado={ctx.parSeleccionado} onPar={ctx.onPar} onEvaluarPar={ctx.onEvaluarPar} op={ctx.op} />;
    case "tecnologia":
      return <PanelTecnologia op={ctx.op} onTecnologia={ctx.onTecnologia} />;
    case "modelo":
      return <PanelModelo op={ctx.op} onModelo={ctx.onModelo} supuestos={ctx.supuestos} />;
    case "evaluacion":
      return <PanelEvaluacion op={ctx.op} supuestos={ctx.supuestos} onSupuestos={ctx.onSupuestos} />;
    case "portafolio":
      return <PanelPortafolio cartera={ctx.cartera} op={ctx.op} onPar={ctx.onPar} />;
    case "monitoreo":
      return <PanelMonitoreo op={ctx.op} />;
    case "impacto":
      return <PanelImpacto op={ctx.op} cartera={ctx.cartera} />;
  }
}
