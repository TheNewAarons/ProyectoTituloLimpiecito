# Checklist de release v1.3.0 (Sprint 3 — Bodega parte 2 + Facturación + auditoría completa)

> Según `Docs/guia-ramas-y-versionado.md` §4–§5. Este documento solo prepara el release. **NO se crean tags** (ni desde Claude ni desde esta rama). La subida de versión, el PR `develop` → `main` y el tag los hace el RM a mano tras la aprobación del dueño. Todo ítem sin marcar está pendiente: nada de lo que sigue está verificado salvo lo que dice explícitamente "verificado".

## 0. Alcance y supuestos (revisar antes de empezar)
- Plan de versiones (§4): `v1.3.0` = Bodega parte 2 + Facturación (Sprint 3). Aquí también entra RNF-SEC-02 (auditoría completa).
- Estado de tags: el repo solo muestra el tag `v1.0.0` (no se pudo listar tags desde esta sesión; confirmar en GitHub). Si `v1.1.0` (Sprint 1, ver `Docs/checklist-release-v1.1.0.md`) y `v1.2.0` (Sprint 2) nunca se publicaron, §4 dice que los números no se saltan y el contenido se libera en la versión siguiente: **el RM decide** si esta release se numera `v1.1.0`/`v1.2.0` o si agrupa todo desde `v1.0.0` como `v1.3.0`. Hasta decidirlo, este checklist asume `v1.3.0` con todo lo integrado desde `v1.0.0`.
- Versiones actuales en `package.json`: backend `1.0.0`; frontend `2.3.0` (desalineado: §4 pide el mismo número en ambos; el RM decide cómo alinearlos).
- Estado de ramas (verificado con git): `origin/main` (`d3601ad`, PR #34) y `origin/develop` (`a26dd59`) tienen el mismo contenido (diff vacío) pero historia distinta (squash). `git log origin/main..origin/develop` lista solo `a26dd59`. El PR `develop` → `main` debe ser **merge commit, no squash** (§5.2) y revisarse por posibles conflictos de historia.
- Esta rama (`refactor/RNF-SEC-02-auditoria-completa-aaron`) **no agrega migraciones**; es solo backend. Hoy sigue sin commit ni PR.

## 1. Contenido integrado en `develop` desde `v1.0.0`
PR/requerimientos (de `git log v1.0.0..origin/develop --first-parent` y `CHANGELOG.md`):
- Docs y entorno: #1 guía de ramas, #3 reconocimiento, #5 `.gitignore`, #6 entorno de pruebas, #7 guía de estilo UI, #19 diagramas, #22 cierre Sprint 1 (+ checklist v1.1.0).
- Caja: RF-CAJA-02 (#10, #12), RF-CAJA-01 (#13), #15 conflictos PR14, #16 locale es-CL, #17 filtro estado de pago.
- Bodega: RF-BOD-01 solicitudes (#21, Bastián), RF-BOD-03 proveedores/órdenes (#24, #26), #28 reconciliación de historial, RF-BOD-02 cruce de stock (#29), RF-BOD-04 recepción y entrega (#31, Bastián).
- Facturación: RF-FAC-01 estado de pago en facturas (#33 en `develop`, #34 en `main`).
- Base RNF (según checklist v1.1.0): RNF-API-01/02, RNF-SEC-01 (mín.).
- **Pendiente de integrar:** RNF-SEC-02 auditoría completa (esta rama; PR hacia `develop` aún no abierto).

Pendientes a confirmar:
- [ ] Ningún PR del sprint queda abierto (`gh pr list`); confirmar que Bastián no tiene ramas de RF-BOD-05 u otras previstas para este release.
- [ ] `CHANGELOG.md` `[Sin publicar]` completo: hoy no menciona RF-BOD-01 ni RF-BOD-04 ni RNF-API-01/02 (sí RF-CAJA-01/02, RF-BOD-02/03, RF-FAC-01, RNF-SEC-01/02). Completar antes de mover la sección.
- [ ] Estado en la spec (`Docs/requerimientos-limpiecito.md`): RF-BOD-01 y RF-BOD-04 figuran "Sin empezar" aunque su código está integrado; RF-BOD-02/03 y RF-FAC-01 "Implementado – pendiente verificación/PR"; RNF-SEC-02 "Implementado – pendiente verificación/PR". Actualizar tras la verificación.
- [ ] Dependencias de RF-BOD-05 (dashboard de bodega, Sprint 3): confirmar si entra en este release o se mueve a `v1.4.0`.

## 2. Antes del Sprint Review (§5.1)
- [ ] PR de RNF-SEC-02 aprobado por el otro integrante y mergeado (squash) en `develop`.
- [ ] `develop` desplegado en el ambiente de pruebas.
- [ ] Migraciones probadas en pruebas con copia de la BD de producción, en este orden (las 10 desde `v1.0.0`; las de caja/bodega previas a v1.3.0 pueden estar ya aplicadas si v1.1.0/v1.2.0 se desplegaron: revisar `SequelizeMeta`):
  - `20261016040734-RNF-SEC-02-tabla-auditoria`
  - `20261016040735-RF-CAJA-02-estado-pago-liquidaciones`
  - `20261016041620-RF-CAJA-01-periodo-saldos-cajas`
  - `20261016060515-RF-CAJA-01-saldo-encadenado`
  - `20261024215235-RF-BOD-01-solicitudes-bodega`
  - `20261102041711-RF-BOD-03-proveedores-ordenes-compra`
  - `20261102151757-RF-BOD-03-productos-proveedor-costo-rol-operaciones`
  - `20261106150736-RF-BOD-02-movimientos-bodega`
  - `20261110000953-RF-BOD-04-lista-insumo-solicitud`
  - `20261110120000-RF-FAC-01-estado-pago-facturas`
  - Esta rama (RNF-SEC-02 S0–S10) **no agrega ninguna**: usa la tabla `auditoria` y sus 3 índices existentes.
- [ ] `db:migrate:undo` y re-`db:migrate` en la copia (nunca `undo:all` fuera de local).
- [ ] `npm test` en `limpi_back` en verde (en esta rama: 553 verdes, verificado localmente el 2026-11-13; repetirlo sobre `develop` ya integrado); `npx ng build --prod` en `Lim_front`.
- [ ] Criterios de aceptación (spec §13) verificados por requerimiento: RF-CAJA-01/02, RF-BOD-01..04, RF-FAC-01, RNF-SEC-02.
- [ ] RNF-SEC-02, verificación en pruebas con datos reales:
  - [ ] "Quién cambió qué y cuándo": `GET /api/v1/auditoria?entidad=egresos&entidad_id=<id>` y `entidad=cajas`, `entidad=solicitudes_bodega` devuelven el rastro esperado.
  - [ ] Rollback: forzar el fallo de `auditar` en una operación legacy (p. ej. crear egreso) contra MySQL real y comprobar que la fila no queda escrita (hoy solo probado con mocks, D-085).
  - [ ] `EXPLAIN` con el volumen real de `auditoria`; el filtro solo por `entidad` (sin `entidad_id`) usa `idx_auditoria_created_at` (D-082).
  - [ ] Los 6 logins responden igual que antes y dejan `LOGIN_OK`/`LOGIN_FALLIDO` (sin contraseña, hash ni token en `valores_despues`).
  - [ ] Rutas legacy sin token siguen funcionando (se auditan como `sistema` / `LEGACY_SIN_TOKEN`); con token de Admin se atribuye al usuario.
- [ ] Hallazgos conocidos sin corregir, aceptados por el dueño o con rama propia: H-SEC-07 (borra liquidación por id equivocado, solo auditado), H-SEC-08 (`console.log(token)` en login de `usuarios`), H-SEC-01..06 (ver `Docs/DECISIONES.md`).
- [ ] Decidir `CAJA_APERTURA_AUTOMATICA` y revisar variables de entorno (`Docs/variables-de-entorno.md`; `SMTP_*` para RF-BOD-03) en pruebas y producción.
- [ ] Rol `Operaciones` creado por la migración `20261102151757`: confirmar nombre y usuarios asignados en producción.
- [ ] Autorizaciones firmadas (`.claude/autorizaciones.json`) vigentes para los cambios legacy de RNF-SEC-02 (S0 firmada por Aaron y Bastián; confirmar que el archivo lo refleja).

## 3. Tras la aprobación del dueño (§5.2) — lo hace el RM a mano
- [ ] Subir `"version"` a `1.3.0` en `limpi_back/package.json` y `Lim_front/package.json` (sin `git tag`; Claude no toca versiones).
- [ ] Mover `[Sin publicar]` a `[1.3.0] - AAAA-MM-DD` en `CHANGELOG.md`.
- [ ] PR `develop` → `main` (merge commit, **no** squash).
- [ ] Etiquetar `v1.3.0` en `main` (anotado). **NO se crean tags antes de este paso ni desde esta rama.**
- [ ] Crear el GitHub Release desde el tag, pegando la sección del CHANGELOG.

## 4. Despliegue (§5.3)
- [ ] Ventana > 18:30, **respaldo previo** de la BD (snapshot de RDS) antes de migrar.
- [ ] `db:migrate` en producción (solo las pendientes; RNF-SEC-02 no suma ninguna), revisar logs de cada migración.
- [ ] Reiniciar el backend con la nueva versión; el frontend se despliega con su propio build.
- [ ] Smoke: `GET /web-limpiecito/prueba`, resumen de caja del mes, una solicitud de bodega, un egreso con estado de pago. (`GET /api/v1/version` no existe en el código actual.)
- [ ] **Verificación post-deploy de auditoría:**
  - [ ] Hacer un login (admin) y comprobar que queda una fila `LOGIN_OK` en `auditoria` (`contexto_usuario='usuarios'`, `entidad='usuarios'`).
  - [ ] Un login fallido de prueba deja `LOGIN_FALLIDO` con motivo (y `[no-correo]` si el campo no parecía correo); sin contraseñas ni tokens en `valores_despues`.
  - [ ] `GET /api/v1/auditoria` con token Admin responde `{ ok:true, data, meta }`; con token no-Admin responde 403 y sin token 401.
  - [ ] `POST`/`PUT`/`PATCH`/`DELETE /api/v1/auditoria` no existen (404 con Admin).
  - [ ] Una operación legacy (p. ej. crear egreso) deja su fila de auditoría con el usuario correcto.
- [ ] Riesgo operativo: la tabla `auditoria` crece con cada login (incluida la app) y es inmutable; **no hay purga ni retención**. Medir el tamaño tras la primera semana y decidir política (archivado/índice) en un requerimiento aparte.

## 5. Rollback (§5.4)
- [ ] Volver al tag anterior (el RM define cuál: `v1.0.0` o el último publicado) o redeploy del release previo; `git revert -m 1 <merge de la release>` en `main` si hace falta.
- [ ] Solo backend de RNF-SEC-02: el rollback es redeploy del código anterior; no hay `db:migrate:undo` propio de esta rama (la tabla `auditoria` y sus filas se conservan: `down` de su migración aborta si hay filas).
- [ ] Para las migraciones de caja/bodega/facturas: `db:migrate:undo` por migración en orden inverso (ver `Docs/migracion_caja.md` y el `down` de cada una; varias abortan si ya hay datos). Si abortan o transformaron datos, restaurar el snapshot de RDS tomado antes del despliegue.
