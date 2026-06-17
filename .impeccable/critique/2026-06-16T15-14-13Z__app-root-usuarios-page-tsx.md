---
target: usuarios
total_score: 22
p0_count: 0
p1_count: 3
timestamp: 2026-06-16T15-14-13Z
slug: app-root-usuarios-page-tsx
---
## Usuarios y Roles — Design Critique

### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Toggle sin feedback de carga; rollback inexistente; cargar sin catch |
| 2 | Match System / Real World | 3 | Cajero/Supervisor/Administrador natural para boutique guatemalteca |
| 3 | User Control and Freedom | 2 | toggleActivo sin confirmación — un clic erróneo desactiva cajero en turno |
| 4 | Consistency and Standards | 3 | Sistema de diseño correcto; title vs aria-label inconsistente |
| 5 | Error Prevention | 1 | Desactivar sin confirmar; sin minLength en contraseña; sin validación de username |
| 6 | Recognition Rather Than Recall | 3 | Badges de rol con triple codificación; selector de rol sin descripción de permisos |
| 7 | Flexibility and Efficiency | 2 | Toggle un clic eficiente; sin búsqueda ni acciones en lote |
| 8 | Aesthetic and Minimalist Design | 3 | Avatar inicial blush/gold es el elemento más distintivo del módulo |
| 9 | Help Users Recover from Errors | 1 | Update optimista sin rollback; cargar sin catch; d.error undefined risk |
| 10 | Help and Documentation | 2 | DialogDescription explica contraseña; rol sin descripción de permisos |
| **Total** | | **22/40** | **Acceptable — los tres P1 son los más operacionalmente peligrosos** |

### Priority Issues

**[P1] toggleActivo sin confirmación — un clic erróneo bloquea cajero en turno**
Ejecuta PATCH inmediatamente. Un supervisor que toca el toggle equivocado bloquea acceso de un cajero mid-sale.
Fix: Mini-dialog de confirmación antes del PATCH de desactivación (no de activación).

**[P1] Auth fetch sin .catch — spinner permanente en fallo de red**
fetch('/api/auth/me') sin .catch. autorizado=null → spinner para siempre.
Fix: .catch(() => setAutorizado(false)) — mismo fix que configuracion.

**[P1] toggleActivo update optimista sin rollback**
setUsuarios actualiza estado local antes de confirmar API. Si PATCH falla, UI queda desincronizada.
Fix: Reemplazar update optimista por cargar() después de PATCH exitoso.

**[P2] cargar sin catch — fallo de red = estado vacío indistinguible**
try/finally sin catch. Fix: errorCarga state + rama de error con retry.

**[P2] guardar con riesgo de toast "undefined"**
d.error puede ser undefined si res.json() falla. Fix: try { d = await res.json() } catch {} + fallback.

**[P2] title en lugar de aria-label en botones de acción**
title no funciona en touch. Fix: aria-label en Pencil, Toggle, y Eye/EyeOff + aria-pressed en Eye.

**[P3] Selector de rol sin descripción de permisos**
Crear ADMIN es opaco — sin advertencia de acceso total. Fix: helper text dinámico bajo el select.

**[P3] Sin htmlFor/id en ningún label del modal**
Fix: id en cada input, htmlFor en cada label.

**[P3] Sin maxLength; sin minLength en contraseña**
Contraseña de 1 char aceptada. Fix: maxLength en todos los campos + minLength=8 en contraseña.

### Minor Observations
- ShieldAlert (alerta/peligro) mapeado a ADMIN — semánticamente raro
- ShieldAlert en tarjeta de acceso denegado sin aria-hidden
- SUPERVISOR puede crear ADMIN — sin restricción en route
- Username acepta espacios — no rechazado ni en cliente ni en servidor
