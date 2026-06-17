---
target: "app/(root)/pos (POS screen: page.tsx + components)"
total_score: 27
p0_count: 2
p1_count: 2
timestamp: 2026-06-15T04-44-32Z
slug: app-root-pos-page-tsx
---
#### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | `ClienteSelector` and `PaymentModal`'s inline client search show no loading state during fetch |
| 2 | Match Between System and Real World | 4 | n/a — plain Spanish throughout, Quetzal formatting, GT date locale |
| 3 | User Control and Freedom | 2 | `PaymentModal` has no explicit "Cancelar" button; only implicit overlay/ESC dismiss |
| 4 | Consistency and Standards | 2 | Two modal systems (Radix `Dialog` vs hand-rolled `fixed inset-0` overlays) on one screen |
| 5 | Error Prevention | 3 | Good stock-aware steppers and MIXTO live validator, but discount inputs silently clamp with no feedback |
| 6 | Recognition Rather Than Recall | 3 | Category chips, cart badge, persistent totals all visible; minor MIXTO recall burden across steps |
| 7 | Flexibility and Efficiency of Use | 4 | n/a — barcode scanner auto-add and single-variant fast path are excellent |
| 8 | Aesthetic and Minimalist Design | 3 | Clean base layout; MIXTO `detalle` step gets visually busy |
| 9 | Error Recovery | 2 | Network error toast is reassuring, but discount over-limit has no message at all; "caja cerrada" recovery link auto-dismisses in 6s |
| 10 | Help and Documentation | 1 | No inline help/tooltips anywhere; "Vale de crédito" exists in types but isn't a selectable payment method, with no explanation |
| **Total** | | **27/40** | **Acceptable — significant improvements needed before users are happy** |

#### Anti-Patterns Verdict

**Does this look AI-generated? No — but a couple of slop-adjacent residues exist.**

**LLM assessment**: This codebase reads as genuinely hand-considered, not AI-generated. It has none of the most damning tells: no gradient text, no glassmorphism-as-decoration, no numbered 01/02/03 scaffolding, no identical filler card grids, consistent `rounded-xl` (12px) everywhere, and a single blush ambient shadow used consistently via `card-boutique`. The "Ledger Numbers Rule" (mono for all prices/totals/SKUs/ticket numbers) and "One Serif Rule" (Playfair on titles only) are followed with near-perfect consistency across `page.tsx`, `CartItem.tsx`, and `ReceiptModal.tsx`.

Two smaller residues did surface:
- **Tiny uppercase tracked "eyebrow" labels** at `PaymentModal.tsx:272` ("Método de pago") and `VariantSelectorModal.tsx:116` ("Talla"/"Color") — the exact pattern called out as an AI-grammar tell — while every other label in the same components uses plain `text-xs font-medium text-[#2C2C2C]` without uppercase/tracking.
- **Two parallel modal systems**: `VariantSelectorModal` and the outer `PaymentModal` use the Radix `Dialog` primitive (focus trap, ESC, ARIA), while `ReceiptModal.tsx:240`, `ClienteSelector.tsx:142` (`NuevoClienteRapido`), and the nested "nuevo banco"/"nuevo cliente" mini-modals in `PaymentModal.tsx:581-629,631-671` are hand-rolled `fixed inset-0 bg-black/*` divs with manual click-to-close and none of those affordances.

**Deterministic scan**: `node detect.mjs --json "app/(root)/pos"` returned **exit code 0 — zero findings** across all 8 target files (`page.tsx` + the 7 components). The detector was verified to be functioning correctly: running it against `app/(root)/productos/etiquetas/page.tsx` in the same repo surfaced real findings (`single-font`, `em-dash-overuse`, `numbered-section-markers`, exit code 2), confirming the clean POS result isn't a tooling failure. There are no false positives to assess since there were no findings at all. Notably, the deterministic scan did **not** catch the eyebrow-label pattern the LLM review flagged at `PaymentModal.tsx:272` / `VariantSelectorModal.tsx:116` — likely because the rule's threshold expects a repeated section-header cadence rather than 1-2 isolated form-field labels. This is a case where qualitative review caught something the automated scan missed, not a contradiction.

**Visual overlays**: Not available. No browser automation tool was exposed to either assessment, and independently of that, both `/` and `/pos` return `307 → /login` via `middleware.ts` before any DB-backed `SesionModal`/`/api/sesion` gate is ever reached — so even with a browser tool, reaching the actual POS cart/payment UI would require first authenticating through the login screen (which itself rendered cleanly, on-brand, at `200 OK`). No user-visible overlay exists for this run; this critique is based on source-code review plus a clean deterministic scan.

#### Overall Impression

This is a well-crafted, domain-fit POS screen — the barcode-scanner flow and the design-token discipline (mono numbers, single accent, single shadow, 12px radius) are genuinely above average and clearly intentional. The biggest opportunity isn't visual polish; it's **closing the gap between the cart's excellent "low-stakes confirm" pattern (vaciar carrito) and the payment flow's complete absence of reassurance at the highest-stakes moment** (`Confirmar venta`), plus tightening the MIXTO payment flow so a cashier under pressure always knows *why* a button is disabled and *what* to do next.

#### What's Working

1. **Barcode scanner detection + auto-add** (`ProductSearch.tsx:60-117, 125-149`) — timing-based scan detection with icon/border color feedback (green check / red scan-error) and an actionable error message ("Producto no encontrado. Verifica el código e intenta de nuevo.") is exactly the "speed over density" the brief calls for. This is the standout feature of the screen.
2. **Vaciar carrito double-tap confirm** (`page.tsx:145-162, 239-265`) — a lightweight, non-blocking inline confirm with auto-dismiss is the *right* pattern for a destructive-but-recoverable touch action, and is more elegant than a blocking dialog would be.
3. **Ledger Numbers / One Serif discipline** — every price, total, SKU, and ticket number renders in `font-mono` (`page.tsx:296,301,321,327,336`; `CartItem.tsx:64,86,94,96`; throughout `ReceiptModal.tsx`), and Playfair is correctly restricted to titles (`page.tsx:236`, `SesionModal.tsx:35`, `ReceiptModal.tsx:247`, dialog titles). No stray violations found.

#### Priority Issues

**[P0] MIXTO "Continuar" button gives no feedback on why it's disabled**
- **What**: `PaymentModal.tsx:555-563`. When `metodo === 'MIXTO'` and entered amounts don't sum to the total, "Continuar" is simply `disabled` with `opacity-50` — no inline message explains what's wrong.
- **Why it matters**: A cashier mid-entry sees a dead button with the only diagnostic being a small "Asignado: Qxxx / Total: Qxxx" readout (`PaymentModal.tsx:505-514`) that's easy to miss under time pressure with a customer waiting. This can fully block checkout completion — exactly the kind of "user is guessing what happened" failure heuristic 1 and 9 penalize.
- **Fix**: When `!mixtoCoincide`, show an inline message next to the button computed directly from `total - asignadoMixto`: "Faltan Q{diferencia} por asignar" or "Sobran Q{diferencia}".
- **Suggested command**: `$impeccable harden`

**[P0] Two incompatible modal systems on the same screen**
- **What**: `ReceiptModal.tsx:240`, `ClienteSelector.tsx:142` (`NuevoClienteRapido`), and `PaymentModal.tsx:581-629,631-671` are raw `fixed inset-0 bg-black/*` divs with manual click-to-close — no `role="dialog"`, `aria-modal`, focus trap, or ESC handling — while `VariantSelectorModal` and the outer `PaymentModal` use Radix `Dialog`, which provides all of that.
- **Why it matters**: Same conceptual action ("open a sub-dialog") behaves and feels different depending on which one you hit — a direct heuristic 4 violation — and the hand-rolled overlays are an accessibility gap (no keyboard escape, no screen-reader announcement). The nested mini-modals inside `PaymentModal` (a Dialog containing a hand-rolled overlay) create especially unpredictable stacking/focus behavior.
- **Fix**: Replace the hand-rolled `fixed inset-0` overlays with the shared `Dialog`/`DialogContent` primitives already used elsewhere, or extract one shared `<MiniModal>` wrapper on Radix for all four call sites.
- **Suggested command**: `$impeccable harden`

**[P1] No confirmation step before "Confirmar venta" for large totals**
- **What**: `PaymentModal.tsx:565-577`. The final "Confirmar venta" tap executes the sale immediately, regardless of amount — no double-check of any kind.
- **Why it matters**: This is the single highest-stakes tap in the entire flow — it creates a permanent sale record and affects inventory and the cashier's till. A misclick commits a real transaction. The cart's "vaciar carrito" — a far less consequential, fully reversible action — already has a confirm pattern that this one lacks.
- **Fix**: Reuse the inline two-tap pattern from `solicitarVaciarCarrito`/`confirmarVaciarCarrito`: first tap shows "¿Confirmar venta de Qxxx?", second tap within a few seconds commits.
- **Suggested command**: `$impeccable harden`

**[P1] Eyebrow-label pattern and inconsistent "close sub-modal" affordance**
- **What**: `PaymentModal.tsx:272` ("Método de pago") and `VariantSelectorModal.tsx:116` ("Talla"/"Color") use a tiny uppercase tracked-eyebrow style that no other label in either component uses (everywhere else: plain `text-xs font-medium text-[#2C2C2C]`). Separately, "close this sub-panel" is a plain text link in `ClienteSelector.tsx:169-171` ("Cancelar") but an `X` icon button in `PaymentModal.tsx:586-588,637-639` for the equivalent action.
- **Why it matters**: Inconsistent label typography and close affordances slow down learning — a cashier who's internalized one visual vocabulary for "this is a section label" or "this closes the panel" hits a different pattern elsewhere in the same flow, directly against heuristic 4 and the product register's "if 'save' looks different in two places, one is wrong" guidance.
- **Fix**: Normalize all section labels to the plain `text-xs font-medium text-[#2C2C2C]` style (drop `uppercase tracking-wide`). Standardize all "close sub-modal" controls to the top-right `X` icon button.
- **Suggested command**: `$impeccable distill`

**[P2] Discount inputs silently clamp with no feedback**
- **What**: `CartItem.tsx:79-88` (`onDescuento`) and `page.tsx:308-319` (`descuentoGlobal`) both clamp the typed value to `[0, lineaBase]` / `[0, subtotalNeto]` via `Math.min(Math.max(...))` with no message.
- **Why it matters**: A cashier who fat-fingers "500" instead of "50" for a Q45 item gets the value silently clamped to Q45 (100% off) with zero indication — the line total drops to Q0.00 and may go unnoticed until the receipt is reviewed, by which point the sale may already be processed (heuristic 5 and 9).
- **Fix**: On blur/clamp, flash the input border briefly (e.g., to the warning gold) or show an inline note: "Máx. Qxx.xx aplicado."
- **Suggested command**: `$impeccable harden`

#### Persona Red Flags

**Casey (Distracted Mobile/Tablet User)**
- `page.tsx:364-390` — the mobile "Catálogo"/"Carrito" tab bar sits at the very top of the screen, outside the natural thumb zone on a tablet held with both hands; switching views after an interruption (e.g., handing change to a customer) requires reaching up every time.
- `CartItem.tsx:57-73` — the quantity +/- buttons are `w-6 h-6` (24×24px), below the ~44×44px touch-target minimum, and sit tightly packed next to the discount input (`CartItem.tsx:54-89`) — a jostled tap easily hits the wrong control.
- `PaymentModal.tsx:438-444,462-468` — the small `X` to remove a MIXTO payment method sits right next to the amount input; a mis-tap silently drops the entire Tarjeta/Transferencia block (amount + bank selection) with no confirmation.

**Riley (Deliberate Stress Tester)**
- A page refresh while `PaymentModal` is open loses the entire cart and payment progress silently — `items`, `cliente`, and `paymentOpen` are in-memory only (only `cajero` persists via localStorage), with no `beforeunload` warning.
- Typing non-numeric text into a discount field (`CartItem.tsx:85`, `page.tsx:315`, both `Number(e.target.value) || 0`) silently resolves to 0, and typing a negative number is silently clamped to 0 — no rejection message either way.
- `agregarAlCarrito` (`page.tsx:64-97`) checks stock only against the value fetched at search time; repeatedly scanning the same item while stock depletes elsewhere can push the cart over real stock with only a toast warning, and no re-check happens until `procesarVenta`.

**Project-specific: "Cajera nueva" (first solo shift, customer waiting, minimal training)**
- "Vale de crédito" exists in the type system (`types.ts:56`, `ReceiptModal.tsx:15` `METODO_LABEL`) but is **not** a selectable option in `PaymentModal`'s `METODOS` array (`PaymentModal.tsx:9-13`) — if a customer asks to pay with store credit, it's simply missing with no explanation of whether that's a permissions issue, a missing feature, or her mistake.
- The "Tarjeta/Transferencia requires a registered client" rule (`PaymentModal.tsx:305-349`) only surfaces *after* she's selected that payment method — if "Consumidor Final" is still active when a customer hands her a card, she discovers mid-payment that she now needs to search for or create a customer record while the customer watches.
- "Cambiar sesión" (`page.tsx:354-360`) is a small, unconfirmed text link in the top bar. Tapping it replaces the whole render with `SesionModal`; cart/payment state is in-memory only and is not restored on re-selecting her name — an accidental tap mid-sale silently destroys the in-progress transaction.

#### Minor Observations

- `app/globals.css` — `.btn-boutique-primary/secondary/danger` define `default`/`hover` only, with no `focus-visible` ring (unlike `.input-boutique`, which has `focus:ring-2 focus:ring-[#F2C4CE]`). Keyboard users tabbing through "Cobrar Qxxx," "Confirmar venta," category chips, and payment-method buttons get only the browser default focus indicator.
- `ProductSearch.tsx:24,112-116` — `scanBufferRef` accumulates keystrokes but `scanBufferRef.current` is never read anywhere; either dead code or an incomplete part of the scanner-detection logic, worth a second look given how central scanning is to this screen's value.
- `page.tsx:349-351` — the cajero avatar circle renders a single initial in `font-playfair`; per the One Serif Rule, Playfair should be reserved for titles, and a single-letter avatar isn't really a title.
- `ReceiptModal.tsx:240` uses `bg-black/40 backdrop-blur-sm` for its overlay, while `ClienteSelector.tsx:142` and the `PaymentModal` mini-modals use `bg-black/30`/`bg-black/40` with no blur — a small inconsistency in overlay vocabulary across the same screen.
- `CartItem.tsx:44` — variant/SKU text at `text-[10px] text-[#9E9E9E]` is borderline for WCAG AA contrast (~2.8:1), which matters given the brief calls out "variable store lighting" and cashiers may need to read SKUs against price tags.
- `ReceiptModal.tsx:216-229` — "Guardar PDF" actually opens a print dialog rather than directly downloading a file; the label may set the wrong expectation.

#### Questions to Consider

- Why does "Confirmar venta" — the single most consequential action in the app — get *less* protective friction than "Vaciar carrito"? If the team already solved "high-stakes action → lightweight reversible confirm" for the cart, why wasn't that thinking extended to the sale itself?
- What happens to an in-progress sale if "Cambiar sesión" is tapped accidentally — and given the answer appears to be "it's lost," should switching cashiers require an empty cart, or should the cart persist across the switch?
- Is the MIXTO two-step (montos → detalle) flow actually faster for the *common* case (efectivo + 1 tarjeta), or does it add a step for the 80% case — could the bank selector simply appear inline beneath each amount field in step 1 instead of as a separate step?
