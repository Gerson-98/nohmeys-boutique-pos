---
target: productos/etiquetas
total_score: 26
p0_count: 0
p1_count: 2
timestamp: 2026-06-16T15-54-06Z
slug: app-root-productos-etiquetas-page-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Spinner, counter badge y sheet count funcionan; search failure silencioso muestra lista vacía sin explicación |
| 2 | Match System / Real World | 3 | "Cola de impresión", voseo, spec "3x8" — natural; "PREVIEW" en inglés en interfaz totalmente en español |
| 3 | User Control and Freedom | 2 | "Limpiar todo" destruye la cola sin confirmación; decrementar a 0 elimina el ítem sin aviso en un solo clic |
| 4 | Consistency and Standards | 2 | title en botones de variante en lugar de aria-label; +/- y trash sin label |
| 5 | Error Prevention | 2 | Doble fetch en mount (race condition); sin error state en búsqueda; "Limpiar todo" sin guardia |
| 6 | Recognition Rather Than Recall | 3 | Queue preview del label es excelente; búsqueda sin thumbnail obliga a recordar productos por nombre |
| 7 | Flexibility and Efficiency of Use | 3 | "+ Todas" es un acelerador real; debounce 250ms; stepper-only frena al experto con cantidades grandes |
| 8 | Aesthetic and Minimalist Design | 3 | Layout limpio; text-[8px] del SKU en el preview está bajo el umbral legible |
| 9 | Error Recovery | 2 | Popup bloqueado toast correcto; fallo de búsqueda lista vacía sin retry; remoción accidental sin undo |
| 10 | Help and Documentation | 3 | Conteo de hojas en footer, preview de label, bloqueador de popup bien explicado |
| **Total** | | **26/40** | **Acceptable — mejoras significativas necesarias** |

## Anti-Patterns Verdict

**LLM assessment:** No hay slop sistémico. Sin gradient text, side-stripe borders ni glassmorphism. La estructura de dos paneles es la solución correcta para este tipo de herramienta. El preview de la etiqueta dentro del panel derecho muestra criterio real de diseño. El único flag visual menor: "PREVIEW" en inglés mayúsculas en una UI completamente en español de Guatemala.

**Deterministic scan:** 3 hallazgos, los 3 son falsos positivos en este contexto:
- single-font (línea 193): Courier New en la plantilla de impresión es elección pragmática válida para labels. Falso positivo.
- em-dash-overuse: los 5 guiones son valores de datos funcionales ('—' como fallback de variante vacía), no texto editorial. Falso positivo.
- numbered-section-markers: provienen de constantes COLUMNAS/FILAS y cálculos de posición en el PDF. Falso positivo.

## Overall Impression

Esta es la página más funcional y cuidada de las critiquadas en esta sesión. El flujo selector→queue→preview→imprimir/PDF es sólido, y el preview inline es un detalle de UX genuinamente útil. Lo que la arrastra son los mismos agujeros estructurales pre-harden (sin error state, icon-only buttons sin label) más dos problemas propios: doble invocación en mount y "Limpiar todo" sin confirmación.

## What's Working

1. Preview en vivo del label — muestra exactamente cómo se verá la etiqueta impresa antes de generar. Elimina la incertidumbre y reduce reimpresos.
2. Doble output: popup print + jsPDF. Cubre el caso "popup bloqueado" con PDF descargable y toast explicativo.
3. "+ Todas" como acelerador — agrega todas las variantes en un clic para sesiones de etiquetado de lote completo.

## Priority Issues

**[P1] cargarProductos sin catch — búsqueda fallida muestra lista vacía indistinguible de "sin productos"**
- Why it matters: Si /api/pos/buscar falla, el try/finally detiene el spinner pero sin catch ni errorCarga state. Lista vacía idéntica visualmente a "no hay productos".
- Fix: Agregar catch con errorCarga state + banner de retry dentro del panel izquierdo.
- Suggested command: $impeccable harden productos/etiquetas

**[P1] Doble fetch en mount — race condition entre dos useEffects**
- Why it matters: useEffect(() => cargarProductos(''), []) dispara inmediatamente, Y el efecto de debounce también dispara 250ms después con busqueda=''. Dos requests paralelos a la misma query; bajo red lenta puede causar que el primer response sobreescriba el segundo.
- Fix: Eliminar useEffect(() => { cargarProductos(''); }, []) completamente — el efecto de debounce ya maneja la carga inicial con busqueda=''.
- Suggested command: $impeccable harden productos/etiquetas

**[P2] "Limpiar todo" sin confirmación — destruye una sesión de etiquetado en un clic**
- Why it matters: 20 ítems seleccionados, cantidades configuradas, un clic accidental en el botón pequeño del header — cola destruida sin undo.
- Fix: Estado confirmandoLimpiar + Dialog de confirmación (mismo patrón que confirmandoDesactivar en usuarios), o guardia inline cuando totalEtiquetas > 5.
- Suggested command: $impeccable harden productos/etiquetas

**[P2] Botones +/-, trash y variantes sin aria-label**
- Why it matters: Todos los botones de acción son icon-only o tienen title (no anunciado por screen readers). VoiceOver dice "button" repetido sin contexto.
- Fix: aria-label descriptivo en cada botón incluyendo el nombre del producto/SKU afectado. Variantes: aria-label con talla+color+nombre del producto.
- Suggested command: $impeccable harden productos/etiquetas

**[P2] Sin thumbnail de producto en el panel de búsqueda**
- Why it matters: El interface Producto ya incluye imagenUrl. Con múltiples "Blusa manga corta" a distintos precios, la distinción por nombre solo es frágil — puede etiquetar el producto equivocado.
- Fix: Agregar img 32x32px con fallback a Package icon en cada fila del panel izquierdo.
- Suggested command: $impeccable harden productos/etiquetas

## Persona Red Flags

**Alex (Power User — operativo de stock):** Quiere ingresar "12" directamente como cantidad. Necesita 11 clics en "+". Sin input numérico directo. Preview siempre muestra primera variante, no la última agregada. "Limpiar todo" sin undo destruye sesiones largas.

**Sam (Accessibility-Dependent):** Barra de búsqueda sin label semántico. Chips de variante no anuncian el producto padre. Botones +/- son "button" repetido. BarcodeCanvas sin aria-label. Botón de "Limpiar todo" no tiene Dialog — dispara directamente sin Escape.

**Carla (project-specific — gestora de stock, Guatemala):** Sin imagen no distingue entre 12 blusas distintas del catálogo. "Limpiar todo" accidental mientras atiende una clienta. SKU text-[8px] ilegible en tablet. Preview no valida el producto visualmente.

## Minor Observations

- text-[8px] del SKU en el preview bajo el umbral mínimo de legibilidad — actualizar a text-[10px].
- "PREVIEW" en inglés — cambiar a "Vista previa" para consistencia de idioma.
- Ambos spinners (generando + búsqueda) faltan motion-reduce:animate-none.
- Decrementar a 0 borra el ítem silenciosamente — deshabilitar el botón - cuando cantidad === 1.
- Sin verificación de rol (no hay /api/auth/me check) — posible acceso no restringido.
- Search icon decorativo sin aria-hidden="true".
