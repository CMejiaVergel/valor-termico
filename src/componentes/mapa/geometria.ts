// Geometría del mapa 3D (copiada de ConfluencIA Hídrica): desplazamientos en
// metros, arcos 3D entre plantas y posiciones ilustrativas deterministas.

export type Punto3D = [number, number, number];

const M_POR_GRADO = 111_320;

/** Número en [0, 1) estable para una cadena (FNV-1a). */
export function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}

export function desplazar(lng: number, lat: number, metros: number, angulo: number): [number, number] {
  return [lng + (Math.cos(angulo) * metros) / (M_POR_GRADO * Math.cos((lat * Math.PI) / 180)), lat + (Math.sin(angulo) * metros) / M_POR_GRADO];
}

export function distanciaM(a: { lng: number; lat: number }, b: { lng: number; lat: number }): number {
  const dx = (a.lng - b.lng) * M_POR_GRADO * Math.cos((a.lat * Math.PI) / 180);
  const dy = (a.lat - b.lat) * M_POR_GRADO;
  return Math.hypot(dx, dy);
}

export function caminoArco(a: { lng: number; lat: number }, b: { lng: number; lat: number }, n = 64): Punto3D[] {
  const alto = Math.min(650, 0.32 * distanciaM(a, b) + 80);
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    return [a.lng + (b.lng - a.lng) * t, a.lat + (b.lat - a.lat) * t, alto * Math.sin(Math.PI * t)];
  });
}

export function enCamino(c: Punto3D[], f: number): Punto3D {
  const x = Math.max(0, Math.min(0.9999, f)) * (c.length - 1);
  const i = Math.floor(x);
  const r = x - i;
  const p = c[i]!;
  const q = c[i + 1] ?? p;
  return [p[0] + (q[0] - p[0]) * r, p[1] + (q[1] - p[1]) * r, p[2] + (q[2] - p[2]) * r];
}

export function circulo(centro: [number, number], radio: number, n = 96): Punto3D[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const [lng, lat] = desplazar(centro[0], centro[1], radio, (i / n) * Math.PI * 2);
    return [lng, lat, 2];
  });
}

/** Radio ilustrativo (m) de cada rango de distancia de docs/06 C6. */
export const RADIO_RANGO: Record<string, number> = { "≤2 km": 1300, "2–5 km": 3200, "5–15 km": 9000, ">15 km": 17000 };
