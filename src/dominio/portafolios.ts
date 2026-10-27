// Portafolio de planta: las propuestas que la consultoría consolida al final del
// proceso (el entregable). Cada propuesta sale del motor (evaluar/portafolio) y aquí
// se completa con lo que necesita el tablero y el informe: título, cálculo paso a
// paso, flujo de caja a 10 años según el esquema de financiamiento, hoja de ruta e
// impacto. Todo es ESTIMADO sobre el escenario ilustrativo.

import { COP_CHILLER_ELECTRICO, GAS_M3_POR_MWH, MODELOS, fraccionMeta, precioMWh, type ModeloNegocio, type Supuestos } from "./escenario";
import { evaluar, portafolio, rutaTuberia, type Oportunidad } from "./motor";

/** Propuesta que se muestra en detalle en el tablero y en el informe de ejemplo. */
export const ID_EJEMPLO = "F1-D1";
/** Tasa de descuento para el valor presente neto (supuesto financiero). */
export const TASA_DESCUENTO = 0.1;
export const ANIOS_FLUJO = 10;

const TITULO: Record<string, string> = {
  T1: "Reúso de calor en proceso",
  T2: "Calor elevado con bomba de calor",
  T3: "Retorno de condensado a calderas",
  T4: "Climatización con chiller de absorción",
  T5: "Generación eléctrica con ciclo ORC",
};

export interface PasoCalculo {
  etiqueta: string;
  formula: string;
  valor: string;
}

export interface Hito {
  plazo: string;
  titulo: string;
  detalle: string;
}

export interface Propuesta extends Oportunidad {
  id: string;
  titulo: string;
  /** MW de calor que se toman de la fuente. */
  recuperadoMW: number;
  /** Fracción de la meta anual del reto que aporta. */
  aporteMeta: number;
  /** MWh eléctricos que deja de consumir (frío y electricidad). */
  electricidadEvitadaMWh: number;
  /** m³ de gas natural que deja de quemar (calor). */
  gasEvitadoM3: number;
  precioMWh: number;
  esEjemplo: boolean;
}

/** Las propuestas de la planta, en el orden del portafolio, con el ejemplo marcado. */
export function portafolioPlanta(s: Supuestos, maximo = 10): Propuesta[] {
  return portafolio(s, maximo).map((o) => completar(o, s));
}

export function completar(o: Oportunidad, s: Supuestos): Propuesta {
  const id = `${o.fuente.id}-${o.demanda.id}`;
  const tipo = o.demanda.tipo;
  return {
    ...o,
    id,
    titulo: TITULO[o.tecnologia.id] ?? o.tecnologia.nombre,
    recuperadoMW: o.qAprovechado,
    aporteMeta: fraccionMeta(o.qAprovechado, s.horas),
    electricidadEvitadaMWh: tipo === "FRIO" ? o.energiaMWh / COP_CHILLER_ELECTRICO : tipo === "ELECTRICIDAD" ? o.energiaMWh : 0,
    gasEvitadoM3: tipo === "CALOR" ? o.energiaMWh * GAS_M3_POR_MWH : 0,
    precioMWh: precioMWh(tipo, s),
    esEjemplo: id === ID_EJEMPLO,
  };
}

/** La misma propuesta evaluada con otro esquema de financiamiento. */
export function conModelo(p: Propuesta, m: ModeloNegocio, s: Supuestos): Propuesta {
  const e = evaluar(p.fuente, p.demanda, p.tecnologia, m, s, p.qAprovechado);
  return { ...p, ...e, id: p.id, titulo: p.titulo, codigo: p.codigo, par: p.par, x: p.x, y: p.y, recuperadoMW: p.recuperadoMW, aporteMeta: p.aporteMeta, electricidadEvitadaMWh: p.electricidadEvitadaMWh, gasEvitadoM3: p.gasEvitadoM3, precioMWh: p.precioMWh, esEjemplo: p.esEjemplo };
}

export interface Flujo {
  modelo: ModeloNegocio;
  /** Flujo acumulado de la refinería, años 0..ANIOS_FLUJO. */
  acumulado: number[];
  /** Valor presente neto de la refinería a la tasa de descuento. */
  vpn: number;
  inversionRefineria: number;
  ahorroNetoAnualRefineria: number;
}

/** Flujo de caja de la refinería con un esquema: inversión en el año 0 y su parte del ahorro neto cada año. */
export function flujo(p: Propuesta, m: ModeloNegocio, s: Supuestos): Flujo {
  const e = evaluar(p.fuente, p.demanda, p.tecnologia, m, s, p.qAprovechado);
  const neto = (e.ahorroUSD - e.opexUSD) * m.participacionCliente;
  const acumulado = Array.from({ length: ANIOS_FLUJO + 1 }, (_, a) => -e.inversionCliente + neto * a);
  let vpn = -e.inversionCliente;
  for (let a = 1; a <= ANIOS_FLUJO; a++) vpn += neto / (1 + TASA_DESCUENTO) ** a;
  return { modelo: m, acumulado, vpn, inversionRefineria: e.inversionCliente, ahorroNetoAnualRefineria: neto };
}

/** Esquemas aplicables a la propuesta (Cooling as a Service solo para frío). */
export const modelosPara = (p: Propuesta) => MODELOS.filter((m) => !m.soloPara || m.soloPara === p.demanda.tipo);

const fmt = (n: number, d = 0) => n.toLocaleString("es-CO", { minimumFractionDigits: d, maximumFractionDigits: d });

/** El cálculo del ahorro, paso a paso, para el detalle y el informe. */
export function calculo(p: Propuesta, s: Supuestos): PasoCalculo[] {
  const forma = p.demanda.tipo === "FRIO" ? "frío" : p.demanda.tipo === "ELECTRICIDAD" ? "electricidad" : "calor";
  const pasos: PasoCalculo[] = [
    { etiqueta: "Calor disponible en la fuente", formula: `${p.fuente.potencia} MW × ${Math.round(s.eficiencia * 100)} % de aprovechamiento`, valor: `${fmt(p.fuente.potencia * s.eficiencia, 2)} MW` },
    { etiqueta: `${forma[0]!.toUpperCase()}${forma.slice(1)} útil entregado`, formula: `mín(calor × ${fmt(p.tecnologia.factor, 2)} de rendimiento, ${p.demanda.potencia} MW de demanda)`, valor: `${fmt(p.qUtil, 2)} MW` },
    { etiqueta: "Calor tomado de la fuente", formula: `${fmt(p.qUtil, 2)} MW ÷ ${fmt(p.tecnologia.factor, 2)}`, valor: `${fmt(p.recuperadoMW, 2)} MW` },
    { etiqueta: "Energía útil al año", formula: `${fmt(p.qUtil, 2)} MW × ${fmt(s.horas)} h`, valor: `${fmt(p.energiaMWh)} MWh` },
  ];
  if (p.demanda.tipo === "FRIO")
    pasos.push(
      { etiqueta: "Electricidad que deja de consumir", formula: `${fmt(p.energiaMWh)} MWh de frío ÷ COP ${COP_CHILLER_ELECTRICO} del chiller eléctrico`, valor: `${fmt(p.electricidadEvitadaMWh)} MWh` },
      { etiqueta: "Ahorro anual", formula: `${fmt(p.electricidadEvitadaMWh)} MWh × USD ${s.precioElectricidad}/MWh`, valor: `USD ${fmt(p.ahorroUSD)}` },
    );
  else pasos.push({ etiqueta: "Ahorro anual", formula: `${fmt(p.energiaMWh)} MWh × USD ${fmt(p.precioMWh)}/MWh`, valor: `USD ${fmt(p.ahorroUSD)}` });
  pasos.push(
    { etiqueta: "Inversión estimada (CAPEX)", formula: `${fmt(p.qUtil, 2)} MW × USD ${fmt(p.tecnologia.capexPorMW)}/MW × ${fmt(s.factorCapex, 1)}`, valor: `USD ${fmt(p.capexUSD)}` },
    { etiqueta: "Operación y mantenimiento", formula: "4 % del CAPEX al año", valor: `USD ${fmt(p.opexUSD)}` },
    { etiqueta: "Retorno simple", formula: "CAPEX ÷ (ahorro − O&M)", valor: Number.isFinite(p.paybackAnios) ? `${fmt(p.paybackAnios, 1)} años` : "sin retorno" },
    { etiqueta: "Aporte a la meta anual del reto", formula: `${fmt(p.recuperadoMW, 2)} MW × ${fmt(s.horas)} h ÷ 1,75 PJ`, valor: `${fmt(p.aporteMeta * 100, 2)} %` },
  );
  return pasos;
}

/** Hoja de ruta tipo de un proyecto aprobado (plazos estimados). */
export function hojaDeRuta(p: Propuesta): Hito[] {
  return [
    { plazo: "Mes 0–1", titulo: "Validación de datos", detalle: `Medición puntual en ${p.fuente.id} y ${p.demanda.id} con sensórica clamp-on; confirmación de temperaturas, caudales y horas de operación.` },
    { plazo: "Mes 1–3", titulo: "Ingeniería conceptual", detalle: `Dimensionamiento del ${p.tecnologia.nombre.toLowerCase()}, trazado de la tubería por el rack (≈ ${fmt(p.distancia)} m) y cotizaciones de proveedores.` },
    { plazo: "Mes 3–4", titulo: "Decisión de inversión", detalle: "Prefactibilidad técnica y económica, elección del esquema de financiamiento y aprobación del comité de la refinería." },
    { plazo: "Mes 4–10", titulo: "Compra e instalación", detalle: "Suministro, montaje en parada programada o en caliente según el punto de conexión, y pruebas." },
    { plazo: "Mes 10–22", titulo: "Operación y verificación", detalle: "Línea base y verificación del ahorro con el protocolo IPMVP durante 12 meses." },
  ];
}

/** Puntos (en píxeles de la imagen satelital de 1280×900) de la tubería propuesta. */
export function rutaPx(p: Propuesta): Array<[number, number]> {
  return rutaTuberia(p.fuente, p.demanda).puntos.map(([lng, lat]) => aPx(lng, lat));
}

/** Coordenadas → píxeles de la imagen satelital de referencia (inversa de PX en escenario.ts). */
export const aPx = (lng: number, lat: number): [number, number] => [640 + (lng + 75.4915) / 1.626e-5, 450 - (lat - 10.3135) / 1.611e-5];

/** Totales del portafolio de planta. */
export function totales(lista: Propuesta[]) {
  return lista.reduce(
    (a, p) => ({ recuperado: a.recuperado + p.recuperadoMW, util: a.util + p.qUtil, ahorro: a.ahorro + p.ahorroUSD, inversion: a.inversion + p.capexUSD, co2: a.co2 + p.co2t, aporte: a.aporte + p.aporteMeta }),
    { recuperado: 0, util: 0, ahorro: 0, inversion: 0, co2: 0, aporte: 0 },
  );
}
