# Checklist de release v1.5.0 (Sprint 5 — PEV/Cronograma: RF-PEV-02)

> Según `Docs/guia-ramas-y-versionado.md` §4–§5. Este documento solo prepara el release. **NO se crean tags** (ni desde Claude ni desde esta rama). La subida de versión, el PR `develop` → `main` y el tag los hace el RM a mano tras la aprobación del dueño. Todo ítem sin marcar está pendiente: nada de lo que sigue está verificado salvo lo que dice explícitamente "verificado".

## 0. Alcance y supuestos (revisar antes de empezar)
- Plan de versiones (§4): `v1.5.0` = PEV/Cronograma, sujeto a reunión técnica. La reunión del 2026-11-16 desbloqueó RF-PEV-02 (autorizaciones RF-PEV-02-001 y RF-PEV-02-002 en `.claude/autorizaciones.json`, vigentes hasta 2026-12-31). **RF-PEV-01 (asignación masiva) sigue 🔒 Bloqueado** y no entra salvo nueva decisión del equipo.
- Estado de tags (verificado con `git ls-remote` el 2026-11-19): en `origin` solo existe `v1.0.0`. Si `v1.1.0`…`v1.4.0` nunca se publicaron, §4 dice que los números no se saltan: **el RM decide** la numeración, igual que en `Docs/checklist-release-v1.3.0.md` §0. Este checklist asume `v1.5.0`.
- Versiones en `package.json` (verificado): backend `1.0.0`, frontend `2.3.0`. Siguen desalineadas (§4 pide el mismo número); decide el RM.
- Estado de ramas (verificado el 2026-11-19): `git log origin/main..origin/develop` lista solo el merge de #53 (sincronización `main` → `develop`). Ningún PR de RF-PEV-02 está integrado en `develop` todavía.
- RF-PEV-02 se entrega en tres ramas apiladas: 02a (#47) → 02b (#52) → 02c (`feature/RF-PEV-02c-uso-en-app-laboral-aaron`, D-140). Se integran en ese orden, cada una rebasada sobre `develop` tras el merge de la anterior.

## 1. Contenido previsto
- [ ] **RF-PEV-02a** (#47, abierto): esquema `actividades`/`actividad_pasos`/`actividad_asignaciones` + API Admin `/api/v1/pev`.
- [ ] **RF-PEV-02b** (#52, abierto): migración de datos (backfill) + dual-write en la creación legacy de líneas.
- [ ] **RF-PEV-02c** (esta rama; PR pendiente): cumplimiento por asignación en la app laboral (`/api/v1/pev/trabajador/*`, `/api/v1/pev/supervisor/*`, middleware `auth-laboral`), `GET /api/v1/pev/asignaciones/:id/cumplimiento` (Admin) y guard que impide borrar cronogramas con historial enlazado a asignaciones. Sin migración. Frontend ERP fuera de alcance.
- [ ] #46 (docs análisis PEV, abierto): decidir si se mergea o se cierra como superado por `Docs/PEV_ANALISIS.md`.
- [ ] #54 (RF-WEB-01, Bastián, abierto) pertenece a `v1.4.0`: si `v1.4.0` no se publicó antes, confirmar si viaja en esta release.
- [ ] `CHANGELOG.md` `[Sin publicar]` con las entradas de RF-PEV-02a/02b/02c.
- [ ] Estado de RF-PEV-02 en la spec (`Docs/requerimientos-limpiecito.md`) actualizado tras la verificación.

## 2. Antes del Sprint Review (§5.1)
- [ ] #47 → #52 → 02c aprobados por el otro integrante y mergeados (squash) en `develop`, en ese orden.
- [ ] `develop` desplegado en el ambiente de pruebas.
- [ ] Migraciones probadas en pruebas sobre una **copia de la BD de producción**, en orden (revisar `SequelizeMeta`; las previas pueden estar aplicadas si se desplegaron releases anteriores):
  - `20261113162840-RF-BOD-05-stock-minimo`, `20261114120000-RF-WEB-02-documentos-publico`, `20261114130000-RF-WEB-03-publicaciones` (solo si `v1.4.0` no se desplegó).
  - `20261116052140-RF-PEV-02a-esquema-asignaciones`
  - `20261117055508-RF-PEV-02b-backfill-asignaciones`
  - RF-PEV-02c **no agrega ninguna**.
- [ ] 02b: repetir el dry-run de solo lectura (`scripts/pev-02b-dry-run.js`) sobre la copia y revisar conteos K-1…K-14 (`Docs/PEV_ANALISIS.md` §h). Resolver el bloqueo D-122 (horas de `fecha_chequeo`) antes de producción.
- [ ] `db:migrate:undo` de 02b y de 02a y re-`db:migrate` en la copia (nunca `undo:all` fuera de local).
- [ ] **C4 de RF-PEV-02c** (pendiente): pruebas contra MySQL real de locks, idempotencia y orden asignación SHARE → lista SHARE → línea UPDATE; hoy solo hay tests con mocks.
- [ ] `npm test` en `limpi_back` en verde sobre `develop` integrado (en la rama 02c: 872 verdes, 13 skipped, verificado localmente el 2026-11-19); `npx ng build --prod` en `Lim_front`.
- [ ] Criterios de aceptación (spec §13) de RF-PEV-02, verificados en pruebas:
  - [ ] Pasar de 10 a 9 trabajadores en una actividad solo cierra una asignación; el historial de las 10 se conserva.
  - [ ] La app móvil existente (rutas legacy `/cliente-trabajador/*`, sin cambios de contrato) sigue registrando marcas y observaciones.
  - [ ] Trabajador marca los 3 pasos en orden sobre su asignación por `/api/v1/pev/trabajador`; no puede marcar líneas ajenas (403), de listas firmadas (409) ni de fechas futuras (409 `LINEA_FUTURA`).
  - [ ] Supervisor chequea hasta 3 rondas y registra observaciones sobre sus listas; con token de trabajador recibe 403.
  - [ ] Borrar un cronograma o una línea de cronograma con marcas enlazadas a asignaciones responde `{estado:false, mensaje}` y no borra nada.
- [ ] Hallazgos conocidos aceptados por el dueño o con rama propia (D-143): guard de borrado no atómico con el DELETE legacy; lost update de un PUT legacy con la línea completa sobre una marca nueva; el ERP no muestra el mensaje del guard (pendiente frontend, Bastián); `historial` pagina en memoria.
- [ ] Autorizaciones RF-PEV-02-001 y RF-PEV-02-002 vigentes y firmadas por Aaron y Bastián.

## 3. Tras la aprobación del dueño (§5.2) — lo hace el RM a mano
- [ ] Subir `"version"` a `1.5.0` (o la que decida el RM) en `limpi_back/package.json` y `Lim_front/package.json` (sin `git tag`; Claude no toca versiones).
- [ ] Mover `[Sin publicar]` a `[1.5.0] - AAAA-MM-DD` en `CHANGELOG.md`.
- [ ] PR `develop` → `main` (merge commit, **no** squash).
- [ ] Etiquetar `v1.5.0` en `main` (anotado). **NO se crean tags antes de este paso ni desde esta rama.**
- [ ] Crear el GitHub Release desde el tag, pegando la sección del CHANGELOG.

## 4. Despliegue (§5.3)
- [ ] Ventana > 18:30, **respaldo previo** de la BD (snapshot de RDS) antes de migrar.
- [ ] Detener Node antes de 02b (la migración corre con el proceso detenido; ver entrada RF-PEV-02b del CHANGELOG).
- [ ] `db:migrate` en producción (solo pendientes), revisar logs y el reporte de exclusiones del backfill.
- [ ] Reiniciar el backend con la nueva versión.
- [ ] Smoke: `GET /web-limpiecito/prueba`; login en la app laboral (`/acces_laboral/login`) como trabajador y como supervisor; una marca por la ruta legacy y otra por `/api/v1/pev/trabajador`; `GET /api/v1/pev/asignaciones` con token Admin.
- [ ] Verificar en `auditoria` que las marcas por la ruta nueva dejan fila `EDITAR` con el trabajador correcto.

## 5. Rollback (§5.4)
- [ ] Volver al release previo (el RM define cuál) o `git revert -m 1 <merge de la release>` en `main`.
- [ ] Orden: primero el código; luego `db:migrate:undo` de 02b (restaura vía `pev_backfill_log`, aborta si hubo uso posterior) y después de 02a (aborta si las tablas nuevas tienen filas).
- [ ] RF-PEV-02c es solo código: su rollback es redeploy. Las marcas hechas por la ruta nueva quedan en las columnas legacy y siguen visibles para la app.
- [ ] Si algún `down` aborta, restaurar el snapshot de RDS tomado antes del despliegue.
