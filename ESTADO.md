# ESTADO — innovacion\prototipo-mapa-oportunidades-termicas

> Bitácora para retomar el trabajo con un asistente de IA. Léela al empezar; actualízala al terminar.
> Instrucciones generales: `Desktop\VOLTAC_DEV\AGENTS.md`.

## Resumen
**Valor Térmico · Mapa de Oportunidades Térmicas**: vitrina guiada de 10 pasos (Next.js 15 estático + Mapbox +
deck.gl) que cuenta el servicio (consultoría apoyada en software) sobre la Refinería de Cartagena, del reto (7 PJ)
al portafolio del piloto y sus escenarios de escala.
Rehecha el 2026-10-23 tomando la estructura de la Vitrina de ConfluencIA Hídrica. Datos ilustrativos.

## Estado actual
- Corre en local (`npm run dev`, http://localhost:3200). Typecheck limpio. `next build` exporta `out/` sin errores.
- Sin desplegar. La versión anterior (HTML plano) sigue publicada en https://luis-acosta.github.io/mapa-oportunidades-termicas/
  y su copia está en `referencia/prototipo-v1.html`.
- Sin remoto de git.

## Siguiente paso
1. Revisión de la reestructuración (pasos, piloto de 1 MW, fuentes). Luego corregir guion, escenas y pitch del video.
2. Decidir dónde se despliega (GitHub Pages con `BASE_PATH` o subdominio de Voltac) y crear un token de Mapbox
   restringido por URL a ese dominio.
3. Luego: video motion de 1–2 min y pitch basados en esta vitrina.

## Preguntas para Voltac
- ¿La pantalla de carga lleva los logos de aliados (programa Caribe Innova 2026 / Econova–Ecopetrol) y el aviso
  © de propiedad como en ConfluencIA? Hoy no los lleva porque no está confirmado.
- ¿Se mantiene "Refinería de Cartagena (Reficar)" en pantalla en una versión pública?

## Decisiones tomadas
- 2026-10-23 · Stack igual a la Vitrina de ConfluencIA (Next 15, React 19, TS, Tailwind 4, mapbox-gl 3, deck.gl 9
  intercalado), pero exportado como sitio estático: no hay servidor ni datos privados.
- 2026-10-23 · El mapa térmico usa la capa nativa `heatmap` de Mapbox: la `HeatmapLayer` de deck.gl no dibuja con el
  lienzo compartido (`interleaved: true`).
- 2026-10-23 · Corrección del modelo v1: la potencia útil = min(fuente × eficiencia × rendimiento de la tecnología,
  demanda). El v1 usaba toda la fuente aunque la demanda fuera menor (p. ej. 9,1 MW para una demanda de 2 MW).
- 2026-10-23 · Matriz del portafolio = mitad técnica (temperatura, continuidad, cercanía, facilidad) contra mitad
  económica (potencial, ahorro, retorno, CO₂) del puntaje; los cortes de prioridad son diagonales y coinciden con el color.
- 2026-10-24 · Precios de referencia citados: electricidad USD 228/MWh (Afinia Nivel 4, oct. 2026, 728,67 COP/kWh ÷ TRM
  3.200); calor USD 100/MWh (GNL USD 24,97/MBTU en caldera de 85 %; conservador USD 50); frío = electricidad ÷ COP 5.
  Se descarta el USD 0,224/kWh del artefacto (sin fuente).
- 2026-10-24 · Piloto = una sección elegida por la refinería con meta de calor recuperado (1 MW ≈ 1,7 % de la meta
  anual a 8.400 h). Los proyectos se suman hasta la meta; el último se dimensiona a lo que falta; la prioridad se
  calcula con el potencial completo del par. Intermedio = 5 secciones (supuesto); refinería = 58 MW (∝ 7 PJ).
- 2026-10-24 (tarde) · Marca: **Valor Térmico**, propuesta por **PDI Advanced**. Cobro: por el portafolio, según el alcance de la
  sección analizada (tarifa base por sección + valor por fuente caracterizada); se descarta el % del ahorro estimado porque
  la implementación no depende de nosotros. Paso 10 = escenarios + hoja de ruta del piloto + firmas.
- 2026-10-24 · (reemplazado) Modelo de negocio = cobro por portafolio (% del ahorro anual estimado). CAPEX,
  ESCO, BOOT… son esquemas de financiamiento del proyecto para la refinería.
- 2026-10-23 · Factores ilustrativos: CO₂ 0,20 t/MWh calor (gas natural), 0,14 t/MWh eléctrico; 95 m³ de gas por MWh.

## Bitácora
### 2026-10-27 — Paso 10: tablero del portafolio, gemelo digital e informe PDF
- Paso 10 «Portafolio de la planta»: en escritorio el tablero ocupa la pantalla (mapa de fondo); en celular va en la tarjeta.
- Ejemplo detallado: OT-003, chiller de absorción F1 → D1 (1,93 MW de frío, ≈ USD 0,74 M/año, CAPEX ≈ USD 1,54 M, retorno 2,3 años).
- Gemelo digital 3D (three.js 0.170) genérico de LiBr de simple efecto; pendiente la foto/GIF de referencia del usuario para ajustarlo.
- Informe A4 en `/informe/` (8 hojas, verificado con impresión a PDF); sin valor de la consultoría.
- El cobro por portafolio pasó al «Por qué importa» del paso 8.

### 2026-10-24 (tarde) — Marca Valor Térmico, PDI Advanced, aliados, QR y cobro por alcance
- Cambio de marca en toda la vitrina; logos en `public/marca/` (entrada, barra superior ≥1536 px y paso 10).
- QR de ejemplo con isotipo «VT» en `recursos/qr/` (verificado con lector); falta el enlace definitivo.
- Paso 10: 1 MW según su uso (reúso, frío, electricidad), cobro por alcance y hoja de ruta (lunes 26 oct, meses 1–3, 6–12).

### 2026-10-24 — Reestructuración: consultoría + software, piloto y fuentes citadas
- Pasos nuevos: El reto, Datos de la planta, Compatibilidad, Propuestas de la IA (agente simulado y rotulado),
  Financiamiento del proyecto, Portafolio del piloto (sección + meta), Escenarios de escala (cobro por portafolio).
- `FUENTES_DATOS` + modal «Supuestos y fuentes» (botón en la barra superior y enlaces en los pasos 1, 7 y 10).
- Motor: `precioMWh` por tipo de demanda (reemplaza PRECIO_RELATIVO), `portafolioPiloto`, `SECCIONES_PILOTO`.
- Mapa: contorno ámbar de la sección del piloto en los pasos 8 y 10. Arreglo: avance negativo en la intro.
- Se quitaron afirmaciones sin respaldo («calor ya pagado que nadie mide», reporte mensual con huella).
- Pendiente: corregir guion, escenas y pitch del video; voz v2; nombre de marca.

### 2026-10-24 — Datos alineados con el artefacto del proyecto (Mapa de Oportunidades GIMI, C3)
- Fuente: artefacto consolidado del líder del proyecto (claude.ai/artifact/QAJzcX2i3R85x3CpzRGq8t, revisado el 2026-10-24).
- Horas de operación 8.000 → 8.400 h/año (base del análisis del equipo); electricidad USD 0,224/kWh (antes ≈ 0,11 implícito).
- Meta del reto Ecopetrol en el paso 1: 7 PJ en 4 años (≈ 1,75 PJ/año ≈ 55 MW promedio).
- ESCO: 100 % del CAPEX del proveedor, ahorro verificado con IPMVP, 7–10 años. Incentivos Ley 1715/2099 en el paso 6.
- Efecto: piloto USD 1,68 M/año (retorno 0,7 años); portafolio 15 MW y USD 7,9 M/año; el ORC (F3 → D6) sube a P2.

### 2026-10-24 — Rediseño visual (identidad propia frente a ConfluencIA)
- Pedido de Voltac: las dos vitrinas van al mismo evento; Valor Térmico debe verse distinta, con el mapa como protagonista,
  los puntos dentro de las secciones reales de la planta y la conexión como tubería recta por la planta (no arcos).
- Dirección elegida: termografía industrial. Satélite `satellite-v9` en gris, calor ironbow, retículas con °C, rótulos de
  sección, racks y tuberías ortogonales (haz por carriles en el cruce), sin columnas 3D, sin vuelo desde el planeta (intro de
  calibración con barrido), HUD: barra superior, visor del paso, lecturas, escala de temperatura, ficha plegable, línea de tiempo.
- Ubicaciones redibujadas sobre la imagen satelital de referencia (`PX()`); D7 pasa de "terminal marítimo" (fuera de la
  planta) a "Climatización de laboratorio". El criterio C4 usa la longitud de tubería por rack (≤600 m cumple, ≤1.300 condición).
- Paso 6 = cómo paga la refinería: flujo de caja acumulado por modelo, inversión de cada parte y reparto del ahorro.
- Tipografía: JetBrains Mono (titulares/HUD) + IBM Plex; se retiró Fraunces.

### 2026-10-23 — Vitrina guiada v2
- Proyecto nuevo en esta carpeta; el HTML v1 y la guía PDF pasan a `referencia/`.
- 10 pasos en 5 etapas (problema → diagnóstico → estructuración → decisión → ejecución), indicadores progresivos,
  panel interactivo por paso (paleta térmica, celda del cruce, tecnología, modelo, supuestos, portafolio), presentación
  automática y vista móvil.
- `next dev` usa `.next-dev` y `next build` usa `.next` y exporta a `out/`: se pueden correr a la vez. `vitrina-estatica` en launch.json sirve `out/` en el puerto 3201.
