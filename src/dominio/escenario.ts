// Escenario de la vitrina Calor Rescatado. Todo es ILUSTRATIVO: las fuentes,
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

/** Supuestos ajustables del paso de evaluación (valores iniciales de la guía). */
export interface Supuestos {
  /** Eficiencia de aprovechamiento de la fuente (0,3–0,9). */
  eficiencia: number;
  /** USD por MWh útil de energía evitada (20–120). */
  costoEnergia: number;
  /** Horas de operación al año (4.000–8.760). */
  horas: number;
  /** Multiplicador del CAPEX (0,5–2). */
  factorCapex: number;
}
// 8.400 h/año: base del análisis del equipo (artefacto del proyecto, insight 7). La guía v1 usaba 8.000 h.
export const SUPUESTOS_INICIALES: Supuestos = { eficiencia: 0.6, costoEnergia: 50, horas: 8400, factorCapex: 1 };

/** Meta del reto Ecopetrol (artefacto del proyecto): 7 PJ de ahorro térmico en 4 años. */
export const META_RETO = { pj: 7, anios: 4, pjAnio: 1.75, mwPromedio: 55 } as const;

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
/**
 * El MWh eléctrico vale más que el térmico: USD 0,224/kWh de electricidad (artefacto del proyecto) frente a
 * USD 50/MWh de calor → 4,48 veces. El frío vale lo de la electricidad que evita (428 kW de frío ahorran
 * 100,5 kW eléctricos ≈ USD 52,6/MWh de frío), así que USD 50/MWh es coherente.
 */
export const PRECIO_RELATIVO: Record<TipoDemanda, number> = { CALOR: 1, FRIO: 1, ELECTRICIDAD: 4.48 };
/** m³ de gas natural por MWh térmico (≈ 10,5 kWh/m³, ilustrativo). */
export const GAS_M3_POR_MWH = 95;

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
  | "impacto";

export interface Camara {
  lng: number;
  lat: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

export interface Paso {
  id: IdPaso;
  etapa: "El problema" | "Diagnóstico" | "Estructuración" | "Decisión" | "Ejecución";
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
    id: "problema", etapa: "El problema", titulo: "Calor que se pierde", bajada: "Energía pagada que se va al aire",
    texto: "La refinería quema combustible para producir calor y luego disipa una parte a la atmósfera y al agua de enfriamiento. Ese calor residual ya está pagado, pero hoy nadie lo mide ni lo aprovecha.",
    clave: "Cada megavatio que se pierde es combustible comprado dos veces: una para producirlo y otra para reemplazarlo donde sí se necesita.",
    camara: { ...PLANTA, zoom: 16.05, pitch: 0, bearing: 0 },
  },
  {
    id: "inventario", etapa: "Diagnóstico", titulo: "Inventario térmico", bajada: "Fuentes y demandas, sección por sección",
    texto: "Cada fuente se ubica en la sección de la planta que la genera y se caracteriza por temperatura, potencia, continuidad y origen del dato. Cada demanda, por la temperatura y la energía que necesita. Retícula caliente: ofrece calor. Retícula fría: lo necesita.",
    clave: "Sin inventario no hay negocio. Cada dato declara su origen: medido, declarado o estimado.",
    camara: { ...PLANTA, zoom: 16.25, pitch: 20, bearing: 0 },
  },
  {
    id: "termico", etapa: "Diagnóstico", titulo: "Mapa térmico", bajada: "Dónde se concentra el calor",
    texto: "La plataforma convierte el inventario en una termografía de la planta: los tonos más calientes muestran dónde se concentra la energía disponible. Ajuste la paleta y la intensidad en la ficha.",
    clave: "Ver el calor sobre el plano de la planta convierte un listado técnico en una conversación de negocio.",
    camara: { ...PLANTA, zoom: 16.15, pitch: 0, bearing: 0 },
  },
  {
    id: "cruce", etapa: "Diagnóstico", titulo: "Cruce fuente–demanda", bajada: "El motor compara todo con todo",
    texto: "El motor cruza las 8 fuentes con las 7 demandas (56 pares) por los racks de tubería de la planta y verifica cinco criterios: temperatura, potencia, continuidad, longitud de tubería y calidad del dato. Verde: compatible. Ámbar: condicionado. Los descartados no se trazan.",
    clave: "Las reglas son físicas: el calor solo pasa de mayor a menor temperatura, salvo que una bomba de calor lo eleve.",
    camara: { ...PLANTA, zoom: 16.25, pitch: 25, bearing: 0 },
  },
  {
    id: "tecnologia", etapa: "Estructuración", titulo: "Tecnología", bajada: "Cómo se aprovecha cada par",
    texto: "Para el par elegido, la plataforma traza la tubería por el rack y propone la tecnología que encaja con el salto de temperatura: intercambiador, bomba de calor, recuperación de condensado, chiller de absorción u ORC.",
    clave: "La misma fuente puede producir calor, frío o electricidad: la tecnología define cuánto vale cada megavatio.",
    camara: { ...PLANTA, zoom: 17.7, pitch: 35, bearing: -15 }, enfocarOportunidad: true,
  },
  {
    id: "modelo", etapa: "Estructuración", titulo: "Modelo de negocio", bajada: "Cómo paga la refinería",
    texto: "La misma oportunidad se puede pagar de siete formas. La plataforma compara, año a año, el flujo de caja de la refinería: cuánto invierte, qué parte del ahorro conserva y qué riesgo asume quien ejecuta.",
    clave: "Con un modelo ESCO la refinería no invierte: paga con una parte del ahorro verificado.",
    camara: { ...PLANTA, zoom: 17.5, pitch: 30, bearing: 10 }, enfocarOportunidad: true,
  },
  {
    id: "evaluacion", etapa: "Decisión", titulo: "Evaluación", bajada: "Cifras para decidir",
    texto: "Con la tecnología y el modelo elegidos, la plataforma calcula potencia útil, energía anual, ahorro, CAPEX, retorno y CO₂ evitado, y los resume en un puntaje de 8 criterios. Mueva los supuestos y vea el resultado al instante.",
    clave: "El puntaje convierte criterios técnicos y económicos en una sola prioridad comparable entre oportunidades.",
    camara: { ...PLANTA, zoom: 17.4, pitch: 25, bearing: 0 }, enfocarOportunidad: true,
  },
  {
    id: "portafolio", etapa: "Decisión", titulo: "Portafolio priorizado", bajada: "Qué hacer primero",
    texto: "Todas las oportunidades se ubican en una matriz de prioridad: viabilidad técnica contra valor económico. Sus tuberías se trazan por los racks con el color de su prioridad: P1 piloto, P2 prefactibilidad, P3 y P4 en espera.",
    clave: "Un portafolio ordenado le dice a la refinería dónde poner el primer dólar y qué sigue después.",
    camara: { ...PLANTA, zoom: 16.2, pitch: 15, bearing: 0 },
  },
  {
    id: "monitoreo", etapa: "Ejecución", titulo: "Piloto y monitoreo", bajada: "Medir para verificar",
    texto: "El piloto se instrumenta con sensórica clamp-on, sin parar el proceso: temperatura y caudal en la salida de la fuente y en la entrada de la demanda. El tablero compara en tiempo real el calor entregado contra el esperado.",
    clave: "Lo que se mide se puede cobrar: el ahorro verificado con el protocolo IPMVP es la base del pago en un modelo ESCO.",
    camara: { ...PLANTA, zoom: 18.1, pitch: 45, bearing: 20 }, enfocarOportunidad: true,
  },
  {
    id: "impacto", etapa: "Ejecución", titulo: "Impacto", bajada: "Calor rescatado, verificado",
    texto: "Cada mes se emite un reporte de calor rescatado: MWh recuperados, gas natural evitado, ahorro y CO₂, trazable a las mediciones. El portafolio completo multiplica ese impacto en toda la refinería.",
    clave: "Del calor invisible a un activo medible, priorizado y financiable.",
    camara: { ...PLANTA, zoom: 16.05, pitch: 0, bearing: 0 },
  },
];

export const ETAPAS = ["El problema", "Diagnóstico", "Estructuración", "Decisión", "Ejecución"] as const;
