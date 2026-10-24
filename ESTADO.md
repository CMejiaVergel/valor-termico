# ESTADO — innovacion\prototipo-mapa-oportunidades-termicas

> Bitácora para retomar el trabajo con un asistente de IA. Léela al empezar; actualízala al terminar.
> Instrucciones generales: `Desktop\VOLTAC_DEV\AGENTS.md`.

## Resumen
**Calor Rescatado · Mapa de Oportunidades Térmicas**: vitrina guiada de 10 pasos (Next.js 15 estático + Mapbox +
deck.gl) que cuenta el uso del software sobre la Refinería de Cartagena, del problema (calor residual) al impacto.
Rehecha el 2026-10-23 tomando la estructura de la Vitrina de ConfluencIA Hídrica. Datos ilustrativos.

## Estado actual
- Corre en local (`npm run dev`, http://localhost:3200). Typecheck limpio. `next build` exporta `out/` sin errores.
- Sin desplegar. La versión anterior (HTML plano) sigue publicada en https://luis-acosta.github.io/mapa-oportunidades-termicas/
  y su copia está en `referencia/prototipo-v1.html`.
- Sin remoto de git.

## Siguiente paso
1. Revisión del rediseño con Voltac (identidad, ubicación de procesos, textos y cifras; oportunidad protagonista F1 → D4).
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
- 2026-10-23 · Factores ilustrativos: CO₂ 0,20 t/MWh calor (gas natural), 0,14 t/MWh eléctrico; 95 m³ de gas por MWh.

## Bitácora
### 2026-10-24 — Datos alineados con el artefacto del proyecto (Mapa de Oportunidades GIMI, C3)
- Fuente: artefacto consolidado del líder del proyecto (claude.ai/artifact/QAJzcX2i3R85x3CpzRGq8t, revisado el 2026-10-24).
- Horas de operación 8.000 → 8.400 h/año (base del análisis del equipo); electricidad USD 0,224/kWh (antes ≈ 0,11 implícito).
- Meta del reto Ecopetrol en el paso 1: 7 PJ en 4 años (≈ 1,75 PJ/año ≈ 55 MW promedio).
- ESCO: 100 % del CAPEX del proveedor, ahorro verificado con IPMVP, 7–10 años. Incentivos Ley 1715/2099 en el paso 6.
- Efecto: piloto USD 1,68 M/año (retorno 0,7 años); portafolio 15 MW y USD 7,9 M/año; el ORC (F3 → D6) sube a P2.

### 2026-10-24 — Rediseño visual (identidad propia frente a ConfluencIA)
- Pedido de Voltac: las dos vitrinas van al mismo evento; Calor Rescatado debe verse distinta, con el mapa como protagonista,
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
