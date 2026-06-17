---
target: app/(root)/clientes/
total_score: 23
p0_count: 0
p1_count: 2
timestamp: 2026-06-16T04-10-40Z
slug: app-root-clientes
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 1 | Gold spinner on profile load; both `cargar()` calls have no catch — list failure shows "Agrega el primer cliente", profile failure shows "Cliente no encontrado" |
| 2 | Match System / Real World | 3 | Strong domain Spanish throughout; "Visitas" mislabels purchase count; "Ver historial" link goes to a full profile, not just history |
| 3 | User Control and Freedom | 2 | Good cancel paths; hard 50-client limit with no pagination or load-more; no deactivate toggle on profile page |
| 4 | Consistency and Standards | 2 | `catch (err: any)` ×2; `text-[10px]` cluster (6 instances); gold spinner; `cargar` in [id] is not `useCallback` |
| 5 | Error Prevention | 3 | `required minLength={2}`, `type="email"`, `type="tel"` — native validation correct; `toggleActivo` has no confirmation |
| 6 | Recognition Rather Than Recall | 3 | Avatar initials, field icons, `ESTADO_LABEL`/`METODO_LABEL` maps, card footer labels all work |
| 7 | Flexibility and Efficiency | 2 | Debounced search and `autoFocus` are correct; 50-client hard limit silently truncates; no pagination |
| 8 | Aesthetic and Minimalist Design | 3 | Clean card grid; flat blank skeleton (no internal geometry); nested history rows are ghost-cards (border + card-boutique shadow) |
| 9 | Error Recovery | 1 | Two no-catch `cargar()` calls show wrong UI state on failure; modal edit fetch silently opens blank form on network error |
| 10 | Help and Documentation | 3 | Form placeholders excellent ("Ana García López", "CF / 12345678-9"); "*" note in modal; empty state copy clear |
| **Total** | | **23/40** | **Poor — structurally sound card/modal pattern, but two P1 wrong-state failures and a `text-[10px]` cluster across both surfaces** |

## Priority Issues

**[P1] `cargar()` in page.tsx has no catch — API failure shows "Sin clientes / Agrega el primer cliente"**
- **Why it matters**: `cargar()` (lines 28-40) follows `try { setClientes(d.data ?? []) } finally { setCargando(false) }` with no catch. A failed `/api/clientes` call sets `clientes: []` and renders the empty state: "Agrega el primer cliente." — the create CTA — even when dozens of clients exist. A user who just registered 20 clients and refreshes after a brief network blip sees "Sin clientes" with no indication of failure and no retry. This is structurally identical to the P1 fixed in `devoluciones`, `ventas`, and `caja`.
- **Fix**: Add `errorLista` state. On catch, set it with `toast.error` + `setErrorLista(true)`. Render three states: skeleton → error card (AlertTriangle + "No pudimos cargar los clientes" + Reintentar) → empty / grid. Never render "Agrega el primer cliente" based on a failed fetch.
- **Suggested command**: `$impeccable harden clientes`

**[P1] `cargar()` in [id]/page.tsx has no catch — API failure shows "Cliente no encontrado."**
- **Why it matters**: `cargar()` (lines 68-74) uses `.then(d => setCliente(d.data)).finally(...)` with no rejection handling. If the fetch fails — 500, network blip, expired session — `cliente` stays `null` and the `if (!cliente)` guard renders `"Cliente no encontrado."` (line 83). This is worse than the list-page P1: the user navigated here from the client list, so they know the client exists. Seeing "no encontrado" on a network error is directly misleading and may cause a supervisor to assume the client record was deleted.
- **Fix**: Convert `cargar` to `useCallback`, add `errorCarga` state, catch the rejection, render: skeleton → error panel ("No pudimos cargar el perfil" + AlertTriangle + Reintentar) → `!cliente` 404 fallback → profile content. The 404 fallback ("Cliente no encontrado") should only appear when the API positively returns a 404, not on any network failure.
- **Suggested command**: `$impeccable harden clientes`

**[P2] Gold spinner in [id]/page.tsx (line 80)**
- **Why it matters**: Same `border-[#C9A84C] border-t-transparent animate-spin` spinner removed from devoluciones, ventas, caja, and CategoriasModal during prior harden passes. The profile page loads one record that maps to a card + KPI row + vales section + history list — all of those have well-defined geometry suitable for blush-pulse skeleton stubs.
- **Fix**: Replace with a blush `animate-pulse` skeleton: avatar circle stub + name/contact row stubs + 3 KPI stubs in a grid + 2-3 history row stubs.

**[P2] `catch (err: any)` in toggleActivo (page.tsx:59) and handleSubmit (ClienteModal.tsx:62)**
- **Why it matters**: Both call `.message` on the caught value directly (`toast.error(err.message)`). If the thrown value is not an Error instance, `err.message` is `undefined` and the toast shows "Error: undefined". Established pattern throughout the codebase is `catch (e: unknown)` + `e instanceof Error ? e.message : 'Error desconocido'`.
- **Fix**: Both to `catch (e: unknown)` with narrowing.

**[P2] `text-[10px]` cluster — 6 instances across two files**
- **Why it matters**: Six elements combine 10px with `text-[#9E9E9E]` (~2.5:1 on `#FAFAFA`), several on information-bearing labels:
  - `page.tsx:105` — "Inactivo" badge on client card (visible at a glance; status info)
  - `page.tsx:119` — NIT label ("NIT: 12345678-9") — used for billing identification
  - `page.tsx:121` — "Cliente desde MMM YYYY" — tenure context
  - `[id]/page.tsx:173` — estado badge in history row header (COMPLETADA / ANULADA / Dev. parcial)
  - `[id]/page.tsx:174` — payment method tag (Tag icon + method label)
  - `[id]/page.tsx:180` — timestamp in history row ("dd/MM/yyyy HH:mm") — reconciliation data
- **Fix**: All six → `text-xs`. NIT, estado, method, and timestamp are info-bearing and should use `text-[#757575]` at minimum. The "Cliente desde" and Inactivo badge can remain `text-[#9E9E9E]` as secondary context.

**[P2] ClienteModal edit-fetch has no loading state and no error handling**
- **Why it matters**: When editing an existing client, `useEffect` (lines 26-41) fires `fetch('/api/clientes/:id')` silently — no loading indicator, no catch. If the API call fails, the modal opens with all fields blank and no explanation. The user sees the edit form empty and may assume the client has no data, then type incorrect values into required fields and save — overwriting the real data with a blank record. If they notice the form is blank but don't know why, they have no retry path.
- **Fix**: Add `cargandoEdicion` state; show a small blush skeleton of the form fields while the fetch runs. Add `.catch` with a toast + `onClose()` — if the pre-fetch fails, close the modal and let the user retry by reopening.

**[P2] Flat skeleton cards in page.tsx — no internal geometry**
- **Why it matters**: Line 83-85: `card-boutique h-32 animate-pulse` renders as 6 blank rectangles — a fixed-height flat placeholder with no structural hint of what's inside (avatar + name/contact/NIT stack + action footer). The pattern established for other modules uses internal geometry: avatar circle stub, two text-line stubs, meta stub. A flat `h-32` card is functional but lower quality than the established skeleton standard.
- **Fix**: Replace each with a card containing a blush avatar circle stub (w-10 h-10 rounded-full), two text-line stubs at different widths, a NIT stub, and a footer strip stub — mirroring the actual card geometry.

**[P3] Hard 50-client limit with no pagination or load-more**
- **Why it matters**: `params.set('limite', '50')` (page.tsx:33). A boutique with more than 50 clients will silently lose clients from the list — no indicator that the list is truncated, no "load more", no pagination. The search (`q` param) partially mitigates this but a user who doesn't know the 51st client exists won't know to search for them.
- **Fix**: Either increase the default limit significantly (200+), add cursor-based load-more, or show a "Mostrando los primeros 50 resultados — busca por nombre para filtrar" notice when the result count equals the limit.

**[P3] `cargar` in [id]/page.tsx is not `useCallback` + linter warning on effect deps**
- **Why it matters**: `cargar` (line 68) is a bare function inside the component. `useEffect(() => { cargar(); }, [params.id])` includes `params.id` but not `cargar` in deps — TypeScript/ESLint would flag the missing `cargar` dep. Since `cargar` is re-created every render, the effect technically has a stale closure on every render except the first.
- **Fix**: Wrap in `useCallback(async () => { ... }, [params.id])` and update the effect to `[cargar]`.

**[P3] No deactivate/activate toggle on the profile page**
- **Why it matters**: The active/inactive toggle is only available from the client list card footer. On the profile page ([id]), a supervisor who wants to deactivate a client must navigate back to the list, find the card, and click "Desactivar" there. The "Editar datos" button opens the modal but the modal form has no `isActive` toggle — it only edits contact info.
- **Fix**: Add a toggle button or switch to the profile header (near "Editar datos"). Given that deactivation is a low-frequency, potentially consequential action, a simple pill toggle with an `AlertDialog` confirmation would be appropriate.

**[P3] `toggleActivo` has no confirmation dialog**
- **Why it matters**: Clicking "Desactivar" immediately patches the client's active status with no confirmation. Deactivating a client hides them from the POS customer selector — a click made by mistake could cause cashiers to be unable to apply client discounts or vales during a sale. A brief `AlertDialog` ("¿Desactivar a [Nombre]? No podrá ser seleccionado en el POS.") would prevent accidental deactivation.

## What's Working

1. **Debounced search with 300ms delay** (page.tsx:44-47) — uses `debounceRef` to fire `cargar(buscar)` 300ms after the last keystroke. Matches the established debounce pattern from `ProductSearch` and `devoluciones` cambio search. The initial `useEffect(() => { cargar(''); }, [cargar])` pattern is also correct — mount fires the empty query, debounce fires on changes.
2. **ClienteModal uses `<Dialog>` correctly** (ClienteModal.tsx:70) — `Dialog` with `onOpenChange={(v) => !v && onClose()}` is the established modal pattern: focus trap, Esc, aria-dialog, scroll lock. No raw DIV overlay.
3. **Form placeholders are genuinely helpful** (ClienteModal.tsx:84-103) — "Ana García López" names a real Guatemalan name pattern; "CF / 12345678-9" explains the two valid NIT formats in Guatemala. "5555-0000" shows the expected phone format. This is the best placeholder copy in the codebase.
4. **Avatar initials with gold-on-blush** (page.tsx:99-101; [id]/page.tsx:97-99) — `bg-[#F2C4CE]` circle + `text-[#C9A84C]` Playfair initial. A strong brand touch that makes the client list scannable without photos. Consistent across both surfaces.
5. **Vale de crédito section** ([id]/page.tsx:132-154) — conditionally renders only when `vales.length > 0`; shows `codigo` (monospaced), `montoOriginal`, `expiraEn`, and `saldoActual` in a distinct blush-background row. The "Saldo disponible" label for the active balance is the right emphasis axis — the cashier needs to know how much can be redeemed now, not what was originally loaded.

## Persona Red Flags

**Sam (Accessibility-Dependent)**:
- `text-[10px]` on 6 elements (Inactivo badge, NIT, "Cliente desde", estado, method, timestamp) — 2.5:1 contrast fails WCAG AA.
- Toggle buttons (Desactivar / Activar) in the card footer have no `aria-label` that includes the client name — "Desactivar" alone doesn't identify which client is being toggled for screen readers navigating a list of 20 cards.
- `ToggleRight` / `ToggleLeft` icons (lines 138) have no `aria-hidden="true"` — announced as unlabeled graphics.
- Phone and Mail icons in cards and profile (size={11}) are decorative; no `aria-hidden="true"`.

**Jordan (First-Timer)**:
- API failure on first load shows "Agrega el primer cliente" — Jordan may spend time trying to create clients that already exist.
- "NIT" with no tooltip or explanation — first-time users outside Guatemala may not know what NIT is; the placeholder "CF / 12345678-9" helps but a tooltip on the label would be clearer.
- Editing a client opens a form with fields pre-filled — but if the edit-fetch fails silently, Jordan sees blank fields and may type over or cancel confused.

**Alex (Daily Power User)**:
- 50-client hard limit — a boutique with 60 regular clients loses 10 from the list silently.
- No keyboard shortcut to open "Nuevo cliente" modal from the list page.
- No way to bulk-search by NIT — must type the full NIT in the search box; no filter by active/inactive status in the list.
