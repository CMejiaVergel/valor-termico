// Escenario de la vitrina Calor Rescatado. Todo es ILUSTRATIVO: las fuentes,
// demandas, ubicaciones y cifras salen del prototipo v1 (referencia/) y de la
// guía de uso; sirven para contar la mecánica del software, no describen la
// operación real de la refinería. Toda cifra mostrada declara su origen.

export type Origen = "MEDIDO" | "DECLARADO" | "ESTIMADO";
export type Continuidad = "Alta" | "Media" | "Variable";
export type TipoDemanda = "CALOR" | "FRIO" | "ELECTRICIDAD";
export type Zona = "Utilities" | "Destilación" | "Conversión" | "Enfriamiento" | "Servicios";

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
  { id: "F1", nombre: "Vapor LP excedente", tipo: "Vapor", tMin: 120, tMax: 180, potencia: 12, continuidad: "Alta", ubicacion: "Calderas / utilities", zona: "Utilities", origen: "DECLARADO", lng: -75.4991, lat: 10.3182 },
  { id: "F2", nombre: "Condensado caliente", tipo: "Líquido", tMin: 80, tMax: 110, potencia: 6, continuidad: "Alta", ubicacion: "Retorno de condensado", zona: "Utilities", origen: "DECLARADO", lng: -75.4993, lat: 10.3168 },
  { id: "F3", nombre: "Gases calientes FCC", tipo: "Gas", tMin: 180, tMax: 300, potencia: 15, continuidad: "Media", ubicacion: "Craqueo catalítico (FCC)", zona: "Conversión", origen: "ESTIMADO", lng: -75.4953, lat: 10.3168 },
  { id: "F4", nombre: "Agua de enfriamiento", tipo: "Agua", tMin: 35, tMax: 55, potencia: 20, continuidad: "Alta", ubicacion: "Torres de enfriamiento", zona: "Enfriamiento", origen: "DECLARADO", lng: -75.492, lat: 10.3186 },
  { id: "F5", nombre: "Purgas de vapor", tipo: "Vapor", tMin: 100, tMax: 160, potencia: 3, continuidad: "Variable", ubicacion: "Red de vapor", zona: "Utilities", origen: "ESTIMADO", lng: -75.4985, lat: 10.3182 },
  { id: "F6", nombre: "Corriente líquida caliente", tipo: "Líquido", tMin: 100, tMax: 150, potencia: 10, continuidad: "Alta", ubicacion: "Unidad de crudo (CDU)", zona: "Destilación", origen: "DECLARADO", lng: -75.4979, lat: 10.3162 },
  { id: "F7", nombre: "Calor de compresores", tipo: "Aire / agua", tMin: 60, tMax: 90, potencia: 4, continuidad: "Alta", ubicacion: "Servicios industriales", zona: "Servicios", origen: "DECLARADO", lng: -75.499, lat: 10.3135 },
  { id: "F8", nombre: "Calor disperso viscorreducción", tipo: "Mixto", tMin: 40, tMax: 80, potencia: 8, continuidad: "Variable", ubicacion: "Viscorreducción", zona: "Conversión", origen: "ESTIMADO", lng: -75.4945, lat: 10.3164 },
];

export const DEMANDAS: Demanda[] = [
  { id: "D1", nombre: "Agua helada de edificios", tipo: "FRIO", tReq: 10, rango: "7–12 °C", potencia: 2, ubicacion: "Edificio administrativo", origen: "DECLARADO", lng: -75.501, lat: 10.3125 },
  { id: "D2", nombre: "Salas de control", tipo: "FRIO", tReq: 10, rango: "7–12 °C", potencia: 1, ubicacion: "Unidad de crudo (CDU)", origen: "DECLARADO", lng: -75.4972, lat: 10.3166 },
  { id: "D3", nombre: "Subestaciones", tipo: "FRIO", tReq: 21, rango: "18–24 °C", potencia: 0.8, ubicacion: "Subestación eléctrica", origen: "ESTIMADO", lng: -75.4924, lat: 10.3135 },
  { id: "D4", nombre: "Precalentamiento de agua", tipo: "CALOR", tReq: 75, rango: "60–90 °C", potencia: 4, ubicacion: "Calderas", origen: "DECLARADO", lng: -75.4998, lat: 10.3186 },
  { id: "D5", nombre: "Corriente fría de proceso", tipo: "CALOR", tReq: 125, rango: "100–150 °C", potencia: 8, ubicacion: "Unidad de crudo (CDU)", origen: "DECLARADO", lng: -75.4974, lat: 10.3156 },
  { id: "D6", nombre: "Electricidad auxiliar", tipo: "ELECTRICIDAD", tReq: 150, rango: "> 150 °C", potencia: 1, ubicacion: "Servicios industriales", origen: "DECLARADO", lng: -75.4996, lat: 10.3131 },
  { id: "D7", nombre: "Confort terminal marítimo", tipo: "FRIO", tReq: 10, rango: "7–12 °C", potencia: 1.5, ubicacion: "Terminal marítimo", origen: "ESTIMADO", lng: -75.4912, lat: 10.3145 },
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
  { id: "M2", nombre: "ESCO", descripcion: "El proveedor invierte y cobra un porcentaje del ahorro verificado.", inversionCliente: 0, participacionCliente: 0.7, riesgoProveedor: "Alto", pagoPorResultado: "Sí" },
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
export const SUPUESTOS_INICIALES: Supuestos = { eficiencia: 0.6, costoEnergia: 50, horas: 8000, factorCapex: 1 };

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
/** El MWh eléctrico vale más que el térmico. */
export const PRECIO_RELATIVO: Record<TipoDemanda, number> = { CALOR: 1, FRIO: 1, ELECTRICIDAD: 2.2 };
/** m³ de gas natural por MWh térmico (≈ 10,5 kWh/m³, ilustrativo). */
export const GAS_M3_POR_MWH = 95;

/** Oportunidad protagonista del recorrido. */
export const OPORTUNIDAD_INICIAL = { fuente: "F1", demanda: "D4", tecnologia: "T1", modelo: "M2" } as const;

/** Unidades de proceso (volúmenes de la vista 3D). Altura en metros. */
export const UNIDADES: Array<{ nombre: string; altura: number; color: [number, number, number]; poligono: Array<[number, number]> }> = [
  { nombre: "Calderas", altura: 18, color: [14, 58, 66], poligono: [[-75.5, 10.319], [-75.4985, 10.319], [-75.4985, 10.318], [-75.5, 10.318]] },
  { nombre: "Destilación atmosférica (CDU)", altura: 25, color: [26, 46, 56], poligono: [[-75.4983, 10.3173], [-75.4963, 10.3173], [-75.4963, 10.316], [-75.4983, 10.316]] },
  { nombre: "Destilación al vacío (VDU)", altura: 22, color: [30, 50, 64], poligono: [[-75.4983, 10.3158], [-75.4968, 10.3158], [-75.4968, 10.3148], [-75.4983, 10.3148]] },
  { nombre: "FCC", altura: 28, color: [62, 30, 24], poligono: [[-75.496, 10.3178], [-75.4945, 10.3178], [-75.4945, 10.3165], [-75.496, 10.3165]] },
  { nombre: "Hidrocraqueo", altura: 26, color: [46, 34, 56], poligono: [[-75.4943, 10.3175], [-75.493, 10.3175], [-75.493, 10.3164], [-75.4943, 10.3164]] },
  { nombre: "Coquización", altura: 24, color: [54, 38, 26], poligono: [[-75.496, 10.3163], [-75.4947, 10.3163], [-75.4947, 10.3152], [-75.496, 10.3152]] },
  { nombre: "Torres de enfriamiento", altura: 30, color: [12, 40, 56], poligono: [[-75.4928, 10.3193], [-75.4912, 10.3193], [-75.4912, 10.318], [-75.4928, 10.318]] },
  { nombre: "Planta de hidrógeno", altura: 18, color: [26, 48, 64], poligono: [[-75.4945, 10.315], [-75.4932, 10.315], [-75.4932, 10.3141], [-75.4945, 10.3141]] },
  { nombre: "Planta de azufre", altura: 16, color: [42, 40, 48], poligono: [[-75.4965, 10.3148], [-75.495, 10.3148], [-75.495, 10.3139], [-75.4965, 10.3139]] },
  { nombre: "Hidrotratamiento", altura: 20, color: [30, 46, 56], poligono: [[-75.4965, 10.3138], [-75.4947, 10.3138], [-75.4947, 10.3128], [-75.4965, 10.3128]] },
  { nombre: "Planta eléctrica", altura: 14, color: [26, 40, 40], poligono: [[-75.493, 10.314], [-75.4918, 10.314], [-75.4918, 10.313], [-75.493, 10.313]] },
  { nombre: "Administración", altura: 10, color: [24, 40, 48], poligono: [[-75.5018, 10.313], [-75.5005, 10.313], [-75.5005, 10.312], [-75.5018, 10.312]] },
  { nombre: "Servicios industriales", altura: 14, color: [20, 40, 48], poligono: [[-75.4998, 10.3138], [-75.4983, 10.3138], [-75.4983, 10.3128], [-75.4998, 10.3128]] },
  { nombre: "Terminal marítimo", altura: 8, color: [22, 36, 40], poligono: [[-75.4918, 10.315], [-75.4905, 10.315], [-75.4905, 10.314], [-75.4918, 10.314]] },
];

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

// Algo al norte del centro geométrico: con la cámara inclinada la planta queda en el centro de la pantalla.
const PLANTA = { lng: -75.4962, lat: 10.3166 };

export const PASOS: Paso[] = [
  {
    id: "problema", etapa: "El problema", titulo: "Calor que se pierde", bajada: "Energía pagada que se va al aire",
    texto: "La refinería quema combustible para producir calor y luego disipa una parte a la atmósfera y al agua de enfriamiento. Ese calor residual ya está pagado, pero hoy nadie lo mide ni lo aprovecha.",
    clave: "Cada megavatio que se pierde es combustible comprado dos veces: una para producirlo y otra para reemplazarlo donde sí se necesita.",
    camara: { ...PLANTA, zoom: 15.7, pitch: 58, bearing: -18 },
  },
  {
    id: "inventario", etapa: "Diagnóstico", titulo: "Inventario térmico", bajada: "Fuentes y demandas caracterizadas",
    texto: "Cada fuente se caracteriza por temperatura, potencia, continuidad y ubicación; cada demanda, por la temperatura y la energía que necesita. Naranja: ofrece calor. Azul: lo necesita. La altura es la potencia.",
    clave: "Sin inventario no hay negocio. Cada dato declara su origen: medido, declarado o estimado.",
    camara: { ...PLANTA, zoom: 16.1, pitch: 60, bearing: 12 },
  },
  {
    id: "termico", etapa: "Diagnóstico", titulo: "Mapa térmico", bajada: "Dónde se concentra el calor",
    texto: "La plataforma convierte el inventario en un mapa de calor de la planta, como una termografía: los tonos calientes muestran dónde se concentra la energía disponible. Ajuste la intensidad y la paleta en el panel.",
    clave: "Ver el calor en el plano de la planta convierte un listado técnico en una conversación de negocio.",
    camara: { ...PLANTA, zoom: 16, pitch: 45, bearing: -5 },
  },
  {
    id: "cruce", etapa: "Diagnóstico", titulo: "Cruce fuente–demanda", bajada: "El motor compara todo con todo",
    texto: "El motor cruza las 8 fuentes con las 7 demandas (56 pares) y verifica cinco criterios: nivel de temperatura, potencia, continuidad, distancia y calidad del dato. Verde: compatible. Ámbar: condicionado. Gris: descartado.",
    clave: "Las reglas son físicas: el calor solo pasa de mayor a menor temperatura, salvo que una bomba de calor lo eleve.",
    camara: { ...PLANTA, zoom: 16.15, pitch: 62, bearing: -32 },
  },
  {
    id: "tecnologia", etapa: "Estructuración", titulo: "Tecnología", bajada: "Cómo se aprovecha cada par",
    texto: "Para cada par compatible, la plataforma propone la tecnología que encaja con el salto de temperatura: intercambiador, bomba de calor, recuperación de condensado, chiller de absorción u ORC. Elija una en el panel.",
    clave: "La misma fuente puede producir calor, frío o electricidad: la tecnología define cuánto vale cada megavatio.",
    camara: { ...PLANTA, zoom: 17.6, pitch: 66, bearing: -40 }, enfocarOportunidad: true,
  },
  {
    id: "modelo", etapa: "Estructuración", titulo: "Modelo de negocio", bajada: "Quién invierte y quién gana",
    texto: "La misma oportunidad se puede ejecutar con siete modelos. La plataforma compara el beneficio neto de la refinería a 5 años, cuánto invierte y qué riesgo asume el proveedor.",
    clave: "Con un modelo ESCO la refinería no invierte: paga con una parte del ahorro verificado.",
    camara: { ...PLANTA, zoom: 17.4, pitch: 58, bearing: 25 }, enfocarOportunidad: true,
  },
  {
    id: "evaluacion", etapa: "Decisión", titulo: "Evaluación", bajada: "Cifras para decidir",
    texto: "Con la tecnología y el modelo elegidos, la plataforma calcula potencia útil, energía anual, ahorro, CAPEX, retorno y CO₂ evitado, y los resume en un puntaje de 8 criterios. Mueva los supuestos y vea el resultado al instante.",
    clave: "El puntaje convierte criterios técnicos y económicos en una sola prioridad comparable entre oportunidades.",
    camara: { ...PLANTA, zoom: 17.2, pitch: 52, bearing: -8 }, enfocarOportunidad: true,
  },
  {
    id: "portafolio", etapa: "Decisión", titulo: "Portafolio priorizado", bajada: "Qué hacer primero",
    texto: "Todas las oportunidades se ubican en una matriz de prioridad: viabilidad técnica contra valor económico. P1 son pilotos prioritarios; P2 pasan a prefactibilidad; P3 y P4 esperan.",
    clave: "Un portafolio ordenado le dice a la refinería dónde poner el primer dólar y qué sigue después.",
    camara: { ...PLANTA, zoom: 16.05, pitch: 60, bearing: 30 },
  },
  {
    id: "monitoreo", etapa: "Ejecución", titulo: "Piloto y monitoreo", bajada: "Medir para verificar",
    texto: "El piloto se instrumenta con sensórica clamp-on, sin parar el proceso: temperatura y caudal a la entrada y la salida. El tablero compara en tiempo real el calor entregado contra el esperado.",
    clave: "Lo que se mide se puede cobrar: el ahorro verificado es la base del pago en un modelo ESCO.",
    camara: { ...PLANTA, zoom: 18, pitch: 70, bearing: 38 }, enfocarOportunidad: true,
  },
  {
    id: "impacto", etapa: "Ejecución", titulo: "Impacto", bajada: "Calor rescatado, verificado",
    texto: "Cada mes se emite un reporte de calor rescatado: MWh recuperados, gas natural evitado, ahorro y CO₂, trazable a las mediciones. El portafolio completo multiplica ese impacto en toda la refinería.",
    clave: "Del calor invisible a un activo medible, priorizado y financiable.",
    camara: { ...PLANTA, zoom: 15.8, pitch: 55, bearing: -12 },
  },
];

export const ETAPAS = ["El problema", "Diagnóstico", "Estructuración", "Decisión", "Ejecución"] as const;
