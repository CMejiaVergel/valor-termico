# Valor Térmico · Mapa de Oportunidades Térmicas (vitrina guiada)

Prototipo interactivo que explica, en 10 pasos guiados, el servicio de Valor Térmico: consultoría especializada
apoyada en software. La refinería entrega sus datos térmicos (fuentes con calor sobrante y consumidores potenciales),
la plataforma los consolida en el mapa, un motor evalúa la compatibilidad y un agente de IA (simulado) propone
proyectos de uso con indicadores estimados. El entregable es un portafolio documentado que los ingenieros de la
refinería aprueban. Modelo de negocio: **cobramos por el portafolio, según el alcance de la sección analizada** (tarifa base por sección + valor por fuente de calor caracterizada). La solución la propone **PDI Advanced**.

Las fuentes, demandas y tecnologías son **ilustrativas**. Los precios de energía salen de fuentes publicadas
(Afinia, XM, gas importado) y cada supuesto se declara en la sección «Supuestos y fuentes» (`FUENTES_DATOS`).

La mecánica (recorrido guiado, motor, presentación automática, celular) viene de la Vitrina de ConfluencIA Hídrica,
pero la identidad visual es **propia y distinta** porque ambas se presentan en el mismo evento: cámara termográfica
(satélite en gris, calor en falso color ironbow, retículas con lectura de temperatura, tuberías ortogonales por los
racks de la planta, HUD con línea de tiempo abajo, ficha técnica plegable y entrada de "calibración del sensor").
Fuentes, demandas y secciones se ubican sobre la imagen satelital real de la refinería (`PX()` en `escenario.ts`).

## Recorrido

| Etapa | Paso | Qué muestra |
|---|---|---|
| El reto | 1 · El reto | Meta de la refinería (7 PJ en 4 años ≈ 58 MW) y la unidad del piloto: 1 MW recuperado ≈ 1,7 % de la meta anual |
| Diagnóstico | 2 · Datos de la planta | Datos que entrega la refinería (confidenciales); inventario ilustrativo de 8 fuentes y 7 demandas |
| | 3 · Mapa térmico | Termografía de la planta (paleta e intensidad ajustables) |
| | 4 · Compatibilidad | 56 pares × 5 criterios (C1–C5), matriz 8×7, haz de tuberías por los racks |
| Estructuración | 5 · Propuestas de la IA | Agente simulado que propone proyectos de uso (reúso, frío, electricidad) con indicadores estimados |
| | 6 · Financiamiento del proyecto | Esquemas con que la refinería podría financiar el proyecto (CAPEX, ESCO, BOOT…); no es nuestro modelo de negocio |
| Decisión | 7 · Evaluación | Indicadores estimados, radar de 8 criterios, riesgo, prioridad y supuestos con valores citados |
| | 8 · Portafolio del piloto | Sección elegida por la refinería y meta (1 MW por defecto); los proyectos suman la meta |
| Ejecución | 9 · Piloto y monitoreo | Sensórica clamp-on en vivo (simulada) y conciliación IPMVP |
| | 10 · Escenarios y hoja de ruta | Piloto, intermedio (5 secciones, supuesto) y refinería completa (∝ 7 PJ); 1 MW según su uso; cobro por portafolio; hoja de ruta (antes del lunes, meses 1–3, meses 6–12); PDI Advanced y aliados |

## Marca y recursos

- `public/marca/`: logo Valor Térmico (recorte del original `Logo Valor Térmico.jpg`), PDI Advanced y aliados (Cámara de Comercio de Cartagena, Econova · Grupo Ecopetrol, GIMI Institute, IXL Center). Los logos de aliados son pequeños en origen: no se amplían.
- `recursos/qr/generar.mjs`: isotipo «VT» y QR con el logo (corrección H). Hoy apunta a una URL de ejemplo; con el enlace definitivo: `node generar.mjs --url https://…` (desde `recursos/qr/`).

## Cómo correrlo

```bash
npm install
cp .env.example .env.local   # y poner el token público de Mapbox (pk.…)
npm run dev                  # http://localhost:3200
```

Sitio estático: `npm run build` deja todo en `out/` (`npm start` lo sirve en el puerto 3200).
Para una subruta (p. ej. GitHub Pages): `BASE_PATH=/mapa-oportunidades-termicas npm run build`.
En producción el token de Mapbox debe estar **restringido por URL** al dominio publicado.

## Estructura

- `src/dominio/escenario.ts` — fuentes, demandas, tecnologías, esquemas de financiamiento, supuestos con sus fuentes y los 10 pasos.
- `src/dominio/motor.ts` — cruce (C1–C5), ajuste de tecnología, evaluación (8 criterios ponderados) y portafolio.
- `src/componentes/mapa/MapaTermico.tsx` — Mapbox `satellite-v9` en gris + mapa térmico nativo + deck.gl intercalado (tuberías, flujo, emisión, sensores).
- `src/componentes/IntroTermica.tsx` — entrada de calibración con barrido de escaneo.
- `src/componentes/Vitrina.tsx` — orquesta pasos, indicadores, narración, paneles y celular.
- `src/componentes/paneles.tsx`, `graficos.tsx`, `ui.tsx`, `Movil.tsx`.
- `referencia/` — prototipo v1 (HTML) y guía de uso en PDF.
