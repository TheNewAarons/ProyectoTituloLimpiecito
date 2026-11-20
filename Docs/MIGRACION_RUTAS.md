# Migración de rutas legacy a `/api/v1` (RNF-ARQ-01)

Avance de RNF-ARQ-01 (spec §RNF-ARQ-01). Las rutas nuevas conviven con las legacy: **ninguna legacy se retira** sin
autorización (`.claude/autorizaciones.json`), test de regresión y al menos 1 semana de observación en producción.

- **Parte 1 (SCRUM-42, Bastián):** bodega y web — este documento.
- **Parte 2 (SCRUM-25, Aarón, Sprint 8):** caja y facturación.

Todas las rutas v1 usan `{ ok, data, meta }` / `{ ok:false, error }`, `asyncHandler`, `AppError` y el middleware central de
errores. Las escrituras van en transacción con auditoría (RNF-SEC-02).

Estados: **Paralela** = v1 creada, legacy sigue en uso · **Reemplazada** = existe un endpoint v1 de otro requerimiento que
cumple la función · **Fuera de alcance** = no se migra en esta parte · **Retirada** = legacy eliminada (ninguna aún).

## Bodega

Permisos v1: Administrador y Operaciones (`autenticar` + `requerirRol`).

| Legacy | v1 | Estado | Regresión | Diferencias intencionales |
|---|---|---|---|---|
| `GET /producto/activo` | `GET /api/v1/bodega/productos` (o `?estado=activo`) | Paralela | ✅ | — |
| `GET /producto/inactivo` | `GET /api/v1/bodega/productos?estado=inactivo` | Paralela | ✅ | Legacy responde en `productosInactivos`; v1 en `data`. |
| `GET /producto/stock_activo` | `GET /api/v1/bodega/productos?con_stock=1` | Paralela | ✅ | — |
| `GET /producto/busca-activo/:busca?` | `GET /api/v1/bodega/productos?busca=` | Paralela | ✅ | Busca por nombre, precio o stock, igual que el legacy; máximo 100 caracteres. |
| `GET /producto/busca-inactivo/:busca?` | `GET /api/v1/bodega/productos?estado=inactivo&busca=` | Paralela | ✅ | — |
| `GET /producto/todos` | `GET /api/v1/bodega/productos?estado=todos` | Paralela | ✅ (diferencia) | El legacy hoy falla (llama a una función inexistente). v1 devuelve activos + inactivos, sin borrados. |
| `POST /producto/crear` | `POST /api/v1/bodega/productos` | Paralela | ✅ | Body JSON (no texto a parsear). Nombre repetido → 409 `PRODUCTO_DUPLICADO` (legacy: 200 con `mensaje`). Siempre se crea activo. Valida tipos y largos. |
| `PUT /producto/editar/:id` | `PUT /api/v1/bodega/productos/:id` | Paralela | ✅ | v1 **no** edita `stock` ni `estado` (400 `CAMPO_NO_EDITABLE`): el stock se mueve con stock rápido o recepción y el estado con `PATCH …/estado`. Edición parcial. Producto borrado → 404. |
| `DELETE /producto/eliminar/:id` | `PATCH /api/v1/bodega/productos/:id/estado` `{ "estado": "inactivo" }` | Paralela | ✅ | Legacy usa DELETE para desactivar; v1 usa PATCH. |
| `DELETE /producto/activar/:id` | `PATCH /api/v1/bodega/productos/:id/estado` `{ "estado": "activo" }` | Paralela | ✅ | Ídem. |
| `DELETE /producto/borrar/:id` | `DELETE /api/v1/bodega/productos/:id` | Paralela | ✅ | Ambos son borrado lógico (`estado = 2`). v1 responde 404 si ya estaba borrado. |
| `GET /stock/obtener` | `GET /api/v1/bodega/stock-rapido` | Paralela | ✅ | v1 devuelve `producto_id` y el nombre del producto, sin el objeto anidado. |
| `POST /stock/crear` | `POST /api/v1/bodega/stock-rapido` `{ "items": [...] }` | Paralela | ✅ | Mismo efecto (fila + incremento + auditorías CREAR/AJUSTE, filas bloqueadas por id). v1 valida (1–100 entradas, enteros > 0, fecha `YYYY-MM-DD`, por defecto hoy en Santiago) y exige productos activos (409 `PRODUCTO_NO_DISPONIBLE`, todo o nada). **Cantidad:** el legacy acepta 0 o negativos (un negativo descuenta stock); v1 solo > 0. **Fecha:** el legacy guarda `new Date(fecha)` tal como llega (`YYYY-MM-DD` queda a las 00:00 UTC, el día anterior en Santiago); v1 guarda las 12:00 UTC del día indicado, para que el día no cambie al mostrarlo. Al cambiar el front, revisar reportes que agrupen entradas por día. |
| `DELETE /stock/eliminar/:id` | — | Pendiente | — | Ver «Pendientes». |
| `POST /vestimenta/crear`, `PUT /vestimenta/editar/:id` | — | Fuera de alcance | — | Son tallas de cada trabajador (RRHH), no inventario de bodega. El `crear` legacy hoy falla (variable sin definir). |

## Web

| Legacy | v1 | Estado | Regresión | Diferencias intencionales |
|---|---|---|---|---|
| `POST /contactanos_web/contactanos` | `POST /api/v1/public/contacto` | Paralela | ✅ | Mismo destinatario, remitente y asunto. v1 valida y normaliza los campos (nombre, email y mensaje obligatorios; celular opcional), agrega `replyTo`, responde error JSON si el correo no sale (502/503; el legacy dejaba la petición sin respuesta) y tiene un límite propio de 5 envíos cada 10 min por IP, además del general de `/public`. |
| `GET /documento_web/obtener-asociacion-publico/:categoria/:search?` | `GET /api/v1/public/documentos` (RF-WEB-02) | Reemplazada | Cubierta por `tests/api/documentos-publicos.v1.test.js` | Criterio distinto: legacy publica según el tipo de la categoría (`Publico`); v1 según la marca `publico` del documento, y nunca expone la ruta del archivo. |
| `GET /documento_web/obtener-documento/:idDocumento` | `GET /api/v1/public/documentos` | Reemplazada | Ídem | v1 no expone el detalle con la ruta interna del archivo. |
| `GET /documento_web/descargar-pdf/:idDocumento` | `GET /api/v1/public/documentos/:id/descargar` | Reemplazada | Ídem | v1 valida que sea un PDF público y que la ruta esté dentro de la carpeta permitida. |
| `/anuncios_web/*` (crear, obtener, ver, editar, eliminar) | `/api/v1/web/publicaciones` (admin) y `GET /api/v1/public/publicaciones` (RF-WEB-03) | Reemplazada | Cubierta por `tests/api/publicaciones*.v1.test.js` | Tabla distinta (`publicaciones`, no `anuncios`), con vigencia, sanitización de HTML y despublicar en vez de borrar. Los anuncios existentes no se migran automáticamente. |

## Consumidores pendientes de cambiar a v1

No se cambian en esta parte (modificar servicios existentes requiere autorización):

- `Lim_front/src/app/services/producto/producto.service.ts` → `/api/v1/bodega/productos`.
- `Lim_front/src/app/services/stock/stock.service.ts` → `/api/v1/bodega/stock-rapido`.
- `Lim_front/src/app/services/pagina-web/anuncio.service.ts` → `/api/v1/web/publicaciones`.
- Sitio web público (otro proyecto): contacto → `/api/v1/public/contacto`; documentos → `/api/v1/public/documentos`.

## Pendientes

- **Anular stock rápido en v1.** El legacy `DELETE /stock/eliminar/:id` borra la fila y descuenta el stock. Un "anular" v1
  (marca `anulado_at` y descuenta) convivirá mal con el legacy mientras el front use `/stock/eliminar`: una entrada anulada
  por v1 podría volver a descontarse desde el legacy. Se implementa junto con el cambio del front a v1, protegiendo el legacy
  con autorización.

## Rollback

Las rutas v1 de esta parte son solo agregados: para revertir basta con quitar sus líneas en `api/v1/bodega/routes.js` y
`api/v1/public/routes.js` (o revertir el commit). No hay migraciones ni cambios en las rutas legacy, así que no hay datos
que deshacer.

## Retiro de rutas legacy

Ninguna retirada. Requisitos por ruta: consumidores cambiados a v1, test de regresión en verde, ≥ 1 semana en producción
sin uso del legacy y autorización registrada.
