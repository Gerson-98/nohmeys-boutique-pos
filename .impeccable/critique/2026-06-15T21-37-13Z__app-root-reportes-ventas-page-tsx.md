---
target: app/(root)/reportes/ventas/page.tsx
total_score: 21
p0_count: 0
p1_count: 1
timestamp: 2026-06-15T21-37-13Z
slug: app-root-reportes-ventas-page-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 1 | Gold spinner on list load; `cargar()` no catch → network failure looks identical to empty results |
| 2 | Match System / Real World | 2 | Good Spanish; "Buscar" button implies manual trigger but filtering auto-loads; "Anular" misleads then explains |
| 3 | User Control and Freedom | 2 | No "Limpiar filtros"; no date quick-select; "Buscar" button creates an ambiguous manual-vs-auto UX |
| 4 | Consistency and Standards | 2 | Same three patterns fixed in devoluciones harden (spinner, text-[10px], no catch) appear here unpatched |
| 5 | Error Prevention | 3 | AlertDialog before anulación explains the two-step flow; Excel export guards on empty result set |
| 6 | Recognition Rather Than Recall | 3 | Estado badges + METODO_LABEL; accordion shows full item detail; paginator shows count + pages |
| 7 | Flexibility and Efficiency | 2 | Excel export genuine accelerator; auto-load on filter change is fast; no date quick-select buttons |
| 8 | Aesthetic and Minimalist Design | 3 | Clean accordion density; KPI strip minimal; "Anular" danger element weighted correctly |
| 9 | Error Recovery | 1 | `cargar()` try/finally with no catch — failed fetch silently renders empty state with no retry |
| 10 | Help and Documentation | 2 | AlertDialog copy is informative; empty state "Sin ventas" ambiguous between no-data and API error |
| **Total** | | **21/40** | **Poor — structurally sound but same unhardened error-handling patterns as pre-harden devoluciones** |

## Priority Issues

**[P1] `cargar()` no catch — API failure silently shows empty state**
- **Why it matters**: `cargar()` (lines 98-116) follows the `try { ... } finally { setCargando(false) }` pattern with no `catch`. A failed `/api/reportes/ventas` call — 500, network blip, expired session — sets `ventas: []` and renders "Sin ventas para este período." A supervisor checking yesterday's sales after a brief network hiccup sees an empty list with no indication of failure and no retry button. This is structurally identical to the P1 fixed in `devoluciones/page.tsx` in the last harden pass.
- **Fix**: Add `errorLista` state; catch sets it with a toast and `setErrorLista(true)`; clear on success. Add a three-state render: skeleton → error card (AlertTriangle + "No pudimos cargar las ventas" + Reintentar) → empty / list.
- **Suggested command**: `$impeccable harden ventas`

**[P2] Gold spinner on list load — inconsistent with established skeleton pattern**
- **Why it matters**: Lines 263-265 show the same gold `border-[#C9A84C] animate-spin` spinner removed from `CategoriasModal`, `ProductModal`, and `devoluciones/page.tsx` during previous harden/polish passes. The established pattern for list-area loading is blush `animate-pulse` skeleton rows that mirror the real item geometry. The ventas list rows have a fixed structure (ticket + badge + method + name/client on left, amount + date on right) that maps cleanly to a skeleton layout.
- **Fix**: Replace the spinner with 6–8 skeleton rows of `card-boutique overflow-hidden animate-pulse` matching the real row geometry — a left cluster (small rect for ticket, pill for badge, two rects for meta) and a right cluster (amount rect + date rect).

**[P2] `text-[10px]` cluster — three in filter labels, two in row header**
- **Why it matters**: Five instances in this file combine 10px text with `text-[#9E9E9E]` (~2.5:1 contrast on `#FAFAFA`), all on information-bearing elements:
  - Filter labels "Desde" / "Hasta" / "Método de pago" (lines 227, 231, 235)
  - Estado badge in row header (line 287): `text-[10px] font-medium`
  - Timestamp in row header (line 294): `text-[10px] text-[#9E9E9E]`
  The timestamp in particular is regularly used for time-of-day reconciliation by cashiers.
- **Fix**: `text-[10px]` → `text-xs` across all five instances. The estado badge already has `font-medium` so it reads well at 12px.

**[P2] "Buscar" button creates a manual-vs-auto ambiguity**
- **Why it matters**: The filter card has date inputs, a method select, and a "Buscar" button (line 240). But `useEffect(() => { cargar(1); setPagina(1); }, [desde, hasta, metodo])` already fires on every filter change — clicking "Buscar" just re-runs the same query that already ran. A supervisor who changes the date range and then clicks "Buscar" gets a second identical fetch; one who changes the range and waits a beat gets the right data without clicking. The button teaches the wrong mental model ("I must click Buscar to filter") and may cause confusion when the data loads before they click it.
- **Fix**: Remove the "Buscar" button. The auto-load pattern is already correct; the button is dead weight that adds noise and teaches a false dependency.

**[P3] No date quick-select buttons ("Hoy", "Esta semana", "Este mes")**
- **Why it matters**: The most common reporting patterns for a boutique are "what did we sell today?", "this week?", and "this month?" — but supervisors must manually set both `desde` and `hasta` date inputs for each. Given the Excel export use case (the page's main power-user feature), frequent range switching makes this a real friction point.
- **Fix**: Add three ghost-pill buttons above or beside the date inputs: "Hoy" / "Esta semana" / "Este mes" that set `[desde, hasta]` via `useState`. These are common enough to warrant quick access.

**[P3] No "Limpiar filtros" / reset to today shortcut**
- **Why it matters**: Once the user narrows to a custom date range, there is no quick way back to the default view (today). They must manually re-enter today's date in both inputs. The `devoluciones` page has "Limpiar filtros" (added in the polish pass); the `ventas` page does not, despite having more filter fields.
- **Fix**: Show a "Limpiar filtros" link when any filter diverges from the default (today/today, all methods), that resets all three fields.

**[P3] "Anular venta" navigates away, losing list state**
- **Why it matters**: `irAAnular()` calls `router.push('/reportes/devoluciones?anular=...')` (line 123), which navigates the user to a different page. When they return, the ventas list resets to page 1 of today's range — the expanded row, the page number, and the filter state are all gone. For a daily operation ("find sale, anular, come back and verify it shows ANULADA"), this requires re-filtering twice.
- **Fix**: After the devolución flow completes, `router.back()` or `router.push('/reportes/ventas?...')` with the current filter state re-encoded as query params would restore position. Alternatively, open the devolución modal in-page rather than navigating away (more complex but best UX). At minimum, after the return, refresh the ventas list automatically.

**[P3] `cargar` useCallback depends on `pagina` but the effect triggers independently**
- **Why it matters**: `cargar` is defined with `[desde, hasta, metodo, pagina]` as useCallback deps (line 116). The useEffect (line 118) has `[desde, hasta, metodo]` — it includes the stable dep values but not `pagina`. This means when `pagina` changes (via `cambiarPagina`), `cargar` re-creates with the new value, but since the effect doesn't depend on `cargar`, the linter would flag a missing dep. The manual `cambiarPagina(nueva)` call works around this, but the pattern is fragile — if `pagina` ever changed via other means, the list wouldn't refresh.
- **Fix**: Remove `pagina` from `cargar`'s useCallback deps (instead pass it as an argument, which it already does via `pag = pagina`). This is the cleaner approach used in `devoluciones` where `pagina` is a pure argument.

## What's Working

1. **Accordion expand/collapse** (lines 281-356) — each sale is a button that toggles a detail panel. The item detail renders product name, variant (talla/color), quantity, subtotal, global discount if any, a payment breakdown, and the "Anular venta" trigger — all in one place. The approach eliminates the need for a drill-through page for basic reconciliation.
2. **Excel export** (lines 131-192) — properly builds a named workbook with the shop's `nombreComercial` in the header, dynamic filename with today's date, `exportar=true` flag that triggers a full (non-paginated) fetch. Guards on empty result with an informative toast. Loading state on the button is correct (in-button spinner, disabled during fetch).
3. **AlertDialog for anulación** (lines 401-418) — the description copies the exact expected behavior: "Se abrirá el formulario de devolución para el ticket TKT-001 con todos los productos disponibles preseleccionados." A supervisor unfamiliar with the two-step flow understands exactly what will happen before proceeding.
4. **Paginator with numbered buttons** (lines 376-388) — window of up to 5 page numbers centered on the current page, with prev/next arrows and a "X ventas · página N de M" summary. Significantly better than the prev/next-only pattern in devoluciones.
5. **`METODO_LABEL` display mapping** — raw enum values (`EFECTIVO`, `TARJETA`, `VALE_CREDITO`) are never shown to the user; all render through a human-readable mapping. `VALE_CREDITO → 'Vale'` is slightly abbreviated but unambiguous in context.

## Persona Red Flags

**Sam (Accessibility-Dependent)**:
- Five `text-[10px]` instances (filter labels, estado badge, timestamp) — 2.5:1 contrast at 10px.
- The expand/collapse button (line 281) has no `aria-expanded` attribute — screen readers can't announce the expand state.
- The SVG chevron (line 295) has no `aria-hidden="true"` — it's decorative but announces as an unlabeled graphic.

**Jordan (First-Timer)**:
- "Buscar" button suggests a manual search flow — a first-timer may change the date range and wait for the list to update, then see it already updated, then wonder why the button exists.
- Network failure shows "Sin ventas para este período" — a first-timer trying to learn the reporting flow may assume there genuinely are no sales.
- "Anular venta" sounds like permanent deletion — the AlertDialog explanation helps, but the label alone causes a moment of hesitation.

**Alex (Daily Power User)**:
- No "Hoy" / "Esta semana" / "Este mes" quick-select — Alex changes date ranges several times a day.
- "Anular venta" navigates away and resets the list — Alex has to re-filter after each anulación.
- No way to search by customer name or ticket number without scrolling through the paginated list.
