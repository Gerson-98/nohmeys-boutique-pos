---
target: app/(root)/productos/page.tsx
total_score: 28
p0_count: 0
p1_count: 0
timestamp: 2026-06-15T20-55-44Z
slug: app-root-productos-page-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Skeleton in all three loading locations (main grid, ProductModal, CategoriasModal); error states in all three fetch paths |
| 2 | Match System / Real World | 3 | Good Spanish throughout; minor technical terms ("HEX", "Auto SKU", "Mín.") that are functional |
| 3 | User Control and Freedom | 3 | "Limpiar filtros" added; consistent Esc/cancel paths; AlertDialog Cancelar for category deletion |
| 4 | Consistency and Standards | 3 | Spinner→skeleton unified; confirm()→AlertDialog unified; rounded-full unified; border #E8D5A3 unified |
| 5 | Error Prevention | 3 | AlertDialog shows product count context ("tiene X productos"); good client-side validation |
| 6 | Recognition Rather Than Recall | 3 | Category badges, color swatches, specific search placeholder; "Copiar precio a todas" still hidden until 2nd variant |
| 7 | Flexibility and Efficiency | 2 | Debounced search, Auto SKU, "Copiar precio a todas", "Limpiar filtros"; still no bulk actions or keyboard shortcuts |
| 8 | Aesthetic and Minimalist Design | 3 | Loading states unified; filter pills unified; skeleton cards are flat h-72 (layout shift) — minor |
| 9 | Error Recovery | 3 | All three fetch error paths (main, ProductModal, CategoriasModal) now have distinct error UI or toast + retry |
| 10 | Help and Documentation | 2 | Helpful error messages; "Auto SKU" and "Mín." still unexplained; no tooltip on accelerator controls |
| **Total** | | **28/40** | **Good — all five prior findings resolved; remaining issues are P2 contrast + P3 polish** |

## Trend

| Run | Date | Score |
|-----|------|-------|
| 1st critique | 2026-06-16T02-39-47Z | 23/40 |
| 2nd critique | 2026-06-15T20-55-44Z | **28/40** |
| Δ | — | **+5** |

## What Was Fixed This Pass

All five issues from the previous critique are resolved:

- ✅ **[P1]** ProductModal edit-fetch failure now shows a three-state body: skeleton → error card with retry → form. Silent create mode is gone.
- ✅ **[P2]** API error on initial load now shows dedicated error state (AlertTriangle + "No pudimos cargar los productos" + "Reintentar"). No longer misleads with "Sin productos".
- ✅ **[P2]** Spinners eliminated. CategoriasModal and ProductModal both use blush `animate-pulse` skeleton shapes matching the main grid pattern.
- ✅ **[P2]** `confirm()` replaced with `AlertDialog` in CategoriasModal. Now shows product count context: "tiene N productos. Al eliminarla, esos productos quedarán sin categoría."
- ✅ **[P2]** All filter pills now `rounded-full`, inactive border unified to `#E8D5A3`. "Limpiar filtros" button resets all three filters at once.

## Priority Issues

**[P2] `text-[10px] text-[#9E9E9E]` on product count in CategoriasModal (line 217)**
- **Why it matters**: The product count badge (`<span className="text-[10px] text-[#9E9E9E]">`) fails WCAG AA on two counts simultaneously: `#9E9E9E` on near-white `#FAFAFA` is ~2.5:1 contrast (AA requires 4.5:1 for normal text), and 10px is below the practical readability floor regardless of contrast. This label is information-bearing — it's the number that populates the AlertDialog message ("tiene N productos"). A user squinting at the list to decide whether to delete safely can't read the count that determines the risk.
- **Fix**: Change to `text-xs text-[#757575]` — 12px is readable at normal viewing distance; `#757575` on `#FAFAFA` is ~4.0:1 (borderline AA, acceptable for secondary metadata).
- **File**: `app/(root)/productos/components/CategoriasModal.tsx:217`

**[P2] CategoriasModal `cargar()` failure shows only a toast — no persistent retry UI**
- **Why it matters**: If `/api/categorias` fails on CategoriasModal open, `toast.error('Error al cargar categorías')` fires and disappears after 3–5 seconds, leaving the modal body in its empty state (`No hay categorías registradas.`). Unlike the main grid and ProductModal (which both show a persistent AlertTriangle card with a Reintentar button), CategoriasModal gives the user no way to retry once the toast clears. On a slow connection the toast may even arrive before the user looks at it.
- **Fix**: Add an `errorCarga` state; when set, render an inline error banner with a Reintentar button that calls `cargar()` again — same three-state pattern already in use on the other two paths.
- **File**: `app/(root)/productos/components/CategoriasModal.tsx`

**[P2] Skeleton cards are flat `h-72` blocks — layout shift on load**
- **Why it matters**: The 8 skeleton cards (`<div className="card-boutique animate-pulse h-72" />`) are single-color blobs. Real `ProductCard` components have distinct zones: a 44-height image area, a category badge + name + description block, color swatches, and a price/stock/action footer. When skeletons dissolve into real cards, zones reflow and height changes — a perceptible jump especially in the grid's lower rows. The h-72 is also a guess; real cards vary in height by variant count.
- **Fix**: Replace the blob skeleton with a structured one that mirrors the card's visual zones — image stub, two text-line stubs, swatch dots row, footer strip. The jump is eliminated because height and zone geometry already match.
- **File**: `app/(root)/productos/page.tsx:244-247`

**[P3] ProductCard action buttons below 44px touch target**
- **Why it matters**: The "Editar" and "Desactivar" / "Activar" buttons in `ProductCard` use `py-2.5` which produces ~34px total height — below the 44px WCAG 2.5.5 minimum for pointer targets on a touch device.
- **Fix**: Change `py-2.5` to `py-3` (36px) or add `min-h-[44px]` to the action bar container.
- **File**: `app/(root)/productos/components/ProductCard.tsx` (action bar section)

**[P3] `err: any` in `crear()` and `guardarEdicion()` (CategoriasModal lines 82, 115)**
- **Why it matters**: Two catch blocks in CategoriasModal still type the caught value as `any` (`catch (err: any)`), while `eliminar()` (same file) was updated to `catch (err: unknown)` with proper narrowing. Mixed type patterns in adjacent catch blocks are a consistency signal — if `err.message` is called on an `unknown` catch, TypeScript will catch it; on `any`, it silently passes even if the caught value isn't an Error.
- **Fix**: Change both to `catch (err: unknown)` and narrow: `const msg = err instanceof Error ? err.message : 'Error desconocido';`
- **File**: `app/(root)/productos/components/CategoriasModal.tsx:82, 115`

**[P3] "Auto SKU" accelerator has no tooltip explaining its format**
- **Why it matters**: A first-time user adding variants sees an "Auto SKU" button in `ProductForm` with no indication of what it generates (e.g., `CATEGORIA-NOMBRE-TALLA-COLOR-001`). The accelerator is fast for repeat users who know the pattern, but invisible to newcomers — it may not get used and its value is missed.
- **Fix**: Add `title="Genera SKU: categoría + nombre + talla/color"` to the button. Alternatively a `<span>` tooltip on hover if a `title` attribute feels too raw.
- **File**: `app/(root)/productos/components/ProductForm.tsx`

## What's Working

1. **Three-state modal loading** — ProductModal's skeleton → error card → form pipeline is exactly right for an edit flow. The blush `F2C4CE/20` and `F2C4CE/40` tinting on the label/input stubs makes the skeleton clearly branded rather than generic gray.
2. **AlertDialog product count context** — "tiene N productos. Al eliminarla, esos productos quedarán sin categoría." is genuine help text, not a generic "Are you sure?" The IIFE rendering (lines 241-248) computes the message per-category without introducing a separate variable.
3. **"Limpiar filtros" design** — the ghost-button treatment (border-transparent → `hover:border-[#E8D5A3]`, `text-[#9E9E9E]` → `hover:text-[#2C2C2C]`) correctly makes it visible only when relevant without adding permanent UI weight. The conditional render on any active filter is the right trigger.
4. **cargarProductos error recovery** — showing `text-[#757575]` body copy, not `#9E9E9E`, on the error state ("Verifica tu conexión e intenta de nuevo.") is correct — exactly the `#757575` fix applied to information-bearing text in the harden pass.
5. **`useCallback` + debounce architecture** — the `cargarProductos` useCallback with a 300ms debounceRef and proper cleanup in the effect return is clean. Filter changes re-trigger one debounced fetch, not three.

## Persona Red Flags

**Sam (Accessibility-Dependent)**:
- `text-[10px] text-[#9E9E9E]` (CategoriasModal:217) — 2.5:1 contrast at 10px, the single remaining contrast violation.
- ProductCard action buttons at ~34px — below touch target minimum on mobile.
- "Auto SKU" and "Copiar precio a todas" have no tooltip/accessible name beyond their label text.

**Jordan (First-Timer)**:
- "Auto SKU" button's output format is opaque; a first-time catalog builder may not use it and will hand-type every SKU.
- CategoriasModal error on load clears with the toast — if Jordan is looking at the empty list and doesn't know why, there's no persistent clue.
- The "Copiar precio a todas" accelerator in ProductForm is hidden until a second variant is added — a new user adding their first variant won't discover it exists until variant 2.

**Alex (Daily Power User)**:
- No bulk-select or bulk-toggle for activating/deactivating products during seasonal catalog changes.
- No keyboard shortcut to open "Nuevo producto" from the list view.
- Filter pills don't persist across navigation — every return to the page resets to "Todas / Todo el stock".
