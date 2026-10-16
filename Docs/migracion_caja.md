# Migración de caja — RF-CAJA-01 (saldo encadenado)

> Estado: implementado, pendiente de verificación con copia real de producción. Sin fecha de despliegue.
> Decisiones relacionadas: D-026, D-028, D-029, D-041 (`Docs/DECISIONES.md`). Diseño: `TASK_PLAN.md` "RF-CAJA-01 — Diseño" (§2, §6, §9).

## Advertencia
- La BD local `aseolimp_minda_oficial09` está **incompleta** (no tiene `egresos`, `cc_egresos`, `cc_ingresos`): no sirve para validar el backfill ni el listado de déficit. Las pruebas se hicieron en el clon `aseolimp_caja02_verif` (4 meses) y en una BD sintética.
- **K8 (verificación del backfill) requiere una copia real de producción (RDS)** restaurada en local. Hasta entonces los resultados de este documento no son concluyentes para producción.
- No ejecutar contra producción sin ventana (>18:30) y respaldo previo (`deploy-skill`, `database-skill`).

## Migraciones (en orden)
### 1. `20261016041620-RF-CAJA-01-periodo-saldos-cajas`
Agrega a `cajas` (cada paso verifica antes de aplicar; reanudable porque MySQL hace autocommit del DDL):
- `periodo CHAR(7)` (`YYYY-MM`, calculado desde `fecha_inicio` en America/Santiago) `NOT NULL`, índice `uq_cajas_periodo` UNIQUE.
- `saldo_inicial DECIMAL(14,0) NOT NULL DEFAULT 0`, `saldo_final DECIMAL(14,0) NULL`, `saldo_provisional BOOLEAN NOT NULL DEFAULT false`, `cerrada_por` (FK `usuarios`, `SET NULL`, `fk_cajas_cerrada_por`).
- Pre-checks previos al DDL (abortan sin cambios): InnoDB, cajas sin `fecha_inicio`, periodos duplicados.
- `estado` sigue INTEGER (1 = abierta) y `fecha_cierre` DATE (D-029).
- Backfill inicial encadenado con `total_ingreso − total_egreso` congelados. `down`: aborta si los saldos ya no coinciden con el backfill o hay cierres nuevos (`cerrada_por`).

### 2. `20261016060515-RF-CAJA-01-saldo-encadenado`
No agrega columnas; recalcula y corrige el encadenado histórico en una transacción (cajas `FOR UPDATE` en orden de periodo).
- Pre-checks: tablas `cajas` y `auditoria`; columnas de 041620; índice UNIQUE de `periodo`. Si falla, aborta sin cambios.
- Si existe alguna caja con `cerrada_por` (cierres del servicio nuevo) NO modifica nada y lo registra en `auditoria` (acción `MIGRACION_SALDO_ENCADENADO`).
- Escribe `saldo_inicial`, `saldo_final`, `saldo_provisional` solo donde cambian. Antes/después completos en `auditoria` (`entidad = 'cajas'`, `entidad_id = 'RF-CAJA-01-saldo-encadenado'`).
- `down`: restaura desde ese registro de `auditoria` (acción `MIGRACION_SALDO_ENCADENADO_UNDO`); **aborta** si hay saldos modificados después del backfill o cajas con `cerrada_por`, en cuyo caso se concilia a mano.
- Valida que cada saldo sea entero seguro y quepa en `DECIMAL(14,0)`.

## Lógica de cálculo (cadena cronológica por `periodo` ASC)
- Movimiento de un mes con la lógica del cierre legacy:
  - ingresos = Σ `centro_costos.precio_servicio` (centros cerrados, `estado = 0`);
  - egresos = Σ `centro_costos.total_costos` (cerrados) + Σ `egresos.monto` de la caja.
- **Sin doble conteo** (N1): se excluyen egresos anulados (`estado = -1`) y egresos de pago de liquidación (`tipo = 2` o referenciados por `liquidaciones.egreso_id`), porque la liquidación ya está en `total_costos`.
- Mes **cerrado con totales guardados**: se respeta el movimiento congelado `total_ingreso − total_egreso` (D-026), restando solo el doble conteo. Fuente en el log: `CONGELADO` / `CONGELADO_SIN_DOBLE_CONTEO`.
- Mes cerrado sin totales (NULL): se recalcula (`RECALCULADO_TOTALES_NULL`).
- Mes **abierto**: `saldo_final = NULL`, `fuente = EN_VIVO`; arrastra `saldo_inicial + movimiento en vivo`; los meses posteriores quedan `saldo_provisional = true`.
- Primer mes: conserva su `saldo_inicial` actual. Huecos: se encadena con la caja anterior existente. `estado` distinto de 0/1 se trata como CERRADA y se informa en el log.

## Movimientos manuales "déficit mes anterior"
Antes se registraba el arrastre a mano (déficit del mes anterior). La migración **no anula ni borra** ninguno (D-028); solo los lista en el log (`[RF-CAJA-01][deficit] {json}`) buscando `LIKE` `%deficit%`, `%déficit%`, `%saldo%`, `%mes anterior%`, `%arrastre%` en `egresos.comentario`, `cc_egresos.comentario`, `cc_ingresos.comentario` y `clientes.otra_informacion` (centros de costo asociados). Cada fila trae id, caja/periodo, monto, texto y el efecto estimado si se anulara (`+monto` al saldo desde ese periodo).

**Resultado detectado (2026-10-16): 0 movimientos** en el clon `aseolimp_caja02_verif` (salida de la migración: `meses=4 actualizadas=0 deficit_detectados=0`) y 0 en `aseolimp_minda_oficial09` (tablas `egresos/cc_egresos/cc_ingresos` inexistentes; `clientes.otra_informacion` sin coincidencias). El detector se validó con una BD sintética (1 fila de prueba, sin datos de clientes). Listado de prueba: `/private/tmp/claude-501/-Users-aarons-Documents-Limpiecito-Practica-ProyectoTitulo/3174a969-f383-4d57-8255-e6aae1906285/scratchpad/deficit-mes-anterior-listado.txt` (temporal, no versionado).
**Pendiente:** repetir con la copia real (K8); si aparecen filas, el equipo decide caso a caso si se anulan (con auditoría) antes de activar el encadenado, para no duplicar el arrastre.

## Procedimiento
1. **Respaldo**: `mysqldump --single-transaction` de la BD completa (o snapshot RDS) y verificar que el archivo restaura. Registrar ruta y hora.
2. **Ensayo en copia real** (K8): restaurar el respaldo en una BD local distinta; `npx sequelize-cli db:migrate` (041620 y 060515); revisar el log `[RF-CAJA-01][cadena]` (periodo, estado, si, mov, sf, fuente, doble conteo excluido) y `[RF-CAJA-01][deficit]`.
3. **Verificación**:
   - `saldo_inicial(mes i) = saldo_final(mes i−1)` para meses cerrados; mes abierto con `saldo_final NULL`.
   - Comparar `GET /api/v1/cajas/:periodo/resumen` con la vista legacy de un mes cerrado sin pagos CAJA-02 (deben coincidir) y de uno con pagos (diferencia = Σ pagos tipo 2).
   - `SELECT * FROM auditoria WHERE entidad='cajas' AND entidad_id='RF-CAJA-01-saldo-encadenado'` tiene un registro `MIGRACION_SALDO_ENCADENADO`.
   - Probar `db:migrate:undo` y re-`db:migrate` en la copia (nunca `undo:all` fuera de local).
4. **Producción**: ventana >18:30, respaldo, `db:migrate`, revisar el log, smoke del resumen y de un cierre/reapertura en un mes de prueba o con aprobación del dueño.
5. **Rollback** (orden obligatorio, D-041):
   1. Desplegar el código anterior (`services/caja`, controladores, `index.js`) para que nada escriba saldos.
   2. `npx sequelize-cli db:migrate:undo` → `20261016060515` (restaura desde `auditoria`; aborta si cambiaron saldos o hay `cerrada_por`).
   3. `npx sequelize-cli db:migrate:undo` → `20261016041620`.
   Si el undo aborta, restaurar el respaldo o conciliar manualmente. Nota D-026: `total_egreso` de meses cerrados no se reescribe, por lo que el undo no los toca.

## Riesgos abiertos
- Validado solo en clon y BD sintética; sin datos reales (K8).
- Deadlocks `FOR UPDATE` (cajas) vs `LOCK.SHARE` (`services/liquidaciones/pago.js:100`) no probados en clon.
- Faltan tests de la migración 060515 y de concurrencia real.
- Reabrir un mes no marca como provisionales los posteriores.
- Los totales de meses ya cerrados no se recalculan (D-026): la corrección del doble conteo aplica al encadenado, no a `total_egreso` histórico.
- Lista completa en `TASK_PLAN.md` ("RF-CAJA-01 — Riesgos abiertos").
