---
target: inventario/kardex
total_score: 20
p0_count: 0
p1_count: 2
timestamp: 2026-06-16T14-38-32Z
slug: app-root-inventario-kardex-page-tsx
---
## Kardex / Bitácora — Design Critique

### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Spinner and count footer solid; silent error states are not |
| 2 | Match System / Real World | 3 | Domain-appropriate labels; "Cant." abbreviation minor |
| 3 | User Control and Freedom | 2 | No clear-filters button; desde > hasta = silent empty state |
| 4 | Consistency and Standards | 3 | card-boutique/color system consistent; Filtrar button duplicates reactive effect |
| 5 | Error Prevention | 1 | Invalid date range returns empty with no guard or message |
| 6 | Recognition Rather Than Recall | 2 | Column headers vanish on mobile; motivo buried in 10px subtitle |
| 7 | Flexibility and Efficiency | 1 | No SKU search, no date shortcuts, no export, no keyboard nav |
| 8 | Aesthetic and Minimalist Design | 3 | Clean table; CONTEO_FISICO arrow-up misleading |
| 9 | Help Users Recover from Errors | 1 | cargar has no catch — failure looks identical to empty state |
| 10 | Help and Documentation | 1 | 150-record cap undisclosed; empty state offers no guidance |
| **Total** | | **20/40** | **Acceptable — significant improvements needed** |

### Priority Issues

**[P1] No error state — network failure indistinguishable from empty results**
cargar has try/finally but no catch. A 500 or network drop renders "Sin movimientos para este período." — same as a legitimate empty filter result. Fix: add catch, errorCarga state, AlertCircle + retry branch.

**[P1] Filtrar button redundant and contradicts reactive filters**
useEffect already fires cargar on every filter change. The Filtrar button fires it again, causing double requests and a broken mental model (user changes dropdown, data loads, clicks Filtrar, nothing visible happens). Fix: remove button (reactive-only) or make filters apply-on-button-only.

**[P2] Mobile renders 7 unlabeled data columns**
hidden sm:grid hides headers on mobile. grid-cols-1 collapse leaves rows with no context — stock numbers appear without Anterior/Nuevo labels. Fix: card-per-row on mobile with explicit inline labels.

**[P2] 150-record limit never disclosed**
A busy boutique can exceed 150 movements in 30 days. No indicator that results are truncated. Fix: footer note when movimientos.length >= 150.

**[P2] Refresh button has no aria-label**
Icon-only button with no accessible label. Fix: aria-label="Actualizar kardex".

### Minor Observations
- CONTEO_FISICO with entrada:true shows up-arrow — misleading for a reconciliation that could go either direction
- motivo in 10px subtitle at #9E9E9E on #FAFAFA fails WCAG AA contrast (approx 2.8:1, need 4.5:1)
- Date inputs should be debounced to avoid rapid API calls when adjusting by keyboard
- No product/SKU filter — supervisors can only filter by movement type, not by specific item
- No desde > hasta validation — inverted range silently returns empty
