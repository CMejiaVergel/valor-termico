// Escenario de la vitrina Valor Térmico. Todo es ILUSTRATIVO: las fuentes,
// demandas, ubicaciones y cifras salen del prototipo v1 (referencia/) y de la
// guía de uso; sirven para contar la mecánica del software, no describen la
// operación real de la refinería. Toda cifra mostrada declara su origen.

export type Origen = "MEDIDO" | "DECLARADO" | "ESTIMADO";
export type Continuidad = "Alta" | "Media" | "Variable";
export type TipoDemanda = "CALOR" | "FRIO" | "ELECTRICIDAD";

/**
 * Posiciones dibujadas sobre la imagen satelital de referencia de la refinería
 * (Mapbox satellite-v9, centro −75,4915 / 10,3135, zoom 15,4, 1280×900 px):
 * cada punto se ubica en píxeles de esa imagen y se convierte a coordenadas.
 * Así fuentes, demandas y racks caen dentro de las secciones reales de la planta.
 * La asignación de cada sección a un proceso es ILUSTRATIVA.
 */
const PX = (x: number, y: number) => ({ lng: -75.4915 + (x - 640) * 1.626e-5, lat: 10.3135 + (450 - y) * 1.611e-5 });
const poligonoPx = (x0: number, y0: number, x1: number, y1: number): Array<[number, number]> =>
  [PX(x0, y0), PX(x1, y0), PX(x1, y1), PX(x0, y1)].map((p) => [p.lng, p.lat]);

export type Zona = "Conversión" | "Destilación" | "Hidroprocesos" | "Hidrotratamiento e H₂" | "Servicios industriales" | "Tratamiento de aguas" | "Administración" | "Patio de tanques";

/** Secciones de la planta (contorno sobre el satélite). */
export const ZONAS: Array<{ nombre: Zona; poligono: Array<[number, number]>; etiqueta: { lng: number; lat: number } }> = [
  { nombre: "Conversión", poligono: poligonoPx(505, 282, 640, 435), etiqueta: PX(512, 292) },
  { nombre: "Destilación", poligono: poligonoPx(648, 286, 828, 435), etiqueta: PX(655, 296) },
  { nombre: "Hidroprocesos", poligono: poligonoPx(840, 286, 972, 435), etiqueta: PX(847, 296) },
  { nombre: "Hidrotratamiento e H₂", poligono: poligonoPx(585, 448, 800, 562), etiqueta: PX(592, 458) },
  { nombre: "Servicios industriales", poligono: poligonoPx(690, 575, 915, 668), etiqueta: PX(697, 585) },
  { nombre: "Tratamiento de aguas", poligono: poligonoPx(432, 568, 682, 660), etiqueta: PX(439, 578) },
  { nombre: "Administración", poligono: poligonoPx(915, 560, 1110, 650), etiqueta: PX(922, 570) },
  { nombre: "Patio de tanques", poligono: poligonoPx(350, 20, 1180, 240), etiqueta: PX(360, 30) },
];

/** Racks de tubería principales (latitud de los tramos este–oeste y longitud de los norte–sur). */
export const RACKS = {
  /** Este–oeste: rack principal (y 438), vía central (y 566) y vía sur (y 668). */
  horizontales: [438, 566, 668].map((y) => PX(0, y).lat),
  /** Norte–sur: (x 575) y rack central (x 832). */
  verticales: [575, 832].map((x) => PX(x, 0).lng),
  /** Extremos de los racks para dibujarlos. */
  limites: { oeste: PX(380, 0).lng, este: PX(1110, 0).lng, norte: PX(0, 240).lat, sur: PX(0, 668).lat },
};

export interface Fuente {
  id: string;
  nombre: string;
  tipo: string;
  tMin: number;
  tMax: number;
  /** MW térmicos disponibles. */
  potencia: number;
  continuidad: Continuidad;
  ubicacion: string;
  zona: Zona;
  origen: Origen;
  lng: number;
  lat: number;
}

export interface Demanda {
  id: string;
  nombre: string;
  tipo: TipoDemanda;
  /** Temperatura requerida (°C). */
  tReq: number;
  rango: string;
  /** MW que necesita, en la forma de la demanda (calor, frío o eléctrico). */
  potencia: number;
  ubicacion: string;
  origen: Origen;
  lng: number;
  lat: number;
}

export const FUENTES: Fuente[] = [
  { id: "F1", nombre: "Vapor LP excedente", tipo: "Vapor", tMin: 120, tMax: 180, potencia: 12, continuidad: "Alta", ubicacion: "Calderas", zona: "Servicios industriales", origen: "DECLARADO", ...PX(742, 610) },
  { id: "F2", nombre: "Condensado caliente", tipo: "Líquido", tMin: 80, tMax: 110, potencia: 6, continuidad: "Alta", ubicacion: "Retorno de condensado", zona: "Hidrotratamiento e H₂", origen: "DECLARADO", ...PX(640, 515) },
  { id: "F3", nombre: "Gases calientes FCC", tipo: "Gas", tMin: 180, tMax: 300, potencia: 15, continuidad: "Media", ubicacion: "Craqueo catalítico (FCC)", zona: "Conversión", origen: "ESTIMADO", ...PX(560, 335) },
  { id: "F4", nombre: "Agua de enfriamiento", tipo: "Agua", tMin: 35, tMax: 55, potencia: 20, continuidad: "Alta", ubicacion: "Torres de enfriamiento", zona: "Servicios industriales", origen: "DECLARADO", ...PX(866, 632) },
  { id: "F5", nombre: "Purgas de vapor", tipo: "Vapor", tMin: 100, tMax: 160, potencia: 3, continuidad: "Variable", ubicacion: "Red de vapor", zona: "Servicios industriales", origen: "ESTIMADO", ...PX(796, 642) },
  { id: "F6", nombre: "Corriente líquida caliente", tipo: "Líquido", tMin: 100, tMax: 150, potencia: 10, continuidad: "Alta", ubicacion: "Unidad de crudo (CDU)", zona: "Destilación", origen: "DECLARADO", ...PX(690, 355) },
  { id: "F7", nombre: "Calor de compresores", tipo: "Aire / agua", tMin: 60, tMax: 90, potencia: 4, continuidad: "Alta", ubicacion: "Compresores de hidrógeno", zona: "Hidrotratamiento e H₂", origen: "DECLARADO", ...PX(765, 500) },
  { id: "F8", nombre: "Calor disperso viscorreducción", tipo: "Mixto", tMin: 40, tMax: 80, potencia: 8, continuidad: "Variable", ubicacion: "Viscorreducción", zona: "Conversión", origen: "ESTIMADO", ...PX(612, 410) },
];

export const DEMANDAS: Demanda[] = [
  { id: "D1", nombre: "Agua helada de edificios", tipo: "FRIO", tReq: 10, rango: "7–12 °C", potencia: 2, ubicacion: "Edificio administrativo", origen: "DECLARADO", ...PX(952, 598) },
  { id: "D2", nombre: "Salas de control", tipo: "FRIO", tReq: 10, rango: "7–12 °C", potencia: 1, ubicacion: "Unidad de crudo (CDU)", origen: "DECLARADO", ...PX(806, 405) },
  { id: "D3", nombre: "Subestación eléctrica", tipo: "FRIO", tReq: 21, rango: "18–24 °C", potencia: 0.8, ubicacion: "Subestación principal", origen: "ESTIMADO", ...PX(1046, 505) },
  { id: "D4", nombre: "Precalentamiento de agua", tipo: "CALOR", tReq: 75, rango: "60–90 °C", potencia: 4, ubicacion: "Agua de alimentación de calderas", origen: "DECLARADO", ...PX(712, 645) },
  { id: "D5", nombre: "Corriente fría de proceso", tipo: "CALOR", tReq: 125, rango: "100–150 °C", potencia: 8, ubicacion: "Unidad de crudo (CDU)", origen: "DECLARADO", ...PX(768, 322) },
  { id: "D6", nombre: "Electricidad auxiliar", tipo: "ELECTRICIDAD", tReq: 150, rango: "> 150 °C", potencia: 1, ubicacion: "Servicios de hidroprocesos", origen: "DECLARADO", ...PX(905, 368) },
  { id: "D7", nombre: "Climatización de laboratorio", tipo: "FRIO", tReq: 10, rango: "7–12 °C", potencia: 1.5, ubicacion: "Laboratorio y talleres", origen: "ESTIMADO", ...PX(1012, 618) },
];

export type Ajuste = "Alta" | "Media" | "Baja";

export interface Tecnologia {
  id: string;
  nombre: string;
  ruta: string;
  /** Qué demanda atiende. */
  atiende: TipoDemanda;
  /** MW útiles entregados por MW de calor aprovechado de la fuente (COP o rendimiento). */
  factor: number;
  /** USD por MW útil instalado (ilustrativo). */
  capexPorMW: number;
  madurez: "Alta" | "Media-alta";
  descripcion: string;
}

export const TECNOLOGIAS: Tecnologia[] = [
  { id: "T1", nombre: "Intercambiador de calor", ruta: "Recuperación directa", atiende: "CALOR", factor: 0.9, capexPorMW: 300_000, madurez: "Alta", descripcion: "Pasa el calor de la fuente a la demanda sin mezclarlas. Necesita que la fuente esté al menos 15 °C por encima." },
  { id: "T2", nombre: "Bomba de calor industrial", ruta: "Calor valorizado", atiende: "CALOR", factor: 1.4, capexPorMW: 900_000, madurez: "Media-alta", descripcion: "Eleva calor de baja temperatura hasta la que pide la demanda, con un poco de electricidad." },
  { id: "T3", nombre: "Recuperación de condensado", ruta: "Calor útil", atiende: "CALOR", factor: 0.95, capexPorMW: 200_000, madurez: "Alta", descripcion: "Devuelve condensado y purgas al ciclo de agua de calderas en lugar de enfriarlos y botarlos." },
  { id: "T4", nombre: "Chiller de absorción", ruta: "Frío", atiende: "FRIO", factor: 0.7, capexPorMW: 800_000, madurez: "Alta", descripcion: "Produce agua helada con calor en vez de electricidad (COP ≈ 0,7)." },
  { id: "T5", nombre: "Ciclo ORC", ruta: "Electricidad", atiende: "ELECTRICIDAD", factor: 0.12, capexPorMW: 3_500_000, madurez: "Media-alta", descripcion: "Convierte calor de media temperatura en electricidad con un fluido orgánico (≈ 12 %)." },
];

/** Habilitadores de medición: no convierten calor, lo hacen verificable (paso de monitoreo). */
export const HABILITADORES = [
  { id: "H1", nombre: "Sensórica clamp-on", ruta: "Medición", descripcion: "Temperatura y caudal por fuera de la tubería: se instala sin parar el proceso." },
  { id: "H2", nombre: "Tablero energético", ruta: "Analítica", descripcion: "Concilia el calor entregado y el recuperado, y emite el reporte mensual." },
];

export interface ModeloNegocio {
  id: string;
  nombre: string;
  descripcion: string;
  /** Fracción del CAPEX que pone el cliente. */
  inversionCliente: number;
  /** Fracción del ahorro neto que se queda el cliente durante el contrato. */
  participacionCliente: number;
  riesgoProveedor: "Bajo" | "Medio" | "Alto";
  pagoPorResultado: "Sí" | "Parcial" | "No";
  /** Solo aplica a ciertas demandas (p. ej. Cooling as a Service). */
  soloPara?: TipoDemanda;
}

export const MODELOS: ModeloNegocio[] = [
  { id: "M1", nombre: "CAPEX directo", descripcion: "La refinería compra, instala y opera.", inversionCliente: 1, participacionCliente: 1, riesgoProveedor: "Bajo", pagoPorResultado: "No" },
  { id: "M2", nombre: "ESCO", descripcion: "El proveedor pone el 100 % del CAPEX y cobra un porcentaje del ahorro verificado con IPMVP durante 7–10 años.", inversionCliente: 0, participacionCliente: 0.7, riesgoProveedor: "Alto", pagoPorResultado: "Sí" },
  { id: "M3", nombre: "BOOT", descripcion: "Un tercero financia, construye, opera y transfiere al final.", inversionCliente: 0, participacionCliente: 0.45, riesgoProveedor: "Alto", pagoPorResultado: "Parcial" },
  { id: "M4", nombre: "EaaS", descripcion: "Energía como servicio: se paga por MWh útil entregado.", inversionCliente: 0, participacionCliente: 0.35, riesgoProveedor: "Alto", pagoPorResultado: "Parcial" },
  { id: "M5", nombre: "CaaS", descripcion: "Frío como servicio: se paga por tonelada de refrigeración.", inversionCliente: 0, participacionCliente: 0.4, riesgoProveedor: "Alto", pagoPorResultado: "Parcial", soloPara: "FRIO" },
  { id: "M6", nombre: "Suscripción", descripcion: "Cuota periódica fija por el equipo y su mantenimiento.", inversionCliente: 0.15, participacionCliente: 0.6, riesgoProveedor: "Medio", pagoPorResultado: "No" },
  { id: "M7", nombre: "Pago por desempeño", descripcion: "Pago variable atado a KPIs de energía recuperada.", inversionCliente: 0.3, participacionCliente: 0.85, riesgoProveedor: "Alto", pagoPorResultado: "Sí" },
];

/** Supuestos ajustables del paso de evaluación. Los valores base y su origen están en FUENTES_DATOS. */
export interface Supuestos {
  /** Eficiencia de aprovechamiento de la fuente (0,3–0,9). */
  eficiencia: number;
  /** USD por MWh térmico útil evitado: calor de caldera a gas (20–150). */
  costoEnergia: number;
  /** USD por MWh eléctrico evitado (100–300). */
  precioElectricidad: number;
  /** Horas de operación al año (4.000–8.760). */
  horas: number;
  /** Multiplicador del CAPEX (0,5–2). */
  factorCapex: number;
}

/** Tasa de cambio de referencia (COP por USD): promedio aproximado de octubre de 2026. */
export const TRM_REFERENCIA = 3200;
/** Gas importado (GNL), contratos sep.–nov. 2026, en USD/MBTU. */
export const PRECIO_GAS_USD_MBTU = 24.97;
/** Eficiencia de la caldera a gas de referencia (supuesto técnico). */
export const EFICIENCIA_CALDERA = 0.85;
const MWH_POR_MBTU = 0.29307;
/** Calor útil de caldera: 24,97 ÷ (0,85 × 0,293) ≈ USD 100/MWh térmico. */
export const COSTO_CALOR_USD_MWH = Math.round(PRECIO_GAS_USD_MBTU / (EFICIENCIA_CALDERA * MWH_POR_MBTU));
/** Escenario conservador del calor: equivale a gas a ≈ USD 12,5/MBTU. */
export const COSTO_CALOR_CONSERVADOR = 50;
/** Afinia, costo unitario Nivel 4, octubre de 2026 (COP/kWh). */
export const TARIFA_AFINIA_N4_COP_KWH = 728.67;
/** 728,67 COP/kWh ÷ TRM ≈ USD 228/MWh. */
export const PRECIO_ELECTRICIDAD_USD_MWH = Math.round((TARIFA_AFINIA_N4_COP_KWH * 1000) / TRM_REFERENCIA);
/** COP de un chiller eléctrico de referencia: el frío vale la electricidad que evita (supuesto técnico). */
export const COP_CHILLER_ELECTRICO = 5;

// 8.400 h/año: base del análisis del equipo (artefacto del proyecto). La guía v1 usaba 8.000 h.
export const SUPUESTOS_INICIALES: Supuestos = { eficiencia: 0.6, costoEnergia: COSTO_CALOR_USD_MWH, precioElectricidad: PRECIO_ELECTRICIDAD_USD_MWH, horas: 8400, factorCapex: 1 };

/** USD por MWh útil entregado según la forma de la demanda. */
export function precioMWh(tipo: TipoDemanda, s: Supuestos): number {
  return tipo === "CALOR" ? s.costoEnergia : tipo === "ELECTRICIDAD" ? s.precioElectricidad : s.precioElectricidad / COP_CHILLER_ELECTRICO;
}

/** Meta que fijó la refinería en el reto: 7 PJ de ahorro térmico en 4 años. Es su meta, no un compromiso del servicio. */
export const META_RETO = {
  pj: 7,
  anios: 4,
  pjAnio: 1.75,
  /** MW térmicos sostenidos que exige: 1,75 PJ = 486.111 MWh ÷ 8.400 h ≈ 58 MW. */
  mwPromedio: Math.round(1.75e9 / 3600 / 8400),
} as const;
/** PJ al año que aporta 1 MW térmico sostenido durante esas horas. */
export const pjAnioPorMW = (horas: number) => (horas * 3600) / 1e9;
/** Fracción de la meta anual que representan unos MW recuperados. */
export const fraccionMeta = (mw: number, horas: number) => (mw * pjAnioPorMW(horas)) / META_RETO.pjAnio;

/**
 * Escenarios de alcance. Piloto: una sección que elige la refinería, con una meta medible
 * (1 MW recuperado ≈ 1,7 % de la meta anual). Intermedio: supuesto declarado de cinco secciones
 * similares. Refinería completa: proporcional a la meta del reto, sin compromiso.
 */
export const META_PILOTO_INICIAL = 1;
export const SECCIONES_INTERMEDIO = 5;

/** Ponderación del puntaje (guía de uso §6). */
export const PESOS = { potencial: 0.2, temperatura: 0.15, continuidad: 0.15, ahorro: 0.15, cercania: 0.1, facilidad: 0.1, capex: 0.1, co2: 0.05 } as const;
export type Criterio8 = keyof typeof PESOS;
export const NOMBRE_CRITERIO8: Record<Criterio8, string> = {
  potencial: "Potencial",
  temperatura: "Temperatura",
  continuidad: "Continuidad",
  ahorro: "Ahorro",
  cercania: "Cercanía",
  facilidad: "Facilidad",
  capex: "CAPEX / retorno",
  co2: "CO₂",
};

/** Factores de emisión ilustrativos (t CO₂ por MWh útil desplazado). */
export const FACTOR_CO2: Record<TipoDemanda, number> = { CALOR: 0.2, FRIO: 0.035, ELECTRICIDAD: 0.14 };
/** m³ de gas natural por MWh térmico (≈ 10,5 kWh/m³, ilustrativo). */
export const GAS_M3_POR_MWH = 95;

/** Origen de cada valor de referencia que usa el prototipo (sección «Supuestos y fuentes»). */
export interface FuenteDato {
  dato: string;
  valor: string;
  tipo: "PUBLICADO" | "ESTIMACIÓN" | "SUPUESTO" | "META DE LA REFINERÍA";
  explicacion: string;
  fuente?: { nombre: string; url: string };
}
const cop = (n: number) => n.toLocaleString("es-CO");
export const FUENTES_DATOS: FuenteDato[] = [
  { dato: "Meta del reto", valor: "7 PJ en 4 años (1,75 PJ/año)", tipo: "META DE LA REFINERÍA", explicacion: "La fija la refinería en el reto. El prototipo la usa como referencia de escala, no como compromiso." },
  { dato: "MW sostenidos que exige la meta", valor: `≈ ${META_RETO.mwPromedio} MW térmicos`, tipo: "ESTIMACIÓN", explicacion: "1,75 PJ/año = 486.111 MWh ÷ 8.400 h de operación." },
  { dato: "Qué representa 1 MW recuperado", valor: "8.400 MWh/año ≈ 0,030 PJ ≈ 1,7 % de la meta anual", tipo: "ESTIMACIÓN", explicacion: "1 MW × 8.400 h. Es la unidad de escala del piloto: una meta del 1 % al 2 % equivale a 0,6–1,2 MW." },
  { dato: "Horas de operación", valor: "8.400 h/año", tipo: "SUPUESTO", explicacion: "Base del análisis del equipo: operación continua con paradas programadas." },
  { dato: "Tarifa eléctrica Afinia, Nivel 4", valor: `${cop(TARIFA_AFINIA_N4_COP_KWH)} COP/kWh`, tipo: "PUBLICADO", explicacion: "Costo unitario regulado de octubre de 2026 (Nivel 2: 846,86; Nivel 3: 797,24). Los usuarios industriales están exentos de la contribución (Ley 1430 de 2010).", fuente: { nombre: "Afinia · tarifas y subsidios", url: "https://afinia.com.co/inicio/tarifas-y-subsidios" } },
  { dato: "Energía en el mercado no regulado", valor: "311,8 COP/kWh (junio de 2026)", tipo: "PUBLICADO", explicacion: "Precio de la energía según XM, sin cargos de red. Con los cargos de red del pliego de Afinia Nivel 4 (≈ 316 COP/kWh), un kWh entregado en Mamonal costaría ≈ 630 COP/kWh ≈ USD 0,20 (estimación).", fuente: { nombre: "El Colombiano · precios de XM, junio de 2026", url: "https://www.elcolombiano.com/negocios/precio-energia-bolsa-colombia-junio-2026-xm-BJ39303367" } },
  { dato: "Tasa de cambio de referencia", valor: `${cop(TRM_REFERENCIA)} COP/USD`, tipo: "SUPUESTO", explicacion: "Promedio aproximado de octubre de 2026. El informe final usa la TRM oficial de su fecha." },
  { dato: "Precio de la electricidad", valor: `≈ USD ${PRECIO_ELECTRICIDAD_USD_MWH}/MWh`, tipo: "ESTIMACIÓN", explicacion: "Tarifa Afinia Nivel 4 ÷ TRM de referencia. Reemplaza los USD 0,224/kWh del artefacto, que no tenían fuente." },
  { dato: "Gas natural importado (GNL)", valor: `USD ${cop(PRECIO_GAS_USD_MBTU)}/MBTU`, tipo: "PUBLICADO", explicacion: "Contratos de septiembre a noviembre de 2026.", fuente: { nombre: "El Colombiano · precio del gas importado", url: "https://www.elcolombiano.com/negocios/precio-del-gas-importado-crece-en-colombia-FB40278940" } },
  { dato: "Valor del calor útil", valor: `≈ USD ${COSTO_CALOR_USD_MWH}/MWh térmico`, tipo: "ESTIMACIÓN", explicacion: `Gas importado quemado en una caldera de ${Math.round(EFICIENCIA_CALDERA * 100)} % (supuesto). Escenario conservador: USD ${COSTO_CALOR_CONSERVADOR}/MWh, que equivale a gas a ≈ USD 12,5/MBTU.` },
  { dato: "kWh autogenerado en la refinería", valor: "≈ USD 0,17–0,24/kWh", tipo: "ESTIMACIÓN", explicacion: "Solo combustible: gas importado × 7 MBTU/MWh (ciclo combinado) a 9,5 MBTU/MWh (turbina simple). Sin operación ni mantenimiento." },
  { dato: "Valor del frío", valor: `≈ USD ${Math.round(PRECIO_ELECTRICIDAD_USD_MWH / COP_CHILLER_ELECTRICO)}/MWh de frío`, tipo: "ESTIMACIÓN", explicacion: `La electricidad que deja de consumir un chiller eléctrico de COP ${COP_CHILLER_ELECTRICO} (supuesto técnico).` },
  { dato: "Rendimiento de las tecnologías", valor: "Intercambiador 0,9 · absorción COP 0,7 · ORC 12 %", tipo: "SUPUESTO", explicacion: "Valores típicos de catálogo. El portafolio real usa la ficha de cada proveedor." },
  { dato: "CAPEX por MW útil", valor: "USD 0,2–3,5 M según tecnología", tipo: "SUPUESTO", explicacion: "Órdenes de magnitud para el ejemplo. En el portafolio real se cotizan." },
  { dato: "Factores de CO₂", valor: "Calor 0,20 · electricidad 0,14 t/MWh", tipo: "SUPUESTO", explicacion: "Ilustrativos: combustión de gas en caldera y red eléctrica. El informe usa los factores oficiales vigentes." },
  { dato: "Inventario de fuentes y demandas", valor: "8 fuentes · 7 demandas", tipo: "SUPUESTO", explicacion: "Ejemplo ilustrativo sobre la imagen satelital. En el servicio, la refinería entrega los datos y se tratan como confidenciales." },
];

/** Oportunidad protagonista del recorrido. */
export const OPORTUNIDAD_INICIAL = { fuente: "F1", demanda: "D4", tecnologia: "T1", modelo: "M2" } as const;

export type IdPaso =
  | "problema"
  | "inventario"
  | "termico"
  | "cruce"
  | "tecnologia"
  | "modelo"
  | "evaluacion"
  | "portafolio"
  | "monitoreo"
  | "impacto"
  | "ejemplo";

export interface Camara {
  lng: number;
  lat: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

export interface Paso {
  id: IdPaso;
  /** Número que se muestra (10.1, 10.2…); por omisión, la posición. */
  numero?: string;
  etapa: "El reto" | "Diagnóstico" | "Estructuración" | "Decisión" | "Ejecución";
  titulo: string;
  bajada: string;
  texto: string;
  /** Recuadro "Por qué importa". */
  clave: string;
  camara: Camara;
  /** La cámara se centra en la oportunidad elegida (no en la planta). */
  enfocarOportunidad?: boolean;
}

// Centro de la planta de proceso (sin el patio de tanques). Vista casi cenital, como una cámara térmica.
const PLANTA = { ...PX(800, 478) };

export const PASOS: Paso[] = [
  {
    id: "problema", etapa: "El reto", titulo: "El reto", bajada: "7 PJ de ahorro térmico en 4 años",
    texto: "La refinería se propuso ahorrar 7 PJ de energía térmica en cuatro años, unos 58 MW sostenidos. Parte de ese ahorro puede salir del calor que hoy se disipa al aire y al agua de enfriamiento. El primer paso es saber dónde está, cuánto hay y en qué se puede usar.",
    clave: "Cada megavatio térmico recuperado durante 8.400 h equivale a cerca del 1,7 % de la meta anual. Esa es la unidad con la que se dimensiona el piloto.",
    camara: { ...PLANTA, zoom: 16.05, pitch: 0, bearing: 0 },
  },
  {
    id: "inventario", etapa: "Diagnóstico", titulo: "Datos de la planta", bajada: "La refinería entrega, nosotros consolidamos",
    texto: "Los ingenieros de la refinería entregan los datos de sus fuentes de calor sobrante y de sus consumidores: temperatura, potencia, continuidad y ubicación. La plataforma los consolida de forma segura, punto por punto, y marca el origen de cada dato: medido, declarado o estimado.",
    clave: "Los datos de la planta son confidenciales: se guardan con acceso restringido y solo se usan para el portafolio. Este ejemplo es ilustrativo.",
    camara: { ...PLANTA, zoom: 16.25, pitch: 20, bearing: 0 },
  },
  {
    id: "termico", etapa: "Diagnóstico", titulo: "Mapa térmico", bajada: "Dónde se concentra el calor",
    texto: "La plataforma convierte el inventario en un mapa de calor de la planta: muestra los puntos calientes, estima cuánta energía se desaprovecha en cada equipo y ubica los equipos que podrían aprovecharla (retículas azules). Ajuste la paleta y la intensidad en la ficha.",
    clave: "Ver el calor sobre el plano de la planta ayuda a elegir con los ingenieros la sección del piloto.",
    camara: { ...PLANTA, zoom: 16.15, pitch: 0, bearing: 0 },
  },
  {
    id: "cruce", etapa: "Diagnóstico", titulo: "Compatibilidad", bajada: "El motor compara todo con todo",
    texto: "El motor cruza las 8 fuentes con las 7 demandas (56 pares) por los racks de tubería de la planta y verifica cinco criterios: temperatura, potencia, continuidad, longitud de tubería y calidad del dato. El tipo de calor (vapor, líquido o gas) define qué tecnología encaja. Verde: compatible. Ámbar: condicionado. Los descartados no se trazan.",
    clave: "Las reglas son físicas: el calor solo pasa de mayor a menor temperatura, salvo que una bomba de calor lo eleve.",
    camara: { ...PLANTA, zoom: 16.25, pitch: 25, bearing: 0 },
  },
  {
    id: "tecnologia", etapa: "Estructuración", titulo: "Propuestas de la IA", bajada: "Proyectos de uso para cada par",
    texto: "Para el par elegido, un agente de IA propone proyectos de uso: reusar el calor en el proceso o convertirlo, por ejemplo en frío para climatizar oficinas o en electricidad. Cada propuesta trae la tecnología, la tubería por el rack y sus indicadores estimados.",
    clave: "No inventamos tecnologías: aportamos el saber cuándo, dónde y por qué instalarlas. En este prototipo el agente es simulado y así se rotula.",
    camara: { ...PLANTA, zoom: 17.7, pitch: 35, bearing: -15 }, enfocarOportunidad: true,
  },
  {
    id: "modelo", etapa: "Estructuración", titulo: "Financiamiento del proyecto", bajada: "Cómo podría financiarlo la refinería",
    texto: "Cada proyecto se puede financiar de varias formas: con CAPEX propio, con una ESCO, con un esquema BOOT, como servicio… La plataforma compara, año a año, el flujo de caja de la refinería en cada esquema. La inversión inicial y el retorno dependen de esa elección.",
    clave: "Estos son esquemas de financiamiento del proyecto para la refinería. No son el modelo de negocio de Valor Térmico.",
    camara: { ...PLANTA, zoom: 17.5, pitch: 30, bearing: 10 }, enfocarOportunidad: true,
  },
  {
    id: "evaluacion", etapa: "Decisión", titulo: "Evaluación", bajada: "Indicadores estimados",
    texto: "Con la tecnología y el financiamiento elegidos, la plataforma estima inversión inicial, ahorro energético, retorno e impacto ambiental y operativo, y los resume en un puntaje de 8 criterios. Mueva los supuestos y vea el resultado al instante.",
    clave: "Todas las cifras son estimaciones con supuestos declarados y fuentes citadas. Se precisan con los datos reales de la planta.",
    camara: { ...PLANTA, zoom: 17.4, pitch: 25, bearing: 0 }, enfocarOportunidad: true,
  },
  {
    id: "portafolio", etapa: "Decisión", titulo: "Portafolio del piloto", bajada: "Proyectos que suman la meta",
    texto: "La refinería elige una sección para el piloto y una meta medible, por ejemplo 1 MW térmico recuperado. La plataforma toma los mejores proyectos de esa sección y los suma hasta cumplir la meta. Ese portafolio documentado, con respaldo técnico y bibliográfico, es el entregable.",
    clave: "El portafolio es el producto del servicio. Cobramos por el portafolio, según el alcance de la sección analizada; los ingenieros de la refinería deciden qué proyectos aprobar.",
    camara: { ...PLANTA, zoom: 16.2, pitch: 15, bearing: 0 },
  },
  {
    id: "monitoreo", etapa: "Ejecución", titulo: "Piloto y monitoreo", bajada: "Medir para verificar",
    texto: "Si la refinería aprueba un proyecto, se instrumenta con sensórica clamp-on, sin parar el proceso: temperatura y caudal en la salida de la fuente y en la entrada de la demanda. El tablero compara el calor entregado contra el estimado.",
    clave: "El ahorro verificado con el protocolo IPMVP confirma el resultado del piloto antes de escalar.",
    camara: { ...PLANTA, zoom: 18.1, pitch: 45, bearing: 20 }, enfocarOportunidad: true,
  },
  {
    id: "impacto", numero: "10.1", etapa: "Ejecución", titulo: "Portafolio de la planta", bajada: "El entregable",
    texto: "Todas las propuestas se consolidan en un portafolio de planta: cuántas son, cuánto calor recuperan, cuánto aportan a la meta, cuánto ahorran y cuánto cuestan. Toque una propuesta para ver su detalle.",
    clave: "Este portafolio documentado es lo que recibe la refinería al final de la consultoría. Sus ingenieros deciden qué proyectos ejecutar.",
    camara: { ...PLANTA, zoom: 16.05, pitch: 0, bearing: 0 },
  },
  {
    id: "ejemplo", numero: "10.2", etapa: "Ejecución", titulo: "Ejemplo detallado", bajada: "Chiller de absorción",
    texto: "Así se documenta cada propuesta: indicadores, ubicación en la planta, la tecnología con su gemelo digital, el financiamiento, el cálculo del ahorro, el impacto y la hoja de ruta. Gire el gemelo, siga el recorrido del proceso y exporte el informe.",
    clave: "El informe de cada propuesta es el respaldo técnico con el que los ingenieros deciden la inversión.",
    camara: { ...PLANTA, zoom: 16.05, pitch: 0, bearing: 0 },
  },
];

/** Número visible del paso i (01…09, 10.1, 10.2). */
export const numeroPaso = (i: number) => PASOS[i]?.numero ?? String(i + 1).padStart(2, "0");
/** Pasos numerados (los subpasos cuentan como uno). */
export const TOTAL_PASOS = new Set(PASOS.map((p, i) => numeroPaso(i).split(".")[0])).size;

export const ETAPAS = ["El reto", "Diagnóstico", "Estructuración", "Decisión", "Ejecución"] as const;
