---
target: app/(root)/home/page.tsx (Home dashboard)
total_score: 19
p0_count: 1
p1_count: 1
timestamp: 2026-06-15T05-43-21Z
slug: app-root-home-page-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Refresh (line 88-90) unmounts the whole page back to a full-screen spinner — jarring, not a "live refresh" |
| 2 | Match System / Real World | 2 | "Buenos días" (line 82) is hardcoded regardless of time of day, contradicting the date shown right below it |
| 3 | User Control and Freedom | 2 | No drill-through from KPI cards, no way to dismiss/snooze stock alerts, no date-range control on the 7-day chart |
| 4 | Consistency and Standards | 3 | Mostly aligned with the boutique token system; minor weight mismatch vs. `/pos` (`font-semibold` here vs `font-bold` headers elsewhere) |
| 5 | Error Prevention | 2 | No try/catch around the dashboard fetch; nothing prevents the "stuck forever" state below |
| 6 | Recognition Rather Than Recall | 3 | Good icon+label pairing throughout; hover tooltips on the 7-day chart aid recall |
| 7 | Flexibility and Efficiency | 1 | Entirely passive/read-only — no shortcuts, no quick actions, nothing for a daily power user |
| 8 | Aesthetic and Minimalist Design | 2 | Caja banner + 4 KPI cards + 2 charts + 2 lists all render at once with near-equal visual weight |
| 9 | Error Recovery | 0 | `fetch` failure (line 51-60) has no `catch` — `cargando` flips to `false` but `data` stays `null`, so the `cargando \|\| !data` gate (line 64) traps the user in an infinite spinner with no message or retry |
| 10 | Help and Documentation | 2 | n/a for a POS dashboard generally, but the stock-alert list gives no guidance on reorder quantities or why a SKU is flagged |
| **Total** | | **19/40** | **Poor — significant improvements needed; one path (fetch failure) leaves the UI permanently broken** |

## Anti-Patterns Verdict

**LLM assessment**: This reads as a textbook AI-generated admin dashboard. A 4-card KPI row (gradient-tinted `bg-gradient-to-br from-[#X]/10 to-[#FAFAFA]`, lines 130-133), a 7-day bar chart, a "Top 5 with progress bars" list, and a "recent activity" feed is the exact shape that LLMs default to for "build me a dashboard," regardless of what the business actually needs first each morning. It's competently *themed* with the boutique palette (gold/pink/green tokens consistent with `/pos`), which keeps it from looking like a stock template — but the *structure* (KPI grid → chart → chart → list → list, all equal weight) is generic SaaS-admin boilerplate, not something shaped around "can I sell right now, and what needs my attention today."

**Deterministic scan**: `node detect.mjs --json "app/(root)/home/page.tsx"` exited **0** with **0 findings**. The detector runs in regex-based pattern-matching mode for `.tsx` files (narrower than its full HTML/CSS/Puppeteer modes), so a clean result here means none of its slop-phrase/markup regexes matched — it does not contradict the structural/hierarchy findings above, which require rendered or holistic review. No false positives to flag since there were none.

**Visual overlays**: Not available this run — no browser automation tooling is present in this session and no dev server was started, so this critique is source-code-only. Fallback signal: source-only review (consistent across both assessments).

## Overall Impression

The home dashboard is visually on-brand (correct palette, correct card system, correct typography) but structurally generic: it's a wall of equally-weighted widgets rather than a screen organized around "what does the person who just walked into the shop need to know and do first?" The most damaging issue is technical, not visual — a failed `/api/dashboard` fetch leaves the user in a permanent spinner with zero recovery path, which is unacceptable for a POS system someone depends on to start their shift. The single biggest opportunity is restructuring around urgency: caja status and stock alerts (the "do I need to act?" zone) vs. KPIs/charts/recent sales (the "how are things going?" zone) — right now both zones get identical visual treatment.

## What's Working

1. **Caja abierta/cerrada banner logic** (lines 94-125) — the one part of this page that's genuinely shaped by the business, not by dashboard convention. It branches on a real operational gate ("can this cashier even sell right now?") and gives a direct, actionable CTA ("Abrir caja") when closed. The green "Caja abierta" state with cajero name + time is reassuring in the way a good dashboard opener should be.
2. **Hover tooltips on the 7-day income chart** (lines 152-161) — exact Q amounts appear on hover without permanently consuming space, mirroring the attention to micro-interaction already established in `/pos` (e.g., the two-tap confirm patterns).
3. **Defensive empty-array handling** (lines 73-74, `Math.max(..., 1)`) and the conditional `lg:col-span-2` for "Últimas ventas" when there are no stock alerts (line 229) — small but real signs of edge-case awareness that most generated dashboards skip, even if the *visual* framing of those edge cases (e.g., an all-zero week) isn't called out to the user.

## Priority Issues

**[P0] Failed dashboard fetch traps the user in a permanent spinner**
- **Why it matters**: `cargar()` (lines 51-60) has no `catch`. If `/api/dashboard` errors — network blip, 500, expired session — `setData` never runs, but `finally` still sets `cargando` to `false`. The render guard `cargando || !data` (line 64) is then permanently true: the user sees a spinner forever, with no error message, no retry button, and no indication anything is wrong. On a POS system, a cashier hitting this at shift-start has no way to recover except guessing to reload the whole app.
- **Fix**: Add an `error` state set in a `catch`; when set, render a "No pudimos cargar el panel" card with a retry button that re-calls `cargar()` — same pattern as the toast/retry conventions already used in `/pos`.
- **Suggested command**: `$impeccable harden`

**[P1] Caja status is visually subordinate to the KPI row despite being the gating question**
- **Why it matters**: The caja banner (lines 94-125) and the four KPI cards (lines 128-141) all use the same `card-boutique p-4`-class treatment and similar height. But "is my cash drawer open?" is a yes/no gate that determines whether *anything else on this page matters right now* — if caja is closed, "Ingresos hoy" and "Top productos" are moot until that's resolved. Right now a time-pressed user can skim past "Caja cerrada" into the KPI noise below without registering it as the thing to fix first.
- **Fix**: Give the closed-caja state materially more visual weight than an "everything's fine" state and more than a KPI card — full-width treatment, larger icon/type, or position it so it can't be skimmed past. The open-caja state can stay subtle (it's good news, not an action item).
- **Suggested command**: `$impeccable layout`

**[P2] Four section headers carry identical weight regardless of how actionable they are**
- **Why it matters**: "Ingresos — últimos 7 días" (146), "Top productos — esta semana" (172), "Stock bajo" (202), and "Últimas ventas" (231) all share `font-playfair text-base font-semibold text-[#2C2C2C]`. "Stock bajo" is the most actionable section on the page (someone needs to reorder), yet it reads with the exact same visual weight as a passive sales log. This flat hierarchy is the core driver of the "wall of widgets" feel — nothing tells the eye where to land first.
- **Fix**: Differentiate an "action needed" zone (caja-closed banner + stock alerts, shown only when non-empty) from a calmer "overview" zone (KPIs, charts, recent sales) using position, size, or accent treatment — not just shared card styling.
- **Suggested command**: `$impeccable shape`

**[P2] `#9E9E9E` overused for information-bearing text, repeating the contrast issue already flagged on `/pos`**
- **Why it matters**: `#9E9E9E` appears 14 times (lines 84, 89, 100, 118, 133, 136, 138, 163, 174, 179, 183, 214, 239, 249, 256) on the near-white `card-boutique` background (`#FAFAFA`), which is roughly 2.5:1 contrast — below WCAG AA's 4.5:1 for normal text. Several of these carry real information: the caja-cerrada explanation (118), KPI sub-captions that quantify the headline numbers (138), stock-alert SKU/mínimo details (214), and sale timestamps (249, 256) — several at `text-[10px]`, compounding the readability problem. This is the same pattern already darkened to `#757575` for information-bearing text on `/pos` in the last hardening pass; home wasn't covered.
- **Fix**: Apply the same `#9E9E9E` → `#757575` treatment used on `/pos` to the information-bearing instances here (KPI sub-captions, caja-cerrada explanation, stock-alert detail line, sale timestamps), leaving decorative/icon uses as-is.
- **Suggested command**: `$impeccable harden`

**[P3] "Buenos días" greeting is hardcoded regardless of actual time of day**
- **Why it matters**: Line 82 always renders "Buenos días" (Good morning), while line 85 shows the real current date via `date-fns`. Anyone opening the shop in the afternoon or evening — plausible for a boutique with non-standard hours — sees a greeting that visibly contradicts the date directly beneath it. It's the literal first thing read on the page, and a static/wrong greeting is a small but immediate "this was templated, not built for us" signal.
- **Fix**: Derive the greeting from `new Date().getHours()` — "Buenos días" / "Buenas tardes" / "Buenas noches".
- **Suggested command**: `$impeccable polish`

## Persona Red Flags

**Sam (Accessibility-Dependent)**:
- Lines 138, 163, 214, 249, 256 combine `text-[10px]` with `text-[#9E9E9E]` (~2.5:1 contrast) — the densest cluster of small, low-contrast text on the page, covering KPI sub-captions, chart axis labels, stock-alert details, and sale timestamps.
- The refresh button (lines 88-90) is icon-only with no `aria-label` or `title` — a screen reader announces only "button," with no description of its function.
- The 7-day chart's exact values are revealed only via a hover-triggered tooltip (line 158, `opacity-0 group-hover:opacity-100`); the `title` attribute (line 155) is the only non-hover fallback, and native title tooltips are themselves inconsistent for assistive tech.

**Jordan (First-Timer)**:
- "Buenos días" always shown (line 82) — a new user opening the app in the evening notices the software is "wrong" within the first second.
- Empty states ("Sin ventas esta semana," line 174; "Sin ventas registradas," line 239) are accurate but offer zero next step — a brand-new shop with no sales yet sees a dashboard full of "nothing here" messages with no pointer toward "go make your first sale in /pos."
- The "Stock bajo" section (lines 199-226) only renders when `alertasStock.length > 0` — a first-timer with a freshly-seeded catalog never sees this section exists, reducing discoverability of a genuinely useful feature.

**Alex (Daily Cashier / Power User)**:
- Refresh (line 88) re-triggers the full-page `cargando || !data` spinner (line 64), unmounting the entire dashboard and losing scroll position — jarring for someone refreshing several times per shift.
- KPI cards (lines 130-141) are static, non-interactive `<div>`s; clicking "Alertas stock" does nothing — only the separate "Ajustar" link (line 205), which only exists when alerts are present, is clickable.
- No keyboard shortcuts or quick-jump to common destinations (`/pos`, `/caja`), unlike the shortcut-driven workflows already present on `/pos`.

## Minor Observations

- Line 137 uses `font-mono font-bold text-2xl` for KPI values, consistent with the `font-mono` totals convention on `/pos` — good cross-page consistency.
- Line 219 differentiates "AGOTADO" vs. low-stock via both color (`#E57373` vs `#F5C842`) and text label, so it isn't a pure color-only signal — but worth confirming `#F5C842` on `#FAFAFA` meets contrast for the bold mono numerals.
- The "Stock bajo" list (line 209, `max-h-64 overflow-y-auto`) has no count summary or severity sort (AGOTADO-first) before scroll-clipping — a bad week with 20+ low-stock SKUs becomes a scroll-trap with no sense of total scope.
- `max-w-6xl` with `grid-cols-2 lg:grid-cols-4` (lines 77, 128) means below the `lg` breakpoint the KPI row is 2×2 while the caja banner and charts are full-width single columns — a minor width-rhythm mismatch worth checking at tablet widths.
- Section header weight (`font-semibold`, lines 146/172/202/231) differs slightly from `/pos`'s header treatment (`font-bold`) — minor cross-page typographic inconsistency.

## Questions to Consider

- What if the caja is closed, there are 15 stock alerts, *and* it's evening — does the page currently tell the owner which of those three things to deal with first, or does it just show all three with equal weight?
- What if the "action needed" zone (caja status when closed + stock alerts when present) were collapsed into a single block shown only when something actually needs attention, with everything else demoted to a calmer "overview" zone below — would that one structural change resolve most of the flat-hierarchy and cognitive-load findings without touching the data layer?
- What if `/api/dashboard` is slow on a busy day — should caja status (which a cashier needs *immediately* to know if they can sell) be decoupled from the heavier analytics queries so it isn't blocked behind them?
