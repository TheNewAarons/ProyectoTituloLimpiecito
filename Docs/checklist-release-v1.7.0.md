# Checklist de release v1.7.0 (Sprint 7 — BI parte 2 + RNF seguridad/arquitectura)

> Según `Docs/guia-ramas-y-versionado.md` §4–§5. Este documento solo prepara el release. **NO se crean tags** (ni desde Claude ni desde esta rama). La subida de versión, el PR `develop` → `main` y el tag los hace el RM a mano tras la aprobación del dueño. Todo ítem sin marcar está pendiente: nada de lo que sigue está verificado salvo lo que dice explícitamente "verificado".

## 0. Alcance y supuestos (revisar antes de empezar)
- Plan de versiones (§4): `v1.6.0` = BI parte 1 (Sprint 6), `v1.7.0` = BI parte 2 + RNF seguridad/arquitectura (Sprint 7).
- Estado de tags (verificado con `git ls-remote` el 2026-11-20): en `origin` solo existe `v1.0.0`. `v1.1.0`…`v1.6.0` nunca se publicaron. §4 dice que los números no se saltan, así que **el RM decide** la numeración (igual que en `checklist-release-v1.5.0.md` §0). Este checklist asume `v1.7.0` y que acumula todo lo de `develop` no publicado.
- Versiones en `package.json` (verificado): backend `1.0.0`, frontend `2.3.0`. Siguen desalineadas (§4 pide el mismo número); decide el RM.
- Estado de ramas (verificado el 2026-11-20): `git log origin/main..origin/develop` lista #60 (RF-BI-01), #61 (RF-PEV-01) y el merge de sincronización #59. No hay PRs abiertos aparte del de RF-BI-02.
- RF-BI-02 está planificado para Sprint 6 (`v1.6.0`) en la spec; como `v1.6.0` no se publicó, viaja en esta release.

## 1. Contenido previsto
- [ ] **RF-BI-01** (#60, en `develop`): dashboard financiero.
- [ ] **RF-PEV-01** (#61, en `develop`): asignación masiva de actividades PEV.
- [ ] **RF-BI-02** (`feature/RF-BI-02-rentabilidad-cliente-aaron`, PR pendiente): rentabilidad por cliente / centro de costo + revalidación de usuario en `/api/v1/analytics` (D-153).
- [ ] Sprint 7 sin empezar (decidir si entran o pasan a `v1.8.0`): RF-BI-05, RNF-SEC-01 (JWT a variables de entorno), RNF-ARQ-01, RNF-API-01. RF-BI-04 sigue 🔒 Condicionado.
- [ ] `CHANGELOG.md` `[Sin publicar]` con las entradas de todo lo anterior.
- [ ] Estado en la spec (`Docs/requerimientos-limpiecito.md`) actualizado tras la verificación en pruebas.

## 2. Antes del Sprint Review (§5.1)
- [ ] PR de RF-BI-02 aprobado por el otro integrante y mergeado (squash) en `develop`.
- [ ] `develop` desplegado en el ambiente de pruebas.
- [ ] Migraciones probadas en pruebas sobre una **copia de la BD de producción**, en orden (revisar `SequelizeMeta`: aplicar solo las pendientes; las de releases previas no publicadas también pueden estar pendientes):
  - `20261117055508-RF-PEV-02b-backfill-asignaciones` (y anteriores, si `v1.5.0` no se desplegó; ver su checklist)
  - `20261119020439-RF-WEB-01-catalogo-items`, `20261120003306-RF-WEB-01b-catalogo-servicio-id`
  - `20261120043242-RF-BI-01-vista-caja-mensual`, `20261120043243-RF-BI-01-tabla-configuracion`
  - `20261120180713-RF-BI-02-vistas-rentabilidad` (solo vistas; probado migrate → undo → migrate en local, verificado 2026-11-20)
- [ ] `db:migrate:undo` de las migraciones BI y re-`db:migrate` en la copia (nunca `undo:all` fuera de local).
- [ ] **RF-BI-02 rendimiento (D-173):** `EXPLAIN` y medición de `GET /api/v1/analytics/rentabilidad` (rango de 12 meses) sobre la copia de RDS. Las vistas se materializan (TEMPTABLE); en local 63 ms con ~300 filas por tabla. Si es lento, mover el filtro de período a SQL parametrizado en el servicio antes de producción.
- [ ] **RF-BI-02 cuadratura:** en la copia, `meta.cuadra === true` para los últimos 12 meses; si no, revisar `meta.diferencia_conciliacion` (cajas cerradas con saldo congelado, D-171; cajas con período duplicado).
- [ ] `npm test` en `limpi_back` en verde sobre `develop` integrado (rama RF-BI-02: 1028 verdes, 13 skipped, verificado localmente el 2026-11-20; el test de rate limit de `/api/v1/public` es intermitente por ventana de tiempo). `npx ng build --prod` en `Lim_front` (rama RF-BI-02: compila, verificado 2026-11-20).
- [ ] Criterios de aceptación (spec §13) verificados en pruebas:
  - [ ] RF-BI-02: Σ márgenes por cliente − gastos generales = utilidad total del período; gastos generales visibles en dos líneas + neto.
  - [ ] RF-BI-02: clientes en pérdida destacados; ingreso estimado por contrato etiquetado "Estimado".
  - [ ] RF-BI-02 / D-153: un Admin desactivado con JWT vigente recibe 401 en `/api/v1/analytics/*`; bodega sigue funcionando para Operaciones.
  - [ ] RF-BI-01 y RF-PEV-01 según sus PRs (#60, #61).
- [ ] Hallazgos conocidos aceptados por el dueño o con RF propio: `egresos.centro_costo_id` (D-168) para atribuir egresos generales a centros.

## 3. Tras la aprobación del dueño (§5.2) — lo hace el RM a mano
- [ ] Subir `"version"` a `1.7.0` (o la que decida el RM) en `limpi_back/package.json` y `Lim_front/package.json` (sin `git tag`; Claude no toca versiones).
- [ ] Mover `[Sin publicar]` a `[1.7.0] - AAAA-MM-DD` en `CHANGELOG.md`.
- [ ] PR `develop` → `main` (merge commit, **no** squash).
- [ ] Etiquetar `v1.7.0` en `main` (anotado). **NO se crean tags antes de este paso ni desde esta rama.**
- [ ] Crear el GitHub Release desde el tag, pegando la sección del CHANGELOG.

## 4. Despliegue (§5.3)
- [ ] Ventana > 18:30, **respaldo previo** de la BD (snapshot de RDS) antes de migrar.
- [ ] `db:migrate` en producción (solo pendientes), revisar logs.
- [ ] Reiniciar el backend con la nueva versión; publicar el build del frontend.
- [ ] Smoke: `GET /web-limpiecito/prueba`; login Admin; `GET /api/v1/analytics/financiero/resumen` y `GET /api/v1/analytics/rentabilidad` con token Admin (200, `meta.cuadra`); con token de Operaciones `/api/v1/analytics/rentabilidad` responde 403; pantalla *Analytics → Rentabilidad* carga y abre el detalle de un centro.

## 5. Rollback (§5.4)
- [ ] Volver al release previo (el RM define cuál) o `git revert -m 1 <merge de la release>` en `main`.
- [ ] Orden: primero el código; luego `db:migrate:undo` de las migraciones BI (las de RF-BI-02 solo hacen `DROP VIEW IF EXISTS`, no tocan datos).
- [ ] Si algún `down` aborta, restaurar el snapshot de RDS tomado antes del despliegue.
