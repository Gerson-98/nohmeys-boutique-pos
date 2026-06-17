---
target: "app/(root)/pos (POS screen: page.tsx + components)"
total_score: 28
p0_count: 1
p1_count: 2
timestamp: 2026-06-15T05-26-11Z
slug: app-root-pos-page-tsx
---
#### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | No visible "processing" state for cart/products while `procesarVenta` is in flight (page.tsx:194-239), beyond the button spinner |
| 2 | Match System / Real World | 4 | n/a — Spanish copy, Quetzales currency, boutique terminology all match the cashier's mental model |
| 3 | User Control and Freedom | 3 | Once `paymentOpen` is true, closing during a MIXTO "detalle" step silently discards entered amounts/bank selections with no warning |
| 4 | Consistency and Standards | 3 | Two "are you sure" patterns (vaciar carrito vs. confirmar venta) use different affordances — inline text buttons vs. a full-width armed button |
| 5 | Error Prevention | 3 | MIXTO sum validation and discount clamping are solid, but EFECTIVO underpayment just disables the button with no "Falta Qxx" message |
| 6 | Recognition Rather Than Recall | 3 | MIXTO "detalle" step recaps entered amounts, mostly removing recall burden |
| 7 | Flexibility and Efficiency | 3 | Barcode scanner auto-add and category chips are excellent; no keyboard shortcuts for payment method or "Cobrar" |
| 8 | Aesthetic and Minimalist Design | 3 | Clean palette and restrained iconography, but PaymentModal's MIXTO step stacks many sections in one scroll |
| 9 | Error Recovery | 2 | Network failures preserve the cart and retry cleanly, but a "caja cerrada" error links away from `/pos` and loses the in-progress cart |
| 10 | Help and Documentation | 1 | No tooltips/help for "Mixto", the barcode-scanner shortcut, or any first-time guidance |
| **Total** | | **28/40** | **Good** |

Be honest with scores. A 4 means genuinely excellent. Most real interfaces score 20-32.

#### Anti-Patterns Verdict

**LLM assessment**: This screen reads as a real, hand-tuned retail UI, not an AI template. No gradient text, no glassmorphism, no side-stripe cards, no numbered section markers, no hero-metric tiles, and corner radii stay sane (`rounded-xl`/`rounded-2xl`). The eyebrow-style uppercase-tracked labels that the previous critique flagged are gone — everything reviewed now uses sentence-case `text-xs font-medium` labels, confirming the harden pass landed. Residual smells worth a glance: `.card-boutique` (globals.css:40-43) still defines a 1px-border + soft-shadow "ghost card" recipe, and the payment-method / bank-type / MIXTO "add" buttons in `PaymentModal.tsx` all reuse the same `border-2` pill-button recipe repeatedly — not slop exactly, but a visual-sameness pattern worth varying if this screen gets a `$impeccable distill` or `$impeccable typeset` pass later.

**Deterministic scan**: `detect.mjs --json "app/(root)/pos"` exited 0 with zero findings — a clean scan. This isn't a contradiction with the qualitative notes above: the automated scanner checks for markup-level slop tells (gradient text, eyebrows, numbered markers, etc.), none of which are present. The "ghost-card" CSS recipe and repeated pill-button styling are structural/visual-rhythm observations the static scanner doesn't check for.

**Visual overlays**: Not available this run — no dev server was running and no browser automation was available in this session, so no `[Human]` overlay tab exists. This is a pure code-level review.

#### Overall Impression

The hardening pass clearly landed: the eyebrow-label issue is fully resolved, the MIXTO mismatch now gets inline "Faltan/Sobran" feedback, discount inputs flash red when clamped, and "Confirmar venta" now uses the same two-step armed-confirm pattern as "Vaciar carrito." The score holds steady at 28/40 ("Good") because the remaining gaps are no longer about polish — they're about **what happens when the happy path breaks**: closing the payment dialog mid-MIXTO-entry, hitting "caja cerrada" mid-sale, or trying to pay with too little cash. The single biggest opportunity is making the PaymentModal's dismissal and error paths as forgiving as its confirmation path already is.

#### What's Working

- **Two-step "tap to arm, tap again to confirm" pattern is now consistent** across both destructive/high-stakes actions — "Vaciar carrito" (page.tsx:149-164) and "Confirmar venta" (PaymentModal.tsx:227-246), both with a 4-second auto-disarm and clear "¿Confirmar...? Toca de nuevo" copy (PaymentModal.tsx:608). This is genuinely good touchscreen UX that prevents accidental double-taps from completing a sale or wiping a cart.
- **MIXTO payment math is now fully legible in real time** — the assigned/total banner (PaymentModal.tsx:528-537) plus the new "Faltan/Sobran Qxx" message (PaymentModal.tsx:578-584) give color-coded, exact-amount feedback as the cashier types, which is excellent error prevention for a cash-handling flow.
- **Discount clamping now gives visible feedback** — both the per-item discount (CartItem.tsx:29-37) and the global discount (page.tsx:173-181) flash a red border for 1.5s when a typed value gets silently capped, telling the cashier their input was adjusted without an interrupting toast.

#### Priority Issues

- **[P0] Closing the PaymentModal mid-MIXTO-entry silently discards everything with zero warning.**
  **Why it matters**: `onOpenChange={(v) => !v && onCerrar()}` (PaymentModal.tsx:281) lets a backdrop tap or Esc close the dialog instantly; the reset `useEffect` on `open` (PaymentModal.tsx:64-86) then wipes all entered amounts and bank selections the next time it opens. A cashier who's entered Q200 efectivo + Q150 tarjeta + picked a bank loses all of it on one stray tap — exactly the kind of action the two-step confirm pattern exists to protect, but it isn't applied here.
  **Fix**: intercept `onOpenChange` — if `metodo !== 'EFECTIVO'`, any amount > 0, or `mixtoStep === 'detalle'`, show a lightweight "¿Descartar pago?" confirm (reuse the existing armed-confirm pattern) before calling `onCerrar`.
  **Suggested command**: $impeccable harden

- **[P1] "Caja cerrada" (403) error navigates the cashier away from an in-progress sale with no state preservation.**
  **Why it matters**: the toast's `<Link href="/caja">Abrir caja →</Link>` (page.tsx:218-224) unmounts `/pos` entirely; `items`, `cliente`, descuentos, and any in-progress payment entry are lost. A cashier who discovers the caja isn't open mid-checkout has to re-scan the entire cart after opening the caja and returning, while a customer waits.
  **Fix**: open `/caja` in a new tab (`target="_blank"`), or persist `items`/`cliente`/`descuentoGlobal` to sessionStorage so `/pos` restores the cart on return.
  **Suggested command**: $impeccable harden

- **[P1] EFECTIVO underpayment gives no inline explanation — only a disabled button.**
  **Why it matters**: when `montoEfectivo < total`, `esValido()` returns false (PaymentModal.tsx:215) and "Confirmar venta" just dims (`disabled:opacity-50`, PaymentModal.tsx:599-601) — unlike MIXTO, which now explains the shortfall in Quetzales (PaymentModal.tsx:578-584). The same class of problem ("not enough money entered yet") is explained in one payment method but not the other, so a cashier may not understand why the button won't respond.
  **Fix**: add a small red helper line under the efectivo input, e.g. `Falta {formatPrecio(total - montoEfectivo)}`, mirroring the MIXTO faltante message.
  **Suggested command**: $impeccable clarify

- **[P2] Muted `#9E9E9E` text likely fails 4.5:1 contrast for information-bearing copy.**
  **Why it matters**: `#9E9E9E` on white is roughly 2.5:1 — well under WCAG AA's 4.5:1 for normal text — yet it's used for variant label + SKU (CartItem.tsx:64), empty-cart and empty-category messages (page.tsx:288; ProductSearch.tsx:186-192), subtotal/discount row labels (page.tsx:307-316), and phone numbers in cliente results (ClienteSelector.tsx:51, 97). On a bright tablet in a sunlit boutique, this is genuinely hard to read.
  **Fix**: darken to roughly `#757575`–`#6B6B6B` for any text that conveys real information (SKU, row labels, empty states), keeping the lighter gray only for true micro-decoration.
  **Suggested command**: $impeccable audit

- **[P2] No way to adjust the cart while PaymentModal is open — and the P0 issue above means leaving to fix it loses the payment entry.**
  **Why it matters**: PaymentModal is a full blocking Radix Dialog (PaymentModal.tsx:281-282). If a cashier notices a wrong quantity mid-payment, they must close the dialog (triggering the data loss in the first issue), fix the cart, then re-enter every payment detail from scratch. This compounds the P0 issue and breaks "user control and freedom."
  **Fix**: add a visible "Editar carrito" affordance inside the modal that closes it while preserving entered payment state at a level above the modal (lift `metodo`/montos to `page.tsx` or a shared context) — pairs naturally with the P0 fix above.
  **Suggested command**: $impeccable harden

#### Persona Red Flags

**Riley (Stress Tester)**: Riley rapid-taps "Vaciar" → "Sí, vaciar" → opens PaymentModal, starts entering MIXTO amounts, then accidentally taps the dialog backdrop. Per the P0 issue, all MIXTO entries vanish silently (PaymentModal.tsx:64-86, 281). Separately, `solicitarConfirmarVenta`/`handleConfirmar` toggle on the *same button* (PaymentModal.tsx:598) — a very fast double-tap could land the second tap on the button after its label/color/icon have already changed from the first tap's "arming," which is worth a manual tap-timing check.

**Sam (Accessibility-Dependent)**: The `#9E9E9E` contrast issue (P2 above) directly affects low-vision use across SKU labels, totals, and empty states. Additionally, icon-only buttons — the `X` close in ClienteSelector.tsx:54-56, the `Trash2` remove in CartItem.tsx:66-71 — have no explicit `aria-label`, so screen readers announce only "button" with no accessible name beyond the icon.

**Casey (Mobile User)**: PaymentModal's `max-h-[90vh] overflow-y-auto` (PaymentModal.tsx:282) combined with the MIXTO step's chunking (efectivo + tarjeta block + transferencia block + add buttons + recap banner + faltante message + CTA, PaymentModal.tsx:442-539) means Casey may need real scrolling on a phone to reach "Confirmar venta," especially if the "requiere cliente" search/results panel (PaymentModal.tsx:328-372) is also showing — potentially 5+ stacked sections before the primary action is visible.

#### Minor Observations

- The "Sobran Qxx: ajusta los montos" message (PaymentModal.tsx:582) doesn't say *which* input to adjust — with three possible amount fields, the cashier has to guess. Low-stakes, but could highlight the most-recently-edited field or default to suggesting "Efectivo" first.
- `descuentoGlobal` renders as `value={descuentoGlobal || ''}` (page.tsx:326) — if a cashier explicitly types `0`, the field shows the empty placeholder "0.00" instead of "0," a tiny inconsistency.
- The variant stock count in `MatrizVariantes` (VariantSelectorModal.tsx:140-189) is shown as a bare number — a cashier could mistake "12" for a price or SKU; a small "uds." suffix would disambiguate.
- The transferencia "pendiente de validación" notice (PaymentModal.tsx:436-438) is good proactive disclosure but rendered as plain small gray text — given its financial implications, a light info-colored chip would give it appropriate visual weight.
- No keyboard shortcuts exist for switching payment method or triggering "Cobrar" — fine for a touchscreen-first design, but worth a deliberate decision if a keyboard/barcode-heavy cashier workflow is in scope.

#### Questions to Consider

- If a cashier's MIXTO entry is interrupted (backdrop tap, accidental Esc, phone call), is losing all entered payment data acceptable for a cash-handling workflow — or does it deserve the same "are you sure" guardrail already built for emptying the cart?
- Is `/caja` really a "navigate away and lose your cart" destination from `/pos`, or should "caja cerrada" be a blocking inline banner on the POS page itself, checked proactively before checkout rather than discovered at submit time?
- Now that the eyebrow-label and MIXTO-feedback issues are resolved, is the next highest-value pass a contrast/accessibility audit across the whole palette (not just POS), since `#9E9E9E` likely appears in other screens too?
