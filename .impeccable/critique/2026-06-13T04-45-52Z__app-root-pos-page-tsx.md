---
target: /pos (Punto de Venta)
total_score: 28
p0_count: 1
p1_count: 2
timestamp: 2026-06-13T04-45-52Z
slug: app-root-pos-page-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Scan feedback and loading skeletons are good, but `procesarVenta` (page.tsx:152) gives no loading/disabled feedback on the catalog while a sale POSTs — only the payment button spins. |
| 2 | Match Between System and Real World | 4 | All-Spanish, domain-correct terms throughout (Talla, Cobrar, Agotado, Vale de crédito) — strong fit for non-technical cajeras. |
| 3 | User Control and Freedom | 2 | "Vaciar carrito" (page.tsx:206-214) wipes the cart, client, and discount in one click with zero confirmation. PaymentModal's client-required warning (240-248) tells the cajera to "cierre este diálogo" with no in-place fix. |
| 4 | Consistency and Standards | 3 | Color/typography/shadow rules hold across the build, but `VariantSelectorModal`'s size×color matrix (140-189) is a raw HTML `<table>` — the one place the visual language breaks from rounded cards/buttons. |
| 5 | Error Prevention | 2 | Stock=0 correctly blocks add-to-cart everywhere. But "Vaciar carrito" has no confirm, and the global discount input clamps silently with no feedback when the entered value is reduced. |
| 6 | Recognition Rather Than Recall | 3 | Cart stays visible on desktop; mobile tab badge shows item count; selected client persists as a chip. |
| 7 | Flexibility and Efficiency of Use | 4 | Barcode-scanner auto-detect + Enter-to-add, category chips, and a single-variant fast path (page.tsx:96-97) make this genuinely quick for a trained cashier. |
| 8 | Aesthetic and Minimalist Design | 3 | Cart line items pack qty stepper + discount input + line total into one ~340px row (CartItem.tsx:54-100) — functional but visually dense for a tablet. |
| 9 | Error Recovery | 2 | Toasts exist for API errors, but the PaymentModal's client-required warning and the silent scanner-miss (no "Producto no encontrado" text) leave the cajera without a clear next step. |
| 10 | Help and Documentation | 2 | Almost no inline help beyond a few `title=` attributes; only the "transferencia pendiente de validación" note explains itself — discount fields and mixed-payment math get no explainer. |
| **Total** | | **28/40** | **Good** |

## Anti-Patterns Verdict

**Start here. Does this look AI-generated? No.**

**LLM assessment**: This reads as a deliberate, custom-built design system applied faithfully across all six POS components — the Playfair/Inter/JetBrains Mono split, the blush-glow ambient palette, and rounded-xl consistency are all genuinely present in the markup, not bolted-on tokens. The one slop-adjacent moment is `VariantSelectorModal.tsx`'s `MatrizVariantes` (lines 140-189): a literal HTML `<table>` for size×color selection that reads like a spreadsheet export dropped into an otherwise touch-first, boutique-branded flow. Everything else — including the barcode-scanner feedback states and the receipt's "¡Venta completada!" moment — feels considered and on-brand.

**Deterministic scan**: `detect.mjs --json` against `app/(root)/pos` (page.tsx + all 7 components, ~8 files) returned **exit 0, 0 findings**. The scan is clean. Worth noting why a couple of near-misses didn't fire: the mobile tab indicator uses `border-b-2 border-[#C9A84C]` (page.tsx:318, 328) — this is a *bottom* border on a tab, not a left/right "stripe," so it correctly does not violate DESIGN.md's stripe-border restriction (which only governs the sidebar's documented left-border exception), and the detector's per-line `border-accent-on-rounded` regex didn't pair it with the unrelated `rounded-full` badge on line 334. No false positives to report — the 0-finding result is genuine, not a detector miss on anything Assessment A flagged (the table-as-variant-picker and cognitive-load issues below are structural/UX, not the class of thing this regex-based scanner targets).

**Visual overlays**: Unavailable for this run — no browser automation tool was exposed in this session, so live-server and overlay injection were skipped entirely. No user-visible **[Human]** overlay exists for this critique.

## Overall Impression

This is a well-executed, on-brand build — the "Mostrador de la Boutique" identity (gold accents, blush ambience, serif titles, mono numbers) is consistently applied, and the core search → scan → cart → pay loop is genuinely fast, which is exactly what PRODUCT.md asks for. The gap is that the **emotional journey is inverted**: the receipt screen (lowest-stakes moment, the sale is already done) is the calmest, most reassuring screen in the app, while the **payment screen — the highest-stakes moment, where a wrong tap means wrong money in the drawer** — is the most cognitively loaded (MIXTO mode alone can surface 6+ live inputs) and contains the flow's only true dead-end (the client-required warning). The single biggest opportunity is to move calm and reassurance *forward* into the payment step, and to put a guardrail on the one truly destructive, confirmation-free action in the whole interface ("Vaciar carrito").

## What's Working

- **Barcode scanner auto-add with visual feedback** (`ProductSearch.tsx:60-117`, `124-131`): the search icon morphs to a green check or red scan-line on success/failure and auto-resets after 1.5s — exactly the kind of glanceable, low-literacy-friendly confirmation a cajera using a handheld scanner under variable store lighting needs, and it directly serves "velocidad sobre densidad."
- **Single-variant fast path** (`page.tsx:95-101`): products with only one variant skip the picker modal entirely and go straight into the cart — a small but real click-reduction for what's likely the majority of boutique SKUs.
- **Cash change calculation** (`PaymentModal.tsx:268-275`): the moment entered cash covers the total, a green-bordered "Cambio" card appears in large mono type. This is the textbook "the system does the math so the human doesn't have to," placed exactly where an arithmetic mistake would otherwise cost real money.

## Priority Issues

**[P0] "Vaciar carrito" wipes the entire sale with one tap and zero confirmation**
- **What**: `page.tsx:206-214` — the Trash2 "Vaciar" button calls `limpiarCarrito()` directly on click, clearing all cart items, the selected client, and the global discount in a single action, with no confirmation step.
- **Why it matters**: This sits right next to the cart header — a high-traffic tap zone — and one accidental tap mid-sale destroys a multi-item cart, a chosen client, and a manually-entered discount. This is the single most destructive, least-guarded action in the entire app, directly undermining PRODUCT.md's "operación... sin errores" goal at the worst possible moment (mid-sale, with a customer waiting).
- **Fix**: Require a second tap to confirm when `items.length > 0` (e.g., button reads "Vaciar" → tap again within a few seconds to confirm "¿Seguro?"), especially once a discount or client is set.
- **Suggested command**: `$impeccable harden`

**[P1] PaymentModal's "client required" warning is a dead end, not a fix**
- **What**: `PaymentModal.tsx:240-248` — for Tarjeta/Transferencia without a valid client, the warning text reads "Cierre este diálogo y elija un cliente en el carrito," with no button to act on it from inside the modal. Worse, the modal's `useEffect` on `open` (lines 48-60) resets `metodo` back to EFECTIVO every time it's reopened.
- **Why it matters**: To recover, the cajera must close the modal, scroll to `ClienteSelector`, search or create a client, reopen `PaymentModal`, and re-select the payment method from scratch — a 4-step detour with state loss, right at the moment of closing the sale. Under time pressure this is exactly where a wrong payment method gets selected.
- **Fix**: Embed a compact client search / "Nuevo cliente rápido" trigger directly inside the warning block so the cajera resolves it without leaving the modal, and preserve the chosen `metodo` across the detour.
- **Suggested command**: `$impeccable clarify`

**[P1] MIXTO payment mode breaks the 4-choice limit at the highest-stakes screen**
- **What**: `PaymentModal.tsx:318-368` — selecting "Mixto" simultaneously renders 3 amount inputs (Efectivo/Tarjeta/Transferencia), up to 2 conditional bank selectors (each able to spawn its own "add new bank" mini-modal), and a running asignado/total validator — 6+ live interactive elements at once.
- **Why it matters**: This is the screen where a mis-entered number means real money discrepancies in the drawer at end of shift. Stacking this much input density into a relatively rare payment path, at the point of maximum consequence, runs directly against "velocidad sobre densidad."
- **Fix**: Progressive reveal — show only the Efectivo input first, with a small "+ agregar otro método" affordance to bring in Tarjeta/Transferencia one at a time.
- **Suggested command**: `$impeccable distill`

**[P2] CartItemRow crams three controls into one ~340px row**
- **What**: `CartItem.tsx:54-100` — the quantity stepper (3 elements), a per-item discount input, and the line total are squeezed horizontally into a single row inside a 360-400px cart panel, with 24×24px (`w-6 h-6`) qty buttons sitting close to the discount field.
- **Why it matters**: On a tablet, this is a fat-finger zone — exactly the kind of dense touch target cluster PRODUCT.md's "táctil primero" principle warns against, in the panel the cajera touches most often.
- **Fix**: Split into two rows — row 1 for name/variant + qty stepper + line total, row 2 (or a collapsible toggle) for the discount input, surfaced only when a discount is actually being applied.
- **Suggested command**: `$impeccable layout`

**[P3] The size×color variant picker is a raw HTML table, the one place the visual language breaks**
- **What**: `VariantSelectorModal.tsx:140-189` (`MatrizVariantes`) renders an actual `<table>` with 48px-wide button cells — the only table-based UI anywhere in the POS, versus rounded button/card patterns everywhere else (category chips, payment methods, product cards).
- **Why it matters**: This is the core "pick what I'm selling" interaction. A dense spreadsheet-style grid with sub-44px touch targets is both a touch-target regression and the single most "not boutique" moment in the app.
- **Fix**: Replace the table with a 2D layout of pill/swatch buttons — talla as row-group labels above a wrapped row of color buttons — keeping ≥40px touch targets and the same rounded-xl card language used elsewhere.
- **Suggested command**: `$impeccable shape`

## Persona Red Flags

**Casey (Distracted Mobile/Tablet User)**
- `page.tsx:206-214` — "Vaciar" sits directly beneath the cart item count, one careless tap from total cart loss (same root cause as the P0 above).
- `CartItem.tsx:58-73` — the qty +/- buttons are `w-6 h-6` (24px), well below comfortable touch-target sizing; clustered with the discount input and trash icon (`CartItem.tsx:46-89`), Casey is likely to mis-tap between them while distracted.
- `ProductSearch.tsx:222-226` — the "add to cart" hover icon relies on `group-hover:opacity-100`, but its parent button (`ProductSearch.tsx:193-201`) never declares the `group` class — this affordance is effectively invisible on a touch device, a dead element for Casey.

**"Cajera" (project-specific: non-technical cashier, busy floor, variable lighting)**
- `PaymentModal.tsx:240-248` — the client-required warning is `text-xs`, red-on-light-red, and visually similar to other bordered info boxes on the same screen. Under the variable store lighting PRODUCT.md describes, this is easy to miss — leaving the cajera staring at a "Confirmar venta" button that's simply disabled (`PaymentModal.tsx:372-383`) with no tooltip explaining why.
- `ProductSearch.tsx:96-104` — when a scanned barcode doesn't match, only the icon flips red for 1.5s; there's no text "Producto no encontrado." A cajera under pressure may not register a small icon color change and re-scan repeatedly without understanding the failure.
- `page.tsx:142-149` (totals) / `30,148` (state) — the global discount is monto-only (Q amount), but the original spec describes "porcentaje o monto." A cajera expecting to enter a percentage could enter the wrong number with no label clarifying the unit.

## Minor Observations

- The Ledger Numbers Rule holds: `formatPrecio` output is rendered in `font-mono` consistently across CartItem, totals, PaymentModal, and ReceiptModal.
- The One Serif Rule holds: `font-playfair` appears only on titles/headers (SesionModal, cart header, modal titles), never in body copy or buttons.
- `ReceiptModal.tsx:65` uses `font-serif` (not `font-playfair`) for the shop name on the *printed* ticket — likely an intentional print-safe fallback, but worth confirming it isn't accidental drift from the brand serif.
- `ProductSearch.tsx:174`'s loading skeleton uses `bg-[#F8E1E7]/50 animate-pulse` — an on-brand loading state, not a generic gray skeleton.
- The spec's totals panel calls for "Subtotal → Descuentos → IVA → TOTAL," but the live cart totals (`page.tsx:241-278`) never show IVA, even though `VentaDetalle.impuesto` exists in `ReceiptModal.tsx:24` — if tax is computed server-side, the cajera currently can't see it until after the sale is committed.
- Empty cart state (`page.tsx:221-225`) is calm and on-brand — a muted icon and quiet text, no over-design.

## Questions to Consider

1. "Vaciar carrito" can erase a multi-item cart with one tap, and the PaymentModal forces a reset-and-detour on a missing client — has this flow been walked through with an actual cajera mid-shift, where a customer interruption or a phone call is the norm rather than the exception?
2. The global discount is implemented as Q-amount only, but the original spec describes "porcentaje o monto" — was percent intentionally dropped, and if so, does the "Desc. global (Q)" label do enough to set the right expectation?
3. IVA exists in the data model but never appears in the live cart before checkout — should the cajera (and the customer) see the tax-inclusive total *before* tapping "Cobrar," not just on the printed receipt?
