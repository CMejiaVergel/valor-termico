"use client";

import { useMemo, useState } from "react";
import { MODELOS, type Supuestos } from "@/dominio/escenario";
import { calculo, conModelo, flujo, hojaDeRuta, modelosPara, type Propuesta } from "@/dominio/portafolios";
import { COLOR_PRIORIDAD_CSS } from "@/componentes/graficos";
import { anios, num, usd } from "@/componentes/ui";
import { FlujoDiez } from "./FlujoDiez";
import { GemeloChiller } from "./GemeloChiller";
import { PlanoUbicacion } from "./PlanoUbicacion";

// Detalle de una propuesta del portafolio: lo que la refinería recibe por cada
// proyecto. Indicadores, ubicación en la planta, la tecnología (gemelo digital para
// el chiller de absorción), el cálculo paso a paso, el financiamiento, el impacto y
// la hoja de ruta; y el acceso al informe exportable.

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Enlace al informe de la propuesta con los supuestos y el esquema elegidos. */
export function urlInforme(p: Propuesta, modelo: string, s: Supuestos) {
  const q = new URLSearchParams({ id: p.id, m: modelo, ef: String(s.eficiencia), ce: String(s.costoEnergia), pe: String(s.precioElectricidad), h: String(s.horas), fc: String(s.factorCapex) });
  return `${BASE}/informe/?${q.toString()}`;
}

function Bloque({ titulo, children, extra }: { titulo: string; children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <section className="border border-white/10 bg-[#0E0E10] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="hud text-[10px] text-[#FFB000]">{titulo}</h4>
        {extra}
      </div>
      {children}
    </section>
  );
}

export function Detalle({ base, supuestos, modeloInicial, onVolver }: { base: Propuesta; supuestos: Supuestos; modeloInicial: string; onVolver: () => void }) {
  const opciones = modelosPara(base);
  const [modeloId, setModeloId] = useState(opciones.some((m) => m.id === modeloInicial) ? modeloInicial : "M2");
  const modelo = MODELOS.find((m) => m.id === modeloId)!;
  const p = useMemo(() => conModelo(base, modelo, supuestos), [base, modelo, supuestos]);
  const flujos = useMemo(() => opciones.map((m) => flujo(base, m, supuestos)), [opciones, base, supuestos]);
  const elegido = flujos.find((f) => f.modelo.id === modeloId)!;
  const pasos = calculo(p, supuestos);
  const hitos = hojaDeRuta(p);
  const kpis = [
    { e: "Inversión estimada", v: usd(p.capexUSD), n: "CAPEX del proyecto" },
    { e: "Ahorro anual", v: usd(p.ahorroUSD), n: p.demanda.tipo === "FRIO" ? "electricidad evitada" : "energía evitada", c: "#FFE14D" },
    { e: "Retorno simple", v: anios(p.paybackAnios), n: "CAPEX ÷ ahorro neto" },
    { e: "Calor recuperado", v: `${num(p.recuperadoMW, 2)} MW`, n: `${num(p.aporteMeta * 100, 2)} % de la meta anual` },
    { e: p.demanda.tipo === "FRIO" ? "Frío útil" : p.demanda.tipo === "ELECTRICIDAD" ? "Electricidad útil" : "Calor útil", v: `${num(p.qUtil, 2)} MW`, n: `${num(p.energiaMWh)} MWh/año` },
    { e: "CO₂ evitado", v: `${num(p.co2t)} t/año`, n: "factor ilustrativo" },
  ];
  return (
    <div className="flex flex-col gap-3">
      {/* Cabecera. */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <button type="button" onClick={onVolver} className="hud text-[10px] text-[#9B9BA1] hover:text-white">
            ← Portafolio de la planta
          </button>
          <p className="hud mt-2 text-[10px] text-[#FFB000]">
            {p.codigo} · {p.fuente.zona} · prioridad <span style={{ color: COLOR_PRIORIDAD_CSS[p.prioridad] }}>{p.prioridad}</span>
          </p>
          <h3 className="text-xl font-extrabold uppercase leading-tight text-white xl:text-2xl">{p.titulo}</h3>
          <p className="mt-1 text-xs text-[#C8C8CC]">
            <b className="text-[#FF8A3D]">▲ {p.fuente.id}</b> {p.fuente.nombre} ({p.fuente.tMin}–{p.fuente.tMax} °C) → <b className="text-[#5AC8FA]">▼ {p.demanda.id}</b> {p.demanda.nombre} ({p.demanda.rango}) · {p.tecnologia.nombre}
          </p>
        </div>
        <a href={urlInforme(p, modeloId, supuestos)} target="_blank" rel="noopener" className="hud shrink-0 bg-[#FFB000] px-3 py-2 text-[10px] font-bold text-[#0A0A0B] hover:bg-[#FFE14D]">
          ⤓ Exportar informe
        </a>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <div key={k.e} className="border border-white/10 bg-white/5 p-2">
            <p className="text-[10px] text-[#9B9BA1]">{k.e}</p>
            <p className="cifra-tabular text-base font-semibold leading-tight" style={{ color: k.c ?? "#fff" }}>
              {k.v}
            </p>
            <p className="text-[9px] text-[#5E5E66]">{k.n}</p>
          </div>
        ))}
      </div>

      <Bloque titulo={`Tecnología · ${p.tecnologia.nombre}`}>
        {p.tecnologia.id === "T4" ? (
          <GemeloChiller p={p} alto={500} />
        ) : (
          <p className="text-xs text-[#C8C8CC]">
            {p.tecnologia.descripcion} Madurez {p.tecnologia.madurez.toLowerCase()}; rendimiento de referencia {num(p.tecnologia.factor, 2)}.
          </p>
        )}
      </Bloque>

      <div className="grid gap-3 xl:grid-cols-[1.2fr_1fr]">
        <div className="flex flex-col gap-3">
          <Bloque titulo="Ubicación en la planta">
            <PlanoUbicacion p={p} alto={360} />
          </Bloque>
          <Bloque titulo="Hoja de ruta del proyecto">
            <ol className="relative flex flex-col gap-1.5 border-l border-white/15 pl-4 text-[11px]">
              {hitos.map((h, i) => (
                <li key={h.plazo}>
                  <span className="absolute -left-[5px] mt-1 h-2.5 w-2.5 rounded-full" style={{ background: i < 3 ? "#FFE14D" : "#FFB000" }} />
                  <p className="text-white">
                    <b className="cifra-tabular text-[#FFB000]">{h.plazo}</b> · {h.titulo}
                  </p>
                  <p className="text-[#9B9BA1]">{h.detalle}</p>
                </li>
              ))}
            </ol>
          </Bloque>
        </div>
        <div className="flex flex-col gap-3">
          <Bloque titulo="Financiamiento y proyección · 10 años" extra={<span className="text-[9px] text-[#5E5E66]">toque una curva</span>}>
            <div className="mb-2 flex flex-wrap gap-1">
              {opciones.map((m) => (
                <button key={m.id} type="button" onClick={() => setModeloId(m.id)} className={`border px-2 py-0.5 text-[10px] ${m.id === modeloId ? "border-[#FFE14D] bg-[#FFE14D]/10 text-white" : "border-white/10 text-[#9B9BA1] hover:text-white"}`}>
                  {m.nombre}
                </button>
              ))}
            </div>
            <FlujoDiez flujos={flujos} seleccion={modeloId} onSel={setModeloId} alto={170} />
            <p className="mt-1 text-[11px] text-[#C8C8CC]">{modelo.descripcion}</p>
            <div className="cifra-tabular mt-2 grid grid-cols-3 gap-2 text-[10px] text-[#9B9BA1]">
              <span>
                Inversión de la refinería<b className="block text-sm text-white">{usd(elegido.inversionRefineria)}</b>
              </span>
              <span>
                Ahorro neto/año para la refinería<b className="block text-sm text-white">{usd(elegido.ahorroNetoAnualRefineria)}</b>
              </span>
              <span>
                VPN 10 años (10 %)<b className="block text-sm text-[#FFE14D]">{usd(elegido.vpn)}</b>
              </span>
            </div>
          </Bloque>
          <Bloque titulo="Cálculo del ahorro">
            <table className="w-full text-[10.5px]">
              <tbody>
                {pasos.map((c) => (
                  <tr key={c.etiqueta} className="border-t border-white/5 align-top">
                    <td className="py-1 pr-2 text-white">{c.etiqueta}</td>
                    <td className="py-1 pr-2 text-[#9B9BA1]">{c.formula}</td>
                    <td className="cifra-tabular whitespace-nowrap py-1 text-right text-white">{c.valor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Bloque>
          <Bloque titulo="Impacto">
            <ul className="grid grid-cols-2 gap-2 text-[11px] text-[#C8C8CC] md:grid-cols-4">
              <li>
                <b className="cifra-tabular block text-sm text-white">{num(p.co2t)} t CO₂/año</b>emisiones evitadas
              </li>
              {p.electricidadEvitadaMWh > 0 ? (
                <li>
                  <b className="cifra-tabular block text-sm text-white">{num(p.electricidadEvitadaMWh)} MWh/año</b>electricidad que no se compra
                </li>
              ) : (
                <li>
                  <b className="cifra-tabular block text-sm text-white">{num(p.gasEvitadoM3 / 1e6, 2)} M m³/año</b>gas natural que no se quema
                </li>
              )}
              <li>
                <b className="cifra-tabular block text-sm text-white">{num(p.aporteMeta * 100, 2)} %</b>de la meta anual del reto
              </li>
              <li>
                <b className="cifra-tabular block text-sm text-white">{Math.round(p.distancia)} m</b>de tubería por rack, sin parar el proceso
              </li>
            </ul>
          </Bloque>
        </div>
      </div>
      <p className="text-[10px] text-[#5E5E66]">Cifras estimadas con los supuestos declarados en «Supuestos y fuentes». Se precisan con los datos reales de la planta antes de decidir la inversión.</p>
    </div>
  );
}
