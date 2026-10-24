"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Map as MapaMapbox, Marker } from "mapbox-gl";
import type { MapboxOverlay } from "@deck.gl/mapbox";
import type { Layer, PickingInfo } from "@deck.gl/core";
import { DEMANDAS, FUENTES, PASOS, RACKS, ZONAS, type IdPaso } from "@/dominio/escenario";
import { rutaTuberia, type Oportunidad, type Par, type Prioridad } from "@/dominio/motor";
import { hash01, desplazar } from "@/componentes/mapa/geometria";
import { rgbTemperatura } from "@/componentes/ui";

// Mapa de Calor Rescatado con lenguaje de cámara termográfica: satélite en
// escala de grises, el calor en falso color como protagonista, retículas con
// lectura de temperatura sobre cada fuente y demanda, y la conexión como
// tubería ortogonal tendida por los racks de la planta (no arcos en el aire).
// Vista casi cenital; sin columnas 3D ni vuelo desde el planeta.
//
// Rendimiento (heredado del trabajo en ConfluencIA): un solo lienzo con deck.gl
// intercalado, capas fijas que solo se rehacen cuando cambian los datos, un solo
// requestAnimationFrame que se detiene con la pestaña oculta.

export type FaseEntrada = "CARGA" | "LISTA";
export type PaletaCalor = "ironbow" | "clasica" | "arcoiris" | "blanco";

export const PALETAS: Record<PaletaCalor, { nombre: string; colores: Array<[number, number, number]> }> = {
  ironbow: { nombre: "Ironbow", colores: [[30, 4, 60], [110, 10, 120], [200, 40, 90], [240, 110, 20], [255, 200, 40], [255, 250, 220]] },
  clasica: { nombre: "Clásica", colores: [[0, 120, 200], [0, 200, 160], [200, 230, 60], [255, 150, 40], [240, 60, 90], [230, 30, 30]] },
  arcoiris: { nombre: "Arcoíris", colores: [[0, 30, 220], [0, 200, 220], [0, 220, 80], [230, 220, 0], [255, 120, 0], [230, 30, 30]] },
  blanco: { nombre: "Blanco caliente", colores: [[40, 40, 40], [90, 90, 90], [140, 140, 140], [190, 190, 190], [230, 230, 230], [255, 255, 255]] },
};

const FRIO: [number, number, number] = [90, 200, 250];
const VERDE: [number, number, number] = [61, 220, 132];
const AMBAR: [number, number, number] = [255, 176, 0];
const SELECCION: [number, number, number] = [255, 225, 77];
export const COLOR_PRIORIDAD: Record<Prioridad, [number, number, number]> = { P1: [61, 220, 132], P2: [255, 176, 0], P3: [255, 120, 60], P4: [130, 130, 136] };

interface Tuberia {
  id: string;
  camino: Array<[number, number, number]>;
  color: [number, number, number];
  ancho: number;
  alfa: number;
  desde: [number, number, number];
  flujo: boolean;
  /** Longitud acumulada por vértice (para mover el flujo a velocidad constante). */
  largos: number[];
}

const PASO_ID = (i: number): IdPaso => PASOS[Math.max(0, Math.min(PASOS.length - 1, i))]!.id;
const ENFOQUE: IdPaso[] = ["tecnologia", "modelo", "evaluacion", "monitoreo"];

/** Intensidad del mapa térmico por paso: protagonista al inicio, de fondo cuando hay tuberías. */
const INTENSIDAD_PASO: Record<IdPaso, number> = { problema: 1.25, inventario: 0.7, termico: 1, cruce: 0.35, tecnologia: 0.45, modelo: 0.4, evaluacion: 0.4, portafolio: 0.35, monitoreo: 0.45, impacto: 0.6 };

interface Escena {
  id: IdPaso;
  tuberias: Tuberia[];
  pulsos: boolean;
  sensores: Array<[number, number]>;
  /** Puntos con retícula visible y los que están en foco. */
  visibles: Set<string>;
  foco: Set<string>;
}

function tuberia(id: string, fId: string, dId: string, color: [number, number, number], ancho: number, alfa: number, flujo: boolean, carril = 0): Tuberia {
  const f = FUENTES.find((x) => x.id === fId)!;
  const d = DEMANDAS.find((x) => x.id === dId)!;
  const camino = rutaTuberia(f, d, carril).puntos.map(([lng, lat]) => [lng, lat, 2] as [number, number, number]);
  const largos = [0];
  for (let i = 1; i < camino.length; i++) {
    const a = camino[i - 1]!, b = camino[i]!;
    largos.push(largos[i - 1]! + Math.hypot((a[0] - b[0]) * Math.cos((a[1] * Math.PI) / 180), a[1] - b[1]));
  }
  return { id, camino, color, ancho, alfa, desde: rgbTemperatura(f.tMax), flujo, largos };
}

/** Punto a una fracción t de la tubería (por longitud). */
function enTuberia(t: Tuberia, f: number): [number, number, number] {
  const total = t.largos[t.largos.length - 1]!;
  const objetivo = f * total;
  let i = 1;
  while (i < t.largos.length - 1 && t.largos[i]! < objetivo) i++;
  const a = t.camino[i - 1]!, b = t.camino[i]!;
  const tramo = t.largos[i]! - t.largos[i - 1]! || 1;
  const k = (objetivo - t.largos[i - 1]!) / tramo;
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, 3];
}

function construirEscena(paso: number, pares: Par[], oportunidad: Oportunidad, cartera: Oportunidad[], parSel: string | null): Escena {
  const id = PASO_ID(paso);
  const enfoque = ENFOQUE.includes(id);
  const opId = `${oportunidad.fuente.id}-${oportunidad.demanda.id}`;
  let tuberias: Tuberia[] = [];
  if (id === "cruce") {
    // Haz de tuberías: cada par viable va por su propio carril del rack (2,5 m entre carriles).
    const viables = pares.filter((p) => p.estado !== "DESCARTADO");
    tuberias = viables.map((p, k) => {
      const sel = p.id === parSel;
      return tuberia(p.id, p.fuente.id, p.demanda.id, sel ? SELECCION : p.estado === "COMPATIBLE" ? VERDE : AMBAR, sel ? 6 : 1.8, sel ? 255 : 190, sel, (k - viables.length / 2) * 2.5);
    });
    tuberias.sort((a, b) => (a.id === parSel ? 1 : b.id === parSel ? -1 : 0));
  } else if (id === "portafolio" || id === "impacto") {
    tuberias = cartera.map((o, k) => {
      const oid = `${o.fuente.id}-${o.demanda.id}`;
      return tuberia(oid, o.fuente.id, o.demanda.id, oid === opId ? SELECCION : COLOR_PRIORIDAD[o.prioridad], oid === opId ? 6 : 4, 240, id === "impacto" || oid === opId, (k - cartera.length / 2) * 4);
    });
  } else if (enfoque) {
    tuberias = [tuberia(opId, oportunidad.fuente.id, oportunidad.demanda.id, SELECCION, 7, 255, true)];
  }
  const todos = [...FUENTES.map((f) => f.id), ...DEMANDAS.map((d) => d.id)];
  const visibles = new Set<string>(
    id === "problema" ? FUENTES.map((f) => f.id)
    : enfoque ? [oportunidad.fuente.id, oportunidad.demanda.id]
    : id === "portafolio" || id === "impacto" ? cartera.flatMap((o) => [o.fuente.id, o.demanda.id])
    : todos,
  );
  const foco = new Set<string>(enfoque ? [oportunidad.fuente.id, oportunidad.demanda.id] : id === "cruce" && parSel ? parSel.split("-") : []);
  const sensores: Array<[number, number]> =
    id === "monitoreo" || id === "impacto" ? [[oportunidad.fuente.lng, oportunidad.fuente.lat], [oportunidad.demanda.lng, oportunidad.demanda.lat]] : [];
  return { id, tuberias, pulsos: id === "problema" || id === "inventario", sensores, visibles, foco };
}

/** Puntos del mapa térmico: una nube alrededor de cada fuente, pesada por potencia y temperatura (determinista). */
const PUNTOS_CALOR = FUENTES.flatMap((f) =>
  Array.from({ length: 46 }, (_, k) => {
    const r = 6 + hash01(`${f.id}r${k}`) * 70;
    const [lng, lat] = desplazar(f.lng, f.lat, r, hash01(`${f.id}a${k}`) * Math.PI * 2);
    return { p: [lng, lat] as [number, number], w: (f.potencia * (f.tMax / 100)) / (1 + r / 35) };
  }),
);
const PESO_MAX = Math.max(...PUNTOS_CALOR.map((x) => x.w));
const GEOJSON_CALOR = {
  type: "FeatureCollection" as const,
  features: PUNTOS_CALOR.map((x) => ({ type: "Feature" as const, properties: { w: x.w / PESO_MAX }, geometry: { type: "Point" as const, coordinates: x.p } })),
};
const GEOJSON_ZONAS = {
  type: "FeatureCollection" as const,
  features: ZONAS.map((z) => ({ type: "Feature" as const, properties: { nombre: z.nombre }, geometry: { type: "Polygon" as const, coordinates: [[...z.poligono, z.poligono[0]!]] } })),
};
const GEOJSON_RACKS = {
  type: "FeatureCollection" as const,
  features: [
    ...RACKS.horizontales.map((lat) => ({ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: [[RACKS.limites.oeste, lat], [RACKS.limites.este, lat]] } })),
    ...RACKS.verticales.map((lng) => ({ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: [[lng, RACKS.limites.norte], [lng, RACKS.limites.sur]] } })),
  ],
};

function colorCalor(paleta: PaletaCalor): unknown[] {
  const c = PALETAS[paleta].colores;
  const paradas = c.flatMap((rgb, i) => [0.08 + (i / (c.length - 1)) * 0.92, `rgba(${rgb.join(",")},${(0.5 + (i / (c.length - 1)) * 0.45).toFixed(2)})`]);
  return ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(0,0,0,0)", ...paradas];
}

/**
 * Capas nativas de Mapbox: satélite en gris (modo termografía), secciones de la
 * planta, racks y mapa térmico. Se vuelven a crear tras un cambio de estilo.
 * isStyleLoaded() es falso mientras cargan teselas: si el estilo de verdad no
 * está listo, addSource lanza y se reintenta cuando el mapa queda quieto.
 */
function aplicarCapasNativas(m: MapaMapbox, termografia: boolean, paleta: PaletaCalor, intensidad: number) {
  const intentar = () => {
    if (m.getLayer("satellite")) {
      m.setPaintProperty("satellite", "raster-saturation", termografia ? -0.92 : 0);
      m.setPaintProperty("satellite", "raster-brightness-max", termografia ? 0.5 : 1);
      m.setPaintProperty("satellite", "raster-contrast", termografia ? 0.12 : 0);
    }
    if (!m.getSource("zonas")) m.addSource("zonas", { type: "geojson", data: GEOJSON_ZONAS });
    if (!m.getLayer("zonas-borde")) m.addLayer({ id: "zonas-borde", type: "line", source: "zonas", paint: { "line-color": "rgba(255,255,255,0.32)", "line-width": 1, "line-dasharray": [3, 3] } });
    if (!m.getSource("racks")) m.addSource("racks", { type: "geojson", data: GEOJSON_RACKS });
    if (!m.getLayer("racks")) m.addLayer({ id: "racks", type: "line", source: "racks", paint: { "line-color": "rgba(255,255,255,0.16)", "line-width": ["interpolate", ["linear"], ["zoom"], 15, 2, 18, 7] } });
    if (!m.getSource("calor")) m.addSource("calor", { type: "geojson", data: GEOJSON_CALOR });
    if (!m.getLayer("calor")) {
      m.addLayer({
        id: "calor",
        type: "heatmap",
        source: "calor",
        paint: {
          "heatmap-weight": ["get", "w"],
          "heatmap-radius": ["interpolate", ["exponential", 2], ["zoom"], 14, 10, 16, 38, 18, 150],
          "heatmap-opacity": 0.9,
        },
      });
    }
    m.setPaintProperty("calor", "heatmap-intensity", intensidad);
    m.setPaintProperty("calor", "heatmap-color", colorCalor(paleta) as never);
  };
  try {
    intentar();
  } catch {
    m.once("idle", () => {
      try {
        intentar();
      } catch {
        // El siguiente cambio de paso o de estilo lo vuelve a intentar.
      }
    });
  }
}

const SOBRE_EL_SUELO = { depthCompare: "always" } as const;
const MANEJADORES = ["dragPan", "dragRotate", "scrollZoom", "boxZoom", "keyboard", "doubleClickZoom", "touchZoomRotate", "touchPitch"] as const;
/** Navegación acotada a la refinería y sus alrededores. */
const LIMITES: [[number, number], [number, number]] = [[-75.53, 10.29], [-75.46, 10.34]];

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
  /** true: satélite en gris (termografía); false: color real. */
  termografia: boolean;
  pares: Par[];
  oportunidad: Oportunidad;
  cartera: Oportunidad[];
  parSeleccionado: string | null;
  paleta: PaletaCalor;
  /** Intensidad elegida en el paso del mapa térmico. */
  intensidad: number;
  fase: FaseEntrada;
  margen: Margen;
  ajusteZoom: number;
  /** La cámara del paso 1 ya tiene sus teselas: la intro puede revelar el mapa. */
  onPrecargado: () => void;
  onSeleccionarPar: (id: string) => void;
  onSeleccionarPunto: (id: string) => void;
}

function MapaTermicoBase(props: Props) {
  const { token, paso, termografia, pares, oportunidad, cartera, parSeleccionado, paleta, intensidad, fase, margen, ajusteZoom } = props;
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaMapbox | null>(null);
  const overlay = useRef<MapboxOverlay | null>(null);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inicioPaso = useRef(0);
  const escena = useMemo(() => construirEscena(paso, pares, oportunidad, cartera, parSeleccionado), [paso, pares, oportunidad, cartera, parSeleccionado]);
  const intensidadPaso = escena.id === "termico" ? intensidad : INTENSIDAD_PASO[escena.id];
  const vivo = useRef({ escena, termografia, paleta, intensidadPaso });
  vivo.current = { escena, termografia, paleta, intensidadPaso };
  const callbacks = useRef(props);
  callbacks.current = props;
  const pantalla = useRef({ margen, ajusteZoom, oportunidad });
  pantalla.current = { margen, ajusteZoom, oportunidad };
  const marcadores = useRef<Map<string, Marker>>(new Map());

  // Mapa + overlay, una vez.
  useEffect(() => {
    let cancelado = false;
    let cuadro = 0;
    let pintar: ((ahora: number) => void) | null = null;
    inicioPaso.current = performance.now();
    const alVisibilidad = () => {
      if (document.visibilityState === "visible" && !cuadro && pintar) cuadro = requestAnimationFrame(pintar);
    };
    const restaurarResolucion = limitarResolucion();
    (async () => {
      const [{ default: mapboxgl }, { MapboxOverlay: Overlay }, capas] = await Promise.all([import("mapbox-gl"), import("@deck.gl/mapbox"), import("@deck.gl/layers")]);
      if (cancelado || !contenedor.current) return;
      mapboxgl.accessToken = token;
      const m = new mapboxgl.Map({
        container: contenedor.current,
        // Raster satelital puro: más liviano que Standard y se puede pasar a gris.
        style: "mapbox://styles/mapbox/satellite-v9",
        ...camaraDe(0, pantalla.current.oportunidad, pantalla.current.ajusteZoom),
        maxBounds: LIMITES,
        renderWorldCopies: false,
        fadeDuration: 0,
        maxPitch: 60,
        antialias: false,
        attributionControl: true,
      });
      for (const h of MANEJADORES) m[h].disable();
      // El padding no es opción del constructor: se aplica al crear para centrar la planta en el espacio libre.
      m.setPadding(pantalla.current.margen);
      m.on("error", (e) => {
        if (String((e as { error?: { message?: string } }).error?.message ?? "").match(/token|401|403/i)) setError("No se pudo cargar el mapa: revise el token de Mapbox.");
      });
      const o = new Overlay({ interleaved: true, layers: [] });
      m.addControl(o);
      m.addControl(new mapboxgl.ScaleControl({ maxWidth: 110, unit: "metric" }), "bottom-right");
      const observador = new ResizeObserver(() => m.resize());
      observador.observe(contenedor.current);
      m.once("remove", () => observador.disconnect());
      mapa.current = m;
      overlay.current = o;
      m.on("style.load", () => {
        const v = vivo.current;
        aplicarCapasNativas(m, v.termografia, v.paleta, v.intensidadPaso);
      });
      m.on("load", async () => {
        const v = vivo.current;
        aplicarCapasNativas(m, v.termografia, v.paleta, v.intensidadPaso);
        await esperarIdle(m, 7000);
        setListo(true);
        callbacks.current.onPrecargado();
      });

      // Etiquetas de las secciones de la planta (HTML, tipografía de la interfaz).
      for (const z of ZONAS) {
        const el = document.createElement("div");
        el.className = "vt-zona";
        el.textContent = z.nombre;
        new mapboxgl.Marker({ element: el, anchor: "top-left" }).setLngLat([z.etiqueta.lng, z.etiqueta.lat]).addTo(m);
      }
      // Retículas de fuentes y demandas con su lectura de temperatura.
      for (const p of [...FUENTES.map((f) => ({ id: f.id, nombre: f.nombre, temp: `${f.tMax}°C`, sub: `${f.potencia} MW`, fuente: true, lng: f.lng, lat: f.lat })), ...DEMANDAS.map((d) => ({ id: d.id, nombre: d.nombre, temp: `${d.tReq}°C`, sub: `${d.potencia} MW`, fuente: false, lng: d.lng, lat: d.lat }))]) {
        const el = document.createElement("button");
        el.type = "button";
        el.className = `vt-mira ${p.fuente ? "vt-mira--fuente" : "vt-mira--demanda"}`;
        el.setAttribute("aria-label", `${p.id} ${p.nombre}`);
        const cruz = document.createElement("span");
        cruz.className = "vt-mira__cruz";
        const lectura = document.createElement("span");
        lectura.className = "vt-mira__lectura";
        const temp = document.createElement("b");
        temp.textContent = `${p.fuente ? "▲" : "▼"} ${p.temp}`;
        const id = document.createElement("i");
        id.textContent = p.id;
        const nombre = document.createElement("small");
        nombre.textContent = `${p.nombre} · ${p.sub}`;
        lectura.append(id, temp, nombre);
        el.append(cruz, lectura);
        el.addEventListener("click", (ev) => {
          ev.stopPropagation();
          callbacks.current.onSeleccionarPunto(p.id);
        });
        marcadores.current.set(p.id, new mapboxgl.Marker({ element: el, anchor: "center" }).setLngLat([p.lng, p.lat]).addTo(m));
      }

      const { PathLayer, ScatterplotLayer } = capas;
      let escenaFija: Escena | null = null;
      let crecerFijo = -1;
      let fijas: Layer[] = [];
      pintar = (ahora: number) => {
        cuadro = 0;
        const e = vivo.current.escena;
        const crecer = Math.min(1, (ahora - inicioPaso.current) / 1100);
        if (e !== escenaFija || crecer !== crecerFijo) {
          escenaFija = e;
          crecerFijo = crecer;
          // Las tuberías se tienden desde la fuente: cada una crece a lo largo de su trazado.
          const tendidas = e.tuberias.map((t) => {
            if (crecer >= 1) return t.camino;
            const objetivo = crecer * t.largos[t.largos.length - 1]!;
            const parcial = t.camino.filter((_, i) => t.largos[i]! <= objetivo);
            return [...parcial, enTuberia(t, crecer)];
          });
          fijas = [
            new PathLayer<Tuberia>({
              id: "tuberias-funda",
              parameters: SOBRE_EL_SUELO,
              data: e.tuberias,
              widthUnits: "pixels",
              jointRounded: true,
              capRounded: true,
              getPath: (t) => tendidas[e.tuberias.indexOf(t)]!,
              getColor: [8, 8, 10, 230],
              getWidth: (t) => t.ancho + 4,
              updateTriggers: { getPath: crecer },
            }),
            new PathLayer<Tuberia>({
              id: "tuberias",
              parameters: SOBRE_EL_SUELO,
              data: e.tuberias,
              pickable: true,
              widthUnits: "pixels",
              jointRounded: true,
              capRounded: true,
              getPath: (t) => tendidas[e.tuberias.indexOf(t)]!,
              getColor: (t) => [...t.color, t.alfa] as [number, number, number, number],
              getWidth: (t) => t.ancho,
              onClick: (info: PickingInfo<Tuberia>) => {
                if (info.object) callbacks.current.onSeleccionarPar(info.object.id);
              },
              updateTriggers: { getPath: crecer },
            }),
          ];
        }
        const s = ahora / 1000;
        const animadas: Layer[] = [];
        if (e.pulsos) {
          // Emisión térmica: anillos que se expanden desde cada fuente.
          const ondas = FUENTES.flatMap((f) => [0, 0.5].map((desfase) => ({ f, k: (s * 0.45 + desfase + hash01(f.id)) % 1 })));
          animadas.push(
            new ScatterplotLayer<(typeof ondas)[number]>({
              id: "emision",
              parameters: SOBRE_EL_SUELO,
              data: ondas,
              getPosition: (x) => [x.f.lng, x.f.lat, 0],
              getRadius: (x) => 10 + x.k * (25 + x.f.potencia * 3.5),
              stroked: true,
              filled: false,
              lineWidthMinPixels: 1.5,
              getLineColor: (x) => [...rgbTemperatura(x.f.tMax), Math.round(230 * (1 - x.k))] as [number, number, number, number],
              updateTriggers: { getRadius: s, getLineColor: s },
            }),
          );
        }
        const conFlujo = crecerFijo >= 1 ? e.tuberias.filter((t) => t.flujo) : [];
        if (conFlujo.length) {
          const particulas = conFlujo.flatMap((t) =>
            Array.from({ length: 18 }, (_, k) => {
              const f = (s * 0.18 + k / 18) % 1;
              const c = [0, 1, 2].map((i) => Math.round(t.desde[i]! + (FRIO[i]! - t.desde[i]!) * f)) as [number, number, number];
              return { p: enTuberia(t, f), c };
            }),
          );
          animadas.push(
            new ScatterplotLayer<(typeof particulas)[number]>({
              id: "flujo",
              parameters: SOBRE_EL_SUELO,
              data: particulas,
              getPosition: (x) => x.p,
              getRadius: 3,
              radiusUnits: "pixels",
              getFillColor: (x) => [...x.c, 255] as [number, number, number, number],
              getLineColor: [10, 10, 12, 255],
              stroked: true,
              lineWidthMinPixels: 1,
            }),
          );
        }
        if (e.sensores.length) {
          const pulso = s % 1.6;
          animadas.push(
            new ScatterplotLayer<[number, number]>({
              id: "sensores",
              parameters: SOBRE_EL_SUELO,
              data: e.sensores,
              getPosition: (x) => [x[0], x[1], 0],
              getRadius: 1,
              radiusScale: 8 + pulso * 26,
              stroked: true,
              filled: false,
              getLineColor: [...VERDE, 230] as [number, number, number, number],
              opacity: 1 - pulso / 1.8,
              lineWidthMinPixels: 2,
            }),
          );
        }
        overlay.current?.setProps({ layers: [...fijas, ...animadas] });
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

  // Al terminar la intro se habilita la interacción.
  useEffect(() => {
    const m = mapa.current;
    if (!listo || !m || fase !== "LISTA") return;
    for (const h of MANEJADORES) m[h].enable();
  }, [listo, fase]);

  // Retículas: cuáles se ven y cuáles están en foco en este paso.
  useEffect(() => {
    for (const [id, mk] of marcadores.current) {
      const el = mk.getElement();
      el.dataset.visible = escena.visibles.has(id) ? "1" : "0";
      el.dataset.foco = escena.foco.has(id) ? "1" : "0";
      el.dataset.compacta = escena.id === "termico" || escena.id === "cruce" ? "1" : "0";
    }
  }, [escena, listo]);

  // Capas nativas: gris o color real, paleta e intensidad del calor.
  useEffect(() => {
    if (!listo || !mapa.current) return;
    aplicarCapasNativas(mapa.current, termografia, paleta, intensidadPaso);
  }, [listo, termografia, paleta, intensidadPaso]);

  // Cámara por paso.
  useEffect(() => {
    inicioPaso.current = performance.now();
    const m = mapa.current;
    if (!listo || !m) return;
    const c = camaraDe(paso, pantalla.current.oportunidad, pantalla.current.ajusteZoom);
    m.easeTo({ ...c, padding: pantalla.current.margen, duration: 1800, essential: true });
  }, [paso, listo, oportunidad.fuente.id, oportunidad.demanda.id]);

  // Al cambiar el espacio libre se recentra sin interrumpir un movimiento en curso.
  useEffect(() => {
    const m = mapa.current;
    if (!listo || !m) return;
    const aplicar = () => m.easeTo({ padding: pantalla.current.margen, duration: 500 });
    if (m.isMoving()) {
      m.once("moveend", aplicar);
      return () => {
        m.off("moveend", aplicar);
      };
    }
    aplicar();
  }, [margen, listo]);

  return (
    <div className="vt-mapa absolute inset-0">
      <div ref={contenedor} className="h-full w-full" />
      {error ? <div className="absolute inset-x-0 top-24 mx-auto w-fit bg-[#FF5A1F] px-4 py-2 text-sm text-black">{error}</div> : null}
    </div>
  );
}

/** Memo: los contadores y el progreso no re-renderizan el mapa. */
export const MapaTermico = memo(MapaTermicoBase);
