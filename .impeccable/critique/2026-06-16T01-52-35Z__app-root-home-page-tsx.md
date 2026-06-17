---
target: app/(root)/home/page.tsx
total_score: 27
p0_count: 0
p1_count: 1
timestamp: 2026-06-16T01-52-35Z
slug: app-root-home-page-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Chart values still hover-only per bar; weekly total now always shown (good) |
| 2 | Match System / Real World | 3 | Time-aware greeting fixed; "Punto de venta" label on quickstart strip reads slightly corporate |
| 3 | User Control and Freedom | 2 | Quickstart gives one exit path; KPI tiles still non-interactive, no filters |
| 4 | Consistency and Standards | 3 | Unified card surface; font-playfair text-sm vs text-base for section headers is a minor drift |
| 5 | Error Prevention | 3 | AbortController, !res.ok throw, date guards; retry button lacks AbortController |
| 6 | Recognition Rather Than Recall | 3 | Payment labels activated, quickstart makes /pos discoverable, chart tooltip + total present |
| 7 | Flexibility and Efficiency | 2 | Quickstart is the only accelerator; no keyboard shortcuts, no drill-through from tiles |
| 8 | Aesthetic and Minimalist Design | 3 | Rainbow gradients gone; three stacked full-width cards when caja open is slightly heavy |
| 9 | Error Recovery | 3 | Error state with retry, AbortError guard, toast for refresh; no error-type differentiation |
| 10 | Help and Documentation | 2 | Caja banner and empty-state link give contextual guidance; no onboarding, no stock reorder help |
| **Total** | | **27/40** | **Acceptable** |

## Anti-Patterns Verdict

**LLM assessment**: No longer reads as off-the-shelf AI dashboard. Unified card-boutique surface, time-aware greeting, payment method labels, and the domain-informed quickstart strip signal intentional construction. The KPI 4-card grid is the most AI-generic element remaining, but its content grounds it. The quickstart strip exposes a structural seam: two consecutive full-width cards say different-but-related things about the same operational state (caja open).

**Deterministic scan**: detect.mjs exit 0, [] findings. Clean.

**Visual overlays**: Not available — no browser automation. Source-code-only review.

## Overall Impression

Home page improved from 19/40 to 27/40. Critical blockers gone. Remaining rough edge: quickstart strip as standalone element causes layout shift on load and adds a filler left label. Folding the CTA into the caja-abierta banner is the cleanest fix.

## What's Working

1. **Skeleton loading state** — Mirrors real layout exactly, blush-tinted pulses, no full-page spinner.
2. **Caja status as first content** — Branches on a business-critical gate with state info and recovery path.
3. **Error recovery + AbortController** — P0 from first critique fully resolved; toast for refresh keeps existing data visible.

## Priority Issues

**[P1] Layout shift on initial load — skeleton missing quickstart strip stub**
- **Why it matters**: When cajaAbierta is not null (normal during business hours), the quickstart strip appears between caja banner and KPI grid after data loads. Skeleton has no stub; KPI grid jumps ~50px downward on every page load during operating hours.
- **Fix**: Fold "Registrar venta" CTA into the caja-abierta banner (right side), eliminating the separate conditional element. Collapses 3-element top zone to 2, removes CLS.
- **Suggested command**: $impeccable polish

**[P2] Quickstart strip left label "Punto de venta" is semantic filler**
- **Why it matters**: Button "Registrar venta" already conveys destination and action. Muted left text restates the button without adding information.
- **Fix**: Remove the left label, or replace with genuinely additive context (today's sale count from kpis.ventasHoy).
- **Suggested command**: $impeccable polish

**[P2] text-[10px] on information-bearing text — borderline WCAG failure**
- **Why it matters**: Five elements use text-[10px] (KPI sub-captions line 260, chart day labels line 288, sale detail caption line 380, sale timestamp line 387). #757575 on #FAFAFA is ~4.0:1 — below WCAG AA 4.5:1 for normal text at that size.
- **Fix**: Promote all information-bearing text-[10px] to text-xs (12px). Five targeted changes.
- **Suggested command**: $impeccable audit

**[P3] "Alertas stock" KPI tile non-interactive despite signaling actionable data**
- **Why it matters**: Tile shows count but clicking does nothing; actual list is two sections below.
- **Fix**: Wrap alerts tile count in scroll anchor or link to /inventario/ajustes when alerts > 0.
- **Suggested command**: $impeccable polish

**[P3] No ARIA live region for dashboard refresh**
- **Why it matters**: Refresh animation is visual-only; screen readers get no announcement.
- **Fix**: Add aria-live polite region that announces Actualizando/Panel actualizado based on refrescando state.
- **Suggested command**: $impeccable audit

## Persona Red Flags

**Alex (Cajera / Daily Power User)**: Quickstart strip now gives direct path to /pos. But "Alertas stock" KPI tile does nothing on click; must scroll past two chart panels. No keyboard shortcut for /pos.

**Sam (Accessibility-Dependent)**: Quickstart Link is keyboard-accessible. Refresh button has aria-label. But text-[10px] at ~4:1 contrast fails WCAG AA. Chart bars are title-only (not announced by screen readers). No aria-live for refresh state.

**Jordan (New Cashier)**: Quickstart strip is the obvious first-action. Error state is user-friendly. Caja-closed state sends to /caja with no prior explanation of the flow.

## Minor Observations

- font-playfair text-sm vs text-base inconsistency across section headers.
- AGOTADO all-caps in Spanish reads more aggressive than intended; red color already carries urgency.
- Retry button calls cargar() without AbortController; inconsistent with elsewhere.
- Quickstart strip "Punto de venta" label uses text-sm text-[#757575] — caption styling that doesn't communicate it's a section label.
