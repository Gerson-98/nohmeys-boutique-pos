---
target: configuracion
total_score: 20
p0_count: 0
p1_count: 2
timestamp: 2026-06-16T14-51-56Z
slug: app-root-configuracion-page-tsx
---
## Configuración General — Design Critique

### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Auth fetch has no .catch — failure freezes the spinner permanently |
| 2 | Match System / Real World | 3 | NIT, IVA, Política de cambios — contextually correct for Guatemala |
| 3 | User Control and Freedom | 1 | No Cancel, no unsaved-changes warning, no undo — data loss on nav |
| 4 | Consistency and Standards | 3 | Design system consistent; WhatsApp grouping inconsistent with Redes sociales |
| 5 | Error Prevention | 2 | HTML5 guards present; no maxLength, IVA→0 silent risk |
| 6 | Recognition Rather Than Recall | 3 | Good placeholder cues; no helper text for non-obvious fields |
| 7 | Flexibility and Efficiency | 1 | No Ctrl+S, no autosave, no section jump, no Cancel |
| 8 | Aesthetic and Minimalist Design | 3 | Clean section structure; helper text inconsistent across sections |
| 9 | Help Users Recover from Errors | 1 | Config load silently shows defaults on fail; d.error undefined → "undefined" toast |
| 10 | Help and Documentation | 1 | IVA has no context, Razón Social no tooltip, no ticket preview |
| **Total** | | **20/40** | **Acceptable — behavioral gaps, visual layer is solid** |

### Priority Issues

**[P1] Auth fetch has no .catch — network failure freezes page as permanent spinner**
Both useEffect fetches (auth/me and /api/configuracion) have no .catch. Auth failure leaves autorizado=null forever; config failure silently shows defaults. Fix: add .catch to both fetches; set autorizado=false on auth error; show error branch with retry on config failure.

**[P1] No unsaved-changes guard — edited data silently lost on navigation**
No dirty-state tracking, no beforeunload warning, no Cancel button. A supervisor editing NIT then clicking the sidebar loses all changes silently. Fix: isDirty boolean + "Cambios sin guardar" badge + "Cancelar cambios" secondary button that resets form to last fetched state.

**[P2] Save error can toast "undefined"**
res.json() before d.error check; if server returns non-JSON (502/HTML), JSON parse throws and d.error is undefined. Fix: wrap res.json() in try/catch, fallback to Error ${res.status}.

**[P2] No Cancel / Descartar button**
Only "Guardar configuración" exists. To abandon edits user must reload. Fix: add secondary "Cancelar cambios" button that resets form; show only when isDirty.

**[P3] WhatsApp in Contacto, not Redes sociales — confusing grouping**
Users look for WhatsApp under Redes sociales. Fix: move to Redes sociales or rename Contacto to "Teléfono y mensajería".

### Minor Observations
- DollarSign imported but unused
- politicaCambios and nombreComercial have no maxLength
- Only 2 of 5 sections have helper description text — inconsistent
- No htmlFor/id on any of 12 label/input pairs
- NIT should have inputMode="numeric"
- motion-reduce not applied to spinners
- IVA parseFloat(...) || 0 silently resets to 0 on field clear
