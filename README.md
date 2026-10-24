# Calor Rescatado · Mapa de Oportunidades Térmicas (vitrina guiada)

Prototipo interactivo que explica, en 10 pasos guiados, cómo el software convierte el calor residual de la
Refinería de Cartagena en un portafolio de proyectos medibles, priorizados y financiables.
Las cifras son **ilustrativas** (salen del prototipo v1 y su guía de uso) y cada una declara su origen.

La estructura (pantalla de carga con precarga real, vuelo desde el planeta, recorrido por pasos con narración,
indicadores progresivos, panel contextual, presentación automática y experiencia móvil) se tomó de la Vitrina
de **ConfluencIA Hídrica** (`innovacion/confluencia-hidrica`, `docs/19`).

## Recorrido

| Etapa | Paso | Qué muestra |
|---|---|---|
| El problema | 1 · Calor que se pierde | Columnas por potencia, plumas de calor, 78 MWt ≈ 624 GWh/año |
| Diagnóstico | 2 · Inventario térmico | 8 fuentes y 7 demandas con temperatura, potencia, continuidad y origen del dato |
| | 3 · Mapa térmico | Termografía de la planta (paleta e intensidad ajustables) |
| | 4 · Cruce fuente–demanda | 56 pares × 5 criterios (C1–C5), matriz 8×7, arcos por estado |
| Estructuración | 5 · Tecnología | Ajuste de cada tecnología al salto de temperatura del par |
| | 6 · Modelo de negocio | Beneficio neto de la refinería a 5 años en 7 modelos |
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
- `src/componentes/mapa/MapaTermico.tsx` — Mapbox (satélite/nocturno) + deck.gl intercalado; mapa térmico nativo de Mapbox.
- `src/componentes/Vitrina.tsx` — orquesta pasos, indicadores, narración, paneles y celular.
- `src/componentes/paneles.tsx`, `graficos.tsx`, `ui.tsx`, `PantallaCarga.tsx`, `Movil.tsx`.
- `referencia/` — prototipo v1 (HTML) y guía de uso en PDF.
