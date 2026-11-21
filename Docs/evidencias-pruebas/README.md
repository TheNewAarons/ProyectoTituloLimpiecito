# Evidencias de pruebas — QA-01 (modelo de bodega, retroalimentación Sumativa 2)

Ejecutadas el 2026-11-21 en local (macOS, Node 24.15, MySQL 9 Homebrew) sobre **copias desechables** de la BD de
desarrollo `aseolimp_minda_oficial09`: `aseolimp_qa01` (pruebas funcionales y carga) y `aseolimp_qa01_mig` (migraciones).
Nunca se escribió en oficial09 (T4 la lee, en modo solo lectura).

| # | Prueba | Resultado | Evidencia |
|---|---|---|---|
| T1 | 2 solicitudes concurrentes no dejan stock negativo | ✅ (+ T1b, 10 concurrentes) | [T1](2026-11-21-T1.md) |
| T2 | Recepción parcial en 2 recepciones con costos distintos | ✅ tras corregir bug | [T2](2026-11-21-T2.md) |
| T3 | Anulación con stock asignado → REVERSA enlazada | ✅ | [T3](2026-11-21-T3.md) |
| T4 | Conciliación stock vs Σ movimientos | ✅ local · ⏳ copia de producción | [T4](2026-11-21-T4.md) |
| T5 | Conteo con diferencia → AJUSTE | ✅ | [T5](2026-11-21-T5.md) |
| T6 | Migraciones no tocan cajas cerradas, pagos ni movimientos | ✅ local · ⏳ copia de producción | [T6](2026-11-21-T6.md) |
| T7 | Restauración RDS/EC2, RTO/RPO | ⏳ pendiente con TI | [T7](2026-11-21-T7.md) |
| T8 | Supervisor no ve costos, stock global ni solicitudes ajenas | ✅ | [T8](2026-11-21-T8.md) |
| T9 | Carga en dashboard y cruce (`ab`) | ✅ tras corregir bug | [T9](2026-11-21-T9.md) |

## Defectos encontrados y corregidos por QA-01

1. **Kardex bajo concurrencia (T1b/T9)** — `services/bodega/kardex.js` `ultimoSaldo` leía el último movimiento con
   lectura simple; en REPEATABLE READ (crear solicitud) veía el snapshot previo al lock del producto y no los
   movimientos de transacciones concurrentes ya confirmadas. `productos.stock` quedaba bien, pero se insertaban
   AJUSTE "descuadre" fantasma y la cadena de saldos (stock y valor) quedaba rota. Fix: lectura con `LOCK IN SHARE MODE`.
2. **Saldo inicial al costo nuevo (T2)** — `services/bodega/recepcion.js` actualizaba `productos.costo_unitario`
   antes de registrar las entradas: en un producto sin kardex previo, el SALDO_INICIAL automático se valorizaba al
   costo de la compra nueva (10 u × $1.200) en vez del histórico ($1.000). Fix: actualizar el costo después del kardex.

Ninguno de los dos llegó a producción (RF-BOD-06/04b aún no están desplegados).

## Hallazgo fuera de alcance (no corregido aquí)

- `POST /web-limpiecito/usuario/login` (legacy, `routes/sistema_base/Usuario.js:126`) hace `JSON.parse(req.body.usuario)`
  sin validar: un body sin `usuario` lanzó una excepción que terminó el proceso Node en local. Requiere rama `fix/` propia.

## Cómo reproducir

```bash
# copia desechable (nunca correr las pruebas contra oficial09)
mysql -u root -e "CREATE DATABASE IF NOT EXISTS aseolimp_qa01 CHARACTER SET utf8mb4"
mysqldump -u root aseolimp_minda_oficial09 | grep -v GTID_PURGED | sed '/^SET @@SESSION.SQL_LOG_BIN/d' | mysql -u root aseolimp_qa01
cd limpi_back
RUN_DB_TESTS=1 DATABASE_NAME=aseolimp_qa01 DATABASE_SERVER=localhost \
  node node_modules/jest/bin/jest.js tests/integracion/qa01 --runInBand --forceExit --verbose   # T1 T1b T2 T3 T5 T4
node node_modules/jest/bin/jest.js tests/api/qa01.supervisor.v1.test.js --verbose                # T8
DATABASE_NAME=aseolimp_qa01 node scripts/kardex-conciliar.js                                      # T4
DATABASE_NAME=aseolimp_qa01_mig node scripts/qa01-checksum.js                                     # T6 (antes/después)
```
