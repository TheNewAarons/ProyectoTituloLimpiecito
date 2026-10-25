# Solicitudes de bodega (RF-BOD-01)

> Estado: esquema listo (migración `20261024215235-RF-BOD-01-solicitudes-bodega`). Endpoints, tests y vista: en curso.
> Jira: SCRUM-8. Base para RF-BOD-02 (cruce con stock).

## Tablas nuevas

Solo se crean tablas; ninguna tabla existente se altera.

### `solicitudes_bodega`
| Columna | Tipo | Notas |
|---|---|---|
| `id` | INT PK AI | |
| `trabajador_id` | FK `trabajadores.id`, NULL | Supervisor que la creó (token de `/acces_laboral/login`). |
| `usuario_id` | FK `usuarios.id`, NULL | Admin/Operaciones que la creó. Exactamente uno de los dos tiene valor (lo valida el servicio). |
| `centro_costo_id` | FK `centro_costos.id`, NOT NULL | |
| `estado` | VARCHAR(20) NOT NULL DEFAULT `'PENDIENTE'` | Ver estados. |
| `observacion` | VARCHAR(500) NULL | |
| `entregada_at`, `anulada_at` | DATETIME NULL | |
| `created_at`, `updated_at` | DATETIME NOT NULL | |

Índices: `(estado, created_at)`, `(trabajador_id, created_at)`, `(centro_costo_id)`.

### `solicitud_items`
| Columna | Tipo | Notas |
|---|---|---|
| `id` | INT PK AI | |
| `solicitud_id` | FK `solicitudes_bodega.id` | |
| `producto_id` | FK `productos.id` | |
| `cantidad_pedida` | INT UNSIGNED NOT NULL | > 0, entero. |
| `cantidad_asignada` | INT UNSIGNED NOT NULL DEFAULT 0 | La escribe RF-BOD-02. |
| `cantidad_faltante` | INT UNSIGNED NULL | NULL = aún no cruzado. La escribe RF-BOD-02. |
| `created_at` | DATETIME NOT NULL | |

`UNIQUE (solicitud_id, producto_id)`: un producto no se repite en una solicitud (spec regla 4; el servicio suma cantidades antes de insertar).

FK con `ON UPDATE CASCADE` y `ON DELETE RESTRICT`. La migración copia el `COLUMN_TYPE` real de cada `id` referenciado y aborta sin cambios si alguna tabla no es InnoDB.

## Estados

| BD (spec §7) | Pantalla (Jira) | Quién lo pone |
|---|---|---|
| `PENDIENTE` | Pendiente | Al crear (RF-BOD-01) |
| `PARCIAL` | En proceso | Cruce con faltantes (RF-BOD-02) |
| `LISTA_ENTREGA` | En proceso | Cruce sin faltantes / recepción (RF-BOD-02, RF-BOD-04) |
| `ENTREGADA` | Entregada | Entrega (RF-BOD-04) |
| `ANULADA` | Anulada | Supervisor (propia, sólo `PENDIENTE`) o Admin |

VARCHAR y no ENUM para que RF-BOD-02/04 no necesiten cambiar la columna. Constantes en `limpi_back/services/bodega/constantes.js`. No hay borrado físico: se anula y queda en `auditoria`.

## Decisiones (diferencias con la spec)

- **Supervisor = `trabajadores`, no `acceso_trabajadores`.** El login real de supervisores es `POST /acces_laboral/login` (tabla `accesos_laborales`, `tipo = 1` "Trabajador y Supervisor"); su token trae el `id` de `trabajadores` y `tipo_acceso`, sin `roleId`. `acceso_trabajadores` ni siquiera declara `id` en su modelo.
- **Centros permitidos del supervisor:** sus filas en `centro_costo_trabajadores` con centro abierto (`centro_costos.estado = 1`). Si es uno solo, la UI lo preselecciona.
- **Productos solicitables:** `productos` con `estado = 1`, sin `stock` ni `precio` (regla 6). No se filtra por `productos.tipo` porque no está documentado qué valor es EPP o insumo SEO/BP; la columna `categoria` de la spec queda para RF-BOD-02.
- **Cruce inmediato (regla 7):** lo implementa RF-BOD-02. RF-BOD-01 deja la solicitud en `PENDIENTE` con `cantidad_faltante = NULL`.
- **Anulación:** hoy sólo exige `PENDIENTE`; la condición "sin orden de compra enviada" se agrega cuando exista RF-BOD-03.

## Para RF-BOD-02 (Aarón)

- Leer ítems con `cantidad_faltante IS NULL` para saber qué falta cruzar.
- El cruce actualiza `cantidad_asignada`, `cantidad_faltante` y `estado` (`PARCIAL` / `LISTA_ENTREGA`) en una transacción con `LOCK.UPDATE` sobre `productos`.
- Si se necesitan columnas nuevas (p. ej. `productos.categoria`, `stock_minimo`), van en una migración propia de RF-BOD-02.

## Reversión

`db:migrate:undo` de esta migración elimina las dos tablas **sólo si `solicitudes_bodega` está vacía**; con filas, aborta (decisión humana: respaldar y renombrar).
