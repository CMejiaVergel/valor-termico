"use client";

import type { ReactNode } from "react";

// Vitrina en el celular (misma experiencia guiada de ConfluencIA, docs/19 §8):
// el mapa 3D ocupa la pantalla; cada paso aparece en una tarjeta que se cierra
// con «Ver en el mapa», y una barra mínima permite avanzar. Solo por debajo de md.

const ABAJO_SEGURO = "bottom-[calc(env(safe-area-inset-bottom)_+_1.75rem)]";

export function BarraMovil({ chips, menuAbierto, onMenu, satelite, onSatelite, auto, onAuto, lista }: { chips: ReactNode; menuAbierto: boolean; onMenu: (abierto: boolean) => void; satelite: boolean; onSatelite: () => void; auto: boolean; onAuto: () => void; lista: boolean }) {
  return (
    <header className="absolute inset-x-0 top-0 z-30 bg-gradient-to-b from-[#0A0A0B] via-[#0A0A0B]/85 to-transparent px-3 pb-3 pt-[max(0.5rem,env(safe-area-inset-top))] md:hidden">
      <div className="relative flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="font-[family-name:var(--font-titulos)] text-lg font-bold text-white">
            Valor <span className="vt-degradado">Térmico</span>
          </span>
          <span className="truncate text-[9px] leading-tight text-[#F5C518]">datos ilustrativos</span>
        </div>
        <button type="button" aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"} aria-expanded={menuAbierto} onClick={() => onMenu(!menuAbierto)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-[#0A0A0B]/90 text-lg text-white">
          {menuAbierto ? "✕" : "☰"}
        </button>
        {menuAbierto ? (
          <div className="absolute right-0 top-12 z-40 flex w-64 flex-col gap-2 rounded-[4px] border border-white/15 bg-[#141416] p-3 text-sm shadow-2xl">
            <button type="button" onClick={onSatelite} className="rounded-[3px] border border-white/15 px-3 py-2 text-left text-[#D0D0D4]">
              {satelite ? "🌙 Mapa nocturno" : "🛰 Vista satélite"}
            </button>
            <button type="button" disabled={!lista} onClick={onAuto} className="rounded-[3px] bg-gradient-to-r from-[#FFB000] via-[#FFE14D] to-[#FF5A1F] px-3 py-2 text-left font-semibold text-[#0A0A0B] disabled:opacity-50">
              {auto ? "❚❚ Pausar presentación" : "▶ Presentación automática"}
            </button>
            {!lista ? <p className="text-[10px] text-[#9B9BA1]">Las opciones se activan al llegar a la refinería.</p> : null}
          </div>
        ) : null}
      </div>
      <div className="-mx-3 mt-2 flex snap-x gap-1.5 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{chips}</div>
    </header>
  );
}

export function TarjetaPaso({ paso, total, etapa, titulo, bajada, texto, clave, detalle, onVerMapa, onAnterior }: { paso: number; total: number; etapa: string; titulo: string; bajada: string; texto: string; clave: string; detalle: ReactNode; onVerMapa: () => void; onAnterior: () => void }) {
  return (
    <section key={paso} className={`vt-tarjeta-movil absolute inset-x-2 ${ABAJO_SEGURO} z-20 flex max-h-[80dvh] flex-col rounded-[4px] border border-white/15 bg-[#0A0A0B]/[0.96] shadow-2xl md:hidden`} aria-label={`Paso ${paso + 1} de ${total}`}>
      <div className="min-h-0 overflow-y-auto overscroll-contain p-4 pb-2">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[#FFB000]">
          {etapa} · paso {paso + 1} de {total}
        </p>
        <h2 className="mt-1 text-xl font-bold leading-tight text-white">{titulo}</h2>
        <p className="text-xs text-[#9B9BA1]">{bajada}</p>
        <p className="mt-1.5 text-[13px] leading-snug text-white/90">{texto}</p>
        <p className="mt-2 rounded-[2px] border-l-2 border-[#FFE14D] bg-white/5 px-2 py-1 text-[11px] leading-snug text-[#C8C8CC]">
          <span className="font-semibold text-white">Por qué importa: </span>
          {clave}
        </p>
        {paso === 0 ? <p className="mt-2 text-[11px] leading-snug text-[#3DDC84]">Recorrido guiado de {total} pasos. Toque «Ver en el mapa» para explorar en 3D y «Siguiente» para avanzar.</p> : null}
        <div className="mt-3 border-t border-white/10 pt-3 text-xs">
          <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-[#9B9BA1]">Detalle del paso</p>
          {detalle}
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-white/10 p-3">
        <button type="button" aria-label="Paso anterior" disabled={paso === 0} onClick={onAnterior} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 text-[#9B9BA1] disabled:opacity-30">
          ←
        </button>
        <div className="flex flex-1 justify-center gap-1">
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={`h-1.5 rounded-full ${i === paso ? "w-5 bg-[#FFE14D]" : "w-1.5 bg-white/25"}`} />
          ))}
        </div>
        <button type="button" onClick={onVerMapa} className="h-11 shrink-0 rounded-full bg-[#FFB000] px-4 text-sm font-semibold text-[#0A0A0B]">
          Ver en el mapa ▸
        </button>
      </div>
    </section>
  );
}

export function ControlesMovil({ paso, total, titulo, onInfo, onAnterior, onSiguiente }: { paso: number; total: number; titulo: string; onInfo: () => void; onAnterior: () => void; onSiguiente: () => void }) {
  const ultimo = paso === total - 1;
  return (
    <div className={`absolute inset-x-2 ${ABAJO_SEGURO} z-20 flex items-center gap-2 md:hidden`}>
      <button type="button" onClick={onInfo} className="flex h-12 min-w-0 flex-1 flex-col justify-center rounded-full border border-white/15 bg-[#0A0A0B]/[0.93] px-4 text-left">
        <span className="text-[9px] uppercase tracking-[0.18em] text-[#FFB000]">
          Paso {paso + 1}/{total} · ⓘ ver explicación
        </span>
        <span className="truncate text-sm font-semibold text-white">{titulo}</span>
      </button>
      <button type="button" aria-label="Paso anterior" disabled={paso === 0} onClick={onAnterior} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/15 bg-[#0A0A0B]/[0.93] text-white disabled:opacity-30">
        ←
      </button>
      <button type="button" onClick={onSiguiente} className="h-12 shrink-0 rounded-full bg-[#FFB000] px-5 text-sm font-semibold text-[#0A0A0B] shadow-lg">
        {ultimo ? "↺ Inicio" : "Siguiente →"}
      </button>
    </div>
  );
}
