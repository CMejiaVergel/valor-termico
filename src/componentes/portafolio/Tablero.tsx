"use client";

import { useMemo, useState } from "react";
import { META_RETO, type Supuestos } from "@/dominio/escenario";
import { ID_EJEMPLO, portafolioPlanta, totales } from "@/dominio/portafolios";
import { Barras, COLOR_PRIORIDAD_CSS } from "@/componentes/graficos";
import { anios, num, usd } from "@/componentes/ui";
import { Detalle } from "./Detalle";

// Tablero del portafolio de planta (último paso): el entregable de la consultoría
// como interfaz de gestión. Consolida todas las propuestas, sus indicadores y su
// aporte a la meta; al elegir una se abre su detalle (por defecto, el ejemplo del
// chiller de absorción). `escenarios` trae el bloque del piloto y su hoja de ruta.

const ICONO: Record<string, string> = { T1: "⇄", T2: "⇡", T3: "↺", T4: "❄", T5: "ϟ" };

export function Tablero({ supuestos, modeloInicial, escenarios, compacto = false }: { supuestos: Supuestos; modeloInicial: string; escenarios: React.ReactNode; compacto?: boolean }) {
  const lista = useMemo(() => portafolioPlanta(supuestos), [supuestos]);
  const total = totales(lista);
  const [abierta, setAbierta] = useState<string | null>(compacto ? null : ID_EJEMPLO);
  const propuesta = lista.find((p) => p.id === abierta);

  if (propuesta) return <Detalle base={propuesta} supuestos={supuestos} modeloInicial={modeloInicial} onVolver={() => setAbierta(null)} />;

  const kpis = [
    { e: "Propuestas", v: String(lista.length), n: "en el portafolio de planta" },
    { e: "Calor recuperado", v: `${num(total.recuperado, 1)} MW`, n: "de las fuentes" },
    { e: "Aporte a la meta anual", v: `${num(total.aporte * 100, 1)} %`, n: `de ${num(META_RETO.pjAnio, 2)} PJ/año`, c: "#FFE14D" },
    { e: "Ahorro anual", v: usd(total.ahorro), n: "estimado", c: "#FFE14D" },
    { e: "Inversión", v: usd(total.inversion), n: "CAPEX estimado" },
    { e: "CO₂ evitado", v: `${num(total.co2 / 1000, 1)} kt/año`, n: "factor ilustrativo" },
  ];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="hud text-[10px] text-[#FFB000]">Entregable de la consultoría · Refinería de Cartagena</p>
          <h3 className="text-xl font-extrabold uppercase leading-tight text-white xl:text-2xl">Portafolio de proyectos de la planta</h3>
        </div>
        <span className="hud border border-[#F5C518]/60 px-2 py-0.5 text-[9px] text-[#F5C518]">Datos estimados · escenario ilustrativo</span>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <div key={k.e} className="border border-white/10 bg-white/5 p-2">
            <p className="text-[10px] text-[#9B9BA1]">{k.e}</p>
            <p className="cifra-tabular text-lg font-semibold leading-tight" style={{ color: k.c ?? "#fff" }}>
              {k.v}
            </p>
            <p className="text-[9px] text-[#5E5E66]">{k.n}</p>
          </div>
        ))}
      </div>
      <div className={`grid gap-3 ${compacto ? "" : "xl:grid-cols-[1.55fr_1fr]"}`}>
        <section className="border border-white/10 bg-[#0E0E10] p-3">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="hud text-[10px] text-[#FFB000]">Propuestas · toque una para ver su detalle</h4>
            <span className="text-[9px] text-[#5E5E66]">ordenadas por prioridad</span>
          </div>
          <ul className="flex flex-col gap-1.5">
            {lista.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => setAbierta(p.id)} className={`group grid w-full grid-cols-[2rem_1fr_auto] items-center gap-2 border px-2 py-2 text-left ${p.esEjemplo ? "border-[#FFE14D]/60 bg-[#FFE14D]/5" : "border-white/10 bg-white/5"} hover:border-[#FFE14D] hover:bg-[#FFE14D]/10`}>
                  <span className="flex h-8 w-8 items-center justify-center border border-white/15 text-base text-[#FFB000]">{ICONO[p.tecnologia.id] ?? "◆"}</span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-x-2 text-xs text-white">
                      <b className="cifra-tabular">{p.codigo}</b>
                      <span className="truncate">{p.titulo}</span>
                      {p.esEjemplo ? <span className="hud bg-[#FFE14D] px-1 text-[8px] text-[#0A0A0B]">Ejemplo detallado</span> : null}
                    </span>
                    <span className="block truncate text-[10px] text-[#9B9BA1]">
                      {p.fuente.id} {p.fuente.nombre} → {p.demanda.id} {p.demanda.nombre} · {p.fuente.zona}
                    </span>
                  </span>
                  <span className="cifra-tabular grid grid-cols-[4.2rem_4.6rem_3.6rem_1.6rem] items-center gap-1 text-right text-[11px] text-white">
                    <span>
                      {num(p.recuperadoMW, 1)} <small className="text-[#9B9BA1]">MW</small>
                    </span>
                    <span>{usd(p.ahorroUSD)}</span>
                    <span className="text-[#9B9BA1]">{anios(p.paybackAnios)}</span>
                    <span className="font-bold" style={{ color: COLOR_PRIORIDAD_CSS[p.prioridad] }}>
                      {p.prioridad}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="cifra-tabular mt-1 grid grid-cols-[1fr_auto] text-[9px] text-[#5E5E66]">
            <span />
            <span className="grid grid-cols-[4.2rem_4.6rem_3.6rem_1.6rem] gap-1 text-right">
              <span>recuperado</span>
              <span>ahorro/año</span>
              <span>retorno</span>
              <span>prior.</span>
            </span>
          </div>
        </section>
        <div className="flex flex-col gap-3">
          <section className="border border-white/10 bg-[#0E0E10] p-3">
            <h4 className="hud mb-2 text-[10px] text-[#FFB000]">Aporte a la meta anual por propuesta</h4>
            <Barras
              filas={lista.map((p) => ({ id: p.id, etiqueta: `${p.codigo} · ${p.titulo}`, valor: p.aporteMeta * 100, color: p.esEjemplo ? "#FFE14D" : COLOR_PRIORIDAD_CSS[p.prioridad], onClick: () => setAbierta(p.id) }))}
              formato={(n) => `${num(n, 1)} %`}
            />
          </section>
          <section className="border border-white/10 bg-[#0E0E10] p-3">
            <h4 className="hud mb-2 text-[10px] text-[#FFB000]">Piloto, escenarios y hoja de ruta</h4>
            {escenarios}
          </section>
        </div>
      </div>
    </div>
  );
}
