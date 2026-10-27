"use client";

import { ZONAS } from "@/dominio/escenario";
import { aPx, rutaPx, type Propuesta } from "@/dominio/portafolios";

// Plano de ubicación de una propuesta: recorte de la imagen satelital de la planta
// (1280×900 px de referencia, la misma grilla de PX en escenario.ts) con la sección,
// la fuente, la demanda, la tubería por el rack y el equipo propuesto.
// Sirve en el tablero (tema oscuro) y en el informe (tema claro, sin animación).

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
/** Metros por píxel de la imagen de referencia (1,626e-5° de longitud a 10,31° N). */
const M_POR_PX = 1.626e-5 * 111_320 * Math.cos((10.3135 * Math.PI) / 180);

export function PlanoUbicacion({ p, claro = false, animado = true, alto = 260 }: { p: Propuesta; claro?: boolean; animado?: boolean; alto?: number }) {
  const ruta = rutaPx(p);
  const [fx, fy] = ruta[0]!;
  const [dx, dy] = ruta[ruta.length - 1]!;
  // Encuadre: la ruta con margen, en proporción 16:9.
  const xs = ruta.map((q) => q[0]), ys = ruta.map((q) => q[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const ancho = Math.max(320, Math.max(...xs) - Math.min(...xs) + 220, (Math.max(...ys) - Math.min(...ys) + 160) * (16 / 9));
  const altoV = ancho * (9 / 16);
  const vb = [cx - ancho / 2, cy - altoV / 2, ancho, altoV].map((n) => Math.round(n));
  const k = ancho / 640; // escala de trazos y textos
  const zona = ZONAS.find((z) => z.nombre === p.fuente.zona);
  const poligono = zona?.poligono.map(([lng, lat]) => aPx(lng, lat).join(",")).join(" ");
  // El equipo se ubica junto a la demanda, en el último tramo de la tubería.
  const [ex, ey] = ruta[ruta.length - 2]!;
  const equipo: [number, number] = [ex + (dx - ex) * 0.55, ey + (dy - ey) * 0.55];
  const escala100 = 100 / M_POR_PX;
  const tinta = claro ? "#0A0A0B" : "#EDEDED";
  const caja = claro ? "rgba(255,255,255,0.92)" : "rgba(10,10,11,0.88)";
  const t = (n: number) => n * k;
  const Etiqueta = ({ x, y, texto, sub, color, derecha = false }: { x: number; y: number; texto: string; sub: string; color: string; derecha?: boolean }) => {
    const w = t(Math.max(texto.length, sub.length) * 6.4 + 18);
    const x0 = derecha ? x + t(14) : x - w - t(14);
    return (
      <g>
        <rect x={x0} y={y - t(19)} width={w} height={t(36)} fill={caja} stroke={color} strokeWidth={t(1.2)} />
        <text x={x0 + t(8)} y={y - t(4)} fill={color} fontSize={t(11)} fontWeight={700} fontFamily="JetBrains Mono, monospace">{texto}</text>
        <text x={x0 + t(8)} y={y + t(10)} fill={tinta} fontSize={t(9.5)} fontFamily="IBM Plex Sans, sans-serif">{sub}</text>
      </g>
    );
  };
  return (
    <figure className="m-0">
      <svg viewBox={vb.join(" ")} className="block w-full" style={{ height: alto, background: "#111" }} role="img" aria-label={`Ubicación de ${p.codigo}: ${p.fuente.nombre} hacia ${p.demanda.nombre}`}>
        <image href={`${BASE}/planta/satelite.jpg`} x={0} y={0} width={1280} height={900} preserveAspectRatio="none" style={{ filter: claro ? "grayscale(0.6) brightness(0.95)" : "grayscale(1) brightness(0.55) contrast(1.15)" }} />
        {poligono ? <polygon points={poligono} fill="rgba(255,176,0,0.08)" stroke="#FFB000" strokeWidth={t(1.4)} strokeDasharray={`${t(5)} ${t(4)}`} /> : null}
        {zona ? (
          <text x={aPx(zona.etiqueta.lng, zona.etiqueta.lat)[0]} y={aPx(zona.etiqueta.lng, zona.etiqueta.lat)[1] + t(10)} fill="#FFB000" fontSize={t(10)} fontFamily="JetBrains Mono, monospace" letterSpacing={t(1.5)}>
            {zona.nombre.toUpperCase()}
          </text>
        ) : null}
        {/* Tubería por el rack. */}
        <polyline points={ruta.map((q) => q.join(",")).join(" ")} fill="none" stroke="#0A0A0B" strokeWidth={t(7)} strokeLinejoin="round" opacity={0.6} />
        <polyline points={ruta.map((q) => q.join(",")).join(" ")} fill="none" stroke="#FFE14D" strokeWidth={t(3.5)} strokeLinejoin="round" strokeDasharray={`${t(9)} ${t(6)}`}>
          {animado ? <animate attributeName="stroke-dashoffset" from={t(30)} to="0" dur="0.9s" repeatCount="indefinite" /> : null}
        </polyline>
        {/* Fuente y demanda. */}
        <circle cx={fx} cy={fy} r={t(16)} fill="rgba(255,90,31,0.25)" stroke="#FF5A1F" strokeWidth={t(2)} />
        <circle cx={fx} cy={fy} r={t(4)} fill="#FF5A1F" />
        <circle cx={dx} cy={dy} r={t(16)} fill="rgba(90,200,250,0.22)" stroke="#5AC8FA" strokeWidth={t(2)} />
        <circle cx={dx} cy={dy} r={t(4)} fill="#5AC8FA" />
        {/* Equipo propuesto. */}
        <rect x={equipo[0] - t(9)} y={equipo[1] - t(9)} width={t(18)} height={t(18)} fill="#B98CFF" stroke="#0A0A0B" strokeWidth={t(1.5)} transform={`rotate(45 ${equipo[0]} ${equipo[1]})`} />
        <Etiqueta x={fx} y={fy - t(30)} texto={`▲ ${p.fuente.id} · ${p.fuente.tMax} °C`} sub={`${p.fuente.nombre} · ${p.fuente.ubicacion}`} color="#FF8A3D" derecha={fx < dx ? false : true} />
        <Etiqueta x={dx} y={dy + t(34)} texto={`▼ ${p.demanda.id} · ${p.demanda.rango}`} sub={`${p.demanda.nombre}`} color="#5AC8FA" derecha={dx >= fx} />
        <Etiqueta x={equipo[0]} y={equipo[1] - t(26)} texto={`◆ ${p.tecnologia.nombre}`} sub={`${Math.round(p.distancia)} m de tubería por rack`} color="#B98CFF" derecha />
        {/* Escala y norte. */}
        <g transform={`translate(${vb[0]! + t(16)} ${vb[1]! + vb[3]! - t(16)})`}>
          <rect x={-t(6)} y={-t(22)} width={escala100 + t(56)} height={t(30)} fill={caja} />
          <line x1={0} y1={0} x2={escala100} y2={0} stroke={tinta} strokeWidth={t(2)} />
          <line x1={0} y1={-t(4)} x2={0} y2={t(2)} stroke={tinta} strokeWidth={t(2)} />
          <line x1={escala100} y1={-t(4)} x2={escala100} y2={t(2)} stroke={tinta} strokeWidth={t(2)} />
          <text x={escala100 + t(6)} y={t(3)} fill={tinta} fontSize={t(9)} fontFamily="JetBrains Mono, monospace">100 m</text>
          <text x={0} y={-t(8)} fill={tinta} fontSize={t(9)} fontFamily="JetBrains Mono, monospace">N ↑</text>
        </g>
      </svg>
      <figcaption className={`mt-1 text-[9px] ${claro ? "text-[#6E6E76]" : "text-[#5E5E66]"}`}>Imagen satelital © Mapbox © Maxar. Ubicación de procesos ilustrativa.</figcaption>
    </figure>
  );
}
