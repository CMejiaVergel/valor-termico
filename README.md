# Calor Rescatado · Mapa de Oportunidades Térmicas (vitrina guiada)

Prototipo interactivo que explica, en 10 pasos guiados, cómo el software convierte el calor residual de la
Refinería de Cartagena en un portafolio de proyectos medibles, priorizados y financiables.
Las cifras son **ilustrativas** (salen del prototipo v1 y su guía de uso) y cada una declara su origen.

La mecánica (recorrido guiado, motor, presentación automática, celular) viene de la Vitrina de ConfluencIA Hídrica,
pero la identidad visual es **propia y distinta** porque ambas se presentan en el mismo evento: cámara termográfica
(satélite en gris, calor en falso color ironbow, retículas con lectura de temperatura, tuberías ortogonales por los
racks de la planta, HUD con línea de tiempo abajo, ficha técnica plegable y entrada de "calibración del sensor").
Fuentes, demandas y secciones se ubican sobre la imagen satelital real de la refinería (`PX()` en `escenario.ts`).

## Recorrido

| Etapa | Paso | Qué muestra |
|---|---|---|
| El problema | 1 · Calor que se pierde | Termografía de la planta con emisión de cada fuente, 78 MWt ≈ 624 GWh/año |
| Diagnóstico | 2 · Inventario térmico | 8 fuentes y 7 demandas con temperatura, potencia, continuidad y origen del dato |
| | 3 · Mapa térmico | Termografía de la planta (paleta e intensidad ajustables) |
| | 4 · Cruce fuente–demanda | 56 pares × 5 criterios (C1–C5), matriz 8×7, haz de tuberías por los racks |
| Estructuración | 5 · Tecnología | Ajuste de cada tecnología al salto de temperatura del par |
| | 6 · Modelo de negocio | Cómo paga la refinería: flujo de caja acumulado año a año en 7 modelos, quién invierte y qué parte del ahorro conserva |
| Decisión | 7 · Evaluación | 8 indicadores, radar de 8 criterios, riesgo, prioridad y supuestos ajustables |
| | 8 · Portafolio priorizado | Matriz técnica × económica con franjas de prioridad y ranking |
| Ejecución | 9 · Piloto y monitoreo | Sensórica clamp-on en vivo (simulada) y conciliación |
| | 10 · Impacto | Reporte mensual con huella SHA-256, totales del portafolio y hoja de ruta |

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

- `src/dominio/escenario.ts` — fuentes, demandas, tecnologías, modelos de negocio, supuestos y los 10 pasos.
- `src/dominio/motor.ts` — cruce (C1–C5), ajuste de tecnología, evaluación (8 criterios ponderados) y portafolio.
- `src/componentes/mapa/MapaTermico.tsx` — Mapbox `satellite-v9` en gris + mapa térmico nativo + deck.gl intercalado (tuberías, flujo, emisión, sensores).
- `src/componentes/IntroTermica.tsx` — entrada de calibración con barrido de escaneo.
- `src/componentes/Vitrina.tsx` — orquesta pasos, indicadores, narración, paneles y celular.
- `src/componentes/paneles.tsx`, `graficos.tsx`, `ui.tsx`, `Movil.tsx`.
- `referencia/` — prototipo v1 (HTML) y guía de uso en PDF.
