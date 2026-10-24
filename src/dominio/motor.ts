// Motor de la vitrina: compatibilidad fuente–demanda (5 criterios), ajuste de
// cada tecnología, evaluación técnico-económica (8 criterios ponderados) y
// portafolio priorizado. Todo corre en el navegador con el escenario ilustrativo.
//
// Corrección frente al prototipo v1: la potencia útil queda limitada por lo que
// la demanda puede recibir (antes se usaba toda la fuente aunque la demanda
// fuera mucho menor) y la tecnología aplica su rendimiento o COP.

import {
  DEMANDAS,
  FACTOR_CO2,
  FUENTES,
  GAS_M3_POR_MWH,
  MODELOS,
  PESOS,
  PRECIO_RELATIVO,
  RACKS,
  TECNOLOGIAS,
  type Ajuste,
  type Criterio8,
  type Demanda,
  type Fuente,
  type ModeloNegocio,
  type Supuestos,
  type Tecnologia,
} from "./escenario";

export type EstadoCriterio = "CUMPLE" | "CONDICION" | "INCUMPLE";
export type EstadoPar = "COMPATIBLE" | "CONDICIONADO" | "DESCARTADO";
export type Prioridad = "P1" | "P2" | "P3" | "P4";

export interface CriterioPar {
  codigo: string;
  nombre: string;
  estado: EstadoCriterio;
  nota: string;
}

export interface Par {
  id: string;
  fuente: Fuente;
  demanda: Demanda;
  estado: EstadoPar;
  criterios: CriterioPar[];
  /** Mejor tecnología para el par (null si ninguna aplica). */
  tecnologia: Tecnologia | null;
  ajuste: Ajuste | null;
  distancia: number;
}

const M_POR_GRADO = 111_320;
export function distanciaM(a: { lng: number; lat: number }, b: { lng: number; lat: number }): number {
  const dx = (a.lng - b.lng) * M_POR_GRADO * Math.cos((a.lat * Math.PI) / 180);
  const dy = (a.lat - b.lat) * M_POR_GRADO;
  return Math.hypot(dx, dy);
}

/**
 * Tubería propuesta entre dos puntos: sale de la fuente en línea recta hasta el
 * rack este–oeste más conveniente, lo recorre y baja recta hasta la demanda
 * (trazado ortogonal, como se tiende tubería en una planta).
 */
export function rutaTuberia(a: { lng: number; lat: number }, b: { lng: number; lat: number }, desplazamientoM = 0): { puntos: Array<[number, number]>; metros: number } {
  const dLat = desplazamientoM / 111_320;
  const rack = RACKS.horizontales.reduce((mejor, r) => (Math.abs(a.lat - r) + Math.abs(b.lat - r) < Math.abs(a.lat - mejor) + Math.abs(b.lat - mejor) ? r : mejor), RACKS.horizontales[0]!) + dLat;
  // Dentro de la misma sección (salto corto) la tubería va directa en escuadra, sin subir al rack.
  const directo = distanciaM(a, { lng: b.lng, lat: a.lat }) + distanciaM({ lng: b.lng, lat: a.lat }, b) <= 160;
  const puntos: Array<[number, number]> = directo
    ? [
        [a.lng, a.lat],
        [b.lng, a.lat],
        [b.lng, b.lat],
      ]
    : [
        [a.lng, a.lat],
        [a.lng, rack],
        [b.lng, rack],
        [b.lng, b.lat],
      ];
  let metros = 0;
  for (let i = 1; i < puntos.length; i++) metros += distanciaM({ lng: puntos[i - 1]![0], lat: puntos[i - 1]![1] }, { lng: puntos[i]![0], lat: puntos[i]![1] });
  return { puntos, metros };
}

export const fuente = (id: string) => FUENTES.find((f) => f.id === id)!;
export const demanda = (id: string) => DEMANDAS.find((d) => d.id === id)!;
export const tecnologia = (id: string) => TECNOLOGIAS.find((t) => t.id === id)!;
export const modelo = (id: string) => MODELOS.find((m) => m.id === id)!;

/** Qué tan bien encaja una tecnología con el salto de temperatura del par (null = no aplica). */
export function ajusteTecnologia(t: Tecnologia, f: Fuente, d: Demanda): Ajuste | null {
  if (t.atiende !== d.tipo) return null;
  const margen = f.tMax - d.tReq;
  switch (t.id) {
    case "T1": // intercambiador
      return margen >= 30 ? "Alta" : margen >= 15 ? "Media" : null;
    case "T2": {
      // bomba de calor: eleva hasta 50 °C; si un intercambiador basta, no conviene
      if (d.tReq > 130) return null;
      const salto = d.tReq - f.tMax;
      if (salto <= -15) return "Baja";
      return salto <= 30 ? "Alta" : salto <= 50 ? "Media" : null;
    }
    case "T3": // condensado y purgas al ciclo de calderas
      return (f.id === "F2" || f.id === "F5") && d.tReq <= 100 && margen >= 10 ? "Alta" : null;
    case "T4": // chiller de absorción
      return f.tMax >= 110 ? "Alta" : f.tMax >= 85 ? "Media" : null;
    case "T5": // ORC
      return f.tMax >= 150 ? "Alta" : f.tMax >= 120 ? "Media" : null;
    default:
      return null;
  }
}

const RANGO_AJUSTE: Record<Ajuste, number> = { Alta: 3, Media: 2, Baja: 1 };

/** Mejor tecnología del par: mayor ajuste y, a igualdad, menor CAPEX. */
export function mejorTecnologia(f: Fuente, d: Demanda): { t: Tecnologia; ajuste: Ajuste } | null {
  let mejor: { t: Tecnologia; ajuste: Ajuste } | null = null;
  for (const t of TECNOLOGIAS) {
    const a = ajusteTecnologia(t, f, d);
    if (!a) continue;
    if (!mejor || RANGO_AJUSTE[a] > RANGO_AJUSTE[mejor.ajuste] || (RANGO_AJUSTE[a] === RANGO_AJUSTE[mejor.ajuste] && t.capexPorMW < mejor.t.capexPorMW)) mejor = { t, ajuste: a };
  }
  return mejor;
}

const pct = (x: number) => `${Math.round(x * 100)} %`;

/** Cruce de un par con sus cinco criterios. */
export function cruzar(f: Fuente, d: Demanda, eficiencia = 0.6): Par {
  const mt = mejorTecnologia(f, d);
  const distancia = rutaTuberia(f, d).metros;
  const criterios: CriterioPar[] = [];
  criterios.push(
    mt
      ? { codigo: "C1", nombre: "Nivel de temperatura", estado: mt.ajuste === "Alta" ? "CUMPLE" : "CONDICION", nota: `${f.tMin}–${f.tMax} °C frente a ${d.tReq} °C requeridos · ${mt.t.nombre.toLowerCase()} (${mt.ajuste.toLowerCase()})` }
      : { codigo: "C1", nombre: "Nivel de temperatura", estado: "INCUMPLE", nota: `${f.tMax} °C no alcanzan para ${d.tReq} °C con ninguna tecnología del catálogo` },
  );
  if (mt) {
    const disponible = f.potencia * eficiencia * mt.t.factor;
    const cobertura = disponible / d.potencia;
    criterios.push({
      codigo: "C2",
      nombre: "Potencia",
      estado: cobertura >= 0.8 ? "CUMPLE" : cobertura >= 0.3 ? "CONDICION" : "INCUMPLE",
      nota: cobertura >= 1 ? `Cubre el 100 % de la demanda (sobra ${pct(1 - d.potencia / disponible)} de la fuente)` : `Cubre el ${pct(cobertura)} de la demanda`,
    });
  } else criterios.push({ codigo: "C2", nombre: "Potencia", estado: "INCUMPLE", nota: "Sin tecnología aplicable" });
  criterios.push({
    codigo: "C3",
    nombre: "Continuidad",
    estado: f.continuidad === "Alta" ? "CUMPLE" : "CONDICION",
    nota: f.continuidad === "Alta" ? "Disponible 24/7" : f.continuidad === "Media" ? "Paradas periódicas: requiere respaldo" : "Intermitente: requiere almacenamiento térmico",
  });
  criterios.push({
    codigo: "C4",
    nombre: "Distancia",
    estado: distancia <= 600 ? "CUMPLE" : distancia <= 1300 ? "CONDICION" : "INCUMPLE",
    nota: `${Math.round(distancia)} m de tubería por rack${distancia > 1300 ? ": pérdidas y costo excesivos" : ""}`,
  });
  criterios.push({
    codigo: "C5",
    nombre: "Calidad del dato",
    estado: f.origen === "ESTIMADO" || d.origen === "ESTIMADO" ? "CONDICION" : "CUMPLE",
    nota: f.origen === "ESTIMADO" || d.origen === "ESTIMADO" ? "Hay datos estimados: medir con sensórica antes de invertir" : "Datos declarados por la planta",
  });
  const incumple = criterios.some((c) => c.estado === "INCUMPLE");
  const condiciones = criterios.filter((c) => c.estado === "CONDICION").length;
  return {
    id: `${f.id}-${d.id}`,
    fuente: f,
    demanda: d,
    estado: incumple ? "DESCARTADO" : condiciones >= 2 ? "CONDICIONADO" : "COMPATIBLE",
    criterios,
    tecnologia: mt?.t ?? null,
    ajuste: mt?.ajuste ?? null,
    distancia,
  };
}

/** Los 56 pares del escenario. */
export function cruzarTodo(eficiencia = 0.6): Par[] {
  return FUENTES.flatMap((f) => DEMANDAS.map((d) => cruzar(f, d, eficiencia)));
}

export interface Evaluacion {
  fuente: Fuente;
  demanda: Demanda;
  tecnologia: Tecnologia;
  modelo: ModeloNegocio;
  ajuste: Ajuste | null;
  distancia: number;
  /** MW residuales de la fuente. */
  qResidual: number;
  /** MW útiles entregados a la demanda (calor, frío o eléctricos). */
  qUtil: number;
  /** MW de la fuente que se aprovechan. */
  qAprovechado: number;
  energiaMWh: number;
  ahorroUSD: number;
  capexUSD: number;
  opexUSD: number;
  paybackAnios: number;
  co2t: number;
  gasM3: number;
  puntajes: Record<Criterio8, number>;
  puntaje: number;
  prioridad: Prioridad;
  nivelPrioridad: "Muy alta" | "Alta" | "Media" | "Baja";
  accion: string;
  riesgo: "Bajo" | "Medio" | "Alto";
  /** Beneficio neto de la refinería a 5 años con el modelo elegido. */
  beneficioCliente5: number;
  inversionCliente: number;
}

const escala = (v: number, cortes: number[]) => {
  // cortes descendentes: v ≥ cortes[0] → 5, ≥ cortes[1] → 4, …
  for (let i = 0; i < cortes.length; i++) if (v >= cortes[i]!) return 5 - i;
  return 5 - cortes.length;
};

export function evaluar(f: Fuente, d: Demanda, t: Tecnologia, m: ModeloNegocio, s: Supuestos): Evaluacion {
  const ajuste = ajusteTecnologia(t, f, d);
  const distancia = rutaTuberia(f, d).metros;
  const qUtil = ajuste ? Math.min(f.potencia * s.eficiencia * t.factor, d.potencia) : 0;
  const qAprovechado = qUtil / t.factor;
  const energiaMWh = qUtil * s.horas;
  const ahorroUSD = energiaMWh * s.costoEnergia * PRECIO_RELATIVO[d.tipo];
  const capexUSD = qUtil * t.capexPorMW * s.factorCapex;
  const opexUSD = capexUSD * 0.04;
  const neto = ahorroUSD - opexUSD;
  const paybackAnios = neto > 0 ? capexUSD / neto : Infinity;
  const co2t = energiaMWh * FACTOR_CO2[d.tipo];
  const gasM3 = d.tipo === "CALOR" ? energiaMWh * GAS_M3_POR_MWH : 0;
  const puntajes: Record<Criterio8, number> = {
    potencial: escala(qUtil, [4, 2, 1, 0.5]),
    temperatura: ajuste === "Alta" ? 5 : ajuste === "Media" ? 3 : ajuste === "Baja" ? 2 : 1,
    continuidad: f.continuidad === "Alta" ? 5 : f.continuidad === "Media" ? 3 : 2,
    ahorro: escala(ahorroUSD, [1_500_000, 750_000, 300_000, 100_000]),
    cercania: escala(-distancia, [-300, -600, -1000, -1500]),
    facilidad: Math.min(5, (t.madurez === "Alta" ? 4 : 3) + (distancia <= 300 ? 1 : 0)),
    capex: escala(-paybackAnios, [-1.5, -3, -5, -8]),
    co2: escala(co2t, [5000, 2000, 800, 200]),
  };
  // Redondeado a 2 decimales: 4,1999… debe contar como 4,20 en los cortes de prioridad.
  const puntaje = Math.round((Object.keys(PESOS) as Criterio8[]).reduce((acc, k) => acc + puntajes[k] * PESOS[k], 0) * 100) / 100;
  const prioridad: Prioridad = puntaje >= 4.2 ? "P1" : puntaje >= 3.5 ? "P2" : puntaje >= 2.8 ? "P3" : "P4";
  const condiciones = cruzar(f, d, s.eficiencia).criterios.filter((c) => c.estado !== "CUMPLE").length;
  const riesgo = condiciones === 0 ? "Bajo" : condiciones <= 2 ? "Medio" : "Alto";
  const inversionCliente = capexUSD * m.inversionCliente;
  const beneficioCliente5 = neto * 5 * m.participacionCliente - inversionCliente;
  return {
    fuente: f, demanda: d, tecnologia: t, modelo: m, ajuste, distancia,
    qResidual: f.potencia, qUtil, qAprovechado, energiaMWh, ahorroUSD, capexUSD, opexUSD, paybackAnios, co2t, gasM3,
    puntajes, puntaje, prioridad,
    nivelPrioridad: ({ P1: "Muy alta", P2: "Alta", P3: "Media", P4: "Baja" } as const)[prioridad],
    accion: ({ P1: "Piloto prioritario", P2: "Prefactibilidad", P3: "Mantener en portafolio", P4: "Evaluar después" } as const)[prioridad],
    riesgo,
    beneficioCliente5,
    inversionCliente,
  };
}

export interface Oportunidad extends Evaluacion {
  codigo: string;
  par: Par;
  /** Ejes de la matriz (1–5): mitad técnica y mitad económica del puntaje; puntaje = (x + y) / 2. */
  x: number;
  y: number;
}

/** Las dos mitades del puntaje (cada una pesa 50 %): así la matriz coincide con la prioridad. */
const TECNICOS: Criterio8[] = ["temperatura", "continuidad", "cercania", "facilidad"];
const ECONOMICOS: Criterio8[] = ["potencial", "ahorro", "capex", "co2"];
export function ejesMatriz(e: Evaluacion): { x: number; y: number } {
  const media = (ks: Criterio8[]) => ks.reduce((a, k) => a + e.puntajes[k] * PESOS[k], 0) / ks.reduce((a, k) => a + PESOS[k], 0);
  return { x: media(TECNICOS), y: media(ECONOMICOS) };
}

/**
 * Portafolio: cada par no descartado con su mejor tecnología y modelo ESCO.
 * Se asigna en orden de puntaje sin usar dos veces el mismo calor: cada fuente
 * tiene una capacidad (potencia × eficiencia) y cada demanda se atiende una vez.
 */
export function portafolio(s: Supuestos, maximo = 8): Oportunidad[] {
  const esco = modelo("M2");
  const candidatos = cruzarTodo(s.eficiencia)
    .filter((p) => p.estado !== "DESCARTADO" && p.tecnologia)
    .map((p) => ({ p, e: evaluar(p.fuente, p.demanda, p.tecnologia!, esco, s) }))
    .sort((a, b) => b.e.puntaje - a.e.puntaje);
  const capacidad = new Map(FUENTES.map((f) => [f.id, f.potencia * s.eficiencia]));
  const atendidas = new Set<string>();
  const elegidas: Oportunidad[] = [];
  for (const { p, e } of candidatos) {
    if (elegidas.length >= maximo || atendidas.has(p.demanda.id)) continue;
    const libre = capacidad.get(p.fuente.id)!;
    if (libre < e.qAprovechado * 0.5) continue;
    const usado = Math.min(libre, e.qAprovechado);
    // Si queda menos calor que el previsto, se recalcula con lo disponible.
    const eReal = usado < e.qAprovechado ? evaluar(p.fuente, p.demanda, p.tecnologia!, esco, { ...s, eficiencia: (usado / p.fuente.potencia) }) : e;
    capacidad.set(p.fuente.id, libre - usado);
    atendidas.add(p.demanda.id);
    elegidas.push({ ...eReal, codigo: "", par: p, ...ejesMatriz(eReal) });
  }
  return elegidas.map((o, i) => ({ ...o, codigo: `OT-${String(i + 1).padStart(3, "0")}` }));
}

/** Totales del escenario para la cabecera y el paso del problema. */
export const CALOR_RESIDUAL_MW = FUENTES.reduce((a, f) => a + f.potencia, 0);
