# Checklist de release v1.1.0 (Sprint 1 — Caja + base RNF)

> Según `Docs/guia-ramas-y-versionado.md` §4–§5. Este documento solo prepara el release: **no** se crean tags ni se toca `main` hasta la aprobación del dueño; eso lo hace el RM a mano.

## 1. Antes del Sprint Review (§5.1)
- [ ] PR del sprint integrados en `develop`: RNF-API-01/02, RNF-SEC-01 (mín.), RF-CAJA-02 (#12), RF-CAJA-01 (#13), fix locale es-CL (#16), filtro estado de pago (#17). Confirmar que no queda ninguno abierto.
- [ ] `develop` desplegado en el ambiente de pruebas.
- [ ] Migraciones probadas en pruebas con copia de la BD de producción (K8), en este orden:
  - `20261016040734-RNF-SEC-02-tabla-auditoria`
  - `20261016040735-RF-CAJA-02-estado-pago-liquidaciones`
  - `20261016041620-RF-CAJA-01-periodo-saldos-cajas`
  - `20261016060515-RF-CAJA-01-saldo-encadenado`
- [ ] Revisar log `[RF-CAJA-01][cadena]` y `[RF-CAJA-01][deficit]`; completar el listado de movimientos "déficit mes anterior" en `Docs/migracion_caja.md`.
- [ ] `db:migrate:undo` y re-`db:migrate` en la copia (nunca `undo:all` fuera de local).
- [ ] Criterios de aceptación verificados (spec §13), RF-CAJA-02: generar no altera la caja; pagar el día 5 del mes siguiente crea el egreso en ese mes; lote todo-o-nada; histórico conserva su efecto; pago/reversión auditados; RRHH no revierte.
- [ ] Criterios de aceptación verificados, RF-CAJA-01: cadena de ≥ 3 meses; −$2.000.000 se arrastra; cron dos veces no duplica; mes cerrado exige reabrir y el recierre recalcula.
- [ ] Decidir `CAJA_APERTURA_AUTOMATICA` (apagado por defecto) para pruebas y producción. Con el flag apagado, pagar en el mes actual igual abre su caja (D-042); el flag solo gobierna el cron del día 1.
- [ ] Vista de caja: confirmar con la empresa las etiquetas "devengado" vs "en caja" (D-043).
- [ ] Autorización RF-CAJA-02-001 (`.claude/autorizaciones.json`) venció el 2026-10-31 y la firma de Bastián fue verbal: regularizar por escrito.
- [ ] `npm test` en `limpi_back` en verde; `npx ng build --prod` en `Lim_front`.
- [ ] Estado de RF-CAJA-01/02 en la spec actualizado tras la verificación.
- [ ] `CHANGELOG.md` `[Sin publicar]` completo (hoy lista RF-CAJA-01, RF-CAJA-02 y middleware de auth; revisar RNF-API-01/02 y RNF-SEC-01).

## 2. Tras la aprobación del dueño (§5.2) — lo hace el RM a mano
- [ ] Subir `"version": "1.1.0"` en `limpi_back/package.json` y `Lim_front/package.json`.
- [ ] Mover `[Sin publicar]` a `[1.1.0] - AAAA-MM-DD` en `CHANGELOG.md`.
- [ ] PR `develop` → `main` (merge commit, no squash).
- [ ] Etiquetar `v1.1.0` en `main`.

## 3. Despliegue (§5.3)
- [ ] Ventana > 18:30, respaldo previo de la BD.
- [ ] `db:migrate` en producción, revisar logs de la migración.
- [ ] Smoke: `GET /web-limpiecito/prueba`, resumen de caja del mes, un pago y una reversión en mes de prueba (o con aprobación del dueño).

## 4. Rollback (§5.4)
- [ ] Orden: `db:migrate:undo` de `20261016060515`, luego `20261016041620` (aborta si cambiaron saldos); el resto según `Docs/migracion_caja.md`. Si aborta, restaurar respaldo.
- [ ] Volver al tag anterior (`v1.0.0`).
