---
timestamp: 2026-06-16T01-00-18Z
slug: app-root-home-page-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Initial load shows full-page spinner instead of skeleton; refresh correctly uses a spinning icon in-place (no unmount) |
| 2 | Match System / Real World | 3 | `getSaludo()` now derives greeting from the hour — fixed since last run |
| 3 | User Control and Freedom | 2 | No drill-through from KPI cards; no date-range control; dashboard is entirely passive for admins and useless for cashiers |
| 4 | Consistency and Standards | 3 | Mostly aligned with DESIGN.md; stock section uses a colored header band that's a different pattern from "Últimas ventas" header |
| 5 | Error Prevention | 3 | Proper `catch` + error UI + retry now present; "Caja cerrada" banner is correctly surfaced above KPIs |
| 6 | Recognition Rather Than Recall | 3 | Icon + label on all KPI tiles; hover tooltips on chart; section headers explicit |
| 7 | Flexibility and Efficiency of Use | 1 | Entirely read-only — no shortcuts, no quick actions, no path for a cashier to start selling |
| 8 | Aesthetic and Minimalist Design | 2 | 4 KPI tiles each with a different status-color gradient = rainbow strip; multiple competing color signals at once |
| 9 | Help Users Recover from Errors | 3 | Error state now shows clear message + retry button; toast on refresh failure |
| 10 | Help and Documentation | 1 | No contextual help; no tooltips explaining KPI meaning; stock alerts give no reorder guidance |
| **Total** | | **24/40** | **Acceptable — improved from 19 but structural and touch-device issues remain** |

## Anti-Patterns Verdict

**LLM assessment**: The brand execution is correct — Playfair Display for titles, JetBrains Mono for all monetary values, Antique Gold/Petal Blush palette consistently applied, ambient blush shadow on cards. The previous P0 (no error recovery) and P3 (hardcoded greeting) have been fixed. What remains is mostly structural: the page still follows the stereotypical admin-dashboard shape (4 KPI tiles → 2 charts → 2 lists, all equal weight) and the most prominent section — the KPI row — uses 4 different status-color gradients simultaneously. This "rainbow gradient KPI" pattern is one of the highest-frequency tells in AI-generated dashboards: each tile gets its own color not because the design system calls for it, but because it seemed more dynamic. The result contradicts DESIGN.md's Single Accent Rule (gold = act here, blush = ambient) and reads as decoration-by-default.

**Deterministic scan**: Exited 0 with 0 findings. No pattern-rule violations in the JSX (no gradient text, no side-stripe borders, no eyebrow kickers, no numbered section scaffolding). The structural issues above require holistic/rendered review; the detector correctly found nothing at the pattern-matching level.

**Visual overlays**: Not available — no browser automation in this session, no dev server started. Source-only critique.

## Overall Impression

The dashboard improved meaningfully since the last run (19→24): the critical P0 (permanent spinner on fetch failure) is fixed, the greeting is now time-aware, and refresh no longer unmounts the page. The remaining gap is twofold: first, the KPI row's 4-gradient rainbow problem undermines the design system's color discipline at the most visible point on the screen; second, the page has no utility for CAJERO users, who according to PRODUCT.md's "velocidad sobre densidad" principle are the primary daily users of this product. The single biggest opportunity is a role-aware above-the-fold action: give cashiers a direct "Registrar venta" shortcut from the home page, and give admins/supervisors clickable KPIs that drill through to the relevant module.

## What's Working

1. **Caja status banner** is well-implemented: the closed state uses `border-2 border-[#F5C842]`, larger icon (`size={28}`), and `text-base font-bold` — materially heavier than a KPI card, which is right given it's the operational gate.
2. **JetBrains Mono on all monetary values** is consistently applied: KPI values (line 177), sale totals (line 300), ticket numbers (line 293), stock counts (line 259), progress-bar revenues (line 229) — the "ledger voice" design principle reads through cleanly.
3. **Refresh without unmount** (lines 62-63): `isRefresh ? setRefrescando(true) : setCargando(true)` correctly decouples a user-triggered refresh (in-place spinner on the button, data stays visible) from initial load (full-page spinner). Previous critique flagged this; it's now fixed.

## Priority Issues

**[P1] 4-color gradient KPI row breaks the Single Accent Rule and reads as AI-generated**
- **What**: Each KPI tile receives a different status-color gradient background — blush/gold (Ingresos hoy), green (Ingresos mes), blue (Total clientes), red/danger (Alertas stock). Four competing color signals in one row.
- **Why it matters**: DESIGN.md's "Single Accent Rule" says Antique Gold is the only "act here" color; Petal Blush is atmospheric. Using green, blue, and red as KPI tile backgrounds treats status colors as decoration rather than meaning. An admin scanning the row can't interpret the color — they see four differently-tinted squares, not a signal. This is the most prominent AI-tell on the page.
- **Fix**: Unify KPI tiles to the standard `card-boutique` surface (Boutique White, 1px Petal Blush border, ambient blush shadow). Reserve status tinting only for tiles in a semantically meaningful abnormal state — the "Alertas stock" tile when count > 0 earns its danger tint; "Ingresos del mes" doesn't earn a green background just for existing.
- **Suggested command**: `$impeccable colorize home`

**[P1] Ghost-card anti-pattern on KPI tiles (border + shadow on same element)**
- **What**: `card-boutique` (which applies `box-shadow: 0 2px 8px rgba(242,196,206,0.3)`) combined with `border ${k.cls}` (which adds a status-color border) on every KPI tile.
- **Why it matters**: The absolute-bans list forbids pairing a border with a soft drop shadow on the same element. The DESIGN.md "One Shadow Rule" says: if something needs to feel more important, use color or size, not a heavier shadow or a combined border+shadow.
- **Fix**: KPI tiles should use one or the other: the ambient shadow from `card-boutique` (no explicit border), or a status-color border (no shadow). Given the design system, using only the shadow is cleaner — let the card-boutique base class do its job without a per-tile border override.
- **Suggested command**: `$impeccable polish home`

**[P2] Full-page spinner on initial load (product register ban)**
- **What**: Initial load (`cargando: true`) renders a centered full-page spinner at `py-24`, unmounting all visible content.
- **Why it matters**: The product register reference explicitly bans "spinners in the middle of content" in favor of skeleton states. Every fresh page visit looks like an error for 1-3 seconds before data arrives. On a POS system where staff members check the dashboard at shift-start, this creates daily friction.
- **Fix**: Replace the loading branch with per-section skeleton cards: 4 gray KPI placeholder tiles, two height-preserved panel placeholders, two list-row shimmer blocks. The page structure appears instantly; data fills it.
- **Suggested command**: `$impeccable polish home`

**[P2] Bar chart values touch-invisible on tablet (primary POS device)**
- **What**: The 7-day income chart (lines 188-207) shows exact amounts only via `opacity-0 group-hover:opacity-100` tooltip. On tablet/touchscreen — the primary POS device per PRODUCT.md — hover events never fire.
- **Why it matters**: A supervisor checking daily income on a tablet sees an unlabeled bar chart. The data exists but is completely inaccessible on the intended primary device.
- **Fix**: Show abbreviated static value labels above each bar at `text-[9px]` (e.g. `formatPrecio(s.ingresos)` shortened) when space permits, or add a summary line below the chart showing the 7-day total. Remove the hover-only path as the sole access method.
- **Suggested command**: `$impeccable harden home`

**[P2] No above-the-fold quick-start action for cashiers (violates "velocidad sobre densidad")**
- **What**: When caja is open, there is no prominent CTA to go to the POS. The dashboard is purely informational; cashiers must navigate via the sidebar.
- **Why it matters**: PRODUCT.md's first design principle is "velocidad sobre densidad" — cashiers at the counter need to start selling immediately. A CAJERO role user landing on the home dashboard sees KPIs and charts that provide zero utility for their task, with no obvious "where to go to sell."
- **Fix**: Add a compact action row below the caja-open banner with a primary "Registrar venta →" button (`btn-boutique-primary`, links to /pos). Ideally role-aware: show only when `user.rol === 'CAJERO'` or when caja is abierta. This one addition transforms the home page from an admin read-only view to a genuine launchpad.
- **Suggested command**: `$impeccable shape home cashier-quickstart`

**[P3] Refresh button touch target below 44px minimum**
- **What**: The refresh button uses `p-2` (8px padding), creating approximately 32×32px effective touch target.
- **Why it matters**: PRODUCT.md requires "táctil primero" — touch targets sized for tablet/touchscreen. WCAG 2.5.5 minimum is 44×44px; this button is ~27% below that.
- **Fix**: Change `p-2` to `p-3` or add `min-w-[44px] min-h-[44px]` to meet the minimum.
- **Suggested command**: `$impeccable audit home`

**[P3] Payment method hidden from "Últimas ventas" feed**
- **What**: `METODO_LABEL` (line 43-45) maps payment methods to Spanish labels but `v.metodoPago` is never rendered in the recent sales list rows.
- **Why it matters**: For a supervisor reconciling end-of-day, "Efectivo / Tarjeta / Mixto" per sale is a relevant signal. The data is in the TypeScript interface and presumably in the API response.
- **Fix**: Add `METODO_LABEL[v.metodoPago]` to the sub-caption line alongside cajero name.
- **Suggested command**: `$impeccable polish home`

**[P3] AlertTriangle icon color inconsistent in "Caja cerrada" banner**
- **What**: The "Caja cerrada" banner uses `bg-[#F5C842]/10 border-2 border-[#F5C842]` (warning yellow theme) but the icon has `className="text-[#C9A84C]"` (Antique Gold).
- **Why it matters**: The icon should read as the same semantic color as its container. Gold inside a yellow warning banner is a subtle but present inconsistency.
- **Fix**: Change the icon class to `text-[#F5C842]` or `text-[#B8963E]` (darker warning) to match the banner's semantic color.
- **Suggested command**: `$impeccable polish home`

## Persona Red Flags

**Alex (Admin/Supervisor Power User):**
- KPI tiles are static `<div>` elements — clicking "Alertas stock: 3" does nothing. The only way to act on that number is to find the "Ajustar" link buried in the stock-alerts section below.
- "Top productos" list has no link to inventory or product detail. Clicking a product name does nothing.
- No keyboard shortcut to refresh data (browser Ctrl+R is a full reload, not a data-only refresh).
- Charts show no aggregate or total — a supervisor can't quickly read "what was total income this week" without mentally summing 7 bars.

**Casey (Tablet Cashier at the Counter):**
- Bar chart values entirely invisible on touch — hover tooltip is the only path to the data.
- Refresh button `p-2` ≈ 32px touch target; "Ver caja", "Ver todas", "Ajustar" text links are also far below 44px.
- When caja is open, there is no "Registrar venta" shortcut — must navigate via sidebar.
- The stock alert list uses `max-h-64 overflow-y-auto` (scrollable sub-container inside the main page scroll) — scroll-inside-scroll on iOS is unreliable and often unresponsive.

**Cajera (Nohemy's Boutique-specific — primary daily user):**
Profile: Store staff member, primary device is a tablet at the counter, non-technical, Spanish-only, speed is everything.
Behaviors: Ignores all charts and analytics; immediately looks for where to register a sale; works under variable store lighting throughout the day.
Red flags:
- No "Ir al POS" / "Registrar venta" on the page — the entire dashboard home is the wrong screen for this persona, but there's no automatic redirect or prominent shortcut to the right one.
- KPI sub-captions and stock-alert detail lines at `text-[10px]` (10px type) are nearly illegible under variable store lighting conditions.
- The 7-day bar chart occupies a full card of screen real estate with no utility for a cashier focused on a single sale.

## Minor Observations

- `max-w-6xl` container has no `px-4` horizontal padding — on narrow viewports (phones, narrow tablets) content can sit flush against the edge.
- `#757575` at `text-[10px]` (sale timestamps, KPI sub-captions, chart labels, stock-alert details) is borderline contrast at this size. Below 14px bold / 18px normal, WCAG requires 4.5:1; `#757575` on `#FAFAFA` is approximately 4.5:1 — technically passing but only by the slimmest margin. In variable store lighting (per PRODUCT.md), this becomes a real legibility risk.
- The "Stock bajo" section only renders when `alertasStock.length > 0` — supervisors using a well-stocked boutique never discover this section exists.
- `font-playfair text-sm font-semibold` on section headers (lines 186, 211) — `text-sm` (14px) for Playfair Display is slightly small; the font reads best at 16px+. On "Ingresos — últimos 7 días" this is fine (dashboard glance), but on the larger "Stock bajo" header (line 242) where `text-base` is used, the inconsistency is visible.

## Questions to Consider

- "Should CAJERO-role users land directly on /pos at login instead of the home dashboard? The dashboard provides zero utility for the act-of-selling persona."
- "Should KPI tiles be clickable links? 'Alertas stock: 3' clicking through to the inventory/ajustes page, 'Ingresos hoy' linking to today's ventas report — one change that turns 4 dead tiles into 4 navigation shortcuts."
- "Is the 7-day chart more useful to an admin (trend) or a supervisor (today vs. yesterday)? Would a simpler 'hoy vs. ayer' delta indicator serve the most common check-in better than a 7-bar chart?"
