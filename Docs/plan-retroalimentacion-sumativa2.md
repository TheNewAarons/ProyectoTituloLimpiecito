# Plan de implementación — Retroalimentación Sumativa 2

> Fuente: `Retroalimentacion_Sumativa2_Bastian_Jofre_Aaron_Soto.docx` (58,4/60). Único indicador en "Bueno": **2.1.2.5 Modelo de datos** (kardex incompleto).
> Fecha: 2026-11-20. Estado: **propuesto**, pendiente de aprobación de las decisiones P-1…P-4.

## 0. Diagnóstico contra el código actual

| Observación del profesor | Estado real en el repo |
|---|---|
| `movimientos_bodega` sin costo ni saldos | Confirmado. Columnas: `producto_id, tipo, cantidad (delta con signo), referencia_tipo/id, usuario_id, contexto_usuario, created_at` (`migrations/20261106150736-RF-BOD-02-movimientos-bodega.js`). |
| Recepción parcial acumulada | Confirmado. `services/bodega/recepcion.js` suma en `orden_compra_items.cantidad_recibida` y crea **un** movimiento por producto sin costo. No hay fecha ni costo por recepción. |
| Valorización "último costo" | Confirmado. Recepción pisa `productos.costo_unitario`; `services/bodega/entrega.js` valoriza el consumo al centro de costo con ese último costo (o `precio` como estimado) **al momento de entregar**, no al momento de la salida. |
| Conteos físicos | No existen. El tipo `AJUSTE` está declarado en `services/bodega/constantes.js` pero nadie lo usa. |
| (Hallazgo extra) | Hay escritores de stock **sin movimiento**: `services/bodega/stock-rapido.js`, `api/apartado_base/stock_rapido/controlador.js` y la edición legacy en `routes/sistema_base/Producto.js`. Sin cubrirlos, el kardex nunca cuadra con `productos.stock`. |

## 1. Decisiones a tomar antes de codificar

| Id | Pregunta | Recomendación |
|---|---|---|
| P-1 | Método de valorización | **Costo promedio ponderado móvil (CPP)**, como sugiere el profesor. `productos.costo_unitario` queda como "último costo de compra" (referencia para OC). |
| P-2 | Cómo guardar el promedio sin romper la regla "CLP entero" | Guardar el **saldo valorizado** (`valor_saldo_*`, `DECIMAL(14,0)`) por movimiento; el costo promedio se deriva = `valor_saldo / stock`. Salida: `valor = ROUND(cantidad × valor_saldo / stock)`; si la salida deja stock 0, se lleva el valor remanente completo (no quedan pesos huérfanos). |
| P-3 | Recepciones históricas (antes del cambio) | Backfill: **una** recepción `historica=1` por línea con `cantidad_recibida > 0`, fecha = `ordenes_compra.updated_at`, costo = costo de la línea. Se declara como aproximación. |
| P-4 | Inmutabilidad del kardex | Hooks Sequelize `beforeUpdate/beforeDestroy` que lanzan error + test. Trigger MySQL solo si el administrador TI confirma permisos en RDS (`log_bin_trust_function_creators`). |

Registrar P-1…P-4 como D-175…D-178 en `Docs/DECISIONES.md` al aprobarlas.

## 2. Requerimientos y ramas

Un requerimiento por rama, PR a `develop`, en este orden (cada uno depende del anterior).

### RF-BOD-06 · Kardex completo y valorizado — 🔴 Alta · L (≈8 pts)
Rama: `feature/RF-BOD-06-kardex-valorizado-aaron`

**M1 – migración aditiva** (`database`): columnas nuevas en `movimientos_bodega`, todas `NULL` para filas históricas:
- `stock_anterior INT`, `stock_resultante INT`
- `costo_unitario DECIMAL(14,0)` (costo aplicado y congelado), `valor_movimiento DECIMAL(14,0)` (con signo)
- `valor_saldo_anterior DECIMAL(14,0)`, `valor_saldo_resultante DECIMAL(14,0)`
- `fecha_efectiva DATETIME` (default `created_at`), `referencia_linea_id INT`, `motivo VARCHAR(255)`
- `movimiento_revertido_id INT` FK a sí misma (RESTRICT)
- `estado VARCHAR(20) NOT NULL DEFAULT 'CONFIRMADO'`
- Índice `(producto_id, id)` para leer el último saldo.
- `down`: aborta si alguna columna nueva tiene datos.

**M2 – saldo inicial** (`database`): por producto, un movimiento `SALDO_INICIAL` con `stock_resultante = GREATEST(stock,0)` y `valor = stock × COALESCE(costo_unitario, precio, 0)`. `down` borra solo esos `SALDO_INICIAL` si no hay movimientos posteriores. Productos con stock NULL/negativo: se listan para conciliación manual (criterio D-054).

**Código**:
1. `services/bodega/kardex.js` → `registrarMovimiento({ transaction, producto (ya bloqueado FOR UPDATE), tipo, cantidad, costoUnitario?, referencia, referenciaLineaId?, revierte?, motivo?, usuario })`: lee el último saldo, calcula CPP, actualiza `productos.stock` y crea el movimiento. **Único punto** que toca `productos.stock`.
2. Migrar a `registrarMovimiento`: `recepcion.js` (entrada y asignación FIFO), `cruceStock.js` (asignación y reversa), `stock-rapido.js` (nuevo tipo `ENTRADA_MANUAL`), `api/apartado_base/stock_rapido/controlador.js`, edición legacy de stock en `routes/sistema_base/Producto.js` (como `AJUSTE` con motivo "edición legacy").
3. Reversa: `movimiento_revertido_id` = movimiento original y **mismo costo unitario** del original (no el promedio actual).
4. `entrega.js`: el costo cargado al centro de costo sale del `valor_movimiento` de las `SALIDA_SOLICITUD` de esa solicitud (costo congelado en la salida), no de `productos.costo_unitario`. BI-02/BI-03 quedan consistentes sin cambios porque leen `linea_insumos`.
5. Hooks de inmutabilidad en `modelos/sistema_bodega/Movimiento_bodega.js` (P-4).
6. `GET /api/v1/bodega/movimientos`: exponer las columnas nuevas; nuevo `GET /api/v1/bodega/productos/:id/kardex` (orden cronológico con saldos). Costos solo para Admin/Operaciones.
7. Front: vista kardex por producto (tabla: fecha, tipo, documento, entrada, salida, saldo, costo unitario, valor, saldo valorizado), según `Docs/GUIA-ESTILO-UI.md`.
8. `scripts/kardex-conciliar.js`: por producto compara `productos.stock` con `SALDO_INICIAL + Σ cantidad` y `valor_saldo_resultante` del último movimiento con la suma de valores. Sale con código ≠ 0 si hay diferencias (sirve de evidencia).

### RF-BOD-04b · Recepciones parciales como eventos — 🔴 Alta · M (≈5 pts)
Rama: `feature/RF-BOD-04b-recepciones-compra-aaron`

**Migración** (`database`):
- `recepciones_compra`: `id, orden_id (FK), fecha_recepcion, documento_tipo (GUIA/FACTURA), documento_numero, observacion, estado ('CONFIRMADA'|'ANULADA'), historica TINYINT DEFAULT 0, created_by, created_at`.
- `recepcion_items`: `id, recepcion_id (FK), orden_item_id (FK), producto_id (FK), cantidad INT, costo_unitario DECIMAL(14,0), movimiento_id (FK movimientos_bodega)`.
- Backfill según P-3. `down` aborta si hay recepciones no históricas.

**Código**:
- `recepcion.js`: cada `POST /ordenes-compra/:id/recepcion` crea una cabecera + ítems; acepta por línea `costo_unitario` real (default: costo de la OC) y `documento_*`. Cada ítem genera su `ENTRADA_COMPRA` vía `registrarMovimiento` con `referencia_tipo='recepciones_compra'` y `referencia_linea_id`.
- `orden_compra_items.cantidad_recibida` se mantiene como caché (compatibilidad con front y dashboard) y se valida = `Σ recepcion_items.cantidad` en el test y en el script de conciliación.
- Diferencia de precio vs OC: se guarda el costo real, se audita y se marca en la respuesta (`diferencia_precio`).
- `GET /ordenes-compra/:id` devuelve el historial de recepciones.
- Front: diálogo de recepción con N° de documento y costo por línea; detalle de OC con lista de recepciones.
- Anular una recepción queda **fuera de alcance** (fase 2): si se requiere, sería una reversa vinculada.

### RF-BOD-07 · Conteo físico y ajustes aprobados — 🟠 Media · M (≈5 pts)
Rama: `feature/RF-BOD-07-conteo-fisico-aaron`

- Migración: `inventario_conteos` (`id, fecha, responsable_id, estado BORRADOR|APROBADO|ANULADO, aprobado_por, aprobado_at, observacion, timestamps`) e `inventario_conteo_items` (`conteo_id, producto_id, cantidad_teorica, cantidad_contada, diferencia, motivo, movimiento_id`).
- Flujo: crear conteo (snapshot de `cantidad_teorica`) → registrar contados → aprobar (solo Admin). Al aprobar, en transacción y con lock de productos: si el stock cambió desde el snapshot se recalcula la diferencia contra el stock actual y se informa; cada diferencia ≠ 0 genera `AJUSTE` vía `registrarMovimiento` a costo promedio. **Nunca** se edita `productos.stock` directo.
- KPI "Exactitud de inventario" = ítems sin diferencia / ítems contados, calculado desde estas tablas.
- Front: pantalla de conteo (captura + aprobación).

### QA-01 · Ejecución de pruebas con evidencia — 🟠 Media · M
Rama: `test/QA-01-evidencias-kardex-aaron` (o dentro de cada rama si cabe)

Cada prueba queda como test jest (bajo `RUN_DB_TESTS` si necesita MySQL real) y su salida se guarda en `Docs/evidencias-pruebas/<fecha>-<id>.md`.

| # | Prueba pedida | Cómo |
|---|---|---|
| T1 | 2 solicitudes simultáneas, nunca stock negativo | `Promise.all` de 2 `crear` contra MySQL real; assert stock ≥ 0 y Σ asignado ≤ stock inicial. |
| T2 | Recepción parcial en 2 fechas y costos distintos | 2 recepciones de la misma línea; assert 2 cabeceras, 2 `ENTRADA_COMPRA`, CPP esperado calculado a mano. |
| T3 | Anulación con stock asignado → reversa vinculada | assert `REVERSA.movimiento_revertido_id` = salida original y mismo costo. |
| T4 | Reconciliación stock vs Σ movimientos | `scripts/kardex-conciliar.js` sobre la BD local y sobre una copia de producción. |
| T5 | Conteo con diferencia → ajuste aprobado | assert `AJUSTE` creado, stock y kardex cuadran. |
| T6 | Migración sin tocar cajas cerradas, pagos ni movimientos | checksum (`COUNT` + `SUM`) de `cajas` cerradas, pagos y `movimientos_bodega` antes/después de `db:migrate` en una copia. |
| T7 | Restauración RDS/EC2, RTO y RPO | Con el administrador TI: restore de snapshot a instancia temporal, cronometrar. Solo acta + tiempos. |
| T8 | Supervisor no ve costos, stock global ni solicitudes ajenas | supertest con token de supervisor contra kardex, movimientos y solicitudes → 403 / filtrado. |
| T9 | Carga sobre dashboards y cruce | herramienta externa (`ab` o `k6`, sin agregarla al `package.json`) contra local con copia de datos; registrar p95. |

### INF-01 · Validación de infraestructura con TI — 🟠 Media · sin código
Checklist en `Docs/checklist-validacion-infra-ti.md`, firmado por el administrador TI **antes** del próximo despliegue: topología real, RDS en subred privada, grupos de seguridad (puertos 22/80/443/3306), política de respaldos y retención, rutas legacy en uso por la app móvil, permisos para triggers (P-4).

### DOC-01 · Correcciones al informe — 🟡 Baja · sin código
- Diccionario de datos y DER con las tablas/columnas nuevas.
- BPMN: falla SMTP no deja la OC como `ENVIADA` (**verificar** en `services/bodega/correoOrdenCompra.js`); la reversa conserva la referencia al movimiento original.
- UML: ids estables en diagramas, casos y pruebas; revisar `«include»` (obligatorio y reutilizable) y documentar la condición de cada `«extend»`.
- Separar diagrama de componentes (interfaces provistas/requeridas) del diagrama de despliegue.
- Matriz de trazabilidad: BPMN → requerimiento → caso de uso → componente → entidad → caso de prueba → evidencia → versión.
- Sección "Método de valorización" (P-1, P-2) con ejemplo numérico.

## 3. Orden sugerido

1. Aprobar P-1…P-4 y pedir reunión con TI (INF-01) en paralelo.
2. RF-BOD-06 (M1 → M2 → `kardex.js` → migración de escritores → front).
3. RF-BOD-04b.
4. RF-BOD-07.
5. QA-01 (T1–T6, T8, T9 en local; T7 con TI).
6. DOC-01 y actualizar la tabla de estados del spec.

## 4. Riesgos

- **Escritores legacy de stock**: si alguno queda fuera de `registrarMovimiento`, la conciliación falla. Mitigación: grep de `stock` en `update`/`increment`/SQL crudo antes de cerrar RF-BOD-06 y conciliación diaria en local.
- **Saldo inicial con costos NULL**: productos sin costo arrancan con valor 0 y CPP distorsionado hasta la primera compra. Se reporta el listado en M2.
- **Cambio de costo en consumo**: los centros de costo nuevos usarán CPP; los ya cargados no se recalculan (cajas cerradas intocables).
- Todo cambio de esquema es aditivo y reversible; despliegue en ventana > 18:30 con respaldo previo (`deploy-skill`).
