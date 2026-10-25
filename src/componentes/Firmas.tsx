// Firmas de la vitrina: PDI Advanced (empresa que propone la solución) y los aliados
// del programa. Los logos de aliados son pequeños en origen: se muestran a su tamaño
// o menor para que no pierdan nitidez.

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const ruta = (archivo: string) => `${BASE}/marca/${archivo}`;

export const ALIADOS = [
  { archivo: "aliados/camara-comercio-cartagena.png", nombre: "Cámara de Comercio de Cartagena", alto: 34 },
  { archivo: "aliados/econova.png", nombre: "Econova · Grupo Ecopetrol", alto: 18 },
  { archivo: "aliados/gimi.png", nombre: "GIMI Institute", alto: 26 },
  { archivo: "aliados/ixl-center.png", nombre: "IXL Center", alto: 18 },
];

/** «Una solución de PDI Advanced» y la fila de aliados. */
export function Firmas({ compacta = false }: { compacta?: boolean }) {
  const escala = compacta ? 0.8 : 1;
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-3">
        <span className="hud text-[9px] text-[#5E5E66]">Una solución de</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ruta("pdi-advanced-oscuro.png")} alt="PDI Advanced" style={{ height: 36 * escala }} className="w-auto" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <span className="hud text-[9px] text-[#5E5E66]">Aliados</span>
        <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {ALIADOS.map((a) => (
            <li key={a.archivo}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ruta(a.archivo)} alt={a.nombre} title={a.nombre} style={{ height: a.alto * escala }} className="w-auto opacity-80" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
