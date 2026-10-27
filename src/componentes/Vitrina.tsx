"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ETAPAS, META_PILOTO_INICIAL, OPORTUNIDAD_INICIAL, PASOS, SUPUESTOS_INICIALES, fraccionMeta, type Supuestos, type Zona } from "@/dominio/escenario";
import { ajusteTecnologia, cruzarTodo, demanda, ejesMatriz, evaluar, fuente, mejorTecnologia, modelo, portafolioPiloto, tecnologia, type Oportunidad } from "@/dominio/motor";
import { SupuestosFuentes } from "@/componentes/SupuestosFuentes";
import { MapaTermico, type FaseEntrada, type PaletaCalor } from "@/componentes/mapa/MapaTermico";
import { IntroTermica } from "@/componentes/IntroTermica";
import { PanelPaso } from "@/componentes/paneles";
import { BarraMovil, ControlesMovil, TarjetaPaso } from "@/componentes/Movil";
import { ChipOrigen, Contador, KpiMini, num } from "@/componentes/ui";

// Vitrina de Valor Térmico con lenguaje de cámara termográfica. El mapa ocupa
// toda la pantalla y es el protagonista; alrededor, un HUD liviano:
//   · barra superior delgada (marca, ubicación, controles),
//   · visor del paso arriba a la izquierda y lecturas debajo,
//   · escala de temperatura y ficha técnica plegable a la derecha,
//   · línea de tiempo de 10 pasos agrupados por etapa abajo.
// La mecánica (pasos, motor, presentación automática, celular) se conserva.

const SEG_POR_PASO = 14;
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
  const [termografia, setTermografia] = useState(true);
  const [fase, setFase] = useState<FaseEntrada>("CARGA");
  const [mapaListo, setMapaListo] = useState(false);
  const lista = fase === "LISTA";

  const [eleccion, setEleccion] = useState<Eleccion>({ ...OPORTUNIDAD_INICIAL });
  const [supuestos, setSupuestos] = useState<Supuestos>(SUPUESTOS_INICIALES);
  // Piloto: sección que elige la refinería (la de la oportunidad inicial) y meta de calor recuperado.
  const [seccion, setSeccion] = useState<Zona>(fuente(OPORTUNIDAD_INICIAL.fuente).zona);
  const [metaPiloto, setMetaPiloto] = useState(META_PILOTO_INICIAL);
  const [fuentesAbiertas, setFuentesAbiertas] = useState(false);
  const [parSel, setParSel] = useState<string | null>(`${OPORTUNIDAD_INICIAL.fuente}-${OPORTUNIDAD_INICIAL.demanda}`);
  const [puntoSel, setPuntoSel] = useState<string | null>(null);
  const [paleta, setPaleta] = useState<PaletaCalor>("ironbow");
  const [intensidad, setIntensidad] = useState(1.1);
  const [fichaAbierta, setFichaAbierta] = useState(true);
  // En pantallas medianas la ficha arranca plegada para dejarle espacio al mapa.
  const fichaInicial = useRef(false);

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
    if (!fichaInicial.current) {
      fichaInicial.current = true;
      if (window.innerWidth < 1100) setFichaAbierta(false);
    }
    window.addEventListener("resize", actualizar);
    return () => window.removeEventListener("resize", actualizar);
  }, []);

  // Modelo: pares, portafolio y la oportunidad que sigue el recorrido.
  const pares = useMemo(() => cruzarTodo(supuestos.eficiencia), [supuestos.eficiencia]);
  const cartera = useMemo(() => portafolioPiloto(supuestos, seccion, metaPiloto), [supuestos, seccion, metaPiloto]);
  const candidatos = useMemo(() => portafolioPiloto(supuestos, seccion, Infinity, 99), [supuestos, seccion]);
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
  const actual = PASOS[paso]!;

  const alPar = useCallback(
    (id: string) => {
      if (actual.id === "portafolio" || actual.id === "monitoreo" || actual.id === "impacto") elegirPar(id);
      else setParSel(id);
      setFichaAbierta(true);
    },
    [actual.id, elegirPar],
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
    setFichaAbierta(true);
  }, []);
  const alTecnologia = useCallback((id: string) => {
    setEleccion((e) => (ajusteTecnologia(tecnologia(id), fuente(e.fuente), demanda(e.demanda)) ? { ...e, tecnologia: id } : e));
  }, []);
  const alModelo = useCallback((id: string) => setEleccion((e) => ({ ...e, modelo: id })), []);
  const alPrecargado = useCallback(() => setMapaListo(true), []);
  const alTerminarIntro = useCallback(() => setFase("LISTA"), []);
  const reiniciar = useCallback(() => {
    setEleccion({ ...OPORTUNIDAD_INICIAL });
    setSupuestos(SUPUESTOS_INICIALES);
    setSeccion(fuente(OPORTUNIDAD_INICIAL.fuente).zona);
    setMetaPiloto(META_PILOTO_INICIAL);
    setParSel(`${OPORTUNIDAD_INICIAL.fuente}-${OPORTUNIDAD_INICIAL.demanda}`);
    setPaso(0);
  }, []);

  useEffect(() => {
    setTarjeta(true);
    setMenu(false);
  }, [paso]);

  // Celular: presentación automática al llegar (una vez) y tarjeta que deja ver el mapa.
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

  useEffect(() => {
    if (!auto || !lista) return;
    const id = setTimeout(() => setPaso((x) => (x + 1) % PASOS.length), SEG_POR_PASO * 1000);
    return () => clearTimeout(id);
  }, [auto, paso, lista]);

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

  // Lecturas: se encienden a medida que avanza la historia.
  const compatibles = pares.filter((p) => p.estado === "COMPATIBLE").length;
  const viables = pares.filter((p) => p.estado !== "DESCARTADO").length;
  const totalPiloto = useMemo(() => cartera.reduce((a, o) => ({ usd: a.usd + o.ahorroUSD, mw: a.mw + o.recuperadoMW }), { usd: 0, mw: 0 }), [cartera]);
  const enCartera = paso >= I.portafolio;
  const lecturas = [
    { etiqueta: "Meta del reto", valor: 7, unidad: "PJ · 4 años", origen: "DECLARADO" as const, activo: true },
    { etiqueta: "Puntos inventariados", valor: 15, unidad: "F+D", origen: "DECLARADO" as const, activo: paso >= I.inventario },
    { etiqueta: "Pares evaluados", valor: pares.length, origen: "ESTIMADO" as const, activo: paso >= I.cruce },
    { etiqueta: "Viables", valor: viables, unidad: `${compatibles} compat.`, origen: "ESTIMADO" as const, activo: paso >= I.cruce },
    { etiqueta: enCartera ? "Recuperado · piloto" : "Recuperado · proyecto", valor: enCartera ? totalPiloto.mw : op.qAprovechado, unidad: "MW", decimales: 1, origen: "ESTIMADO" as const, activo: paso >= I.tecnologia },
    { etiqueta: "Aporte a la meta anual", valor: fraccionMeta(enCartera ? totalPiloto.mw : op.qAprovechado, supuestos.horas) * 100, unidad: "%", decimales: 1, origen: "ESTIMADO" as const, activo: paso >= I.tecnologia },
    { etiqueta: enCartera ? "Ahorro/año · piloto" : "Ahorro/año · proyecto", valor: (enCartera ? totalPiloto.usd : op.ahorroUSD) / 1e6, formato: (n: number) => `USD ${num(n, 2)} M`, origen: "ESTIMADO" as const, activo: paso >= I.evaluacion, resaltar: paso >= I.evaluacion },
  ];

  const margen = useMemo(
    () => (movil ? { top: 104, bottom: tarjeta && lista ? Math.round(alto * 0.55) : 104, left: 0, right: 0 } : { top: 56, bottom: 118, left: ancho >= 1280 ? 372 : 300, right: fichaAbierta ? (ancho >= 1280 ? 404 : 336) : 64 }),
    [movil, tarjeta, lista, alto, ancho, fichaAbierta],
  );
  const ajusteZoom = movil ? -0.9 : ancho < 1100 ? -0.6 : ancho < 1400 ? -0.25 : 0;

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
      candidatos={candidatos}
      seccion={seccion}
      onSeccion={setSeccion}
      metaPiloto={metaPiloto}
      onMetaPiloto={setMetaPiloto}
      onFuentes={() => setFuentesAbiertas(true)}
      compacto={movil}
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
      <div className="flex h-[100dvh] items-center justify-center bg-[#0A0A0B] p-8 text-center text-[#EDEDED]">
        <p className="max-w-md text-sm">
          Falta el token público de Mapbox. Cree <code>.env.local</code> con <code>NEXT_PUBLIC_MAPBOX_TOKEN=pk.…</code> y reinicie.
        </p>
      </div>
    );
  }

  const etapaActual = ETAPAS.indexOf(actual.etapa);
  // Último paso: el tablero del portafolio ocupa la pantalla y el mapa queda de fondo.
  const tablero = actual.id === "impacto";

  return (
    <div className="relative h-[100dvh] w-screen overflow-hidden bg-[#0A0A0B] text-[#EDEDED]">
      <MapaTermico
        token={token}
        paso={paso}
        termografia={termografia}
        pares={pares}
        oportunidad={op}
        cartera={cartera}
        parSeleccionado={parSel}
        paleta={paleta}
        intensidad={intensidad}
        fase={fase}
        margen={margen}
        ajusteZoom={ajusteZoom}
        onPrecargado={alPrecargado}
        onSeleccionarPar={alPar}
        onSeleccionarPunto={alPunto}
        seccionPiloto={actual.id === "portafolio" || actual.id === "impacto" ? seccion : null}
      />

      {/* ── Celular ── */}
      <BarraMovil
        chips={lecturas.map((k) => (
          <KpiMini key={k.etiqueta} {...k} />
        ))}
        menuAbierto={menu}
        onMenu={setMenu}
        satelite={!termografia}
        onSatelite={() => setTermografia((t) => !t)}
        auto={auto}
        onAuto={() => setAuto((a) => !a)}
        lista={lista}
      />
      {lista && tarjeta ? (
        <TarjetaPaso paso={paso} total={PASOS.length} etapa={actual.etapa} titulo={actual.titulo} bajada={actual.bajada} texto={actual.texto} clave={actual.clave} detalle={movil ? panel : null} onVerMapa={() => setTarjeta(false)} onAnterior={() => ir(paso - 1)} />
      ) : null}
      {lista && !tarjeta ? <ControlesMovil paso={paso} total={PASOS.length} titulo={actual.titulo} onInfo={() => setTarjeta(true)} onAnterior={() => ir(paso - 1)} onSiguiente={() => (paso === PASOS.length - 1 ? ir(0) : ir(paso + 1))} /> : null}

      {/* ── Barra superior (HUD) ── */}
      <header className="hud absolute inset-x-0 top-0 z-10 hidden h-11 items-center justify-between border-b border-white/10 bg-[#0A0A0B]/[0.92] px-4 text-[10px] md:flex">
        <div className="flex items-center gap-4">
          <span className="titular text-sm font-extrabold normal-case tracking-tight text-white">
            VALOR <span className="vt-degradado">TÉRMICO</span>
          </span>
          <span className="text-[#5E5E66]">//</span>
          <span className="text-[#9B9BA1]">Mapa de oportunidades térmicas</span>
          <span className="hidden items-center gap-1.5 whitespace-nowrap text-[#5E5E66] 2xl:flex">
            por
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/marca/pdi-advanced-oscuro.png`} alt="PDI Advanced" className="h-5 w-auto" />
          </span>
        </div>
        <div className="hidden items-center gap-4 text-[#9B9BA1] lg:flex">
          <span>
            <span className="vt-parpadeo mr-1.5 inline-block h-1.5 w-1.5 bg-[#FF3B30] align-middle" />
            Refinería de Cartagena
          </span>
          <span className="cifra-tabular normal-case tracking-normal">10,3135° N · 75,4915° O</span>
          <span className="text-[#F5C518]">Datos ilustrativos</span>
          <button type="button" onClick={() => setFuentesAbiertas(true)} className="text-[#FFB000] hover:text-white">
            ⓘ Supuestos y fuentes
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => setTermografia((t) => !t)} className="border border-white/15 px-2.5 py-1 text-[#9B9BA1] hover:text-white">
            {termografia ? "◐ Color real" : "◑ Termografía"}
          </button>
          <button type="button" disabled={!lista} onClick={reiniciar} className="border border-white/15 px-2.5 py-1 text-[#9B9BA1] hover:text-white disabled:opacity-40">
            ↺ Reiniciar
          </button>
          <button type="button" disabled={!lista} onClick={() => setAuto((a) => !a)} className="bg-[#FFB000] px-3 py-1 font-bold text-[#0A0A0B] disabled:opacity-40">
            {auto ? "❚❚ Pausar" : "▶ Presentación"}
          </button>
        </div>
      </header>

      {/* ── Visor del paso + lecturas (izquierda) ── */}
      <div className={`absolute left-4 top-[3.75rem] z-10 hidden w-[18rem] flex-col gap-3 xl:w-[21rem] ${tablero ? "" : "md:flex"}`} style={{ maxHeight: "calc(100% - 3.75rem - 8rem)" }}>
        <section key={paso} className="visor vt-tarjeta-movil p-4">
          <p className="hud flex items-center justify-between text-[10px] text-[#FFB000]">
            <span>
              {String(paso + 1).padStart(2, "0")}/{PASOS.length} · {actual.etapa}
            </span>
            <span className="text-[#5E5E66]">{actual.bajada}</span>
          </p>
          <h2 className="mt-2 text-xl xl:text-[1.6rem] font-extrabold uppercase leading-[1.05] text-white">{actual.titulo}</h2>
          <p className="mt-2 text-[13px] leading-snug text-[#D0D0D4]">{actual.texto}</p>
          <p className="mt-3 border-l-2 border-[#FF5A1F] pl-2 text-xs leading-snug text-[#C8C8CC]">
            <span className="hud mr-1 text-[9px] text-[#FF5A1F]">Por qué importa</span>
            {actual.clave}
          </p>
        </section>
        <section className="visor hidden min-h-0 flex-col overflow-y-auto px-3 py-2 lg:flex" aria-label="Lecturas">
          <p className="hud mb-1 text-[9px] text-[#5E5E66]">Lecturas</p>
          <ul className="flex flex-col">
            {lecturas.map((k) => (
              <li key={k.etiqueta} className={`flex items-baseline justify-between gap-2 border-b border-white/5 py-1.5 transition-opacity duration-500 ${k.activo ? "" : "opacity-30"}`}>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[11px] text-[#9B9BA1]">{k.etiqueta}</span>
                  {k.activo ? <ChipOrigen origen={k.origen} mini /> : null}
                </span>
                <span className={`cifra-tabular shrink-0 text-right text-base font-semibold ${k.resaltar ? "text-[#FFE14D]" : "text-white"}`}>
                  {k.activo ? <Contador valor={k.valor} decimales={k.decimales} formato={k.formato} /> : "—"}
                  {k.unidad && k.activo ? <span className="ml-1 text-[10px] font-normal text-[#9B9BA1]">{k.unidad}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* ── Escala de temperatura (derecha, como en una cámara térmica) ── */}
      <div className={`absolute top-[3.75rem] z-10 hidden flex-col items-center gap-1 ${tablero ? "" : "md:flex"} ${fichaAbierta ? "right-[21.5rem] xl:right-[26rem]" : "right-4"}`} aria-hidden>
        <span className="cifra-tabular text-[10px] text-white">320°</span>
        <div className="h-44 w-2.5 border border-white/30" style={{ background: "linear-gradient(0deg, #3c5adc, #8c32b4, #e1376e, #ff6e1e, #ffc32d, #fffad7)" }} />
        <span className="cifra-tabular text-[10px] text-white">0°C</span>
      </div>

      {/* ── Ficha técnica plegable (derecha) ── */}
      <aside className={`visor absolute right-4 top-[3.75rem] z-10 hidden flex-col ${tablero ? "" : "md:flex"} ${fichaAbierta ? "bottom-[7.25rem] w-[20rem] xl:w-[24.5rem]" : "w-auto"}`}>
        <button type="button" onClick={() => setFichaAbierta((a) => !a)} className="hud flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2 text-[10px] text-[#9B9BA1] hover:text-white">
          <span>
            Ficha técnica <span className="text-[#FFB000]">· {actual.titulo}</span>
          </span>
          <span>{fichaAbierta ? "▸ ocultar" : "◂ ver"}</span>
        </button>
        {fichaAbierta && !tablero && !movil ? <div className="min-h-0 flex-1 overflow-y-auto p-3">{panel}</div> : null}
      </aside>

      {/* ── Tablero del portafolio (último paso, escritorio) ── */}
      {tablero && lista && !movil ? (
        <section key="tablero" className="vt-tarjeta-movil absolute inset-x-4 bottom-[7.25rem] top-[3.75rem] z-10 hidden overflow-y-auto border border-white/10 bg-[#0A0A0B]/[0.9] p-4 backdrop-blur-sm md:block" aria-label="Portafolio de la planta">
          {panel}
        </section>
      ) : null}

      {/* ── Línea de tiempo (abajo) ── */}
      <nav className="absolute inset-x-4 bottom-4 z-10 hidden border border-white/10 bg-[#0A0A0B]/[0.92] px-4 pb-3 pt-2 md:block" aria-label="Recorrido">
        <div className="flex items-center gap-3">
          <button type="button" aria-label="Paso anterior" onClick={() => ir(paso - 1)} disabled={!lista || paso === 0} className="hud h-9 w-9 shrink-0 border border-white/15 text-sm text-[#9B9BA1] hover:text-white disabled:opacity-30">
            ←
          </button>
          <div className="relative min-w-0 flex-1">
            {/* Etapas */}
            <div className="hud mb-1.5 grid text-[9px]" style={{ gridTemplateColumns: `repeat(${PASOS.length}, minmax(0, 1fr))` }}>
              {ETAPAS.map((e, i) => {
                const desde = PASOS.findIndex((p) => p.etapa === e);
                const cuantos = PASOS.filter((p) => p.etapa === e).length;
                return (
                  <span key={e} className={`truncate border-l pl-1.5 ${i === etapaActual ? "border-[#FFB000] text-[#FFB000]" : i < etapaActual ? "border-white/30 text-[#9B9BA1]" : "border-white/15 text-[#5E5E66]"}`} style={{ gridColumn: `${desde + 1} / span ${cuantos}` }}>
                    {e}
                  </span>
                );
              })}
            </div>
            {/* Pista con el avance */}
            <div className="absolute left-0 right-0 top-[1.85rem] h-px bg-white/15" />
            <div className="absolute left-0 top-[1.85rem] h-px transition-all duration-700" style={{ width: `${(paso / (PASOS.length - 1)) * 100}%`, background: "var(--ironbow)" }} />
            <ol className="relative grid" style={{ gridTemplateColumns: `repeat(${PASOS.length}, minmax(0, 1fr))` }}>
              {PASOS.map((p, i) => (
                <li key={p.id}>
                  <button type="button" disabled={!lista} onClick={() => ir(i)} className="group relative flex w-full flex-col items-start gap-1 pt-0.5 text-left">
                    <span className={`h-3 w-3 border-2 transition ${i === paso ? "scale-125 border-[#FFE14D] bg-[#FFB000]" : i < paso ? "border-[#FFB000] bg-[#0A0A0B]" : "border-white/30 bg-[#0A0A0B] group-hover:border-white"}`} />
                    <span className={`block w-full truncate pr-2 text-[11px] leading-tight ${i === paso ? "font-semibold text-white" : "text-[#9B9BA1] group-hover:text-white"}`}>
                      <span className="cifra-tabular mr-1 text-[#5E5E66]">{String(i + 1).padStart(2, "0")}</span>
                      {/* En pantallas angostas solo el número; el título del paso actual siempre. */}
                      <span className={i === paso ? "" : "hidden xl:inline"}>{p.titulo}</span>
                    </span>
                    {i === paso && auto && lista ? <span key={paso} className="vt-progreso-paso absolute -bottom-1 left-0 h-0.5 bg-[#FFB000]" style={{ animationDuration: `${SEG_POR_PASO}s` }} /> : null}
                  </button>
                </li>
              ))}
            </ol>
          </div>
          {paso === PASOS.length - 1 ? (
            <button type="button" onClick={reiniciar} disabled={!lista} className="hud h-9 shrink-0 bg-[#FFB000] px-3 text-[10px] font-bold text-[#0A0A0B] disabled:opacity-30">
              ↺ Inicio
            </button>
          ) : (
            <button type="button" onClick={() => ir(paso + 1)} disabled={!lista} className="hud h-9 shrink-0 bg-[#FFB000] px-3 text-[10px] font-bold text-[#0A0A0B] disabled:opacity-30">
              Siguiente →
            </button>
          )}
        </div>
      </nav>

      {fuentesAbiertas ? <SupuestosFuentes onCerrar={() => setFuentesAbiertas(false)} /> : null}
      {fase === "CARGA" ? <IntroTermica mapaListo={mapaListo} onTerminar={alTerminarIntro} /> : null}
    </div>
  );
}
