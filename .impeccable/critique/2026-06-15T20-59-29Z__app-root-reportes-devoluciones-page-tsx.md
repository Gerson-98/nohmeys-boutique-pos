---
target: app/(root)/reportes/devoluciones/page.tsx + components/DevolucionReceiptModal.tsx
total_score: 20
p0_count: 0
p1_count: 2
timestamp: 2026-06-15T20-59-29Z
slug: app-root-reportes-devoluciones-page-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 1 | Gold spinner on list load (vs skeleton elsewhere); no loading on `buscarCambio`; no error state on `cargar()` |
| 2 | Match System / Real World | 2 | Good Spanish; raw `×` character as close button; DIV modal without aria semantics |
| 3 | User Control and Freedom | 2 | No "back" once sale selected; receipt modal no Esc; DevolucionReceiptModal "Nueva devolución" closes instead of just dismissing |
| 4 | Consistency and Standards | 1 | DIV-based modal vs `<Dialog>` everywhere else; spinner vs skeleton; `×` vs `<X>` icon close pattern |
| 5 | Error Prevention | 3 | `puedeConfirmar` gate is thorough; quantity limits enforced; EFECTIVO/VALE disabled with explanation |
| 6 | Recognition Rather Than Recall | 3 | Good labels, exact ticket format in placeholder, disabled states explained inline |
| 7 | Flexibility and Efficiency | 2 | Anulación shortcut from ventas history is excellent; `buscarCambio` no debounce (fires every keystroke) |
| 8 | Aesthetic and Minimalist Design | 2 | Clean list rows; CAMBIO sub-section (search + items + payment) overwhelming in a single scroll; three similar-opacity badges |
| 9 | Error Recovery | 1 | `cargar()` no catch — failed fetch shows empty state; `buscarCambio` catch is silent; `/api/bancos` no error handling |
| 10 | Help and Documentation | 3 | Inline contextual guidance on EFECTIVO/VALE restrictions; diferencia label changes by scenario |
| **Total** | | **20/40** | **Poor — two independent P1s; the main flow is functionally solid but technically under-hardened** |

## Priority Issues

**[P1] `cargar()` has no `catch` — API failure silently shows "Sin devoluciones registradas"**
- **Why it matters**: `cargar()` (lines 112-126) uses `try { ... } finally { setCargando(false) }` with no `catch`. If `/api/reportes/devoluciones` returns an error or the network drops, `devoluciones` stays `[]` and the render falls through to the empty state: "Sin devoluciones registradas." A supervisor reviewing returns after a network hiccup sees a blank list with no explanation and no retry button. This is the exact P1 pattern that was fixed in `productos/page.tsx` and `home/page.tsx`.
- **Fix**: Add `errorLista` state; catch sets it, clears on retry. Render a three-state view: spinner → error card (AlertTriangle + "No pudimos cargar las devoluciones" + Reintentar) → empty / list.
- **Suggested command**: `$impeccable harden devoluciones`

**[P1] Modal "Nueva devolución" is a raw DIV overlay, not `<Dialog>` — no focus trap, no Esc, no aria**
- **Why it matters**: Lines 500-806 mount the modal as a `<div className="fixed inset-0 z-50 ...">`. This means: (a) pressing Esc does nothing — the user must click "Cancelar" or the close button; (b) focus is not trapped inside the modal — a keyboard user Tab-cycling can focus elements behind the overlay; (c) no `role="dialog"`, `aria-modal="true"`, or `aria-labelledby` — screen readers do not announce the modal or restrict browsing to its content; (d) scroll on the body behind the overlay is not locked. Every other modal in the app (`ProductModal`, `CategoriasModal`, `VariantSelectorModal`, `PaymentModal`, `ReceiptModal`) uses the `<Dialog>` component from `@/components/ui/dialog`, which handles all of the above. This modal is the only exception.
- `DevolucionReceiptModal` (line 193-217) has the same DIV pattern — same issues.
- **Fix**: Replace both DIV overlays with `<Dialog>` / `<DialogContent>` following the existing pattern. `DevolucionReceiptModal` is self-contained and the swap is straightforward. The main modal needs its multi-stage content wired into the Dialog body.
- **Suggested command**: `$impeccable harden devoluciones`

**[P2] `buscarCambio()` fires on every keystroke with no debounce and no loading indicator**
- **Why it matters**: `buscarCambio(q)` (lines 242-252) is called directly in `onChange` (line 688) with no debounce: typing "vestido de noche" fires 17 consecutive `/api/pos/buscar` requests. There is also no loading state — results either appear or don't, silently. The `catch` block (line 249) sets `setCambioResultados([])`, so a failed search looks identical to a query with no matches. Combined, a degraded network produces a type-and-nothing-appears experience with no diagnostic signal.
- **Fix**: Add a `useRef` debounce (300ms, matching the productos search pattern); add `buscandoCambio` state that shows a small spinner in the search input; change `catch` to set an `errorCambio` state that renders "Error al buscar, intenta de nuevo" inline.

**[P2] `/api/bancos` fetch (line 131) has no error handler**
- **Why it matters**: If banks fail to load, the bank `<select>` (line 776) is empty and the user cannot proceed with a TRANSFERENCIA or TARJETA payment for a "cambio de prenda" diferencia. There is no visible error — the select shows only the placeholder "Selecciona un banco..." with no options. The "Confirmar devolución" button will remain disabled via `puedeConfirmar`, but the user has no idea why.
- **Fix**: Add `.catch(() => toast.error('No se pudieron cargar los bancos'))` and optionally a retry path.

**[P2] Gold spinner on list load — inconsistent with skeleton pattern (productos, home)**
- **Why it matters**: The main list loading state (lines 433-436) shows the same gold `border-[#C9A84C] animate-spin` spinner that was removed from `CategoriasModal` and `ProductModal` as part of the previous polish pass. The established pattern for list-area loading is blush-tinted `animate-pulse` skeleton rows that mirror the item geometry, preventing layout shift when real content loads.
- **Fix**: Replace the centered spinner with 6–8 skeleton rows of the same `card-boutique px-4 py-3` height as real devolución items.

**[P2] `text-[10px]` on filter labels and list meta — same contrast violation as CategoriasModal**
- **Why it matters**: Four instances combine 10px text with `text-[#9E9E9E]` (~2.5:1 contrast on `#FAFAFA`):
  - Filter labels "Desde" / "Hasta" (lines 404, 408): `text-[10px] font-medium text-[#9E9E9E]`
  - List row meta (cajero/cliente/vale) (line 462): `text-[10px] text-[#9E9E9E]`
  - Timestamp (line 472): `text-[10px] text-[#9E9E9E]`
  All four carry real information a supervisor needs to audit. The timestamp is the primary identifier for when a return happened.
- **Fix**: `text-[10px]` → `text-xs` (12px); keep `text-[#9E9E9E]` for purely decorative/secondary context, or bump to `text-[#757575]` for information-bearing instances.

**[P2] Close button uses `×` HTML character, not `<X>` icon — screen reader and pattern mismatch**
- **Why it matters**: Line 504: `className="... text-xl leading-none">×</button>`. Screen readers may announce this as "times" or "multiplication sign." Every other closeable overlay in the project uses the built-in Dialog close button (which renders an `<X>` SVG icon from lucide-react with `aria-label="Close"`). The character also sits at `text-xl leading-none` which gives it a tap target of roughly 20×20px — below the 44px minimum.
- **Fix**: Resolves automatically when the modal is migrated to `<Dialog>` (the P1 fix above).

**[P3] No "Cambiar búsqueda" path once a sale is selected**
- **Why it matters**: After a sale is found and selected, `ventaSel` is set and the UI switches to the product selection / return form. The only way to search for a different sale is to close the entire modal (resetting all selections) and reopen it. A common scenario: cashier scans the wrong ticket, selects the sale, then realizes the error — they must close, re-open, and re-search.
- **Fix**: Add a small "Cambiar" link next to the selected ticket in the sale summary block that calls `setVentaSel(null)` and re-shows the search.

**[P3] `buscarCambio` results show stock count as unlabeled `(N)` parenthetical**
- **Why it matters**: The variant button text is: `{[v.talla, v.color].filter(Boolean).join(' / ') || v.sku} · {formatPrecio(...)} (N)` (line 707). The `(N)` is stock, but there's no label. A first-time user may not know what the number means — is it a size code? A reference?
- **Fix**: Change to `· Stock: ${v.stockActual}` or add a title attribute `title="Stock disponible"`.

**[P3] No confirmation step before irreversible "Confirmar devolución"**
- **Why it matters**: Clicking "Confirmar devolución" immediately posts to `/api/devoluciones` with no intermediate confirm screen. Unlike "Eliminar categoría" (which now uses an AlertDialog), a return is a financial operation that adjusts stock and issues a refund. A misclick on "Confirmar" with the wrong items selected cannot be undone from the UI.
- **Fix**: Consider a one-line summary confirmation — either an `AlertDialog` ("¿Confirmar devolución de Q150.00 en efectivo para TKT-0001?") or a read-only summary panel above the action buttons that appears only once items + retorno are selected.

## What's Working

1. **`puedeConfirmar` logic (lines 305-310)** — the gating condition is genuinely thorough: sale selected, at least one item, non-empty motivo, EFECTIVO only if cash-only payment, VALE only with a real client, CAMBIO with items and payment method for positive diferencia. This is one of the better submit-gate implementations in the codebase — very few false-enable paths.
2. **Auto-select retorno type on sale load (line 229-231)** — `seleccionarVenta()` reads the original payment method and pre-selects EFECTIVO if cash-only. A cashier who receives a cash sale return doesn't have to think about which retorno type to pick — the form is already right.
3. **Anulación shortcut via `?anular=TICKET` (lines 135-143)** — deep-linking from the Historial de ventas with pre-selection of all available items and a default motivo is a genuine power-user accelerator. `iniciarAnulacion()` even handles the URL cleanup (`window.history.replaceState`) so the param doesn't persist on refresh.
4. **Diferencia labeling by scenario (lines 751-758)** — the diferencia row adapts its label contextually: "Cliente paga diferencia" (red), "Vale por diferencia" / "Efectivo a devolver" (green, conditional on client presence), "Sin diferencia" (neutral). This is careful UX that prevents the cashier from needing to mentally compute who owes what.
5. **DevolucionReceiptModal receipt layout** — the `max-w-[80mm]` thermal-printer-aware receipt with dashed separators, `font-mono leading-snug`, and conditional CAMBIO / VALE sections is production-ready for actual POS printing. The `useReactToPrint` integration is correct.

## Persona Red Flags

**Sam (Accessibility-Dependent)**:
- DIV-based modal (P1): no focus trap, no aria-dialog, no Esc — a keyboard-only user is effectively locked out of the "Nueva devolución" flow.
- Close button `×` at ~20×20px tap target.
- Four `text-[10px] text-[#9E9E9E]` instances (filter labels, list meta, timestamp).
- No ARIA live region for search results (`buscar`, `buscarCambio`) — screen readers don't announce when results appear.

**Jordan (First-Timer)**:
- If the initial load fails, they see "Sin devoluciones registradas" with no indication the error is temporary — may file a support ticket or assume the feature doesn't work.
- No hint that the anulación shortcut exists (discoverable only from Historial de ventas or documentation).
- The three retorno-type buttons give no visual guidance on which to prefer — a first-timer doing their first return has to read the disabled states to infer the logic.

**Alex (Daily Power User)**:
- `buscarCambio` no debounce — 7–10 API calls per product name typed, potentially noticeable on slow networks.
- No "Cambiar búsqueda" once a sale is selected — a misidentified ticket requires closing and reopening the modal.
- `buscarCambio` failure is silent — on a bad network, the cambio search just shows nothing and Alex has no way to know if it's "no results" or "API error."
