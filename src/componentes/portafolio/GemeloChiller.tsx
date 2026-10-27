"use client";

import { useEffect, useRef, useState } from "react";
import type { Propuesta } from "@/dominio/portafolios";
import { num } from "@/componentes/ui";

// Gemelo digital (ilustrativo) de un chiller de absorción de bromuro de litio activado
// por vapor, integrado al proceso. El equipo sigue el lenguaje de los planos CAD de
// fabricantes (cuerpo blanco con aristas, cabezal de vapor con codos rojos, cajas de
// agua con tapas atornilladas, bridas, tableros, columnas e intercambiador de solución);
// la dinámica sigue los diagramas animados de recuperación de calor: tuberías grises con
// flechas que se mueven con el color de la temperatura del fluido. El recorrido guiado
// muestra, paso a paso, de dónde sale el calor, cómo se convierte en frío y a dónde va.
// three.js (~600 kB) se carga bajo demanda.

type IdFlujo = "vapor" | "condensado" | "alimentacion" | "helada" | "retorno" | "torreFria" | "torreCaliente" | "concentrada" | "diluida" | "refrigerante";
type IdEquipo = "caldera" | "valvula" | "cabezal" | "generador" | "cuerpo" | "intercambiador" | "columnas" | "bomba" | "tablero" | "tanque" | "torre" | "manejadora";

/** Componentes internos del chiller (también los usa el informe). */
export const COMPONENTES = [
  { id: "generador", nombre: "1 · Generador", texto: "El vapor de la fuente calienta la solución de bromuro de litio y evapora el agua que lleva disuelta." },
  { id: "condensador", nombre: "2 · Condensador", texto: "Ese vapor de agua se condensa con el agua de la torre de enfriamiento." },
  { id: "evaporador", nombre: "3 · Evaporador", texto: "Al vacío, el agua se evapora a ≈ 4 °C y le quita calor al agua helada que va a los edificios." },
  { id: "absorbedor", nombre: "4 · Absorbedor", texto: "La solución concentrada absorbe ese vapor y mantiene el vacío; la torre retira el calor." },
  { id: "intercambiador", nombre: "Intercambiador de solución", texto: "Precalienta la solución diluida con la concentrada que vuelve: mejora el COP." },
  { id: "bomba", nombre: "Bomba de solución", texto: "Lleva la solución diluida de vuelta al generador. Es el único consumo eléctrico relevante." },
] as const;

interface PasoRecorrido {
  titulo: string;
  texto: (p: Propuesta) => string;
  flujos: IdFlujo[];
  equipos: IdEquipo[];
}

const RECORRIDO: PasoRecorrido[] = [
  { titulo: "1 · Llega el calor que sobra", texto: (p) => `El vapor de baja presión excedente de ${p.fuente.id} (${p.fuente.tMax} °C), que hoy no se aprovecha, sale de calderas y entra al cabezal del chiller por una válvula de control: ${num(p.recuperadoMW, 2)} MW de calor.`, flujos: ["vapor"], equipos: ["caldera", "valvula", "cabezal", "generador"] },
  { titulo: "2 · El ciclo de absorción", texto: () => "En el generador el vapor hierve la solución de bromuro de litio. El agua que se separa se condensa, se evapora al vacío en el evaporador y la solución concentrada la vuelve a absorber. El intercambiador y la bomba cierran el ciclo.", flujos: ["concentrada", "diluida", "refrigerante"], equipos: ["cuerpo", "intercambiador", "columnas", "bomba"] },
  { titulo: "3 · Sale el frío hacia el proceso", texto: (p) => `El evaporador enfría el agua a 7 °C y la envía a ${p.demanda.nombre.toLowerCase()} (${p.demanda.id}): ${num(p.qUtil, 2)} MW de frío. Vuelve a 12 °C para repetir el ciclo.`, flujos: ["helada", "retorno"], equipos: ["manejadora"] },
  { titulo: "4 · La torre retira el calor", texto: () => "El agua de la torre de enfriamiento entra a 30 °C, recoge el calor del absorbedor y del condensador y sale a 35 °C.", flujos: ["torreFria", "torreCaliente"], equipos: ["torre"] },
  { titulo: "5 · El condensado vuelve a calderas", texto: (p) => `El vapor cede su calor y sale como condensado caliente; pasa al tanque y la bomba lo devuelve como agua de alimentación. Resultado: ${num(p.electricidadEvitadaMWh)} MWh/año de electricidad que no se compra.`, flujos: ["condensado", "alimentacion"], equipos: ["tanque", "caldera", "tablero"] },
];

/** Colores de cada corriente (tuberías externas: gris con flechas de color, como los diagramas de proceso). */
const COLOR: Record<IdFlujo, number> = {
  vapor: 0xe0262f,
  condensado: 0x5fd0ff,
  alimentacion: 0x1f5fd6,
  helada: 0x00b7ff,
  retorno: 0x7fe0ff,
  torreFria: 0x22c55e,
  torreCaliente: 0xff9f1c,
  concentrada: 0xd63cb6,
  diluida: 0x3ccf4e,
  refrigerante: 0x2a4fe0,
};
const LEYENDA: Array<[IdFlujo, string]> = [
  ["vapor", "Vapor LP excedente"],
  ["condensado", "Condensado caliente"],
  ["alimentacion", "Agua de alimentación"],
  ["helada", "Agua helada 7 °C"],
  ["retorno", "Retorno 12 °C"],
  ["torreFria", "Agua de torre 30 °C"],
  ["torreCaliente", "Agua de torre 35 °C"],
];
/** Descarga el motor 3D (three.js y sus extras). Se llama antes, desde el tablero, para que el gemelo abra sin espera. */
let cargaMotor: Promise<readonly [typeof import("three"), typeof import("three/examples/jsm/controls/OrbitControls.js"), typeof import("three/examples/jsm/renderers/CSS2DRenderer.js"), typeof import("three/examples/jsm/geometries/RoundedBoxGeometry.js")]> | null = null;
export function precargarGemelo() {
  cargaMotor ??= Promise.all([
    import("three"),
    import("three/examples/jsm/controls/OrbitControls.js"),
    import("three/examples/jsm/renderers/CSS2DRenderer.js"),
    import("three/examples/jsm/geometries/RoundedBoxGeometry.js"),
  ] as const).catch((e) => {
    cargaMotor = null; // permite reintentar si falló la descarga
    throw e;
  });
  return cargaMotor;
}
const hayWebGL = () => {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
};

const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;

export function GemeloChiller({ p, alto = 420 }: { p: Propuesta; alto?: number }) {
  const lienzo = useRef<HTMLDivElement>(null);
  const [paso, setPaso] = useState<number | null>(0);
  const [tour, setTour] = useState(true);
  const [girar, setGirar] = useState(false);
  const [listo, setListo] = useState(false);
  const [falla, setFalla] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const estado = useRef({ paso: 0 as number | null, girar: false });
  estado.current = { paso, girar };

  // Recorrido automático: avanza cada 6 s hasta que el usuario elige un paso.
  useEffect(() => {
    if (!tour) return;
    const id = setInterval(() => setPaso((x) => ((x ?? -1) + 1) % RECORRIDO.length), 6000);
    return () => clearInterval(id);
  }, [tour]);

  const calor = p.recuperadoMW, frio = p.qUtil;

  useEffect(() => {
    const cont = lienzo.current;
    if (!cont) return;
    let cancelado = false;
    let liberar = () => {};
    setListo(false);
    setFalla(null);
    (async () => {
      if (!hayWebGL()) throw new Error("webgl");
      // Un reintento automático: la descarga puede fallar por un corte breve de red.
      const motor = await precargarGemelo().catch(() => new Promise((ok) => setTimeout(ok, 1500)).then(precargarGemelo));
      const [THREE, { OrbitControls }, { CSS2DRenderer, CSS2DObject }, { RoundedBoxGeometry }] = motor;
      if (cancelado || !lienzo.current) return;
      type V3 = InstanceType<typeof THREE.Vector3>;
      type Obj = InstanceType<typeof THREE.Object3D>;
      type Malla = InstanceType<typeof THREE.Mesh>;
      type MatStd = InstanceType<typeof THREE.MeshStandardMaterial>;
      const W = () => cont.clientWidth, H = () => cont.clientHeight;
      const escena = new THREE.Scene();
      const camara = new THREE.PerspectiveCamera(30, W() / H(), 0.1, 200);
      camara.position.set(9.5, 7.5, 14.5);
      const render = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      render.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
      render.setSize(W(), H());
      cont.appendChild(render.domElement);
      const etiquetas = new CSS2DRenderer();
      etiquetas.setSize(W(), H());
      Object.assign(etiquetas.domElement.style, { position: "absolute", inset: "0", pointerEvents: "none" });
      cont.appendChild(etiquetas.domElement);
      const control = new OrbitControls(camara, render.domElement);
      control.target.set(-1.2, 1.6, -0.9);
      control.enableDamping = true;
      control.minDistance = 8;
      control.maxDistance = 34;
      control.maxPolarAngle = Math.PI * 0.47;
      control.autoRotateSpeed = 0.5;

      escena.add(new THREE.HemisphereLight(0xffffff, 0x5a6f86, 1.25));
      const sol = new THREE.DirectionalLight(0xffffff, 1.5);
      sol.position.set(8, 14, 10);
      escena.add(sol);
      const contra = new THREE.DirectionalLight(0xbfd4ff, 0.5);
      contra.position.set(-10, 6, -8);
      escena.add(contra);

      // ── Materiales (estilo plano CAD: superficies mate y aristas oscuras) ──
      const mat = (color: number, rugosidad = 0.55, metal = 0.15) => new THREE.MeshStandardMaterial({ color, roughness: rugosidad, metalness: metal });
      const BLANCO = mat(0xe9ebee), GRIS = mat(0xc9cdd2), GRIS_OSC = mat(0x8e959c), TUBO = mat(0xa7adb3, 0.4, 0.35);
      const aristas = new THREE.LineBasicMaterial({ color: 0x3b4450, transparent: true, opacity: 0.55 });
      const equipos = new Map<IdEquipo, Obj[]>();
      const registrar = (id: IdEquipo | null, o: Obj) => {
        if (id) equipos.set(id, [...(equipos.get(id) ?? []), o]);
        return o;
      };
      const conAristas = (m: Malla) => {
        m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 25), aristas));
        return m;
      };
      const caja = (id: IdEquipo | null, [x, y, z]: [number, number, number], [w, h, d]: [number, number, number], material = BLANCO, redondeo = 0.06) => {
        const m = conAristas(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, redondeo), material.clone()));
        m.position.set(x, y, z);
        escena.add(m);
        registrar(id, m);
        return m;
      };
      const cilindro = (id: IdEquipo | null, [x, y, z]: [number, number, number], radio: number, largo: number, eje: "x" | "y" | "z", material = BLANCO, lados = 36) => {
        const m = conAristas(new THREE.Mesh(new THREE.CylinderGeometry(radio, radio, largo, lados), material.clone()));
        if (eje === "x") m.rotation.z = Math.PI / 2;
        if (eje === "z") m.rotation.x = Math.PI / 2;
        m.position.set(x, y, z);
        escena.add(m);
        registrar(id, m);
        return m;
      };
      // Brida: disco, boca y pernos, mirando hacia el eje dado.
      const brida = ([x, y, z]: [number, number, number], radio: number, eje: "x" | "y" | "z") => {
        const g = new THREE.Group();
        g.add(conAristas(new THREE.Mesh(new THREE.CylinderGeometry(radio * 1.45, radio * 1.45, 0.08, 36), GRIS.clone())));
        g.add(new THREE.Mesh(new THREE.CylinderGeometry(radio * 0.82, radio * 0.82, 0.1, 36), mat(0x4a525c)));
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          const perno = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.14, 6), GRIS_OSC);
          perno.position.set(Math.cos(a) * radio * 1.22, 0, Math.sin(a) * radio * 1.22);
          g.add(perno);
        }
        if (eje === "x") g.rotation.z = Math.PI / 2;
        if (eje === "z") g.rotation.x = Math.PI / 2;
        g.position.set(x, y, z);
        escena.add(g);
        return g;
      };
      // Tapa atornillada (cajas de agua y registros), con su normal en −x.
      const tapa = ([x, y, z]: [number, number, number], [w, h]: [number, number]) => {
        const g = new THREE.Group();
        g.add(conAristas(new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.05), GRIS.clone())));
        const n = Math.round((w + h) * 6);
        const per = 2 * (w + h);
        for (let i = 0; i < n; i++) {
          let d = (i / n) * per;
          let px: number, py: number;
          if (d < w) [px, py] = [-w / 2 + d, h / 2 - 0.06];
          else if ((d -= w) < h) [px, py] = [w / 2 - 0.06, h / 2 - d];
          else if ((d -= h) < w) [px, py] = [w / 2 - d, -h / 2 + 0.06];
          else [px, py] = [-w / 2 + 0.06, -h / 2 + (d - w)];
          const perno = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 4), GRIS_OSC);
          perno.position.set(px, py, 0.04);
          g.add(perno);
        }
        g.rotation.y = -Math.PI / 2;
        g.position.set(x, y, z);
        escena.add(g);
        return g;
      };

      // ── Piso de planta ──
      const piso = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), mat(0x9fb2c6, 0.95, 0));
      piso.rotation.x = -Math.PI / 2;
      piso.position.y = -0.01;
      escena.add(piso);
      escena.add(new THREE.GridHelper(40, 40, 0x7f93a8, 0x8ea2b6));

      // ── Chiller de absorción ──
      for (const z of [-0.85, 0.85]) caja("cuerpo", [0, 0.18, z], [6.4, 0.36, 0.22], GRIS, 0.02);
      for (const x of [-2.7, -0.9, 0.9, 2.7]) caja("cuerpo", [x, 0.45, 0], [0.3, 0.5, 1.9], GRIS, 0.02);
      // Cuerpo principal (generador/condensador arriba, evaporador/absorbedor abajo).
      caja("cuerpo", [0, 1.7, 0], [6, 2.1, 2], BLANCO, 0.12);
      for (const y of [1.15, 2.25]) caja("cuerpo", [0, y, 0], [6.04, 0.04, 2.04], GRIS_OSC, 0.01);
      // Generador de alta: caja superior trasera, codos rojos y cabezal de vapor.
      caja("generador", [0.7, 3.35, -0.45], [4.2, 1.2, 1.1], mat(0xd5d8dc), 0.05);
      const ROJO = mat(0xc8102e, 0.45, 0.1);
      for (const x of [-0.9, 0.1, 1.1, 2.1]) {
        const codo = conAristas(new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.24, 18, 24, Math.PI / 2), ROJO.clone()));
        codo.rotation.y = Math.PI / 2;
        codo.position.set(x, 2.95, 0.25);
        escena.add(codo);
        registrar("generador", codo);
      }
      cilindro("cabezal", [-0.4, 3.0, 0.7], 0.3, 4.8, "x", BLANCO);
      for (const x of [-2.2, 1.4]) caja("cabezal", [x, 2.82, 0.7], [0.18, 0.3, 0.3], GRIS, 0.02);
      brida([-2.85, 3.0, 0.7], 0.3, "x");
      // Cajas de agua (extremo izquierdo) con tapas atornilladas.
      caja("cuerpo", [-3.25, 1.2, 0.1], [0.5, 0.9, 1.5], BLANCO, 0.05);
      caja("cuerpo", [-3.25, 2.25, 0.1], [0.5, 0.9, 1.5], BLANCO, 0.05);
      tapa([-3.52, 1.2, 0.1], [1.3, 0.75]);
      tapa([-3.52, 2.25, 0.1], [1.3, 0.75]);
      // Extremo derecho: tapa abombada del absorbedor.
      const domo = conAristas(new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.25, 48), mat(0xd9dcdf)));
      domo.rotation.z = Math.PI / 2;
      domo.position.set(3.2, 1.55, 0);
      escena.add(domo);
      registrar("cuerpo", domo);
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        const perno = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), GRIS_OSC);
        perno.position.set(3.33, 1.55 + Math.sin(a) * 0.95, Math.cos(a) * 0.95);
        escena.add(perno);
      }
      // Tableros de control (rojo y verde), columnas, intercambiador y bomba al frente.
      caja("tablero", [-2.25, 1.15, 1.2], [0.75, 1.0, 0.35], mat(0xd8401f, 0.5), 0.03);
      caja("tablero", [-1.4, 1.1, 1.2], [0.75, 1.1, 0.35], mat(0x25b33a, 0.5), 0.03);
      for (const x of [1.0, 1.55]) {
        cilindro("columnas", [x, 1.65, 1.3], 0.16, 1.9, "y", BLANCO);
        cilindro("columnas", [x, 2.65, 1.3], 0.2, 0.12, "y", GRIS);
      }
      caja("intercambiador", [1.3, 0.5, 1.15], [0.95, 0.55, 0.5], mat(0xd9781e, 0.5), 0.04);
      cilindro("bomba", [-0.3, 0.45, 1.25], 0.17, 0.55, "x", mat(0x5a6470));
      cilindro("bomba", [0.1, 0.45, 1.25], 0.24, 0.16, "x", GRIS);
      caja(null, [0.2, 1.95, 1.05], [0.45, 0.32, 0.12], mat(0x9aa7b4, 0.2, 0.1), 0.02); // visor

      // ── Equipos del proceso ──
      // Calderas (de donde sale el vapor excedente F1).
      caja("caldera", [-9, 1.15, 0], [1.8, 2.3, 1.5], mat(0x1f5fbf, 0.5), 0.05);
      caja("caldera", [-9.65, 1.6, 0.78], [0.35, 0.9, 0.05], mat(0x0f2f5f), 0.01);
      cilindro("caldera", [-8.4, 2.9, -0.4], 0.2, 1.4, "y", GRIS);
      // Válvula de control en la línea de vapor.
      cilindro("valvula", [-5.6, 3.7, 0.7], 0.2, 0.5, "x", GRIS);
      cilindro("valvula", [-5.6, 4.05, 0.7], 0.06, 0.5, "y", GRIS_OSC);
      const actuador = conAristas(new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xd0c7b8)));
      actuador.position.set(-5.6, 4.3, 0.7);
      actuador.rotation.x = Math.PI;
      escena.add(actuador);
      registrar("valvula", actuador);
      // Tanque de condensado y bomba de alimentación.
      cilindro("tanque", [-5.8, 0.9, -1.8], 0.5, 1.8, "y", GRIS);
      cilindro("tanque", [-7.0, 0.3, -1.8], 0.18, 0.45, "x", mat(0x2d3a4a));
      // Torre de enfriamiento.
      caja("torre", [0, 1.3, -5.6], [3.2, 2.6, 2.2], mat(0x6f8aa3, 0.6), 0.05);
      for (let i = 0; i < 9; i++) caja("torre", [0, 0.5 + i * 0.22, -4.48], [3.0, 0.05, 0.03], mat(0x445566), 0.005);
      cilindro("torre", [0, 2.9, -5.6], 0.85, 0.6, "y", mat(0x5d7891));
      const helice = new THREE.Group();
      for (let i = 0; i < 4; i++) {
        const aspa = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.03, 0.18), mat(0x24303c));
        aspa.rotation.y = (i * Math.PI) / 2;
        helice.add(aspa);
      }
      helice.position.set(0, 3.25, -5.6);
      escena.add(helice);
      // Manejadora de aire del edificio (la demanda).
      caja("manejadora", [5.9, 1.3, 3.0], [2.0, 2.4, 1.6], mat(0x55606b, 0.5), 0.05);
      for (let i = 0; i < 10; i++) caja("manejadora", [5.9, 0.4 + i * 0.2, 3.82], [1.7, 0.04, 0.02], mat(0xb9c2cb), 0.005);

      // ── Corrientes: tubería + flechas en movimiento ──
      interface Corriente { id: IdFlujo; curva: InstanceType<typeof THREE.CurvePath<V3>>; flechas: InstanceType<typeof THREE.InstancedMesh>; tubo: Malla; n: number; velocidad: number }
      const corrientes: Corriente[] = [];
      const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
      const corriente = (id: IdFlujo, pts: V3[], { externa = true, radio = 0.12, velocidad = 0.06 } = {}) => {
        const curva = new THREE.CurvePath<V3>();
        for (let i = 1; i < pts.length; i++) curva.add(new THREE.LineCurve3(pts[i - 1]!, pts[i]!));
        const tubo = new THREE.Mesh(new THREE.TubeGeometry(curva as never, 40 * pts.length, radio, 14, false), externa ? TUBO.clone() : mat(COLOR[id], 0.45, 0.1));
        escena.add(tubo);
        const n = Math.max(6, Math.round(curva.getLength() * (externa ? 1.6 : 2.4)));
        const flechas = new THREE.InstancedMesh(new THREE.ConeGeometry(radio * 1.55, radio * 3.2, 12), new THREE.MeshBasicMaterial({ color: COLOR[id], transparent: true }), n);
        escena.add(flechas);
        corrientes.push({ id, curva, flechas, tubo, n, velocidad: velocidad * (12 / curva.getLength()) });
      };
      // Vapor: calderas → válvula → cabezal del chiller.
      corriente("vapor", [v(-8.4, 2.3, 0.3), v(-8.4, 3.7, 0.3), v(-8.4, 3.7, 0.7), v(-3.4, 3.7, 0.7), v(-3.4, 3.0, 0.7), v(-2.9, 3.0, 0.7)], { radio: 0.16 });
      // Condensado: generador → tanque; alimentación: tanque → calderas.
      corriente("condensado", [v(-2.6, 2.6, -1.0), v(-2.6, 2.6, -1.8), v(-5.3, 2.6, -1.8), v(-5.3, 1.6, -1.8)], { radio: 0.1 });
      corriente("alimentacion", [v(-6.3, 0.3, -1.8), v(-8.4, 0.3, -1.8), v(-8.4, 0.3, -0.75)], { radio: 0.1 });
      // Agua helada: evaporador → manejadora del edificio, y su retorno.
      corriente("helada", [v(3.35, 1.0, 0.65), v(4.4, 1.0, 0.65), v(4.4, 1.0, 3.0), v(4.9, 1.0, 3.0)], { radio: 0.14 });
      corriente("retorno", [v(5.9, 2.5, 3.0), v(5.9, 3.0, 3.0), v(5.9, 3.0, -0.6), v(4.0, 3.0, -0.6), v(4.0, 2.1, -0.6), v(3.35, 2.1, -0.6)], { radio: 0.14 });
      // Agua de torre: torre → absorbedor; condensador → torre.
      corriente("torreFria", [v(-1.6, 0.35, -5.0), v(-4.3, 0.35, -5.0), v(-4.3, 0.35, -0.3), v(-4.3, 1.2, -0.3), v(-3.55, 1.2, -0.3)], { radio: 0.14 });
      corriente("torreCaliente", [v(-3.55, 2.25, -0.3), v(-4.8, 2.25, -0.3), v(-4.8, 3.4, -0.3), v(-4.8, 3.4, -5.6), v(-0.9, 3.4, -5.6), v(-0.9, 2.65, -5.6)], { radio: 0.14 });
      for (const [x, y, z] of [[-3.55, 1.2, -0.3], [-3.55, 2.25, -0.3], [3.35, 1.0, 0.65], [3.35, 2.1, -0.6]] as const) brida([x, y, z], 0.14, "x");
      // Tubería interna del chiller (colores de plano: magenta, verde y azul).
      corriente("concentrada", [v(0.4, 2.9, 1.08), v(0.4, 0.95, 1.08), v(0.85, 0.95, 1.08), v(0.85, 0.65, 1.08)], { externa: false, radio: 0.06, velocidad: 0.05 });
      corriente("diluida", [v(0.1, 0.45, 1.25), v(0.1, 0.8, 1.42), v(1.0, 0.8, 1.42), v(1.0, 2.8, 1.42), v(1.55, 2.8, 1.42), v(1.55, 2.6, 1.42)], { externa: false, radio: 0.05, velocidad: 0.05 });
      corriente("refrigerante", [v(-2.95, 2.4, 1.12), v(-2.95, 0.6, 1.12), v(2.7, 0.6, 1.12), v(2.7, 2.0, 1.12)], { externa: false, radio: 0.06, velocidad: 0.04 });

      // ── Etiquetas ──
      const etiquetasDom = new Map<IdEquipo | "dato", HTMLDivElement[]>();
      const etiqueta = (id: IdEquipo | "dato", html: string, [x, y, z]: [number, number, number], clase = "") => {
        const div = document.createElement("div");
        div.className = `vt-etiqueta3d vt-etiqueta3d--cad ${clase}`;
        div.innerHTML = html;
        const o = new CSS2DObject(div);
        o.position.set(x, y, z);
        escena.add(o);
        etiquetasDom.set(id, [...(etiquetasDom.get(id) ?? []), div]);
      };
      etiqueta("caldera", `Calderas · ${p.fuente.id}`, [-9, 2.75, 0]);
      etiqueta("valvula", "Válvula de control", [-5.6, 4.85, 0.7]);
      etiqueta("generador", "Generador", [0.7, 4.2, -0.45]);
      etiqueta("cuerpo", "Condensador · evaporador · absorbedor", [0.2, 2.75, 1.05]);
      etiqueta("intercambiador", "Intercambiador de solución", [1.3, 0.05, 1.6]);
      etiqueta("tablero", "Tableros de control", [-1.8, 1.85, 1.4]);
      etiqueta("tanque", "Tanque de condensado", [-5.8, 2.05, -1.8]);
      etiqueta("torre", "Torre de enfriamiento", [0, 3.9, -5.6]);
      etiqueta("manejadora", `${p.demanda.nombre} · ${p.demanda.id}`, [5.9, 2.9, 3.6]);
      etiqueta("dato", `<b style="color:#ff4d55">▲ Vapor LP ${p.fuente.tMax} °C</b><br>${num(calor, 2)} MW de calor`, [-6.9, 4.35, 0.7], "vt-etiqueta3d--dato");
      etiqueta("dato", `<b style="color:#00b7ff">▼ Agua helada 7 °C</b><br>${num(frio, 2)} MW de frío`, [4.4, 0.35, 2.3], "vt-etiqueta3d--dato");
      etiqueta("dato", `<b style="color:#5fd0ff">Condensado</b> ≈ 95 °C`, [-4.2, 2.95, -1.8], "vt-etiqueta3d--dato");

      // ── Animación ──
      const reloj = new THREE.Clock();
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), arriba = new THREE.Vector3(0, 1, 0), escala = new THREE.Vector3();
      let cuadro = 0;
      const animar = () => {
        cuadro = requestAnimationFrame(animar);
        const t = reloj.getElapsedTime();
        const actual = estado.current.paso === null ? null : RECORRIDO[estado.current.paso]!;
        for (const c of corrientes) {
          const activa = !actual || actual.flujos.includes(c.id);
          const s = activa ? 1 : 0.55;
          escala.set(s, s, s);
          (c.flechas.material as InstanceType<typeof THREE.MeshBasicMaterial>).opacity = activa ? 1 : 0.25;
          const mt = c.tubo.material as MatStd;
          mt.emissive.setHex(activa && actual ? COLOR[c.id] : 0x000000);
          mt.emissiveIntensity = 0.35;
          for (let i = 0; i < c.n; i++) {
            const u = (i / c.n + t * c.velocidad) % 1;
            q.setFromUnitVectors(arriba, c.curva.getTangentAt(u));
            m4.compose(c.curva.getPointAt(u), q, escala);
            c.flechas.setMatrixAt(i, m4);
          }
          c.flechas.instanceMatrix.needsUpdate = true;
        }
        for (const [id, objetos] of equipos) {
          const activo = !!actual?.equipos.includes(id);
          for (const o of objetos) {
            const m = (o as Malla).material as MatStd | undefined;
            if (m?.emissive) {
              m.emissive.setHex(activo ? 0xffb000 : 0x000000);
              m.emissiveIntensity = activo ? 0.22 + 0.12 * Math.sin(t * 4) : 0;
            }
          }
        }
        for (const [id, divs] of etiquetasDom) for (const d of divs) d.style.opacity = !actual || id === "dato" || actual.equipos.includes(id as IdEquipo) ? "1" : "0.35";
        helice.rotation.y = t * 3;
        control.autoRotate = estado.current.girar;
        control.update();
        render.render(escena, camara);
        etiquetas.render(escena, camara);
      };
      animar();
      setListo(true);
      const ajustar = () => {
        camara.aspect = W() / H();
        camara.updateProjectionMatrix();
        render.setSize(W(), H());
        etiquetas.setSize(W(), H());
      };
      const observador = new ResizeObserver(ajustar);
      observador.observe(cont);
      liberar = () => {
        cancelAnimationFrame(cuadro);
        observador.disconnect();
        control.dispose();
        escena.traverse((o) => {
          const m = o as Malla;
          m.geometry?.dispose?.();
          (m.material as { dispose?: () => void } | undefined)?.dispose?.();
        });
        render.dispose();
        render.domElement.remove();
        etiquetas.domElement.remove();
      };
    })().catch((e: unknown) => {
      if (cancelado) return;
      console.error("Gemelo digital:", e);
      setFalla(e instanceof Error && e.message === "webgl" ? "Este navegador no tiene WebGL activo (aceleración por hardware). Actívela o abra la vitrina en Chrome o Edge." : "No se pudo cargar el modelo 3D. Revise la conexión con el servidor y reintente.");
    });
    return () => {
      cancelado = true;
      liberar();
    };
  }, [p.fuente.id, p.fuente.tMax, p.demanda.id, p.demanda.nombre, calor, frio, intento]);

  const actual = paso === null ? null : RECORRIDO[paso]!;
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_16rem]">
      <div className="relative overflow-hidden border border-white/10" style={{ height: alto, background: "linear-gradient(180deg, #16314f 0%, #4f7397 70%, #7d9bb8 100%)" }}>
        <div ref={lienzo} className="absolute inset-0" />
        {falla ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#0A0A0B]/70 p-6 text-center">
            <p className="max-w-sm text-xs text-white">{falla}</p>
            <button type="button" onClick={() => setIntento((n) => n + 1)} className="hud bg-[#FFB000] px-3 py-1.5 text-[10px] font-bold text-[#0A0A0B] hover:bg-[#FFE14D]">
              ↻ Reintentar
            </button>
          </div>
        ) : !listo ? (
          <p className="hud absolute inset-0 flex items-center justify-center text-[10px] text-white/70">Cargando gemelo digital…</p>
        ) : null}
        <ul className="pointer-events-none absolute bottom-10 left-2 flex max-w-[calc(100%-1rem)] flex-wrap gap-x-3 gap-y-0.5 bg-[#0A0A0B]/50 px-2 py-1 text-[10px] text-white">
          {LEYENDA.map(([id, t]) => (
            <li key={id} className="flex items-center gap-1.5" style={{ opacity: !actual || actual.flujos.includes(id) ? 1 : 0.45 }}>
              <b style={{ color: hex(COLOR[id]) }}>▶▶</b>
              {t}
            </li>
          ))}
        </ul>
        <span className="hud pointer-events-none absolute right-2 top-2 bg-[#0A0A0B]/45 px-2 py-1 text-[9px] text-[#FFB000]">Gemelo digital · ilustrativo</span>
        <div className="absolute bottom-2 right-2 flex gap-1">
          <button type="button" onClick={() => setGirar((g) => !g)} className="hud border border-white/25 bg-[#0A0A0B]/60 px-2 py-1 text-[9px] text-white/80 hover:text-white">
            {girar ? "❚❚ Detener giro" : "↻ Girar"}
          </button>
          <button
            type="button"
            onClick={() => {
              setTour(true);
              setPaso(0);
            }}
            className="hud border border-white/25 bg-[#0A0A0B]/60 px-2 py-1 text-[9px] text-white/80 hover:text-white"
          >
            ▶ Recorrido
          </button>
        </div>
        <span className="hud pointer-events-none absolute left-2 top-2 text-[9px] text-white/70">Arrastre para girar · rueda para acercar</span>
      </div>
      <div className="flex flex-col gap-1.5 text-[11px]">
        <p className="hud text-[9px] text-[#9B9BA1]">Cómo se recupera el calor {tour ? "· recorrido automático" : ""}</p>
        {RECORRIDO.map((r, i) => (
          <button
            key={r.titulo}
            type="button"
            onClick={() => {
              setTour(false);
              setPaso(i === paso ? null : i);
            }}
            className={`w-full border px-2 py-1.5 text-left transition-colors ${i === paso ? "border-[#FFE14D] bg-[#FFE14D]/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
          >
            <b className="text-white">{r.titulo}</b>
            {i === paso ? <span className="mt-0.5 block text-[#C8C8CC]">{r.texto(p)}</span> : null}
          </button>
        ))}
        <div className="cifra-tabular mt-1 grid grid-cols-2 gap-1 border-t border-white/10 pt-2 text-[10px] text-[#9B9BA1]">
          <span>
            Calor que entra<b className="block text-sm text-[#FF6B6B]">{num(calor, 2)} MW</b>
          </span>
          <span>
            Frío que sale<b className="block text-sm text-[#5AC8FA]">{num(frio, 2)} MW</b>
          </span>
          <span>
            COP del equipo<b className="block text-sm text-white">{num(p.tecnologia.factor, 2)}</b>
          </span>
          <span>
            Electricidad evitada<b className="block text-sm text-white">{num(p.electricidadEvitadaMWh)} MWh/año</b>
          </span>
        </div>
      </div>
    </div>
  );
}
