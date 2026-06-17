---
target: reportes/financiero
total_score: 22
p0_count: 0
p1_count: 2
timestamp: 2026-06-16T15-26-06Z
slug: app-root-reportes-financiero-page-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Toast on error vanishes; page then shows Q0.00 values that look like real zero revenue |
| 2 | Match System / Real World | 3 | Terminology natural; BarChart2 icon used on both Costos and Margen cards creates visual ambiguity |
| 3 | User Control and Freedom | 3 | Date range is editable; no "Limpiar / Últimos 30 días" reset like kardex has |
| 4 | Consistency and Standards | 2 | Date inputs have no labels; no debounce; no fechaError — all gaps fixed in kardex but not here |
| 5 | Error Prevention | 1 | No date range validation, no debounce, auth fetch has no .catch, export works on empty data |
| 6 | Recognition Rather Than Recall | 3 | KPI labels are clear; shared icon forces users to read the label text to distinguish Costos from Margen |
| 7 | Flexibility and Efficiency of Use | 2 | Excel export is a power feature; no date presets (Este mes, Mes anterior, Esta semana) |
| 8 | Aesthetic and Minimalist Design | 3 | Clean sections; bar chart date labels are 8px and overflow column bounds into a visual tangle |
| 9 | Error Recovery | 1 | No retry button; no inline error state; stale/null data silently shown after a failed fetch |
| 10 | Help and Documentation | 2 | Labels are clear but "Margen" has no inline explanation; chart has no accessible alternative |
| **Total** | | **22/40** | **Acceptable — significant improvements needed** |

## Anti-Patterns Verdict

**LLM assessment:** Not AI-slop by the banned-list definitions. No gradient text, no side-stripe borders, no glassmorphism, no sketchy SVGs. The identical 4-card KPI grid is the closest thing to the "hero-metric template" pattern, but it's appropriately subdued — no gradient accents, one card has a pink tint variation showing real intentionality. The BarChart2 icon duplication is a lazy copy-paste error, not a structural anti-pattern. Overall the page fits the boutique design language without feeling generic.

**Deterministic scan:** [] — the automated detector found no matches. Zero hits. No false positives.

## Overall Impression

The page is structurally sound — clean sections, right data in the right places, the Excel export is a genuinely useful power feature. What drags it down is the same missing safety layer that every page had before hardening: no .catch on auth, no errorCarga state, no date validation. There's also a chart-specific problem: the date labels are 8px and positioned absolute without a left anchor, causing them to overflow their 20px column bounds and visually tangle on 30-day views. The biggest opportunity is making the error story honest — right now a failed fetch leaves the page looking like there were zero sales, which is the worst possible false signal for a boutique owner checking profitability.

## What's Working

**1. Hierarchical data layout.** KPIs → daily chart → ranked product table follows the natural "summary → trend → detail" reading order that financial pages demand. No mental map required.

**2. Pink highlight on Ingresos.** Singling out the Ingresos card with bg-[#F8E1E7] correctly signals "this is the primary metric" without adding visual weight. It's a subtle but effective hierarchy touch.

**3. Excel export with dual sheets.** The Resumen + Top productos two-sheet workbook with the boutique name and date range in the header row is production-quality. This is what an accountant actually needs.

## Priority Issues

**[P1] Auth fetch has no .catch — permanent spinner on network error**
- Why it matters: If /api/auth/me fails, the auth check hangs at null forever. The ADMIN owner sees only a spinning gold circle with no way to recover.
- Fix: .catch(() => setAutorizado(false)) — identical to the fix applied to configuracion, usuarios, and kardex.
- Suggested command: $impeccable harden reportes/financiero

**[P1] No errorCarga state — failed load shows Q0 values, looks like zero revenue**
- Why it matters: When cargar() throws or gets a non-ok response, resumen stays null so the KPI grid renders Q0.00/Q0.00/Q0.00/0.0% and the products table says "No hay datos." The toast dismisses in seconds. What Lucía sees two seconds later is a page that looks exactly like a week with no sales — an actively misleading false signal.
- Fix: Add errorCarga state, set it in the catch, render an error card with Reintentar button. Clear stale data before the try block.
- Suggested command: $impeccable harden reportes/financiero

**[P2] BarChart2 icon used on both Costos and Margen KPI cards**
- Why it matters: Two right cards are visually identical at a glance. A user scanning quickly cannot distinguish Costos from Margen without reading the label text.
- Fix: Replace the Margen icon with Percent or PieChart from lucide-react.
- Suggested command: $impeccable harden reportes/financiero

**[P2] No date validation + no debounce — API called on every keystroke**
- Why it matters: Inverted ranges (desde > hasta) produce silent empty results. Typing a date fires 10+ API calls.
- Fix: fechaError validation + 200ms debounce, matching kardex pattern exactly.
- Suggested command: $impeccable harden reportes/financiero

**[P2] Bar chart date labels are 8px and rendered absolute without position context**
- Why it matters: 8px is below WCAG minimum readability; absolute without left value causes overflow and visual overlap on 30-day views.
- Fix: Make column div position:relative, center label with left-1/2 -translate-x-1/2, upgrade to text-[10px], truncate label to 5 chars.
- Suggested command: $impeccable harden reportes/financiero

## Persona Red Flags

**Lucía (boutique owner / ADMIN — project-specific)**
- Failed fetch → Q0 everywhere → thinks there were no sales. Emotional false alarm. (Error state P1)
- No date presets → manual date entry → wrong date → silent wrong data.
- Export on empty/wrong data → sends accountant an empty spreadsheet.

**Sam (Accessibility-Dependent)**
- Date inputs: VoiceOver says "date field" with no name.
- Refresh button: VoiceOver says "button" with no context.
- Bar chart: entirely invisible to screen readers — no role, no aria-label, no data alternative.
- KPI icons not aria-hidden — announced as unnamed graphics between label and value.

**Riley (Stress Tester)**
- desde > hasta: no validation error, API fires, silent empty result.
- Partial date typed: empty string desde sent to API.
- 12 fetch calls per date entry: no debounce.
- Export with resumen=null: Q0 values in every cell, empty products sheet.

## Minor Observations

- ShieldAlert in access-denied card missing aria-hidden="true".
- All 3 spinners missing motion-reduce:animate-none motion-reduce:opacity-50.
- Negative ganancia clamped to 0 — days with net loss are invisible in the chart.
- No "last updated" timestamp.
- Date inputs inconsistency with kardex: kardex has labeled inputs with htmlFor/id; financiero has bare unlabeled inputs.
