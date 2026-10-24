"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Map as MapaMapbox, Marker } from "mapbox-gl";
import type { MapboxOverlay } from "@deck.gl/mapbox";
import type { Layer, PickingInfo } from "@deck.gl/core";
import { DEMANDAS, FUENTES, PASOS, UNIDADES, type IdPaso } from "@/dominio/escenario";
import type { Oportunidad, Par, Prioridad } from "@/dominio/motor";
import { enCamino, hash01, desplazar, type Punto3D } from "@/componentes/mapa/geometria";
import { rgbTemperatura } from "@/componentes/ui";

// Mapa 3D de la vitrina (estructura heredada de la Vitrina de ConfluencIA
// Hídrica): Mapbox Standard satélite con deck.gl intercalado en el mismo lienzo.
// Capas por paso: columnas de potencia (fuentes por temperatura, demandas en
// azul), plumas de calor que se pierde, mapa térmico, arcos de compatibilidad,
// flujo de calor de la oportunidad, portafolio por prioridad y sensores.
//
// Entrada: la pantalla de carga tapa la precarga (planta, un zoom más cerca,
// planeta y ensayo del vuelo); luego vuela desde el planeta hasta el paso 1.
// Rendimiento: un solo requestAnimationFrame; las capas fijas solo se rehacen
// cuando cambian los datos; lo que late cambia uniforms.

export type FaseEntrada = "CARGA" | "VUELO" | "LISTA";
export type PaletaCalor = "clasica" | "ironbow" | "arcoiris" | "blanco";

export const PALETAS: Record<PaletaCalor, { nombre: string; colores: Array<[number, number, number]> }> = {
  clasica: { nombre: "Clásica", colores: [[0, 174, 192], [74, 222, 128], [207, 232, 78], [255, 138, 61], [240, 71, 154], [239, 68, 68]] },
  ironbow: { nombre: "Ironbow", colores: [[20, 0, 40], [90, 10, 110], [180, 30, 90], [230, 100, 20], [250, 190, 20], [255, 255, 255]] },
  arcoiris: { nombre: "Arcoíris", colores: [[0, 30, 220], [0, 200, 220], [0, 220, 80], [230, 220, 0], [255, 120, 0], [230, 30, 30]] },
  blanco: { nombre: "Blanco caliente", colores: [[30, 30, 30], [80, 80, 80], [130, 130, 130], [190, 190, 190], [230, 230, 230], [255, 255, 255]] },
};

const AZUL: [number, number, number] = [96, 165, 250];
const VERDE: [number, number, number] = [74, 222, 128];
const AMBAR: [number, number, number] = [250, 204, 21];
const GRIS: [number, number, number] = [120, 140, 145];
const LIMA: [number, number, number] = [207, 232, 78];
export const COLOR_PRIORIDAD: Record<Prioridad, [number, number, number]> = { P1: [74, 222, 128], P2: [0, 174, 192], P3: [250, 204, 21], P4: [120, 140, 145] };

interface Nodo {
  id: string;
  lng: number;
  lat: number;
  nombre: string;
  sub: string;
  fuente: boolean;
  potencia: number;
  color: [number, number, number];
  tenue: boolean;
}

interface Arco {
  id: string;
  camino: Punto3D[];
  color: [number, number, number];
  ancho: number;
  alfa: number;
  /** Colores de origen y destino para las partículas de flujo. */
  desde: [number, number, number];
  hasta: [number, number, number];
  flujo: boolean;
}

/** Arco 3D entre dos puntos de la planta (más bajo que el de ConfluencIA: aquí las distancias son de cientos de metros). */
function arcoPlanta(a: { lng: number; lat: number }, b: { lng: number; lat: number }, n = 48): Punto3D[] {
  const dx = (a.lng - b.lng) * 111_320 * Math.cos((a.lat * Math.PI) / 180);
  const dy = (a.lat - b.lat) * 111_320;
  const alto = Math.min(170, 0.35 * Math.hypot(dx, dy) + 28);
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    return [a.lng + (b.lng - a.lng) * t, a.lat + (b.lat - a.lat) * t, alto * Math.sin(Math.PI * t)];
  });
}

const PASO_ID = (i: number): IdPaso => PASOS[Math.max(0, Math.min(PASOS.length - 1, i))]!.id;
const ENFOQUE: IdPaso[] = ["tecnologia", "modelo", "evaluacion", "monitoreo"];

interface Escena {
  /** Multiplicador de la altura de las columnas: de cerca se bajan para no tapar el arco. */
  alturaColumnas: number;
  nodos: Nodo[];
  arcos: Arco[];
  plumas: boolean;
  calor: boolean;
  sensores: Punto3D[];
  etiquetas: Set<string>;
}

function construirEscena(paso: number, pares: Par[], oportunidad: Oportunidad, cartera: Oportunidad[], parSel: string | null): Escena {
  const id = PASO_ID(paso);
  const enfoque = ENFOQUE.includes(id);
  const parOp = `${oportunidad.fuente.id}-${oportunidad.demanda.id}`;
  const fuentes: Nodo[] = FUENTES.map((f) => ({
    id: f.id, lng: f.lng, lat: f.lat, nombre: `${f.id} · ${f.nombre}`, sub: `${f.tMin}–${f.tMax} °C · ${f.potencia} MW`, fuente: true, potencia: f.potencia,
    color: rgbTemperatura(f.tMax), tenue: enfoque && f.id !== oportunidad.fuente.id,
  }));
  const demandas: Nodo[] = DEMANDAS.map((d) => ({
    id: d.id, lng: d.lng, lat: d.lat, nombre: `${d.id} · ${d.nombre}`, sub: `${d.tReq} °C · ${d.potencia} MW`, fuente: false, potencia: d.potencia,
    color: AZUL, tenue: enfoque && d.id !== oportunidad.demanda.id,
  }));
  const nodos = id === "problema" ? fuentes : [...fuentes, ...demandas];
  let arcos: Arco[] = [];
  const arcoDe = (fId: string, dId: string, color: [number, number, number], ancho: number, alfa: number, flujo: boolean): Arco => {
    const f = FUENTES.find((x) => x.id === fId)!;
    const d = DEMANDAS.find((x) => x.id === dId)!;
    return { id: `${fId}-${dId}`, camino: arcoPlanta(f, d), color, ancho, alfa, desde: rgbTemperatura(f.tMax), hasta: AZUL, flujo };
  };
  if (id === "cruce") {
    arcos = pares.map((p) => {
      const sel = p.id === parSel;
      const color = p.estado === "COMPATIBLE" ? VERDE : p.estado === "CONDICIONADO" ? AMBAR : GRIS;
      return arcoDe(p.fuente.id, p.demanda.id, sel ? LIMA : color, sel ? 7 : p.estado === "DESCARTADO" ? 1.2 : 2.6, sel ? 255 : p.estado === "DESCARTADO" ? 70 : 205, false);
    });
  } else if (id === "portafolio" || id === "impacto") {
    arcos = cartera.map((o) => {
      const esOp = `${o.fuente.id}-${o.demanda.id}` === parOp;
      return arcoDe(o.fuente.id, o.demanda.id, COLOR_PRIORIDAD[o.prioridad], esOp ? 7 : 4.5, 240, id === "impacto" || esOp);
    });
  } else if (enfoque) {
    arcos = [arcoDe(oportunidad.fuente.id, oportunidad.demanda.id, LIMA, 7, 255, true)];
  }
  const fOp = FUENTES.find((f) => f.id === oportunidad.fuente.id)!;
  const dOp = DEMANDAS.find((d) => d.id === oportunidad.demanda.id)!;
  const sensores: Punto3D[] = id === "monitoreo" || id === "impacto" ? [[fOp.lng, fOp.lat, 0], [dOp.lng, dOp.lat, 0]] : [];
  const etiquetas = new Set<string>(
    enfoque ? [oportunidad.fuente.id, oportunidad.demanda.id]
    : id === "portafolio" || id === "impacto" ? cartera.flatMap((o) => [o.fuente.id, o.demanda.id])
    : nodos.map((n) => n.id),
  );
  return { alturaColumnas: enfoque ? 0.3 : 1, nodos, arcos, plumas: id === "problema", calor: id === "termico", sensores, etiquetas };
}

/** Puntos del mapa térmico: una nube alrededor de cada fuente, pesada por potencia y temperatura (determinista). */
const PUNTOS_CALOR = FUENTES.flatMap((f) =>
  Array.from({ length: 40 }, (_, k) => {
    const r = 15 + hash01(`${f.id}r${k}`) * 110;
    const [lng, lat] = desplazar(f.lng, f.lat, r, hash01(`${f.id}a${k}`) * Math.PI * 2);
    return { p: [lng, lat] as [number, number], w: (f.potencia * (f.tMax / 100)) / (1 + r / 60) };
  }),
);
const PESO_MAX = Math.max(...PUNTOS_CALOR.map((x) => x.w));
const GEOJSON_CALOR = {
  type: "FeatureCollection" as const,
  features: PUNTOS_CALOR.map((x) => ({ type: "Feature" as const, properties: { w: x.w / PESO_MAX }, geometry: { type: "Point" as const, coordinates: x.p } })),
};

/**
 * Mapa térmico como capa nativa de Mapbox (la HeatmapLayer de deck.gl no dibuja
 * con el lienzo compartido). Se vuelve a crear tras cada cambio de estilo.
 */
function colorCalor(paleta: PaletaCalor): unknown[] {
  const c = PALETAS[paleta].colores;
  const paradas = c.flatMap((rgb, i) => [0.12 + (i / (c.length - 1)) * 0.88, `rgba(${rgb.join(",")},${(0.45 + (i / (c.length - 1)) * 0.5).toFixed(2)})`]);
  return ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(0,0,0,0)", ...paradas];
}
function asegurarCapaCalor(m: MapaMapbox, visible: boolean, paleta: PaletaCalor, intensidad: number) {
  // isStyleLoaded() es falso mientras cargan teselas: no sirve de compuerta. Si el
  // estilo de verdad no está listo, addSource lanza y se reintenta al quedar quieto.
  try {
    aplicarCapaCalor(m, visible, paleta, intensidad);
  } catch {
    m.once("idle", () => {
      try {
        aplicarCapaCalor(m, visible, paleta, intensidad);
      } catch {
        // El siguiente cambio de paso o de estilo lo vuelve a intentar.
      }
    });
  }
}
function aplicarCapaCalor(m: MapaMapbox, visible: boolean, paleta: PaletaCalor, intensidad: number) {
  if (!m.getSource("calor")) m.addSource("calor", { type: "geojson", data: GEOJSON_CALOR });
  if (!m.getLayer("calor")) {
    m.addLayer({
      id: "calor",
      type: "heatmap",
      source: "calor",
      paint: {
        "heatmap-weight": ["get", "w"],
        "heatmap-radius": ["interpolate", ["exponential", 2], ["zoom"], 13, 8, 16, 45, 18, 170],
        "heatmap-opacity": 0.85,
      },
    });
  }
  m.setLayoutProperty("calor", "visibility", visible ? "visible" : "none");
  m.setPaintProperty("calor", "heatmap-intensity", intensidad);
  m.setPaintProperty("calor", "heatmap-color", colorCalor(paleta) as never);
}

/** Partículas de calor que suben desde cada fuente (paso 1: el calor que se pierde). */
const ALTO_COLUMNA = 9; // m de columna por MW
const PLUMAS = FUENTES.flatMap((f) =>
  Array.from({ length: Math.round(8 + f.potencia * 1.6) }, (_, k) => {
    // Nacen en la punta de la columna y se abren al subir (el calor que se va al aire).
    const angulo = hash01(`${f.id}q${k}`) * Math.PI * 2;
    const [lng0, lat0] = desplazar(f.lng, f.lat, hash01(`${f.id}p${k}`) * 10, angulo);
    const [lng1, lat1] = desplazar(f.lng, f.lat, 25 + hash01(`${f.id}d${k}`) * 45, angulo);
    return { lng0, lat0, lng1, lat1, base: f.potencia * ALTO_COLUMNA, fase: hash01(`${f.id}f${k}`), color: rgbTemperatura(f.tMax), alto: 70 + f.potencia * 5 };
  }),
);

/** Refinerías y zonas industriales para la vista de país (solo Cartagena es el piloto; las demás son ilustrativas). */
interface Sitio {
  id: string;
  nombre: string;
  sub: string;
  lng: number;
  lat: number;
  piloto: boolean;
}
const SITIOS: Sitio[] = [
  { id: "cartagena", nombre: "Refinería de Cartagena", sub: "piloto · Mamonal", lng: -75.4962, lat: 10.3158, piloto: true },
  { id: "barrancabermeja", nombre: "Refinería de Barrancabermeja", sub: "posible réplica (ilustrativo)", lng: -73.86, lat: 7.06, piloto: false },
  { id: "barranquilla", nombre: "Zona industrial Barranquilla", sub: "posible réplica (ilustrativo)", lng: -74.79, lat: 10.99, piloto: false },
  { id: "yumbo", nombre: "Yumbo · Cali", sub: "posible réplica (ilustrativo)", lng: -76.49, lat: 3.58, piloto: false },
  { id: "bogota", nombre: "Sabana de Bogotá", sub: "posible réplica (ilustrativo)", lng: -74.21, lat: 4.71, piloto: false },
  { id: "medellin", nombre: "Valle de Aburrá", sub: "posible réplica (ilustrativo)", lng: -75.6, lat: 6.17, piloto: false },
];

type Nivel = 0 | 1 | 2 | 3;
const nivelPara = (zoom: number): Nivel => (zoom < 4 ? 0 : zoom < 9.5 ? 1 : zoom < 13.5 ? 2 : 3);

const CAMARA_PLANETA = { center: [-74.6, 9.8] as [number, number], zoom: 1.6, pitch: 0, bearing: 0 };
const LIMITES_NAVEGACION: [[number, number], [number, number]] = [[-83, -6], [-64, 15.5]];
const DURACION_VUELO_MS = 13000;
const suave = (t: number) => (1 - Math.cos(Math.PI * t)) / 2;
const SOBRE_EL_SUELO = { depthCompare: "always" } as const;
const MANEJADORES = ["dragPan", "dragRotate", "scrollZoom", "boxZoom", "keyboard", "doubleClickZoom", "touchZoomRotate", "touchPitch"] as const;

function interaccion(m: MapaMapbox, activa: boolean) {
  for (const h of MANEJADORES) {
    if (activa) m[h].enable();
    else m[h].disable();
  }
}

function esperarIdle(m: MapaMapbox, tope: number): Promise<void> {
  return new Promise((resolver) => {
    const fin = () => {
      clearTimeout(t);
      m.off("idle", fin);
      resolver();
    };
    const t = setTimeout(fin, tope);
    m.on("idle", fin);
  });
}

/** Resolución del lienzo acotada (1,5× normal, 1× en pantallas muy grandes), como en ConfluencIA. */
function limitarResolucion(): () => void {
  const real = window.devicePixelRatio || 1;
  const limite = window.innerWidth * real > 2560 ? 1 : Math.min(real, 1.5);
  if (limite >= real) return () => {};
  const original = Object.getOwnPropertyDescriptor(window, "devicePixelRatio");
  Object.defineProperty(window, "devicePixelRatio", { configurable: true, get: () => limite });
  return () => {
    if (original) Object.defineProperty(window, "devicePixelRatio", original);
    else Reflect.deleteProperty(window, "devicePixelRatio");
  };
}

function estiloMapa(satelite: boolean) {
  return {
    style: satelite ? "mapbox://styles/mapbox/standard-satellite" : "mapbox://styles/mapbox/standard",
    config: { basemap: { lightPreset: satelite ? "dusk" : "night", showPointOfInterestLabels: false, showTransitLabels: false } },
  };
}

type Margen = { top: number; bottom: number; left: number; right: number };

function camaraDe(paso: number, oportunidad: Oportunidad, ajusteZoom: number) {
  const p = PASOS[paso]!;
  const c = p.camara;
  const centro: [number, number] = p.enfocarOportunidad ? [(oportunidad.fuente.lng + oportunidad.demanda.lng) / 2, (oportunidad.fuente.lat + oportunidad.demanda.lat) / 2] : [c.lng, c.lat];
  return { center: centro, zoom: c.zoom + ajusteZoom, pitch: c.pitch, bearing: c.bearing };
}

interface Props {
  token: string;
  paso: number;
  satelite: boolean;
  orbitar: boolean;
  pares: Par[];
  oportunidad: Oportunidad;
  cartera: Oportunidad[];
  parSeleccionado: string | null;
  paleta: PaletaCalor;
  intensidad: number;
  fase: FaseEntrada;
  movimientoReducido: boolean;
  duracionCargaMs: number;
  margen: Margen;
  ajusteZoom: number;
  onFinEntrada: () => void;
  onSeleccionarPar: (id: string) => void;
  onSeleccionarPunto: (id: string) => void;
}

function MapaTermicoBase(props: Props) {
  const { token, paso, satelite, orbitar, pares, oportunidad, cartera, parSeleccionado, paleta, intensidad, fase, movimientoReducido, duracionCargaMs, margen, ajusteZoom } = props;
  const contenedor = useRef<HTMLDivElement>(null);
  const envoltorio = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaMapbox | null>(null);
  const overlay = useRef<MapboxOverlay | null>(null);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inicioPaso = useRef(0);
  const escena = useMemo(() => construirEscena(paso, pares, oportunidad, cartera, parSeleccionado), [paso, pares, oportunidad, cartera, parSeleccionado]);
  const vivo = useRef({ escena, orbitar, fase, paleta, intensidad });
  vivo.current = { escena, orbitar, fase, paleta, intensidad };
  const callbacks = useRef(props);
  callbacks.current = props;
  const pantalla = useRef({ margen, ajusteZoom, oportunidad, paso });
  pantalla.current = { margen, ajusteZoom, oportunidad, paso };
  const marcadores = useRef<Map<string, Marker>>(new Map());
  const claseMarcador = useRef<typeof import("mapbox-gl").default.Marker | null>(null);
  const montaje = useRef(0);
  const duracionCarga = useRef(duracionCargaMs);
  duracionCarga.current = duracionCargaMs;
  const sateliteAplicado = useRef(satelite);

  // Mapa + overlay, una vez.
  useEffect(() => {
    let cancelado = false;
    let cuadro = 0;
    let pintar: ((ahora: number) => void) | null = null;
    montaje.current = performance.now();
    inicioPaso.current = performance.now();
    const alVisibilidad = () => {
      if (document.visibilityState === "visible" && !cuadro && pintar) cuadro = requestAnimationFrame(pintar);
    };
    const restaurarResolucion = limitarResolucion();
    (async () => {
      const [{ default: mapboxgl }, { MapboxOverlay: Overlay }, capas] = await Promise.all([import("mapbox-gl"), import("@deck.gl/mapbox"), import("@deck.gl/layers")]);
      if (cancelado || !contenedor.current) return;
      mapboxgl.accessToken = token;
      const c0 = camaraDe(0, pantalla.current.oportunidad, 0);
      const m = new mapboxgl.Map({
        container: contenedor.current,
        ...estiloMapa(sateliteAplicado.current),
        ...c0,
        projection: "globe",
        renderWorldCopies: false,
        fadeDuration: 0,
        maxPitch: 75,
        maxTileCacheSize: 1200,
        antialias: false,
        language: "es",
      });
      interaccion(m, false);
      m.on("error", (e) => {
        if (String((e as { error?: { message?: string } }).error?.message ?? "").match(/token|401|403/i)) setError("No se pudo cargar el mapa: revise el token de Mapbox.");
      });
      const o = new Overlay({ interleaved: true, layers: [] });
      m.addControl(o);
      m.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "bottom-right");
      const observador = new ResizeObserver(() => m.resize());
      observador.observe(contenedor.current);
      m.once("remove", () => observador.disconnect());
      mapa.current = m;
      overlay.current = o;
      claseMarcador.current = mapboxgl.Marker;
      m.on("load", () => setListo(true));
      // Tras cada cambio de estilo (satélite ↔ nocturno) la capa nativa de calor se vuelve a crear.
      m.on("style.load", () => {
        const { escena: e, paleta: pal, intensidad: inten } = vivo.current;
        asegurarCapaCalor(m, e.calor, pal, inten);
      });

      const { ColumnLayer, PathLayer, ScatterplotLayer, PolygonLayer } = capas;
      let escenaFija: Escena | null = null;
      let crecerFijo = -1;
      let nivelFijo: Nivel | -1 = -1;
      let calorFijo = "";
      let fijas: Layer[] = [];
      let quieto = false;

      pintar = (ahora: number) => {
        cuadro = 0;
        const { escena: e, orbitar: orb, fase: f, paleta: pal, intensidad: inten } = vivo.current;
        const nivel = nivelPara(mapa.current?.getZoom() ?? 0);
        if (nivel !== nivelFijo) {
          if (envoltorio.current) envoltorio.current.dataset.nivel = String(nivel);
          if (nivel === 3) inicioPaso.current = ahora;
        }
        const crecer = Math.min(1, (ahora - inicioPaso.current) / 1400);
        const claveCalor = `${pal}|${inten}`;
        const cambian = e !== escenaFija || crecer !== crecerFijo || nivel !== nivelFijo || claveCalor !== calorFijo;
        const estatico = f !== "LISTA" || nivel < 3;
        if (estatico && !cambian && quieto) {
          if (document.visibilityState === "visible") cuadro = requestAnimationFrame(pintar!);
          return;
        }
        quieto = estatico;
        if (cambian) {
          escenaFija = e;
          crecerFijo = crecer;
          nivelFijo = nivel;
          calorFijo = claveCalor;
          fijas =
            nivel < 2
              ? [
                  new ScatterplotLayer<Sitio>({
                    id: "sitios",
                    parameters: SOBRE_EL_SUELO,
                    data: SITIOS,
                    getPosition: (s) => [s.lng, s.lat, 0],
                    getRadius: (s) => (s.piloto ? 9 : 6),
                    radiusUnits: "pixels",
                    getFillColor: (s) => (s.piloto ? [255, 138, 61, 245] : [0, 174, 192, 200]),
                    getLineColor: [255, 255, 255, 200],
                    stroked: true,
                    lineWidthMinPixels: 1.5,
                  }),
                ]
              : nivel === 2
                ? [
                    new ScatterplotLayer<Nodo>({
                      id: "puntos",
                      parameters: SOBRE_EL_SUELO,
                      data: e.nodos,
                      getPosition: (n) => [n.lng, n.lat, 0],
                      getRadius: 5,
                      radiusUnits: "pixels",
                      getFillColor: (n) => [...n.color, 235] as [number, number, number, number],
                      getLineColor: [255, 255, 255, 200],
                      stroked: true,
                      lineWidthMinPixels: 1.2,
                    }),
                  ]
                : [
                    new PolygonLayer<(typeof UNIDADES)[number]>({
                      id: "unidades",
                      data: UNIDADES,
                      extruded: true,
                      getPolygon: (u) => u.poligono,
                      getElevation: (u) => u.altura * crecer,
                      getFillColor: (u) => [...u.color, e.calor ? 90 : 170] as [number, number, number, number],
                      getLineColor: [0, 174, 192, 120],
                      updateTriggers: { getElevation: crecer, getFillColor: e.calor },
                    }),
                    new ColumnLayer<Nodo>({
                      id: "columnas",
                      data: e.nodos,
                      diskResolution: 28,
                      radius: 15,
                      extruded: true,
                      pickable: true,
                      getPosition: (n) => [n.lng, n.lat],
                      getElevation: (n) => n.potencia * ALTO_COLUMNA * e.alturaColumnas * crecer,
                      getFillColor: (n) => [...n.color, e.calor ? 70 : n.tenue ? 70 : 240] as [number, number, number, number],
                      onClick: (info: PickingInfo<Nodo>) => {
                        if (info.object) callbacks.current.onSeleccionarPunto(info.object.id);
                      },
                      updateTriggers: { getElevation: crecer, getFillColor: [e, e.calor] },
                    }),
                    new PathLayer<Arco>({
                      id: "arcos",
                      data: e.arcos,
                      pickable: true,
                      capRounded: true,
                      jointRounded: true,
                      billboard: true,
                      widthUnits: "pixels",
                      getPath: (a) => a.camino.slice(0, Math.max(2, Math.round(a.camino.length * crecer))),
                      getColor: (a) => [...a.color, a.alfa] as [number, number, number, number],
                      getWidth: (a) => a.ancho,
                      onClick: (info: PickingInfo<Arco>) => {
                        if (info.object) callbacks.current.onSeleccionarPar(info.object.id);
                      },
                      updateTriggers: { getPath: crecer },
                    }),
                  ];
        }
        const s = ahora / 1000;
        const animadas: Layer[] = [];
        if (nivel === 3 && !e.calor) {
          animadas.push(
            new ScatterplotLayer<Nodo>({
              id: "halos",
              parameters: SOBRE_EL_SUELO,
              data: e.nodos.filter((n) => !n.tenue),
              getPosition: (n) => [n.lng, n.lat, 0],
              getRadius: (n) => 22 + n.potencia * 2.2,
              radiusScale: 1 + 0.18 * Math.sin(ahora / 450),
              getFillColor: (n) => [...n.color, 45] as [number, number, number, number],
              getLineColor: (n) => [...n.color, 200] as [number, number, number, number],
              stroked: true,
              lineWidthMinPixels: 1,
            }),
          );
        }
        if (nivel === 3 && e.plumas) {
          animadas.push(
            new ScatterplotLayer<(typeof PLUMAS)[number]>({
              id: "plumas",
              data: PLUMAS,
              billboard: true,
              getPosition: (x) => {
                const k = (s * 0.2 + x.fase) % 1;
                return [x.lng0 + (x.lng1 - x.lng0) * k, x.lat0 + (x.lat1 - x.lat0) * k, x.base + k * x.alto];
              },
              getRadius: (x) => 5 + ((s * 0.2 + x.fase) % 1) * 16,
              getFillColor: (x) => [...x.color, Math.round(230 * (1 - ((s * 0.2 + x.fase) % 1)))] as [number, number, number, number],
              radiusMinPixels: 2,
              updateTriggers: { getPosition: s, getRadius: s, getFillColor: s },
            }),
          );
        }
        const flujos = nivel === 3 ? e.arcos.filter((a) => a.flujo) : [];
        if (flujos.length) {
          const particulas = flujos.flatMap((a) =>
            Array.from({ length: 22 }, (_, k) => {
              const t = (s * 0.32 + k / 22) % 1;
              const c = [0, 1, 2].map((i) => Math.round(a.desde[i]! + (a.hasta[i]! - a.desde[i]!) * t)) as [number, number, number];
              return { p: enCamino(a.camino, t), c, k };
            }),
          );
          animadas.push(
            new ScatterplotLayer<(typeof particulas)[number]>({
              id: "flujo",
              data: particulas,
              billboard: true,
              getPosition: (x) => x.p,
              getRadius: (x) => 2.6 + (x.k % 3),
              radiusMinPixels: 2.5,
              getFillColor: (x) => [...x.c, 240] as [number, number, number, number],
            }),
          );
        }
        if (nivel === 3 && e.sensores.length) {
          const pulso = s % 2;
          animadas.push(
            new ScatterplotLayer<Punto3D>({
              id: "sensores",
              parameters: SOBRE_EL_SUELO,
              data: e.sensores,
              getPosition: (x) => x,
              getRadius: 1,
              radiusScale: 18 + pulso * 55,
              stroked: true,
              filled: false,
              getLineColor: [...VERDE, 230] as [number, number, number, number],
              opacity: 1 - pulso / 2,
              lineWidthMinPixels: 2,
            }),
          );
        }
        overlay.current?.setProps({ layers: [...fijas, ...animadas] });
        if (orb && f === "LISTA" && mapa.current && !mapa.current.isMoving()) mapa.current.setBearing(mapa.current.getBearing() + 0.035);
        if (document.visibilityState === "visible") cuadro = requestAnimationFrame(pintar!);
      };
      cuadro = requestAnimationFrame(pintar);
      document.addEventListener("visibilitychange", alVisibilidad);
    })();
    return () => {
      cancelado = true;
      cancelAnimationFrame(cuadro);
      document.removeEventListener("visibilitychange", alVisibilidad);
      for (const mk of marcadores.current.values()) mk.remove();
      marcadores.current.clear();
      mapa.current?.remove();
      mapa.current = null;
      overlay.current = null;
      restaurarResolucion();
    };
  }, [token]);

  // Precarga tapada por la pantalla de carga: planta, un zoom más cerca, planeta y ensayo del vuelo.
  useEffect(() => {
    const m = mapa.current;
    if (!listo || !m || fase !== "CARGA") return;
    let cancelado = false;
    (async () => {
      const c = { ...camaraDe(0, pantalla.current.oportunidad, pantalla.current.ajusteZoom), padding: pantalla.current.margen };
      m.jumpTo(c);
      await esperarIdle(m, 3000);
      if (cancelado) return;
      m.jumpTo({ ...c, zoom: c.zoom + 1.2 });
      await esperarIdle(m, 1500);
      if (cancelado) return;
      m.jumpTo(CAMARA_PLANETA);
      await esperarIdle(m, 1500);
      if (cancelado) return;
      const restante = montaje.current + duracionCarga.current - performance.now() - 1200;
      await new Promise<void>((r) => {
        m.once("moveend", () => r());
        m.flyTo({ ...c, duration: Math.max(3000, restante), curve: 1.42, easing: suave, essential: true });
      });
    })();
    return () => {
      cancelado = true;
    };
  }, [listo, fase]);

  // Vuelo desde el planeta hasta el paso 1. Un clic, la rueda o una tecla saltan al final.
  useEffect(() => {
    const m = mapa.current;
    const cont = contenedor.current;
    if (!listo || !m || !cont || fase !== "VUELO") return;
    const final = { ...camaraDe(0, pantalla.current.oportunidad, pantalla.current.ajusteZoom), padding: pantalla.current.margen };
    let terminado = false;
    const quitar = () => {
      m.off("moveend", terminar);
      cont.removeEventListener("pointerdown", saltar, true);
      cont.removeEventListener("wheel", saltar, true);
      window.removeEventListener("keydown", saltar);
    };
    function terminar() {
      if (terminado) return;
      terminado = true;
      quitar();
      m!.setMaxBounds(LIMITES_NAVEGACION);
      interaccion(m!, true);
      callbacks.current.onFinEntrada();
    }
    function saltar() {
      m!.off("moveend", terminar);
      m!.stop();
      m!.jumpTo(final);
      terminar();
    }
    if (movimientoReducido) {
      m.jumpTo(final);
      terminar();
      return quitar;
    }
    m.stop();
    m.jumpTo(CAMARA_PLANETA);
    m.flyTo({ ...final, duration: DURACION_VUELO_MS, curve: 1.42, easing: suave, essential: true });
    m.once("moveend", terminar);
    cont.addEventListener("pointerdown", saltar, true);
    cont.addEventListener("wheel", saltar, true);
    window.addEventListener("keydown", saltar);
    return quitar;
  }, [listo, fase, movimientoReducido]);

  // Etiquetas de los sitios (vista de país), una vez.
  useEffect(() => {
    const m = mapa.current;
    const Clase = claseMarcador.current;
    if (!listo || !m || !Clase) return;
    const lista = SITIOS.map((s) => {
      const el = document.createElement("div");
      el.className = `vt-sitio${s.piloto ? " vt-sitio--piloto" : ""}`;
      const t = document.createElement("strong");
      t.textContent = s.nombre;
      const sub = document.createElement("span");
      sub.textContent = s.sub;
      el.append(t, sub);
      return new Clase({ element: el, anchor: "left", offset: [12, 0] }).setLngLat([s.lng, s.lat]).addTo(m);
    });
    return () => lista.forEach((mk) => mk.remove());
  }, [listo]);

  // Etiquetas de fuentes y demandas: una por punto; el paso decide cuáles se ven.
  useEffect(() => {
    const m = mapa.current;
    const Clase = claseMarcador.current;
    if (!listo || !m || !Clase) return;
    const todos = [...FUENTES.map((f) => ({ id: f.id, nombre: f.nombre, sub: `${f.tMin}–${f.tMax} °C · ${f.potencia} MW`, fuente: true })), ...DEMANDAS.map((d) => ({ id: d.id, nombre: d.nombre, sub: `${d.tReq} °C · ${d.potencia} MW`, fuente: false }))];
    for (const n of todos) {
      if (marcadores.current.has(n.id)) continue;
      const el = document.createElement("button");
      el.type = "button";
      el.className = `vt-etiqueta ${n.fuente ? "vt-etiqueta--fuente" : "vt-etiqueta--demanda"}`;
      const t = document.createElement("strong");
      const chip = document.createElement("em");
      chip.textContent = n.id;
      t.append(chip, document.createTextNode(n.nombre));
      const sub = document.createElement("span");
      sub.textContent = n.sub;
      el.append(t, sub);
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        callbacks.current.onSeleccionarPunto(n.id);
      });
      const p = n.fuente ? FUENTES.find((f) => f.id === n.id)! : DEMANDAS.find((d) => d.id === n.id)!;
      marcadores.current.set(n.id, new Clase({ element: el, anchor: "bottom", offset: [0, -10] }).setLngLat([p.lng, p.lat]).addTo(m));
    }
  }, [listo]);

  useEffect(() => {
    for (const [id, mk] of marcadores.current) {
      const el = mk.getElement();
      el.dataset.visible = escena.etiquetas.has(id) && !escena.calor ? "1" : "0";
      el.dataset.foco = escena.etiquetas.size <= 2 && escena.etiquetas.has(id) ? "1" : "0";
    }
  }, [escena, listo]);

  // Cámara por paso (solo después de la entrada).
  useEffect(() => {
    inicioPaso.current = performance.now();
    const m = mapa.current;
    if (!listo || !m || vivo.current.fase !== "LISTA") return;
    const c = camaraDe(paso, pantalla.current.oportunidad, pantalla.current.ajusteZoom);
    m.flyTo({ ...c, padding: pantalla.current.margen, duration: 3000, essential: true, curve: 1.3 });
  }, [paso, listo, oportunidad.fuente.id, oportunidad.demanda.id]);

  // Al cambiar el espacio libre (paneles o tarjeta del celular), se recentra sin interrumpir un vuelo.
  useEffect(() => {
    const m = mapa.current;
    if (!listo || !m || vivo.current.fase !== "LISTA") return;
    const aplicar = () => m.easeTo({ padding: pantalla.current.margen, duration: 600 });
    if (m.isMoving()) {
      m.once("moveend", aplicar);
      return () => {
        m.off("moveend", aplicar);
      };
    }
    aplicar();
  }, [margen, listo]);

  // Mapa térmico: visibilidad, paleta e intensidad de la capa nativa.
  useEffect(() => {
    if (!listo || !mapa.current) return;
    asegurarCapaCalor(mapa.current, escena.calor, paleta, intensidad);
  }, [listo, escena.calor, paleta, intensidad]);

  // Cambio de estilo (el inicial ya se cargó al crear el mapa).
  useEffect(() => {
    if (!listo || !mapa.current || sateliteAplicado.current === satelite) return;
    sateliteAplicado.current = satelite;
    const e = estiloMapa(satelite);
    mapa.current.setStyle(e.style, { config: e.config } as never);
  }, [satelite, listo]);

  return (
    <div ref={envoltorio} className="vt-mapa absolute inset-0" data-nivel="3">
      <div ref={contenedor} className="h-full w-full" />
      {error ? <div className="absolute inset-x-0 top-24 mx-auto w-fit rounded-md bg-[#EF4444] px-4 py-2 text-sm text-white">{error}</div> : null}
    </div>
  );
}

/** Memo: los contadores y el progreso de la vitrina no re-renderizan el mapa. */
export const MapaTermico = memo(MapaTermicoBase);
