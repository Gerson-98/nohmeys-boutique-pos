---
target: app/(root)/caja/page.tsx
total_score: 24
p0_count: 0
p1_count: 1
timestamp: 2026-06-15T21-56-56Z
slug: app-root-caja-page-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 1 | Gold spinner on load; `cargar()` no catch — API failure renders "Caja cerrada" apertura form when the caja may actually be open |
| 2 | Match System / Real World | 3 | "Arqueo de efectivo", "Sobrante/Faltante", "Caja cuadrada ✓" — authentic domain language throughout |
| 3 | User Control and Freedom | 3 | Two-step cierre (preview modal → confirm); Cancelar path; procesando disables during in-flight ops |
| 4 | Consistency and Standards | 2 | Gold spinner; `catch (err: any)` in two places; `text-[10px]` on 3 elements; `cargar` not a useCallback |
| 5 | Error Prevention | 3 | `disabled={procesando \|\| !cajero}`; efectivo contado placeholder shows expected; live diferencia calculation |
| 6 | Recognition Rather Than Recall | 3 | Per-method icons (Banknote/CreditCard/Wifi); KPI labels clear; live Sobrante/Faltante feedback |
| 7 | Flexibility and Efficiency | 2 | `autoFocus` on fondoInicial; no keyboard shortcut; single-page shift view appropriate for the task |
| 8 | Aesthetic and Minimalist Design | 3 | Two-state design is focused; transferencia warning uses yellow-border correctly; `uppercase tracking-wide` in modal headers is borderline |
| 9 | Error Recovery | 1 | `cargar()` no catch — failure state is "Caja cerrada" (potentially wrong); `abrirCaja`/`cerrarCaja` have catch but type `any` |
| 10 | Help and Documentation | 3 | "Esperado: Q150 (fondo + ventas en efectivo)"; transferencia pendiente clarification; "Ve al POS y selecciona tu nombre" |
| **Total** | | **24/40** | **Acceptable — strong domain UX, one P1 (no-catch cargar showing wrong state), P2 pattern fixes** |

## Priority Issues

**[P1] `cargar()` no catch — API failure shows "Caja cerrada" apertura form when the shift is open**
- **Why it matters**: `cargar()` (lines 75-84) uses `try { setCaja(d.data) } finally { setCargando(false) }` with no catch. If `/api/caja` fails — 500, network blip, expired session — `setCaja` never runs; `caja` stays `null`. The page then renders the **"Caja cerrada"** apertura state. This is structurally worse than the same bug in ventas or devoluciones (where failure showed an empty list): here the *wrong operational state* is displayed. A cashier who sees "Caja cerrada" will attempt to open the caja, hit an API error ("ya hay una caja abierta"), and be confused about why opening fails — the actual cause (failed initial load) is invisible. On a shift change this could cause a supervisor to open a second caja or assume the previous cashier didn't properly close theirs.
- **Fix**: Add `errorCarga` state. On catch, set it and render a dedicated "No pudimos verificar el estado de la caja" panel with an AlertTriangle and a Reintentar button. Never render the apertura form when the API state is unknown.
- **Suggested command**: `$impeccable harden caja`

**[P2] Gold spinner on load — inconsistent with skeleton pattern**
- **Why it matters**: Line 152: `<div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />` — the same gold spinner removed from CategoriasModal, ProductModal, devoluciones, and ventas during the harden passes. The caja page loads once on mount and the result is binary (open or closed), so the skeleton doesn't need to mirror card geometry — a simple centered icon placeholder or a branded skeleton of the status bar is enough.
- **Fix**: Replace the centered spinner with a blush-pulse skeleton that loosely mirrors the open-caja status card and KPI row (3–4 rects in card-boutique shape). Since the outcome could also be the apertura form, a neutral skeleton without prejudging which state loads is cleanest.

**[P2] `catch (err: any)` in `abrirCaja()` and `cerrarCaja()`**
- **Why it matters**: Lines 101 and 127: `catch (err: any)`. Both functions call `toast.error(err.message)` directly. If the caught value is not an Error (e.g., a thrown string or network rejection without a `.message` property), `err.message` would be `undefined` — the toast would show "Error: undefined". The pattern established in the harden passes for `productos`, `devoluciones`, and `ventas` is `catch (e: unknown)` with `e instanceof Error ? e.message : 'Error desconocido'`.
- **Fix**: Change both to `catch (err: unknown)` and narrow: `toast.error(err instanceof Error ? err.message : 'Error desconocido')`.

**[P2] `text-[10px]` on three elements in movimientos**
- **Why it matters**: Three instances in the movimientos section combine 10px with low-contrast colors:
  - Line 257: `text-[10px] text-[#9E9E9E]` on payment method label in the row header (visible at all times when `hidden sm:flex` is active)
  - Line 286: `text-[10px]` on payment reference (`#REF123`) in the expanded detail — a cashier needs to read this for verification
  - Line 293: `text-[10px] text-[#9E9E9E]` on "Atendido por: Nombre" in the expanded detail
- **Fix**: All three → `text-xs`. The payment method label can stay `text-[#9E9E9E]` (it's secondary context); the reference and cashier attribution should be `text-[#757575]` since they carry reconciliation-relevant information.

**[P3] No error/loading state distinction — failed cargar shows apertura form identical to "truly closed"**
- This is the second dimension of the P1: even after the P1 fix, there should never be a path where the UI shows "Caja cerrada" based on a failed fetch. The error state (can't confirm status) should be visually distinct from the confirmed-closed state (confirmed by API). Currently there is one null-check for `caja` that collapses both cases.

**[P3] `cargar` is not a `useCallback` — re-created on every render**
- **Why it matters**: `cargar` (line 75) is defined as a bare `async function` inside the component. It's used in `useEffect(() => { cargar(); }, [])` (empty deps — runs once on mount) and as an `onClick` on the refresh button. Because it's not memoized with `useCallback`, it's re-created on every render. In this specific case it doesn't cause a bug (empty-dep effect + click handler), but it's inconsistent with the established pattern throughout the codebase (`cargarProductos`, `cargarCategorias`, `cargar` in devoluciones — all useCallback), and the linter would flag the missing dep warning on the effect.
- **Fix**: Wrap in `useCallback(async () => { ... }, [])`.

**[P3] No post-close summary — cashier sees apertura form immediately after cerrar**
- **Why it matters**: After `cerrarCaja()` succeeds (line 123-126), `setCaja(null)` puts the UI into the "Caja cerrada" apertura state. The closing summary (total, transactions, diferencia) disappears. A cashier who needs to record the shift total in a physical log has no way to retrieve these numbers without opening the reportes module. The preview modal (`previewOpen`) is dismissed before `cerrarCaja()` is called (line 111).
- **Fix**: Show a brief post-close confirmation panel — the `resumen` data is available at the moment of close, so it can be captured before `setCaja(null)` and displayed as a "Turno cerrado" card (total, transactions, diferencia) that the cashier can read before the apertura form takes over. Alternatively, hold the preview modal open after close and add a "Listo" dismiss button.

**[P3] `uppercase tracking-wide` in preview modal sub-headers (lines 381, 406)**
- **Why it matters**: The two `<h3>` labels "Ingresos por método" and "Arqueo de efectivo" use `text-xs font-medium text-[#9E9E9E] uppercase tracking-wide` — the same eyebrow pattern flagged as a banned absolute in the design rules. These are inside a modal recap (not page-level scaffolding), which is a more defensible use, but the uppercase+tracking combination reads as a design reflex rather than an intentional brand choice.
- **Fix**: Remove `uppercase tracking-wide`. `text-xs font-semibold text-[#2C2C2C]` gives the header sufficient weight without the eyebrow cliché.

## What's Working

1. **Two-step cierre with preview modal** — Clicking "Cerrar caja del turno" opens a `<Dialog>` (correctly using the component, not a DIV overlay) showing the full shift summary before the destructive action is confirmed. The preview includes payment-method breakdown, cash reconciliation with diferencia, and a cancel path. This is one of the better protective patterns in the codebase for an irreversible operation.
2. **Live diferencia feedback** (lines 324-338) — As the cashier types the physical cash count, the diferencia panel updates in real-time with color-coded state: green (cuadrada), blue (sobrante), red (faltante). The panel is a `rounded-xl border` with background tint matching the signal color — information-dense and scannable at a glance.
3. **`autoFocus` on fondoInicial input** (line 171) — When the caja is closed, the fondoInicial number input receives focus immediately. A cashier can type the opening float and press Enter/Tab without any extra clicks. Small but correct.
4. **Transferencias pendientes banner** (lines 222-232) — Yellow-border informational banner appears only when `totalTransferenciaPendiente > 0`. The copy is explicit: "Este monto es informativo y no se incluye en el cierre hasta validarse." — prevents a cashier from counting pending transfers as confirmed income.
5. **METODO_ICON map** (lines 51-57) — Each payment method has a distinct icon (Banknote, CreditCard, Wifi, DollarSign, CheckCircle) in addition to a text label. The icons serve as quick scannable glyphs in the movimientos list; color differentiation (green/blue/gold) adds a second axis. Not color-only — the shape differs too.

## Persona Red Flags

**Sam (Accessibility-Dependent)**:
- `text-[10px]` on 3 elements in movimientos (method label, payment reference, cashier attribution) — same 2.5:1 contrast violation.
- Accordion toggle buttons (line 250) lack `aria-expanded` attribute — screen readers can't announce expand state.
- ChevronDown (line 263) has no `aria-hidden="true"` — announced as an unlabeled graphic.
- The diferencia panel (lines 324-338) signals state via color only in the icon (`AlertTriangle` + color); the text label "Sobrante" / "Faltante" adds the second axis — this is correct.

**Jordan (First-Timer)**:
- "Fondo inicial" — what's a typical amount? There's no placeholder hinting at a range (e.g., `placeholder="Ej. 500.00"`).
- If `cargar()` fails, Jordan sees "Caja cerrada" and tries to open one — the API returns "ya hay una caja abierta," leaving Jordan confused about why they can't proceed.
- "Arqueo de efectivo" in the modal may not be recognized immediately by a first-week cashier.

**Alex (Daily Power User)**:
- After closing, has to manually navigate to reportes to get a permanent record of the shift summary.
- No keyboard shortcut to refresh movimientos mid-shift.
- If the shift has 40+ ventas, the movimientos list scrolls without a count-visible section header for grouping by hour.
