---
target: app/(root)/inventario/ajustes/page.tsx
total_score: 24
p0_count: 0
p1_count: 1
timestamp: 2026-06-16T04-24-17Z
slug: app-root-inventario-ajustes-page-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 1 | Gold spinner on list load; `cargarAjustes()` no catch → API failure shows "Sin ajustes registrados"; variant search no catch → stale results persist after a failed fetch |
| 2 | Match System / Real World | 3 | Strong domain language; green/red arrow icons for ENTRADA/SALIDA; motivo placeholder is the best in the codebase |
| 3 | User Control and Freedom | 3 | Deselect variant (✕), Cancelar modal, RefreshCw on list — solid escape paths |
| 4 | Consistency and Standards | 2 | `catch (err: any)` in `guardar()`; `text-[10px]` on timestamp; gold spinner; variant search no catch (stale state bug) |
| 5 | Error Prevention | 3 | Guards on submit (`!varianteSeleccionada`, `!motivo.trim()`, `!cajero`); `min={1}` on cantidad; no SALIDA cap vs current stock |
| 6 | Recognition Rather Than Recall | 3 | +/- prefix + color in list; current stock shown in variant card and dropdown; ENTRADA/SALIDA toggle with icons |
| 7 | Flexibility and Efficiency | 2 | Hard `limite=60` with no pagination or list search; `RefreshCw` present but no shortcut |
| 8 | Aesthetic and Minimalist Design | 3 | Clean divide-y list; gold spinner the only violation; empty state minimal |
| 9 | Error Recovery | 1 | `cargarAjustes()` no catch → wrong UI state on failure; variant search failure leaves stale results from prior query |
| 10 | Help and Documentation | 3 | Motivo placeholder ("Mercadería nueva de proveedor, prenda dañada") is exemplary; stock display in picker is essential context |
| **Total** | | **24/40** | **Acceptable — strong modal and guard patterns, blocked by the same no-catch cargar P1 as all prior modules** |

## Priority Issues

**[P1] `cargarAjustes()` no catch — API failure shows "Sin ajustes registrados"**
- **Why it matters**: `cargarAjustes()` (lines 50-59) uses `try { setAjustes(d.data ?? []) } finally { setCargando(false) }` with no catch. A failed `/api/inventario/ajustes` call leaves `ajustes: []` and renders the empty state: "Sin ajustes registrados." — as if no inventory movements have ever happened. A store manager checking the log after a supplier delivery sees an empty list with no indication of failure and no retry path. Structurally identical to the P1 fixed in `devoluciones`, `ventas`, `caja`, and `clientes`.
- **Fix**: Add `errorLista` state. On catch, set it with `toast.error` + `setErrorLista(true)`. Clear on next attempt. Render three states: skeleton → error card (AlertTriangle + "No pudimos cargar los ajustes" + Reintentar) → empty / list.
- **Suggested command**: `$impeccable harden inventario/ajustes`

**[P2] Gold spinner on list load (line 140)**
- **Why it matters**: `w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin` — the banned pattern removed from every prior module. The ajustes list has a well-defined row geometry (icon circle + product name/meta + quantity/timestamp on right) that maps cleanly to a skeleton layout.
- **Fix**: Replace with 6–8 blush `animate-pulse` skeleton rows matching the actual row structure: circle stub (w-8 h-8 rounded-full) + two text-line stubs on the left + amount stub + timestamp stub on the right.

**[P2] Variant search: no catch — stale results persist after failed fetch**
- **Why it matters**: The variant search `useEffect` (lines 63-83) has `try { setVariantes(vs) } finally { setBuscandoVariante(false) }` with no catch. If the `/api/pos/buscar` fetch fails mid-search, `setVariantes(vs)` is never called — `variantes` stays at whatever was loaded from the previous query. "Buscando..." disappears and the user sees the previous search's results labeled as if they match the new query. They may select the wrong variant without realizing the search failed. Compounding this: the error is completely silent — no toast, no inline error message.
- **Fix**: Add `errorBusquedaVariante` state. In the catch block: `setVariantes([]); setErrorBusquedaVariante(true)`. Clear on next keypress. Render an inline `"Error al buscar — intenta de nuevo"` message beneath the input when the flag is set.

**[P2] `catch (err: any)` in `guardar()` (line 113)**
- **Why it matters**: `catch (err: any) { toast.error(err.message) }` — if the caught value is not an Error instance, `err.message` is `undefined` and the toast shows "Error: undefined". Established pattern is `catch (e: unknown)` + `e instanceof Error ? e.message : 'Error desconocido'`.
- **Fix**: `catch (err: any)` → `catch (e: unknown)` with narrowing.

**[P2] `text-[10px]` on timestamp in list rows (line 173)**
- **Why it matters**: `text-[10px] text-[#9E9E9E]` on the `dd/MM HH:mm` timestamp — the same 2.5:1 contrast violation fixed in every prior module. Timestamps in the ajustes log are used for reconciliation with supplier receipts and shift closings.
- **Fix**: `text-[10px]` → `text-xs text-[#757575]` (info-bearing, needs the stronger `#757575`).

**[P3] No post-adjustment stock preview ("Stock después: X")**
- **Why it matters**: When a variant is selected and a quantity entered, the card shows "Stock: X" (current). For SALIDA, there's no indication of whether the adjustment would produce negative stock — the user has to do mental arithmetic. A cashier who enters a SALIDA of 10 on a product with stock 3 will only discover the problem after submitting (if the API enforces it) or after the fact (if it doesn't). Showing a live "Stock después del ajuste: X" line beneath the quantity input would make the consequence visible before confirming.
- **Fix**: Compute `stockDespues = varianteSeleccionada.stockActual + (tipo === 'ENTRADA' ? cantidad : -cantidad)` and render a `text-xs` line in the selected variant card: `"Stock después: {stockDespues}"` colored red when `< 0`.

**[P3] Hard `limite=60` with no list search or pagination**
- **Why it matters**: Line 53: `fetch('/api/inventario/ajustes?limite=60')`. A busy boutique with multiple daily supplier deliveries and manual corrections will exceed 60 in days. The 61st adjustment silently disappears. The `RefreshCw` button re-fetches the same 60; there is no way to page backward.
- **Fix**: Either raise the limit significantly (200+) or add a simple date-range filter to narrow the visible window. A "Desde" date input on the list header would cover the most common use case ("show me today's adjustments").

**[P3] Variant search: `setBuscandoVariante(true)` fires before the timeout, not inside it**
- **Why it matters**: Line 65: `setBuscandoVariante(true)` is called immediately in the `useEffect` body, before the 300ms timeout fires. This means "Buscando..." appears for 300ms before any fetch begins. If the user types quickly and the previous timeout is cleared by the cleanup function, `setBuscandoVariante` remains `true` even though no fetch is in flight — the "Buscando..." indicator is a lie for those 300ms.
- **Fix**: Move `setBuscandoVariante(true)` inside the `setTimeout` callback, before the `fetch` call. The indicator then only appears when a request actually fires.

## What's Working

1. **Modal uses `<Dialog>` correctly** — `Dialog` with `onOpenChange={(v) => !v && setModalOpen(false)}` provides focus trap, Esc, aria-dialog, scroll lock. No raw DIV overlay.
2. **Submit guards are complete** (lines 97-99) — `!varianteSeleccionada`, `!motivo.trim()`, and `!cajero` are all checked before the API call with informative toast messages. No empty-state submission possible.
3. **Variant deselect (✕)** (line 223) — After selecting a variant, a small ✕ button allows deselection and re-search without closing the modal. Correct for a lookup flow where the user might pick the wrong size first.
4. **ENTRADA/SALIDA toggle with semantic color** (lines 193-208) — Selected ENTRADA is green-tinted, selected SALIDA is red-tinted. The toggle buttons use the same brand semantic colors as the list icons (`#6DBF94` / `#E57373`), creating a coherent visual language for the whole flow.
5. **Motivo placeholder copy** (line 277) — `"Mercadería nueva de proveedor, prenda dañada, etc."` — domain-specific, gives concrete examples of what the field expects. The best placeholder in the codebase alongside ClienteModal's "CF / 12345678-9".
6. **RefreshCw on list header** (line 129) — A manual refresh button is the correct control for a log view. The icon (`size={15}`, `text-[#9E9E9E]`) is subtle enough not to compete with the primary "Nuevo ajuste" CTA.

## Persona Red Flags

**Sam (Accessibility-Dependent)**:
- `text-[10px] text-[#9E9E9E]` on timestamp — 2.5:1 contrast fails WCAG AA.
- The ENTRADA/SALIDA toggle buttons have no `aria-pressed` attribute — screen readers can't announce which type is currently selected.
- The ✕ deselect button (line 223) has no `aria-label` — announced as a literal "✕" character, not "Deseleccionar variante".
- The variant dropdown (lines 236-251) uses `position: absolute z-20` inside a `<div className="relative">` — clipping depends on the modal's `overflow-hidden` class (line 185). If the dropdown extends beyond the modal's visible area, it will be clipped rather than escaping. Worth verifying at short modal heights.

**Jordan (First-Timer)**:
- "Ajuste de inventario" — what's the difference between a SALIDA and an anulación? No explanation in the modal.
- If the variant search fails silently (P2), Jordan sees old results and may select the wrong variant.
- No indication that a SALIDA with quantity > current stock would result in negative inventory.

**Alex (Daily Power User)**:
- Hard 60-item limit makes the log useless for looking up a correction made three days ago.
- No date filter or search on the list.
- No keyboard shortcut to open "Nuevo ajuste" from the list page.
