"use client";

import { useEffect, useMemo, useState } from "react";
import { META_RETO, type IdPaso, type Supuestos } from "@/dominio/escenario";
import { ID_EJEMPLO, portafolioPlanta, totales } from "@/dominio/portafolios";
import { COLOR_PRIORIDAD_CSS } from "@/componentes/graficos";
import { anios, num, usd } from "@/componentes/ui";
import { Detalle } from "./Detalle";
import { precargarGemelo } from "./GemeloChiller";
import { BarraPrioridad, CascadaMeta, DonaTecnologia, MatrizInversion, PlanoPortafolio, colorPropuesta } from "./GraficosPortafolio";

// Tablero del portafolio de planta (paso 10): el entregable de la consultoría como
// interfaz de gestión. En 10.1 («lista») consolida las propuestas con sus gráficos;
// en 10.2 («ejemplo») abre el detalle del chiller de absorción con su gemelo digital.
// Tocar otra propuesta abre su detalle dentro del mismo tablero.

const ICONO: Record<string, string> = { T1: "⇄", T2: "⇡", T3: "↺", T4: "❄", T5: "ϟ" };

function Tarjeta({ titulo, nota, children, className = "" }: { titulo: string; nota?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`border border-white/10 bg-[#0E0E10] p-3 ${className}`}>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h4 className="hud text-[10px] text-[#FFB000]">{titulo}</h4>
        {nota ? <span className="text-[9px] text-[#5E5E66]">{nota}</span> : null}
      </div>
      {children}
    </section>
  );
}

export function Tablero({ supuestos, modeloInicial, escenarios, compacto = false, vista = "lista", onIrPaso }: { supuestos: Supuestos; modeloInicial: string; escenarios: React.ReactNode; compacto?: boolean; vista?: "lista" | "ejemplo"; onIrPaso?: (id: IdPaso) => void }) {
  const lista = useMemo(() => portafolioPlanta(supuestos), [supuestos]);
  const total = totales(lista);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [foco, setFoco] = useState<string | null>(null);
  // Mientras se ve el portafolio se descarga el motor 3D: el gemelo del 10.2 abre sin espera.
  useEffect(() => {
    precargarGemelo().catch(() => {});
  }, []);

  if (vista === "ejemplo") {
    const ejemplo = lista.find((p) => p.id === ID_EJEMPLO) ?? lista[0]!;
    return <Detalle base={ejemplo} supuestos={supuestos} modeloInicial={modeloInicial} onVolver={() => onIrPaso?.("impacto")} />;
  }
  const propuesta = lista.find((p) => p.id === abierta);
  if (propuesta) return <Detalle base={propuesta} supuestos={supuestos} modeloInicial={modeloInicial} onVolver={() => setAbierta(null)} />;

  const abrir = (id: string) => (id === ID_EJEMPLO && onIrPaso ? onIrPaso("ejemplo") : setAbierta(id));
  const grafico = { lista, foco, onFoco: setFoco, onAbrir: abrir };
  const retornoMedio = total.inversion / Math.max(1, total.ahorro);
  const kpis = [
    { e: "Propuestas", v: String(lista.length), n: `${new Set(lista.map((p) => p.tecnologia.id)).size} tecnologías` },
    { e: "Calor recuperado", v: `${num(total.recuperado, 1)} MW`, n: `${num(total.util, 1)} MW útiles` },
    { e: "Aporte a la meta anual", v: `${num(total.aporte * 100, 1)} %`, n: `de ${num(META_RETO.pjAnio, 2)} PJ/año`, c: "#FFE14D" },
    { e: "Ahorro anual", v: usd(total.ahorro), n: "estimado", c: "#FFE14D" },
    { e: "Inversión", v: usd(total.inversion), n: `retorno medio ${anios(retornoMedio)}` },
    { e: "CO₂ evitado", v: `${num(total.co2 / 1000, 1)} kt/año`, n: "factor ilustrativo" },
  ];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="hud text-[10px] text-[#FFB000]">Entregable de la consultoría · Refinería de Cartagena</p>
          <h3 className="text-xl font-extrabold uppercase leading-tight text-white xl:text-2xl">Portafolio de proyectos de la planta</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="hud border border-[#F5C518]/60 px-2 py-0.5 text-[9px] text-[#F5C518]">Datos estimados · escenario ilustrativo</span>
          <button type="button" onClick={() => abrir(ID_EJEMPLO)} className="hud bg-[#FFB000] px-3 py-1.5 text-[10px] font-bold text-[#0A0A0B] hover:bg-[#FFE14D]">
            Ver ejemplo detallado →
          </button>
        </div>
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

      <div className={`grid gap-3 ${compacto ? "" : "xl:grid-cols-[1.3fr_1fr]"}`}>
        <Tarjeta titulo="Propuestas · toque una para ver su detalle" nota="ordenadas por prioridad">
          <ul className="flex flex-col gap-1.5" onMouseLeave={() => setFoco(null)}>
            {lista.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => abrir(p.id)}
                  onMouseEnter={() => setFoco(p.id)}
                  className={`group grid w-full grid-cols-[2rem_1fr_auto] items-center gap-2 border px-2 py-1.5 text-left ${p.esEjemplo ? "border-[#FFE14D]/60 bg-[#FFE14D]/5" : "border-white/10 bg-white/5"} ${foco === p.id ? "border-[#FFE14D] bg-[#FFE14D]/10" : ""} hover:border-[#FFE14D] hover:bg-[#FFE14D]/10`}
                >
                  <span className="relative flex h-8 w-8 items-center justify-center border border-white/15 text-base text-[#FFB000]">
                    {ICONO[p.tecnologia.id] ?? "◆"}
                    <span className="cifra-tabular absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-[#0A0A0B]" style={{ background: colorPropuesta(p) }}>
                      {Number(p.codigo.replace(/\D/g, "")) || ""}
                    </span>
                  </span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-x-2 text-xs text-white">
                      <b className="cifra-tabular">{p.codigo}</b>
                      <span className="truncate">{p.titulo}</span>
                      {p.esEjemplo ? <span className="hud bg-[#FFE14D] px-1 text-[8px] text-[#0A0A0B]">Ejemplo detallado · 10.2</span> : null}
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
          <div className="mt-3 border-t border-white/10 pt-2">
            <p className="hud mb-1.5 text-[9px] text-[#9B9BA1]">Calor recuperado por prioridad</p>
            <BarraPrioridad lista={lista} />
          </div>
        </Tarjeta>
        <Tarjeta titulo="Dónde están en la planta" nota="número = propuesta · toque una tubería">
          <PlanoPortafolio {...grafico} alto={compacto ? 220 : 452} />
        </Tarjeta>
      </div>

      <div className={`grid gap-3 ${compacto ? "" : "lg:grid-cols-2 xl:grid-cols-3"}`}>
        <Tarjeta titulo="Aporte acumulado a la meta anual" nota={`${num(total.aporte * 100, 1)} % con las ${lista.length}`}>
          <CascadaMeta {...grafico} />
        </Tarjeta>
        <Tarjeta titulo="Inversión frente a ahorro" nota="tamaño = MW recuperados">
          <MatrizInversion {...grafico} />
        </Tarjeta>
        <Tarjeta titulo="Ahorro anual por tecnología" nota="lo que propone el agente de IA" className="lg:col-span-2 xl:col-span-1">
          <DonaTecnologia lista={lista} />
          <p className="mt-2 text-[10px] leading-snug text-[#9B9BA1]">
            Tecnologías existentes y probadas. El valor está en saber cuál usar, dónde y por qué. Diagonales de la matriz: años de retorno simple (inversión ÷ ahorro).
          </p>
        </Tarjeta>
      </div>

      <Tarjeta titulo="Piloto, escenarios y hoja de ruta">{escenarios}</Tarjeta>
    </div>
  );
}
