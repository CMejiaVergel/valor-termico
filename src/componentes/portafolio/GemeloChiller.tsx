"use client";

import { useEffect, useRef, useState } from "react";
import type { Propuesta } from "@/dominio/portafolios";
import { num } from "@/componentes/ui";

// Gemelo digital (ilustrativo) de un chiller de absorción de bromuro de litio, de
// simple efecto, en three.js: los cuatro recipientes del ciclo, el intercambiador de
// solución y la bomba, con los flujos animados (partículas) y las corrientes externas
// conectadas a la planta: el vapor de la fuente, el agua helada hacia la demanda y el
// agua de la torre de enfriamiento. Se carga bajo demanda (three pesa ~600 kB).

type IdComponente = "generador" | "condensador" | "evaporador" | "absorbedor" | "intercambiador" | "bomba";

export const COMPONENTES: Array<{ id: IdComponente; nombre: string; texto: string }> = [
  { id: "generador", nombre: "1 · Generador", texto: "El vapor de la fuente calienta la solución de bromuro de litio y evapora el agua que lleva disuelta." },
  { id: "condensador", nombre: "2 · Condensador", texto: "Ese vapor de agua se condensa con el agua de la torre de enfriamiento." },
  { id: "evaporador", nombre: "3 · Evaporador", texto: "Al vacío, el agua se evapora a ≈ 4 °C y le quita calor al agua helada que va a los edificios." },
  { id: "absorbedor", nombre: "4 · Absorbedor", texto: "La solución concentrada absorbe ese vapor y mantiene el vacío; la torre retira el calor." },
  { id: "intercambiador", nombre: "Intercambiador de solución", texto: "Precalienta la solución diluida con la concentrada que vuelve: mejora el COP." },
  { id: "bomba", nombre: "Bomba de solución", texto: "Lleva la solución diluida de vuelta al generador. Es el único consumo eléctrico relevante." },
];

const COLORES = { vapor: 0xff5a1f, condensado: 0xffb000, helada: 0x5ac8fa, torre: 0x3ddc84, refrigerante: 0xedf6ff, diluida: 0xb98cff, concentrada: 0xe8336d };

export function GemeloChiller({ p, alto = 360 }: { p: Propuesta; alto?: number }) {
  const lienzo = useRef<HTMLDivElement>(null);
  const [activo, setActivo] = useState<IdComponente | null>(null);
  const activoRef = useRef<IdComponente | null>(null);
  activoRef.current = activo;
  const [girar, setGirar] = useState(true);
  const girarRef = useRef(true);
  girarRef.current = girar;
  const [listo, setListo] = useState(false);

  const calor = p.recuperadoMW, frio = p.qUtil;

  useEffect(() => {
    const cont = lienzo.current;
    if (!cont) return;
    let cancelado = false;
    let liberar = () => {};
    (async () => {
      const THREE = await import("three");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
      const { CSS2DRenderer, CSS2DObject } = await import("three/examples/jsm/renderers/CSS2DRenderer.js");
      if (cancelado || !lienzo.current) return;
      const W = () => cont.clientWidth, H = () => cont.clientHeight;
      const escena = new THREE.Scene();
      escena.background = new THREE.Color(0x0b0b0c);
      escena.fog = new THREE.Fog(0x0b0b0c, 16, 30);
      const camara = new THREE.PerspectiveCamera(38, W() / H(), 0.1, 100);
      camara.position.set(9.5, 7.5, 13);
      const render = new THREE.WebGLRenderer({ antialias: true });
      render.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
      render.setSize(W(), H());
      cont.appendChild(render.domElement);
      const etiquetas = new CSS2DRenderer();
      etiquetas.setSize(W(), H());
      Object.assign(etiquetas.domElement.style, { position: "absolute", inset: "0", pointerEvents: "none" });
      cont.appendChild(etiquetas.domElement);
      const control = new OrbitControls(camara, render.domElement);
      control.target.set(0, 1.5, 0);
      control.enableDamping = true;
      control.minDistance = 8;
      control.maxDistance = 22;
      control.maxPolarAngle = Math.PI * 0.48;
      control.autoRotateSpeed = 0.6;

      escena.add(new THREE.HemisphereLight(0xdfe8ff, 0x1a1208, 1.1));
      const sol = new THREE.DirectionalLight(0xffffff, 1.6);
      sol.position.set(6, 10, 6);
      escena.add(sol);
      const brillo = new THREE.PointLight(0xff6e1e, 6, 8);
      brillo.position.set(-1.6, 3.6, 1.2);
      escena.add(brillo);

      // Base (skid) y retícula de la planta.
      const piso = new THREE.Mesh(new THREE.BoxGeometry(9, 0.2, 5.6), new THREE.MeshStandardMaterial({ color: 0x24242a, metalness: 0.3, roughness: 0.8 }));
      piso.position.y = -0.1;
      escena.add(piso);
      const grilla = new THREE.GridHelper(30, 30, 0x2e2e34, 0x1c1c20);
      grilla.position.y = -0.21;
      escena.add(grilla);

      const metal = (color: number, emisivo = 0x000000) => new THREE.MeshStandardMaterial({ color, metalness: 0.55, roughness: 0.38, emissive: emisivo, emissiveIntensity: 0.25 });
      const recipientes = new Map<IdComponente, InstanceType<typeof THREE.Mesh>>();
      const recipiente = (id: IdComponente, x: number, y: number, color: number, radio = 0.6, largo = 2.8) => {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(radio, radio, largo, 40), metal(color, color));
        m.rotation.z = Math.PI / 2;
        m.position.set(x, y, 0);
        escena.add(m);
        // Tapas y soportes.
        for (const s of [-1, 1]) {
          const tapa = new THREE.Mesh(new THREE.SphereGeometry(radio, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), metal(color, color));
          tapa.rotation.z = (s * Math.PI) / 2 * -1;
          tapa.position.set(x + (s * largo) / 2, y, 0);
          escena.add(tapa);
        }
        recipientes.set(id, m);
        return m;
      };
      recipiente("generador", -1.7, 3.1, 0xc2552a);
      recipiente("condensador", 1.7, 3.1, 0x2a8f7a);
      recipiente("evaporador", 1.7, 1.2, 0x2f6fa8);
      recipiente("absorbedor", -1.7, 1.2, 0x6a4aa3);
      for (const [x, y] of [[-1.7, 3.1], [1.7, 3.1], [1.7, 1.2], [-1.7, 1.2]] as const) {
        for (const s of [-0.9, 0.9]) {
          const pata = new THREE.Mesh(new THREE.BoxGeometry(0.12, y - 0.0, 0.12), metal(0x55555c));
          pata.position.set(x + s, y / 2 - 0.3, 0.45);
          escena.add(pata);
        }
      }
      const hx = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.5), metal(0x8a8a92, 0xb98cff));
      hx.position.set(0, 0.45, 1.9);
      escena.add(hx);
      recipientes.set("intercambiador", hx);
      const bomba = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.5, 24), metal(0x8a8a92, 0xb98cff));
      bomba.position.set(-1.7, 0.25, 1.9);
      escena.add(bomba);
      recipientes.set("bomba", bomba);

      // Flujos: tubería + partículas que recorren el trazado.
      type Flujo = { curva: InstanceType<typeof THREE.CurvePath<InstanceType<typeof THREE.Vector3>>>; puntos: InstanceType<typeof THREE.InstancedMesh>; n: number; velocidad: number };
      const flujos: Flujo[] = [];
      const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
      const tramo = (color: number, pts: Array<InstanceType<typeof THREE.Vector3>>, velocidad = 0.12, radio = 0.07) => {
        const curva = new THREE.CurvePath<InstanceType<typeof THREE.Vector3>>();
        for (let i = 1; i < pts.length; i++) curva.add(new THREE.LineCurve3(pts[i - 1]!, pts[i]!));
        const tubo = new THREE.Mesh(new THREE.TubeGeometry(curva as never, 24 * pts.length, radio, 10, false), new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.32, metalness: 0.2, roughness: 0.4 }));
        escena.add(tubo);
        const n = Math.max(8, Math.round(curva.getLength() * 3));
        const puntos = new THREE.InstancedMesh(new THREE.SphereGeometry(radio * 1.25, 10, 8), new THREE.MeshBasicMaterial({ color }), n);
        escena.add(puntos);
        flujos.push({ curva, puntos, n, velocidad });
      };
      // Externos.
      tramo(COLORES.vapor, [v(-5.2, 3.9, 0), v(-3.5, 3.9, 0), v(-3.5, 3.1, 0), v(-3.1, 3.1, 0)], 0.16, 0.11); // vapor de la fuente
      tramo(COLORES.condensado, [v(-3.1, 2.8, 0.3), v(-3.8, 2.8, 0.3), v(-3.8, 0.6, 0.3), v(-5.2, 0.6, 0.3)], 0.1, 0.08); // condensado de vuelta
      tramo(COLORES.helada, [v(3.1, 1.25, 0.25), v(4.2, 1.25, 0.25), v(4.2, 2.2, 0.25), v(5.2, 2.2, 0.25)], 0.12, 0.1); // agua helada a edificios
      tramo(COLORES.helada, [v(5.2, 0.5, -0.25), v(4.6, 0.5, -0.25), v(4.6, 1.05, -0.25), v(3.1, 1.05, -0.25)], 0.12, 0.1); // retorno
      tramo(COLORES.torre, [v(0, -0.05, -3.2), v(0, 0.95, -3.2), v(-1.7, 0.95, -3.2), v(-1.7, 0.95, -0.6)], 0.1, 0.09); // torre → absorbedor
      tramo(COLORES.torre, [v(-1.7, 1.5, -0.6), v(-1.7, 1.5, -1.6), v(1.7, 2.6, -1.6), v(1.7, 2.9, -0.6)], 0.1, 0.09); // absorbedor → condensador
      tramo(COLORES.torre, [v(1.7, 3.4, -0.6), v(1.7, 3.4, -2.6), v(2.6, 3.4, -2.6), v(2.6, -0.05, -3.4)], 0.1, 0.09); // a la torre
      // Internos del ciclo.
      tramo(COLORES.refrigerante, [v(-0.5, 3.7, 0), v(0, 4.0, 0), v(0.5, 3.7, 0)], 0.2, 0.09); // vapor de agua G → C
      tramo(COLORES.refrigerante, [v(2.9, 2.6, 0), v(3.3, 2.6, 0), v(3.3, 1.7, 0), v(2.9, 1.7, 0)], 0.09, 0.05); // agua líquida C → E
      tramo(COLORES.refrigerante, [v(0.5, 1.2, 0), v(0, 1.2, 0), v(-0.5, 1.2, 0)], 0.2, 0.12); // vapor E → A
      tramo(COLORES.diluida, [v(-1.7, 0.6, 0.4), v(-1.7, 0.45, 1.9), v(-0.45, 0.45, 1.9), v(0.45, 0.6, 1.9), v(-0.9, 2.5, 1.0), v(-1.7, 2.5, 0.4)], 0.1, 0.06); // diluida A → B → HX → G
      tramo(COLORES.concentrada, [v(-2.6, 2.5, 0.35), v(-2.6, 2.0, 1.9), v(0.45, 0.3, 1.9), v(-0.4, 0.3, 1.1), v(-1.0, 1.7, 0.35)], 0.1, 0.06); // concentrada G → HX → A

      // Etiquetas HTML.
      const etiqueta = (html: string, x: number, y: number, z: number, clase = "") => {
        const div = document.createElement("div");
        div.className = `vt-etiqueta3d ${clase}`;
        div.innerHTML = html;
        const o = new CSS2DObject(div);
        o.position.set(x, y, z);
        escena.add(o);
        return div;
      };
      etiqueta("Generador", -1.7, 3.95, 0);
      etiqueta("Condensador", 1.7, 3.95, 0);
      etiqueta("Evaporador", 1.7, 0.35, 0.7);
      etiqueta("Absorbedor", -1.7, 0.35, 0.7);
      etiqueta(`<b style="color:#FF8A3D">▲ Vapor de ${p.fuente.id} · ${p.fuente.tMax} °C</b><br>${num(calor, 2)} MW de calor`, -4.8, 4.5, 0, "vt-etiqueta3d--dato");
      etiqueta(`<b style="color:#5AC8FA">▼ Agua helada 7 °C → ${p.demanda.id}</b><br>${num(frio, 2)} MW de frío`, 4.6, 2.8, 0.25, "vt-etiqueta3d--dato");
      etiqueta(`<b style="color:#3DDC84">Torre de enfriamiento</b><br>30 °C → 35 °C`, -3.6, 0.4, -3.4, "vt-etiqueta3d--dato");

      const reloj = new THREE.Clock();
      const m4 = new THREE.Matrix4();
      let cuadro = 0;
      const animar = () => {
        cuadro = requestAnimationFrame(animar);
        const tt = reloj.getElapsedTime();
        for (const f of flujos) {
          for (let i = 0; i < f.n; i++) {
            const u = (i / f.n + tt * f.velocidad) % 1;
            const q = f.curva.getPointAt(u);
            m4.makeTranslation(q.x, q.y, q.z);
            f.puntos.setMatrixAt(i, m4);
          }
          f.puntos.instanceMatrix.needsUpdate = true;
        }
        // Resalta el componente elegido.
        for (const [id, m] of recipientes) {
          const mat = m.material as InstanceType<typeof THREE.MeshStandardMaterial>;
          mat.emissiveIntensity = activoRef.current === id ? 0.9 + 0.3 * Math.sin(tt * 5) : 0.18;
        }
        brillo.intensity = 5 + Math.sin(tt * 2.2) * 1.5;
        control.autoRotate = girarRef.current;
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
          const m = o as InstanceType<typeof THREE.Mesh>;
          m.geometry?.dispose?.();
          const mat = m.material as { dispose?: () => void } | undefined;
          mat?.dispose?.();
        });
        render.dispose();
        render.domElement.remove();
        etiquetas.domElement.remove();
      };
    })();
    return () => {
      cancelado = true;
      liberar();
    };
  }, [p.fuente.id, p.fuente.tMax, p.demanda.id, calor, frio]);

  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_15rem]">
      <div className="relative overflow-hidden border border-white/10" style={{ height: alto }}>
        <div ref={lienzo} className="absolute inset-0" />
        {!listo ? <p className="hud absolute inset-0 flex items-center justify-center text-[10px] text-[#5E5E66]">Cargando gemelo digital…</p> : null}
        <div className="pointer-events-none absolute left-2 top-2 flex flex-col gap-1">
          <span className="hud text-[9px] text-[#FFB000]">Gemelo digital · ilustrativo</span>
          <span className="hud text-[9px] text-[#5E5E66]">Arrastre para girar · rueda para acercar</span>
        </div>
        <button type="button" onClick={() => setGirar((g) => !g)} className="hud absolute bottom-2 right-2 border border-white/15 bg-[#0A0A0B]/80 px-2 py-1 text-[9px] text-[#9B9BA1] hover:text-white">
          {girar ? "❚❚ Pausar giro" : "▶ Girar"}
        </button>
        <ul className="pointer-events-none absolute bottom-2 left-2 flex flex-wrap gap-x-3 gap-y-1 text-[9px] text-[#9B9BA1]">
          {[["#FF5A1F", "vapor"], ["#5AC8FA", "agua helada"], ["#3DDC84", "agua de torre"], ["#EDF6FF", "refrigerante (agua)"], ["#B98CFF", "solución diluida"], ["#E8336D", "solución concentrada"]].map(([c, t]) => (
            <li key={t} className="flex items-center gap-1">
              <i className="inline-block h-2 w-2 rounded-full" style={{ background: c }} />
              {t}
            </li>
          ))}
        </ul>
      </div>
      <ol className="flex flex-col gap-1.5 text-[11px]">
        {COMPONENTES.map((c) => (
          <li key={c.id}>
            <button type="button" onMouseEnter={() => setActivo(c.id)} onMouseLeave={() => setActivo(null)} onFocus={() => setActivo(c.id)} onBlur={() => setActivo(null)} className={`w-full border px-2 py-1.5 text-left ${activo === c.id ? "border-[#FFE14D] bg-[#FFE14D]/10" : "border-white/10 bg-white/5"}`}>
              <b className="text-white">{c.nombre}</b>
              <span className="block text-[#9B9BA1]">{c.texto}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
