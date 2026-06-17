---
target: /pos (Punto de Venta)
total_score: 28
p0_count: 0
p1_count: 2
timestamp: 2026-06-13T05-13-00Z
slug: app-root-pos-page-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Skeleton loaders and payment spinner exist (`ProductSearch.tsx:177-182`, `PaymentModal.tsx:521-525`), but `agregarAlCarrito` (`page.tsx:64-97`) gives no toast/flash confirmation that an item landed in the cart beyond the badge count — easy to miss while scanning fast. |
| 2 | Match Between System and Real World | 4 | n/a — fully Spanish, Quetzal formatting via `formatPrecio`, receipt mimics a real 80mm ticket (`ReceiptModal.tsx:60-187`). Strong domain fit. |
| 3 | User Control and Freedom | 2 | Switching MIXTO back to EFECTIVO doesn't reset `montoTarjeta`/`montoTransferencia`/`bancoTarjetaId` (`PaymentModal.tsx:58-77`), risking stale amounts in `buildPagos()`. No undo for `eliminarItem` (`CartItem.tsx:46-51`) — asymmetric with the new double-tap "vaciar carrito" guard. |
| 4 | Consistency and Standards | 3 | `ReceiptModal.tsx:65` uses raw Tailwind `font-serif` for the shop name on the printed ticket, while the rest of the app's "One Serif Rule" runs through a `font-playfair` utility — the one artifact a customer takes home may not render in the brand serif. |
| 5 | Error Prevention | 3 | Stock limits, qty-button disabling, and MIXTO sum-vs-total validation (`PaymentModal.tsx:192-208`) all prevent errors proactively. Gap: discount inputs (`page.tsx:125-133`, `CartItem.tsx:79-88`) silently clamp out-of-range values with no visual feedback that the typed amount was changed. |
| 6 | Recognition Rather Than Recall | 3 | Category chips, persisted cajero session, and a visible client chip all reduce recall. The "Cobrar Q XX.XX" button never restates the last-used payment method, a minor missed efficiency win for mostly-cash stores. |
| 7 | Flexibility and Efficiency of Use | 3 | Barcode scanner Enter-to-add (`ProductSearch.tsx:63-117`) and single-variant fast path (`page.tsx:99-101`) are genuinely fast. But `scanBufferRef` (`ProductSearch.tsx:24,112-116`) accumulates timing data that's never read — an unfinished type-ahead/scan distinction that could be suppressing redundant searches during a scan burst. |
| 8 | Aesthetic and Minimalist Design | 4 | n/a — two-pane catalog/cart layout, single accent color, no dense tables in the core cashier loop. `VariantSelectorModal.tsx:150-187`'s matrix table is the densest UI in the flow but is a defensible, appropriately-scoped exception for multi-variant SKUs. |
| 9 | Error Recovery | 2 | Generic sale failures (`page.tsx:218-221`) toast `err.message` directly with no recovery guidance, unlike the 403/caja-cerrada case which offers "Abrir caja →". `PaymentModal`'s confirm button (`PaymentModal.tsx:518`) just goes `disabled` with no inline explanation when MIXTO amounts don't balance and `asignadoMixto === 0`. |
| 10 | Help and Documentation | 1 | No tooltip or inline help anywhere in the flow — "Dto. Q" (`CartItem.tsx:78`), "MIXTO", and "Consumidor Final" (`PaymentModal.tsx:305`) are all unexplained, despite PRODUCT.md explicitly describing the cashier persona as having "poca experiencia tecnológica." |
| **Total** | | **28/40** | **Good** |

## Anti-Patterns Verdict

**Start here. Does this look AI-generated? No.**

**LLM assessment**: The build still reads as a deliberate, custom design system — Playfair Display for headings, JetBrains Mono for every monetary value, the Petal Blush/Antique Gold palette, and 12px rounded corners are applied consistently across all 8 files. The two-pane catalog/cart layout with a mobile tab pattern is the correct IA for this task, not a templated dashboard. Two small tells of AI-assisted (vs. fully hand-finished) work remain: `ProductSearch.tsx`'s `scanBufferRef` (lines 24, 112-116) is written but never read — a half-wired feature — and `ReceiptModal.tsx:240`'s `backdrop-blur-sm` brushes against the "no glassmorphism" rule, though it's a blur on the overlay scrim rather than a frosted content card.

**Deterministic scan**: `detect.mjs --json` against `app/(root)/pos` (page.tsx + 7 components + types.ts) returned **exit 0, 0 findings** — identical clean result to the prior run. The rule set covering shadow vocabulary, color usage, font usage, and stripe-borders found nothing to flag. No false positives to report since there were no findings.

**Visual overlays**: Unavailable for this run — no browser automation tool (Playwright MCP, Chrome DevTools, Browser skill) was exposed in this session, so live-server and overlay injection were skipped entirely, same as the prior run. No user-visible **[Human]** overlay exists for this critique. Fallback signal: *browser automation unavailable in this session*.

## Overall Impression

The total score holds steady at **28/40**, but the composition underneath has shifted in a meaningful way: the prior run's lone **P0** — "Vaciar carrito" wiping the cart with zero confirmation — is **resolved**. `page.tsx:145-162` now implements a self-expiring double-tap confirmation, and this assessment lists it as a *strength*, not a risk. That's real progress on the single most destructive action in the app.

What replaces it at the top of the list is subtler but still squarely in "wrong money in the drawer" territory: the **MIXTO payment flow** (`PaymentModal.tsx:414-512`) stacks up to 7 live fields plus a balance-check indicator with no progressive narrowing, and — across *every* payment method, not just MIXTO — there's **no pre-commit recap** before "Confirmar venta" fires `onConfirmar(buildPagos())` directly. The EFECTIVO path gets a reassuring "Cambio" card; MIXTO gets nothing equivalent. The biggest opportunity now is to extend that same "show your work before you commit" instinct from the cash-change card to every payment path, and to turn MIXTO's flat wall of fields into a two-step reveal.

## What's Working

- **Double-tap "vaciar carrito" confirmation** (`page.tsx:145-162`, `230-261`): a self-expiring (4s) inline confirmation that avoids a modal interruption while still preventing accidental data loss — the prior run's P0 is fixed, and the fix stays on-brand (no modal, no second shadow style).
- **The cash "Cambio" reassurance card** (`PaymentModal.tsx:364-371`): the moment entered cash covers the total, a large green mono "Cambio" figure appears — the textbook "system does the math" pattern placed exactly where an arithmetic slip would otherwise cost real money.
- **Barcode scanner Enter-to-add with visual feedback** (`ProductSearch.tsx:60-149`): exact-SKU lookup, auto-add to cart, and a glanceable green-check/red-scan-line icon state — directly serves "velocidad sobre densidad" for a cajera under variable store lighting.

## Priority Issues

**[P1] MIXTO payment flow exceeds safe cognitive load at the highest-stakes moment**
- **What**: `PaymentModal.tsx:414-512` — cash amount, an optional tarjeta sub-panel (amount + banco + reference), an optional transferencia sub-panel (amount + banco + reference), and a live "Asignado/Total" balance indicator are all available in one scrollable view at once.
- **Why it matters**: This is the screen where a transposed digit means real money discrepancies at end of shift. Up to 7 input fields plus a pass/fail reconciliation indicator, for a cashier persona PRODUCT.md describes as having "poca experiencia tecnológica," is the single biggest cognitive-load concentration in the app — and it's at the moment errors are most costly.
- **Fix**: Turn MIXTO into a guided two-step flow — step 1 collects only the per-method amounts (cash/card/transfer, numeric only); step 2 (shown only once amounts balance) collects banco/reference per non-zero method. The existing "Asignado/Total" check becomes the single gate between the two steps instead of one more item competing for attention.
- **Suggested command**: `$impeccable distill`

**[P1] No pre-commit summary before "Confirmar venta," on any payment method**
- **What**: `PaymentModal.tsx:516-527` — the confirm button calls `onConfirmar(buildPagos())` directly with no recap of what's about to be charged (e.g., "Efectivo Q100.00 + Tarjeta Q50.00 (BI)").
- **Why it matters**: EFECTIVO gets a "Cambio" reassurance card, but every other method — and MIXTO especially — commits straight from raw inputs to a posted sale that, per recent commits, requires an admin-level "anulación" to undo. A one-line recap costs almost nothing and catches transposition errors before they become a financial discrepancy.
- **Fix**: Add a small summary line above "Confirmar venta," built from `buildPagos()`, reusing the existing mono styling from the Asignado/Total indicator (`PaymentModal.tsx:502-511`) — make it the one consistent "final check" every payment path passes through.
- **Suggested command**: `$impeccable clarify`

**[P2] Discount inputs clamp silently with no feedback**
- **What**: `page.tsx:125-133` (`actualizarDescuento`) and `CartItem.tsx:79-88` — values typed beyond the line total are silently `Math.min`/`Math.max` clamped with no visual indication the typed value changed.
- **Why it matters**: A cashier who types "500" expecting a Q500 discount and sees it silently become Q50 (the line total) may think the field is broken, or worse, not notice and misquote the customer.
- **Fix**: On blur, if the clamped value differs from what was typed, briefly flash the input border in the existing danger color (`#E57373`) or show a small "Máx. Q50.00" inline label — reuse the stock-limit `toast.warning` pattern already used elsewhere (`page.tsx:71`).
- **Suggested command**: `$impeccable clarify`

**[P3] Generic sale-failure errors give no recovery path**
- **What**: `page.tsx:218-221` — non-caja failures toast `'Error al procesar: ' + err.message` directly, exposing whatever string the API/Prisma layer returns.
- **Why it matters**: For a cashier persona with "poca experiencia tecnológica," a raw technical error string with no suggested next step turns a recoverable issue (e.g., stock just sold out) into a stuck transaction with a customer waiting.
- **Fix**: Map known error codes to plain-Spanish messages with a concrete next action, following the same pattern already used for the 403/caja-cerrada case (`page.tsx:202-209`, "Abrir caja →").
- **Suggested command**: `$impeccable clarify`

**[P3] Dead scanner-buffer code in ProductSearch**
- **What**: `ProductSearch.tsx:24,112-116` — `scanBufferRef` accumulates keystroke timing but its value is never read anywhere in the component.
- **Why it matters**: Not user-visible, but it's an unfinished feature path (a type-ahead vs. scan distinction that was never wired up) that could be quietly suppressing redundant 250ms-debounced searches during a scan burst if completed — or just confusing for future maintainers if left as-is.
- **Fix**: Either remove the dead ref, or finish the intended distinction: use it to skip firing `buscar()` while a scan burst is in progress, only searching after the trailing Enter.
- **Suggested command**: `$impeccable harden`

## Persona Red Flags

**Riley (Deliberate Stress Tester / rush scenario)**
- `PaymentModal.tsx:481-498` — MIXTO's progressive-disclosure "+ Tarjeta / + Transferencia" buttons require extra taps to reveal fields a busy cashier already knows they need when a customer says "half cash, half card" — friction added exactly when speed matters most.
- `page.tsx:147-151` — the 4-second self-expiring "¿Vaciar carrito?" confirmation could lapse mid-rush if the cashier is interrupted (a customer question, a phone call), silently reverting to the un-armed state with no feedback that the window closed.
- `ProductSearch.tsx:49-53` + `112-116` — every keystroke fires a 250ms-debounced search; since `scanBufferRef`'s scan-detection is never consumed, rapid successive barcode scans could each trigger a wasted intermediate search request.

**Jordan (Confused First-Timer cashier)**
- `PaymentModal.tsx:518` — "Confirmar venta" simply goes `disabled` with no inline explanation when MIXTO amounts don't balance and `asignadoMixto === 0` (the red Asignado/Total chip at lines 502-511 doesn't render in that case) — a first-timer sees a grayed-out button and no path forward.
- `CartItem.tsx:78` — "Dto. Q" is unexplained shorthand for "Descuento"; a first-timer may not recognize it as a discount field.
- `PaymentModal.tsx:299-344` — the rule that Tarjeta/Transferencia require a real client (not "Consumidor Final") only appears reactively, after the method is already selected — surprising, with no upfront hint.

## Minor Observations

- The Ledger Numbers Rule and One Serif Rule still hold everywhere except `ReceiptModal.tsx:65`, which uses raw `font-serif` instead of `font-playfair` for the shop name on the printed ticket — worth confirming this renders as Playfair Display, since it's the one artifact a customer takes home.
- `ReceiptModal.tsx:240`'s `backdrop-blur-sm` on the modal overlay is a blur on the scrim, not a frosted content card — likely fine under the "no glassmorphism" rule, but worth a quick conscious check.
- `page.tsx:341`'s `-m-4 lg:-m-6` cancels out the parent layout's padding for a full-height calculation — a slightly fragile coupling that would silently break if the shell's padding values change.
- `VariantSelectorModal.tsx:150-187`'s talla×color matrix table remains the one dense-table exception, now read as defensible since it's scoped to multi-variant selection only — but worth confirming it stays usable for products with many tallas/colores on a tablet.
- `VariantSelectorModal.tsx:120-131`'s color swatches rely on the `title` attribute alone for the color name — not reliably announced by screen readers and inaccessible on touch (no hover), relevant given this is a touch-first tablet product.

## Questions to Consider

1. What if "Cambio" weren't EFECTIVO-only — what would a parallel "you're about to charge..." recap look like for *every* payment method, so every path to "Confirmar venta" passes through the same final check?
2. What if MIXTO didn't exist as a separate fourth button, and instead Efectivo/Tarjeta/Transferencia could each be additively toggled with their amount fields appearing inline as toggled — collapsing "pick MIXTO, then reveal sub-panels" into one mental model?
3. The score held at 28/40 while the P0 was fixed — does that suggest the next pass should target breadth (the P1s above) rather than depth on any single screen?
