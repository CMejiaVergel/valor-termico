"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { FUENTES_DATOS, META_RETO, MODELOS, SUPUESTOS_INICIALES, type Supuestos } from "@/dominio/escenario";
import { ANIOS_FLUJO, ID_EJEMPLO, TASA_DESCUENTO, calculo, conModelo, flujo, hojaDeRuta, modelosPara, portafolioPlanta, totales } from "@/dominio/portafolios";
import { COMPONENTES } from "@/componentes/portafolio/GemeloChiller";
import { FlujoDiez } from "@/componentes/portafolio/FlujoDiez";
import { PlanoUbicacion } from "@/componentes/portafolio/PlanoUbicacion";
import { ALIADOS } from "@/componentes/Firmas";
import { anios, num, usd } from "@/componentes/ui";

// Informe de una propuesta del portafolio, en formato de documento A4: portada,
// tabla de contenido, introducción, resumen ejecutivo y el desarrollo de cada dato
// (fuente y demanda, ubicación, tecnología, cálculo, indicadores, financiamiento,
// impacto, hoja de ruta, riesgos y supuestos). Es un informe técnico, no una
// propuesta comercial: no incluye el valor de la consultoría.

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const FECHA = "27 de octubre de 2026";

function numero(v: string | null, def: number) {
  const n = Number(v);
  return v !== null && Number.isFinite(n) ? n : def;
}

const SECCIONES = [
  "Introducción",
  "Resumen ejecutivo",
  "Contexto y meta del reto",
  "Fuente de calor y demanda",
  "Ubicación en la planta",
  "Tecnología propuesta",
  "Cálculo del ahorro",
  "Indicadores del proyecto",
  "Financiamiento y proyección",
  "Impacto ambiental y operativo",
  "Hoja de ruta",
  "Riesgos y recomendaciones",
  "Supuestos y fuentes",
];

function Pagina({ n, codigo, children }: { n: number; codigo: string; children: React.ReactNode }) {
  return (
    <section className="vt-pagina">
      <header className="flex items-center justify-between bg-[#0D0D0D] px-[14mm] py-[4mm]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${BASE}/marca/valor-termico.png`} alt="Valor Térmico" className="h-[6mm] w-auto" />
        <span className="font-[family-name:var(--font-mono)] text-[8pt] uppercase tracking-[0.14em] text-[#9B9BA1]">{codigo}</span>
      </header>
      <div className="flex-1 px-[16mm] py-[10mm]">{children}</div>
      <footer className="flex items-center justify-between border-t border-[#E4E4E7] px-[16mm] py-[4mm] text-[7.5pt] text-[#6E6E76]">
        <span>Valor Térmico · PDI Advanced · Documento ilustrativo con cifras estimadas</span>
        <span>Página {n}</span>
      </footer>
    </section>
  );
}

function H({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h2 className="mb-[3mm] mt-[6mm] flex items-baseline gap-[3mm] border-b-2 border-[#FFB000] pb-[1.5mm] text-[14pt] font-extrabold uppercase text-[#0A0A0B] first:mt-0">
      <span className="font-[family-name:var(--font-mono)] text-[#B45309]">{String(n).padStart(2, "0")}</span>
      {children}
    </h2>
  );
}

const P = ({ children }: { children: React.ReactNode }) => <p className="mb-[2.5mm] text-[9.5pt] leading-[1.5] text-[#2A2A30]">{children}</p>;

/** Tabla del informe. `numerica`: la última columna es una cifra (monoespaciada, a la derecha). `densa`: filas más bajas. */
function Tabla({ filas, cabecera, numerica = true, densa = false }: { filas: Array<Array<React.ReactNode>>; cabecera?: string[]; numerica?: boolean; densa?: boolean }) {
  const celda = densa ? "px-[1.5mm] py-[0.6mm]" : "px-[2mm] py-[1.2mm]";
  return (
    <table className="mb-[3mm] w-full border-collapse text-[8.5pt]">
      {cabecera ? (
        <thead>
          <tr className="bg-[#F4F4F5] text-left">
            {cabecera.map((c) => (
              <th key={c} className={`border border-[#E4E4E7] ${celda} font-semibold text-[#0A0A0B]`}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
      ) : null}
      <tbody>
        {filas.map((f, i) => (
          <tr key={i}>
            {f.map((c, j) => (
              <td key={j} className={`border border-[#E4E4E7] ${celda} align-top text-[#2A2A30] ${numerica && j === f.length - 1 ? "font-[family-name:var(--font-mono)] whitespace-nowrap text-right" : ""}`}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Esquema 2D del ciclo de absorción para el documento impreso (el gemelo 3D vive en la plataforma). */
function EsquemaAbsorcion() {
  const caja = (x: number, y: number, t: string, c: string) => (
    <g>
      <rect x={x} y={y} width={150} height={56} rx={6} fill={c} />
      <text x={x + 75} y={y + 33} textAnchor="middle" fontSize={13} fontWeight={700} fill="#fff" fontFamily="JetBrains Mono, monospace">{t}</text>
    </g>
  );
  const flecha = (d: string, c: string, t?: [number, number, string]) => (
    <g>
      <path d={d} fill="none" stroke={c} strokeWidth={3} markerEnd={`url(#p-${c.slice(1)})`} />
      {t ? <text x={t[0]} y={t[1]} fontSize={10} fill="#3A3A40" fontFamily="IBM Plex Sans, sans-serif">{t[2]}</text> : null}
    </g>
  );
  const colores = ["#FF5A1F", "#5AC8FA", "#22A06B", "#6E6E76", "#8B5CF6"];
  return (
    <svg viewBox="0 0 640 300" className="mb-[3mm] w-full" role="img" aria-label="Esquema del ciclo de absorción">
      <defs>
        {colores.map((c) => (
          <marker key={c} id={`p-${c.slice(1)}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={c} />
          </marker>
        ))}
      </defs>
      {caja(150, 40, "GENERADOR", "#C2552A")}
      {caja(360, 40, "CONDENSADOR", "#2A8F7A")}
      {caja(360, 190, "EVAPORADOR", "#2F6FA8")}
      {caja(150, 190, "ABSORBEDOR", "#6A4AA3")}
      {flecha("M20,68 L146,68", "#FF5A1F", [18, 58, "Vapor de la fuente"])}
      {flecha("M302,60 L356,60", "#6E6E76", [292, 50, "vapor de agua"])}
      {flecha("M435,98 L435,186", "#6E6E76", [442, 145, "agua líquida"])}
      {flecha("M356,220 L304,220", "#6E6E76", [300, 240, "vapor (al vacío)"])}
      {flecha("M210,186 L210,100", "#8B5CF6", [96, 150, "solución diluida (bomba)"])}
      {flecha("M250,100 L250,186", "#8B5CF6", [256, 150, "concentrada"])}
      {flecha("M512,218 L630,218", "#5AC8FA", [520, 208, "Agua helada 7 °C →"])}
      {flecha("M630,238 L514,238", "#5AC8FA", [540, 256, "retorno 12 °C"])}
      {flecha("M225,290 L225,250", "#22A06B", [234, 282, "agua de torre 30 °C"])}
      {flecha("M512,60 L600,60", "#22A06B", [520, 50, "a la torre 35 °C"])}
    </svg>
  );
}

export function Informe() {
  const q = useSearchParams();
  const s: Supuestos = {
    eficiencia: numero(q.get("ef"), SUPUESTOS_INICIALES.eficiencia),
    costoEnergia: numero(q.get("ce"), SUPUESTOS_INICIALES.costoEnergia),
    precioElectricidad: numero(q.get("pe"), SUPUESTOS_INICIALES.precioElectricidad),
    horas: numero(q.get("h"), SUPUESTOS_INICIALES.horas),
    factorCapex: numero(q.get("fc"), SUPUESTOS_INICIALES.factorCapex),
  };
  const id = q.get("id") ?? ID_EJEMPLO;
  const lista = useMemo(() => portafolioPlanta(s), [s.eficiencia, s.costoEnergia, s.precioElectricidad, s.horas, s.factorCapex]); // eslint-disable-line react-hooks/exhaustive-deps
  const base = lista.find((p) => p.id === id) ?? lista.find((p) => p.esEjemplo) ?? lista[0]!;
  const modelo = MODELOS.find((m) => m.id === q.get("m")) ?? MODELOS.find((m) => m.id === "M2")!;
  const p = conModelo(base, modelo, s);
  const flujos = modelosPara(base).map((m) => flujo(base, m, s));
  const elegido = flujos.find((f) => f.modelo.id === modelo.id) ?? flujos[0]!;
  const pasos = calculo(p, s);
  const hitos = hojaDeRuta(p);
  const total = totales(lista);
  const codigo = `VT-INF-2026-${p.codigo.replace("OT-", "")}`;
  const frio = p.demanda.tipo === "FRIO";
  let n = 1;

  return (
    <div className="vt-informe min-h-screen bg-[#3A3A40] py-6 print:bg-white print:py-0">
      <div className="vt-sin-imprimir fixed inset-x-0 top-0 z-10 flex items-center justify-between gap-3 bg-[#0A0A0B] px-4 py-2 text-[11px] text-[#EDEDED]">
        <span className="hud text-[10px] text-[#FFB000]">Vista de documento · {codigo}</span>
        <span className="flex gap-2">
          <a href={`${BASE}/`} className="border border-white/20 px-3 py-1 hover:bg-white/10">
            ← Volver al prototipo
          </a>
          <button type="button" onClick={() => window.print()} className="bg-[#FFB000] px-3 py-1 font-bold text-[#0A0A0B] hover:bg-[#FFE14D]">
            ⤓ Imprimir / Guardar como PDF
          </button>
        </span>
      </div>

      <div className="mx-auto flex flex-col items-center gap-6 pt-8 print:gap-0 print:pt-0">
        {/* Portada. */}
        <section className="vt-pagina relative justify-between bg-[#0D0D0D] text-[#EDEDED]">
          <div className="px-[18mm] pt-[22mm]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${BASE}/marca/valor-termico.png`} alt="Valor Térmico" className="w-[120mm]" />
            <div className="mt-[4mm] h-[2mm] w-[118mm]" style={{ background: "var(--ironbow)" }} />
            <p className="mt-[16mm] font-[family-name:var(--font-mono)] text-[9pt] uppercase tracking-[0.2em] text-[#FFB000]">Informe de propuesta de aprovechamiento térmico</p>
            <h1 className="mt-[3mm] text-[26pt] font-extrabold uppercase leading-[1.05] text-white">{p.titulo}</h1>
            <p className="mt-[3mm] text-[11pt] text-[#C8C8CC]">
              {p.fuente.nombre} ({p.fuente.id}) → {p.demanda.nombre} ({p.demanda.id}) · {p.fuente.zona}
            </p>
            <dl className="mt-[14mm] grid grid-cols-2 gap-x-[10mm] gap-y-[5mm] text-[9.5pt]">
              {[
                ["Cliente", "Refinería de Cartagena"],
                ["Emisor", "PDI Advanced · Engineering Solutions"],
                ["Documento", codigo],
                ["Fecha", FECHA],
                ["Propuesta", `${p.codigo} · prioridad ${p.prioridad}`],
                ["Esquema de financiamiento evaluado", modelo.nombre],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="font-[family-name:var(--font-mono)] text-[7.5pt] uppercase tracking-[0.16em] text-[#6E6E76]">{k}</dt>
                  <dd className="mt-[1mm] text-white">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="px-[18mm] pb-[16mm]">
            <p className="mb-[8mm] border-l-2 border-[#F5C518] pl-[3mm] text-[8.5pt] text-[#F5C518]">Documento ilustrativo: ubicaciones de procesos y cifras estimadas sobre un escenario de ejemplo. No contiene datos reales de la planta.</p>
            <div className="flex items-end justify-between gap-[8mm] border-t border-white/15 pt-[6mm]">
              <div>
                <p className="mb-[2mm] font-[family-name:var(--font-mono)] text-[7pt] uppercase tracking-[0.16em] text-[#6E6E76]">Una solución de</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${BASE}/marca/pdi-advanced-oscuro.png`} alt="PDI Advanced" className="h-[16mm] w-auto" />
              </div>
              <div className="text-right">
                <p className="mb-[2mm] font-[family-name:var(--font-mono)] text-[7pt] uppercase tracking-[0.16em] text-[#6E6E76]">Aliados</p>
                <div className="flex items-center gap-[5mm]">
                  {ALIADOS.map((a) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={a.archivo} src={`${BASE}/marca/${a.archivo}`} alt={a.nombre} style={{ height: `${a.alto * 0.32}mm` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contenido, introducción y resumen. */}
        <Pagina n={2} codigo={codigo}>
          <h2 className="mb-[4mm] text-[14pt] font-extrabold uppercase text-[#0A0A0B]">Tabla de contenido</h2>
          <ol className="mb-[8mm] grid grid-cols-2 gap-x-[10mm] gap-y-[1.5mm] text-[9.5pt] text-[#2A2A30]">
            {SECCIONES.map((t, i) => (
              <li key={t} className="flex gap-[3mm] border-b border-dotted border-[#D4D4D8] pb-[1mm]">
                <span className="font-[family-name:var(--font-mono)] text-[#B45309]">{String(i + 1).padStart(2, "0")}</span>
                {t}
              </li>
            ))}
          </ol>
          <H n={n++}>Introducción</H>
          <P>
            Este informe documenta la propuesta {p.codigo} del portafolio de aprovechamiento térmico elaborado para la Refinería de Cartagena dentro del reto de ahorrar {META_RETO.pj} PJ de energía térmica en {META_RETO.anios} años. La propuesta resulta de la consultoría especializada de PDI Advanced, apoyada en la plataforma Valor Térmico: consolidación de los datos térmicos de la planta, mapa de calor, análisis de compatibilidad entre fuentes y usos, y recomendación de tecnología con sus indicadores estimados.
          </P>
          <P>
            El documento explica de dónde sale cada cifra. Las ubicaciones y los valores corresponden a un escenario ilustrativo; con los datos reales de la planta se recalculan antes de decidir la inversión.
          </P>
          <H n={n++}>Resumen ejecutivo</H>
          <P>
            Se propone {p.titulo.toLowerCase()}: aprovechar {num(p.recuperadoMW, 2)} MW del {p.fuente.nombre.toLowerCase()} ({p.fuente.tMin}–{p.fuente.tMax} °C) para atender {p.demanda.nombre.toLowerCase()} con un {p.tecnologia.nombre.toLowerCase()}. El proyecto entrega {num(p.qUtil, 2)} MW de {frio ? "frío" : p.demanda.tipo === "ELECTRICIDAD" ? "electricidad" : "calor"} útil, ahorra cerca de {usd(p.ahorroUSD)} al año y recupera su inversión estimada de {usd(p.capexUSD)} en {anios(p.paybackAnios)}.
          </P>
          <div className="mb-[3mm] grid grid-cols-3 gap-[3mm]">
            {[
              ["Inversión estimada", usd(p.capexUSD)],
              ["Ahorro anual", usd(p.ahorroUSD)],
              ["Retorno simple", anios(p.paybackAnios)],
              ["Calor recuperado", `${num(p.recuperadoMW, 2)} MW`],
              ["Aporte a la meta anual", `${num(p.aporteMeta * 100, 2)} %`],
              ["CO₂ evitado", `${num(p.co2t)} t/año`],
            ].map(([k, v]) => (
              <div key={k} className="border-t-2 border-[#FFB000] bg-[#F7F7F8] px-[3mm] py-[2mm]">
                <p className="text-[7.5pt] uppercase tracking-[0.08em] text-[#6E6E76]">{k}</p>
                <p className="font-[family-name:var(--font-mono)] text-[13pt] font-bold text-[#0A0A0B]">{v}</p>
              </div>
            ))}
          </div>
          <P>
            Dentro del portafolio de la planta ({lista.length} propuestas, {num(total.recuperado, 1)} MW recuperados y un ahorro estimado de {usd(total.ahorro)} al año), esta propuesta tiene prioridad {p.prioridad} ({p.nivelPrioridad.toLowerCase()}). Recomendación: {p.accion.toLowerCase()}.
          </P>
        </Pagina>

        {/* Contexto, fuente y demanda, ubicación. */}
        <Pagina n={3} codigo={codigo}>
          <H n={n++}>Contexto y meta del reto</H>
          <P>
            La refinería fijó la meta de ahorrar {META_RETO.pj} PJ de energía térmica en {META_RETO.anios} años ({num(META_RETO.pjAnio, 2)} PJ/año), unos {META_RETO.mwPromedio} MW térmicos sostenidos durante {num(s.horas)} h al año. Cada megavatio recuperado equivale a cerca del 1,7 % de la meta anual. Esta propuesta aporta {num(p.aporteMeta * 100, 2)} %.
          </P>
          {frio ? (
            <P>
              Nota: un chiller de absorción ahorra electricidad (la que consumiría un chiller eléctrico), no combustible. Se debe validar con la refinería si ese ahorro cuenta para la meta térmica o se reporta aparte.
            </P>
          ) : null}
          <H n={n++}>Fuente de calor y demanda</H>
          <Tabla
            numerica={false}
            cabecera={["Dato", "Fuente", "Demanda"]}
            filas={[
              ["Identificador", `${p.fuente.id} · ${p.fuente.nombre}`, `${p.demanda.id} · ${p.demanda.nombre}`],
              ["Ubicación", `${p.fuente.ubicacion} (${p.fuente.zona})`, p.demanda.ubicacion],
              ["Temperatura", `${p.fuente.tMin}–${p.fuente.tMax} °C`, p.demanda.rango],
              ["Potencia", `${p.fuente.potencia} MW térmicos`, `${p.demanda.potencia} MW`],
              ["Continuidad", p.fuente.continuidad, "Según operación de la demanda"],
              ["Origen del dato", p.fuente.origen.toLowerCase(), p.demanda.origen.toLowerCase()],
            ]}
          />
          <H n={n++}>Ubicación en la planta</H>
          <PlanoUbicacion p={p} claro animado={false} alto={300} />
          <P>
            La tubería propuesta sale de {p.fuente.ubicacion.toLowerCase()} por el rack hasta {p.demanda.ubicacion.toLowerCase()}: cerca de {Math.round(p.distancia)} m. El equipo se ubica junto a la demanda para acortar el tramo de agua helada.
          </P>
        </Pagina>

        {/* Tecnología. */}
        <Pagina n={4} codigo={codigo}>
          <H n={n++}>Tecnología propuesta</H>
          <P>
            {p.tecnologia.nombre}: {p.tecnologia.descripcion} Madurez {p.tecnologia.madurez.toLowerCase()}. Rendimiento de referencia: {num(p.tecnologia.factor, 2)} {frio ? "(COP)" : ""}. La tecnología existe en el mercado; el aporte de la consultoría es definir cuándo, dónde y por qué conviene instalarla.
          </P>
          {p.tecnologia.id === "T4" ? (
            <>
              <EsquemaAbsorcion />
              <Tabla numerica={false} cabecera={["Componente", "Función"]} filas={COMPONENTES.map((c) => [c.nombre, c.texto])} />
              <P>En la plataforma, este equipo se presenta como un gemelo digital 3D con los flujos animados de vapor, solución, refrigerante, agua helada y agua de torre.</P>
            </>
          ) : null}
        </Pagina>

        {/* Cálculo e indicadores. */}
        <Pagina n={5} codigo={codigo}>
          <H n={n++}>Cálculo del ahorro</H>
          <Tabla cabecera={["Concepto", "Cálculo", "Resultado"]} filas={pasos.map((c) => [c.etiqueta, c.formula, c.valor])} />
          <H n={n++}>Indicadores del proyecto</H>
          <Tabla
            cabecera={["Indicador", "Valor estimado"]}
            filas={[
              ["Inversión (CAPEX)", usd(p.capexUSD)],
              ["Operación y mantenimiento anual", usd(p.opexUSD)],
              ["Ahorro anual", usd(p.ahorroUSD)],
              ["Retorno simple", anios(p.paybackAnios)],
              [`Valor presente neto a ${ANIOS_FLUJO} años (${Math.round(TASA_DESCUENTO * 100)} %), ${modelo.nombre}`, usd(elegido.vpn)],
              ["Calor recuperado de la fuente", `${num(p.recuperadoMW, 2)} MW`],
              ["Energía útil al año", `${num(p.energiaMWh)} MWh`],
              ["Aporte a la meta anual del reto", `${num(p.aporteMeta * 100, 2)} %`],
              ["Puntaje de priorización (8 criterios)", `${num(p.puntaje, 2)} / 5 · ${p.prioridad}`],
              ["Riesgo", p.riesgo],
            ]}
          />
        </Pagina>

        {/* Financiamiento. */}
        <Pagina n={6} codigo={codigo}>
          <H n={n++}>Financiamiento y proyección</H>
          <P>
            Esquema evaluado: <b>{modelo.nombre}</b>. {modelo.descripcion} La gráfica compara el flujo de caja acumulado de la refinería a {ANIOS_FLUJO} años en cada esquema aplicable; las participaciones de cada esquema son de referencia y se negocian con quien financie.
          </P>
          <FlujoDiez flujos={flujos} seleccion={modelo.id} claro alto={240} />
          <Tabla
            cabecera={["Esquema", "Inversión de la refinería", "Ahorro neto anual para la refinería", `Acumulado año ${ANIOS_FLUJO}`, `VPN (${Math.round(TASA_DESCUENTO * 100)} %)`]}
            filas={flujos.map((f) => [f.modelo.id === modelo.id ? <b key="n">{f.modelo.nombre}</b> : f.modelo.nombre, usd(f.inversionRefineria), usd(f.ahorroNetoAnualRefineria), usd(f.acumulado[ANIOS_FLUJO]!), usd(f.vpn)])}
          />
          <P>Incentivos aplicables con certificación UPME (Ley 1715 de 2014 y Ley 2099 de 2021): deducción en renta, exclusión de IVA y exención de aranceles para equipos. No están incluidos en las cifras.</P>
        </Pagina>

        {/* Impacto, hoja de ruta, riesgos y supuestos. */}
        <Pagina n={7} codigo={codigo}>
          <H n={n++}>Impacto ambiental y operativo</H>
          <Tabla
            cabecera={["Impacto", "Estimado"]}
            filas={[
              ["Emisiones de CO₂ evitadas", `${num(p.co2t)} t/año`],
              frio || p.demanda.tipo === "ELECTRICIDAD" ? ["Electricidad que no se compra", `${num(p.electricidadEvitadaMWh)} MWh/año`] : ["Gas natural que no se quema", `${num(p.gasEvitadoM3 / 1e6, 2)} millones de m³/año`],
              ["Calor que deja de disiparse", `${num(p.recuperadoMW * s.horas)} MWh/año`],
              ["Tubería nueva por rack", `≈ ${Math.round(p.distancia)} m`],
            ]}
          />
          <H n={n++}>Hoja de ruta</H>
          <Tabla numerica={false} cabecera={["Plazo", "Etapa", "Actividades"]} filas={hitos.map((h) => [h.plazo, h.titulo, h.detalle])} />
          <H n={n++}>Riesgos y recomendaciones</H>
          <ul className="mb-[3mm] list-disc pl-[5mm] text-[9pt] leading-[1.5] text-[#2A2A30]">
            <li>Validar con mediciones la temperatura, el caudal y las horas de operación de {p.fuente.id} y {p.demanda.id} antes de dimensionar.</li>
            <li>Confirmar el punto de conexión y si el montaje requiere parada programada.</li>
            <li>Cotizar el equipo y la tubería: el CAPEX de este informe es un orden de magnitud.</li>
            <li>Definir la línea base y el plan de medición y verificación (IPMVP) antes de operar.</li>
          </ul>
        </Pagina>

        <Pagina n={8} codigo={codigo}>
          <H n={n++}>Supuestos y fuentes</H>
          <Tabla
            numerica={false}
            densa
            cabecera={["Dato", "Valor", "Tipo"]}
            filas={FUENTES_DATOS.map((d) => [
              <span key="d">
                <b>{d.dato}</b>
                <span className="block text-[6.8pt] leading-[1.3] text-[#6E6E76]">
                  {d.explicacion}
                  {d.fuente ? ` Fuente: ${d.fuente.nombre}.` : ""}
                </span>
              </span>,
              d.valor,
              d.tipo.toLowerCase(),
            ])}
          />
          <div className="mt-[8mm] flex items-end justify-between border-t border-[#E4E4E7] pt-[4mm] text-[8.5pt] text-[#2A2A30]">
            <div>
              <p className="text-[7.5pt] uppercase tracking-[0.14em] text-[#6E6E76]">Elaborado por</p>
              <p className="font-semibold">PDI Advanced · Engineering Solutions</p>
              <p>Plataforma Valor Térmico · {FECHA}</p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${BASE}/marca/pdi-advanced-claro.png`} alt="PDI Advanced" className="h-[12mm] w-auto" />
          </div>
        </Pagina>
      </div>
    </div>
  );
}
