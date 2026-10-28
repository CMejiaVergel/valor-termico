// Datos de contacto de PDI Advanced (trazabilidad de la empresa): se muestran en la
// pantalla de carga de la vitrina y en la portada y el cierre del informe.

export const CONTACTO = {
  autor: "M.Sc. Luis Acosta",
  cargo: "Director de Proyectos de Ingeniería",
  empresa: "PDI Advanced",
  correo: "lacosta@pdiadvanced.com",
  whatsapp: "+57 315 760 6442",
  enlaceWhatsapp: "https://wa.me/573157606442",
} as const;

export function IconoCorreo({ className = "", color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 6.5 8.5 6.5 8.5-6.5" />
    </svg>
  );
}

/** Glifo de WhatsApp (Simple Icons, CC0). */
export function IconoWhatsApp({ className = "", color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill={color} aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

/** Correo y WhatsApp como enlaces, con su ícono. `claro`: sobre fondo blanco (informe). */
export function EnlacesContacto({ claro = false, className = "" }: { claro?: boolean; className?: string }) {
  const tinta = claro ? "text-[#2A2A30] hover:text-[#B45309]" : "text-[#C8C8CC] hover:text-white";
  const icono = claro ? "#B45309" : "#FFB000";
  return (
    <span className={`flex flex-wrap items-center gap-x-4 gap-y-1 ${className}`}>
      <a href={`mailto:${CONTACTO.correo}`} className={`inline-flex items-center gap-1.5 ${tinta}`}>
        <IconoCorreo className="h-[1.15em] w-[1.15em] shrink-0" color={icono} />
        {CONTACTO.correo}
      </a>
      <a href={CONTACTO.enlaceWhatsapp} target="_blank" rel="noopener" className={`inline-flex items-center gap-1.5 ${tinta}`}>
        <IconoWhatsApp className="h-[1.05em] w-[1.05em] shrink-0" color={claro ? "#1F9D55" : "#3DDC84"} />
        <span className="cifra-tabular">{CONTACTO.whatsapp}</span>
      </a>
    </span>
  );
}
