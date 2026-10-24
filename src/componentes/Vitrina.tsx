"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ETAPAS, OPORTUNIDAD_INICIAL, PASOS, SUPUESTOS_INICIALES, type Supuestos } from "@/dominio/escenario";
import { CALOR_RESIDUAL_MW, ajusteTecnologia, cruzarTodo, demanda, ejesMatriz, evaluar, fuente, mejorTecnologia, modelo, portafolio, tecnologia, type Oportunidad } from "@/dominio/motor";
import { MapaTermico, type FaseEntrada, type PaletaCalor } from "@/componentes/mapa/MapaTermico";
import { PantallaCarga } from "@/componentes/PantallaCarga";
import { PanelPaso } from "@/componentes/paneles";
import { BarraMovil, ControlesMovil, TarjetaPaso } from "@/componentes/Movil";
import { Kpi, KpiMini, num } from "@/componentes/ui";

// Vitrina guiada de Calor Rescatado. Estructura heredada de la Vitrina de
// ConfluencIA Hídrica: pantalla de carga con precarga real, vuelo desde el
// planeta, recorrido por pasos con narración, indicadores que se encienden a
// medida que avanza la historia, panel contextual interactivo, presentación
// automática y experiencia móvil tipo app. Todo corre en el navegador.

const SEG_POR_PASO = 14;
const CARGA_MS = 14000;
const CARGA_VISTA_MS = 9000;
const PAUSA_COMPLETA_MS = 400;
const CLAVE_CARGA_VISTA = "calor-rescatado-carga-vista";
const indice = (id: string) => PASOS.findIndex((p) => p.id === id);
const I = { inventario: indice("inventario"), cruce: indice("cruce"), tecnologia: indice("tecnologia"), evaluacion: indice("evaluacion"), portafolio: indice("portafolio") };

interface Eleccion {
  fuente: string;
  demanda: string;
  tecnologia: string;
  modelo: string;
}

export function Vitrina() {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim() ?? "";
  const [paso, setPaso] = useState(0);
  const [auto, setAuto] = useState(false);
  const [satelite, setSatelite] = useState(true);
  const [fase, setFase] = useState<FaseEntrada>("CARGA");
  const [cargaVisible, setCargaVisible] = useState(true);
  const [saliendo, setSaliendo] = useState(false);
  const [reducido, setReducido] = useState(false);
  const [duracionCarga, setDuracionCarga] = useState(CARGA_MS);
  const inicioCarga = useRef(0);
  const lista = fase === "LISTA";

  const [eleccion, setEleccion] = useState<Eleccion>({ ...OPORTUNIDAD_INICIAL });
  const [supuestos, setSupuestos] = useState<Supuestos>(SUPUESTOS_INICIALES);
  const [parSel, setParSel] = useState<string | null>(`${OPORTUNIDAD_INICIAL.fuente}-${OPORTUNIDAD_INICIAL.demanda}`);
  const [puntoSel, setPuntoSel] = useState<string | null>(null);
  const [paleta, setPaleta] = useState<PaletaCalor>("clasica");
  const [intensidad, setIntensidad] = useState(1.3);

  // Pantalla: celular (< 768 px) o escritorio; el ancho decide el espacio libre del mapa.
  const [ancho, setAncho] = useState(1440);
  const [alto, setAlto] = useState(900);
  const movil = ancho < 768;
  const [tarjeta, setTarjeta] = useState(true);
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    const actualizar = () => {
      setAncho(window.innerWidth);
      setAlto(window.innerHeight);
    };
    actualizar();
    window.addEventListener("resize", actualizar);
    return () => window.removeEventListener("resize", actualizar);
  }, []);

  // Modelo: pares, portafolio y la oportunidad que sigue el recorrido.
  const pares = useMemo(() => cruzarTodo(supuestos.eficiencia), [supuestos.eficiencia]);
  const cartera = useMemo(() => portafolio(supuestos), [supuestos]);
  const op: Oportunidad = useMemo(() => {
    const e = evaluar(fuente(eleccion.fuente), demanda(eleccion.demanda), tecnologia(eleccion.tecnologia), modelo(eleccion.modelo), supuestos);
    const id = `${eleccion.fuente}-${eleccion.demanda}`;
    const enCartera = cartera.find((o) => `${o.fuente.id}-${o.demanda.id}` === id);
    return { ...e, codigo: enCartera?.codigo ?? "OT-★", par: pares.find((p) => p.id === id)!, ...ejesMatriz(e) };
  }, [eleccion, supuestos, cartera, pares]);

  const elegirPar = useCallback((id: string) => {
    const [f, d] = id.split("-") as [string, string];
    const mt = mejorTecnologia(fuente(f), demanda(d));
    if (!mt) return false;
    setEleccion((e) => ({ fuente: f, demanda: d, tecnologia: mt.t.id, modelo: modelo(e.modelo).soloPara && modelo(e.modelo).soloPara !== demanda(d).tipo ? "M2" : e.modelo }));
    setParSel(id);
    return true;
  }, []);

  const ir = useCallback((i: number) => setPaso(Math.max(0, Math.min(PASOS.length - 1, i))), []);
  const idPaso = PASOS[paso]!.id;

  const alPar = useCallback(
    (id: string) => {
      if (idPaso === "portafolio" || idPaso === "monitoreo" || idPaso === "impacto") elegirPar(id);
      else setParSel(id);
    },
    [idPaso, elegirPar],
  );
  const alEvaluarPar = useCallback(
    (id: string) => {
      if (elegirPar(id)) setPaso(I.tecnologia);
    },
    [elegirPar],
  );
  const alPunto = useCallback((id: string) => {
    setPuntoSel(id);
    setTarjeta(true);
  }, []);
  const alTecnologia = useCallback((id: string) => {
    setEleccion((e) => (ajusteTecnologia(tecnologia(id), fuente(e.fuente), demanda(e.demanda)) ? { ...e, tecnologia: id } : e));
  }, []);
  const alModelo = useCallback((id: string) => setEleccion((e) => ({ ...e, modelo: id })), []);
  const alFinEntrada = useCallback(() => setFase("LISTA"), []);
  const reiniciar = useCallback(() => {
    setEleccion({ ...OPORTUNIDAD_INICIAL });
    setSupuestos(SUPUESTOS_INICIALES);
    setParSel(`${OPORTUNIDAD_INICIAL.fuente}-${OPORTUNIDAD_INICIAL.demanda}`);
    setPaso(0);
  }, []);

  // Cada paso nuevo abre su tarjeta en el celular (y cierra el menú).
  useEffect(() => {
    setTarjeta(true);
    setMenu(false);
  }, [paso]);

  // En el celular la presentación automática arranca sola una vez al llegar.
  const autoMovilIniciado = useRef(false);
  useEffect(() => {
    if (!movil || !lista || autoMovilIniciado.current) return;
    autoMovilIniciado.current = true;
    setAuto(true);
  }, [movil, lista]);
  useEffect(() => {
    if (!movil || !auto || !tarjeta || !lista) return;
    const id = setTimeout(() => setTarjeta(false), 7000);
    return () => clearTimeout(id);
  }, [movil, auto, tarjeta, lista, paso]);

  // Carga → fundido → vuelo.
  const terminarCarga = useCallback(() => {
    setSaliendo(true);
    setFase((f) => (f === "CARGA" ? "VUELO" : f));
    try {
      sessionStorage.setItem(CLAVE_CARGA_VISTA, "1");
    } catch {
      // Sin almacenamiento: la próxima vez la carga dura lo normal.
    }
  }, []);
  useEffect(() => {
    inicioCarga.current = performance.now();
    setReducido(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    try {
      if (sessionStorage.getItem(CLAVE_CARGA_VISTA)) setDuracionCarga(CARGA_VISTA_MS);
    } catch {
      // Sin almacenamiento: duración normal.
    }
  }, []);
  useEffect(() => {
    if (saliendo) return;
    const falta = Math.max(0, duracionCarga - (performance.now() - inicioCarga.current)) + PAUSA_COMPLETA_MS;
    const id = setTimeout(terminarCarga, falta);
    return () => clearTimeout(id);
  }, [duracionCarga, saliendo, terminarCarga]);
  useEffect(() => {
    if (!saliendo) return;
    const id = setTimeout(() => setCargaVisible(false), reducido ? 0 : 750);
    return () => clearTimeout(id);
  }, [saliendo, reducido]);

  // Presentación automática (la barra de progreso es CSS).
  useEffect(() => {
    if (!auto || !lista) return;
    const id = setTimeout(() => setPaso((x) => (x + 1) % PASOS.length), SEG_POR_PASO * 1000);
    return () => clearTimeout(id);
  }, [auto, paso, lista]);

  // Teclado: ← → y espacio.
  useEffect(() => {
    if (!lista) return;
    const f = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.tagName === "INPUT") return;
      if (e.key === "ArrowRight") ir(paso + 1);
      else if (e.key === "ArrowLeft") ir(paso - 1);
      else if (e.key === " ") {
        e.preventDefault();
        setAuto((a) => !a);
      }
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [paso, ir, lista]);

  // Indicadores: se encienden a medida que avanza la historia.
  const compatibles = pares.filter((p) => p.estado === "COMPATIBLE").length;
  const viables = pares.filter((p) => p.estado !== "DESCARTADO").length;
  const totalCartera = useMemo(() => cartera.reduce((a, o) => ({ usd: a.usd + o.ahorroUSD, co2: a.co2 + o.co2t, mw: a.mw + o.qUtil }), { usd: 0, co2: 0, mw: 0 }), [cartera]);
  const enCartera = paso >= I.portafolio;
  const indicadores = [
    { etiqueta: "Calor residual identificado", valor: CALOR_RESIDUAL_MW, unidad: "MWt", origen: "DECLARADO" as const, activo: true },
    { etiqueta: "Fuentes y demandas", valor: 15, unidad: "puntos", origen: "DECLARADO" as const, activo: paso >= I.inventario },
    { etiqueta: "Pares evaluados", valor: pares.length, origen: "ESTIMADO" as const, activo: paso >= I.cruce },
    { etiqueta: "Compatibles", valor: compatibles, unidad: `+ ${viables - compatibles} cond.`, origen: "ESTIMADO" as const, activo: paso >= I.cruce },
    { etiqueta: enCartera ? "Calor útil del portafolio" : "Calor útil del piloto", valor: enCartera ? totalCartera.mw : op.qUtil, unidad: "MW", decimales: 1, origen: "ESTIMADO" as const, activo: paso >= I.tecnologia },
    { etiqueta: enCartera ? "Ahorro anual del portafolio" : "Ahorro anual del piloto", valor: (enCartera ? totalCartera.usd : op.ahorroUSD) / 1e6, formato: (n: number) => `USD ${num(n, 2)} M`, origen: "ESTIMADO" as const, activo: paso >= I.evaluacion, resaltar: paso >= I.evaluacion },
    { etiqueta: enCartera ? "CO₂ evitado del portafolio" : "CO₂ evitado del piloto", valor: enCartera ? totalCartera.co2 : op.co2t, unidad: "t/año", origen: "ESTIMADO" as const, activo: paso >= I.evaluacion },
  ];

  const actual = PASOS[paso]!;
  const conNav = ancho >= 1024;
  // Espacio libre del mapa: entre la cabecera, los indicadores, el recorrido, la narración y el panel.
  const margen = useMemo(
    () => (movil ? { top: 112, bottom: tarjeta && lista ? Math.round(alto * 0.55) : 110, left: 0, right: 0 } : { top: 150, bottom: 200, left: conNav ? 300 : 0, right: 360 }),
    [movil, tarjeta, lista, alto, conNav],
  );
  const ajusteZoom = movil ? (paso === 0 ? -0.6 : -0.5) : 0;

  const panel = (
    <PanelPaso
      paso={actual.id}
      pares={pares}
      parSeleccionado={parSel}
      onPar={alPar}
      onEvaluarPar={alEvaluarPar}
      op={op}
      onTecnologia={alTecnologia}
      onModelo={alModelo}
      supuestos={supuestos}
      onSupuestos={setSupuestos}
      cartera={cartera}
      paleta={paleta}
      onPaleta={setPaleta}
      intensidad={intensidad}
      onIntensidad={setIntensidad}
      puntoSeleccionado={puntoSel}
      onPunto={alPunto}
    />
  );

  if (!token.startsWith("pk.")) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-[#051417] p-8 text-center text-[#E0F0F2]">
        <p className="max-w-md text-sm">
          Falta el token público de Mapbox. Cree <code>.env.local</code> con <code>NEXT_PUBLIC_MAPBOX_TOKEN=pk.…</code> y reinicie.
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-[100dvh] w-screen overflow-hidden bg-[#051417] text-[#E0F0F2]">
      <MapaTermico
        token={token}
        paso={paso}
        satelite={satelite}
        orbitar={auto || paso === 0}
        pares={pares}
        oportunidad={op}
        cartera={cartera}
        parSeleccionado={parSel}
        paleta={paleta}
        intensidad={intensidad}
        fase={fase}
        movimientoReducido={reducido}
        duracionCargaMs={duracionCarga}
        margen={margen}
        ajusteZoom={ajusteZoom}
        onFinEntrada={alFinEntrada}
        onSeleccionarPar={alPar}
        onSeleccionarPunto={alPunto}
      />

      {/* Celular */}
      <BarraMovil
        chips={indicadores.map((k) => (
          <KpiMini key={k.etiqueta} {...k} />
        ))}
        menuAbierto={menu}
        onMenu={setMenu}
        satelite={satelite}
        onSatelite={() => setSatelite((s) => !s)}
        auto={auto}
        onAuto={() => setAuto((a) => !a)}
        lista={lista}
      />
      {lista && tarjeta ? (
        <TarjetaPaso paso={paso} total={PASOS.length} etapa={actual.etapa} titulo={actual.titulo} bajada={actual.bajada} texto={actual.texto} clave={actual.clave} detalle={panel} onVerMapa={() => setTarjeta(false)} onAnterior={() => ir(paso - 1)} />
      ) : null}
      {lista && !tarjeta ? <ControlesMovil paso={paso} total={PASOS.length} titulo={actual.titulo} onInfo={() => setTarjeta(true)} onAnterior={() => ir(paso - 1)} onSiguiente={() => (paso === PASOS.length - 1 ? ir(0) : ir(paso + 1))} /> : null}

      {/* Cabecera */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 hidden items-start justify-between gap-4 bg-gradient-to-b from-[#051417] via-[#051417]/75 to-transparent px-5 pb-10 pt-4 md:flex">
        <div className="pointer-events-auto flex items-center gap-4">
          <p className="font-[family-name:var(--font-titulos)] text-2xl font-bold leading-none text-white">
            <span className="vt-degradado">Calor</span> Rescatado
          </p>
          <div className="border-l border-white/15 pl-4">
            <p className="text-sm font-semibold text-white">Mapa de Oportunidades Térmicas · Refinería de Cartagena</p>
            <p className="text-[11px] text-[#FACC15]">Prototipo de demostración: cifras ilustrativas</p>
          </div>
        </div>
        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-2 text-xs">
          <button type="button" onClick={() => setSatelite((s) => !s)} className="rounded-md border border-white/15 bg-[#051417]/90 px-3 py-1.5 text-[#8CA8AD] hover:text-white">
            {satelite ? "Mapa nocturno" : "Satélite"}
          </button>
          <button type="button" disabled={!lista} onClick={reiniciar} className="rounded-md border border-white/15 bg-[#051417]/90 px-3 py-1.5 text-[#8CA8AD] hover:text-white disabled:opacity-50">
            ↺ Reiniciar
          </button>
          <button type="button" disabled={!lista} onClick={() => setAuto((a) => !a)} className="rounded-md bg-gradient-to-r from-[#00AEC0] via-[#CFE84E] to-[#FF8A3D] px-3 py-1.5 font-semibold text-[#051417] disabled:opacity-50">
            {auto ? "❚❚ Pausar" : "▶ Presentación automática"}
          </button>
        </div>
      </header>

      {/* Indicadores */}
      <section className="absolute inset-x-5 top-[4.5rem] z-10 hidden gap-2 md:grid md:grid-cols-4 xl:grid-cols-7">
        {indicadores.map((k) => (
          <Kpi key={k.etiqueta} {...k} />
        ))}
      </section>

      {/* Recorrido por etapas */}
      <nav className="absolute bottom-5 left-5 top-[11.5rem] z-10 hidden w-[17.5rem] flex-col gap-0.5 overflow-y-auto rounded-xl border border-white/10 bg-[#051417]/[0.93] p-3 lg:flex" aria-label="Recorrido">
        <p className="px-1 pb-1 text-[10px] uppercase tracking-[0.2em] text-[#8CA8AD]">Recorrido · ← → para avanzar</p>
        {ETAPAS.map((etapa) => (
          <div key={etapa} className="flex flex-col gap-0.5">
            <p className="mt-1.5 px-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-[#00AEC0]">{etapa}</p>
            {PASOS.map((p, i) =>
              p.etapa !== etapa ? null : (
                <button key={p.id} type="button" disabled={!lista} onClick={() => ir(i)} className={`relative overflow-hidden rounded-lg px-3 py-1.5 text-left transition disabled:cursor-default ${i === paso ? "bg-white/10" : "hover:bg-white/5"}`}>
                  <span className="flex items-baseline gap-2">
                    <span className={`cifra-tabular text-xs ${i <= paso ? "text-[#CFE84E]" : "text-[#5A7A80]"}`}>{String(i + 1).padStart(2, "0")}</span>
                    <span className={`text-sm font-semibold ${i === paso ? "text-white" : "text-[#8CA8AD]"}`}>{p.titulo}</span>
                  </span>
                  {i === paso ? <span className="mt-0.5 block pl-6 text-[11px] text-[#8CA8AD]">{p.bajada}</span> : null}
                  {i === paso && auto && lista ? <span key={paso} className="vt-progreso-paso absolute bottom-0 left-0 h-0.5 bg-[#CFE84E]" style={{ animationDuration: `${SEG_POR_PASO}s` }} /> : null}
                </button>
              ),
            )}
          </div>
        ))}
      </nav>

      {/* Narración */}
      <section className="absolute bottom-5 left-5 right-[23.5rem] z-10 hidden rounded-xl border border-white/10 bg-[#051417]/[0.94] p-4 md:block lg:left-[19.75rem]">
        <div className="flex items-center gap-2">
          {ETAPAS.map((e) => (
            <span key={e} className={`h-1 flex-1 rounded-full ${ETAPAS.indexOf(e) < ETAPAS.indexOf(actual.etapa) ? "bg-[#00AEC0]" : e === actual.etapa ? "bg-[#CFE84E]" : "bg-white/15"}`} />
          ))}
        </div>
        <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-[#00AEC0]">
          {actual.etapa} · paso {paso + 1} de {PASOS.length} · {actual.bajada}
        </p>
        <h2 className="mt-1 text-2xl font-bold leading-tight text-white">{actual.titulo}</h2>
        <p className="mt-1 max-w-3xl text-sm text-white/90">{actual.texto}</p>
        <p className="mt-2 max-w-3xl rounded-md border-l-2 border-[#CFE84E] bg-white/5 px-2 py-1 text-xs text-[#C9DADD]">
          <span className="font-semibold text-white">Por qué importa: </span>
          {actual.clave}
        </p>
        <div className="mt-3 flex items-center justify-between">
          <button type="button" onClick={() => ir(paso - 1)} disabled={!lista || paso === 0} className="rounded-md border border-white/15 px-3 py-1 text-xs text-[#8CA8AD] hover:text-white disabled:opacity-30">
            ← Anterior
          </button>
          <div className="flex gap-1">
            {PASOS.map((p, i) => (
              <button key={p.id} type="button" aria-label={`Ir al paso ${i + 1}`} disabled={!lista} onClick={() => ir(i)} className={`h-1.5 rounded-full transition-all ${i === paso ? "w-6 bg-[#CFE84E]" : "w-1.5 bg-white/25"}`} />
            ))}
          </div>
          {paso === PASOS.length - 1 ? (
            <button type="button" onClick={reiniciar} disabled={!lista} className="rounded-md bg-[#00AEC0] px-3 py-1 text-xs font-semibold text-[#051417] disabled:opacity-30">
              ↺ Volver al inicio
            </button>
          ) : (
            <button type="button" onClick={() => ir(paso + 1)} disabled={!lista} className="rounded-md bg-[#00AEC0] px-3 py-1 text-xs font-semibold text-[#051417] hover:bg-[#19C3D4] disabled:opacity-30">
              Siguiente →
            </button>
          )}
        </div>
      </section>

      {/* Panel contextual */}
      <aside className="absolute bottom-5 right-5 top-[11.5rem] z-10 hidden w-[22rem] flex-col gap-3 overflow-y-auto rounded-xl border border-white/10 bg-[#051417]/[0.94] p-4 md:flex">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#8CA8AD]">Detalle · {actual.titulo}</p>
        {panel}
      </aside>

      {cargaVisible ? <PantallaCarga saliendo={saliendo} duracionMs={duracionCarga} onSaltar={terminarCarga} /> : null}
    </div>
  );
}
